const operatorName = document.querySelector("#operatorName");
const staffTicket = document.querySelector("#staffTicket");
const staffWindow = document.querySelector("#staffWindow");
const staffUpdatedAt = document.querySelector("#staffUpdatedAt");
const windowForm = document.querySelector("#windowForm");
const windowInput = document.querySelector("#windowInput");
const nextButton = document.querySelector("#nextButton");
const recallButton = document.querySelector("#recallButton");
const previousButton = document.querySelector("#previousButton");
const resetButton = document.querySelector("#resetButton");
const setForm = document.querySelector("#setForm");
const setInput = document.querySelector("#setInput");
const statusMessage = document.querySelector("#statusMessage");
const staffSectionCards = document.querySelector("#staffSectionCards");
const windowCards = document.querySelector("#windowCards");
const windowPanel = document.querySelector("#windowPanel");
const globalPanel = document.querySelector("#globalPanel");

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

  const buttons = staffSectionCards.querySelectorAll('.section-card');
  buttons.forEach((button) => {
    const code = button.dataset.section;
    button.classList.toggle('active', code === state.sectionCode);
  });

  const windowList = state.windowNumber ? (state.windows || []) : [];
  windowCards.innerHTML = windowList.length ? windowList.map((win) => {
    return `
      <div class="window-card-item ${win.windowNumber === state.windowNumber ? 'is-active' : ''}">
        <span class="summary-small-label">Ventanilla ${win.windowNumber}</span>
        <strong>${formatNumber(win.currentNumber)}</strong>
      </div>
    `;
  }).join('') : '';
  windowCards.classList.toggle('hidden', !state.windowNumber || !windowList.length);

  const sectionSelected = state.sectionSelected === true;

  if (sectionSelected) {
    windowPanel.classList.remove('hidden');
    if (state.windowNumber) {
      globalPanel.classList.remove('hidden');
    } else {
      globalPanel.classList.add('hidden');
    }
  } else {
    windowPanel.classList.add('hidden');
    globalPanel.classList.add('hidden');
  }
}

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.type = type;
}

async function api(path, options = {}) {
  const token = document.querySelector('meta[name="csrf-token"]')?.content;
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { "X-CSRF-TOKEN": token } : {})
    },
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

async function loadSections() {
  const sections = await api("/api/sections");

  staffSectionCards.innerHTML = sections.map((section) => {
    return `
      <button type="button" class="section-card" data-section="${section.code}">
        <span class="section-card-name">${section.name}</span>
        <strong>${section.code}</strong>
        <small class="section-card-hint">Toca para seleccionar</small>
      </button>
    `;
  }).join('');

  staffSectionCards.querySelectorAll('.section-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const code = card.dataset.section;
      try {
        await selectSection(code);
      } catch (error) {
        setStatus(error.message || 'No se pudo seleccionar la sección.', 'error');
      }
    });
  });
}

async function selectSection(code) {
  await api("/api/section", {
    method: "POST",
    body: JSON.stringify({ sectionCode: code })
  });
  await loadInitialState();
}

async function loadMe() {
  const me = await api("/api/me");
  operatorName.textContent = (me.user && me.user.name) ? me.user.name : ((me.user && me.user.email) ? me.user.email : "Funcionario");
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

previousButton.addEventListener("click", async () => {
  try {
    render(await api("/api/previous", { method: "POST", body: "{}" }));
    setStatus("Número anterior seleccionado.", "success");
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

resetButton.addEventListener("click", async () => {
  try {
    render(await api("/api/reset", { method: "POST", body: "{}" }));
    setStatus("Contador reiniciado para todas las ventanillas.", "success");
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

async function init() {
  await loadSections();
  await loadMe();
  await loadInitialState();
  connectEvents();
  setInterval(loadInitialState, 1000);
}

init().catch((error) => setStatus(error.message, "error"));
