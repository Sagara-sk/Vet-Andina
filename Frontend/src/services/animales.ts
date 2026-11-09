import { apiRequest } from './http'
import type { TipoAtencion } from './auth'

export interface AnimalPropio {
  id: string
  name: string
  species: string
  modality: TipoAtencion
  farmId: string | null
}

// Animales del tutor de la sesión. Con `tipo`, la API devuelve solo los de ese
// tipo de atención (URBANO = mascotas) y rechaza RURAL si el tutor no es rural.
export async function listMisAnimales(tipo?: TipoAtencion): Promise<AnimalPropio[]> {
  const query = tipo ? `?tipo=${tipo}` : ''
  const response = await apiRequest<{ animales: AnimalPropio[] }>(`/api/animales/mios${query}`)

  return response.animales
}
