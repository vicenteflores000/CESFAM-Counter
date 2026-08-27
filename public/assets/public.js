// DOM Elements
var updatedAt = document.querySelector("#updatedAt");
var sectionCards = document.querySelector("#sectionCards");
var screenTitle = document.querySelector("#screenTitle");
var activeSectorBadge = document.querySelector("#activeSectorBadge");
var sectorBadgeName = document.querySelector("#sectorBadgeName");
var changeSectorBtn = document.querySelector("#changeSectorBtn");
var sectorPicker = document.querySelector("#sectorPicker");
var sectorPickerCards = document.querySelector("#sectorPickerCards");
var audioToggleBtn = document.querySelector("#audioToggleBtn");
var audioIcon = document.querySelector("#audioIcon");
var audioBtnText = document.querySelector("#audioBtnText");
var audioSettingsBtn = document.querySelector("#audioSettingsBtn");
var audioModalOverlay = document.querySelector("#audioModalOverlay");
var closeAudioModalBtn = document.querySelector("#closeAudioModalBtn");
var saveAudioModalBtn = document.querySelector("#saveAudioModalBtn");
var voiceSelect = document.querySelector("#voiceSelect");
var voiceVolume = document.querySelector("#voiceVolume");
var voiceRate = document.querySelector("#voiceRate");
var volumeValue = document.querySelector("#volumeValue");
var rateValue = document.querySelector("#rateValue");
var chimeToggle = document.querySelector("#chimeToggle");
var testAudioBtn = document.querySelector("#testAudioBtn");
var audioPromptBanner = document.querySelector("#audioPromptBanner");
var enableAudioBannerBtn = document.querySelector("#enableAudioBannerBtn");

// Iconos SVG
var ICON_SPEAKER_ON = '<svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
var ICON_SPEAKER_OFF = '<svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

// State
var lastRevision = -1;
var lastProcessedCallId = null;
var isFirstStateLoad = true;
var audioCtx = null;
var voices = [];
var callQueue = [];
var isProcessingQueue = false;
var lastState = null;

// Sector seleccionado
var currentSectorCode = (typeof window !== "undefined" && window.PATIENT_SECTION_CODE) ? window.PATIENT_SECTION_CODE : null;

// Audio & TTS Settings
var STORAGE_KEY = "cesfam_tts_settings";
var settings = {
  enabled: true,
  voiceURI: "",
  volume: 1.0,
  rate: 0.95,
  chime: true
};

