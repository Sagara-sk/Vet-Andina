<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import {
  obtenerAnimales,
  guardarCambioPendiente,
  obtenerCambiosPendientes,
  eliminarAnimal,
} from '../../services/indexedDB'
import type { AnimalLocal } from '../../services/indexedDB'

const conectado = ref(navigator.onLine)
const mensaje = ref('')

const animalesDescargados = ref<AnimalLocal[]>([])
const animalSeleccionado = ref<AnimalLocal | null>(null)

const comentario = ref('')
const cambiosPendientes = ref(0)

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

async function actualizarTodo() {
  await cargarAnimalesOffline()
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
        <h1 class="font-serif text-[1.6rem]">
          Modo offline
        </h1>

        <p class="mt-1.5 text-base text-brand-inkSoft">
          Prototipo local: no está conectado a la API clínica.
        </p>
      </div>

      <!-- ESTADO DE CONEXIÓN -->
      <div
        class="flex items-center gap-2 whitespace-nowrap text-xs"
        :class="conectado ? 'text-brand-accentInk' : 'text-brand-warnInk'"
      >
        <span
          class="h-[7px] w-[7px] rounded-full"
          :class="conectado ? 'bg-brand-accent' : 'bg-[#c49a3a]'"
        />

        {{ conectado ? 'Conectado' : 'Desconectado' }}
      </div>
    </div>

    <div
      class="mt-6 rounded border border-brand-warnLine bg-brand-warnSoft px-4 py-3 text-sm text-brand-warnInk"
      role="alert"
    >
      Esta pantalla no descarga fichas ni sincroniza cambios con el servidor. No la uses para
      registrar información clínica real. Las fichas y borradores que ya estaban guardados se
      conservan en este navegador, pero su origen y vigencia no se verifican aquí.
    </div>

    <!-- RESUMEN -->
    <div class="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <div class="rounded border border-brand-line bg-brand-surface p-5">
        <p class="font-serif text-[1.7rem]">
          {{ animalesDescargados.length }}
        </p>

        <p class="mt-1 text-xs text-brand-inkSoft">
          Fichas disponibles offline
        </p>
      </div>

      <div class="rounded border border-brand-line bg-brand-surface p-5">
        <p class="font-serif text-[1.7rem]">
          {{ cambiosPendientes }}
        </p>

        <p class="mt-1 text-xs text-brand-inkSoft">
          Cambios pendientes
        </p>
      </div>

      <div class="rounded border border-brand-line bg-brand-surface p-5">
        <p class="text-xs text-brand-inkSoft">
          La sincronización queda deshabilitada hasta que la API implemente un contrato compatible.
        </p>
      </div>
    </div>

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
        <h3 class="text-base font-medium">
          Fichas disponibles offline
        </h3>

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

          <p class="mt-1 text-xs text-brand-inkSoft">
            Información disponible para trabajar sin conexión.
          </p>
        </div>

        <button
          class="text-xs text-brand-inkSoft underline"
          @click="cerrarFicha"
        >
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
          <h4 class="text-sm font-medium">
            Historial clínico
          </h4>

          <div
            v-if="animalSeleccionado.historial.length === 0"
            class="mt-3 rounded border border-dashed border-brand-line px-4 py-6 text-center"
          >
            <p class="text-sm text-brand-inkSoft">
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
          <h4 class="text-sm font-medium">
            Turnos anteriores
          </h4>

          <div
            v-if="animalSeleccionado.turnos.length === 0"
            class="mt-3 rounded border border-dashed border-brand-line px-4 py-6 text-center"
          >
            <p class="text-sm text-brand-inkSoft">
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
              class="rounded border border-brand-line px-4 py-3"
            >
              <p class="text-xs text-brand-inkSoft">
                {{ new Date(turno.fecha_hora).toLocaleString() }}
              </p>

              <p class="mt-2 text-sm">
                {{ turno.motivo }}
              </p>

              <div class="mt-2 flex gap-3 text-xs text-brand-inkSoft">
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
<div class="border-b border-brand-line px-5 py-5">
  <h4 class="text-sm font-medium">
    Observaciones
  </h4>

  <div
    v-if="animalSeleccionado.observaciones.length === 0"
    class="mt-3 rounded border border-dashed border-brand-line px-4 py-6 text-center"
  >
    <p class="text-sm text-brand-inkSoft">
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
          <h4 class="text-sm font-medium">
            Registro local de demostración
          </h4>

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
