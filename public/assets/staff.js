// DOM Elements - Queue View
const operatorName = document.querySelector("#operatorName");
const operatorRoleBadge = document.querySelector("#operatorRoleBadge");
const staffNavTabs = document.querySelector("#staffNavTabs");
const tabQueueBtn = document.querySelector("#tabQueueBtn");
const tabAdminBtn = document.querySelector("#tabAdminBtn");
const queueView = document.querySelector("#queueView");
const adminView = document.querySelector("#adminView");

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
const windowPanelKicker = document.querySelector("#windowPanelKicker");
const windowInputLabel = document.querySelector("#windowInputLabel");
const staffStationLabel = document.querySelector("#staffStationLabel");
const globalPanel = document.querySelector("#globalPanel");
const clearSectionCallsBtn = document.querySelector("#clearSectionCallsBtn");

// DOM Elements - Patient Queue (Modo Listado)
const patientListPanel = document.querySelector("#patientListPanel");
const patientPanelTitle = document.querySelector("#patientPanelTitle");
const patientStationTitle = document.querySelector("#patientStationTitle");
const patientStationValue = document.querySelector("#patientStationValue");
const addPatientForm = document.querySelector("#addPatientForm");
const patientNameInput = document.querySelector("#patientNameInput");
const patientIdentifierInput = document.querySelector("#patientIdentifierInput");
const patientTableBody = document.querySelector("#patientTableBody");
const patientStatusMessage = document.querySelector("#patientStatusMessage");

// DOM Elements - Admin View
const subtabSectionsBtn = document.querySelector("#subtabSectionsBtn");
const subtabUsersBtn = document.querySelector("#subtabUsersBtn");
const adminSectionsPanel = document.querySelector("#adminSectionsPanel");
const adminUsersPanel = document.querySelector("#adminUsersPanel");
const adminSectionsTableBody = document.querySelector("#adminSectionsTableBody");
const adminUsersTableBody = document.querySelector("#adminUsersTableBody");
const adminStatusMessage = document.querySelector("#adminStatusMessage");

// Modals
const sectionModal = document.querySelector("#sectionModal");
const sectionModalTitle = document.querySelector("#sectionModalTitle");
const sectionForm = document.querySelector("#sectionForm");
const sectionIdInput = document.querySelector("#sectionIdInput");
const sectionCodeInput = document.querySelector("#sectionCodeInput");
const sectionNameInput = document.querySelector("#sectionNameInput");
const sectionStationTypeInput = document.querySelector("#sectionStationTypeInput");
const sectionCallTypeInput = document.querySelector("#sectionCallTypeInput");
const openNewSectionModalBtn = document.querySelector("#openNewSectionModalBtn");
const closeSectionModalBtn = document.querySelector("#closeSectionModalBtn");
const cancelSectionModalBtn = document.querySelector("#cancelSectionModalBtn");

const userModal = document.querySelector("#userModal");
const userForm = document.querySelector("#userForm");
const userNameInput = document.querySelector("#userNameInput");
const userEmailInput = document.querySelector("#userEmailInput");
const userPasswordInput = document.querySelector("#userPasswordInput");
const userIsAdminInput = document.querySelector("#userIsAdminInput");
const userFormSectionsCheckboxes = document.querySelector("#userFormSectionsCheckboxes");
const openNewUserModalBtn = document.querySelector("#openNewUserModalBtn");
const closeUserModalBtn = document.querySelector("#closeUserModalBtn");
const cancelUserModalBtn = document.querySelector("#cancelUserModalBtn");

const scopeModal = document.querySelector("#scopeModal");
const scopeForm = document.querySelector("#scopeForm");
const scopeUserId = document.querySelector("#scopeUserId");
const scopeModalUserName = document.querySelector("#scopeModalUserName");
const scopeCheckboxesList = document.querySelector("#scopeCheckboxesList");
const closeScopeModalBtn = document.querySelector("#closeScopeModalBtn");
const cancelScopeModalBtn = document.querySelector("#cancelScopeModalBtn");

