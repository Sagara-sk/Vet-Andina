<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  guardarAnimal,
  obtenerAnimales,
  guardarCambioPendiente,
  obtenerCambiosPendientes,
  eliminarAnimal,
  eliminarCambioPendiente,
} from '../../services/indexedDB'
import { API_BASE_URL } from '../../config/api'

interface Animal {
  id: number
  nombre: string
  especie: string
}

interface AnimalLocal {
  idServidor: number
  nombre: string
  especie: string
  descargadoOffline: boolean
  historial: {
    id: number
    id_animal: number
    fecha: string
    comentario: string
  }[]
  observaciones: {
    id: number
    id_animal: number
    fecha: string
    comentario: string
  }[]
  turnos: {
    id: number
    id_animal: number
    fecha_hora: string
    motivo: string
    prioridad: 'leve' | 'moderada' | 'urgente' | 'emergencia'
    estado: 'pendiente' | 'confirmado' | 'cancelado' | 'atendido'
  }[]
}

const conectado = ref(navigator.onLine)
const buscando = ref(false)
const mensaje = ref('')
const busqueda = ref('')

const animales = ref<Animal[]>([])
const animalesDescargados = ref<AnimalLocal[]>([])
const animalSeleccionado = ref<AnimalLocal | null>(null)

const comentario = ref('')
const cambiosPendientes = ref(0)
const sincronizando = ref(false)

const animalesFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()

  if (!texto) {
    return animales.value
  }

  return animales.value.filter(
    (animal) =>
      animal.nombre.toLowerCase().includes(texto) ||
      animal.especie.toLowerCase().includes(texto)
  )
})

async function cargarAnimalesOffline() {
  try {
    animalesDescargados.value = await obtenerAnimales()
  } catch (error) {
    console.error('Error al cargar fichas offline:', error)
  }
}

async function cargarCambiosPendientes() {
  try {
    const cambios = await obtenerCambiosPendientes()
    cambiosPendientes.value = cambios.length
  } catch (error) {
    console.error('Error al cargar cambios pendientes:', error)
  }
}

async function cargarAnimales() {
  if (!navigator.onLine) {
    return
  }

  buscando.value = true

  try {
    const response = await fetch(`${API_BASE_URL}/animales`)

    if (!response.ok) {
      throw new Error('No se pudieron obtener los animales')
    }

    animales.value = await response.json()
  } catch (error) {
    console.error('Error al cargar animales:', error)
    mensaje.value = 'No se pudieron cargar los animales.'
  } finally {
    buscando.value = false
  }
}

async function actualizarTodo() {
  await cargarAnimalesOffline()
  await cargarCambiosPendientes()

  if (navigator.onLine) {
    await cargarAnimales()
  }
}

function actualizarConexion() {
  conectado.value = navigator.onLine

  if (conectado.value) {
    cargarAnimales()
  }
}


