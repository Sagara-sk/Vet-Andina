# Autenticación y autorización

## Propósito y alcance

Este documento define la política de identidad y permisos para futuras implementaciones y distingue las reglas acordadas del comportamiento que ya existe en el repositorio. Los permisos de la matriz son la dirección funcional recibida del equipo; **no significan que existan endpoints de dominio o que toda la autorización esté implementada**.

La autorización debe aplicarse en la API, en cada endpoint y en cada acceso a datos. Los guards del frontend solo mejoran la navegación y nunca sustituyen controles del servidor. Denegar por defecto y validar tanto el rol como la propiedad del recurso.

## Roles

Usar estos identificadores canónicos en los registros de usuario y en las comprobaciones de la API:

| Identificador | Nombre | Alcance |
| --- | --- | --- |
| `SUPERADMIN` | Superadmin | Administración integral, auditoría y gestión global. |
| `ADMINISTRATIVO` | Administrativo | Agenda, clientes, datos operativos y pagos; sin edición de notas clínicas. |
| `VETERINARIO` | Veterinario | Atención clínica y evoluciones append-only; acceso profesional transversal según la política aprobada. |
| `CLIENTE` | Cliente / Propietario | Acceso únicamente a su perfil, animales/lotes, turnos e historias clínicas de su propiedad. |

Los nombres y acciones están desarrollados en la [Matriz de roles y acciones](./Matriz%20de%20roles%20y%20acciones.md). Las decisiones todavía no validadas deben consultarse en el [Registro de incógnitas](./Registro%20de%20inc%C3%B3gnitas.md).

## Autenticación y registro

- La API activa es Express + TypeScript bajo `Backend/src/`; `npm run dev` la ejecuta con `tsx`, `npm run build` compila a `dist/` y `npm start` sirve `dist/index.js`. El antiguo `Backend/server.js` no forma parte de los scripts activos.
- La persistencia de autenticación usa PostgreSQL mediante `pg`; no hay un ORM configurado actualmente.
- El identificador de acceso es el email único junto con la contraseña.
- El endpoint público `POST /api/auth/register` exige `nombreCompleto`, `email`, `telefono`, `localidad` y `contrasena`. El servidor valida los campos, normaliza el email, aplica bcrypt con costo 12 y crea `usuario` y `duenio` dentro de una transacción.
- El registro asigna `CLIENTE` en el servidor. El endpoint rechaza campos adicionales, por lo que no acepta `rol` enviado por el navegador. Tras crear la cuenta, establece la cookie de sesión para que el cliente pueda completar su perfil sin volver a autenticarse.
- `POST /api/duenios/perfil` requiere autenticación y rol `CLIENTE`. Actualiza `dni_cuit`, `tipo_persona` y `direccion_urbana` en el perfil `duenio` asociado al usuario de la sesión. Si se envía `nombre_finca`, crea o actualiza la finca asociada e informa la localidad del dueño. No acepta identificadores de propietario desde el cliente.
- La migración `Backend/migrations/001_add_duenio_tipo_persona.sql` agrega la columna `duenio.tipo_persona` y restringe sus valores a `INDIVIDUAL` o `EMPRESA_PRODUCTOR`. Debe aplicarse en cada entorno antes de usar el endpoint de perfil.
- `POST /api/auth/login` comprueba la contraseña y emite un JWT firmado en una cookie `HttpOnly`. El token no se devuelve al frontend ni se guarda en `localStorage`.
- La cookie usa `SameSite=Strict` por defecto. `Secure` se activa con `NODE_ENV=production`; cualquier cambio de origen o política de cookie requiere revisar HTTPS, CORS y CSRF. `JWT_SECRET` debe estar configurado de forma segura y tener al menos 32 bytes.
- `GET /api/auth/session` valida la cookie mediante Passport JWT y vuelve a buscar el usuario en la base; así, la estrategia usa el rol vigente del usuario y no depende únicamente del rol que el cliente pudiera presentar.
- `POST /api/auth/logout` elimina la cookie del navegador. No hay revocación inmediata de tokens ya emitidos antes de su vencimiento.
- Los formularios frontend de `/registro` y `/login` consumen la API mediante `VITE_API_BASE_URL`; se envían cookies con `credentials: 'include'`. La API debe permitir el origen del frontend en `FRONTEND_URL`.

## Autorización en la API

### RBAC (rol)

`Backend/src/middlewares/auth.middleware.ts` autentica al usuario. `Backend/src/middlewares/role.middleware.ts` exporta `authorizeRoles(...roles)`, que responde `401` si la solicitud no tiene usuario autenticado y `403` cuando el rol vigente no está permitido. Las rutas que incorporen permisos deben componer ambos middlewares, por ejemplo:

```ts
router.get(
  "/admin/usuarios",
  authMiddleware,
  authorizeRoles("SUPERADMIN"),
  listUsers,
);
```

No crear rutas administrativas o clínicas sin autenticación y autorización explícita. Los roles se obtienen del usuario cargado por Passport desde PostgreSQL; no confiar en un rol enviado en el body, query, header o parámetro de ruta.

**Estado actual:** el middleware RBAC está disponible, pero todavía no existen endpoints `/api/admin/*` ni endpoints CRUD para animales, turnos, fichas, visitas o evoluciones. Por lo tanto, la política de roles de dominio aún no está aplicada a recursos de negocio. El endpoint de sesión permite consultar la identidad propia a cualquier usuario autenticado.

