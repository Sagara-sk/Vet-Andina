# Matriz de roles y acciones

## Propósito y alcance

Esta matriz formaliza los permisos funcionales propuestos para Vet Andina a partir de la definición del equipo. Es una referencia para validar con el cliente y traducir luego a controles de acceso y pruebas. **No implica que estos permisos ya estén implementados**: la autorización debe verificarse en la API; ocultar acciones en la interfaz no es un control de seguridad suficiente.

Las reglas marcadas como pendientes se registran en el [Registro de incógnitas](Registro%20de%20inc%C3%B3gnitas.md) y no deben cerrarse por suposición.

## Matriz

| Rol | Qué puede ver | Qué puede hacer | Restricciones principales |
| --- | --- | --- | --- |
| **Superadmin** | Todas las fichas médicas y evoluciones clínicas. | Modificar antecedentes, alergias y estado de las fichas; agregar evoluciones clínicas y fe de erratas. | No puede editar ni eliminar evoluciones guardadas. |
| **Administrativo** | Todas las fichas médicas y evoluciones clínicas. | Modificar antecedentes, alergias y estado de las fichas; agregar evoluciones clínicas y fe de erratas cuando sea necesario. | No puede editar ni eliminar evoluciones guardadas. |
| **Veterinario** | Todas las fichas médicas y evoluciones clínicas. | Modificar antecedentes, alergias y estado de las fichas; agregar evoluciones clínicas y fe de erratas. | No puede editar ni eliminar evoluciones guardadas. |
| **Cliente / Tutor** | Las fichas médicas de sus propios animales y lotes. | Consultar la información clínica en modo de solo lectura. Registrar mascotas para solicitar turnos, cuando esté habilitada esa funcionalidad. | No puede completar, modificar ni agregar información clínica. No puede acceder a animales de otros tutores. |

## Principios de aplicación

- **Mínimo privilegio:** conceder solo las operaciones expresamente permitidas para el rol y denegar por defecto las demás.
- **Autorización del lado servidor:** validar rol y alcance del recurso en cada operación. Para clientes, comprobar también que el recurso pertenece al tutor autenticado; no confiar en identificadores enviados por el navegador.
- **Separación de registros:** distinguir notas administrativas, comprobantes de pago y evoluciones clínicas, con autoría y marcas de tiempo apropiadas.
- **Inmutabilidad clínica:** las evoluciones clínicas no pueden modificarse ni eliminarse, independientemente del rol. Las correcciones se registran mediante una nueva evolución de tipo fe de erratas, vinculada a la evolución original.
- **Gestión de fichas:** Superadmin, Veterinario y Administrativo pueden modificar los antecedentes, alergias y estado de una ficha médica. El cliente solo tiene acceso de lectura.
- **Creación automática:** toda alta de un animal o lote debe generar una ficha médica asociada, sin duplicarla si ya existe.
- **Trazabilidad:** auditar las operaciones sensibles (por ejemplo, administración de cuentas, reasignaciones y cambios de turnos) sin guardar secretos ni datos clínicos innecesarios en logs.
- **Acceso amplio del personal:** Superadmin, Administrativo y Veterinario pueden consultar todas las fichas médicas y evoluciones clínicas.
- **Offline:** el acceso y sincronización offline todavía dependen de la decisión registrada en el Registro de incógnitas y del spike de la historia VET-11.

## Referencias

- [Registro de incógnitas](Registro%20de%20inc%C3%B3gnitas.md)
- [Contexto permanente del proyecto](../../AGENTS.md)
- [Planificación del proyecto](Planificaci%C3%B3n%20del%20proyecto.md)
