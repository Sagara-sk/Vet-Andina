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
  authorName: string
  modality: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  vaccines: unknown
  isErratum: boolean
  referencedEntryId: string | null
}

export interface MedicalRecord {
  animal: {
    id: string
    name: string
    species: string
    breed: string | null
    careType: string
    herdSize: number
    birthDate: string | null
  }
  tutor: { id: string; fullName: string; phone: string }
  record: { id: string; openedAt: string; allergiesHistory: string | null; status: string } | null
  entries: ClinicalEntry[]
}

export async function searchAnimals(search: string): Promise<AnimalSearchResult[]> {
  return (
    await apiRequest<{ animales: AnimalSearchResult[] }>(
      `/api/animales?buscar=${encodeURIComponent(search)}`,
    )
  ).animales
}

export async function getMedicalRecord(animalId: string): Promise<MedicalRecord> {
  return (await apiRequest<{ ficha: MedicalRecord }>(`/api/animales/${animalId}/ficha`)).ficha
}