function loadStoredSettings() {
  try {
    if (typeof localStorage !== "undefined") {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          for (var key in parsed) {
            if (Object.prototype.hasOwnProperty.call(parsed, key)) {
              settings[key] = parsed[key];
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("No se pudo leer la configuración de audio:", e);
  }
}

function saveSettings() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch (e) {
    console.warn("No se pudo guardar la configuración de audio:", e);
  }
}

function formatNumber(value) {
  var num = parseInt(value, 10) || 0;
  if (num < 10) return "00" + num;
  if (num < 100) return "0" + num;
  return String(num);
}

function formatTime(value) {
  if (!value) return "Esperando actualización";
  try {
    var d = new Date(value);
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    var hh = h < 10 ? "0" + h : String(h);
    var mm = m < 10 ? "0" + m : String(m);
    var ss = s < 10 ? "0" + s : String(s);
    return hh + ":" + mm + ":" + ss;
  } catch (e) {
    return "Actualizado";
  }
}

// ---------------------------------------------------------------------------
// Web Audio API: Chime / Campanilla de Llamado
// ---------------------------------------------------------------------------
function getAudioContext() {
  if (!audioCtx) {
    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("AudioContext no disponible:", e);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    try {
      audioCtx.resume().catch(function () {});
    } catch (e) {}
  }
  return audioCtx;
}

function playChime(volume) {
  var volParam = typeof volume !== "undefined" ? volume : 1.0;
  return new Promise(function (resolve) {
    try {
      var ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      if (ctx.state === "suspended") {
        try {
          ctx.resume().catch(function () {});
        } catch (e) {}
      }

      var now = ctx.currentTime;
      var vol = Math.max(0, Math.min(1, volParam));

      var notes = [
        { freq: 523.25, time: 0.0, duration: 0.35 },
        { freq: 659.25, time: 0.11, duration: 0.45 },
        { freq: 783.99, time: 0.22, duration: 0.65 }
      ];

      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        var startTime = now + note.time;
        var endTime = startTime + note.duration;

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.28 * vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime + 0.05);
      }

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
  var name = (voice.name || "").toLowerCase();
  var lang = (voice.lang || "").toLowerCase();
  if (name.indexOf("paulina") !== -1) return 100;
  if (lang === "es-mx" || lang.indexOf("es_mx") === 0) return 80;
  if (lang.indexOf("es-cl") === 0 || lang.indexOf("es_cl") === 0) return 60;
  if (lang.indexOf("es") === 0) return 40;
  return 10;
}

function populateVoices() {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !window.speechSynthesis || typeof window.speechSynthesis.getVoices !== "function") {
      return;
    }

    var vList = window.speechSynthesis.getVoices();
    voices = Array.isArray(vList) ? vList : [];
    if (!voiceSelect) return;

    voiceSelect.innerHTML = "";

    if (!voices.length) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Voz predeterminada del sistema";
      voiceSelect.append(opt);
      return;
    }

    voices.sort(function (a, b) {
      return getVoicePriority(b) - getVoicePriority(a);
    });

    for (var i = 0; i < voices.length; i++) {
      var voice = voices[i];
      var optEl = document.createElement("option");
      optEl.value = voice.voiceURI;
      optEl.textContent = voice.name + " (" + voice.lang + ")";
      if (voice.voiceURI === settings.voiceURI) {
        optEl.selected = true;
      }
      voiceSelect.append(optEl);
    }

    if (!settings.voiceURI) {
      var defaultVoice = null;
      for (var j = 0; j < voices.length; j++) {
        var v = voices[j];
        var vName = (v.name || "").toLowerCase();
        var vLang = (v.lang || "").toLowerCase();
        if (vName.indexOf("paulina") !== -1) {
          defaultVoice = v;
          break;
        }
        if (!defaultVoice && (vLang === "es-mx" || vLang.indexOf("es_mx") === 0)) {
          defaultVoice = v;
        }
        if (!defaultVoice && vLang.indexOf("es") === 0) {
          defaultVoice = v;
        }
      }

      if (defaultVoice) {
        settings.voiceURI = defaultVoice.voiceURI;
        voiceSelect.value = settings.voiceURI;
      }
    }
  } catch (e) {
    console.warn("Error al cargar lista de voces:", e);
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis) {
  try {
    window.speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();
  } catch (e) {}
}

function getSelectedVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !window.speechSynthesis) return null;
  if (settings.voiceURI) {
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].voiceURI === settings.voiceURI) return voices[i];
    }
  }
  for (var j = 0; j < voices.length; j++) {
    if ((voices[j].name || "").toLowerCase().indexOf("paulina") !== -1) return voices[j];
  }
  for (var k = 0; k < voices.length; k++) {
    var l = (voices[k].lang || "").toLowerCase();
    if (l === "es-mx" || l.indexOf("es_mx") === 0) return voices[k];
  }
  for (var m = 0; m < voices.length; m++) {
    if ((voices[m].lang || "").toLowerCase().indexOf("es") === 0) return voices[m];
  }
  return null;
}

