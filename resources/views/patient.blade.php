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
        <p id="updatedAt" class="display-time">Esperando actualización</p>
        <div id="sectionCards" class="section-cards"></div>
        <div class="patient-access-wrap">
          <a class="staff-access" href="/staff" aria-label="Acceso funcionarios">acceso funcionarios</a>
        </div>
      </section>
    </main>

    <script src="{{ asset('assets/public.js') }}"></script>
  </body>
</html>
