# Frontend de Vet Andina

La guía principal del proyecto describe la arquitectura completa del repositorio, la configuración local, las rutas, la API y la estructura de carpetas: [README del proyecto](../README.md).

## Desarrollo

```powershell
npm install
npm run dev
```

El servidor de desarrollo de Vite normalmente queda disponible en `http://localhost:5173`. El frontend utiliza `http://localhost:3000` como URL base de la API, salvo que se configure `VITE_API_BASE_URL` en un archivo `.env` local.

El formulario de `/registro` envía nombre completo, email, teléfono, localidad y contraseña a `POST /api/auth/register`. El backend crea la cuenta, pero el registro no inicia sesión automáticamente; luego de un alta exitosa, la persona puede ingresar desde `/login`. Para que funcione, la API debe estar levantada y configurada con `DATABASE_URL`; el origen del frontend debe estar permitido en `FRONTEND_URL`.

La vista offline del panel veterinario sigue siendo un prototipo local. No descarga fichas ni sincroniza datos con la API. No ingreses información clínica real en sus borradores.

## Verificaciones

```powershell
npm run type-check
npm run build
npx eslint src/components/login/LoginForm.vue src/components/login/RegisterForm.vue src/views/veterinario/OfflineView.vue src/services/auth.ts
npx oxlint src/components/login/LoginForm.vue src/components/login/RegisterForm.vue src/views/veterinario/OfflineView.vue src/services/auth.ts
```