function speakText(text) {
  return new Promise(function (resolve) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      resolve();
      return;
    }

    try {
      if (typeof window.speechSynthesis.cancel === "function") {
        window.speechSynthesis.cancel();
      }

      var utterance = new window.SpeechSynthesisUtterance(text);
      var voice = getSelectedVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "es-MX";
      }

      utterance.volume = Number(settings.volume) || 1.0;
      utterance.rate = Number(settings.rate) || 0.95;
      utterance.pitch = 1.0;

      var hasFinished = false;
      var finish = function () {
        if (!hasFinished) {
          hasFinished = true;
          resolve();
        }
      };

      utterance.onend = finish;
      utterance.onerror = function (e) {
        console.warn("TTS error:", e);
        finish();
      };

      setTimeout(finish, 6000);
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
  var cards = document.querySelectorAll('.window-card[data-section="' + sectionCode + '"][data-window="' + windowNumber + '"]');
  for (var i = 0; i < cards.length; i++) {
    cards[i].classList.add("is-calling");
  }

  return function () {
    for (var j = 0; j < cards.length; j++) {
      cards[j].classList.remove("is-calling");
    }
  };
}

function processQueue() {
  if (isProcessingQueue || callQueue.length === 0) return;
  isProcessingQueue = true;

  var item = callQueue.shift();

  var removeHighlight = function () {};
  if (item.sectionCode && item.windowNumber) {
    removeHighlight = highlightWindowCard(item.sectionCode, item.windowNumber);
  }

  var playPromise = Promise.resolve();
  if (settings.chime) {
    playPromise = playChime(settings.volume);
  }

  playPromise
    .then(function () {
      return speakText(item.phrase);
    })
    .catch(function (err) {
      console.warn("Error procesando locución en cola:", err);
    })
    .then(function () {
      setTimeout(function () {
        removeHighlight();
        isProcessingQueue = false;
        if (callQueue.length > 0) {
          setTimeout(processQueue, 350);
        }
      }, 1200);
    });
}

// ---------------------------------------------------------------------------
// Diccionario Fonético para Términos y Siglas de Salud (Chile)
// ---------------------------------------------------------------------------
function normalizePhonetics(text) {
  if (!text) return "";

  var result = String(text);

  var PHONETIC_DICTIONARY = [
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
    { pattern: /\bBOX\b/gi, replacement: "Bocs" }
  ];

  for (var i = 0; i < PHONETIC_DICTIONARY.length; i++) {
    result = result.replace(PHONETIC_DICTIONARY[i].pattern, PHONETIC_DICTIONARY[i].replacement);
  }

  result = result.replace(/\b[A-ZÁÉÍÓÚÑ]{2,}\b/g, function (match) {
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });

  return result;
}

function selectSector(code) {
  currentSectorCode = code ? String(code).toUpperCase() : null;
  lastRevision = -1;
  if (lastState) {
    render(lastState);
  }
}

if (changeSectorBtn) {
  changeSectorBtn.addEventListener("click", function () {
    selectSector(null);
  });
}

