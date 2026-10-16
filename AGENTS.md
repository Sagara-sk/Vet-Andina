# Vet Andina: contexto permanente del proyecto

Este archivo es la referencia de contexto del proyecto para agentes de desarrollo. Leerlo antes de planificar o modificar el producto y mantener las decisiones de implementación alineadas con él. Si el código o la documentación describen un estado distinto del objetivo, conservar el estado real como hecho y tratar la teoría como dirección, no como funcionalidad ya existente.

## Identidad, propósito y contexto

- **Producto:** Vet Andina, sistema de gestión veterinaria urbana y rural.
- **Ubicación y alcance operativo:** Cipolletti, Río Negro, Argentina; consultorio para animales de compañía y visitas a establecimientos ganaderos del Alto Valle.
- **Propósito:** reemplazar la coordinación manual de turnos y las fichas en papel con una plataforma web responsive y progresivamente instalable como PWA.
- **Contexto:** Prácticas Profesionalizantes. Equipo de desarrollo: Mariano, Ezequiel, Joaquín, Santiago y Erick. Julián es el referente clínico y debe tener el rol de Superadministrador en el producto.
- **Necesidad distintiva:** poder consultar y registrar información durante visitas rurales sin conectividad, para sincronizarla al volver la señal.
- **Repositorio oficial informado por el equipo:** `Sagara-sk/vet_andina`.

## Roles y límites de acceso esperados

Aplicar autorización en el backend además de ocultar o mostrar elementos en el frontend. Cada endpoint y consulta debe limitar datos y operaciones por rol y propietario.

| Rol | Responsabilidades y permisos esperados |
| --- | --- |
| **Superadministrador** | Gestión del negocio, dashboard de facturación y turnos, lectura del historial clínico de todos los pacientes, auditoría, creación y suspensión de personal, reasignaciones y parámetros globales. |
| **Administrativo** | Calendarios y agendas, alta y edición de tutores, animales y lotes, gestión de turnos, recepción de pagos y notas administrativas. No modifica notas médicas. |
| **Veterinario** | Agenda propia y general, lectura de historias clínicas para atención y emergencias, nuevas evoluciones médicas append-only, turnos asignados y preparación de datos offline. |
| **Cliente / Tutor** | Gestión de sus datos, sus animales o lotes, solicitudes y gestión de sus turnos, y lectura exclusiva de las historias clínicas de sus animales. |

No confundir el acceso amplio de profesionales a historias con el acceso de clientes: los tutores solo pueden ver sus propios animales. Denegar por defecto las operaciones no autorizadas.

## Arquitectura y tecnologías objetivo

- **Frontend:** Vue 3 Composition API, TypeScript, Tailwind CSS, Pinia, Vue Router con guards y ESLint/Prettier. Diseñar para móvil y escritorio.
- **Persistencia offline:** almacenamiento local apropiado (la estrategia a evaluar incluye IndexedDB) y sincronización explícita al recuperar conectividad.
- **Backend:** API REST en Node.js, Express y TypeScript. Las reglas de negocio, validación y autorización pertenecen al servidor.
- **Autenticación:** JWT en cookies seguras `HttpOnly`, `Secure` y `SameSite=Strict`, según las condiciones de despliegue; evitar tokens en almacenamiento accesible por JavaScript. Proteger y configurar CORS/CSRF de acuerdo con el flujo real.
- **Contraseñas:** hash con algoritmo de costo adecuado. El proyecto actual usa bcrypt; cualquier cambio requiere decisión documentada y migración compatible.
- **Base de datos:** PostgreSQL gestionado (Neon en la configuración prevista), relaciones consistentes entre tutores, establecimientos, animales, turnos y atención. PostGIS es una capacidad prevista para geografía y distancias rurales; no asumir que ya está desplegada.
- **Datos clínicos variables:** JSONB puede ser apropiado donde el dominio lo justifique, manteniendo validación y tipos para los campos esenciales.
- **Despliegue previsto:** frontend en Cloudflare Pages, API en Render y PostgreSQL en Neon. Confirmar configuración efectiva antes de modificar despliegues.

## Integridad clínica, offline y seguridad

- Las evoluciones clínicas son **append-only**: no editar ni borrar una evolución firmada; las correcciones deben agregarse como nuevas entradas trazables, si el flujo clínico acordado lo permite.
- Toda evolución debe identificar autor y momento de registro. Diferenciar fecha/hora de atención de fecha/hora de sincronización cuando corresponda.
- La sincronización offline no debe sobrescribir información concurrente. Conservar cada registro independiente, su autor y sus marcas de tiempo; resolver conflictos sin descartar datos silenciosamente.
- Validar entradas en el servidor, usar consultas parametrizadas, proteger credenciales y datos personales, y no registrar secretos ni información clínica innecesaria en logs.
- No presentar datos mock como datos clínicos reales ni como información obtenida de la base.
- No afirmar como implementada una capacidad que solo esté en esta teoría; comprobar código, configuración y pruebas.

## Estado confirmado en el repositorio al redactar este contexto

El `README.md` describe el estado técnico que debe usarse como línea de base hasta verificar cambios posteriores:

- Frontend Vue 3 + TypeScript y API Express + TypeScript; conexión PostgreSQL por `pg` y TLS.
- Registro de clientes conectado: crea usuario y perfil de dueño en una transacción; bcrypt para contraseñas.
- Endpoints disponibles: `GET /api/health`, `GET /api/db/health`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session` y `POST /api/auth/logout`.
- Login y cookie de sesión HttpOnly implementados en código; verificar el flujo con Neon y configurar `JWT_SECRET` antes de desplegar. El guard del frontend protege `/panel`, pero no sustituye autorización backend.
- Autorización backend por rol/propietario, revocación de sesiones y endpoints de dominio siguen pendientes.
- Panel con datos mock; mascotas, turnos, evoluciones y otras operaciones de dominio aún sin endpoints CRUD descritos.
- No se describen migraciones SQL o seeders en el repositorio. Verificar el esquema real antes de depender de él.
- La API ya tiene algunas dependencias de autenticación instaladas; una dependencia instalada no demuestra que el flujo sea funcional.

## Guía para el trabajo futuro

1. Revisar el código y la documentación relacionados antes de cambiar una funcionalidad; respetar patrones existentes y mantener actualizada la documentación directamente afectada.
2. Priorizar la seguridad, privacidad y consistencia de datos clínicos; aplicar autorización servidor-side y controles de propiedad.
3. Implementar por incrementos pequeños, tipados y verificables. Añadir o actualizar pruebas de comportamiento, no solo de presencia de código.
4. No asignar trabajo, estimaciones, decisiones clínicas ni compromisos de sprint por conjetura. Registrar lo que el equipo confirme.
5. Mantener `main` como rama estable, `develop` como integración y ramas `feature/*`; integrar con PR revisado por otra persona y mensajes Conventional Commits según el proceso del equipo.
6. Para permisos funcionales, consultar la [Matriz de roles y acciones](utilidades/documentación/Matriz%20de%20roles%20y%20acciones.md); para decisiones aún no validadas, consultar el [Registro de incógnitas](utilidades/documentación/Registro%20de%20inc%C3%B3gnitas.md).
7. Para roadmap, alcance y criterios del Sprint 3, consultar [Planificación del proyecto](utilidades/documentación/Planificación%20del%20proyecto.md).
