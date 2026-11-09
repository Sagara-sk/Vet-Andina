import { apiRequest } from './http'

export interface AnimalPropio {
  id: string
  name: string
  species: string
  modality: 'URBANO' | 'RURAL'
  farmId: string | null
}

export async function listMisAnimales(): Promise<AnimalPropio[]> {
  const response = await apiRequest<{ animales: AnimalPropio[] }>(
    '/api/animales/mios',
  )

  return response.animales
}
