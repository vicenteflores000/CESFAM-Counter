const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const BASE_URL = process.env.BASE_URL || `http://${HOST}:${PORT}`;
const MS_CLIENT_ID = process.env.MS_CLIENT_ID || "";
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET || "";
const MS_TENANT = process.env.MS_TENANT || "common";
const REDIRECT_URI = process.env.MS_REDIRECT_URI || `${BASE_URL}/auth/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === "true";

const dataDir = path.join(__dirname, "data");
const stateFile = path.join(dataDir, "state.json");
const publicDir = path.join(__dirname, "public");
const sessions = new Map();
const sseClients = new Set();
let jwksCache = null;

const defaultState = {
  currentNumber: 0,
  windowNumber: null,
  calledBy: null,
  updatedAt: null,
  windows: [],
  revision: 0
};

let callState = loadState();

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return normalizeState({ ...defaultState, ...parsed });
  } catch {
    return { ...defaultState };
  }
}

function normalizeState(state) {
  return {
    ...state,
    currentNumber: Math.max(0, Number(state.currentNumber) || 0),
    windows: Array.isArray(state.windows) ? state.windows : []
  };
}

function saveState() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(callState, null, 2));
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...headers
  });
  res.end(payload);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function signedCookie(name, value, maxAgeSeconds) {
  const raw = Buffer.from(JSON.stringify(value)).toString("base64url");
  const cookie = `${raw}.${sign(raw)}`;
  const maxAge = maxAgeSeconds ? `; Max-Age=${maxAgeSeconds}` : "";
  return `${name}=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Lax; Path=/${maxAge}`;
}

function readSignedCookie(req, name) {
  const cookie = parseCookies(req)[name];
  if (!cookie) return null;
  const [raw, signature] = cookie.split(".");
  if (!raw || !signature || sign(raw) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function clearCookie(name) {
  return `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function createSession(user) {
  const id = crypto.randomBytes(32).toString("base64url");
  sessions.set(id, {
    user,
    windowNumber: null,
    createdAt: new Date().toISOString()
  });
  return id;
}

function getSession(req) {
  const cookie = readSignedCookie(req, "session");
  if (!cookie?.id) return null;
  return sessions.get(cookie.id) || null;
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    send(res, 401, { error: "Debe iniciar sesión con Outlook." });
    return null;
  }
  return session;
}

function serveFile(res, filePath) {
  const resolved = path.normalize(filePath);
  if (!resolved.startsWith(publicDir)) {
    send(res, 404, "No encontrado");
    return;
  }

  fs.readFile(resolved, (error, contents) => {
    if (error) {
      send(res, 404, "No encontrado");
      return;
    }

    const ext = path.extname(resolved);
    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": contents.length,
      "Cache-Control": "no-store"
    });
    res.end(contents);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Cuerpo demasiado grande"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
  });
}

function publicState() {
  return {
    currentNumber: callState.currentNumber,
    windowNumber: callState.windowNumber,
    calledBy: callState.calledBy,
    updatedAt: callState.updatedAt,
    windows: sortedWindows(),
    revision: callState.revision
  };
}

function broadcastState() {
  const event = `event: state\ndata: ${JSON.stringify(publicState())}\n\n`;
  for (const client of sseClients) {
    client.write(event);
  }
}

function windowSortValue(windowNumber) {
  const numeric = Number(windowNumber);
  return Number.isFinite(numeric) ? numeric : String(windowNumber).toLowerCase();
}

function sortedWindows() {
  return [...callState.windows].sort((a, b) => {
    const aValue = windowSortValue(a.windowNumber);
    const bValue = windowSortValue(b.windowNumber);
    if (typeof aValue === "number" && typeof bValue === "number") return aValue - bValue;
    return String(aValue).localeCompare(String(bValue), "es");
  });
}

function registerWindow(windowNumber, operator) {
  const normalizedWindow = String(windowNumber || "").trim();
  const existing = callState.windows.find((item) => item.windowNumber === normalizedWindow);
  const now = new Date().toISOString();

  if (existing) {
    existing.operator = operator || existing.operator || null;
    existing.active = true;
  } else {
    callState.windows.push({
      windowNumber: normalizedWindow,
      currentNumber: null,
      operator: operator || null,
      updatedAt: null,
      active: true
    });
  }

  callState.revision += 1;
  callState.registeredAt = callState.registeredAt || now;
  saveState();
  broadcastState();
}

