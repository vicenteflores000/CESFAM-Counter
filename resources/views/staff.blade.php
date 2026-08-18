<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ventanilla - CESFAM</title>
    <link rel="stylesheet" href="{{ asset('assets/styles.css') }}">
  </head>
  <body class="staff-screen">
    <header class="staff-header">
      <div>
        <p class="section-label">Panel de ventanilla</p>
        <h1 id="operatorName">Funcionario</h1>
      </div>
      <a class="ghost-action" href="/logout">Salir</a>
    </header>

    <main class="staff-layout">
      <section class="setup-row">
        <div class="setup-column">
          <section class="setup-panel section-card-panel">
            <div class="section-card-header">
              <p class="section-card-kicker">Elige una sección</p>
              <p class="section-card-copy">Selecciona la sección que atiendes para continuar con la ventanilla.</p>
            </div>
            <div id="staffSectionCards" class="section-card-grid"></div>
          </section>
        </div>

        <div class="setup-column">
          <section id="windowPanel" class="window-panel section-card-panel hidden">
            <div class="section-card-header">
              <p class="section-card-kicker">Ingresa tu ventanilla</p>
              <p class="section-card-copy">Esta operación solo se muestra después de elegir una sección.</p>
            </div>
            <form id="windowForm" class="form-row">
              <label for="windowInput">Número de ventanilla</label>
              <div class="inline-controls">
                <input id="windowInput" name="windowNumber" type="text" inputmode="numeric" maxlength="12" autocomplete="off" required>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </section>
        </div>
      </section>

      <section id="globalPanel" class="global-row hidden">
        <div class="global-column">
          <section class="summary-panel section-card-panel">
            <div class="summary-heading">
              <p class="section-card-kicker">Llamado actual</p>
            </div>

            <div class="summary-main">
              <div class="summary-number-panel">
                <span class="summary-label">Número en curso</span>
                <div id="staffTicket" class="staff-ticket">000</div>
              </div>
              <div class="summary-windows summary-windows--single">
                <div>
                  <span class="summary-small-label">Ventanilla</span>
                  <strong id="staffWindow">-</strong>
                </div>
              </div>
            </div>

            <div id="windowCards" class="window-card-grid"></div>

            <div class="summary-footer">
              <p id="staffUpdatedAt" class="muted-line">Sin llamados registrados</p>
            </div>
          </section>
        </div>

        <div class="global-column">
          <section class="controls-panel section-card-panel">
            <div class="summary-heading">
              <p class="section-card-kicker">Controles</p>
              <p class="section-card-copy">Usa estos botones para llamar, retroceder y repetir números.</p>
            </div>

            <div class="control-buttons">
              <button id="previousButton" class="secondary-action button-reset" type="button">Anterior</button>
              <button id="recallButton" class="secondary-action button-reset" type="button">Recordar</button>
              <button id="resetButton" class="secondary-action button-reset" type="button">Reiniciar contador</button>
              <button id="nextButton" class="large-action" type="button">Siguiente</button>
            </div>

            <form id="setForm" class="form-row">
              <label for="setInput">Ajustar número</label>
              <div class="inline-controls">
                <input id="setInput" name="number" type="number" min="0" max="9999" step="1" required>
                <button type="submit">Llamar</button>
              </div>
            </form>

            <p id="statusMessage" class="status-message" role="status"></p>
          </section>
        </div>
      </section>
    </main>

    <script src="{{ asset('assets/staff.js') }}"></script>
  </body>
</html>
