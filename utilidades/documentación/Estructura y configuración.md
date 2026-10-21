# Documentación de Estructura e Instalación - Vet Andina

**Proyecto:** Vet Andina
**Repositorio:** GitHub (`main` / `develop` / `feature/*`)

---

## 1. Arquitectura del Repositorio

El proyecto está estructurado en tres carpetas principales según las directivas del proyecto:

Vet Andina/
├── Frontend/ # Interfaz de usuario (Vue 3 + TypeScript + Tailwind)
├── Backend/ # API REST (Node.js + Express + TypeScript + tsx)
├── utilidades/ # Recursos compartidos y documentación
│ └── documentacion/ # Guías y especificaciones de arquitectura
└── .gitignore # Archivos excluidos de Git (node_modules, .env, dist)

---

## 2. Tecnologías e Instalaciones

### Frontend (`/Frontend`)

- **Framework:** Vue 3 (Composition API) + TypeScript
- **Gestión de Estado:** Pinia
- **Enrutamiento:** Vue Router
- **Estilos:** Tailwind CSS v4 mediante `@tailwindcss/vite` (paleta Vet Andina: verde `#34503a`, fondo `#fafaf7`, texto `#1e211c`)
- **Calidad de Código:** ESLint + Prettier

### Backend (`/Backend`)

- **Entorno de Ejecución:** Node.js + Express
- **Lenguaje:** TypeScript (`tsconfig.json` optimizado)
- **Arranque:** `npm run dev` ejecuta `src/index.ts` con `tsx`; `npm run build` compila a `dist/` y `npm start` ejecuta `dist/index.js`.
- **Base de datos:** PostgreSQL Serverless en Neon mediante `pg` y el `Pool` exportado desde `src/config/database.ts`; conexión TLS validada usando `DATABASE_URL`.
- **Arquitectura:** rutas, controladores, servicios y modelos en `src/`.
- **Registro de clientes:** `POST /api/auth/register` crea `usuario` y `duenio` en una transacción y guarda la contraseña como hash.
- **Autorización:** Passport JWT valida la cookie de sesión; `src/middlewares/role.middleware.ts` ofrece `authorizeRoles(...)` para exigir roles en endpoints protegidos. Los endpoints de dominio y la autorización por propiedad todavía deben implementarse.
- **Formulario de registro:** envía nombre completo, email, teléfono, localidad y contraseña a la API; el servidor asigna automáticamente `CLIENTE`.
- **Formulario de inicio de sesión:** envía email y contraseña; tras validarlas, la API crea la cookie HttpOnly. Registro e inicio de sesión requieren API y PostgreSQL configurados.
- **Especificación funcional:** consultar `utilidades/documentación/Autenticación y autorización.md` para la política de roles, acceso por propietario, estado y pendientes.
- **Modo offline:** prototipo local sin descarga o sincronización con API; no ingresar información clínica real.
- **Seguridad y Autenticación:**
  - `jsonwebtoken` (JWT)
  - `passport` y `passport-jwt` (autenticación de sesión y estrategia JWT)
  - `cookie-parser` (Manejo de cookies HttpOnly, Secure, SameSite=Strict)
  - `bcrypt` (hash de contraseñas; costo 12 en el servicio actual)
  - `cors` & `dotenv`

### Utilidades (`/utilidades`)

- Carpeta destinada a alojar:
  - Documentación técnica y de arquitectura.
  - Tipos e interfaces globales compartidas de TypeScript (`Paciente`, `Turno`, `HistoriaClinica`).
  - Scripts de base de datos y _seeders_.

---

## 3. Comandos para Levantar el Proyecto Localmente

### Levantar el Frontend

cd Frontend
npm install
npm run dev

### Levantar el Backend

cd Backend
npm install
npm run dev

Copiá `Backend/.env.example` a `Backend/.env` y configurá `DATABASE_URL`.
Copiá `Frontend/.env.example` a `Frontend/.env` si necesitás cambiar la URL de la API.
Si el frontend usa otro origen, agregalo a `FRONTEND_URL`.

---

## 4. Flujo de trabajo en Git

- main: Rama de producción estable.

- develop: Rama de integración para desarrollo.

- feature/nombre: Ramas individuales de trabajo basadas en develop.
