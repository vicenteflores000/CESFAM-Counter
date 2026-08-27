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
      <div class="staff-header-info">
        <div class="staff-brand-wrap">
          <img src="{{ asset('assets/logo.png') }}" alt="Logo Salud Doñihue" class="staff-header-logo">
          <div>
            <p class="section-label">SALUD &bull; I. MUNICIPALIDAD DE DOÑIHUE</p>
            <div class="operator-title-row">
              <h1 id="operatorName">Funcionario</h1>
              <span id="operatorRoleBadge" class="role-badge role-badge--admin hidden">Administrador</span>
            </div>
          </div>
        </div>
      </div>
      <div class="staff-header-actions">
        <nav id="staffNavTabs" class="staff-nav-tabs hidden">
          <button id="tabQueueBtn" type="button" class="nav-tab-btn is-active">Atención</button>
          <button id="tabAdminBtn" type="button" class="nav-tab-btn">Administración</button>
        </nav>
        <a class="ghost-action" href="/logout">Cerrar Sesión</a>
      </div>
    </header>

    <main class="staff-layout">
      <!-- ================================================================= -->
      <!-- VISTA 1: ATENCIÓN DE VENTANILLA -->
      <!-- ================================================================= -->
      <div id="queueView">
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
                <p id="windowPanelKicker" class="section-card-kicker">Ingresa tu puesto</p>
                <p class="section-card-copy">Esta operación solo se muestra después de elegir una sección.</p>
              </div>
              <form id="windowForm" class="form-row">
                <label id="windowInputLabel" for="windowInput">Número o nombre del puesto</label>
                <div class="inline-controls">
                  <input id="windowInput" name="windowNumber" type="text" maxlength="50" autocomplete="off" placeholder="Ej: 1, 2, Dental, Curaciones..." required>
                  <button type="submit">Guardar</button>
                </div>
              </form>
              <div class="window-panel-footer">
                <button id="clearSectionCallsBtn" type="button" class="reset-action button-clear-section" title="Despejar los boxes y llamados de esta sección de la pantalla pública del televisor">
                  <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Limpiar pantalla pública (TV)
                </button>
                <small class="muted-line window-panel-hint">Despeja los boxes y llamados de esta sección en el televisor.</small>
              </div>
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
                    <span id="staffStationLabel" class="summary-small-label">Ventanilla</span>
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
                <button id="nextButton" class="large-action primary-action" type="button">Siguiente</button>
                <div class="control-subactions-grid">
                  <button id="previousButton" class="secondary-action" type="button">Anterior</button>
                  <button id="recallButton" class="secondary-action" type="button">Recordar</button>
                </div>
                <button id="resetButton" class="reset-action button-reset" type="button" title="Reiniciar correlativo numérico de la sección a 000">Reiniciar correlativo a 000</button>
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

        <!-- MODO 2: Listado de Pacientes (para secciones con call_type = 'patient_list') -->
        <section id="patientListPanel" class="patient-list-panel section-card-panel hidden">
          <div class="patient-panel-header">
            <div>
              <p class="section-card-kicker">Atención por Listado</p>
              <h2 id="patientPanelTitle" class="patient-panel-title">Pacientes en Espera</h2>
              <p class="section-card-copy">Selecciona a un paciente para llamarlo a tu puesto de atención.</p>
            </div>
            <div class="patient-panel-station-info">
              <span class="summary-small-label" id="patientStationTitle">Tu Puesto:</span>
              <strong id="patientStationValue" class="station-number-tag">Box 1</strong>
            </div>
          </div>

          <!-- Formulario rápido para agregar paciente a la fila -->
          <form id="addPatientForm" class="add-patient-inline-form">
            <div class="form-field form-field--grow">
              <label for="patientNameInput">Nombre y Apellido del paciente</label>
              <input id="patientNameInput" name="name" type="text" placeholder="Ej: María González" required autocomplete="off">
            </div>
            <div class="form-field">
              <label for="patientIdentifierInput">RUT / Identificador (opcional)</label>
              <input id="patientIdentifierInput" name="identifier" type="text" placeholder="12.345.678-9" autocomplete="off">
            </div>
            <button type="submit" class="primary-action add-patient-submit-btn">Agregar Paciente</button>
          </form>

          <!-- Tabla de Pacientes -->
          <div class="admin-table-shell">
            <table class="admin-table patient-queue-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Paciente</th>
                  <th>RUT / ID</th>
                  <th>Estado</th>
                  <th>Llamado en</th>
                  <th class="text-right">Acción</th>
                </tr>
              </thead>
              <tbody id="patientTableBody">
                <tr><td colspan="6" class="text-center">No hay pacientes en la lista de espera.</td></tr>
              </tbody>
            </table>
          </div>

          <p id="patientStatusMessage" class="status-message" role="status"></p>
        </section>
      </div>

      <!-- ================================================================= -->
      <!-- VISTA 2: PANEL DE ADMINISTRACIÓN -->
      <!-- ================================================================= -->
      <div id="adminView" class="admin-view hidden">
        <div class="admin-subnav">
          <button id="subtabSectionsBtn" type="button" class="admin-subnav-btn is-active">Gestión de Secciones</button>
          <button id="subtabUsersBtn" type="button" class="admin-subnav-btn">Gestión de Usuarios y Alcance</button>
        </div>

        <!-- Sub-panel Secciones -->
        <section id="adminSectionsPanel" class="admin-content-panel">
          <div class="admin-panel-header">
            <div>
              <h2 class="admin-panel-title">Secciones de Atención</h2>
              <p class="admin-panel-subtitle">Administra los sectores o áreas de atención y sus códigos únicos.</p>
            </div>
            <button id="openNewSectionModalBtn" type="button" class="primary-action">Nueva Sección</button>
          </div>

          <div class="admin-table-shell">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Modo</th>
                  <th>Número Actual</th>
                  <th>Puestos Activos</th>
                  <th>Funcionarios</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody id="adminSectionsTableBody">
                <tr><td colspan="8" class="text-center">Cargando secciones...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Sub-panel Usuarios y Alcance -->
        <section id="adminUsersPanel" class="admin-content-panel hidden">
          <div class="admin-panel-header">
            <div>
              <h2 class="admin-panel-title">Usuarios y Alcance</h2>
              <p class="admin-panel-subtitle">Gestiona roles de administrador y los sectores que cada funcionario puede operar.</p>
            </div>
            <button id="openNewUserModalBtn" type="button" class="primary-action">Nuevo Usuario</button>
          </div>

          <div class="admin-table-shell">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Alcance de Secciones</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody id="adminUsersTableBody">
                <tr><td colspan="5" class="text-center">Cargando usuarios...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <p id="adminStatusMessage" class="status-message" role="status"></p>
      </div>
    </main>

    <!-- Modal Sección (Crear / Editar) -->
    <div id="sectionModal" class="audio-modal-overlay hidden" role="dialog" aria-modal="true">
      <div class="audio-modal">
        <div class="audio-modal-header">
          <h2 id="sectionModalTitle" class="audio-modal-title">Nueva Sección</h2>
          <button id="closeSectionModalBtn" type="button" class="audio-modal-close">&times;</button>
        </div>
        <form id="sectionForm">
          <input type="hidden" id="sectionIdInput">
          <div class="audio-modal-body">
            <div class="form-field">
              <label for="sectionCodeInput">Código único (ej: SOME, FAR, DEN)</label>
              <input id="sectionCodeInput" name="code" type="text" maxlength="20" required autocomplete="off" placeholder="FAR">
            </div>
            <div class="form-field">
              <label for="sectionNameInput">Nombre de la sección</label>
              <input id="sectionNameInput" name="name" type="text" maxlength="100" required autocomplete="off" placeholder="Farmacia">
            </div>
            <div class="form-field">
              <label for="sectionStationTypeInput">Tipo de puesto de atención</label>
              <select id="sectionStationTypeInput" name="station_type" class="audio-select">
                <option value="ventanilla">Ventanilla</option>
                <option value="box">Box de atención</option>
              </select>
            </div>
            <div class="form-field">
              <label for="sectionCallTypeInput">Modo de llamado</label>
              <select id="sectionCallTypeInput" name="call_type" class="audio-select">
                <option value="number">Por números (correlativo: 001, 002...)</option>
                <option value="patient_list">Por listado de pacientes</option>
              </select>
            </div>
          </div>
          <div class="audio-modal-footer">
            <button type="button" id="cancelSectionModalBtn" class="secondary-action">Cancelar</button>
            <button type="submit" class="primary-action">Guardar Sección</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Nuevo Usuario -->
    <div id="userModal" class="audio-modal-overlay hidden" role="dialog" aria-modal="true">
      <div class="audio-modal">
        <div class="audio-modal-header">
          <h2 class="audio-modal-title">Nuevo Usuario</h2>
          <button id="closeUserModalBtn" type="button" class="audio-modal-close">&times;</button>
        </div>
        <form id="userForm">
          <div class="audio-modal-body">
            <div class="form-field">
              <label for="userNameInput">Nombre completo</label>
              <input id="userNameInput" name="name" type="text" required autocomplete="off" placeholder="Juan Pérez">
            </div>
            <div class="form-field">
              <label for="userEmailInput">Correo institucional (Azure AD)</label>
              <input id="userEmailInput" name="email" type="email" required autocomplete="off" placeholder="nombre@salud.mdonihue.cl">
              <small class="muted-line">El usuario iniciará sesión automáticamente con su cuenta institucional de Microsoft Azure.</small>
            </div>
            <div class="form-field form-field--checkbox">
              <label class="checkbox-label">
                <input type="checkbox" id="userIsAdminInput" name="is_admin">
                <span>Otorgar privilegios de Administrador</span>
              </label>
            </div>
            <div class="form-field">
              <label>Alcance de secciones permitidas</label>
              <div id="userFormSectionsCheckboxes" class="scope-checkbox-list"></div>
              <small class="muted-line">Selecciona los sectores que este usuario podrá atender.</small>
            </div>
          </div>
          <div class="audio-modal-footer">
            <button type="button" id="cancelUserModalBtn" class="secondary-action">Cancelar</button>
            <button type="submit" class="primary-action">Crear Usuario</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Asignar Alcance de Secciones a Usuario -->
    <div id="scopeModal" class="audio-modal-overlay hidden" role="dialog" aria-modal="true">
      <div class="audio-modal">
        <div class="audio-modal-header">
          <div>
            <h2 class="audio-modal-title">Alcance de Secciones</h2>
            <p id="scopeModalUserName" class="admin-panel-subtitle">Funcionario</p>
          </div>
          <button id="closeScopeModalBtn" type="button" class="audio-modal-close">&times;</button>
        </div>
        <form id="scopeForm">
          <input type="hidden" id="scopeUserId">
          <div class="audio-modal-body">
            <p class="scope-modal-hint">Marca las secciones a las que este funcionario tendrá permiso de acceso y atención:</p>
            <div id="scopeCheckboxesList" class="scope-checkbox-list"></div>
            <small class="muted-line">Si no seleccionas ninguna sección, el usuario podrá ver todas.</small>
          </div>
          <div class="audio-modal-footer">
            <button type="button" id="cancelScopeModalBtn" class="secondary-action">Cancelar</button>
            <button type="submit" class="primary-action">Guardar Alcance</button>
          </div>
        </form>
      </div>
    </div>

    <script src="{{ asset('assets/staff.js') }}"></script>
  </body>
</html>
