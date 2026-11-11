import type { MedicalRecord, NewClinicalEntryPayload } from './fichas'

const DB_NAME = 'Vet-Andina'
const DB_VERSION = 3

const STORE_ANIMALES = 'animales'
const STORE_HISTORIAL = 'historial_clinico'
const STORE_TURNOS = 'turnos'
const STORE_PENDIENTES = 'pendientes'
const STORE_FICHAS = 'fichas_cache'
const STORE_BORRADORES_FICHA = 'borradores_ficha'

export interface AnimalLocal {
  idServidor: number
  nombre: string
  especie: string
  descargadoOffline: boolean
  historial: HistorialLocal[]
  observaciones: ObservacionLocal[]
  turnos: TurnoLocal[]
}

export interface ObservacionLocal {
  id: number
  id_animal: number
  fecha: string
  comentario: string
}

export interface HistorialLocal {
  id: number
  id_animal: number
  fecha: string
  comentario: string
}

export interface TurnoLocal {
  id: number
  id_animal: number
  fecha_hora: string
  motivo: string
  prioridad: 'leve' | 'moderada' | 'urgente' | 'emergencia'
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'atendido'
}

export interface CambioPendiente {
  id: string
  tipo: 'historial_clinico'
  operacion: 'crear'
  idAnimalServidor: number
  datos: {
    comentario: string
    fecha: string
    tipo: 'clinico' | 'observacion'
  }
  creadoEn: string
}

export interface FichaCacheLocal {
  key: string
  userId: string
  animalId: string
  descargadaEn: string
  ficha: MedicalRecord
}

export interface BorradorFichaLocal {
  id: string
  userId: string
  animalId: string
  authorId: string
  authorName: string
  queuedAt: string
  payload: NewClinicalEntryPayload
}

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_ANIMALES)) {
        const store = db.createObjectStore(STORE_ANIMALES, {
          keyPath: 'idServidor',
        })

        store.createIndex('nombre', 'nombre', { unique: false })
        store.createIndex('especie', 'especie', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_HISTORIAL)) {
        const store = db.createObjectStore(STORE_HISTORIAL, {
          keyPath: 'id',
        })

        store.createIndex('id_animal', 'id_animal', {
          unique: false,
        })
      }

      if (!db.objectStoreNames.contains(STORE_TURNOS)) {
        const store = db.createObjectStore(STORE_TURNOS, {
          keyPath: 'id',
        })

        store.createIndex('id_animal', 'id_animal', {
          unique: false,
        })
      }

      if (!db.objectStoreNames.contains(STORE_PENDIENTES)) {
        const store = db.createObjectStore(STORE_PENDIENTES, {
          keyPath: 'id',
        })

        store.createIndex('tipo', 'tipo', {
          unique: false,
        })
      }

      if (!db.objectStoreNames.contains(STORE_FICHAS)) {
        const store = db.createObjectStore(STORE_FICHAS, {
          keyPath: 'key',
        })

        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('animalId', 'animalId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_BORRADORES_FICHA)) {
        const store = db.createObjectStore(STORE_BORRADORES_FICHA, {
          keyPath: 'id',
        })

        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('animalId', 'animalId', { unique: false })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

function fichaCacheKey(userId: string, animalId: string): string {
  return `${userId}:${animalId}`
}

export async function guardarFichaOffline(
  userId: string,
  ficha: MedicalRecord,
): Promise<FichaCacheLocal> {
  const cached: FichaCacheLocal = {
    key: fichaCacheKey(userId, ficha.animal.id),
    userId,
    animalId: ficha.animal.id,
    descargadaEn: new Date().toISOString(),
    ficha,
  }
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FICHAS, 'readwrite')
    transaction.objectStore(STORE_FICHAS).put(cached)

    transaction.oncomplete = () => {
      db.close()
      resolve(cached)
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function obtenerFichaOffline(
  userId: string,
  animalId: string,
): Promise<FichaCacheLocal | undefined> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FICHAS, 'readonly')
    const request = transaction.objectStore(STORE_FICHAS).get(fichaCacheKey(userId, animalId))

    request.onsuccess = () => {
      db.close()
      resolve(request.result as FichaCacheLocal | undefined)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function obtenerFichasOffline(userId?: string): Promise<FichaCacheLocal[]> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FICHAS, 'readonly')
    const store = transaction.objectStore(STORE_FICHAS)
    const request = userId ? store.index('userId').getAll(userId) : store.getAll()

    request.onsuccess = () => {
      db.close()
      resolve(request.result as FichaCacheLocal[])
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function guardarBorradorFicha(borrador: BorradorFichaLocal): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BORRADORES_FICHA, 'readwrite')
    transaction.objectStore(STORE_BORRADORES_FICHA).put(borrador)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function obtenerBorradoresFicha(
  userId?: string,
  animalId?: string,
): Promise<BorradorFichaLocal[]> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BORRADORES_FICHA, 'readonly')
    const request = transaction.objectStore(STORE_BORRADORES_FICHA).getAll()

    request.onsuccess = () => {
      db.close()
      const drafts = request.result as BorradorFichaLocal[]
      resolve(
        drafts.filter(
          (draft) =>
            (!userId || draft.userId === userId) && (!animalId || draft.animalId === animalId),
        ),
      )
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function eliminarBorradorFicha(id: string): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BORRADORES_FICHA, 'readwrite')
    transaction.objectStore(STORE_BORRADORES_FICHA).delete(id)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}





export async function guardarAnimal(animal: AnimalLocal): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ANIMALES, 'readwrite')
    const store = transaction.objectStore(STORE_ANIMALES)

    store.put(animal)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function obtenerAnimales(): Promise<AnimalLocal[]> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ANIMALES, 'readonly')
    const store = transaction.objectStore(STORE_ANIMALES)
    const request = store.getAll()

    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function obtenerAnimal(idServidor: number): Promise<AnimalLocal | undefined> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ANIMALES, 'readonly')
    const store = transaction.objectStore(STORE_ANIMALES)
    const request = store.get(idServidor)

    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function guardarCambioPendiente(cambio: CambioPendiente): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PENDIENTES, 'readwrite')
    const store = transaction.objectStore(STORE_PENDIENTES)

    store.put(cambio)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function obtenerCambiosPendientes(): Promise<CambioPendiente[]> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PENDIENTES, 'readonly')
    const store = transaction.objectStore(STORE_PENDIENTES)
    const request = store.getAll()

    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function eliminarCambioPendiente(id: string): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PENDIENTES, 'readwrite')
    const store = transaction.objectStore(STORE_PENDIENTES)

    store.delete(id)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

// Borrar ficha descargada
export async function eliminarAnimal(idServidor: number): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ANIMALES, 'readwrite')
    const store = transaction.objectStore(STORE_ANIMALES)

    store.delete(idServidor)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}
