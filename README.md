# Vet Andina

Aplicación web para la gestión de atención veterinaria. El repositorio contiene una interfaz de usuario en Vue 3 y una API REST en Express/TypeScript conectada a PostgreSQL (Neon) mediante `pg`.

> La API TypeScript implementa registro, inicio/cierre de sesión y endpoints de salud, y el formulario de registro del frontend consume `POST /api/auth/register`. Los comandos del backend ejecutan esa aplicación desde `src/index.ts` en desarrollo y desde `dist/index.js` en producción. Los paneles utilizan datos de ejemplo; el modo offline sigue siendo un prototipo local, sin descarga ni sincronización con la API.

## Índice

- [Arquitectura](#arquitectura)
- [Organización de archivos](#organización-de-archivos)
- [Requisitos](#requisitos)
- [Configuración local](#configuración-local)
- [Cuentas de prueba](#cuentas-de-prueba)
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
│       ├── router/
│       │   ├── index.ts
│       │   └── access.ts
│       ├── stores/session.ts
│       ├── composables/useLogout.ts
│       ├── config/site.ts
│       ├── data/panelMock.ts
│       ├── layouts/
│       │   ├── PublicLayout.vue
│       │   └── PanelLayout.vue
│       ├── components/
│       │   ├── home/
│       │   ├── layout/
│       │   ├── login/
│       │   ├── panel/
│       │   └── Redireccion/
│       │       ├── AccesoDenegado.vue
│       │       └── LogoutButton.vue
│       ├── views/
│       │   ├── HomeView.vue
│       │   ├── LoginView.vue
│       │   ├── RegistroView.vue
│       │   ├── AccesoDenegadoView.vue
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
│       ├── middlewares/
│       │   ├── auth.middleware.ts
│       │   ├── error.middleware.ts
│       │   └── rate-limit.middleware.ts
│       ├── scripts/create-test-users.ts
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
| Navegación                  | `Frontend/src/router/index.ts`, `Frontend/src/router/access.ts`                                             | Define las rutas y el guard; `access.ts` declara qué roles abren cada panel y el destino de cada rol tras el login. |
| Sesión                      | `Frontend/src/stores/session.ts`, `Frontend/src/composables/useLogout.ts`                                   | Store Pinia con el usuario verificado por la API (solo en memoria) y la acción `logout`; `useLogout` la usa para cerrar sesión y volver al login. |
| Redirecciones de sesión     | `Frontend/src/components/Redireccion/`                                                                      | `LogoutButton.vue` (botón de cierre de sesión de ambos paneles) y `AccesoDenegado.vue` (página 403). |
| Diseño común                | `Frontend/src/layouts/`, `Frontend/src/components/layout/`                                                  | Estructura pública y del panel, encabezado y pie de página.                         |
| Página principal            | `Frontend/src/views/HomeView.vue`, `Frontend/src/components/home/`                                          | Vista de inicio y sus secciones.                                                    |
| Turnos públicos             | `Frontend/src/views/TurnosView.vue`                                                                         | Vista de turnos públicos.                                                           |
| Registro e inicio de sesión | `Frontend/src/views/RegistroView.vue`, `Frontend/src/views/LoginView.vue`, `Frontend/src/components/login/` | Registro y login conectados a la API.                                               |
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
| Aplicación HTTP | `Backend/src/app.ts`                                          | Configura CORS, JSON, cookies y proxy; monta los routers y los manejadores 404/error. |
| Middlewares     | `Backend/src/middlewares/`                                    | Verificación de sesión, límite de intentos y respuestas de error en JSON.      |
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

### 3. Crear las cuentas de prueba

Ver [Cuentas de prueba](#cuentas-de-prueba). Solo hace falta una vez por base de datos.

### 4. Iniciar ambos procesos

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

## Cuentas de prueba

Hay una cuenta de prueba por rol. Julián, referente clínico del proyecto, es el superadministrador; el resto de los datos son ficticios.

| Rol              | Nombre         | Email                             | Contraseña              | Al iniciar sesión abre                       |
| ---------------- | -------------- | --------------------------------- | ----------------------- | -------------------------------------------- |
| `SUPERADMIN`     | Julián Paredes | `julian.paredes@vetandina.com.ar` | `VetAndina-Julian2026`  | `/panel-veterinario`                         |
| `ADMINISTRATIVO` | Carla Méndez   | `carla.mendez@vetandina.com.ar`   | `VetAndina-Admin2026`   | `/panel-administrativo`                      |
| `VETERINARIO`    | Martín Sosa    | `martin.sosa@vetandina.com.ar`    | `VetAndina-Vet2026`     | `/panel-veterinario`                         |
| `CLIENTE`        | Laura Giménez  | `laura.gimenez@example.com`       | `VetAndina-Cliente2026` | `/panel`                                     |

Julián y Martín tienen matrículas ficticias (`DEMO-0001` y `DEMO-0002`). Laura tiene además su perfil de dueño (teléfono `+54 9 299 000 0001`, Cipolletti), igual que un cliente registrado desde `/registro`.

Las cuentas ya están creadas en la base de desarrollo de Neon. Si se usa otra base, se crean con:

```powershell
cd Backend
npm run seed:test-users
```

El script (`Backend/src/scripts/create-test-users.ts`) crea solo las cuentas cuyo email no existe; las que ya existen no se modifican. No se ejecuta con `NODE_ENV=production`.

> **Importante:** estas contraseñas son públicas porque están en este README. Usalas solo en bases de desarrollo o prueba. Antes de cargar datos reales o desplegar para el cliente, eliminá estas cuentas o cambiales la contraseña.

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
| `npm run seed:test-users` | Crea las cuentas de prueba de cada rol que no existan. |
| `npm run db:migrate` | Aplica las migraciones pendientes de `Backend/migrations/` y las registra en `schema_migrations`. |

`server.js` es una implementación JavaScript anterior y no la utilizan los scripts del paquete. La aplicación activa es la de `src/`, con PostgreSQL (`pg`); todavía no hay un ORM instalado o configurado. Si se incorpora uno, debe integrarse en esta aplicación TypeScript y sus scripts de arranque.

## Rutas y funcionamiento

### Rutas del frontend

| Ruta              | Vista                                     | Estado                                                               |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `/`               | `HomeView.vue` con `PublicLayout.vue`     | Página pública.                                                      |
| `/turnos`         | `TurnosView.vue` con `PublicLayout.vue`   | Vista de turnos.                                                     |
| `/login`          | `LoginView.vue`                           | Inicia sesión mediante la API y establece una cookie HttpOnly.       |
| `/registro`       | `RegistroView.vue`                        | Envía el registro de un cliente a la API.                            |
| `/acceso-denegado` | `AccesoDenegadoView.vue`                 | Página 403 para una sesión sin permiso sobre la ruta pedida.          |
| `/panel`          | `PanelHomeView.vue` con `PanelLayout.vue` | Requiere sesión de cliente; resumen con datos de ejemplo.             |
| `/panel/mascotas` | `PetsView.vue`                            | Mascotas con datos de ejemplo.                                       |
| `/panel/reservar` | `PanelPlaceholderView.vue`                | Marcador de posición.                                                |
| `/panel/turnos`   | `AppointmentsView.vue`                    | Turnos con datos de ejemplo.                                         |
| `/panel-veterinario` | `DashboardView.vue` con `PanelLayout.vue` | Requiere sesión con rol `VETERINARIO` o `SUPERADMIN`; agenda de demostración. |
| `/panel-veterinario/clientes` | `ClientesView.vue`            | Clientes de demostración.                                            |
| `/panel-veterinario/agenda` | `AgendaView.vue`                | Agenda semanal de demostración.                                      |
| `/panel-veterinario/turnos` | `TurnosGestionView.vue`         | Confirmar, reprogramar y cancelar turnos de demostración (solo en memoria). |
| `/panel-veterinario/offline` | `OfflineView.vue`              | Prototipo local con IndexedDB.                                       |
| `/panel-veterinario/usuarios` | `UsersView.vue`               | Solo `SUPERADMIN`; alta real de veterinarios y administrativos vía `POST /api/users`. |
| `/panel-administrativo` | `admin/TurnosView.vue`              | `ADMINISTRATIVO` y `SUPERADMIN`. Agenda real: crear, confirmar, reprogramar y cancelar turnos. |
| `/panel-administrativo/tutores` | `admin/TutoresView.vue`     | Alta, búsqueda y edición de tutores. |
| `/panel-administrativo/tutores/:id` | `admin/TutorDetailView.vue` | Datos del tutor, sus animales y alta de animales o lotes. |
| `/panel-administrativo/fichas` | `admin/FichasView.vue`       | Búsqueda de pacientes. |
| `/panel-administrativo/fichas/:id` | `admin/FichaView.vue`    | Ficha clínica en solo lectura. |

Los dos paneles comparten `PanelLayout.vue` y `PanelSidebar.vue`, que arma el menú según el rol de la sesión. El modo oscuro está disponible para todos los roles desde el menú lateral: los colores de la marca son variables CSS (`Frontend/src/assets/main.css`) que la clase `.theme-dark` reemplaza, y la preferencia se guarda en el navegador (`useTheme`). Los datos de demostración del panel veterinario están en `Frontend/src/data/agendaMock.ts` y se comparten entre vistas mediante el store `agendaDemo`.

### API REST disponible

| Método | Endpoint             | Descripción                                                 |
| ------ | -------------------- | ----------------------------------------------------------- |
| `GET`  | `/api/health`        | Confirma que la API responde.                               |
| `GET`  | `/api/db/health`     | Ejecuta `SELECT 1` para comprobar la conexión a PostgreSQL. |
| `POST` | `/api/auth/register` | Valida e inserta un nuevo usuario y su perfil de dueño.     |
| `POST` | `/api/auth/login`    | Valida credenciales y establece una cookie de sesión HttpOnly. |
| `GET`  | `/api/auth/session`  | Valida la cookie y devuelve el identificador y rol de la sesión. |
| `POST` | `/api/auth/logout`   | Elimina la cookie de sesión del navegador.                  |
| `POST` | `/api/users`         | Solo `SUPERADMIN` (403 para otros roles). Crea un usuario `VETERINARIO` (con `matriculaProfesional`) o `ADMINISTRATIVO`. |
| `GET`  | `/api/tutores?buscar=` | Personal. Lista tutores (máx. 100), con búsqueda por nombre, email, teléfono, DNI o mascota. |
| `POST` | `/api/tutores`       | `ADMINISTRATIVO` y `SUPERADMIN`. Crea un tutor sin cuenta de usuario. |
| `GET`  | `/api/tutores/:id`   | Personal. Tutor con sus animales y establecimientos. |
| `PUT`  | `/api/tutores/:id`   | `ADMINISTRATIVO` y `SUPERADMIN`. Edita el tutor; el email de un tutor con cuenta no se puede cambiar desde acá. |
| `POST` | `/api/tutores/:id/animales` | `ADMINISTRATIVO` y `SUPERADMIN`. Alta de animal o lote, con su ficha médica, en una transacción. |
| `GET`  | `/api/animales?buscar=` | Personal. Busca pacientes por nombre del animal o del tutor (mín. 2 letras). |
| `GET`  | `/api/animales/:id/ficha` | Personal. Ficha y evoluciones clínicas en solo lectura. |
| `GET`  | `/api/turnos?desde&hasta&estado&veterinario` | Personal. Agenda general (rango máx. 92 días; por defecto, 7 días desde hoy). |
| `GET`  | `/api/turnos/veterinarios` | Personal. Profesionales asignables (con matrícula). |
| `POST` | `/api/turnos`        | `ADMINISTRATIVO` y `SUPERADMIN`. Crea un turno futuro (`PENDIENTE` o `CONFIRMADO`); rechaza el horario si el profesional ya está ocupado. |
| `POST` | `/api/turnos/:id/confirmar` | Personal. `PENDIENTE` o `REPROGRAMADO` → `CONFIRMADO`. |
| `POST` | `/api/turnos/:id/reprogramar` | Personal. Nueva fecha (y profesional, solo gestión) → `REPROGRAMADO`. |
| `POST` | `/api/turnos/:id/cancelar` | Personal. → `CANCELADA`, con motivo opcional. |

"Personal" son `SUPERADMIN`, `ADMINISTRATIVO` y `VETERINARIO`. En confirmar, reprogramar y cancelar, el veterinario solo puede actuar sobre los turnos asignados a él (403 en los demás); administrativo y superadmin, sobre cualquiera. Las transiciones solo se aplican si el turno sigue en el estado esperado, así un cambio simultáneo de otra persona no se pisa (409).

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

**Rutas privadas:** el guard (`router.beforeEach`) revisa las rutas con `meta.requiresAuth` y toma la sesión del store Pinia `session`. Solo la primera vez (al abrir o recargar la app) la confirma con `GET /api/auth/session`, porque la cookie HttpOnly no se puede leer desde JavaScript. Sin sesión, redirige a `/login?redirect=<ruta pedida>`. Con sesión pero sin permiso para esa ruta (por ejemplo, un cliente que abre `/panel-veterinario`), muestra `/acceso-denegado` (403), con un enlace al panel propio si el rol tiene uno.

Tras el login, cada rol va a su panel: `CLIENTE` a `/panel`; `VETERINARIO` y `SUPERADMIN` a `/panel-veterinario`; `ADMINISTRATIVO` a `/panel-administrativo`. Si el login trae un `redirect` a una ruta que el rol no puede abrir, se ignora y se usa el panel del rol.

**Límite de intentos:** `POST /api/auth/login` admite 10 intentos fallidos cada 15 minutos por IP (los logins correctos no cuentan) y `POST /api/auth/register`, 5 registros por hora por IP. Al superarlos responde `429` con las cabeceras `RateLimit` y `RateLimit-Policy`. Los contadores viven en memoria, así que se reinician al reiniciar la API y no se comparten entre instancias. El login compara contra un hash descartable cuando el email no existe, así el tiempo de respuesta no revela qué correos están registrados.

**Errores:** todas las respuestas de error son JSON con la forma `{ "status": "error", "message": "..." }`. Una ruta inexistente devuelve `404`; un cuerpo JSON mal formado, `400`; un error inesperado, `500`, sin detalles internos.

## Base de datos

La aplicación usa PostgreSQL mediante la dependencia `pg`. Las consultas se ejecutan con el `Pool` compartido exportado por `Backend/src/config/database.ts`; el registro usa un cliente del Pool y una transacción para crear el usuario y el perfil de dueño de forma atómica.

El esquema de la aplicación comprende estas ocho tablas:

`usuario`, `duenio`, `finca`, `animal`, `ficha_medica`, `visita`, `turno` y `evolucion_clinica`.

La API escribe en `usuario`, `duenio`, `animal`, `ficha_medica` y `turno`, y lee `evolucion_clinica` y `finca`. `visita` todavía no tiene endpoints.

**Migraciones:** el esquema inicial se creó a mano en Neon y no está versionado. Los cambios posteriores van en `Backend/migrations/` como archivos SQL numerados (`001_...sql`) y se aplican con `npm run db:migrate`, que registra cada uno en la tabla `schema_migrations` y no los repite. Cada migración corre en su propia transacción.

- `001_turno_pendiente_y_motivos.sql`: agrega el estado `PENDIENTE` a `estado_turno` y las columnas `motivo` y `motivo_cancelacion` a `turno`. Aplicada en la base de desarrollo de Neon.

## Variables de entorno y seguridad

- Los archivos locales `.env` contienen secretos y no se deben subir al repositorio. Los archivos `.env.example` contienen solo ejemplos.
- Configura `DATABASE_URL` únicamente en `Backend/.env` o en el gestor seguro de secretos del entorno de despliegue.
- Configura `JWT_SECRET` con al menos 32 bytes aleatorios en `Backend/.env` o en el gestor de secretos. No reutilices ni publiques ese valor.
- `AUTH_SESSION_TTL_SECONDS` define la duración de la sesión (por defecto, 28800; rango permitido: 300 a 2592000 segundos). `AUTH_COOKIE_SAME_SITE` acepta `strict`, `lax` o `none`; `none` exige HTTPS y `NODE_ENV=production`.
- El Pool de PostgreSQL exige validación TLS del certificado.
- La contraseña del cliente se valida en el controlador y se almacena como hash mediante bcrypt en el servicio de registro; nunca se guarda en texto plano.
- Express limita CORS a las URL configuradas mediante `FRONTEND_URL`; si no está definida, permite los orígenes locales indicados en `Backend/src/app.ts`.
- `TRUST_PROXY` indica cuántos proxies confiar para obtener la IP real del cliente. Dejalo vacío en local y usá `1` en Render; si queda vacío detrás de un proxy, el límite de intentos agrupa a todos los usuarios en la IP del proxy.

## Estado funcional actual

- **Implementado en código:** navegación pública, registro transaccional, hash de contraseñas, login/logout/verificación de sesión mediante cookie HttpOnly, guards frontend por rol (cliente; veterinario o superadministrador), límite de intentos en login y registro, respuestas de error JSON y endpoints de salud.
- **Registro desde frontend:** `/registro` envía nombre completo, email, teléfono, localidad y contraseña a `POST /api/auth/register`; presenta errores de la API y confirma el alta solo tras recibir una respuesta exitosa. El alta no inicia sesión automáticamente. La conexión real con Neon sigue pendiente de prueba en un entorno configurado.
- **Arranque del Backend:** `npm run dev` ejecuta `src/index.ts`; `npm run build` compila a `dist/` y `npm start` inicia `dist/index.js`. `server.js` es una implementación anterior con MySQL y no forma parte de estos scripts.
- **Pendiente de validar con Neon:** conexión de registro/login contra la instancia real y configuración de `JWT_SECRET`, cookie y CORS del entorno de despliegue.
- **Panel administrativo conectado a la API:** turnos, tutores, alta de animales y lectura de fichas, con autorización por rol en el backend (`requireRole` y reglas en `turno.service.ts`).
- **Pendiente de implementación:** acceso del tutor a sus propios animales y turnos (filtro por propietario), endpoints de visitas y evoluciones clínicas, notas administrativas, señas y pagos, sesión revocable y sincronización clínica offline. El panel veterinario (dashboard, agenda, clientes y gestión de turnos) sigue con datos de demostración. El prototipo local veterinario no hace solicitudes a endpoints de dominio inexistentes; la sincronización se presenta deshabilitada y los borradores locales no deben contener datos clínicos reales.
- **Datos de muestra:** `Frontend/src/data/panelMock.ts` es exclusivamente para la interfaz del panel; no es persistencia ni información leída de Neon.

## Contexto y planificación

- [Contexto permanente del proyecto](AGENTS.md)
- [Planificación del proyecto y Sprint 3](utilidades/documentación/Planificación%20del%20proyecto.md)

## Roles y reglas pendientes

- [Matriz de roles y acciones](utilidades/documentación/Matriz%20de%20roles%20y%20acciones.md)
- [Registro de incógnitas](utilidades/documentación/Registro%20de%20inc%C3%B3gnitas.md)
