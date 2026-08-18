const updatedAt = document.querySelector("#updatedAt");
const sectionCards = document.querySelector("#sectionCards");
let lastRevision = -1;

function formatNumber(value) {
  return String(Number(value) || 0).padStart(3, "0");
}

function formatTime(value) {
  if (!value) return "Esperando actualización";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function render(state) {
  if (!state) return;
  if (state.revision === lastRevision) return;
  lastRevision = state.revision;

  const sections = Array.isArray(state.sections) ? state.sections : [];
  sectionCards.innerHTML = "";

  updatedAt.textContent = state.updatedAt ? `Última actualización ${formatTime(state.updatedAt)}` : "Esperando secciones";

  const activeSections = sections.filter((section) => Array.isArray(section.windows) && section.windows.length > 0);

  if (activeSections.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No hay ventanillas activas en este momento";
    sectionCards.append(empty);
    return;
  }

  for (const section of activeSections) {
    const sectionRow = document.createElement("section");
    sectionRow.className = "section-row";

    const header = document.createElement("div");
    header.className = "section-row-header";

    const windows = Array.isArray(section.windows) ? section.windows : [];
    const sectionName = section.name.replace(/^Sección\s+/i, '').trim() || section.code;

    const title = document.createElement("div");
    title.innerHTML = `
      <p class="section-card-title">${sectionName}</p>
      <p class="section-card-subtitle">${windows.length} ventanilla${windows.length === 1 ? '' : 's'} activada${windows.length === 1 ? '' : 's'}</p>
    `;

    header.append(title);

    const windowGrid = document.createElement("div");
    windowGrid.className = "window-cards";
    windowGrid.style.setProperty("--window-count", String(Math.max(1, windows.length)));

    if (windows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Sin llamados activos";
      windowGrid.append(empty);
    } else {
      for (const window of windows) {
        const card = document.createElement("article");
        card.className = "window-card";

        const windowBlock = document.createElement("div");
        windowBlock.className = "window-card-block";

        const windowLabel = document.createElement("p");
        windowLabel.className = "window-card-label";
        windowLabel.textContent = "VENTANILLA";

        const windowValue = document.createElement("p");
        windowValue.className = "window-card-window";
        windowValue.textContent = String(window.windowNumber);

        const callBlock = document.createElement("div");
        callBlock.className = "window-card-block";

        const callLabel = document.createElement("p");
        callLabel.className = "window-card-label window-card-label--secondary";
        callLabel.textContent = "NÚMERO";

        const callValue = document.createElement("p");
        callValue.className = "window-card-number";
        callValue.textContent = formatNumber(window.currentNumber);

        windowBlock.append(windowLabel, windowValue);
        callBlock.append(callLabel, callValue);
        card.append(windowBlock, callBlock);
        windowGrid.append(card);
      }
    }

    sectionRow.append(header, windowGrid);
    sectionCards.append(sectionRow);
  }
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
setInterval(() => loadInitialState().catch(() => {}), 1000);
