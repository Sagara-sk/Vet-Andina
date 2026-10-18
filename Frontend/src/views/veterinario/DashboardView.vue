<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getAuthSession } from '@/services/auth'

type Estado = 'Confirmado' | 'Por confirmar'
type TipoModal = 'reprogramar' | 'cancelar'

interface Turno {
  id: string
  hora: string
  quien: string
  que: string
  estado: Estado
  tel: string
}

const METRICAS = [
  { valor: '7', etiqueta: 'Turnos hoy' },
  { valor: '3', etiqueta: 'Pendientes de confirmar' },
  { valor: '128', etiqueta: 'Clientes activos' },
  { valor: '2', etiqueta: 'Fichas sin sincronizar' },
]

const agenda = ref<Turno[]>([
  { id: 't1', hora: '09:00', quien: 'Rocco · Marina Guzmán', que: 'Control y vacunación', estado: 'Confirmado', tel: '5492994001122' },
  { id: 't2', hora: '10:30', quien: 'Toby · Diego Farías', que: 'Consulta general', estado: 'Confirmado', tel: '5492994003344' },
  { id: 't3', hora: '11:15', quien: 'Establecimiento La Loma', que: 'Visita a campo · control de tropa', estado: 'Confirmado', tel: '5492994005566' },
  { id: 't4', hora: '14:00', quien: 'Nina · Carla Peña', que: 'Vacunación', estado: 'Confirmado', tel: '5492994007788' },
  { id: 't5', hora: '16:00', quien: 'Manchas · Marina Guzmán', que: 'Control general', estado: 'Por confirmar', tel: '5492994001122' },
])

const OFFLINE = [
  { clave: 'Última sincronización', valor: 'Hoy, 08:42 h' },
  { clave: 'Fichas disponibles sin conexión', valor: '42' },
  { clave: 'Cargas pendientes de subir', valor: '2' },
  { clave: 'Visitas a campo hoy', valor: '1 programada' },
]

const HORARIOS = [
  '09:00', '10:00', '10:30', '11:00', '11:30',
  '14:00', '15:00', '16:00', '16:30',
]

const nombreUsuario = ref('')

const saludo = computed(() => {
  const primerNombre = nombreUsuario.value.trim().split(/\s+/)[0]
  return primerNombre ? `Hola, ${primerNombre}` : 'Hola'
})

const fechaHoy = (() => {
  const texto = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})()

onMounted(async () => {
  try {
    const user = await getAuthSession()
    nombreUsuario.value = user?.nombreCompleto ?? ''
  } catch {
    // Si la sesión no responde, se muestra el saludo sin nombre.
  }
})

const modal = ref<{ turno: Turno; tipo: TipoModal } | null>(null)
const turnoModal = computed(() => modal.value?.turno ?? null)
const tipoModal = computed(() => modal.value?.tipo ?? null)

const nuevaFecha = ref('')
const nuevaHora = ref('')
const motivoCancelacion = ref('')
const notificar = ref(true)
const feedbackOk = ref('')

function abrirModal(turno: Turno, tipo: TipoModal) {
  modal.value = { turno, tipo }
  nuevaFecha.value = ''
  nuevaHora.value = ''
  motivoCancelacion.value = ''
  notificar.value = true
}

function cerrarModal() {
  modal.value = null
}

function confirmarAccion() {
  const turno = turnoModal.value
  const tipo = tipoModal.value

  if (!turno || !tipo) return

  if (tipo === 'cancelar') {
    agenda.value = agenda.value.filter((t) => t.id !== turno.id)
    feedbackOk.value = `Turno de ${turno.quien} cancelado${notificar.value ? ' · Notificación enviada' : ''}`
  } else {
    agenda.value = agenda.value.map((t) =>
      t.id === turno.id
        ? { ...t, hora: nuevaHora.value || t.hora, estado: 'Por confirmar' }
        : t
    )

    feedbackOk.value = `Turno de ${turno.quien} reprogramado${notificar.value ? ' · Notificación enviada' : ''}`
  }

  cerrarModal()

  setTimeout(() => {
    feedbackOk.value = ''
  }, 4000)
}
</script>