function seleccionarAnimal(animal: AnimalLocal) {
  animalSeleccionado.value = animal

  setTimeout(() => {
    const ficha = document.getElementById('ficha-animal')

    if (ficha) {
      ficha.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, 50)
}

function cerrarFicha() {
  animalSeleccionado.value = null
}

async function descargarFicha(animal: Animal) {
  if (!navigator.onLine) {
    mensaje.value = 'Necesitás conexión a internet para descargar una ficha.'
    return
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/animales/${animal.id}/ficha`
    )

    if (!response.ok) {
      throw new Error('No se pudo obtener la ficha completa')
    }

    const ficha = await response.json()

    await guardarAnimal({
      idServidor: ficha.animal.id,
      nombre: ficha.animal.nombre,
      especie: ficha.animal.especie,
      descargadoOffline: true,
      historial: ficha.historial,
      observaciones: ficha.observaciones,
      turnos: ficha.turnos,
    })

    await cargarAnimalesOffline()

    const fichaLocal = animalesDescargados.value.find(
      (item) => item.idServidor === animal.id
    )

    if (fichaLocal) {
      seleccionarAnimal(fichaLocal)
    }

    mensaje.value = `${animal.nombre} quedó disponible para trabajar offline.`

    setTimeout(() => {
      mensaje.value = ''
    }, 4000)
  } catch (error) {
    console.error('Error al descargar ficha:', error)
    mensaje.value = 'No se pudo descargar la ficha completa.'
  }
}


async function borrarFicha(animal: AnimalLocal) {
  await eliminarAnimal(animal.idServidor)

  if (animalSeleccionado.value?.idServidor === animal.idServidor) {
    animalSeleccionado.value = null
  }

  await cargarAnimalesOffline()

  mensaje.value = `La ficha de ${animal.nombre} fue eliminada del almacenamiento offline.`

  setTimeout(() => {
    mensaje.value = ''
  }, 4000)
}


async function registrarOffline() {
  const texto = comentario.value.trim()

  if (!animalSeleccionado.value) {
    return
  }

  if (!texto) {
    mensaje.value = 'Escribí un comentario antes de registrarlo.'
    return
  }

  try {
    const cambio = {
      id: crypto.randomUUID(),
      tipo: 'historial_clinico' as const,
      operacion: 'crear' as const,
      idAnimalServidor: animalSeleccionado.value.idServidor,
      datos: {
        comentario: texto,
        fecha: new Date().toISOString(),
        tipo: 'observacion'as const,
      },
      creadoEn: new Date().toISOString(),
    }

    await guardarCambioPendiente(cambio)

    await cargarCambiosPendientes()

    comentario.value = ''

    mensaje.value = `Cambio registrado offline para ${animalSeleccionado.value.nombre}.`

    setTimeout(() => {
      mensaje.value = ''
    }, 4000)
  } catch (error) {
    console.error('Error al registrar cambio offline:', error)
    mensaje.value = 'No se pudo guardar el cambio offline.'
  }
}

async function sincronizar() {
  if (!navigator.onLine) {
    mensaje.value = 'No hay conexión a internet.'
    return
  }

  const cambios = await obtenerCambiosPendientes()

  if (cambios.length === 0) {
    mensaje.value = 'No hay cambios pendientes para sincronizar.'
    return
  }

  sincronizando.value = true

  try {
    for (const cambio of cambios) {
      const response = await fetch(
        `${API_BASE_URL}/historial-clinico`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_animal: cambio.idAnimalServidor,
            fecha: cambio.datos.fecha,
            comentario: cambio.datos.comentario,
            tipo: cambio.datos.tipo,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('No se pudo sincronizar un cambio')
      }

      await eliminarCambioPendiente(cambio.id)
    }

    await cargarCambiosPendientes()

    mensaje.value = 'Cambios sincronizados correctamente.'
  } catch (error) {
    console.error('Error al sincronizar:', error)
    mensaje.value = 'No se pudieron sincronizar todos los cambios.'
  } finally {
    sincronizando.value = false
  }
}


onMounted(() => {
  window.addEventListener('online', actualizarConexion)
  window.addEventListener('offline', actualizarConexion)

  actualizarTodo()
})

onUnmounted(() => {
  window.removeEventListener('online', actualizarConexion)
  window.removeEventListener('offline', actualizarConexion)
})
</script>

<template>
  <div class="min-h-screen bg-[#fafaf7] text-[#1e211c]">

    <!-- CABECERA -->
    <div class="flex items-start justify-between gap-6">
      <div>
        <h1 class="font-serif text-[1.6rem]">
          Modo offline
        </h1>

        <p class="mt-1.5 text-base text-[#63665f]">
          Prepará las fichas que necesitás para trabajar sin conexión.
        </p>
      </div>

      <!-- ESTADO DE CONEXIÓN -->
      <div
        class="flex items-center gap-2 whitespace-nowrap text-xs"
        :class="conectado ? 'text-[#1f3323]' : 'text-[#7a5b1f]'"
      >
        <span
          class="h-[7px] w-[7px] rounded-full"
          :class="conectado ? 'bg-[#34503a]' : 'bg-[#c49a3a]'"
        />

        {{ conectado ? 'Conectado' : 'Desconectado' }}
      </div>
    </div>

    <!-- RESUMEN -->
    <div class="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <div class="rounded border border-[#e1ded4] bg-white p-5">
        <p class="font-serif text-[1.7rem]">
          {{ animalesDescargados.length }}
        </p>

        <p class="mt-1 text-xs text-[#63665f]">
          Fichas disponibles offline
        </p>
      </div>

      <div class="rounded border border-[#e1ded4] bg-white p-5">
        <p class="font-serif text-[1.7rem]">
          {{ cambiosPendientes }}
        </p>

        <p class="mt-1 text-xs text-[#63665f]">
          Cambios pendientes
        </p>
      </div>

      <div class="rounded border border-[#e1ded4] bg-white p-5">
        <button
          class="w-full rounded-sm bg-[#34503a] py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="sincronizando || !conectado"
          @click="sincronizar"
        >
          {{ sincronizando ? 'Sincronizando...' : 'Sincronizar ahora' }}
        </button>
      </div>
    </div>

    <!-- MENSAJE -->
    <div
      v-if="mensaje"
      class="mt-6 rounded-lg bg-[#e7eee3] px-4 py-3 text-sm text-[#1f3323]"
    >
      {{ mensaje }}
    </div>

    <!-- BUSCADOR -->
    <section class="mt-9">
      <div class="mb-3.5">
        <h3 class="text-base font-medium">
          Buscar animal
        </h3>

        <p class="mt-1 text-xs text-[#63665f]">
          Buscá un animal para descargar su ficha completa y llevarla al campo.
        </p>
      </div>

      <div class="rounded border border-[#e1ded4] bg-white p-5">
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por nombre o especie..."
          aria-label="Buscar animal"
          class="w-full rounded-lg border border-[#e1ded4] bg-[#fafaf7] px-3 py-2.5 text-sm text-[#1e211c] outline-none"
          :disabled="!conectado"
        />

        <div
          v-if="buscando"
          class="py-6 text-center text-sm text-[#63665f]"
        >
          Buscando animales...
        </div>

        <div
          v-else-if="!conectado"
          class="py-6 text-center text-sm text-[#63665f]"
        >
          Sin conexión. Podés trabajar únicamente con las fichas descargadas.
        </div>

        <div
          v-else-if="animalesFiltrados.length === 0"
          class="py-6 text-center text-sm text-[#63665f]"
        >
          No se encontraron animales.
        </div>

        <div
          v-else
          class="mt-4 overflow-hidden rounded border border-[#e1ded4]"
        >
          <div
            v-for="animal in animalesFiltrados"
            :key="animal.id"
            class="flex items-center justify-between gap-4 border-b border-[#e1ded4] px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm font-medium">
                {{ animal.nombre }}
              </p>

              <p class="mt-0.5 text-xs text-[#63665f]">
                {{ animal.especie }}
              </p>
            </div>

            <button
              class="rounded-sm bg-[#34503a] px-3 py-2 text-xs font-medium text-white transition-all hover:opacity-90"
              @click="descargarFicha(animal)"
            >
              Descargar ficha
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- FICHAS DESCARGADAS -->
    <section class="mt-9">
      <div class="mb-3.5">
        <h3 class="text-base font-medium">
          Fichas disponibles offline
        </h3>

        <p class="mt-1 text-xs text-[#63665f]">
          Estas son las fichas que el veterinario puede consultar sin internet.
        </p>
      </div>

      <div
        v-if="animalesDescargados.length === 0"
        class="rounded border border-[#e1ded4] bg-white px-5 py-8 text-center text-sm text-[#63665f]"
      >
        Todavía no hay fichas descargadas.
      </div>


<div v-else class="space-y-3">
  <article
    v-for="animal in animalesDescargados"
    :key="animal.idServidor"
    class="flex items-center justify-between gap-4 rounded border border-[#e1ded4] bg-white px-5 py-4"
  >
    <div>
      <h4 class="font-serif text-[1.2rem]">
        {{ animal.nombre }}
      </h4>

      <p class="mt-0.5 text-xs text-[#63665f]">
        {{ animal.especie }}
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="rounded-sm border border-[#e1ded4] px-3 py-2 text-xs text-[#63665f] transition-all hover:opacity-80"
        @click="seleccionarAnimal(animal)"
      >
        Abrir ficha
      </button>

      <button
        class="rounded-sm border border-[#e1ded4] px-3 py-2 text-xs text-[#63665f] transition-all hover:opacity-80"
        @click="borrarFicha(animal)"
      >
        Borrar ficha
      </button>
    </div>
  </article>
</div>


    </section>

    <!-- FICHA DEL ANIMAL -->
    <section
      v-if="animalSeleccionado"
      id="ficha-animal"
      class="mt-9"
    >
      <div class="mb-3.5 flex items-baseline justify-between">
        <div>
          <h3 class="text-base font-medium">
            Ficha del animal
          </h3>

          <p class="mt-1 text-xs text-[#63665f]">
            Información disponible para trabajar sin conexión.
          </p>
        </div>

        <button
          class="text-xs text-[#63665f] underline"
          @click="cerrarFicha"
        >
          Cerrar ficha
        </button>
      </div>

      <div class="overflow-hidden rounded border border-[#e1ded4] bg-white">

        <!-- DATOS -->
        <div class="border-b border-[#e1ded4] px-5 py-5">
          <h4 class="font-serif text-[1.3rem]">
            {{ animalSeleccionado.nombre }}
          </h4>

          <p class="mt-1 text-sm text-[#63665f]">
            {{ animalSeleccionado.especie }}
          </p>
        </div>

        <!-- HISTORIAL -->
        <div class="border-b border-[#e1ded4] px-5 py-5">
          <h4 class="text-sm font-medium">
            Historial clínico
          </h4>

          <div
            v-if="animalSeleccionado.historial.length === 0"
            class="mt-3 rounded border border-dashed border-[#e1ded4] px-4 py-6 text-center"
          >
            <p class="text-sm text-[#63665f]">
              No hay registros clínicos.
            </p>
          </div>

          <div
            v-else
            class="mt-3 space-y-3"
          >
            <div
              v-for="registro in animalSeleccionado.historial"
              :key="registro.id"
              class="rounded border border-[#e1ded4] px-4 py-3"
            >
              <p class="text-xs text-[#63665f]">
                {{ new Date(registro.fecha).toLocaleString() }}
              </p>

              <p class="mt-2 text-sm">
                {{ registro.comentario }}
              </p>
            </div>
          </div>
        </div>

        <!-- TURNOS -->
        <div class="border-b border-[#e1ded4] px-5 py-5">
          <h4 class="text-sm font-medium">
            Turnos anteriores
          </h4>

          <div
            v-if="animalSeleccionado.turnos.length === 0"
            class="mt-3 rounded border border-dashed border-[#e1ded4] px-4 py-6 text-center"
          >
            <p class="text-sm text-[#63665f]">
              No hay turnos registrados.
            </p>
          </div>

          <div
            v-else
            class="mt-3 space-y-3"
          >
            <div
              v-for="turno in animalSeleccionado.turnos"
              :key="turno.id"
              class="rounded border border-[#e1ded4] px-4 py-3"
            >
              <p class="text-xs text-[#63665f]">
                {{ new Date(turno.fecha_hora).toLocaleString() }}
              </p>

              <p class="mt-2 text-sm">
                {{ turno.motivo }}
              </p>

              <div class="mt-2 flex gap-3 text-xs text-[#63665f]">
                <span>
                  Prioridad: {{ turno.prioridad }}
                </span>

                <span>
                  Estado: {{ turno.estado }}
                </span>
              </div>
            </div>
          </div>
        </div>


<!-- OBSERVACIONES -->
<div class="border-b border-[#e1ded4] px-5 py-5">
  <h4 class="text-sm font-medium">
    Observaciones
  </h4>

  <div
    v-if="animalSeleccionado.observaciones.length === 0"
    class="mt-3 rounded border border-dashed border-[#e1ded4] px-4 py-6 text-center"
  >
    <p class="text-sm text-[#63665f]">
      No hay observaciones registradas.
    </p>
  </div>

  <div
    v-else
    class="mt-3 space-y-3"
  >
    <div
      v-for="observacion in animalSeleccionado.observaciones"
      :key="observacion.id"
      class="rounded border border-[#e1ded4] px-4 py-3"
    >
      <p class="text-xs text-[#63665f]">
        {{ new Date(observacion.fecha).toLocaleString() }}
      </p>

      <p class="mt-2 text-sm">
        {{ observacion.comentario }}
      </p>
    </div>
  </div>
</div>









        <!-- REGISTRO OFFLINE -->
        <div class="bg-[#fafaf7] px-5 py-5">
          <h4 class="text-sm font-medium">
            Registrar offline
          </h4>

          <p class="mt-1 text-xs text-[#63665f]">
            Escribí cualquier información de la atención realizada.
          </p>

          <textarea
            v-model="comentario"
            rows="4"
            placeholder="Ej: Se aplicó vacuna antirrábica. También se realizó control general y no se observaron anomalías."
            class="mt-3 w-full resize-none rounded-lg border border-[#e1ded4] bg-white px-3 py-2.5 text-sm text-[#1e211c] outline-none"
          />

          <button
            class="mt-3 rounded-sm bg-[#34503a] px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
            @click="registrarOffline"
          >
            Registrar offline
          </button>
        </div>

      </div>
    </section>

  </div>
</template>