function announceCall(callData) {
  if (!settings.enabled) return;
  if (!callData || (!callData.calledNumber && !callData.patientName)) return;

  if (currentSectorCode && currentSectorCode !== "ALL") {
    var targetCode = (callData.sectionCode || "").toUpperCase();
    if (targetCode !== currentSectorCode) {
      return;
    }
  }

  var rawSection = (callData.sectionName || "").replace(/^Sección\s+/i, "").trim() || "Atención";
  var sectionPhonetic = normalizePhonetics(rawSection);
  var windowNum = callData.windowNumber || 1;
  var isBox = (callData.stationType === "box");
  var stationLabel = isBox ? "box" : "ventanilla";

  var cleanWin = String(windowNum).trim();
  var stationPhrase = "";
  if (/^(box|ventanilla)\b/i.test(cleanWin)) {
    stationPhrase = cleanWin;
  } else {
    stationPhrase = stationLabel + " " + cleanWin;
  }

  var phrase = "";
  if (callData.patientName) {
    phrase = "Paciente " + callData.patientName + ", diríjase a " + stationPhrase + ", " + sectionPhonetic;
  } else {
    var number = Number(callData.calledNumber);
    phrase = "Número " + number + ", diríjase a " + stationPhrase + ", " + sectionPhonetic;
  }

  callQueue.push({
    phrase: phrase,
    sectionCode: callData.sectionCode,
    windowNumber: windowNum
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
    if (volumeValue) volumeValue.textContent = Math.round(settings.volume * 100) + "%";
    if (voiceRate) voiceRate.value = settings.rate;
    if (rateValue) rateValue.textContent = Number(settings.rate).toFixed(2) + "x";
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
    if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    callQueue.length = 0;
  } else {
    getAudioContext();
    settings.enabled = true;
  }
  saveSettings();
  updateAudioUI();
}

if (audioToggleBtn) {
  audioToggleBtn.addEventListener("click", toggleAudio);
}
if (enableAudioBannerBtn) {
  enableAudioBannerBtn.addEventListener("click", enableAudio);
}

if (audioSettingsBtn) {
  audioSettingsBtn.addEventListener("click", function () {
    populateVoices();
    if (audioModalOverlay) audioModalOverlay.classList.remove("hidden");
  });
}

if (closeAudioModalBtn) {
  closeAudioModalBtn.addEventListener("click", function () {
    if (audioModalOverlay) audioModalOverlay.classList.add("hidden");
  });
}

if (saveAudioModalBtn) {
  saveAudioModalBtn.addEventListener("click", function () {
    if (audioModalOverlay) audioModalOverlay.classList.add("hidden");
  });
}

if (audioModalOverlay) {
  audioModalOverlay.addEventListener("click", function (e) {
    if (e.target === audioModalOverlay) {
      audioModalOverlay.classList.add("hidden");
    }
  });
}

if (voiceSelect) {
  voiceSelect.addEventListener("change", function (e) {
    settings.voiceURI = e.target.value;
    saveSettings();
  });
}

if (voiceVolume) {
  voiceVolume.addEventListener("input", function (e) {
    settings.volume = parseFloat(e.target.value);
    if (volumeValue) volumeValue.textContent = Math.round(settings.volume * 100) + "%";
    saveSettings();
  });
}

if (voiceRate) {
  voiceRate.addEventListener("input", function (e) {
    settings.rate = parseFloat(e.target.value);
    if (rateValue) rateValue.textContent = Number(settings.rate).toFixed(2) + "x";
    saveSettings();
  });
}

if (chimeToggle) {
  chimeToggle.addEventListener("change", function (e) {
    settings.chime = e.target.checked;
    saveSettings();
  });
}

if (testAudioBtn) {
  testAudioBtn.addEventListener("click", function () {
    enableAudio();
    var p = Promise.resolve();
    if (settings.chime) {
      p = playChime(settings.volume);
    }
    p.then(function () {
      speakText("Prueba de sonido. Número cuarenta y dos, diríjase a ventanilla uno, " + normalizePhonetics("SOME") + ".");
    });
  });
}

var unlockAudio = function () {
  if (settings.enabled) {
    getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      try {
        audioCtx.resume().catch(function () {});
      } catch (e) {}
    }
  }
};

["click", "touchstart", "pointerdown", "keydown"].forEach(function (evt) {
  document.addEventListener(evt, unlockAudio, { passive: true });
});

