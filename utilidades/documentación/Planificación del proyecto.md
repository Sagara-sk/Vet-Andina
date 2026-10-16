# Planificación del proyecto Vet Andina

## 1. Criterio y estado de esta planificación

Este documento reúne el compromiso confirmado para el Sprint 3 según la devolución docente y propone una secuencia de continuidad para el producto. El alcance y los puntos del Sprint 3 son los indicados por el profesor. Las fases posteriores son una propuesta de orden, no compromisos aprobados ni estimaciones del equipo.

Antes de planificar cada sprint, contrastar esta propuesta con el backlog y el estado del repositorio. Registrar responsables, capacidad y decisiones en la herramienta de gestión del equipo; este documento no sustituye Taiga.

## 2. Línea de base del producto

El objetivo es centralizar tutores, animales/lotes, turnos y atención clínica para consultorio y campo, con acceso diferenciado por rol y uso offline rural. La base técnica existente descrita en el README incluye frontend Vue 3/TypeScript, API Express/TypeScript, PostgreSQL y registro de clientes. En `feature/erick-test` se implementaron login/logout con cookie HttpOnly y un guard frontend inicial; su integración contra Neon todavía no está verificada. La autorización backend por rol/propietario, los módulos de negocio y la estrategia offline todavía requieren trabajo.

Por lo tanto, el Sprint 3 debe producir autenticación funcional y una decisión offline verificable; no se debe confundir el spike offline con una sincronización de producción ya implementada.

## 3. Sprint 3 — 15 al 21/10

### Objetivo y compromiso

**Cerrar la autenticación inicial** (inicio de sesión, cierre de sesión, redirección al login, matriz de roles y contrato de autenticación) y **dejar documentada una solución offline** respaldada por una prueba en modo avión.

### Estado técnico observado en `feature/erick-test`

- Implementados en código: `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`, firma/verificación JWT en cookie `HttpOnly`, guard del frontend y restricción del panel cliente al rol `CLIENTE`.
- Pendiente para aceptar la integración: configurar `JWT_SECRET` y `DATABASE_URL` en un entorno seguro, probar login/registro contra Neon y revisar configuración de cookie/CORS para el dominio desplegado.
- No implementado: autorización backend por rol/propietario para recursos de dominio y revocación inmediata de sesiones. El guard frontend no sustituye esos controles.
- El soporte offline sigue siendo un spike técnico: hay almacenamiento IndexedDB y caché de app shell en la rama de prueba, pero faltan la decisión documentada, prueba reproducible en modo avión y validación de sincronización sin pérdida ni duplicación.

Este estado describe código observado, no historias aceptadas. No considerar VET-1, VET-2, VET-3 o VET-11 cerradas hasta cumplir sus criterios de aceptación y revisión.

| Historia | Entrega comprometida | Puntos |
| --- | --- | ---: |
| **VET-1** | Iniciar sesión. | 5 |
| **VET-2** | Cerrar sesión. | 4 |
| **VET-3** | Redirigir al login cuando corresponda. | 5 |
| **VET-6** | Matriz de roles. | 5 |
| **VET-7** | Contrato de autenticación. | 5 |
| **VET-11** | Spike: decisión técnica para fichas sin señal y prueba en modo avión; documentar resultado y recomendación. | 3 |
| **Total comprometido** | **6 historias** | **27** |

Los puntos se transcriben de la corrección docente (24 para autenticación y roles; 3 para el spike; 27 en total). No representan una velocidad objetivo: el Sprint 1 cerró 17 puntos y en el Sprint 2 solo se cerró una tarea, por lo que todavía no hay evidencia suficiente para pronosticar capacidad.

### Historias fuera del compromiso

VET-4, VET-5, VET-8, VET-9 y VET-10 vuelven al backlog para el sprint siguiente y **no forman parte del compromiso del Sprint 3**. Revisar antes de volver a priorizarlas si “Panel cliente” y “Home” duplican VET-8 o VET-10; consolidar o aclarar alcance en el backlog, sin duplicar trabajo ni puntos.

### Planning: viernes 16 al lunes 19/10

Realizar una sesión de **30 minutos con todo el equipo antes del lunes 19/10**, tal como pide la devolución. En esa sesión:

1. Confirmar disponibilidad y capacidad de cada integrante para el período.
2. Revisar el alcance y criterios de aceptación de las seis historias comprometidas.
3. Descomponer historias en tareas pequeñas, verificables y con definición de terminado.
4. Asignar responsable a **cada** tarea antes de comprometerla; el equipo informó 23 tareas sin responsable. No dejar tareas “del equipo” sin una persona accountable.
5. Estimar las historias que no tengan puntos, usando el método acordado por el equipo; conservar los puntos docentes existentes y evitar estimaciones individuales inventadas.
6. Verificar que la carga de Front coincida con la disponibilidad real; reasignar trabajo solo después de revisar capacidad y habilidades.
7. Registrar dependencias, bloqueos, responsable, puntos y criterios de aceptación en Taiga.
8. El PO prioriza, aclara alcance y acepta resultados; no asumir que debe ejecutar tareas de desarrollo o QA. Confirmar quién tiene el rol de PO, ya que no se especifica en el contexto disponible.

### Criterios de aceptación y terminado

Aplicar estos criterios a las historias cuando sean pertinentes y afinarlos en el planning:

- La autenticación tiene contrato de solicitud/respuesta y errores definidos; credenciales no válidas no abren sesión.
- La sesión se establece y se cierra en frontend y backend de forma coherente con el contrato. Alinear el almacenamiento con la decisión de seguridad del proyecto (cookies seguras HttpOnly en el diseño objetivo; no almacenar JWT en `localStorage`).
- Una sesión ausente o vencida no permite permanecer en rutas privadas y devuelve al flujo de login; las rutas públicas conservan su comportamiento.
- La matriz documenta permisos y restricciones para los cuatro roles. El backend debe validar los permisos; los guards del frontend mejoran navegación, pero no sustituyen la autorización de API.
- El spike identifica opciones, recomendación, riesgos y alcance de una prueba offline. Ejecutar una prueba reproducible en modo avión, anotar qué se pudo consultar/cargar y qué no, y documentar cómo se evita la sobrescritura al sincronizar. No declarar completa la sincronización productiva sin implementarla y probarla.
- Las tareas están asignadas, probadas según su alcance y revisadas por otra persona mediante el flujo de PR del equipo. Actualizar README u otra documentación si cambia el comportamiento.

### Riesgos a revisar durante el sprint

| Riesgo | Respuesta |
| --- | --- |
| Falta de responsables o estimaciones | Resolverlo en el planning, con capacidad y acuerdo del equipo; revisar diariamente bloqueos y tareas sin dueño. |
| Autenticación incompleta por ambigüedad del contrato | Acordar primero contrato, expiración, errores y flujo de sesión; compartirlo entre frontend y backend antes de integrar. |
| Paneles o historias duplicados | Revisar VET-8/VET-10 y “Panel cliente”/“Home” en backlog; dejar una definición única. |
| Alcance offline demasiado amplio | Limitar VET-11 a spike, decisión y prueba/documentación; separar implementación posterior como historias nuevas. |
| Cambios de sesión incompatibles con cookies seguras | Confirmar configuración local/despliegue, CORS y credenciales HTTP antes de cerrar integración. |

## 4. Secuencia propuesta después del Sprint 3

El orden de abajo es una propuesta de planificación. El equipo debe priorizarla con el PO, validar dependencias, crear historias en Taiga y asignar puntos y responsables antes de comprometer fechas.

### Próximo incremento: base de usuarios y agenda

- Retomar VET-4, VET-5, VET-8, VET-9 y VET-10 después de aclarar alcance y duplicaciones.
- Completar roles y permisos de forma efectiva en la API, incluyendo separación de datos por tutor y auditoría de operaciones relevantes.
- Preparar/validar el esquema y migraciones para tutores, establecimientos, animales, turnos y usuarios; no asumir que las tablas previstas están desplegadas.
- Implementar los flujos mínimos de perfiles y pacientes, y luego disponibilidad, agenda, solicitud, confirmación y cancelación de turnos.
- Reemplazar progresivamente los mocks por datos reales, etiquetando cualquier dato de demostración.

### Incrementos clínicos y de operación rural

- Implementar atenciones, fichas y evoluciones con autoría y marcas de tiempo; proteger el historial firmado bajo append-only, con correcciones como nuevas entradas trazables.
- Desarrollar la capacidad offline en forma separada del spike: selección segura de datos necesarios para campo, almacenamiento local, identificación de operaciones pendientes, reintentos y sincronización idempotente.
- Resolver concurrencia sin sobrescribir registros: conservar entradas independientes y sus autores/tiempos, mostrar conflictos cuando requieran intervención y reportar errores de sincronización.
- Evaluar PostGIS y geolocalización solo cuando el flujo rural lo necesite y el modelo de datos esté definido.

### Endurecimiento, validación y despliegue

- Probar matriz de permisos y propiedad con casos positivos y negativos; cubrir aislamiento de datos entre tutores y roles.
- Probar instalación/uso PWA, conectividad intermitente, modo avión, recuperación de red y ausencia de pérdida/duplicación de datos.
- Completar pruebas de API, validación de entradas, manejo de errores, cookies/CORS/CSRF conforme al diseño, observabilidad y auditoría sin exponer secretos ni datos sensibles.
- Validar responsive y accesibilidad en móvil y escritorio con usuarios representativos del consultorio y trabajo de campo.
- Verificar variables y secretos de despliegue para Cloudflare Pages, Render y Neon; promover a producción mediante PR revisado y aceptación clínica.
- Cerrar cada incremento con documentación, pruebas reproducibles, revisión por pares y demostración del comportamiento real.

## 5. Seguimiento y reglas de priorización

- Medir cierre por historias aceptadas y puntos completados, no por tareas iniciadas. Registrar carry-over y causas de no cierre.
- Usar la velocidad observada como referencia solo después de varios sprints comparables; no extrapolar de un Sprint 2 con cierre mínimo.
- Priorizar primero autenticación/autorización y protección de datos; después los flujos que habilitan atención cotidiana; luego offline de producción y capacidades geoespaciales según validación del uso rural.
- Mantener una Definition of Done común: criterios aceptados, cambios revisados, pruebas ejecutadas, documentación actualizada y sin secretos/datos reales en el repositorio.
- Toda historia comprometida debe tener alcance claro, puntos, responsable, tareas asignadas, criterios verificables, dependencias y evidencia de aceptación.

## 6. Referencias de proyecto

- Contexto e instrucciones persistentes para agentes: [`AGENTS.md`](../../AGENTS.md).
- Permisos propuestos por rol: [`Matriz de roles y acciones`](./Matriz%20de%20roles%20y%20acciones.md).
- Decisiones pendientes de validación: [`Registro de incógnitas`](./Registro%20de%20inc%C3%B3gnitas.md).
- Arquitectura y estado funcional observado: [`README.md`](../../README.md).