// State
let currentUser = null;
let currentState = null;
let currentSections = [];
let adminSections = [];
let adminUsers = [];

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

function setStatus(message, type = "info") {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.dataset.type = type;
}

function setAdminStatus(message, type = "info") {
  if (!adminStatusMessage) return;
  adminStatusMessage.textContent = message;
  adminStatusMessage.dataset.type = type;
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
    const message = typeof body === "string" ? body : body.error || body.message;
    throw new Error(message || "No se pudo completar la acción.");
  }

  return body;
}

// ---------------------------------------------------------------------------
// Queue Render & Logic
// ---------------------------------------------------------------------------
function render(state) {
  if (!state) return;
  currentState = state;

  const isBox = (state.stationType === "box");
  const stationWord = isBox ? "Box" : "Ventanilla";
  const isPatientList = (state.callType === "patient_list");

  if (staffTicket) staffTicket.textContent = formatNumber(state.currentNumber);
  if (staffWindow) staffWindow.textContent = state.windowNumber || "-";
  if (staffStationLabel) staffStationLabel.textContent = stationWord;
  if (windowPanelKicker) windowPanelKicker.textContent = isBox ? "Ingresa tu Box (nombre o número)" : "Ingresa tu ventanilla (nombre o número)";
  if (windowInputLabel) windowInputLabel.textContent = isBox ? "Nombre o número de Box" : "Número o nombre de ventanilla";
  if (windowInput) windowInput.placeholder = isBox ? "Ej: 1, 2, Dental, Curaciones, Respiratorio..." : "Ej: 1, 2, Preferencial...";
  if (staffUpdatedAt) staffUpdatedAt.textContent = state.updatedAt ? `Actualizado ${formatTime(state.updatedAt)}` : "Sin llamados registrados";
  if (setInput) setInput.value = state.currentNumber || 0;

  if (patientStationValue) {
    patientStationValue.textContent = state.windowNumber ? `${stationWord} ${state.windowNumber}` : "-";
  }

  const buttons = staffSectionCards?.querySelectorAll(".section-card") || [];
  buttons.forEach((button) => {
    const code = button.dataset.section;
    button.classList.toggle("active", code === state.sectionCode);
  });

  const windowList = state.windowNumber ? (state.windows || []) : [];
  if (windowCards) {
    windowCards.innerHTML = windowList.length ? windowList.map((win) => {
      return `
        <div class="window-card-item ${win.windowNumber === state.windowNumber ? "is-active" : ""}">
          <span class="summary-small-label">${stationWord} ${win.windowNumber}</span>
          <strong>${formatNumber(win.currentNumber)}</strong>
        </div>
      `;
    }).join("") : "";
    windowCards.classList.toggle("hidden", !state.windowNumber || !windowList.length);
  }

  const sectionSelected = state.sectionSelected === true;

  if (sectionSelected) {
    windowPanel?.classList.remove("hidden");

    if (state.windowNumber) {
      if (isPatientList) {
        globalPanel?.classList.add("hidden");
        patientListPanel?.classList.remove("hidden");
        loadPatients();
      } else {
        patientListPanel?.classList.add("hidden");
        globalPanel?.classList.remove("hidden");
      }
    } else {
      globalPanel?.classList.add("hidden");
      patientListPanel?.classList.add("hidden");
    }
  } else {
    windowPanel?.classList.add("hidden");
    globalPanel?.classList.add("hidden");
    patientListPanel?.classList.add("hidden");
  }
}

let currentPatients = [];

async function loadPatients() {
  try {
    const patients = await api("/api/patients");
    currentPatients = patients || [];
    renderPatients(currentPatients);
  } catch (err) {
    console.warn("Error cargando pacientes:", err);
  }
}

