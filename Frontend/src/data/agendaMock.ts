// Datos de ejemplo para el panel veterinario. Reemplazar por llamadas al Backend.
// Los nombres de campos siguen la tabla turno de la base (y TurnoLocal de
// IndexedDB) para que el cambio a la API sea directo.

export type TurnoEstado = 'pendiente' | 'confirmado' | 'cancelado' | 'atendido'
export type TurnoTipo = 'consultorio' | 'campo'

export interface ClienteDemo {
  id: number
  nombreCompleto: string
  telefono: string
  localidad: string
  animales: string[]
}

export interface TurnoDemo {
  id: number
  idCliente: number
  animal: string
  fechaHora: Date
  motivo: string
  tipo: TurnoTipo
  estado: TurnoEstado
  // Nombre completo de la cuenta de prueba asignada (ver README). En la API
  // será el id del veterinario.
  veterinario: string
  motivoCancelacion?: string
}

export const clientesDemo: ClienteDemo[] = [
  { id: 1, nombreCompleto: 'Marina Guzmán', telefono: '5492994001122', localidad: 'Cipolletti', animales: ['Rocco', 'Manchas'] },
  { id: 2, nombreCompleto: 'Diego Farías', telefono: '5492994003344', localidad: 'Fernández Oro', animales: ['Toby'] },
  { id: 3, nombreCompleto: 'Establecimiento La Loma', telefono: '5492994005566', localidad: 'Allen', animales: ['Tropa bovina (lote 4)'] },
  { id: 4, nombreCompleto: 'Carla Peña', telefono: '5492994007788', localidad: 'Cipolletti', animales: ['Nina'] },
  { id: 5, nombreCompleto: 'Hernán Quiroga', telefono: '5492994009900', localidad: 'Cinco Saltos', animales: ['Kira', 'Simón'] },
]

// Fechas relativas a hoy para que la demo siempre tenga agenda del día.
function en(dias: number, hora: string): Date {
  const [hh, mm] = hora.split(':').map(Number)
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  fecha.setHours(hh ?? 0, mm ?? 0, 0, 0)
  return fecha
}

export function crearTurnosDemo(): TurnoDemo[] {
  return [
    { id: 1, idCliente: 1, animal: 'Rocco', fechaHora: en(0, '09:00'), motivo: 'Control y vacunación', tipo: 'consultorio', estado: 'confirmado', veterinario: 'Julián Paredes' },
    { id: 2, idCliente: 2, animal: 'Toby', fechaHora: en(0, '10:30'), motivo: 'Consulta general', tipo: 'consultorio', estado: 'confirmado', veterinario: 'Julián Paredes' },
    { id: 3, idCliente: 3, animal: 'Tropa bovina (lote 4)', fechaHora: en(0, '11:15'), motivo: 'Visita a campo · control de tropa', tipo: 'campo', estado: 'confirmado', veterinario: 'Julián Paredes' },
    { id: 4, idCliente: 4, animal: 'Nina', fechaHora: en(0, '14:00'), motivo: 'Vacunación', tipo: 'consultorio', estado: 'confirmado', veterinario: 'Martín Sosa' },
    { id: 5, idCliente: 1, animal: 'Manchas', fechaHora: en(0, '16:00'), motivo: 'Control general', tipo: 'consultorio', estado: 'pendiente', veterinario: 'Julián Paredes' },
    { id: 6, idCliente: 5, animal: 'Kira', fechaHora: en(1, '09:30'), motivo: 'Castración', tipo: 'consultorio', estado: 'confirmado', veterinario: 'Martín Sosa' },
    { id: 7, idCliente: 5, animal: 'Simón', fechaHora: en(1, '11:00'), motivo: 'Control post operatorio', tipo: 'consultorio', estado: 'pendiente', veterinario: 'Julián Paredes' },
    { id: 8, idCliente: 3, animal: 'Tropa bovina (lote 4)', fechaHora: en(2, '08:00'), motivo: 'Visita a campo · vacunación aftosa', tipo: 'campo', estado: 'pendiente', veterinario: 'Julián Paredes' },
    { id: 9, idCliente: 2, animal: 'Toby', fechaHora: en(3, '15:00'), motivo: 'Desparasitación', tipo: 'consultorio', estado: 'confirmado', veterinario: 'Martín Sosa' },
    { id: 10, idCliente: 4, animal: 'Nina', fechaHora: en(-1, '10:00'), motivo: 'Consulta dermatológica', tipo: 'consultorio', estado: 'atendido', veterinario: 'Julián Paredes' },
    { id: 11, idCliente: 1, animal: 'Rocco', fechaHora: en(-2, '16:30'), motivo: 'Control general', tipo: 'consultorio', estado: 'cancelado', veterinario: 'Martín Sosa', motivoCancelacion: 'Solicitud del tutor' },
  ]
}

export const HORARIOS = ['08:00', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '15:00', '16:00', '16:30']
