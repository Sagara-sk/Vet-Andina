<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { listMisAnimales, type AnimalPropio } from '@/services/animales'
import { listMisEstablecimientos, type EstablecimientoPropio } from '@/services/establecimientos'
import { listMisTurnos } from '@/services/reservas'
import type { TipoAtencion } from '@/services/auth'
import type { EstadoTurno, Turno } from '@/services/turnos'

const props = defineProps<{ tipoAtencion: TipoAtencion | null }>()

const animales = ref<AnimalPropio[]>([])
const establecimientos = ref<EstablecimientoPropio[]>([])
const turnos = ref<Turno[]>([])
const loadingAnimales = ref(true)
const loadingTurnos = ref(true)
const loadingEstablecimientos = ref(false)
const errorAnimales = ref('')
const errorTurnos = ref('')
const errorEstablecimientos = ref('')
const esRural = computed(() => props.tipoAtencion === 'RURAL')
const mascotas = computed(() => animales.value.filter((animal) => animal.modality === 'URBANO'))
const hayDatosPendientes = computed(
  () =>
    loadingAnimales.value ||
    loadingTurnos.value ||
    (esRural.value && loadingEstablecimientos.value),
)
const estadosActivos: EstadoTurno[] = ['PENDIENTE', 'PENDIENTE_PAGO', 'CONFIRMADO', 'REPROGRAMADO']
const proximoTurno = computed(
  () =>
    turnos.value
      .filter(
        (turno) =>
          estadosActivos.includes(turno.status) && new Date(turno.dateTime).getTime() > Date.now(),
      )
      .sort(
        (primero, segundo) =>
          new Date(primero.dateTime).getTime() - new Date(segundo.dateTime).getTime(),
      )[0],
)

const fechaHora = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})
const fecha = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeZone: 'America/Argentina/Buenos_Aires',
})

function conTiempoLimite<T>(solicitud: Promise<T>, recurso: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error(
            `No pudimos cargar ${recurso} a tiempo. Revisá la conexión e intentá nuevamente.`,
          ),
        ),
      12_000,
    )
  })

  return Promise.race([solicitud, timeout]).finally(() => clearTimeout(timeoutId))
}

async function cargarAnimales() {
  loadingAnimales.value = true
  errorAnimales.value = ''
  try {
    animales.value = await conTiempoLimite(listMisAnimales(), 'tus animales')
  } catch (cause) {
    errorAnimales.value =
      cause instanceof Error ? cause.message : 'No fue posible obtener tus animales.'
  } finally {
    loadingAnimales.value = false
  }
}

async function cargarTurnos() {
  loadingTurnos.value = true
  errorTurnos.value = ''
  try {
    turnos.value = await conTiempoLimite(listMisTurnos(), 'tus turnos')
  } catch (cause) {
    errorTurnos.value =
      cause instanceof Error ? cause.message : 'No fue posible obtener tus turnos.'
  } finally {
    loadingTurnos.value = false
  }
}

async function cargarEstablecimientos() {
  if (!esRural.value) return

  loadingEstablecimientos.value = true
  errorEstablecimientos.value = ''
  try {
    establecimientos.value = await conTiempoLimite(
      listMisEstablecimientos(),
      'tus establecimientos',
    )
  } catch (cause) {
    errorEstablecimientos.value =
      cause instanceof Error ? cause.message : 'No fue posible obtener tus establecimientos.'
  } finally {
    loadingEstablecimientos.value = false
  }
}

function cargar() {
  void Promise.all([cargarAnimales(), cargarTurnos(), cargarEstablecimientos()])
}

function formatearFechaNacimiento(value: string): string | null {
  const datePart = value.slice(0, 10)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ? new Date(`${datePart}T12:00:00-03:00`)
    : new Date(value)

  return Number.isNaN(date.getTime()) ? null : fecha.format(date)
}

function fichaRoute(animal: AnimalPropio) {
  return animal.modality === 'RURAL'
    ? { name: 'panel-lote-ficha', params: { id: animal.id } }
    : { name: 'panel-mascota-ficha', params: { id: animal.id } }
}

onMounted(cargar)
</script>

