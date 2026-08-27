// DOM Elements
const updatedAt = document.querySelector("#updatedAt");
const sectionCards = document.querySelector("#sectionCards");
const screenTitle = document.querySelector("#screenTitle");
const activeSectorBadge = document.querySelector("#activeSectorBadge");
const sectorBadgeName = document.querySelector("#sectorBadgeName");
const changeSectorBtn = document.querySelector("#changeSectorBtn");
const sectorPicker = document.querySelector("#sectorPicker");
const sectorPickerCards = document.querySelector("#sectorPickerCards");
const audioToggleBtn = document.querySelector("#audioToggleBtn");
const audioIcon = document.querySelector("#audioIcon");
const audioBtnText = document.querySelector("#audioBtnText");
const audioSettingsBtn = document.querySelector("#audioSettingsBtn");
const audioModalOverlay = document.querySelector("#audioModalOverlay");
const closeAudioModalBtn = document.querySelector("#closeAudioModalBtn");
const saveAudioModalBtn = document.querySelector("#saveAudioModalBtn");
const voiceSelect = document.querySelector("#voiceSelect");
const voiceVolume = document.querySelector("#voiceVolume");
const voiceRate = document.querySelector("#voiceRate");
const volumeValue = document.querySelector("#volumeValue");
const rateValue = document.querySelector("#rateValue");
const chimeToggle = document.querySelector("#chimeToggle");
const testAudioBtn = document.querySelector("#testAudioBtn");
const audioPromptBanner = document.querySelector("#audioPromptBanner");
const enableAudioBannerBtn = document.querySelector("#enableAudioBannerBtn");

// State
let lastRevision = -1;
let lastProcessedCallId = null;
let isFirstStateLoad = true;
let audioCtx = null;
let voices = [];
const callQueue = [];
let isProcessingQueue = false;
let lastState = null;

// Sector seleccionado (variable inyectada desde la URL o nulo para mostrar listado)
let currentSectorCode = window.PATIENT_SECTION_CODE || null;

// Audio & TTS Settings (Persisted in localStorage)
const STORAGE_KEY = "cesfam_tts_settings";
let settings = {
  enabled: true,
  voiceURI: "",
  volume: 1.0,
  rate: 0.95,
  chime: true,
};

function loadStoredSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("No se pudo leer la configuración de audio:", e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("No se pudo guardar la configuración de audio:", e);
  }
}

function formatNumber(value) {
  return String(Number(value) || 0).padStart(3, "0");
}

function formatTime(value) {
  if (!value) return "Esperando actualización";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

// ---------------------------------------------------------------------------
// Web Audio API: Chime / Campanilla de Llamado
// ---------------------------------------------------------------------------
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playChime(volume = 1.0) {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const vol = Math.max(0, Math.min(1, volume));

      // Secuencia armónica suave estilo hospital / aeropuerto: C5 -> E5 -> G5
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.35 },
        { freq: 659.25, time: 0.11, duration: 0.45 },
        { freq: 783.99, time: 0.22, duration: 0.65 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        const startTime = now + note.time;
        const endTime = startTime + note.duration;

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.28 * vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime + 0.05);
      });

      setTimeout(resolve, 650);
    } catch (err) {
      console.warn("Error al reproducir campanilla:", err);
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// Web Speech API: Text-to-Speech
// ---------------------------------------------------------------------------
function getVoicePriority(voice) {
  if (!voice) return 0;
  const name = (voice.name || "").toLowerCase();
  const lang = (voice.lang || "").toLowerCase();
  if (name.includes("paulina")) return 100;
  if (lang === "es-mx" || lang.startsWith("es_mx")) return 80;
  if (lang.startsWith("es-cl") || lang.startsWith("es_cl")) return 60;
  if (lang.startsWith("es")) return 40;
  return 10;
}

function populateVoices() {
  if (!("speechSynthesis" in window)) return;

  voices = window.speechSynthesis.getVoices();
  if (!voiceSelect) return;

  voiceSelect.innerHTML = "";

  if (!voices.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Voz predeterminada del sistema";
    voiceSelect.append(opt);
    return;
  }

  // Ordenar voces con Paulina (es-MX) en primer lugar
  voices.sort((a, b) => getVoicePriority(b) - getVoicePriority(a));

  voices.forEach((voice) => {
    const opt = document.createElement("option");
    opt.value = voice.voiceURI;
    opt.textContent = `${voice.name} (${voice.lang})`;
    if (voice.voiceURI === settings.voiceURI) {
      opt.selected = true;
    }
    voiceSelect.append(opt);
  });

  // Si no hay voz configurada, predeterminar Paulina (es-MX)
  if (!settings.voiceURI) {
    const defaultVoice = voices.find((v) => v.name.toLowerCase().includes("paulina"))
      || voices.find((v) => v.lang.toLowerCase() === "es-mx" || v.lang.toLowerCase().startsWith("es_mx"))
      || voices.find((v) => v.lang.toLowerCase().startsWith("es"));

    if (defaultVoice) {
      settings.voiceURI = defaultVoice.voiceURI;
      voiceSelect.value = settings.voiceURI;
    }
  }
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = populateVoices;
  populateVoices();
}

function getSelectedVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (settings.voiceURI) {
    const matched = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (matched) return matched;
  }
  const paulina = voices.find((v) => v.name.toLowerCase().includes("paulina"));
  if (paulina) return paulina;

  const esMx = voices.find((v) => v.lang.toLowerCase() === "es-mx" || v.lang.toLowerCase().startsWith("es_mx"));
  if (esMx) return esMx;

  const esVoice = voices.find((v) => v.lang.toLowerCase().startsWith("es"));
  return esVoice || null;
}

