# Frontend de Vet Andina

La guía principal del proyecto describe la arquitectura completa del repositorio, la configuración local, las rutas, la API y la estructura de carpetas: [README del proyecto](../README.md).

## Desarrollo

```powershell
npm install
npm run dev
```

El servidor de desarrollo de Vite normalmente queda disponible en `http://localhost:5173`. El frontend utiliza `http://localhost:3000` como URL base de la API, salvo que se configure `VITE_API_BASE_URL` en un archivo `.env` local.

## Verificaciones

```powershell
npm run type-check
npm run build
npx eslint src/components/login/BrandPanel.vue src/components/login/LoginForm.vue
npx oxlint src/components/login/BrandPanel.vue src/components/login/LoginForm.vue
```