// ---------------------------------------------------------------------------
// Render y Manejo de Estado
// ---------------------------------------------------------------------------
function render(state) {
  if (!state) return;
  lastState = state;

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

  var sections = Array.isArray(state.sections) ? state.sections : [];

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

      for (var i = 0; i < sections.length; i++) {
        (function (sec) {
          var isBox = (sec.stationType === "box");
          var stationLabel = isBox ? "Box de atención" : "Ventanilla";
          var winCount = Array.isArray(sec.windows) ? sec.windows.length : 0;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "sector-picker-card";
          btn.innerHTML =
            '<strong class="sector-picker-card-name">' + sec.name + '</strong>' +
            '<span class="sector-picker-card-type">' + stationLabel + '</span>' +
            '<small class="sector-picker-card-info">' + winCount + ' ' + (isBox ? (winCount === 1 ? 'box activo' : 'boxes activos') : (winCount === 1 ? 'ventanilla activa' : 'ventanillas activas')) + '</small>';
          btn.addEventListener("click", function () {
            selectSector(sec.code);
          });
          sectorPickerCards.append(btn);
        })(sections[i]);
      }

      var allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "sector-picker-card sector-picker-card--all";
      allBtn.innerHTML =
        '<strong class="sector-picker-card-name">Todos los Sectores</strong>' +
        '<span class="sector-picker-card-type">Pantalla Global</span>' +
        '<small class="sector-picker-card-info">Mostrar todas las atenciones activas</small>';
      allBtn.addEventListener("click", function () {
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

  var filteredSections = sections;
  var currentSectionObj = null;

  if (currentSectorCode !== "ALL") {
    filteredSections = [];
    for (var sIdx = 0; sIdx < sections.length; sIdx++) {
      if (String(sections[sIdx].code).toUpperCase() === currentSectorCode.toUpperCase()) {
        filteredSections.push(sections[sIdx]);
        currentSectionObj = sections[sIdx];
      }
    }
  }

  if (activeSectorBadge) {
    activeSectorBadge.classList.remove("hidden");
    if (sectorBadgeName) {
      var displayName = currentSectionObj ? currentSectionObj.name : (currentSectorCode === "ALL" ? "Todos los Sectores" : currentSectorCode);
      sectorBadgeName.textContent = displayName;
    }
  }

  if (screenTitle) {
    screenTitle.textContent = currentSectionObj ? currentSectionObj.name : (currentSectorCode === "ALL" ? "Llamado de Atención" : "Sector " + currentSectorCode);
  }

  if (state.revision === lastRevision) return;
  lastRevision = state.revision;

  if (sectionCards) sectionCards.innerHTML = "";

  if (updatedAt) {
    updatedAt.textContent = state.updatedAt ? "Última actualización " + formatTime(state.updatedAt) : "Esperando llamados";
  }

  var activeSections = [];
  for (var aIdx = 0; aIdx < filteredSections.length; aIdx++) {
    var fSec = filteredSections[aIdx];
    if (Array.isArray(fSec.windows) && fSec.windows.length > 0) {
      activeSections.push(fSec);
    }
  }

  if (activeSections.length === 0) {
    var empty = document.createElement("p");
    empty.className = "empty-state";
    var sectorLabel = currentSectionObj ? currentSectionObj.name : (currentSectorCode === "ALL" ? "los sectores" : "sector " + currentSectorCode);
    empty.textContent = "No hay ventanillas activas para " + sectorLabel + " en este momento";
    if (sectionCards) sectionCards.append(empty);
    return;
  }

  for (var secIdx = 0; secIdx < activeSections.length; secIdx++) {
    var section = activeSections[secIdx];
    var sectionRow = document.createElement("section");
    sectionRow.className = "section-row";

    var windows = Array.isArray(section.windows) ? section.windows : [];
    var sectionName = (section.name || "").replace(/^Sección\s+/i, "").trim() || section.code;
    var isBoxSec = (section.stationType === "box");
    var stationWord = isBoxSec ? "box" : "ventanilla";
    var stationWordPlural = isBoxSec ? "boxes" : "ventanillas";
    var stationLabelText = isBoxSec ? "BOX" : "VENTANILLA";

    if (currentSectorCode === "ALL" || activeSections.length > 1) {
      var header = document.createElement("div");
      header.className = "section-row-header";
      var title = document.createElement("div");
      title.innerHTML =
        '<p class="section-card-title">' + sectionName + '</p>' +
        '<p class="section-card-subtitle">' + windows.length + ' ' + (windows.length === 1 ? stationWord : stationWordPlural) + ' activad' + (isBoxSec ? (windows.length === 1 ? "o" : "os") : (windows.length === 1 ? "a" : "as")) + '</p>';
      header.append(title);
      sectionRow.append(header);
    }

    var windowGrid = document.createElement("div");
    windowGrid.className = "window-cards";
    var count = Math.max(1, windows.length);
    windowGrid.style.gridTemplateColumns = "repeat(" + count + ", minmax(0, 1fr))";

    if (windows.length === 0) {
      var emptyCard = document.createElement("p");
      emptyCard.className = "empty-state";
      emptyCard.textContent = "Sin llamados activos";
      windowGrid.append(emptyCard);
    } else {
      for (var wIdx = 0; wIdx < windows.length; wIdx++) {
        var win = windows[wIdx];
        var card = document.createElement("article");
        card.className = "window-card";
        if (win.patientName) {
          card.classList.add("window-card--patient");
        }
        card.setAttribute("data-section", section.code);
        card.setAttribute("data-window", String(win.windowNumber));

        var windowBlock = document.createElement("div");
        windowBlock.className = "window-card-block";

        var windowLabel = document.createElement("p");
        windowLabel.className = "window-card-label";
        windowLabel.textContent = stationLabelText;

        var windowValue = document.createElement("p");
        windowValue.className = "window-card-window";
        if (win.patientName) {
          windowValue.classList.add("window-card-window--patient");
        }
        windowValue.textContent = String(win.windowNumber);

        var callBlock = document.createElement("div");
        callBlock.className = "window-card-block";

        var callLabel = document.createElement("p");
        callLabel.className = "window-card-label window-card-label--secondary";
        callLabel.textContent = win.patientName ? "PACIENTE" : "NÚMERO";

        var callValue = document.createElement("p");
        callValue.className = "window-card-number";
        if (win.patientName) {
          callValue.textContent = win.patientName;
          callValue.classList.add("window-card-number--patient");
        } else {
          callValue.textContent = formatNumber(win.currentNumber);
        }

        windowBlock.append(windowLabel, windowValue);
        callBlock.append(callLabel, callValue);
        card.append(windowBlock, callBlock);
        windowGrid.append(card);
      }
    }

    sectionRow.append(windowGrid);
    if (sectionCards) sectionCards.append(sectionRow);
  }
}

function loadInitialState() {
  var url = "/api/state?_t=" + new Date().getTime();
  if (typeof fetch === "function") {
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        render(data);
      })
      .catch(function (err) {
        console.warn("Fetch error, fallback to XHR:", err);
        fallbackXHR();
      });
  } else {
    fallbackXHR();
  }

  function fallbackXHR() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            render(JSON.parse(xhr.responseText));
          } catch (e) {
            console.warn("Error parsing state JSON:", e);
          }
        }
      };
      xhr.send();
    } catch (e) {
      console.warn("XHR error:", e);
    }
  }
}

function connectEvents() {
  try {
    if (typeof window !== "undefined" && typeof window.EventSource === "function") {
      var events = new window.EventSource("/events");
      events.addEventListener("state", function (event) {
        try {
          render(JSON.parse(event.data));
        } catch (e) {}
      });
      events.addEventListener("error", function () {
        loadInitialState();
      });
    } else {
      loadInitialState();
    }
  } catch (e) {
    console.warn("EventSource no soportado o error:", e);
    loadInitialState();
  }
}

// Inicialización segura
try {
  loadStoredSettings();
  updateAudioUI();
  if (typeof window !== "undefined" && window.INITIAL_STATE) {
    try {
      render(window.INITIAL_STATE);
    } catch (renderStateErr) {
      console.warn("Error renderizando INITIAL_STATE:", renderStateErr);
    }
  }
  loadInitialState();
  connectEvents();
  setInterval(loadInitialState, 2000);
} catch (initErr) {
  console.warn("Error en inicio de public.js:", initErr);
  loadInitialState();
}
