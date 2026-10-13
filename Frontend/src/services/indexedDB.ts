const DB_NAME = 'Vet-Andina'
const DB_VERSION = 2

const STORE_ANIMALES = 'animales'
const STORE_HISTORIAL = 'historial_clinico'
const STORE_TURNOS = 'turnos'
const STORE_PENDIENTES = 'pendientes'


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
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
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

export async function obtenerAnimal(
  idServidor: number
): Promise<AnimalLocal | undefined> {
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

export async function guardarCambioPendiente(
  cambio: CambioPendiente
): Promise<void> {
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