function speakText(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getSelectedVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "es-MX";
      }

      utterance.volume = Number(settings.volume) || 1.0;
      utterance.rate = Number(settings.rate) || 0.95;
      utterance.pitch = 1.0;

      let hasFinished = false;
      const finish = () => {
        if (!hasFinished) {
          hasFinished = true;
          resolve();
        }
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn("TTS error:", e);
        finish();
      };

      setTimeout(finish, 8000);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Error al sintetizar voz:", e);
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// Cola de Audio y Resaltado Visual
// ---------------------------------------------------------------------------
function highlightWindowCard(sectionCode, windowNumber) {
  const cards = document.querySelectorAll(`.window-card[data-section="${sectionCode}"][data-window="${windowNumber}"]`);
  cards.forEach((card) => card.classList.add("is-calling"));

  return () => {
    cards.forEach((card) => card.classList.remove("is-calling"));
  };
}

async function processQueue() {
  if (isProcessingQueue || callQueue.length === 0) return;
  isProcessingQueue = true;

  const item = callQueue.shift();

  let removeHighlight = () => {};
  if (item.sectionCode && item.windowNumber) {
    removeHighlight = highlightWindowCard(item.sectionCode, item.windowNumber);
  }

  try {
    if (settings.chime) {
      await playChime(settings.volume);
    }
    await speakText(item.phrase);
  } catch (err) {
    console.warn("Error procesando locución en cola:", err);
  } finally {
    setTimeout(() => {
      removeHighlight();
      isProcessingQueue = false;
      if (callQueue.length > 0) {
        setTimeout(processQueue, 350);
      }
    }, 1200);
  }
}

// ---------------------------------------------------------------------------
// Diccionario Fonético para Términos y Siglas de Salud (Chile)
// ---------------------------------------------------------------------------
function normalizePhonetics(text) {
  if (!text) return "";

  let result = String(text);

  const PHONETIC_DICTIONARY = [
    { pattern: /\bSOME\b/gi, replacement: "Sóme" },
    { pattern: /\bOIRS\b/gi, replacement: "Óirs" },
    { pattern: /\bSAPU\b/gi, replacement: "Sápu" },
    { pattern: /\bCECOSF\b/gi, replacement: "Secósf" },
    { pattern: /\bCESFAM\b/gi, replacement: "Sésfam" },
    { pattern: /\bPNAC\b/gi, replacement: "Penác" },
    { pattern: /\bPACAM\b/gi, replacement: "Pacám" },
    { pattern: /\bCCR\b/gi, replacement: "C C R" },
    { pattern: /\bERA\b/gi, replacement: "Éra" },
    { pattern: /\bIRA\b/gi, replacement: "Íra" },
    { pattern: /\bBOX\b/gi, replacement: "Bocs" },
  ];

  PHONETIC_DICTIONARY.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });

  // Convertir palabras restantes en MAYÚSCULAS completas a formato Title Case (ej: FARMACIA -> Farmacia)
  // para evitar que los sintetizadores de voz las procesen como palabras en inglés
  result = result.replace(/\b[A-ZÁÉÍÓÚÑ]{2,}\b/g, (match) => {
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });

  return result;
}

function selectSector(code) {
  currentSectorCode = code ? code.toUpperCase() : null;
  lastRevision = -1;
  if (lastState) {
    render(lastState);
  }
}

