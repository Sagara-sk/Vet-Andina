# Guía de continuidad para asistentes de IA

## Para qué sirve este documento

Esta guía permite que otro asistente retome tareas en Vet Andina sin reconstruir el contexto desde cero ni confundir objetivos futuros con funcionalidades existentes. Es un mapa de entrada, no reemplaza el código, las pruebas ni la documentación funcional especializada.

## Instrucciones de inicio para quien retome el repositorio

1. Leer primero [`AGENTS.md`](../../AGENTS.md) y este documento.
2. Revisar [`README.md`](../../README.md) y, según el área a modificar, la documentación vinculada más abajo.
3. Inspeccionar el estado de Git antes de editar. Hay cambios locales en curso; no descartarlos, revertirlos, hacer checkout ni asumir que pertenecen a la tarea nueva.
4. Confirmar el comportamiento en el código actual. Ante diferencias entre documentos y código, registrar la diferencia y seguir el estado real del código sin presentar una capacidad pendiente como terminada.
5. Hacer cambios precisos, tipados y compatibles con los patrones existentes. Actualizar documentación relacionada y ejecutar la validación más pequeña que cubra el cambio.
6. No acceder, imprimir ni compartir valores de `.env`, contraseñas, cookies, JWT, datos personales reales o información clínica.

## Contexto del producto

Vet Andina es una aplicación para la gestión de atención veterinaria urbana y rural, con operación prevista en Cipolletti y el Alto Valle. El sistema busca reemplazar la coordinación manual de turnos y las fichas en papel. El trabajo rural sin conectividad es una necesidad importante, pero la descarga, sincronización y resolución de conflictos offline **no están implementadas como funcionalidad productiva**.

Los roles de producto son `SUPERADMIN`, `ADMINISTRATIVO`, `VETERINARIO` y `CLIENTE`. La descripción de sus permisos es una especificación funcional; no significa que existan los endpoints de dominio correspondientes.

## Fuentes de verdad y documentación

- [`AGENTS.md`](../../AGENTS.md): contexto permanente, arquitectura objetivo, principios clínicos y reglas de trabajo.
- [`README.md`](../../README.md): instalación, comandos, arquitectura y estado técnico general.
- [`Autenticación y autorización.md`](./Autenticaci%C3%B3n%20y%20autorizaci%C3%B3n.md): estado de sesión, RBAC, ABAC y política de roles.
- [`Matriz de roles y acciones.md`](./Matriz%20de%20roles%20y%20acciones.md): permisos funcionales esperados.
- [`Formularios de autenticación.md`](./Formularios%20de%20autenticaci%C3%B3n.md): campos, contratos y diagnóstico de registro/login.
- [`Estructura y configuración.md`](./Estructura%20y%20configuraci%C3%B3n.md): organización e instalación.
- [`Planificación del proyecto.md`](./Planificaci%C3%B3n%20del%20proyecto.md): roadmap y alcance acordado.
- [`Registro de incógnitas.md`](./Registro%20de%20inc%C3%B3gnitas.md): decisiones de negocio que siguen pendientes.

Hay descripciones antiguas en algunos documentos, especialmente sobre el segundo paso del registro. Si difieren del código, corregirlas al trabajar en esa funcionalidad.

## Arquitectura real observada

El repositorio contiene dos aplicaciones independientes:

- **Frontend:** Vue 3, Composition API, TypeScript, Vue Router, Pinia y Tailwind CSS. Se encuentra en `Frontend/`.
- **Backend activo:** Node.js, Express, TypeScript y PostgreSQL a través de `pg`. Está en `Backend/src/`; los scripts actuales no arrancan la API JavaScript legacy `Backend/server.js`.
- **Persistencia:** PostgreSQL, prevista para Neon. No se encontró un esquema o conjunto de migraciones versionadas que permita confirmar las tablas y columnas de la base desplegada.
- **ORM:** no hay un ORM activo/configurado. Las consultas se realizan con `pg`.
- **Autenticación:** bcrypt, JWT, Passport/Passport-JWT, cookie-parser y cookie HttpOnly.

### Estructura útil

```text
Frontend/src/
  components/       Componentes de interfaz, formularios y paneles
  config/           Configuración de API y contenido institucional
  data/             Datos mock del panel
  layouts/          Estructuras pública y autenticada
  router/           Rutas y guards del cliente
  services/         Comunicación con API y almacenamiento local
  views/            Vistas de la aplicación

Backend/src/
  config/           Variables de entorno, PostgreSQL y Passport
  controllers/      Validación HTTP y respuestas
  middlewares/      Autenticación y autorización por rol
  models/           Consultas SQL y acceso a datos
  routes/           Endpoints HTTP
  services/         Autenticación y lógica de aplicación
  app.ts            Composición de Express, CORS y routers
  index.ts          Arranque del servidor
```

## Funcionalidad implementada y límites actuales

### API

En el código activo se encuentran:

