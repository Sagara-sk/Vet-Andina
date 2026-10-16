# Vet Andina

Aplicación web para la gestión de atención veterinaria. El repositorio contiene una interfaz de usuario en Vue 3 y una API REST en Express/TypeScript conectada a PostgreSQL (Neon) mediante `pg`.

> El registro de clientes y los endpoints de salud están conectados al backend. El inicio de sesión todavía es informativo y el panel utiliza datos de ejemplo; las pantallas que aún no están conectadas se detallan más abajo.

## Índice

- [Arquitectura](#arquitectura)
- [Organización de archivos](#organización-de-archivos)
- [Requisitos](#requisitos)
- [Configuración local](#configuración-local)
- [Comandos](#comandos)
- [Rutas y funcionamiento](#rutas-y-funcionamiento)
- [API REST](#api-rest)
- [Base de datos](#base-de-datos)
- [Variables de entorno y seguridad](#variables-de-entorno-y-seguridad)
- [Estado funcional actual](#estado-funcional-actual)
- [Contexto y planificación](#contexto-y-planificación)
- [Roles y reglas pendientes](#roles-y-reglas-pendientes)

## Arquitectura

```text
Navegador
  └── Frontend: Vue 3 + TypeScript + Vue Router + Tailwind CSS
        └── HTTP (VITE_API_BASE_URL)
              └── Backend: Express + TypeScript
                    └── pg Pool (DATABASE_URL + TLS)
                          └── PostgreSQL en Neon
```

El frontend y el backend son aplicaciones independientes: cada uno tiene su propio `package.json`, instalación de dependencias, configuración y comandos de desarrollo. La configuración para desarrollo local permite al frontend (Vite, puerto 5173) comunicarse con la API (puerto 3000).

## Organización de archivos

```text
Vet Andina/
├── README.md
├── AGENTS.md
├── .gitignore
├── Frontend/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── eslint.config.ts
│   ├── tsconfig*.json
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── assets/main.css
│       ├── router/index.ts
│       ├── config/site.ts
│       ├── data/panelMock.ts
│       ├── layouts/
│       │   ├── PublicLayout.vue
│       │   └── PanelLayout.vue
│       ├── components/
│       │   ├── home/
│       │   ├── layout/
│       │   ├── login/
│       │   └── panel/
│       ├── views/
│       │   ├── HomeView.vue
│       │   ├── LoginView.vue
│       │   ├── RegistroView.vue
│       │   ├── TurnosView.vue
│       │   └── panel/
│       └── utils/format.ts
├── Backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── app.ts
│       ├── config/
│       │   ├── env.ts
│       │   └── database.ts
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   └── health.routes.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   └── health.controller.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   └── health.service.ts
│       └── models/owner.model.ts
└── utilidades/
    └── documentación/
        ├── Estructura y configuración.md
        ├── Planificación del proyecto.md
        ├── Matriz de roles y acciones.md
        └── Registro de incógnitas.md
```

### Frontend

| Parte                       | Ubicación                                                                                                   | Responsabilidad                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Entrada de la aplicación    | `Frontend/src/main.ts`, `Frontend/src/App.vue`                                                              | Carga CSS, inicializa Vue, Pinia y el router; `App.vue` presenta la vista de ruta.  |
| Navegación                  | `Frontend/src/router/index.ts`                                                                              | Define rutas públicas, registro, login y panel, además de las vistas diferidas.     |
| Diseño común                | `Frontend/src/layouts/`, `Frontend/src/components/layout/`                                                  | Estructura pública y del panel, encabezado y pie de página.                         |
| Página principal            | `Frontend/src/views/HomeView.vue`, `Frontend/src/components/home/`                                          | Vista de inicio y sus secciones.                                                    |
| Turnos públicos             | `Frontend/src/views/TurnosView.vue`                                                                         | Vista de turnos públicos.                                                           |
| Registro e inicio de sesión | `Frontend/src/views/RegistroView.vue`, `Frontend/src/views/LoginView.vue`, `Frontend/src/components/login/` | Formulario de registro conectado a la API; pantalla de login aún sin autenticación. |
| Panel                       | `Frontend/src/layouts/PanelLayout.vue`, `Frontend/src/views/panel/`, `Frontend/src/components/panel/`       | Diseño del panel, resumen, mascotas y turnos.                                       |
| Datos del panel             | `Frontend/src/data/panelMock.ts`                                                                            | Datos locales ilustrativos; no representan datos obtenidos de la base real.         |
| Contenido institucional     | `Frontend/src/config/site.ts`                                                                               | Nombre, dirección, contacto y horarios que usan las secciones públicas.             |
| Formato y estilos           | `Frontend/src/utils/format.ts`, `Frontend/src/assets/main.css`, `Frontend/tailwind.config.js`               | Formateo de datos, estilos base/componentes y tema visual.                          |
| Herramientas de desarrollo  | `Frontend/vite.config.ts`, `Frontend/eslint.config.ts`, `Frontend/tsconfig*.json`                           | Vite y plugins, alias `@/`, análisis estático y configuración TypeScript.           |

### Backend

El backend sigue una separación por capas:

| Capa            | Ubicación                                                     | Responsabilidad                                                                |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Arranque        | `Backend/src/index.ts`                                        | Carga las variables de entorno, valida el puerto e inicia Express.             |
| Aplicación HTTP | `Backend/src/app.ts`                                          | Configura JSON, cookies, CORS y monta los routers.                             |
| Configuración   | `Backend/src/config/env.ts`, `Backend/src/config/database.ts` | Lee `Backend/.env` y configura el `Pool` compartido de PostgreSQL.             |
| Rutas           | `Backend/src/routes/`                                         | Asocia endpoints HTTP con sus controladores.                                   |
| Controladores   | `Backend/src/controllers/`                                    | Valida solicitudes, define los códigos de estado y las respuestas HTTP.        |
| Servicios       | `Backend/src/services/`                                       | Implementa operaciones de aplicación, transacciones y comprobaciones de salud. |
| Modelos         | `Backend/src/models/`                                         | Ejecuta consultas parametrizadas y mapea entidades de persistencia.            |

**Flujo de registro:** `auth.routes.ts` → `auth.controller.ts` (validación Joi) → `auth.service.ts` (hash bcrypt y transacción) → `owner.model.ts` (inserciones parametrizadas en `usuario` y `duenio`) → Pool de `pg`.

### Documentación y configuración

- `Backend/.env.example` y `Frontend/.env.example`: nombres y ejemplos de variables necesarias, sin credenciales reales.
- `utilidades/documentación/Estructura y configuración.md`: guía adicional sobre instalación y convenciones del repositorio.
- `AGENTS.md`: contexto permanente, objetivos y pautas del producto para el trabajo de desarrollo asistido.
- `utilidades/documentación/Planificación del proyecto.md`: compromiso del Sprint 3 y propuesta de continuidad.
- `utilidades/documentación/Matriz de roles y acciones.md`: permisos propuestos por rol, con separación entre acceso clínico y administrativo.
- `utilidades/documentación/Registro de incógnitas.md`: preguntas de negocio y permisos que requieren validación antes de implementarse.
- `.gitignore`: excluye dependencias, compilados, cachés, logs y archivos `.env`; mantiene versionados los `.env.example`.

## Requisitos

- Node.js `^22.18.0` o `>=24.12.0` (según el campo `engines` del frontend).
- npm.
- Una base PostgreSQL accesible por TLS, configurada en `Backend/.env`. En el entorno desplegado actualmente se usa Neon.

## Configuración local

### 1. Instalar dependencias

```powershell
cd Frontend
npm install

cd ..\Backend
npm install
```

### 2. Configurar variables

Copiá `Backend/.env.example` a `Backend/.env` y reemplazá los valores de ejemplo por los de tu base de datos:

```dotenv
PORT=3000
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=postgresql://usuario:contraseña@host/base?sslmode=verify-full
```

`DATABASE_URL` debe apuntar a una base PostgreSQL y usar TLS. El Pool se crea en `Backend/src/config/database.ts` con validación del certificado (`rejectUnauthorized: true`). No copies credenciales reales a este README ni a `.env.example`.

El frontend usa por defecto `http://localhost:3000` para llamar a la API. Para cambiarlo, copiá `Frontend/.env.example` a `Frontend/.env` y ajustá:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Iniciar ambos procesos

En dos terminales separadas:

```powershell
cd Backend
npm run dev
```

```powershell
cd Frontend
npm run dev
```

Abrí la URL local que muestre Vite (normalmente `http://localhost:5173`). El backend escucha por defecto en `http://localhost:3000`.

## Comandos

### Frontend (`Frontend/`)

| Comando              | Función                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`        | Inicia Vite en modo desarrollo.                                                            |
| `npm run build`      | Ejecuta el chequeo de tipos `vue-tsc --build` y compila para producción.                   |
| `npm run build-only` | Compila con Vite sin ejecutar el chequeo de tipos.                                         |
| `npm run type-check` | Comprueba los tipos Vue y TypeScript.                                                      |
| `npm run lint`       | Ejecuta Oxlint y ESLint; los scripts definidos aplican correcciones automáticas (`--fix`). |
| `npm run format`     | Formatea `src/` con Prettier.                                                              |
| `npm run preview`    | Sirve localmente el último compilado de producción.                                        |

### Backend (`Backend/`)

| Comando         | Función                                                         |
| --------------- | --------------------------------------------------------------- |
| `npm run dev`   | Ejecuta `src/index.ts` con `tsx` y recarga al detectar cambios. |
| `npm run build` | Compila TypeScript a `dist/`.                                   |
| `npm start`     | Inicia la aplicación compilada desde `dist/index.js`.           |

## Rutas y funcionamiento

### Rutas del frontend

| Ruta              | Vista                                     | Estado                                                               |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `/`               | `HomeView.vue` con `PublicLayout.vue`     | Página pública.                                                      |
| `/turnos`         | `TurnosView.vue` con `PublicLayout.vue`   | Vista de turnos.                                                     |
| `/login`          | `LoginView.vue`                           | Inicia sesión mediante la API y establece una cookie HttpOnly.       |
| `/registro`       | `RegistroView.vue`                        | Envía el registro de un cliente a la API.                            |
| `/panel`          | `PanelHomeView.vue` con `PanelLayout.vue` | Requiere sesión de cliente; resumen con datos de ejemplo.             |
| `/panel/mascotas` | `PanelPlaceholderView.vue`                | Marcador de posición.                                                |
| `/panel/reservar` | `PanelPlaceholderView.vue`                | Marcador de posición.                                                |
| `/panel/turnos`   | `PanelPlaceholderView.vue`                | Marcador de posición.                                                |

### API REST disponible

| Método | Endpoint             | Descripción                                                 |
| ------ | -------------------- | ----------------------------------------------------------- |
| `GET`  | `/api/health`        | Confirma que la API responde.                               |
| `GET`  | `/api/db/health`     | Ejecuta `SELECT 1` para comprobar la conexión a PostgreSQL. |
| `POST` | `/api/auth/register` | Valida e inserta un nuevo usuario y su perfil de dueño.     |
| `POST` | `/api/auth/login`    | Valida credenciales y establece una cookie de sesión HttpOnly. |
| `GET`  | `/api/auth/session`  | Valida la cookie y devuelve el identificador y rol de la sesión. |
| `POST` | `/api/auth/logout`   | Elimina la cookie de sesión del navegador.                  |

El cuerpo del registro debe ser JSON:

```json
{
  "nombreCompleto": "Nombre Apellido",
  "email": "persona@ejemplo.com",
  "telefono": "+54 9 299 000 0000",
  "localidad": "Cipolletti",
  "contrasena": "una-clave-de-al-menos-8-caracteres"
}
```

Una solicitud correcta devuelve `201`; datos inválidos devuelven `400`; un correo duplicado devuelve `409`; un error inesperado devuelve `500`. El registro no inicia sesión automáticamente. El login recibe `{ "email": "...", "contrasena": "..." }`, devuelve `401` si las credenciales no son válidas y establece una cookie `HttpOnly`; el JWT no se devuelve en el cuerpo ni se guarda en `localStorage`. La cookie dura ocho horas por defecto.

## Base de datos

La aplicación usa PostgreSQL mediante la dependencia `pg`. Las consultas se ejecutan con el `Pool` compartido exportado por `Backend/src/config/database.ts`; el registro usa un cliente del Pool y una transacción para crear el usuario y el perfil de dueño de forma atómica.

El esquema de la aplicación comprende estas ocho tablas:

`usuario`, `duenio`, `finca`, `animal`, `ficha_medica`, `visita`, `turno` y `evolucion_clinica`.

El endpoint de registro actualmente escribe en `usuario` y `duenio`. El resto de las tablas forma parte del dominio previsto, pero todavía no tiene endpoints CRUD implementados en esta API. La base debe existir previamente con su esquema y relaciones; este repositorio no incluye migraciones SQL ni seeders para crearla.

## Variables de entorno y seguridad

- Los archivos locales `.env` contienen secretos y no se deben subir al repositorio. Los archivos `.env.example` contienen solo ejemplos.
- Configura `DATABASE_URL` únicamente en `Backend/.env` o en el gestor seguro de secretos del entorno de despliegue.
- Configura `JWT_SECRET` con al menos 32 bytes aleatorios en `Backend/.env` o en el gestor de secretos. No reutilices ni publiques ese valor.
- `AUTH_SESSION_TTL_SECONDS` define la duración de la sesión (por defecto, 28800; rango permitido: 300 a 2592000 segundos). `AUTH_COOKIE_SAME_SITE` acepta `strict`, `lax` o `none`; `none` exige HTTPS y `NODE_ENV=production`.
- El Pool de PostgreSQL exige validación TLS del certificado.
- La contraseña del cliente se valida en el controlador y se almacena como hash mediante bcrypt en el servicio de registro; nunca se guarda en texto plano.
- Express limita CORS a las URL configuradas mediante `FRONTEND_URL`; si no está definida, permite los orígenes locales indicados en `Backend/src/app.ts`.

## Estado funcional actual

- **Implementado en código:** navegación pública, registro transaccional, hash de contraseñas, login/logout/verificación de sesión mediante cookie HttpOnly, guard frontend para `/panel` y endpoints de salud.
- **Pendiente de validar con Neon:** conexión de registro/login contra la instancia real y configuración de `JWT_SECRET`/cookie del entorno de despliegue.
- **Pendiente de implementación:** autorización backend por rol/propietario para APIs de dominio (todavía no hay endpoints de mascotas, fichas, visitas, turnos o evoluciones), sesión revocable, rate limiting y validación de los marcadores de posición.
- **Datos de muestra:** `Frontend/src/data/panelMock.ts` es exclusivamente para la interfaz del panel; no es persistencia ni información leída de Neon.

## Contexto y planificación

- [Contexto permanente del proyecto](AGENTS.md)
- [Planificación del proyecto y Sprint 3](utilidades/documentación/Planificación%20del%20proyecto.md)

## Roles y reglas pendientes

- [Matriz de roles y acciones](utilidades/documentación/Matriz%20de%20roles%20y%20acciones.md)
- [Registro de incógnitas](utilidades/documentación/Registro%20de%20inc%C3%B3gnitas.md)
