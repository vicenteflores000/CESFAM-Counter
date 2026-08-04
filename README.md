# CESFAM Counter

Aplicación web para llamar números de atención físicos desde computadores de ventanilla. La vista pública no requiere inicio de sesión y muestra una tarjeta por cada ventanilla registrada, con el último número llamado por cada una. El panel de funcionarios exige inicio de sesión Microsoft/Outlook.

## Requisitos

- Node.js 18 o superior.
- Una aplicación registrada en Microsoft Entra ID.

## Configuración Microsoft/Outlook

1. Cree una aplicación en Microsoft Entra ID.
2. Agregue una plataforma web con Redirect URI:

   ```text
   http://127.0.0.1:3000/auth/callback
   ```

3. Cree un client secret.
4. Copie `.env.example` como `.env` y complete:

   ```text
   MS_CLIENT_ID=...
   MS_CLIENT_SECRET=...
   SESSION_SECRET=...
   ```

5. Si usará otra URL o dominio, actualice `BASE_URL` y `MS_REDIRECT_URI`.

## Ejecutar

```bash
npm start
```

Abra:

- Pantalla pacientes: `http://127.0.0.1:3000/`
- Panel ventanilla: `http://127.0.0.1:3000/staff`

Para probar sin credenciales Microsoft durante desarrollo:

```bash
npm run dev
```

Esto habilita el botón de prueba local en la pantalla de ingreso. En producción deje `ALLOW_DEV_LOGIN=false`.

## Funcionamiento

- Cada funcionario inicia sesión y guarda su número de ventanilla.
- Cada ventanilla guardada aparece como una tarjeta en la pantalla de pacientes.
- `Siguiente número` aumenta el contador global en 1 y publica el llamado con esa ventanilla.
- `Volver a llamar` repite el mismo número desde la ventanilla del funcionario.
- `Ajustar número` permite llamar manualmente un número físico específico.
- El estado global queda persistido en `data/state.json`.
- Las pantallas conectadas se actualizan en vivo mediante Server-Sent Events.
