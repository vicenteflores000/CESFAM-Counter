<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CESFAM - Llamado de Atención</title>
    <link rel="stylesheet" href="{{ asset('assets/styles.css') }}">
  </head>
  <body class="patient-screen">
    <main class="display-shell" aria-live="polite">
      <section class="display-panel">
        <header class="display-header-bar">
          <div class="display-branding">
            <img src="{{ asset('assets/logo.png') }}" alt="Logo Salud Doñihue" class="header-logo">
            <div class="display-title-wrap">
              <span class="brand-subtitle">SALUD &bull; I. MUNICIPALIDAD DE DOÑIHUE</span>
              <h1 id="screenTitle" class="display-main-title">Llamado de Atención</h1>
              <p id="updatedAt" class="display-time">Esperando actualización</p>
            </div>
          </div>

          <div class="header-actions">
            <div id="activeSectorBadge" class="sector-badge hidden">
              <span id="sectorBadgeName" class="sector-badge-name">Sector</span>
              <button id="changeSectorBtn" type="button" class="sector-badge-change" title="Cambiar sector">Cambiar</button>
            </div>

            <div class="audio-controls-group">
              <button id="audioToggleBtn" type="button" class="audio-pill-btn audio-pill-btn--on" title="Silenciar / Activar voz de llamados">
                <span id="audioIcon" class="audio-pill-icon">
                  <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                </span>
                <span id="audioBtnText">Voz Activada</span>
              </button>
              <button id="audioSettingsBtn" type="button" class="audio-icon-btn" title="Configuración de voz y audio" aria-label="Configuración de audio">
                <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Selector manual de sector (visible cuando no se ha seleccionado sector) -->
        <section id="sectorPicker" class="sector-picker hidden">
          <div class="sector-picker-header">
            <h2 class="sector-picker-title">Selecciona el sector para esta pantalla</h2>
            <p class="sector-picker-subtitle">Esta pantalla mostrará y llamará exclusivamente los números del sector elegido.</p>
          </div>
          <div id="sectorPickerCards" class="sector-picker-grid"></div>
        </section>

        <!-- Grilla de tarjetas de ventanilla -->
        <div id="sectionCards" class="section-cards"></div>

        <div class="patient-access-wrap">
          <a class="staff-access" href="/staff" aria-label="Acceso funcionarios">acceso funcionarios</a>
        </div>
      </section>
    </main>

    <script>
      window.PATIENT_SECTION_CODE = @json($sectionCode ?? request('code'));
    </script>

    <!-- Modal de Configuración de Audio / TTS -->
    <div id="audioModalOverlay" class="audio-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="audioModalTitle">
      <div class="audio-modal">
        <div class="audio-modal-header">
          <h2 id="audioModalTitle" class="audio-modal-title">Configuración de Voz (TTS)</h2>
          <button id="closeAudioModalBtn" type="button" class="audio-modal-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="audio-modal-body">
          <div class="form-field">
            <label for="voiceSelect">Voz disponible</label>
            <select id="voiceSelect" class="audio-select"></select>
          </div>
          <div class="form-field">
            <div class="field-label-row">
              <label for="voiceVolume">Volumen</label>
              <span id="volumeValue" class="field-value-badge">100%</span>
            </div>
            <input type="range" id="voiceVolume" min="0" max="1" step="0.05" value="1">
          </div>
          <div class="form-field">
            <div class="field-label-row">
              <label for="voiceRate">Velocidad</label>
              <span id="rateValue" class="field-value-badge">0.95x</span>
            </div>
            <input type="range" id="voiceRate" min="0.6" max="1.4" step="0.05" value="0.95">
          </div>
          <div class="form-field form-field--checkbox">
            <label class="checkbox-label">
              <input type="checkbox" id="chimeToggle" checked>
              <span>Tocar campanilla (chime) antes de hablar</span>
            </label>
          </div>
        </div>
        <div class="audio-modal-footer">
          <button id="testAudioBtn" type="button" class="secondary-action">Probar Llamado</button>
          <button id="saveAudioModalBtn" type="button" class="primary-action">Aceptar</button>
        </div>
      </div>
    </div>

    <!-- Banner recordatorio de activación inicial para navegadores con política autoplay -->
    <div id="audioPromptBanner" class="audio-prompt-banner hidden">
      <div class="audio-prompt-content">
        <span class="audio-prompt-icon">
          <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </span>
        <span>Haz clic para habilitar el audio y locución de llamados</span>
      </div>
      <button id="enableAudioBannerBtn" type="button" class="audio-prompt-btn">Habilitar Audio</button>
    </div>

    <script src="{{ asset('assets/public.js') }}"></script>
  </body>
</html>