function updateCallState({ number, windowNumber, calledBy }) {
  const normalizedWindow = String(windowNumber || "").trim() || null;
  const normalizedNumber = Math.max(0, Number(number) || 0);
  const updatedAt = new Date().toISOString();
  const existing = callState.windows.find((item) => item.windowNumber === normalizedWindow);

  if (existing) {
    existing.currentNumber = normalizedNumber;
    existing.operator = calledBy || existing.operator || null;
    existing.updatedAt = updatedAt;
    existing.active = true;
  } else if (normalizedWindow) {
    callState.windows.push({
      windowNumber: normalizedWindow,
      currentNumber: normalizedNumber,
      operator: calledBy || null,
      updatedAt,
      active: true
    });
  }

  callState = {
    ...callState,
    currentNumber: normalizedNumber,
    windowNumber: normalizedWindow,
    calledBy: calledBy || null,
    updatedAt,
    revision: callState.revision + 1
  };
  saveState();
  broadcastState();
}

function authConfigured() {
  return Boolean(MS_CLIENT_ID && MS_CLIENT_SECRET);
}

function microsoftAuthorizeUrl(state, nonce) {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email",
    state,
    nonce,
    prompt: "select_account"
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/oauth2/v2.0/authorize?${params}`;
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code"
  });

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Microsoft rechazó el código (${response.status}).`);
  }

  return response.json();
}