function renderPatients(patients) {
  if (!patientTableBody) return;

  if (!patients.length) {
    patientTableBody.innerHTML = `<tr><td colspan="6" class="text-center muted-line">No hay pacientes en la lista de espera de esta sección.</td></tr>`;
    return;
  }

  const currentWindow = windowInput?.value || 1;
  const isBox = (windowPanelKicker?.textContent.includes("Box"));
  const stationWord = isBox ? "Box" : "Ventanilla";

  patientTableBody.innerHTML = patients.map((p, index) => {
    let statusBadge = `<span class="scope-pill">Pendiente</span>`;
    let rowClass = "";
    if (p.status === "calling") {
      statusBadge = `<span class="role-badge role-badge--admin">Llamando...</span>`;
      rowClass = "is-calling-row";
    } else if (p.status === "attended") {
      statusBadge = `<span class="scope-pill scope-pill--blue">Atendido</span>`;
    }

    const stationCalled = p.station_number ? `${stationWord} ${p.station_number}` : "-";
    const calledTime = p.called_at ? formatTime(p.called_at) : "-";

    return `
      <tr class="${rowClass}">
        <td><strong>${index + 1}</strong></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.identifier || '<span class="muted-line">-</span>'}</td>
        <td>${statusBadge}</td>
        <td><small>${stationCalled} (${calledTime})</small></td>
        <td class="text-right table-actions">
          <button type="button" class="action-btn action-btn--call" data-call-patient="${p.id}">
            Llamar a ${stationWord} ${currentWindow}
          </button>
          ${p.status === "calling" ? `
            <button type="button" class="action-btn action-btn--attended" data-attend-patient="${p.id}">
              Atendido
            </button>
          ` : ""}
          <button type="button" class="action-btn action-btn--delete" data-delete-patient="${p.id}" title="Eliminar de la lista">
            &times;
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Listeners de llamada a paciente
  patientTableBody.querySelectorAll("[data-call-patient]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.callPatient;
      try {
        const res = await api(`/api/patients/${id}/call`, { method: "POST" });
        if (patientStatusMessage) {
          patientStatusMessage.textContent = res.message || "Paciente llamado.";
          patientStatusMessage.dataset.type = "success";
        }
        await loadPatients();
        await loadInitialState();
      } catch (err) {
        if (patientStatusMessage) {
          patientStatusMessage.textContent = err.message;
          patientStatusMessage.dataset.type = "error";
        }
      }
    });
  });

  patientTableBody.querySelectorAll("[data-attend-patient]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.attendPatient;
      try {
        await api(`/api/patients/${id}/status`, {
          method: "POST",
          body: JSON.stringify({ status: "attended" })
        });
        await loadPatients();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  patientTableBody.querySelectorAll("[data-delete-patient]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deletePatient;
      try {
        await api(`/api/patients/${id}`, { method: "DELETE" });
        await loadPatients();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function loadSections() {
  try {
    const sections = await api("/api/sections");
    currentSections = sections || [];

    if (!staffSectionCards) return;

    if (!sections.length) {
      staffSectionCards.innerHTML = `<p class="empty-state">No tienes sectores asignados para atender. Contacta a un administrador.</p>`;
      return;
    }

    staffSectionCards.innerHTML = sections.map((section) => {
      return `
        <button type="button" class="section-card" data-section="${section.code}">
          <span class="section-card-name">${section.name}</span>
          <strong>${section.code}</strong>
          <small class="section-card-hint">Toca para seleccionar</small>
        </button>
      `;
    }).join("");

    staffSectionCards.querySelectorAll(".section-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const code = card.dataset.section;
        try {
          await selectSection(code);
        } catch (error) {
          setStatus(error.message || "No se pudo seleccionar la sección.", "error");
        }
      });
    });
  } catch (err) {
    setStatus(err.message, "error");
  }
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
  currentUser = me.user;

  if (operatorName) {
    operatorName.textContent = (currentUser && currentUser.name) ? currentUser.name : ((currentUser && currentUser.email) ? currentUser.email : "Funcionario");
  }

  if (me.windowNumber && windowInput) {
    windowInput.value = me.windowNumber;
  }

  // Activar interfaz de Administrador si corresponde
  if (currentUser && currentUser.is_admin) {
    operatorRoleBadge?.classList.remove("hidden");
    staffNavTabs?.classList.remove("hidden");
  } else {
    operatorRoleBadge?.classList.add("hidden");
    staffNavTabs?.classList.add("hidden");
  }
}

async function loadInitialState() {
  try {
    render(await api("/api/state"));
  } catch (e) {
    console.warn("Error cargando estado:", e);
  }
}

function connectEvents() {
  try {
    const events = new EventSource("/events");
    events.addEventListener("state", (event) => render(JSON.parse(event.data)));
  } catch (e) {
    console.warn("Error EventSource:", e);
  }
}

// ---------------------------------------------------------------------------
// Panel de Administración (CRUD Secciones, Usuarios, Alcance)
// ---------------------------------------------------------------------------
function setupNavigationTabs() {
  tabQueueBtn?.addEventListener("click", async () => {
    tabQueueBtn.classList.add("is-active");
    tabAdminBtn?.classList.remove("is-active");
    queueView?.classList.remove("hidden");
    adminView?.classList.add("hidden");
    await loadSections();
    await loadInitialState();
  });

  tabAdminBtn?.addEventListener("click", async () => {
    tabAdminBtn.classList.add("is-active");
    tabQueueBtn?.classList.remove("is-active");
    queueView?.classList.add("hidden");
    adminView?.classList.remove("hidden");
    await loadAdminData();
  });

  subtabSectionsBtn?.addEventListener("click", () => {
    subtabSectionsBtn.classList.add("is-active");
    subtabUsersBtn?.classList.remove("is-active");
    adminSectionsPanel?.classList.remove("hidden");
    adminUsersPanel?.classList.add("hidden");
  });

  subtabUsersBtn?.addEventListener("click", () => {
    subtabUsersBtn.classList.add("is-active");
    subtabSectionsBtn?.classList.remove("is-active");
    adminUsersPanel?.classList.remove("hidden");
    adminSectionsPanel?.classList.add("hidden");
  });
}

async function loadAdminData() {
  try {
    const data = await api("/api/admin/data");
    adminSections = data.sections || [];
    adminUsers = data.users || [];

    renderAdminSections();
    renderAdminUsers();
  } catch (err) {
    setAdminStatus(err.message, "error");
  }
}

function renderAdminSections() {
  if (!adminSectionsTableBody) return;

  if (!adminSections.length) {
    adminSectionsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">No hay secciones registradas.</td></tr>`;
    return;
  }

  adminSectionsTableBody.innerHTML = adminSections.map((sec) => {
    const isBox = (sec.station_type === "box");
    const isList = (sec.call_type === "patient_list");
    return `
      <tr>
        <td><strong class="code-pill">${sec.code}</strong></td>
        <td><strong>${sec.name}</strong></td>
        <td><span class="scope-pill">${isBox ? "Box" : "Ventanilla"}</span></td>
        <td><span class="scope-pill ${isList ? 'scope-pill--blue' : ''}">${isList ? "Listado Pacientes" : "Por Números"}</span></td>
        <td><span class="number-badge">${formatNumber(sec.current_number)}</span></td>
        <td>${sec.windows_count || 0}</td>
        <td>${sec.users_count || 0}</td>
        <td class="text-right table-actions">
          <button type="button" class="action-btn action-btn--edit" data-edit-section="${sec.id}">Editar</button>
          <button type="button" class="action-btn action-btn--reset" data-reset-section="${sec.id}" title="Reiniciar contador a 0">Reiniciar</button>
          <button type="button" class="action-btn action-btn--delete" data-delete-section="${sec.id}">Eliminar</button>
        </td>
      </tr>
    `;
  }).join("");

  // Listeners de botones de sección
  adminSectionsTableBody.querySelectorAll("[data-edit-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.editSection);
      const sec = adminSections.find((s) => s.id === id);
      if (sec) openSectionModal(sec);
    });
  });

  adminSectionsTableBody.querySelectorAll("[data-reset-section]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.resetSection);
      const sec = adminSections.find((s) => s.id === id);
      if (sec && confirm(`¿Estás seguro de reiniciar el contador de ${sec.name} a 000?`)) {
        try {
          await api(`/api/admin/sections/${id}/reset`, { method: "POST" });
          setAdminStatus(`Contador de ${sec.code} reiniciado.`, "success");
          await loadAdminData();
          await loadInitialState();
        } catch (err) {
          setAdminStatus(err.message, "error");
        }
      }
    });
  });

  adminSectionsTableBody.querySelectorAll("[data-delete-section]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.deleteSection);
      const sec = adminSections.find((s) => s.id === id);
      if (sec && confirm(`¿Eliminar la sección ${sec.name} (${sec.code}) y todas sus ventanillas?`)) {
        try {
          await api(`/api/admin/sections/${id}`, { method: "DELETE" });
          setAdminStatus(`Sección ${sec.code} eliminada.`, "success");
          await loadAdminData();
          await loadSections();
          await loadInitialState();
        } catch (err) {
          setAdminStatus(err.message, "error");
        }
      }
    });
  });
}