<template>
  <div class="min-h-screen bg-[#fafaf7] text-[#1e211c] font-sans">

    <!-- CABECERA -->
    <div class="flex items-start justify-between gap-6">
      <div>
        <h1 class="font-serif text-[1.6rem]">
          {{ saludo }}
        </h1>

        <p class="mt-1.5 text-base text-[#63665f]">
          {{ fechaHoy }}
        </p>

        <input
          type="text"
          placeholder="Buscar cliente o mascota"
          aria-label="Buscar cliente o mascota"
          class="mt-3.5 w-[260px] max-w-full rounded-sm border border-[#e1ded4] bg-white px-3 py-2.5 text-sm text-[#1e211c] outline-none"
        />
      </div>

      <div class="flex items-center gap-2 whitespace-nowrap text-xs text-[#1f3323]">
        <span class="h-[7px] w-[7px] rounded-full bg-[#34503a]" />
        Conectado · datos sincronizados
      </div>
    </div>

    <!-- MÉTRICAS -->
    <div class="mt-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <div
        v-for="metrica in METRICAS"
        :key="metrica.etiqueta"
        class="rounded border border-[#e1ded4] bg-white p-5"
      >
        <p class="font-serif text-[1.7rem]">
          {{ metrica.valor }}
        </p>

        <p class="mt-1 text-xs text-[#63665f]">
          {{ metrica.etiqueta }}
        </p>
      </div>
    </div>

    <!-- AGENDA + OFFLINE -->
    <div class="mt-9 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.6fr_1fr]">

      <!-- AGENDA -->
      <section>
        <div class="mb-3.5 flex items-baseline justify-between">
          <h3 class="text-base font-medium">
            Agenda de hoy
          </h3>

          <span class="text-xs text-[#63665f]">
            Ver agenda completa
          </span>
        </div>

        <div
          v-if="feedbackOk"
          class="mb-3 flex items-center gap-2 rounded-lg bg-[#e7eee3] px-4 py-3 text-sm text-[#1f3323]"
        >
          ✅ {{ feedbackOk }}
        </div>

        <div class="overflow-hidden rounded border border-[#e1ded4] bg-white">
          <div
            v-for="(turno, index) in agenda"
            :key="turno.id"
            class="flex items-center gap-4 px-5 py-4"
            :class="index < agenda.length - 1 ? 'border-b border-[#e1ded4]' : ''"
          >
            <span class="w-14 shrink-0 text-sm text-[#63665f]">
              {{ turno.hora }}
            </span>

            <div class="flex-1">
              <p class="text-sm font-medium">
                {{ turno.quien }}
              </p>

              <p class="mt-0.5 text-xs text-[#63665f]">
                {{ turno.que }}
              </p>
            </div>

            <span
              class="inline-block shrink-0 rounded-full px-2.5 py-1 text-xs"
              :class="
                turno.estado === 'Confirmado'
                  ? 'bg-[#e7eee3] text-[#1f3323]'
                  : 'bg-[#f3eee2] text-[#7a5b1f]'
              "
            >
              {{ turno.estado }}
            </span>

            <div class="flex shrink-0 gap-1.5">
              <button
                class="rounded-md border border-[#e1ded4] px-2.5 py-1 text-xs text-[#63665f] transition-all hover:opacity-80"
                @click="abrirModal(turno, 'reprogramar')"
              >
                Reprogramar
              </button>

              <button
                class="rounded-md border border-[#f5c6c6] bg-[#fde8e8] px-2.5 py-1 text-xs text-[#7a1f1f] transition-all hover:opacity-80"
                @click="abrirModal(turno, 'cancelar')"
              >
                Cancelar
              </button>
            </div>
          </div>

          <p
            v-if="agenda.length === 0"
            class="px-5 py-6 text-center text-sm text-[#63665f]"
          >
            Sin turnos para hoy.
          </p>
        </div>
      </section>

      <!-- MODO OFFLINE -->
      <section>
        <div class="mb-3.5 flex items-baseline justify-between">
          <h3 class="text-base font-medium">
            Modo offline
          </h3>

          <RouterLink :to="{ name: 'vet-offline' }" class="text-xs text-[#63665f] hover:underline">
            Ver detalle
          </RouterLink>
        </div>

        <div class="rounded border border-[#e1ded4] bg-white p-5">
          <div class="mb-3.5 flex items-center gap-2">
            <span class="h-[7px] w-[7px] rounded-full bg-[#34503a]" />

            <p class="text-sm font-medium">
              Todo sincronizado
            </p>
          </div>

          <div
            v-for="(fila, index) in OFFLINE"
            :key="fila.clave"
            class="flex justify-between gap-4 py-2.5 text-sm"
            :class="index > 0 ? 'border-t border-[#e1ded4]' : ''"
          >
            <span class="text-[#63665f]">
              {{ fila.clave }}
            </span>

            <span>
              {{ fila.valor }}
            </span>
          </div>

          <button
            class="mt-4 w-full rounded-sm bg-[#34503a] py-2.5 text-sm font-medium text-white"
          >
            Sincronizar ahora
          </button>
        </div>
      </section>
    </div>

    <!-- MODAL -->
    <div
      v-if="turnoModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      @click.self="cerrarModal"
    >
      <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

        <!-- CABECERA MODAL -->
        <div class="flex items-start justify-between border-b border-[#e1ded4] px-6 py-5">
          <div>
            <h3 class="font-serif text-[1.2rem]">
              {{ tipoModal === 'reprogramar' ? 'Reprogramar turno' : 'Cancelar turno' }}
            </h3>

            <p class="mt-1 text-sm text-[#63665f]">
              {{ turnoModal.quien }}
            </p>

            <p class="mt-0.5 text-xs text-[#63665f]">
              {{ turnoModal.hora }} · {{ turnoModal.que }}
            </p>
          </div>

          <button
            class="text-xl text-[#63665f] transition-opacity hover:opacity-60"
            @click="cerrarModal"
          >
            ✕
          </button>
        </div>

        <!-- CONTENIDO MODAL -->
        <div class="space-y-4 px-6 py-5">

          <!-- WHATSAPP -->
          <a
            :href="`https://wa.me/${turnoModal.tel}?text=${encodeURIComponent(`Hola, te contactamos desde Vet Andina respecto a tu turno del día de hoy (${turnoModal.hora}).`)}`"
            target="_blank"
            rel="noreferrer"
            class="flex items-center gap-3 rounded-xl bg-[#25d366] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <span class="text-lg">💬</span>
            Contactar por WhatsApp antes de aplicar el cambio
          </a>

          <!-- REPROGRAMAR -->
          <div v-if="tipoModal === 'reprogramar'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-[#63665f]">
                Nueva fecha
              </label>

              <input
                v-model="nuevaFecha"
                type="date"
                class="w-full rounded-lg border border-[#e1ded4] bg-[#fafaf7] px-3 py-2.5 text-sm text-[#1e211c] outline-none"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-semibold text-[#63665f]">
                Nuevo horario
              </label>

              <select
                v-model="nuevaHora"
                class="w-full rounded-lg border border-[#e1ded4] bg-[#fafaf7] px-3 py-2.5 text-sm text-[#1e211c] outline-none"
              >
                <option value="">Seleccionar</option>

                <option
                  v-for="hora in HORARIOS"
                  :key="hora"
                  :value="hora"
                >
                  {{ hora }}
                </option>
              </select>
            </div>
          </div>

          <!-- CANCELAR -->
          <div v-else>
            <label class="mb-1.5 block text-xs font-semibold text-[#63665f]">
              Motivo de cancelación
            </label>

            <textarea
              v-model="motivoCancelacion"
              rows="3"
              placeholder="Ej: Veterinario no disponible, emergencia, solicitud del tutor..."
              class="w-full resize-none rounded-lg border border-[#e1ded4] bg-[#fafaf7] px-3 py-2.5 text-sm text-[#1e211c] outline-none"
            />
          </div>

          <!-- NOTIFICACIÓN -->
          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e1ded4] bg-[#fafaf7] px-4 py-3">
            <input
              v-model="notificar"
              type="checkbox"
              class="h-4 w-4 rounded accent-[#34503a]"
            />

            <div>
              <p class="text-sm font-medium">
                Notificar al tutor
              </p>

              <p class="mt-0.5 text-xs text-[#63665f]">
                Enviar correo electrónico y notificación push
              </p>
            </div>
          </label>
        </div>

        <!-- BOTONES -->
        <div class="flex gap-3 border-t border-[#e1ded4] px-6 py-4">
          <button
            class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            :class="tipoModal === 'cancelar' ? 'bg-[#c0392b]' : 'bg-[#34503a]'"
            @click="confirmarAccion"
          >
            {{ tipoModal === 'reprogramar' ? 'Confirmar reprogramación' : 'Confirmar cancelación' }}
          </button>

          <button
            class="rounded-xl border border-[#e1ded4] px-5 py-2.5 text-sm text-[#63665f] transition-all hover:opacity-80"
            @click="cerrarModal"
          >
            Volver
          </button>
        </div>
      </div>
    </div>

  </div>
</template>