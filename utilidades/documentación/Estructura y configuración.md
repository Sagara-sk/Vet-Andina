# Documentación de Estructura e Instalación - Vet Andina

**Proyecto:** Vet Andina
**Repositorio:** GitHub (`main` / `develop` / `feature/*`)  

---

## 1. Arquitectura del Repositorio

El proyecto está estructurado en tres carpetas principales según las directivas del proyecto:

Vet Andina/
├── Frontend/           # Interfaz de usuario (Vue 3 + TypeScript + Tailwind)
├── Backend/            # API REST (Node.js + Express + TypeScript + tsx)
├── utilidades/         # Recursos compartidos y documentación
│   └── documentacion/  # Guías y especificaciones de arquitectura
└── .gitignore          # Archivos excluidos de Git (node_modules, .env, dist)

---

## 2. Tecnologías e Instalaciones

### Frontend (`/Frontend`)
- **Framework:** Vue 3 (Composition API) + TypeScript
- **Gestión de Estado:** Pinia
- **Enrutamiento:** Vue Router
- **Estilos:** Tailwind CSS v3 (configurado con la paleta de colores de Vet Andina: verde `#34503a`, fondo `#fafaf7`, texto `#1e211c`)
- **Calidad de Código:** ESLint + Prettier

### Backend (`/Backend`)
- **Entorno de Ejecución:** Node.js + Express
- **Lenguaje:** TypeScript (`tsconfig.json` optimizado)
- **Ejecutor en Desarrollo:** `tsx` (recarga automática con `npm run dev`)
- **Seguridad y Autenticación:**
  - `jsonwebtoken` (JWT)
  - `cookie-parser` (Manejo de cookies HttpOnly, Secure, SameSite=Strict)
  - `bcrypt` & `argon2` (Encriptación de contraseñas de alto costo computacional)
  - `cors` & `dotenv`

### Utilidades (`/utilidades`)
- Carpeta destinada a alojar:
  - Documentación técnica y de arquitectura.
  - Tipos e interfaces globales compartidas de TypeScript (`Paciente`, `Turno`, `HistoriaClinica`).
  - Scripts de base de datos y *seeders*.

---

## 3. Comandos para Levantar el Proyecto Localmente

### Levantar el Frontend

cd Frontend
npm install
npm run dev

### Levantar el Frontend

cd Backend
npm install
npm run dev

---

## 4. Flujo de trabajo en Git

* main: Rama de producción estable.

* develop: Rama de integración para desarrollo.

* feature/nombre: Ramas individuales de trabajo basadas en develop.