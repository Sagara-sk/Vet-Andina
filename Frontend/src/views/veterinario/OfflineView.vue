<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import {
  obtenerAnimales,
  guardarCambioPendiente,
  obtenerCambiosPendientes,
  eliminarAnimal,
  obtenerFichasOffline,
  obtenerBorradoresFicha,
    guardarFichaOffline,
     eliminarBorradorFicha,
} from '../../services/indexedDB'
import {
  searchAnimals,
  getMedicalRecord,
  addClinicalEntry,
  type AnimalSearchResult,
} from '@/services/fichas'
import type { AnimalLocal, BorradorFichaLocal, FichaCacheLocal } from '../../services/indexedDB'

const conectado = ref(navigator.onLine)
const mensaje = ref('')
const errorOffline = ref('')
const session = useSessionStore()

const animalesDescargados = ref<AnimalLocal[]>([])
const fichasCacheadas = ref<FichaCacheLocal[]>([])
const borradoresFicha = ref<BorradorFichaLocal[]>([])
const animalSeleccionado = ref<AnimalLocal | null>(null)
  const animalesDisponibles = ref<AnimalSearchResult[]>([])
const animalesSeleccionados = ref<string[]>([])
const descargando = ref(false)
const busqueda = ref('')

const comentario = ref('')
const enviandoBorradorId = ref<string | null>(null)
const cambiosPendientes = ref(0)

async function cargarAnimalesOffline() {
  try {
    animalesDescargados.value = await obtenerAnimales()
  } catch (error) {
    console.error('Error al cargar fichas offline:', error)
    errorOffline.value =
      error instanceof Error ? error.message : 'No se pudieron leer las fichas locales.'
  }
}

async function cargarFichasEspecializadas() {
  if (!session.user) return

  try {
    fichasCacheadas.value = await obtenerFichasOffline(session.user.id)
    borradoresFicha.value = await obtenerBorradoresFicha(session.user.id)
  } catch (error) {
    console.error('Error al cargar las fichas especializadas offline:', error)
    errorOffline.value =
      error instanceof Error
        ? error.message
        : 'No se pudieron leer las fichas especializadas locales.'
  }
}

async function enviarBorrador(draft: BorradorFichaLocal) {
  if (!navigator.onLine) {
    errorOffline.value = 'Necesitás conexión para enviar el borrador.'
    return
  }

  if (!session.user?.id || session.user.id !== draft.userId) {
    errorOffline.value = 'El usuario actual no coincide con el autor del borrador.'
    return
  }

  enviandoBorradorId.value = draft.id
  errorOffline.value = ''
  mensaje.value = ''

  try {
    await addClinicalEntry(draft.animalId, draft.payload)
    await eliminarBorradorFicha(draft.id)
    await cargarFichasEspecializadas()

    mensaje.value = 'La evolución clínica se registró correctamente en el servidor.'
  } catch (error) {
    errorOffline.value =
      error instanceof Error
        ? error.message
        : 'No se pudo enviar el borrador. Se conservó localmente.'
  } finally {
    enviandoBorradorId.value = null
  }
}




async function buscarAnimalesDisponibles() {
  if (!conectado.value) {
    errorOffline.value = 'Necesitás conexión a internet para buscar animales.'
    return
  }

  try {
    errorOffline.value = ''
    animalesDisponibles.value = await searchAnimals(busqueda.value.trim())
  } catch (error) {
    console.error('Error al buscar animales disponibles:', error)
    errorOffline.value =
      error instanceof Error ? error.message : 'No se pudieron consultar los animales.'
  }
}

