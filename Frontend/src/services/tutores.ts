import { apiRequest } from './http'

export type TipoPersona = 'INDIVIDUAL' | 'EMPRESA_PRODUCTOR'
export type TipoAtencion = 'URBANO' | 'RURAL'

export interface TutorSummary {
  id: string
  fullName: string
  phone: string
  email: string
  locality: string
  dniCuit: string | null
  hasAccount: boolean
  animalCount: number
}

export interface Animal {
  id: string
  name: string
  species: string
  breed: string | null
  careType: TipoAtencion
  herdSize: number
  birthDate: string | null
  farmId: string | null
}

export interface TutorDetail extends TutorSummary {
  address: string | null
  personType: TipoPersona | null
  missedAppointments: number
  animals: Animal[]
  farms: { id: string; name: string; locality: string }[]
}

export interface TutorInput {
  nombreCompleto: string
  telefono: string
  email: string
  localidad: string
  dniCuit: string | null
  direccionUrbana: string | null
  tipoPersona: TipoPersona | null
}

export interface AnimalInput {
  nombre: string
  especie: string
  raza: string | null
  tipoAtencion: TipoAtencion
  cantidadEnLote: number
  fechaNacimiento: string | null
  idFinca: string | null
}

export async function listTutors(search = ''): Promise<TutorSummary[]> {
  const query = search ? `?buscar=${encodeURIComponent(search)}` : ''
  return (await apiRequest<{ tutores: TutorSummary[] }>(`/api/tutores${query}`)).tutores
}

export async function getTutor(id: string): Promise<TutorDetail> {
  return (await apiRequest<{ tutor: TutorDetail }>(`/api/tutores/${id}`)).tutor
}

export async function createTutor(input: TutorInput): Promise<TutorDetail> {
  return (await apiRequest<{ tutor: TutorDetail }>('/api/tutores', { method: 'POST', body: input })).tutor
}

export async function updateTutor(id: string, input: TutorInput): Promise<TutorDetail> {
  return (await apiRequest<{ tutor: TutorDetail }>(`/api/tutores/${id}`, { method: 'PUT', body: input }))
    .tutor
}

export async function addAnimal(tutorId: string, input: AnimalInput): Promise<TutorDetail> {
  return (
    await apiRequest<{ tutor: TutorDetail }>(`/api/tutores/${tutorId}/animales`, {
      method: 'POST',
      body: input,
    })
  ).tutor
}