- `GET /api/health` y `GET /api/db/health`.
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session` y `POST /api/auth/logout`.
- `POST /api/duenios/perfil`, añadido para el paso complementario del perfil de cliente.
- Middleware Passport-JWT para validar la cookie y middleware `authorizeRoles(...)` para restringir rutas por rol.

La existencia de middleware reutilizable no equivale a autorización completa de todos los recursos. No asumir que están implementados CRUD de mascotas, lotes, turnos, pagos, historias clínicas, notas, administración de personal o auditoría.

### Registro de cliente en dos pasos

1. `/registro` captura nombre completo, email, teléfono, localidad, contraseña y confirmación.
2. `POST /api/auth/register` valida la entrada, asigna `CLIENTE`, aplica bcrypt y crea `usuario` y `duenio` en una transacción.
3. El servidor emite una cookie de sesión después del registro; el frontend conserva temporalmente nombre, email, teléfono y localidad en `sessionStorage` (no conserva la contraseña).
4. `/registro/perfil` valida la cookie de sesión y envía únicamente `dni_cuit`, `tipo_persona`, `direccion_urbana` y `nombre_finca`.
5. La ruta de perfil exige sesión y rol `CLIENTE`. El modelo actualiza `duenio` y, si corresponde, crea o actualiza `finca` en una sola transacción.

Archivos del flujo: `Frontend/src/components/login/RegisterForm.vue`, `Frontend/src/views/RegisterStepTwoView.vue`, `Frontend/src/services/auth.ts`, `Backend/src/routes/profile.routes.ts`, `Backend/src/controllers/auth.controller.ts` y `Backend/src/models/owner.model.ts`.

El esquema de la base actualmente configurada fue inspeccionado sin leer datos personales. `duenio.tipo_persona` no existía y `finca.localidad` es obligatoria; se añadió y aplicó `Backend/migrations/001_add_duenio_tipo_persona.sql` a esa base. Aplicar la misma migración en cualquier otro entorno antes de probar allí.

### Sesión, autorización y frontend

- El backend firma JWT con `JWT_SECRET` y lo entrega en una cookie `HttpOnly`; el token no se persiste en `localStorage`.
- `SameSite` y `Secure` dependen de la configuración/entorno; revisar CORS, HTTPS y CSRF si se cambia el despliegue.
- El frontend llama a `VITE_API_BASE_URL` con `credentials: 'include'`.
- Los guards del router solo controlan navegación y no sustituyen la autorización del servidor.
- El panel cliente y la agenda veterinaria contienen datos de demostración; no son datos leídos de PostgreSQL.
- `Frontend/src/services/indexedDB.ts` no implica que exista sincronización clínica offline productiva.

## Verificaciones realizadas y límites

- Se corrigió el error `column reference "nombre_completo" is ambiguous` evitando el join ambiguo: el guardado ahora selecciona únicamente campos calificados de `duenio`.
- La introspección de columnas y las escrituras del perfil ahora usan el mismo `PoolClient` y una transacción.
- La API ahora rechaza esquemas incompletos en vez de informar éxito si los campos no existen.
- La localidad obligatoria de una finca se toma del perfil del dueño.
- La pantalla del segundo paso valida la sesión del backend; ya no depende de datos guardados en `sessionStorage`.
- La migración se aplicó y se confirmó que existe `public.duenio.tipo_persona` en la base configurada para esta sesión.

La compilación no prueba por sí sola todo el recorrido de navegador. Para la verificación final del flujo, crear una cuenta de prueba con datos autorizados y confirmar las filas guardadas en `usuario`, `duenio` y, si corresponde, `finca`, sin compartir contraseñas ni datos personales en logs.

## Variables de entorno y arranque local

No copiar valores reales en documentación ni pedir al usuario que los publique. Usar los nombres documentados en `Backend/.env.example` y `Frontend/.env.example`.

- Backend: `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET`, `AUTH_SESSION_TTL_SECONDS` y `AUTH_COOKIE_SAME_SITE`.
- Frontend: `VITE_API_BASE_URL`.
- Desarrollo previsto: API en `http://localhost:3000`, frontend Vite en `http://localhost:5173`.
- Después de modificar una variable `VITE_*`, reiniciar Vite.
- Para errores de conexión, inspeccionar primero Network del navegador, origen exacto, CORS y `/api/health`; no atribuir `Failed to fetch` a credenciales incorrectas sin una respuesta HTTP.

Comandos ejecutados desde las carpetas respectivas:

```powershell
npm run dev
npm run build
npm start
```

En el frontend, `npm run build` ejecuta chequeo de tipos y build; `npm run lint` aplica `--fix` en sus scripts actuales, por lo que conviene inspeccionar `package.json` antes de usarlo sobre un worktree compartido. No ejecutar instalaciones salvo que una validación falle por dependencias faltantes o se modifique un manifiesto.

## Reglas de producto y seguridad para cualquier cambio

- El registro público crea exclusivamente rol `CLIENTE`; nunca aceptar un rol del navegador.
- Aplicar autenticación, RBAC y propiedad del recurso en el backend; denegar por defecto. Un cliente solo accede a recursos propios.
- Las evoluciones clínicas son append-only: no editar ni borrar una entrada firmada. Las correcciones, si se aprueban, deben ser nuevas entradas trazables.
- Separar notas administrativas y clínicas, y conservar autoría y fechas pertinentes.
- No resolver sincronización offline sobrescribiendo datos concurrentes ni descartando fallos silenciosamente.
- Usar validación de servidor y consultas parametrizadas. No loguear contraseñas, tokens, información clínica ni credenciales.
- No inventar decisiones clínicas, permisos, reglas de pago/cancelación ni compromisos del equipo. Consultar el Registro de incógnitas.
- No convertir datos mock en datos presentados como reales.

## Estado de Git en el momento de crear esta guía

La revisión inicial detectó la rama `feature/erick-test` y un worktree con cambios locales, tanto modificados como nuevos, en Backend, Frontend y documentación. La lista exacta puede cambiar; comprobar siempre `git status --short` antes de continuar. Esos cambios no deben descartarse ni atribuirse automáticamente al nuevo trabajo. No se creó un commit como parte de esta guía.

## Validación previamente observada

En la sesión de trabajo inmediatamente anterior a esta guía, `npm run build` terminó correctamente en `Backend/` y `Frontend/`. Eso confirma compilación/tipos en ese momento, pero **no** verifica conexión con la base real ni el flujo de perfil extremo a extremo. Repetir las validaciones pertinentes después de cualquier cambio.