async function descargarFichasSeleccionadas() {
  const userId = session.user?.id

  if (!userId) {
    errorOffline.value = 'No se pudo identificar al usuario de la sesión.'
    return
  }

  if (!conectado.value) {
    errorOffline.value = 'Necesitás conexión a internet para descargar fichas.'
    return
  }

  if (animalesSeleccionados.value.length === 0) {
    errorOffline.value = 'Seleccioná al menos un animal.'
    return
  }

  descargando.value = true
  errorOffline.value = ''
  mensaje.value = ''

  let descargadas = 0
  const errores: string[] = []

  try {
    if (navigator.onLine && navigator.serviceWorker?.controller) {
      try {
        await import('@/views/admin/FichaView.vue')
      } catch (error) {
        console.error('No se pudo precargar la vista de ficha médica:', error)
      }
    }

    for (const animalId of animalesSeleccionados.value) {
      try {
        const ficha = await getMedicalRecord(animalId)
        await guardarFichaOffline(userId, ficha)
        descargadas++
      } catch (error) {
        console.error(`Error al descargar la ficha ${animalId}:`, error)
        errores.push(animalId)
      }
    }

    await cargarFichasEspecializadas()

    if (errores.length > 0) {
      errorOffline.value =
        `Se descargaron ${descargadas} fichas. No se pudieron descargar ${errores.length}: ${errores.join(', ')}.`
    } else {
      mensaje.value = `Se descargaron correctamente ${descargadas} fichas médicas.`
    }

    animalesSeleccionados.value = []
  } finally {
    descargando.value = false
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

async function actualizarTodo() {
  errorOffline.value = ''
  await cargarAnimalesOffline()
  await cargarFichasEspecializadas()
  await cargarCambiosPendientes()
}

function actualizarConexion() {
  conectado.value = navigator.onLine
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
        tipo: 'observacion' as const,
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
  <div class="min-h-screen bg-brand-bg text-brand-ink">
    <!-- CABECERA -->
    <div class="flex items-start justify-between gap-6">
      <div>
        <h1 class="font-serif text-[1.6rem]">Modo offline</h1>

        <p class="mt-1.5 text-base text-brand-inkSoft">
          Fichas cacheadas por usuario y borradores locales del dispositivo.
        </p>
      </div>

      <!-- ESTADO DE CONEXIÓN -->
      <div
        class="flex items-center gap-2 whitespace-nowrap text-xs"
        :class="conectado ? 'text-brand-accentInk' : 'text-brand-warnInk'"
      >
        <span
          class="h-[7px] w-[7px] rounded-full"
          :class="conectado ? 'bg-brand-accent' : 'bg-brand-warn'"
        />

        {{ conectado ? 'Conectado' : 'Desconectado' }}
      </div>
    </div>

    <div
      class="mt-6 rounded border border-brand-warnLine bg-brand-warnSoft px-4 py-3 text-sm text-brand-warnInk"
      role="alert"
    >
      Las copias especializadas se guardan desde su ficha y se vinculan a tu sesión. Los borradores
      todavía no se sincronizan automáticamente ni integran la historia oficial: revisalos y
      cargalos en el servidor cuando haya conexión. Las fichas antiguas de este prototipo no
      verifican su origen ni vigencia.
    </div>

    <p
      v-if="errorOffline"
      class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ errorOffline }}
    </p>
<!-- DESCARGAR FICHAS DEL SERVIDOR -->
<section class="mt-8 rounded border border-brand-line bg-brand-surface p-5">
  <div>
    <h3 class="text-base font-medium">Descargar fichas médicas</h3>
    <p class="mt-1 text-xs text-brand-inkSoft">
      Buscá animales y descargá sus fichas para consultarlas sin conexión.
    </p>
  </div>

  <div class="mt-4 flex flex-wrap gap-2">
    <input
      v-model="busqueda"
      type="search"
      placeholder="Buscar por nombre o especie"
      class="min-w-0 flex-1 rounded border border-brand-line bg-brand-bg px-3 py-2 text-sm"
      @keyup.enter="buscarAnimalesDisponibles"
    />

    <button
      class="rounded bg-brand-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      :disabled="!conectado"
      @click="buscarAnimalesDisponibles"
    >
      Buscar
    </button>
  </div>

  <div v-if="animalesDisponibles.length" class="mt-4 space-y-2">
    <label
      v-for="animal in animalesDisponibles"
      :key="animal.id"
      class="flex items-center gap-3 rounded border border-brand-line px-3 py-3 text-sm"
    >
      <input
        v-model="animalesSeleccionados"
        type="checkbox"
        :value="animal.id"
      />

      <span class="flex-1">
        <span class="block font-medium">{{ animal.name }}</span>
        <span class="text-xs text-brand-inkSoft">
          {{ animal.species }} · Responsable: {{ animal.tutorName }}
        </span>
      </span>

      <span
        v-if="fichasCacheadas.some((ficha) => ficha.animalId === animal.id)"
        class="text-xs text-brand-accentInk"
      >
        Descargada
      </span>
    </label>

    <button
      class="mt-3 rounded bg-brand-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      :disabled="!conectado || descargando || animalesSeleccionados.length === 0"
      @click="descargarFichasSeleccionadas"
    >
      {{ descargando ? 'Descargando...' : `Descargar seleccionadas (${animalesSeleccionados.length})` }}
    </button>
  </div>

  <p
    v-else
    class="mt-4 text-sm text-brand-inkSoft"
  >
    Buscá animales para seleccionar las fichas que necesitás.
  </p>
</section>
    <!-- RESUMEN -->
    <div class="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <div class="rounded border border-brand-line bg-brand-surface p-5">
        <p class="font-serif text-[1.7rem]">
          {{ fichasCacheadas.length }}
        </p>

        <p class="mt-1 text-xs text-brand-inkSoft">Fichas disponibles offline</p>
      </div>

      <div class="rounded border border-brand-line bg-brand-surface p-5">
        <p class="font-serif text-[1.7rem]">
          {{ borradoresFicha.length }}
        </p>

        <p class="mt-1 text-xs text-brand-inkSoft">Borradores clínicos por revisar</p>
      </div>

      <div class="rounded border border-brand-line bg-brand-surface p-5">
        <p class="text-xs text-brand-inkSoft">
          Los datos locales pueden quedar desactualizados. Confirmá la versión del servidor al
          recuperar conexión.
        </p>
        <p class="mt-2 text-xs text-brand-inkSoft">
          Cambios del prototipo anterior sin sincronizar: {{ cambiosPendientes }}
        </p>
      </div>
    </div>

    <section class="mt-8">
      <div>
        <h3 class="text-base font-medium">Fichas clínicas cacheadas</h3>
        <p class="mt-1 text-xs text-brand-inkSoft">
          Copias obtenidas desde la ficha oficial. Se muestran solo para la cuenta activa.
        </p>
      </div>

      <p
        v-if="!fichasCacheadas.length"
        class="mt-3 border border-brand-line bg-brand-surface px-5 py-6 text-sm text-brand-inkSoft"
      >
        Todavía no guardaste fichas especializadas para uso offline.
      </p>

      <div v-else class="mt-3 space-y-3">
        <article
          v-for="cached in fichasCacheadas"
          :key="cached.key"
          class="flex flex-wrap items-center justify-between gap-4 border border-brand-line bg-brand-surface px-5 py-4"
        >
          <div>
            <h4 class="text-sm font-medium text-brand-ink">
              {{ cached.ficha.animal.name }}
              <span class="text-brand-inkSoft">
                · {{ cached.ficha.animal.careType === 'RURAL' ? 'Lote rural' : 'Mascota' }}
              </span>
            </h4>
            <p class="mt-1 text-xs text-brand-inkSoft">
              {{ cached.ficha.animal.species }}
              <span v-if="cached.ficha.animal.careType === 'RURAL'">
                · {{ cached.ficha.animal.herdSize }} cabezas
              </span>
              · Copia del {{ new Date(cached.descargadaEn).toLocaleString('es-AR') }}
            </p>
          </div>
          <RouterLink
            :to="{
              name: session.user?.rol === 'VETERINARIO' ? 'vet-ficha' : 'admin-ficha',
              params: { id: cached.animalId },
            }"
            class="text-sm text-brand-accentInk underline underline-offset-2"
          >
            Abrir ficha
          </RouterLink>
        </article>
      </div>
    </section>

    <section class="mt-8">
      <div>
        <h3 class="text-base font-medium">Borradores clínicos pendientes</h3>
        <p class="mt-1 text-xs text-brand-inkSoft">
          Cada borrador conserva autor y horario local; requiere revisión antes de registrarse en el
          servidor.
        </p>
      </div>
      <p
        v-if="!borradoresFicha.length"
        class="mt-3 border border-brand-line bg-brand-surface px-5 py-6 text-sm text-brand-inkSoft"
      >
        No hay borradores clínicos pendientes.
      </p>
      <ul v-else class="mt-3 space-y-3">
     <li
  v-for="draft in borradoresFicha"
  :key="draft.id"
  class="border border-brand-warnLine bg-brand-warnSoft px-5 py-4"
