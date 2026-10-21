# Matriz de roles y acciones

## Propósito y alcance

Esta matriz formaliza los permisos funcionales propuestos para Vet Andina a partir de la definición del equipo. Es una referencia para validar con el cliente y traducir luego a controles de acceso y pruebas. **No implica que estos permisos ya estén implementados**: la autorización debe verificarse en la API; ocultar acciones en la interfaz no es un control de seguridad suficiente.

Las reglas marcadas como pendientes se registran en el [Registro de incógnitas](Registro%20de%20inc%C3%B3gnitas.md) y no deben cerrarse por suposición.
La política técnica, el estado de los middlewares y la separación entre RBAC y propiedad de recursos están en [Autenticación y autorización](Autenticaci%C3%B3n%20y%20autorizaci%C3%B3n.md).

## Matriz

| Rol | Qué puede ver | Qué puede hacer | Restricciones principales |
| --- | --- | --- | --- |
| **Dirección General / Administrador del Sistema (Superadmin)** | Dashboard ejecutivo global (facturación, métricas y rendimiento); historial clínico completo de todos los pacientes; auditoría de logs y listado general de usuarios. | Crear, activar, suspender o desactivar cuentas de veterinarios y administrativos; reasignar clientes, mascotas y lotes rurales entre profesionales; configurar parámetros globales (servicios, tarifas y horarios); crear entradas en cualquier historial clínico; modificar, reprogramar o cancelar turnos en la agenda global. | No se definen restricciones funcionales adicionales en la propuesta inicial. El acceso debe autenticarse y quedar auditado. La administración del sistema no debe permitir editar o eliminar evoluciones clínicas ya guardadas: el historial conserva el principio append-only. |
| **Personal de Recepción y Administración (Administrativo)** | Calendario general de turnos y agendas diarias de los profesionales; perfiles de tutores, datos de mascotas y establecimientos rurales; historias clínicas en modo solo lectura. | Crear y editar perfiles de tutores; registrar altas preliminares de mascotas y lotes; agendar, reprogramar, confirmar o cancelar turnos de consultorio y campo; registrar recepción de señas y comprobantes; agregar notas administrativas a la ficha con autoría y marca de tiempo. | No puede modificar ni eliminar notas o evoluciones clínicas creadas por veterinarios. No puede administrar usuarios ni roles. Las notas administrativas son distintas de las entradas clínicas; su visibilidad y revisión profesional están pendientes de definición. |
| **Médico Veterinario / Profesional Sanitario (Veterinario)** | Agenda de turnos asignados y agenda general; historial clínico completo de todos los pacientes, para coberturas o emergencias. | Agregar nuevas evoluciones o historias clínicas a la ficha de cualquier paciente sin aprobación previa, siguiendo el modelo append-only; modificar, reprogramar o cancelar sus turnos asignados, con coordinación previa por WhatsApp y notificación automática; preparar/descargar datos para trabajo offline rural y sincronizarlos al recuperar conectividad. | No puede borrar ni editar notas o historias clínicas ya guardadas. Las correcciones deben preservar el contenido original y agregarse de forma trazable conforme a la regla clínica que se acuerde. No se deben sobrescribir cambios concurrentes durante la sincronización offline. |
| **Tutor / Propietario de Animales (Cliente)** | Su perfil y datos de contacto; sus mascotas y establecimientos/lotes; historial clínico consolidado de sus animales en solo lectura; estado y resumen de sus turnos vigentes e históricos. | Registrarse de forma autónoma con teléfono móvil obligatorio; dar de alta sus mascotas o establecimientos/lotes; solicitar turnos seleccionando animal/servicio, fecha y abonando la seña correspondiente; solicitar la cancelación de sus propios turnos. | No puede acceder a información de otros tutores o sus animales (control por propietario/ABAC). No puede crear ni modificar registros clínicos. La cancelación es una solicitud; el plazo, efecto sobre la seña y autonomía para reprogramar están pendientes de definición. |

## Principios de aplicación

- **Mínimo privilegio:** conceder solo las operaciones expresamente permitidas para el rol y denegar por defecto las demás.
- **Autorización del lado servidor:** validar rol y alcance del recurso en cada operación. Para clientes, comprobar también que el recurso pertenece al tutor autenticado; no confiar en identificadores enviados por el navegador.
- **Separación de registros:** distinguir notas administrativas, comprobantes de pago y evoluciones clínicas, con autoría y marcas de tiempo apropiadas.
- **Inmutabilidad clínica:** no editar ni borrar evoluciones clínicas guardadas; si se admite corregirlas, agregar una nueva entrada trazable que no oculte el original.
- **Trazabilidad:** auditar las operaciones sensibles (por ejemplo, administración de cuentas, reasignaciones y cambios de turnos) sin guardar secretos ni datos clínicos innecesarios en logs.
- **Acceso amplio del personal:** la lectura profesional transversal de historias clínicas está propuesta para Superadmin y Veterinario. El equipo debe validar su alcance y justificarlo por necesidad operativa.
- **Offline:** el acceso y sincronización offline todavía dependen de la decisión registrada en el Registro de incógnitas y del spike de la historia VET-11.
- **Estado de implementación:** el backend tiene autenticación de sesión y un middleware RBAC reutilizable, pero todavía no ofrece endpoints de dominio en los que aplicar la matriz completa ni controles ABAC de propiedad. La vista offline actual no descarga ni sincroniza registros clínicos.

## Referencias

- [Registro de incógnitas](Registro%20de%20inc%C3%B3gnitas.md)
- [Contexto permanente del proyecto](../../AGENTS.md)
- [Planificación del proyecto](Planificaci%C3%B3n%20del%20proyecto.md)
