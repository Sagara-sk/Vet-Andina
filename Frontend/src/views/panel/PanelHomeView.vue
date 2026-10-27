<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import PetCard from '@/components/panel/PetCard.vue'
import StatusBadge from '@/components/panel/StatusBadge.vue'
import ClientProfileForm from "@/views/forms/ClientProfileForm.vue";
import { getAuthSession } from '@/services/auth'
import { appointments, pets } from '@/data/panelMock'
import { formatLongDate, formatShortDate } from '@/utils/format'

// Interfaz estricta para el usuario de la sesión
interface SessionUser {
  id: string
  nombreCompleto?: string
  nombre?: string
  rol: string
  dni_cuit?: string | null
}

const isLoading = ref(true)
const needsProfileCompletion = ref(false)
const firstName = ref('Usuario')

onMounted(async () => {
  try {
    const user = await getAuthSession()
    if (user) {
      const u = user as unknown as SessionUser
      firstName.value = u.nombre || u.nombreCompleto || 'Usuario'
      needsProfileCompletion.value = u.rol === 'CLIENTE' && (!u.dni_cuit || u.dni_cuit.trim() === '')
    }
  } catch (error) {
    console.error('No se pudo verificar la sesión del usuario:', error)
  } finally {
    isLoading.value = false
  }
})

function handleProfileSaved() {
  needsProfileCompletion.value = false
}

const petName = (id: number) => pets.find((p) => p.id === id)?.name ?? '—'

const nextAppointment = computed(() =>
  appointments
    .filter((a) => a.status !== 'realizado' && a.date.getTime() >= Date.now())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0],
)
</script>

<template>
  <!-- Clase canónica actualizada: max-w-302.5 en lugar de max-w-[1210px] -->
  <div class="mx-auto max-w-302.5">
    <div v-if="isLoading" class="py-12 text-center text-sm text-brand-inkSoft" role="status">
      Verificando información de la cuenta...
    </div>

    <div v-else-if="needsProfileCompletion" class="flex flex-col items-center justify-center py-4">
      <div class="mb-6 w-full max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p class="font-semibold">¡Bienvenido a Vet Andina!</p>
        <p class="mt-1">Para continuar y utilizar las funciones del panel, por favor completa los datos de tu perfil por única vez.</p>
      </div>

      <ClientProfileForm @profile-saved="handleProfileSaved" />
    </div>

    <div v-else>
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-serif text-3xl text-brand-ink">Hola, {{ firstName }}</h1>
          <p class="mt-3 text-brand-inkSoft">Así está la agenda de tus mascotas.</p>
          <p class="mt-2 text-xs text-brand-inkSoft" role="note">
            Vista de demostración. Estos datos no provienen de una cuenta ni de la base de datos.
          </p>
        </div>
        <RouterLink to="/panel/reservar" class="btn-primary">Reservar turno</RouterLink>
      </header>

      <section
        v-if="nextAppointment"
        class="mt-9 flex flex-wrap items-center justify-between gap-6 border border-brand-line bg-brand-surface px-7 py-8"
      >
        <div>
          <p class="text-xs text-brand-inkSoft">Próximo turno</p>
          <h2 class="mt-2 font-serif text-xl text-brand-ink">
            {{ petName(nextAppointment.petId) }} · {{ nextAppointment.service }}
          </h2>
          <p class="mt-3 text-sm text-brand-inkSoft">
            {{ formatLongDate(nextAppointment.date) }} · {{ nextAppointment.place }} · atiende
            {{ nextAppointment.vet }}
          </p>
        </div>
        <RouterLink to="/panel/turnos" class="btn-primary">Ver detalle</RouterLink>
      </section>
      <p v-else class="mt-9 border border-brand-line bg-brand-surface px-7 py-6 text-sm text-brand-inkSoft" role="status">
        No hay próximos turnos en esta vista de demostración.
      </p>

      <section class="mt-11">
        <div class="flex items-baseline justify-between">
          <h2 class="text-base text-brand-ink">Tus mascotas</h2>
          <RouterLink to="/panel/mascotas" class="text-xs text-brand-inkSoft hover:text-brand-ink">
            Ver todas
          </RouterLink>
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PetCard v-for="pet in pets" :key="pet.id" :pet="pet" />
        </div>
      </section>

      <section class="mt-10">
        <div class="flex items-baseline justify-between">
          <h2 class="text-base text-brand-ink">Tus turnos</h2>
          <RouterLink to="/panel/turnos" class="text-xs text-brand-inkSoft hover:text-brand-ink">
            Ver todos
          </RouterLink>
        </div>
        <div class="mt-4 overflow-x-auto border border-brand-line bg-brand-surface">
          <!-- Clase canónica actualizada: min-w-140 en lugar de min-w-[560px] -->
          <table class="w-full min-w-140 text-left text-sm">
            <thead class="text-xs text-brand-inkSoft">
              <tr>
                <th class="w-[18%] px-4 py-3 font-normal">Mascota</th>
                <th class="w-[33%] px-4 py-3 font-normal">Servicio</th>
                <th class="w-[26%] px-4 py-3 font-normal">Fecha</th>
                <th class="px-4 py-3 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in appointments" :key="a.id" class="border-t border-brand-line text-brand-ink">
                <td class="px-4 py-4">{{ petName(a.petId) }}</td>
                <td class="px-4 py-4">{{ a.service }}</td>
                <td class="px-4 py-4">{{ formatShortDate(a.date) }}</td>
                <td class="px-4 py-4"><StatusBadge :status="a.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