El endpoint de perfil de dueño es una excepción de dominio ya conectada: verifica sesión y rol `CLIENTE`, y limita la actualización al dueño asociado con `userId` de la sesión. Esto no implementa ABAC para otros recursos.

### ABAC / propiedad del recurso

Para toda operación de un `CLIENTE`, el servidor debe verificar que el recurso solicitado pertenece al cliente autenticado. No alcanza con validar que el ID existe ni con filtrar en la interfaz. La consulta o servicio debe asociar el recurso a su propietario desde datos confiables del servidor; los IDs enviados por el navegador no prueban propiedad.

Ejemplo de política futura para `GET /api/pacientes/:id/historial`:

1. Autenticar la cookie.
2. Si el rol es `CLIENTE`, comprobar en PostgreSQL que el paciente `:id` pertenece al dueño asociado al `userId` de la sesión.
3. Si el rol es personal, permitir solo las acciones expresamente autorizadas para ese endpoint.
4. Denegar por defecto y no revelar datos de otros clientes.

**Estado actual:** no hay endpoints de pacientes ni un modelo/consulta de propiedad en la API activa; no es posible completar ni afirmar protección ABAC de recursos hasta implementar el dominio y verificar las relaciones del esquema real.

## Matriz funcional recibida

### Superadmin

- **Puede ver:** dashboard ejecutivo de facturación, turnos y rendimiento; historial clínico de todos los pacientes; auditoría y listado global de usuarios/roles.
- **Puede hacer:** crear, activar, suspender o desactivar cuentas de Veterinarios y Administrativos; reasignar clientes, animales y lotes entre profesionales; configurar servicios, tarifas y horarios; crear nuevas entradas clínicas; modificar, reprogramar o cancelar turnos de la agenda global.
- El acceso debe ser autenticado y auditable. Aun para Superadmin, el historial clínico permanece inmutable: no editar ni eliminar evoluciones existentes.

### Administrativo

- **Puede ver:** calendario general y agendas diarias; perfiles de clientes, animales y establecimientos rurales.
- **Puede hacer:** crear/editar perfiles de clientes; dar de alta animales y lotes; agendar, reprogramar, confirmar o cancelar turnos; registrar recepción de señas y comprobantes; agregar notas administrativas con autor y fecha/hora exactas.
- **No puede:** administrar usuarios/roles ni modificar o eliminar notas clínicas de Veterinarios.
- Las notas administrativas deben almacenarse separadas de las evoluciones clínicas. Su visibilidad/revisión sigue pendiente según INC-05.

### Veterinario

- **Puede ver:** agenda asignada y general, e historias clínicas para atención cruzada/emergencias dentro del alcance funcional que valide el equipo.
- **Puede hacer:** agregar evoluciones a cualquier historia clínica sin aprobación previa; gestionar turnos asignados tras coordinar con el cliente; preparar datos rurales para uso offline cuando exista un flujo seguro y sincronizarlos con trazabilidad.
- **No puede:** borrar ni editar notas o historias previas. Las correcciones deben ser nuevas entradas trazables. La sincronización no debe sobrescribir información concurrente ni descartar fallos silenciosamente.

### Cliente

- **Puede ver:** su perfil, sus animales y establecimientos/lotes, historias clínicas propias en solo lectura y sus turnos vigentes e históricos.
- **Puede hacer:** registrarse con nombre, email, teléfono y localidad; gestionar sus animales/lotes; solicitar turnos para sus recursos y pedir la cancelación de sus turnos.
- **No puede:** consultar recursos de otros clientes ni crear/editar evoluciones clínicas.
- La seña, validación de comprobantes, cancelaciones y reprogramaciones deben seguir las decisiones aprobadas del [Registro de incógnitas](./Registro%20de%20inc%C3%B3gnitas.md).

## Inmutabilidad clínica y auditoría

- Las evoluciones clínicas son append-only: no se exponen operaciones de actualización o borrado para entradas firmadas.
- Cada entrada clínica debe persistir autor, fecha/hora de atención y fecha/hora de registro/sincronización cuando corresponda.
- Las notas administrativas, los comprobantes de pago y las evoluciones clínicas son tipos de datos separados y con permisos distintos.
- Auditar operaciones sensibles (gestión de personal, reasignaciones y cambios de agenda), sin registrar contraseñas, JWT, secretos ni información clínica innecesaria.

## Estado y tareas futuras

Implementado en la API: registro de clientes, hashing bcrypt, login, cookie JWT HttpOnly, validación de sesión y middleware RBAC reutilizable. Pendiente: verificar el flujo con la base real, definir y validar el esquema/migraciones, implementar recursos de dominio con autorización RBAC+ABAC en cada consulta, definir la revocación de sesiones y desarrollar sincronización offline idempotente con resolución de conflictos.

Antes de abrir una ruta protegida nueva, agregar pruebas de acceso permitido y denegado por rol y propietario. Para cualquier ORM futuro, conservar estas reglas en la capa de servicio/API y no confiar en filtros de interfaz ni en hooks del ORM como único control de acceso.

## Referencias

- [Matriz de roles y acciones](./Matriz%20de%20roles%20y%20acciones.md)
- [Registro de incógnitas](./Registro%20de%20inc%C3%B3gnitas.md)
- [Planificación del proyecto](./Planificaci%C3%B3n%20del%20proyecto.md)
- [Contexto permanente del proyecto](../../AGENTS.md)