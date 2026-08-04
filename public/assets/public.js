const updatedAt = document.querySelector("#updatedAt");
const windowCards = document.querySelector("#windowCards");
let lastRevision = -1;

function formatNumber(value) {
  return String(Number(value) || 0).padStart(3, "0");
}

function formatTime(value) {
  if (!value) return "Esperando llamado";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function render(state) {
  if (!state || state.revision === lastRevision) return;
  lastRevision = state.revision;

  const windows = Array.isArray(state.windows) ? state.windows : [];
  const windowCount = Math.max(windows.length, 1);
  windowCards.style.setProperty("--window-count", windowCount);
  windowCards.style.setProperty("--card-number-size", `${Math.max(1.45, Math.min(8.5, 16 / windowCount))}rem`);
  windowCards.style.setProperty("--card-window-size", `${Math.max(1, Math.min(4.2, 8 / windowCount))}rem`);
  windowCards.style.setProperty("--card-padding", `${Math.max(6, Math.min(24, 34 / windowCount))}px`);
  updatedAt.textContent = state.updatedAt ? `Último llamado ${formatTime(state.updatedAt)}` : "Esperando ventanillas";
  windowCards.innerHTML = "";

  if (windows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aún no hay ventanillas registradas";
    windowCards.append(empty);
  }

  for (const item of windows) {
    const card = document.createElement("article");
    card.className = "window-card";
    if (item.windowNumber === state.windowNumber) {
      card.classList.add("is-active");
    }

    const label = document.createElement("p");
    label.className = "window-card-label";
    label.textContent = "Ventanilla";

    const window = document.createElement("strong");
    window.className = "window-card-window";
    window.textContent = item.windowNumber || "-";

    const numberLabel = document.createElement("p");
    numberLabel.className = "window-card-label";
    numberLabel.textContent = "Número";

    const number = document.createElement("div");
    number.className = "window-card-number";
    number.textContent = item.currentNumber === null || item.currentNumber === undefined ? "---" : formatNumber(item.currentNumber);

    card.append(label, window, numberLabel, number);
    windowCards.append(card);
  }

  document.body.classList.toggle("has-call", Boolean(state.windowNumber));
}

async function loadInitialState() {
  const response = await fetch("/api/state", { cache: "no-store" });
  render(await response.json());
}

function connectEvents() {
  const events = new EventSource("/events");
  events.addEventListener("state", (event) => render(JSON.parse(event.data)));
  events.addEventListener("error", () => {
    loadInitialState().catch(() => {});
  });
}

loadInitialState().catch(() => {});
connectEvents();
setInterval(() => loadInitialState().catch(() => {}), 3000);