>
  <p class="text-sm font-medium text-brand-ink">
    {{ draft.payload.tipoRegistro }} · {{ draft.payload.motivoConsulta }}
  </p>

  <p class="mt-1 text-xs text-brand-warnInk">
    {{ draft.authorName }} · {{ new Date(draft.queuedAt).toLocaleString('es-AR') }}
  </p>

  <button
    type="button"
    :disabled="!conectado || enviandoBorradorId === draft.id"
    class="mt-3 rounded-md bg-brand-ink hover:opacity-90 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
    @click="enviarBorrador(draft)"
  >
    {{ enviandoBorradorId === draft.id ? 'Enviando...' : 'Enviar al servidor' }}
  </button>
</li>
      </ul>
    </section>

    <!-- MENSAJE -->
    <div
      v-if="mensaje"
      class="mt-6 rounded-lg bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk"
    >
      {{ mensaje }}
    </div>

    <!-- FICHAS DESCARGADAS -->
    <section class="mt-9">
      <div class="mb-3.5">
        <h3 class="text-base font-medium">Fichas disponibles offline</h3>

        <p class="mt-1 text-xs text-brand-inkSoft">
          Fichas que ya estaban guardadas en el almacenamiento local de este navegador.
        </p>
      </div>

      <div
        v-if="animalesDescargados.length === 0"
        class="rounded border border-brand-line bg-brand-surface px-5 py-8 text-center text-sm text-brand-inkSoft"
      >
        Todavía no hay fichas guardadas localmente.
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="animal in animalesDescargados"
          :key="animal.idServidor"
          class="flex items-center justify-between gap-4 rounded border border-brand-line bg-brand-surface px-5 py-4"
        >
          <div>
            <h4 class="font-serif text-[1.2rem]">
              {{ animal.nombre }}
            </h4>

            <p class="mt-0.5 text-xs text-brand-inkSoft">
              {{ animal.especie }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="rounded-sm border border-brand-line px-3 py-2 text-xs text-brand-inkSoft transition-all hover:opacity-80"
              @click="seleccionarAnimal(animal)"
            >
              Abrir ficha
            </button>

            <button
              class="rounded-sm border border-brand-line px-3 py-2 text-xs text-brand-inkSoft transition-all hover:opacity-80"
              @click="borrarFicha(animal)"
            >
              Borrar ficha
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- FICHA DEL ANIMAL -->
    <section v-if="animalSeleccionado" id="ficha-animal" class="mt-9">
      <div class="mb-3.5 flex items-baseline justify-between">
        <div>
          <h3 class="text-base font-medium">Ficha del animal</h3>

          <p class="mt-1 text-xs text-brand-inkSoft">
            Información disponible para trabajar sin conexión.
          </p>
        </div>

        <button class="text-xs text-brand-inkSoft underline" @click="cerrarFicha">
          Cerrar ficha
        </button>
      </div>

      <div class="overflow-hidden rounded border border-brand-line bg-brand-surface">
        <!-- DATOS -->
        <div class="border-b border-brand-line px-5 py-5">
          <h4 class="font-serif text-[1.3rem]">
            {{ animalSeleccionado.nombre }}
          </h4>

          <p class="mt-1 text-sm text-brand-inkSoft">
            {{ animalSeleccionado.especie }}
          </p>
        </div>

        <!-- HISTORIAL -->
        <div class="border-b border-brand-line px-5 py-5">
          <h4 class="text-sm font-medium">Historial clínico</h4>

          <div
            v-if="animalSeleccionado.historial.length === 0"
            class="mt-3 rounded border border-dashed border-brand-line px-4 py-6 text-center"
          >
            <p class="text-sm text-brand-inkSoft">No hay registros clínicos.</p>
          </div>

          <div v-else class="mt-3 space-y-3">
            <div
              v-for="registro in animalSeleccionado.historial"
              :key="registro.id"
              class="rounded border border-brand-line px-4 py-3"
            >
              <p class="text-xs text-brand-inkSoft">
                {{ new Date(registro.fecha).toLocaleString() }}
              </p>

              <p class="mt-2 text-sm">
                {{ registro.comentario }}
              </p>
            </div>
          </div>
        </div>

        <!-- TURNOS -->
        <div class="border-b border-brand-line px-5 py-5">
          <h4 class="text-sm font-medium">Turnos anteriores</h4>

          <div
            v-if="animalSeleccionado.turnos.length === 0"
            class="mt-3 rounded border border-dashed border-brand-line px-4 py-6 text-center"
          >
            <p class="text-sm text-brand-inkSoft">No hay turnos registrados.</p>
          </div>

          <div v-else class="mt-3 space-y-3">
            <div
              v-for="turno in animalSeleccionado.turnos"
              :key="turno.id"
              class="rounded border border-brand-line px-4 py-3"
            >
              <p class="text-xs text-brand-inkSoft">
                {{ new Date(turno.fecha_hora).toLocaleString() }}
              </p>

              <p class="mt-2 text-sm">
                {{ turno.motivo }}
              </p>

              <div class="mt-2 flex gap-3 text-xs text-brand-inkSoft">
                <span> Prioridad: {{ turno.prioridad }} </span>

                <span> Estado: {{ turno.estado }} </span>
              </div>
            </div>
          </div>
        </div>

        <!-- OBSERVACIONES -->
        <div class="border-b border-brand-line px-5 py-5">
          <h4 class="text-sm font-medium">Observaciones</h4>

          <div
            v-if="animalSeleccionado.observaciones.length === 0"
            class="mt-3 rounded border border-dashed border-brand-line px-4 py-6 text-center"
          >
            <p class="text-sm text-brand-inkSoft">No hay observaciones registradas.</p>
          </div>

          <div v-else class="mt-3 space-y-3">
            <div
              v-for="observacion in animalSeleccionado.observaciones"
              :key="observacion.id"
              class="rounded border border-brand-line px-4 py-3"
            >
              <p class="text-xs text-brand-inkSoft">
                {{ new Date(observacion.fecha).toLocaleString() }}
              </p>

              <p class="mt-2 text-sm">
                {{ observacion.comentario }}
              </p>
            </div>
          </div>
        </div>

        <!-- REGISTRO OFFLINE -->
        <div class="bg-brand-bg px-5 py-5">
          <h4 class="text-sm font-medium">Registro local de demostración</h4>

          <p class="mt-1 text-xs text-brand-inkSoft">
            Borrador solo local, sin atribución profesional ni sincronización. No ingreses datos
            clínicos reales.
          </p>

          <textarea
            v-model="comentario"
            rows="4"
            placeholder="Texto de prueba (no ingresar información clínica real)"
            class="mt-3 w-full resize-none rounded-lg border border-brand-line bg-brand-surface px-3 py-2.5 text-sm text-brand-ink outline-none"
          />

          <button
            class="mt-3 rounded-sm bg-brand-accent px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
            @click="registrarOffline"
          >
            Guardar borrador de prueba
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