<template>
  <div class="mt-8 space-y-9">
    <p v-if="hayDatosPendientes" class="text-sm text-brand-inkSoft" role="status">
      Actualizando la información de tu cuenta...
    </p>

    <section
      v-if="proximoTurno"
      class="flex flex-wrap items-center justify-between gap-5 rounded-lg border border-brand-line bg-brand-surface p-5"
    >
      <div>
        <p class="text-xs text-brand-inkSoft">Próximo turno</p>
        <h2 class="mt-1 text-lg font-semibold text-brand-ink">
          {{ proximoTurno.animal.name }} ·
          {{ proximoTurno.modality === 'RURAL' ? 'Visita rural' : 'Consultorio' }}
        </h2>
        <p class="mt-2 text-sm text-brand-inkSoft">
          {{ fechaHora.format(new Date(proximoTurno.dateTime)) }}
          <span v-if="proximoTurno.vet"> · {{ proximoTurno.vet.fullName }}</span>
        </p>
      </div>
      <RouterLink :to="{ name: 'panel-turnos' }" class="btn-outline">Ver mis turnos</RouterLink>
    </section>
    <section
      v-else-if="loadingTurnos"
      class="rounded-lg border border-brand-line bg-brand-surface p-5 text-sm text-brand-inkSoft"
      role="status"
    >
      Cargando tus turnos...
    </section>
    <section
      v-else-if="errorTurnos"
      class="rounded-lg border border-brand-dangerLine bg-brand-dangerSoft p-5 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ errorTurnos }}
      <button type="button" class="ml-2 underline" @click="cargarTurnos">Reintentar</button>
    </section>
    <section v-else class="rounded-lg border border-brand-line bg-brand-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-brand-inkSoft">No tenés próximos turnos.</p>
        <RouterLink :to="{ name: 'panel-reservar' }" class="btn-outline">Reservar turno</RouterLink>
      </div>
    </section>

    <template v-if="esRural">
      <section v-if="mascotas.length || loadingAnimales || errorAnimales">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-brand-ink">Tus mascotas</h2>
            <p class="mt-1 text-sm text-brand-inkSoft">
              Mascotas urbanas registradas en tu cuenta.
            </p>
          </div>
          <RouterLink
            :to="{ name: 'panel-mascotas' }"
            class="text-sm text-brand-accentInk underline underline-offset-2"
          >
            Ver todas
          </RouterLink>
        </div>
        <p v-if="loadingAnimales" class="mt-4 text-sm text-brand-inkSoft" role="status">
          Cargando tus mascotas...
        </p>
        <p
          v-else-if="errorAnimales"
          class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft p-4 text-sm text-brand-dangerInk"
          role="alert"
        >
          {{ errorAnimales }}
          <button type="button" class="ml-2 underline" @click="cargarAnimales">Reintentar</button>
        </p>
        <div v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="mascota in mascotas"
            :key="mascota.id"
            class="rounded-lg border border-brand-line bg-brand-surface p-5"
          >
            <h3 class="font-semibold text-brand-ink">{{ mascota.name }}</h3>
            <p class="mt-2 text-sm text-brand-inkSoft">
              {{ mascota.species }}<span v-if="mascota.breed"> · {{ mascota.breed }}</span>
            </p>
            <p
              v-if="mascota.birthDate && formatearFechaNacimiento(mascota.birthDate)"
              class="mt-1 text-xs text-brand-inkSoft"
            >
              Nacimiento: {{ formatearFechaNacimiento(mascota.birthDate) }}
            </p>
            <RouterLink
              :to="fichaRoute(mascota)"
              class="mt-4 inline-block text-sm font-medium text-brand-accentInk underline underline-offset-2"
            >
              Ver ficha médica
            </RouterLink>
          </article>
        </div>
      </section>

      <section>
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-brand-ink">Tus establecimientos y lotes</h2>
            <p class="mt-1 text-sm text-brand-inkSoft">Lotes ganaderos asociados a tus campos.</p>
          </div>
          <RouterLink
            :to="{ name: 'panel-establecimientos' }"
            class="text-sm text-brand-accentInk underline underline-offset-2"
          >
            Ver establecimientos
          </RouterLink>
        </div>
        <p v-if="loadingEstablecimientos" class="mt-4 text-sm text-brand-inkSoft" role="status">
          Cargando tus establecimientos...
        </p>
        <p
          v-else-if="errorEstablecimientos"
          class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft p-4 text-sm text-brand-dangerInk"
          role="alert"
        >
          {{ errorEstablecimientos }}
          <button type="button" class="ml-2 underline" @click="cargarEstablecimientos">
            Reintentar
          </button>
        </p>
        <p
          v-else-if="!establecimientos.length"
          class="mt-4 rounded-lg border border-brand-line bg-brand-surface p-5 text-sm text-brand-inkSoft"
        >
          Todavía no tenés establecimientos registrados.
        </p>
        <div v-else class="mt-4 space-y-5">
          <section
            v-for="establecimiento in establecimientos"
            :key="establecimiento.id"
            class="rounded-lg border border-brand-line bg-brand-surface p-5"
          >
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 class="font-semibold text-brand-ink">{{ establecimiento.name }}</h3>
                <p v-if="establecimiento.locality" class="mt-1 text-xs text-brand-inkSoft">
                  {{ establecimiento.locality }}
                </p>
              </div>
              <p class="text-sm text-brand-inkSoft">
                {{ establecimiento.lots.length }}
                {{ establecimiento.lots.length === 1 ? 'lote' : 'lotes' }} ·
                {{ establecimiento.totalAnimals }} cabezas
              </p>
            </div>
            <p v-if="!establecimiento.lots.length" class="mt-4 text-sm text-brand-inkSoft">
              Este establecimiento todavía no tiene lotes registrados.
            </p>
            <div v-else class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <article
                v-for="lote in establecimiento.lots"
                :key="lote.id"
                class="rounded border border-brand-line bg-brand-bg p-4"
              >
                <h4 class="font-medium text-brand-ink">{{ lote.name }}</h4>
                <p class="mt-2 text-sm text-brand-inkSoft">
                  {{ lote.species }}<span v-if="lote.breed"> · {{ lote.breed }}</span>
                </p>
                <p class="mt-1 text-xs text-brand-inkSoft">
                  {{ lote.animalCount }} {{ lote.animalCount === 1 ? 'cabeza' : 'cabezas' }}
                </p>
                <RouterLink
                  :to="{ name: 'panel-lote-ficha', params: { id: lote.id } }"
                  class="mt-4 inline-block text-sm font-medium text-brand-accentInk underline underline-offset-2"
                >
                  Ver ficha médica
                </RouterLink>
              </article>
            </div>
          </section>
        </div>
      </section>

      <p
        v-if="
          !loadingAnimales &&
          !errorAnimales &&
          !mascotas.length &&
          !loadingEstablecimientos &&
          !errorEstablecimientos &&
          !establecimientos.some((establecimiento) => establecimiento.lots.length)
        "
        class="rounded-lg border border-brand-accent bg-brand-accentSoft p-5 text-sm text-brand-accentInk"
        role="status"
      >
        Aún no hay mascotas ni lotes registrados para mostrar.
        <RouterLink
          :to="{ name: 'panel-animal-nuevo' }"
          class="ml-1 font-semibold underline underline-offset-2"
        >
          Registrar un lote
        </RouterLink>
      </p>
    </template>

    <section v-else>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-brand-ink">Tus mascotas</h2>
          <p class="mt-1 text-sm text-brand-inkSoft">
            Datos y acceso a la ficha médica de cada mascota.
          </p>
        </div>
        <RouterLink
          :to="{ name: 'panel-mascotas' }"
          class="text-sm text-brand-accentInk underline underline-offset-2"
        >
          Ver todas
        </RouterLink>
      </div>
      <p v-if="loadingAnimales" class="mt-4 text-sm text-brand-inkSoft" role="status">
        Cargando tus mascotas...
      </p>
      <p
        v-else-if="errorAnimales"
        class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft p-4 text-sm text-brand-dangerInk"
        role="alert"
      >
        {{ errorAnimales }}
        <button type="button" class="ml-2 underline" @click="cargarAnimales">Reintentar</button>
      </p>
      <p
        v-else-if="!mascotas.length"
        class="mt-4 rounded-lg border border-brand-accent bg-brand-accentSoft p-5 text-sm text-brand-accentInk"
        role="status"
      >
        Todavía no tenés mascotas registradas.
        <RouterLink
          :to="{ name: 'panel-animal-nuevo' }"
          class="ml-1 font-semibold underline underline-offset-2"
        >
          Registrar mascota
        </RouterLink>
      </p>
      <div v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="mascota in mascotas"
          :key="mascota.id"
          class="rounded-lg border border-brand-line bg-brand-surface p-5"
        >
          <h3 class="font-semibold text-brand-ink">{{ mascota.name }}</h3>
          <p class="mt-2 text-sm text-brand-inkSoft">
            {{ mascota.species }}<span v-if="mascota.breed"> · {{ mascota.breed }}</span>
          </p>
          <p
            v-if="mascota.birthDate && formatearFechaNacimiento(mascota.birthDate)"
            class="mt-1 text-xs text-brand-inkSoft"
          >
            Nacimiento: {{ formatearFechaNacimiento(mascota.birthDate) }}
          </p>
          <RouterLink
            :to="fichaRoute(mascota)"
            class="mt-4 inline-block text-sm font-medium text-brand-accentInk underline underline-offset-2"
          >
            Ver ficha médica
          </RouterLink>
        </article>
      </div>
    </section>
  </div>
</template>
