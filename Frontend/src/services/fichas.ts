import { apiRequest } from './http'

export interface AnimalSearchResult {
  id: string
  name: string
  species: string
  tutorId: string
  tutorName: string
}

export interface ClinicalEntry {
  id: string
  recordedAt: string
  attendedAt: string | null
  authorName: string
  modality: 'URBANO' | 'RURAL'
  kind: ClinicalEntryKind
  reason: string
  diagnosis: string | null
  treatment: string | null
  vaccines: unknown
  details: ClinicalEntryDetails
  isErratum: boolean
  referencedEntryId: string | null
  erratumDetail: string | null
}

export type ClinicalEntryKind =
  'CONSULTA' | 'PESO' | 'VACUNA' | 'DESPARASITACION' | 'TRATAMIENTO_GRUPAL' | 'EVENTO_POBLACIONAL'

export interface ClinicalEntryDetails {
  pesoKg?: number
  vacuna?: string
  producto?: string
  dosis?: string
  proximaFecha?: string | null
  cantidadTratada?: number
  evento?: string
  cantidadAfectada?: number
}

export type MedicalRecordStatus = 'ACTIVO' | 'INACTIVO' | 'FALLECIDO'

export interface MedicalRecord {
  animal: {
    id: string
    name: string
    species: string
    breed: string | null
    careType: 'URBANO' | 'RURAL'
    herdSize: number
    birthDate: string | null
    farmName: string | null
    farmLocality: string | null
  }
  tutor: {
    id: string
    fullName: string
    phone: string
  }
  record: {
    id: string
    openedAt: string
    allergiesHistory: string | null
    status: MedicalRecordStatus
  } | null
  entries: ClinicalEntry[]
}

export interface UpdateMedicalRecordPayload {
  alergiasAntecedentes: string | null
  estado: MedicalRecordStatus
}

export interface NewClinicalEntryPayload {
  modalidad: 'URBANO' | 'RURAL'
  tipoRegistro: ClinicalEntryKind
  fechaAtencion: string | null
  motivoConsulta: string
  diagnostico: string | null
  tratamiento: string | null
  vacunasAplicadas: string[]
  detalles: ClinicalEntryDetails
}

export interface NewErratumPayload {
  detalle: string
}

export async function searchAnimals(search: string): Promise<AnimalSearchResult[]> {
  const response = await apiRequest<{ animales: AnimalSearchResult[] }>(
    `/api/animales?buscar=${encodeURIComponent(search)}`,
  )

  return response.animales
}

export async function getMedicalRecord(animalId: string): Promise<MedicalRecord> {
  const response = await apiRequest<{ ficha: MedicalRecord }>(`/api/animales/${animalId}/ficha`)

  return response.ficha
}

export async function updateMedicalRecord(
  animalId: string,
  payload: UpdateMedicalRecordPayload,
): Promise<MedicalRecord> {
  const response = await apiRequest<{ ficha: MedicalRecord }>(`/api/animales/${animalId}/ficha`, {
    method: 'PATCH',
    body: payload,
  })

  return response.ficha
}

export async function addClinicalEntry(
  animalId: string,
  payload: NewClinicalEntryPayload,
): Promise<MedicalRecord> {
  const response = await apiRequest<{ ficha: MedicalRecord }>(
    `/api/animales/${animalId}/ficha/evoluciones`,
    {
      method: 'POST',
      body: payload,
    },
  )

  return response.ficha
}

export async function addErratum(
  animalId: string,
  evolutionId: string,
  payload: NewErratumPayload,
): Promise<MedicalRecord> {
  const response = await apiRequest<{ ficha: MedicalRecord }>(
    `/api/animales/${animalId}/ficha/evoluciones/${evolutionId}/fe-de-erratas`,
    {
      method: 'POST',
      body: payload,
    },
  )

  return response.ficha
}
