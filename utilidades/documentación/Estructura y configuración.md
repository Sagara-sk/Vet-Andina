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
- **ORM:** todavía no está instalado ni configurado. Cualquier ORM que se incorpore debe conectarse a esta aplicación TypeScript, sin volver a activar el antiguo `server.js`.
- **Registro de clientes:** `POST /api/auth/register` crea `usuario` y `duenio` en una transacción y guarda la contraseña como hash.
- **Formulario de registro:** consume `POST /api/auth/register`; presenta los errores del servidor y no confirma el alta si falla la solicitud.
- **Modo offline:** la pantalla actual solo lee/guarda datos locales existentes como prototipo; no hay endpoints de dominio compatibles ni sincronización habilitada.
- **Seguridad y Autenticación:**
  - `jsonwebtoken` (JWT)
  - `cookie-parser` (Manejo de cookies HttpOnly, Secure, SameSite=Strict)
  - `bcrypt` & `argon2` (Encriptación de contraseñas de alto costo computacional)
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

Para producción, ejecutá `npm run build` y luego `npm start` desde `Backend/`.

---

## 4. Flujo de trabajo en Git

- main: Rama de producción estable.

- develop: Rama de integración para desarrollo.

- feature/nombre: Ramas individuales de trabajo basadas en develop.