changeSectorBtn?.addEventListener("click", () => {
  selectSector(null);
});

function announceCall(callData) {
  if (!settings.enabled) return;
  if (!callData || (!callData.calledNumber && !callData.patientName)) return;

  // Filtrado por sector: si la pantalla atiende un sector específico, ignorar llamados de otros sectores
  if (currentSectorCode && currentSectorCode !== "ALL") {
    const targetCode = (callData.sectionCode || "").toUpperCase();
    if (targetCode !== currentSectorCode) {
      return;
    }
  }

  const rawSection = (callData.sectionName || "").replace(/^Sección\s+/i, "").trim() || "Atención";
  const sectionPhonetic = normalizePhonetics(rawSection);
  const windowNum = callData.windowNumber || 1;
  const isBox = (callData.stationType === "box");
  const stationLabel = isBox ? "box" : "ventanilla";

  const cleanWin = String(windowNum).trim();
  let stationPhrase = "";
  if (/^(box|ventanilla)\b/i.test(cleanWin)) {
    stationPhrase = cleanWin;
  } else {
    stationPhrase = `${stationLabel} ${cleanWin}`;
  }

  let phrase = "";
  if (callData.patientName) {
    phrase = `Paciente ${callData.patientName}, diríjase a ${stationPhrase}, ${sectionPhonetic}`;
  } else {
    const number = Number(callData.calledNumber);
    phrase = `Número ${number}, diríjase a ${stationPhrase}, ${sectionPhonetic}`;
  }

  callQueue.push({
    phrase,
    sectionCode: callData.sectionCode,
    windowNumber: windowNum,
  });

  processQueue();
}

// ---------------------------------------------------------------------------
// UI & Control de Audio / Autoplay
// ---------------------------------------------------------------------------
function updateAudioUI() {
  try {
    if (audioToggleBtn) {
      if (settings.enabled) {
        audioToggleBtn.classList.remove("audio-pill-btn--off");
        audioToggleBtn.classList.add("audio-pill-btn--on");
        if (audioIcon) audioIcon.innerHTML = ICON_SPEAKER_ON;
        if (audioBtnText) audioBtnText.textContent = "Voz Activada";
        if (audioPromptBanner) audioPromptBanner.classList.add("hidden");
      } else {
        audioToggleBtn.classList.remove("audio-pill-btn--on");
        audioToggleBtn.classList.add("audio-pill-btn--off");
        if (audioIcon) audioIcon.innerHTML = ICON_SPEAKER_OFF;
        if (audioBtnText) audioBtnText.textContent = "Activar Voz";
        if (audioPromptBanner) audioPromptBanner.classList.remove("hidden");
      }
    }

    if (voiceVolume) voiceVolume.value = settings.volume;
    if (volumeValue) volumeValue.textContent = `${Math.round(settings.volume * 100)}%`;
    if (voiceRate) voiceRate.value = settings.rate;
    if (rateValue) rateValue.textContent = `${Number(settings.rate).toFixed(2)}x`;
    if (chimeToggle) chimeToggle.checked = settings.chime;
  } catch (err) {
    console.warn("Error actualizando interfaz de audio:", err);
  }
}

function enableAudio() {
  getAudioContext();
  settings.enabled = true;
  saveSettings();
  updateAudioUI();
}

function toggleAudio() {
  if (settings.enabled) {
    settings.enabled = false;
    window.speechSynthesis?.cancel();
    callQueue.length = 0;
  } else {
    getAudioContext();
    settings.enabled = true;
  }
  saveSettings();
  updateAudioUI();
}

// Event Listeners de Audio
audioToggleBtn?.addEventListener("click", toggleAudio);
enableAudioBannerBtn?.addEventListener("click", enableAudio);

audioSettingsBtn?.addEventListener("click", () => {
  populateVoices();
  audioModalOverlay.classList.remove("hidden");
});

closeAudioModalBtn?.addEventListener("click", () => {
  audioModalOverlay.classList.add("hidden");
});

saveAudioModalBtn?.addEventListener("click", () => {
  audioModalOverlay.classList.add("hidden");
});

audioModalOverlay?.addEventListener("click", (e) => {
  if (e.target === audioModalOverlay) {
    audioModalOverlay.classList.add("hidden");
  }
});

voiceSelect?.addEventListener("change", (e) => {
  settings.voiceURI = e.target.value;
  saveSettings();
});