async function getJwks() {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/discovery/v2.0/keys`);
  if (!response.ok) throw new Error("No se pudieron obtener las llaves de Microsoft.");
  const body = await response.json();
  jwksCache = { keys: body.keys || [], expiresAt: Date.now() + 60 * 60 * 1000 };
  return jwksCache.keys;
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function verifyIdToken(idToken, expectedNonce) {
  const [headerRaw, payloadRaw, signatureRaw] = idToken.split(".");
  if (!headerRaw || !payloadRaw || !signatureRaw) throw new Error("Token inválido.");

  const header = decodeJwtPart(headerRaw);
  const payload = decodeJwtPart(payloadRaw);
  const keys = await getJwks();
  const key = keys.find((candidate) => candidate.kid === header.kid);
  if (!key) throw new Error("Firma no reconocida.");

  const publicKey = crypto.createPublicKey({ key, format: "jwk" });
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerRaw}.${payloadRaw}`),
    publicKey,
    Buffer.from(signatureRaw, "base64url")
  );
  if (!verified) throw new Error("Firma inválida.");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== MS_CLIENT_ID) throw new Error("Audiencia inválida.");
  if (payload.exp <= now) throw new Error("Token expirado.");
  if (payload.nonce !== expectedNonce) throw new Error("Nonce inválido.");

  return {
    id: payload.oid || payload.sub,
    name: payload.name || payload.preferred_username || payload.email || "Usuario",
    email: payload.preferred_username || payload.email || "",
    tenant: payload.tid || null
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/auth-status") {
    send(res, 200, {
      authConfigured: authConfigured(),
      devLogin: ALLOW_DEV_LOGIN
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    send(res, 200, publicState());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const session = requireSession(req, res);
    if (!session) return;
    send(res, 200, {
      user: session.user,
      windowNumber: session.windowNumber,
      authConfigured: authConfigured()
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/window") {
    const session = requireSession(req, res);
    if (!session) return;
    const body = await readBody(req);
    const windowNumber = String(body.windowNumber || "").trim();
    if (!windowNumber) {
      send(res, 400, { error: "Indique el número de ventanilla." });
      return;
    }
    session.windowNumber = windowNumber;
    registerWindow(windowNumber, session.user.email || session.user.name);
    send(res, 200, { windowNumber });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/next") {
    const session = requireSession(req, res);
    if (!session) return;
    if (!session.windowNumber) {
      send(res, 400, { error: "Configure su ventanilla antes de llamar." });
      return;
    }
    updateCallState({
      number: callState.currentNumber + 1,
      windowNumber: session.windowNumber,
      calledBy: session.user.email || session.user.name
    });
    send(res, 200, publicState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/recall") {
    const session = requireSession(req, res);
    if (!session) return;
    if (!session.windowNumber) {
      send(res, 400, { error: "Configure su ventanilla antes de llamar." });
      return;
    }
    updateCallState({
      number: callState.currentNumber,
      windowNumber: session.windowNumber,
      calledBy: session.user.email || session.user.name
    });
    send(res, 200, publicState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/set") {
    const session = requireSession(req, res);
    if (!session) return;
    if (!session.windowNumber) {
      send(res, 400, { error: "Configure su ventanilla antes de llamar." });
      return;
    }
    const body = await readBody(req);
    const number = Number.parseInt(body.number, 10);
    if (!Number.isInteger(number) || number < 0 || number > 9999) {
      send(res, 400, { error: "Ingrese un número de atención entre 0 y 9999." });
      return;
    }
    updateCallState({
      number,
      windowNumber: session.windowNumber,
      calledBy: session.user.email || session.user.name
    });
    send(res, 200, publicState());
    return;
  }

  send(res, 404, { error: "Ruta no encontrada." });
}

async function handleAuth(req, res, url) {
  if (req.method === "GET" && url.pathname === "/auth/login") {
    if (!authConfigured()) {
      send(res, 503, "Falta configurar MS_CLIENT_ID y MS_CLIENT_SECRET.");
      return;
    }
    const state = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    const next = url.searchParams.get("next") || "/staff";
    res.writeHead(302, {
      Location: microsoftAuthorizeUrl(state, nonce),
      "Set-Cookie": signedCookie("oauth", { state, nonce, next, exp: Date.now() + 10 * 60 * 1000 }, 600)
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/auth/callback") {
    const oauth = readSignedCookie(req, "oauth");
    if (!oauth || oauth.exp < Date.now() || oauth.state !== url.searchParams.get("state")) {
      send(res, 400, "Inicio de sesión expirado. Intente nuevamente.");
      return;
    }

    try {
      const token = await exchangeCode(url.searchParams.get("code"));
      const user = await verifyIdToken(token.id_token, oauth.nonce);
      const sessionId = createSession(user);
      res.writeHead(302, {
        Location: oauth.next || "/staff",
        "Set-Cookie": [
          signedCookie("session", { id: sessionId }, 8 * 60 * 60),
          clearCookie("oauth")
        ]
      });
      res.end();
    } catch (error) {
      send(res, 500, `No se pudo iniciar sesión: ${error.message}`);
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/auth/dev" && ALLOW_DEV_LOGIN) {
    const sessionId = createSession({
      id: "dev",
      name: "Operador de prueba",
      email: "operador@desarrollo.local",
      tenant: "local"
    });
    res.writeHead(302, {
      Location: "/staff",
      "Set-Cookie": signedCookie("session", { id: sessionId }, 8 * 60 * 60)
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/logout") {
    res.writeHead(302, {
      Location: "/",
      "Set-Cookie": clearCookie("session")
    });
    res.end();
    return;
  }

  send(res, 404, "No encontrado");
}

function handleEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write(`event: state\ndata: ${JSON.stringify(publicState())}\n\n`);
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE_URL);

  try {
    if (req.method === "GET" && url.pathname === "/") {
      serveFile(res, path.join(publicDir, "index.html"));
      return;
    }

    if (req.method === "GET" && url.pathname === "/staff") {
      if (!getSession(req)) {
        redirect(res, "/login?next=/staff");
        return;
      }
      serveFile(res, path.join(publicDir, "staff.html"));
      return;
    }

    if (req.method === "GET" && url.pathname === "/login") {
      if (getSession(req)) {
        redirect(res, "/staff");
        return;
      }
      serveFile(res, path.join(publicDir, "login.html"));
      return;
    }

    if (req.method === "GET" && url.pathname === "/events") {
      handleEvents(req, res);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (url.pathname.startsWith("/auth/") || url.pathname === "/logout") {
      await handleAuth(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
      serveFile(res, path.join(publicDir, url.pathname));
      return;
    }

    send(res, 404, "No encontrado");
  } catch (error) {
    send(res, 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`CESFAM Counter disponible en ${BASE_URL}`);
});