function renderAdminUsers() {
  if (!adminUsersTableBody) return;

  if (!adminUsers.length) {
    adminUsersTableBody.innerHTML = `<tr><td colspan="5" class="text-center">No hay usuarios registrados.</td></tr>`;
    return;
  }

  adminUsersTableBody.innerHTML = adminUsers.map((user) => {
    const isSelf = currentUser && currentUser.id === user.id;
    const assignedSections = Array.isArray(user.sections) && user.sections.length > 0
      ? user.sections.map((s) => `<span class="scope-pill">${s.code}</span>`).join(" ")
      : `<span class="muted-line">Todas las secciones</span>`;

    const roleBadge = user.is_admin
      ? `<span class="role-badge role-badge--admin">Admin</span>`
      : `<span class="role-badge role-badge--staff">Funcionario</span>`;

    return `
      <tr>
        <td><strong>${user.name}</strong> ${isSelf ? '<small class="muted-line">(Tú)</small>' : ''}</td>
        <td>${user.email}</td>
        <td>
          <div class="user-role-cell">
            ${roleBadge}
            <button type="button" class="action-link-btn" data-toggle-role="${user.id}" data-current-role="${user.is_admin ? 1 : 0}">
              ${user.is_admin ? "Hacer Funcionario" : "Hacer Admin"}
            </button>
          </div>
        </td>
        <td>
          <div class="user-scope-cell">
            <div class="scope-pills-wrap">${assignedSections}</div>
            <button type="button" class="action-btn action-btn--scope" data-scope-user="${user.id}">Asignar</button>
          </div>
        </td>
        <td class="text-right table-actions">
          ${isSelf ? '<span class="muted-line">-</span>' : `<button type="button" class="action-btn action-btn--delete" data-delete-user="${user.id}">Eliminar</button>`}
        </td>
      </tr>
    `;
  }).join("");

  // Listeners de rol
  adminUsersTableBody.querySelectorAll("[data-toggle-role]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.toggleRole);
      const isCurrentlyAdmin = btn.dataset.currentRole === "1";
      const targetUser = adminUsers.find((u) => u.id === id);

      if (targetUser && confirm(`¿Cambiar el rol de ${targetUser.name} a ${isCurrentlyAdmin ? "Funcionario" : "Administrador"}?`)) {
        try {
          await api(`/api/admin/users/${id}/role`, {
            method: "POST",
            body: JSON.stringify({ is_admin: !isCurrentlyAdmin })
          });
          setAdminStatus(`Rol de ${targetUser.name} actualizado.`, "success");
          await loadAdminData();
          await loadMe();
        } catch (err) {
          setAdminStatus(err.message, "error");
        }
      }
    });
  });

  // Listeners de alcance de sección
  adminUsersTableBody.querySelectorAll("[data-scope-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.scopeUser);
      const targetUser = adminUsers.find((u) => u.id === id);
      if (targetUser) openScopeModal(targetUser);
    });
  });

  // Listeners de eliminación de usuario
  adminUsersTableBody.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.deleteUser);
      const targetUser = adminUsers.find((u) => u.id === id);
      if (targetUser && confirm(`¿Eliminar al usuario ${targetUser.name} (${targetUser.email})?`)) {
        try {
          await api(`/api/admin/users/${id}`, { method: "DELETE" });
          setAdminStatus(`Usuario ${targetUser.name} eliminado.`, "success");
          await loadAdminData();
        } catch (err) {
          setAdminStatus(err.message, "error");
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Modals Handlers
// ---------------------------------------------------------------------------
function openSectionModal(section = null) {
  if (section) {
    sectionModalTitle.textContent = "Editar Sección";
    sectionIdInput.value = section.id;
    sectionCodeInput.value = section.code;
    sectionNameInput.value = section.name;
    if (sectionStationTypeInput) sectionStationTypeInput.value = section.station_type || "ventanilla";
    if (sectionCallTypeInput) sectionCallTypeInput.value = section.call_type || "number";
  } else {
    sectionModalTitle.textContent = "Nueva Sección";
    sectionIdInput.value = "";
    sectionForm?.reset();
    if (sectionStationTypeInput) sectionStationTypeInput.value = "ventanilla";
    if (sectionCallTypeInput) sectionCallTypeInput.value = "number";
  }
  sectionModal?.classList.remove("hidden");
}

function openUserModal() {
  userForm?.reset();
  if (userFormSectionsCheckboxes) {
    userFormSectionsCheckboxes.innerHTML = adminSections.map((sec) => `
      <label class="scope-checkbox-item">
        <input type="checkbox" name="user_section" value="${sec.id}">
        <span><strong>${sec.code}</strong> - ${sec.name}</span>
      </label>
    `).join("");
  }
  userModal?.classList.remove("hidden");
}

function openScopeModal(user) {
  scopeUserId.value = user.id;
  scopeModalUserName.textContent = `Asignar alcance para: ${user.name} (${user.email})`;

  const assignedIds = new Set((user.sections || []).map((s) => s.id));

  if (scopeCheckboxesList) {
    scopeCheckboxesList.innerHTML = adminSections.map((sec) => `
      <label class="scope-checkbox-item">
        <input type="checkbox" name="assigned_section" value="${sec.id}" ${assignedIds.has(sec.id) ? "checked" : ""}>
        <span><strong>${sec.code}</strong> - ${sec.name}</span>
      </label>
    `).join("");
  }

  scopeModal?.classList.remove("hidden");
}

function setupModalListeners() {
  openNewSectionModalBtn?.addEventListener("click", () => openSectionModal());
  closeSectionModalBtn?.addEventListener("click", () => sectionModal?.classList.add("hidden"));
  cancelSectionModalBtn?.addEventListener("click", () => sectionModal?.classList.add("hidden"));

  openNewUserModalBtn?.addEventListener("click", () => openUserModal());
  closeUserModalBtn?.addEventListener("click", () => userModal?.classList.add("hidden"));
  cancelUserModalBtn?.addEventListener("click", () => userModal?.classList.add("hidden"));

  closeScopeModalBtn?.addEventListener("click", () => scopeModal?.classList.add("hidden"));
  cancelScopeModalBtn?.addEventListener("click", () => scopeModal?.classList.add("hidden"));

  // Enviar formulario de sección
  sectionForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = sectionIdInput.value;
    const payload = {
      code: sectionCodeInput.value,
      name: sectionNameInput.value,
      station_type: sectionStationTypeInput ? sectionStationTypeInput.value : "ventanilla",
      call_type: sectionCallTypeInput ? sectionCallTypeInput.value : "number"
    };

    try {
      if (id) {
        await api(`/api/admin/sections/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        setAdminStatus(`Sección ${payload.code} actualizada.`, "success");
      } else {
        await api("/api/admin/sections", { method: "POST", body: JSON.stringify(payload) });
        setAdminStatus(`Sección ${payload.code} creada con éxito.`, "success");
      }
      sectionModal?.classList.add("hidden");
      await loadAdminData();
      await loadSections();
    } catch (err) {
      alert(err.message);
    }
  });

  // Enviar formulario de nuevo usuario
  userForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectedSectionIds = Array.from(userFormSectionsCheckboxes.querySelectorAll("input:checked")).map((cb) => Number(cb.value));

    const payload = {
      name: userNameInput.value,
      email: userEmailInput.value,
      is_admin: userIsAdminInput.checked,
      section_ids: selectedSectionIds
    };

    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
      setAdminStatus(`Usuario institucional ${payload.name} registrado correctamente.`, "success");
      userModal?.classList.add("hidden");
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  });

  // Enviar formulario de alcance
  scopeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = scopeUserId.value;
    const selectedSectionIds = Array.from(scopeCheckboxesList.querySelectorAll("input:checked")).map((cb) => Number(cb.value));

    try {
      await api(`/api/admin/users/${userId}/sections`, {
        method: "POST",
        body: JSON.stringify({ section_ids: selectedSectionIds })
      });
      setAdminStatus("Alcance de secciones actualizado con éxito.", "success");
      scopeModal?.classList.add("hidden");
      await loadAdminData();
      await loadSections();
    } catch (err) {
      alert(err.message);
    }
  });

  // Enviar formulario de nuevo paciente en fila
  addPatientForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          name: patientNameInput.value,
          identifier: patientIdentifierInput.value
        })
      });
      patientNameInput.value = "";
      patientIdentifierInput.value = "";
      if (patientStatusMessage) {
        patientStatusMessage.textContent = res.message || "Paciente agregado.";
        patientStatusMessage.dataset.type = "success";
      }
      await loadPatients();
    } catch (err) {
      if (patientStatusMessage) {
        patientStatusMessage.textContent = err.message;
        patientStatusMessage.dataset.type = "error";
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Window Forms & Button Listeners (Atención)
// ---------------------------------------------------------------------------
windowForm?.addEventListener("submit", async (event) => {
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

nextButton?.addEventListener("click", async () => {
  try {
    render(await api("/api/next", { method: "POST", body: "{}" }));
    setStatus("Número siguiente llamado.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

previousButton?.addEventListener("click", async () => {
  try {
    render(await api("/api/previous", { method: "POST", body: "{}" }));
    setStatus("Número anterior seleccionado.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

recallButton?.addEventListener("click", async () => {
  try {
    render(await api("/api/recall", { method: "POST", body: "{}" }));
    setStatus("Llamado repetido.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

resetButton?.addEventListener("click", async () => {
  try {
    if (confirm("¿Estás seguro de reiniciar el contador de llamadas para esta sección?")) {
      render(await api("/api/reset", { method: "POST", body: "{}" }));
      setStatus("Contador reiniciado para todas las ventanillas de la sección.", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

clearSectionCallsBtn?.addEventListener("click", async () => {
  const activeCode = currentState?.sectionCode;
  const matchedSection = (currentSections || []).find((s) => s.code === activeCode)
    || (currentState?.sections || []).find((s) => s.code === activeCode);
  const currentSectionName = matchedSection?.name || activeCode || "esta sección";

  if (confirm(`¿Estás seguro de limpiar la pantalla pública de llamados para "${currentSectionName}"?`)) {
    try {
      const newState = await api("/api/clear", { method: "POST", body: "{}" });
      render(newState);
      if (newState?.callType === "patient_list") {
        await loadPatients();
      }
      setStatus(`Pantalla de llamados limpiada para ${currentSectionName}.`, "success");
    } catch (error) {
      setStatus(error.message || "Error al limpiar la pantalla", "error");
    }
  }
});

setForm?.addEventListener("submit", async (event) => {
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

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------
async function init() {
  setupNavigationTabs();
  setupModalListeners();
  await loadMe();
  await loadSections();
  await loadInitialState();
  connectEvents();
  setInterval(loadInitialState, 1000);
}

init().catch((error) => setStatus(error.message, "error"));
