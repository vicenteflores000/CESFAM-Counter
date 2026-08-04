const operatorName = document.querySelector("#operatorName");
const staffTicket = document.querySelector("#staffTicket");
const staffWindow = document.querySelector("#staffWindow");
const staffUpdatedAt = document.querySelector("#staffUpdatedAt");
const windowForm = document.querySelector("#windowForm");
const windowInput = document.querySelector("#windowInput");
const nextButton = document.querySelector("#nextButton");
const recallButton = document.querySelector("#recallButton");
const setForm = document.querySelector("#setForm");
const setInput = document.querySelector("#setInput");
const statusMessage = document.querySelector("#statusMessage");

function formatNumber(value) {
  return String(Number(value) || 0).padStart(3, "0");
}

function formatTime(value) {
  if (!value) return "Sin llamados registrados";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function render(state) {
  staffTicket.textContent = formatNumber(state.currentNumber);
  staffWindow.textContent = state.windowNumber || "-";
  staffUpdatedAt.textContent = state.updatedAt ? `Actualizado ${formatTime(state.updatedAt)}` : "Sin llamados registrados";
  setInput.value = state.currentNumber || 0;
}

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.type = type;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === "string" ? body : body.error;
    throw new Error(message || "No se pudo completar la acción.");
  }

  return body;
}

async function loadMe() {
  const me = await api("/api/me");
  operatorName.textContent = me.user.name || me.user.email || "Funcionario";
  if (me.windowNumber) {
    windowInput.value = me.windowNumber;
  }
}

async function loadInitialState() {
  render(await api("/api/state"));
}

function connectEvents() {
  const events = new EventSource("/events");
  events.addEventListener("state", (event) => render(JSON.parse(event.data)));
}

windowForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/window", {
      method: "POST",
      body: JSON.stringify({ windowNumber: windowInput.value })
    });
    setStatus(`Ventanilla ${windowInput.value.trim()} guardada.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

nextButton.addEventListener("click", async () => {
  try {
    render(await api("/api/next", { method: "POST", body: "{}" }));
    setStatus("Número siguiente llamado.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

recallButton.addEventListener("click", async () => {
  try {
    render(await api("/api/recall", { method: "POST", body: "{}" }));
    setStatus("Llamado repetido.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

setForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    render(await api("/api/set", {
      method: "POST",
      body: JSON.stringify({ number: setInput.value })
    }));
    setStatus(`Número ${formatNumber(setInput.value)} llamado.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

Promise.all([loadMe(), loadInitialState()])
  .then(connectEvents)
  .catch((error) => setStatus(error.message, "error"));
