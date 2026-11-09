import { apiRequest } from './http'

export interface LotePropio {
  id: string
  name: string
  species: string
  breed: string | null
  animalCount: number
}

export interface EstablecimientoPropio {
  id: string
  name: string
  locality: string | null
  totalAnimals: number
  lots: LotePropio[]
}

// La API devuelve solo los establecimientos del tutor de la sesión.
export async function listMisEstablecimientos(): Promise<EstablecimientoPropio[]> {
  return (
    await apiRequest<{ establecimientos: EstablecimientoPropio[] }>('/api/establecimientos/mios')
  ).establecimientos
}
