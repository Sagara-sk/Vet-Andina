# Registro de incógnitas

## Propósito

Este registro reúne reglas de negocio, permisos y decisiones operativas que todavía deben validarse con el cliente o referente correspondiente. Hasta que cada punto tenga una respuesta aprobada, tratarlo como **pendiente**: no codificar una política como si estuviera acordada ni presentarla como comportamiento existente.

Registrar para cada resolución la decisión, quién la validó, la fecha, las implicaciones para el producto y las historias/tareas afectadas. Si una respuesta abre nuevas preguntas, agregarlas aquí antes de implementar.

## Preguntas pendientes

| ID | Tema | Pregunta para validar | Impacto / seguimiento |
| --- | --- | --- | --- |
| **INC-01** | Conflicto de sincronización offline | Si un veterinario registra o agrega información sin conexión en campo y, antes de sincronizar, un administrativo o la Dirección modifica datos del mismo animal en el servidor, ¿cómo se resolverá la concurrencia? ¿Qué tipos de registro se conservan como entradas append-only y qué datos editables requieren revisión o conciliación? | Definir política por tipo de dato, autoría, fecha de atención, fecha de sincronización, detección de conflictos y flujo de resolución sin pérdida silenciosa. El spike VET-11 debe documentar una recomendación y prueba, no asumir que la sincronización productiva queda resuelta. |
| **INC-02** | Validación de comprobantes de seña | ¿La validación del comprobante subido por el tutor será automática mediante una pasarela de pagos o requerirá validación manual y confirmación de Recepción? | Acordar estados del pago/turno, responsable de validar, evidencia que se conserva, errores/rechazos y momento en que el turno queda confirmado. |
| **INC-03** | Operadores en lotes rurales | ¿Cada establecimiento/lote tendrá un único usuario Tutor responsable o se permitirán subperfiles de empleados rurales autorizados para registrar incidencias de campo bajo supervisión del productor? | Si se admiten subperfiles, definir quién los crea/revoca, alcance por establecimiento/lote, operaciones permitidas, trazabilidad y qué datos clínicos o de otros establecimientos pueden consultar. |
| **INC-04** | Cancelación y reprogramación | ¿Se establecerá una ventana límite (por ejemplo, 24 o 48 horas antes del turno) durante la cual el tutor puede cancelar o reprogramar sin perder la seña, o cada caso quedará sujeto a criterio administrativo? | Confirmar plazos, zona horaria, excepciones, tratamiento de la seña, diferencia entre cancelar y solicitar cancelación, reprogramaciones y comunicación al tutor. Los ejemplos de 24/48 horas son opciones a evaluar, no una regla acordada. |
| **INC-05** | Visibilidad de notas administrativas | ¿Las notas administrativas añadidas por Recepción a la ficha médica serán visibles inmediatamente para todo el personal o requerirán revisión/visto bueno del veterinario asignado? | Definir categorías de nota, estados (si requiere aprobación), quién puede leerlas y editarlas, separación respecto de evoluciones clínicas y auditoría. La matriz no debe interpretarse como autorización para editar contenido médico. |

## Registro de resolución

Completar esta tabla a medida que se validen las preguntas. No registrar una decisión como aprobada hasta contar con confirmación del cliente o referente definido.

| ID | Estado | Decisión validada | Validó | Fecha | Historias/documentos afectados |
| --- | --- | --- | --- | --- | --- |
| INC-01 | Pendiente | — | — | — | VET-11, sincronización offline |
| INC-02 | Pendiente | — | — | — | Turnos, pagos/señas |
| INC-03 | Pendiente | — | — | — | Roles, establecimientos y lotes rurales |
| INC-04 | Pendiente | — | — | — | Turnos y pagos/señas |
| INC-05 | Pendiente | — | — | — | Fichas y notas administrativas |

## Relación con otros documentos

- [Matriz de roles y acciones](Matriz%20de%20roles%20y%20acciones.md)
- [Planificación del proyecto](Planificaci%C3%B3n%20del%20proyecto.md)
- [Contexto permanente del proyecto](../../AGENTS.md)
