# Frontend de Vet Andina

La guía principal del proyecto describe la arquitectura completa del repositorio, la configuración local, las rutas, la API y la estructura de carpetas: [README del proyecto](../README.md).

## Desarrollo

```powershell
npm install
npm run dev
```

El servidor de desarrollo de Vite normalmente queda disponible en `http://localhost:5173`. El frontend utiliza `http://localhost:3000` como URL base de la API, salvo que se configure `VITE_API_BASE_URL` en un archivo `.env` local.

El formulario de `/registro` solicita nombre completo, email, teléfono móvil, localidad y contraseña; el backend asigna el rol `CLIENTE` y emite la cookie de sesión. Luego `/registro/perfil` verifica esa sesión y envía DNI/CUIT, tipo de persona, dirección opcional y finca al endpoint protegido del backend.

Si el navegador informa que no puede conectarse con la API:

1. Desde `Backend/`, ejecutá `npm run dev` y verificá `http://localhost:3000/api/health`.
2. Confirmá que `VITE_API_BASE_URL` en `Frontend/.env` apunte al host y puerto donde escucha el backend (por defecto, `http://localhost:3000`).
3. En `Backend/.env`, configurá `FRONTEND_URL` con el origen exacto mostrado por Vite, incluyendo protocolo y puerto (normalmente `http://localhost:5173`).
4. Confirmá que `DATABASE_URL` apunta a PostgreSQL disponible. Un error HTTP del servidor (por ejemplo, credenciales inválidas o email duplicado) se muestra aparte del error de conexión.

## Verificaciones

```powershell
npm run type-check
npm run build
npx eslint src/components/login/BrandPanel.vue src/components/login/LoginForm.vue
npx oxlint src/components/login/BrandPanel.vue src/components/login/LoginForm.vue
```
