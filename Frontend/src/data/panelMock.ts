// Datos de ejemplo para el panel del cliente. Reemplazar por llamadas al Backend.

export type AppointmentStatus = 'confirmado' | 'pendiente' | 'realizado'

export interface Pet {
  id: number
  name: string
  species: string
  breed: string
  age: number
  note: string
}

export interface Appointment {
  id: number
  petId: number
  service: string
  date: Date
  place: string
  vet: string
  status: AppointmentStatus
}

export const currentUser = {
  firstName: 'Pedro',
  lastName: 'Gómez',
}

export const pets: Pet[] = [
  { id: 1, name: 'Rocco', species: 'Perro', breed: 'Labrador', age: 4, note: 'Próxima vacuna: 20 sep' },
  { id: 2, name: 'Luna', species: 'Gata', breed: 'Siamés', age: 2, note: 'Sin controles pendientes' },
  { id: 3, name: 'Manchas', species: 'Perro', breed: 'Mestizo', age: 7, note: 'Próximo control: 12 sep' },
]

export const appointments: Appointment[] = [
  {
    id: 1,
    petId: 1,
    service: 'Control y vacunación',
    date: new Date(2025, 8, 4, 10, 30),
    place: 'Consultorio Cipolletti',
    vet: 'Julián',
    status: 'confirmado',
  },
  {
    id: 2,
    petId: 3,
    service: 'Control general',
    date: new Date(2025, 8, 12, 16, 0),
    place: 'Consultorio Cipolletti',
    vet: 'Julián',
    status: 'pendiente',
  },
  {
    id: 3,
    petId: 2,
    service: 'Consulta general',
    date: new Date(2025, 7, 18, 11, 0),
    place: 'Consultorio Cipolletti',
    vet: 'Julián',
    status: 'realizado',
  },
]