voiceVolume?.addEventListener("input", (e) => {
  settings.volume = parseFloat(e.target.value);
  volumeValue.textContent = `${Math.round(settings.volume * 100)}%`;
  saveSettings();
});

voiceRate?.addEventListener("input", (e) => {
  settings.rate = parseFloat(e.target.value);
  rateValue.textContent = `${Number(settings.rate).toFixed(2)}x`;
  saveSettings();
});

chimeToggle?.addEventListener("change", (e) => {
  settings.chime = e.target.checked;
  saveSettings();
});

testAudioBtn?.addEventListener("click", async () => {
  enableAudio();
  if (settings.chime) {
    await playChime(settings.volume);
  }
  await speakText(`Prueba de sonido. Número cuarenta y dos, diríjase a ventanilla uno, ${normalizePhonetics("SOME")}.`);
});

// Desbloquear AudioContext en cualquier interacción del usuario si el audio está habilitado
const unlockAudio = () => {
  if (settings.enabled) {
    getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }
};

["click", "touchstart", "pointerdown", "keydown"].forEach((evt) => {
  document.addEventListener(evt, unlockAudio, { passive: true });
});

// ---------------------------------------------------------------------------
// Render y Manejo de Estado
// ---------------------------------------------------------------------------
function render(state) {
  if (!state) return;
  lastState = state;

  // Detección de nuevo llamado para locución TTS
  if (state.lastCall && state.lastCall.id) {
    if (isFirstStateLoad) {
      lastProcessedCallId = state.lastCall.id;
      isFirstStateLoad = false;
    } else if (state.lastCall.id !== lastProcessedCallId) {
      lastProcessedCallId = state.lastCall.id;
      announceCall(state.lastCall);
    }
  } else {
    isFirstStateLoad = false;
  }

  const sections = Array.isArray(state.sections) ? state.sections : [];

  // =========================================================================
  // CASO 1: No hay sector seleccionado -> Mostrar selector manual de sector
  // =========================================================================
  if (!currentSectorCode) {
    if (activeSectorBadge) activeSectorBadge.classList.add("hidden");
    if (sectionCards) sectionCards.innerHTML = "";
    if (screenTitle) screenTitle.textContent = "Seleccionar Sector";
    if (updatedAt) updatedAt.textContent = "Elige qué sector atenderá esta pantalla";
    if (sectorPicker) sectorPicker.classList.remove("hidden");

    if (sectorPickerCards) {
      sectorPickerCards.innerHTML = "";

      sections.forEach((sec) => {
        const isBox = (sec.stationType === "box");
        const stationLabel = isBox ? "Box de atención" : "Ventanilla";
        const winCount = Array.isArray(sec.windows) ? sec.windows.length : 0;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sector-picker-card";
        btn.innerHTML = `
          <strong class="sector-picker-card-name">${sec.name}</strong>
          <span class="sector-picker-card-type">${stationLabel}</span>
          <small class="sector-picker-card-info">${winCount} ${isBox ? (winCount === 1 ? 'box activo' : 'boxes activos') : (winCount === 1 ? 'ventanilla activa' : 'ventanillas activas')}</small>
        `;
        btn.addEventListener("click", () => {
          selectSector(sec.code);
        });
        sectorPickerCards.append(btn);
      });

      // Opción para ver todos los sectores en una sola pantalla
      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "sector-picker-card sector-picker-card--all";
      allBtn.innerHTML = `
        <strong class="sector-picker-card-name">Todos los Sectores</strong>
        <span class="sector-picker-card-type">Pantalla Global</span>
        <small class="sector-picker-card-info">Mostrar todas las atenciones activas</small>
      `;
      allBtn.addEventListener("click", () => {
        selectSector("ALL");
      });
      sectorPickerCards.append(allBtn);
    }
    return;
  }

  // =========================================================================
  // CASO 2: Sector seleccionado -> Mostrar ventanillas del sector
  // =========================================================================
  if (sectorPicker) sectorPicker.classList.add("hidden");

  let filteredSections = sections;
  let currentSectionObj = null;

  if (currentSectorCode !== "ALL") {
    filteredSections = sections.filter((s) => s.code.toUpperCase() === currentSectorCode.toUpperCase());
    currentSectionObj = sections.find((s) => s.code.toUpperCase() === currentSectorCode.toUpperCase());
  }

  if (activeSectorBadge) {
    activeSectorBadge.classList.remove("hidden");
    if (sectorBadgeName) {
      const displayName = currentSectionObj ? currentSectionObj.name : (currentSectorCode === "ALL" ? "Todos los Sectores" : currentSectorCode);
      sectorBadgeName.textContent = displayName;
    }
  }

  if (screenTitle) {
    screenTitle.textContent = currentSectionObj ? currentSectionObj.name : (currentSectorCode === "ALL" ? "Llamado de Atención" : `Sector ${currentSectorCode}`);
  }

  if (state.revision === lastRevision) return;
  lastRevision = state.revision;

  sectionCards.innerHTML = "";

  updatedAt.textContent = state.updatedAt ? `Última actualización ${formatTime(state.updatedAt)}` : "Esperando llamados";

  const activeSections = filteredSections.filter((section) => Array.isArray(section.windows) && section.windows.length > 0);

  if (activeSections.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    const sectorLabel = currentSectionObj ? currentSectionObj.name : (currentSectorCode === "ALL" ? "los sectores" : `sector ${currentSectorCode}`);
    empty.textContent = `No hay ventanillas activas para ${sectorLabel} en este momento`;
    sectionCards.append(empty);
    return;
  }

  for (const section of activeSections) {
    const sectionRow = document.createElement("section");
    sectionRow.className = "section-row";

    const windows = Array.isArray(section.windows) ? section.windows : [];
    const sectionName = section.name.replace(/^Sección\s+/i, "").trim() || section.code;
    const isBox = (section.stationType === "box");
    const stationWord = isBox ? "box" : "ventanilla";
    const stationWordPlural = isBox ? "boxes" : "ventanillas";
    const stationLabelText = isBox ? "BOX" : "VENTANILLA";

    // Solo mostrar cabecera de fila si es una vista global (múltiples secciones en pantalla)
    // para evitar duplicar el nombre de la sección que ya se muestra en el encabezado principal
    if (currentSectorCode === "ALL" || activeSections.length > 1) {
      const header = document.createElement("div");
      header.className = "section-row-header";
      const title = document.createElement("div");
      title.innerHTML = `
        <p class="section-card-title">${sectionName}</p>
        <p class="section-card-subtitle">${windows.length} ${windows.length === 1 ? stationWord : stationWordPlural} activad${isBox ? (windows.length === 1 ? "o" : "os") : (windows.length === 1 ? "a" : "as")}</p>
      `;
      header.append(title);
      sectionRow.append(header);
    }

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
        if (window.patientName) {
          card.classList.add("window-card--patient");
        }
        card.dataset.section = section.code;
        card.dataset.window = String(window.windowNumber);

        const windowBlock = document.createElement("div");
        windowBlock.className = "window-card-block";

        const windowLabel = document.createElement("p");
        windowLabel.className = "window-card-label";
        windowLabel.textContent = stationLabelText;

        const windowValue = document.createElement("p");
        windowValue.className = "window-card-window";
        if (window.patientName) {
          windowValue.classList.add("window-card-window--patient");
        }
        windowValue.textContent = String(window.windowNumber);

        const callBlock = document.createElement("div");
        callBlock.className = "window-card-block";

        const callLabel = document.createElement("p");
        callLabel.className = "window-card-label window-card-label--secondary";
        callLabel.textContent = window.patientName ? "PACIENTE" : "NÚMERO";

        const callValue = document.createElement("p");
        callValue.className = "window-card-number";
        if (window.patientName) {
          callValue.textContent = window.patientName;
          callValue.classList.add("window-card-number--patient");
        } else {
          callValue.textContent = formatNumber(window.currentNumber);
        }

        windowBlock.append(windowLabel, windowValue);
        callBlock.append(callLabel, callValue);
        card.append(windowBlock, callBlock);
        windowGrid.append(card);
      }
    }

    sectionRow.append(windowGrid);
    sectionCards.append(sectionRow);
  }
}

async function loadInitialState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.ok) {
      render(await response.json());
    }
  } catch (e) {
    console.warn("Error cargando estado:", e);
  }
}

function connectEvents() {
  try {
    const events = new EventSource("/events");
    events.addEventListener("state", (event) => render(JSON.parse(event.data)));
    events.addEventListener("error", () => {
      loadInitialState().catch(() => {});
    });
  } catch (e) {
    console.warn("EventSource no soportado o error:", e);
  }
}

// Inicialización
loadStoredSettings();
updateAudioUI();
if (settings.enabled) {
  getAudioContext();
}
loadInitialState().catch(() => {});
connectEvents();
setInterval(() => loadInitialState().catch(() => {}), 1000);

