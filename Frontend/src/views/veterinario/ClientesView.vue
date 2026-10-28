<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAgendaDemoStore } from '@/stores/agendaDemo'
import { formatShortDate, initials } from '@/utils/format'

const agenda = useAgendaDemoStore()
const busqueda = ref('')

const clientes = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  const ahora = Date.now()

  return agenda.clientes
    .filter(
      (c) =>
        !texto ||
        c.nombreCompleto.toLowerCase().includes(texto) ||
        c.animales.some((a) => a.toLowerCase().includes(texto)),
    )
    .map((c) => ({
      ...c,
      proximo: agenda.turnos
        .filter((t) => t.idCliente === c.id && t.estado !== 'cancelado' && t.fechaHora.getTime() >= ahora)
        .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())[0],
    }))
})
</script>

<template>
  <div class="mx-auto max-w-[1210px] text-brand-ink">
    <h1 class="font-serif text-[1.6rem]">Clientes</h1>
    <p class="mt-2 text-xs text-brand-inkSoft" role="note">
      Vista de demostración. Los clientes no provienen de la base de datos.
    </p>

    <input
      v-model="busqueda"
      type="search"
      placeholder="Buscar cliente o mascota"
      aria-label="Buscar cliente o mascota"
      class="mt-7 w-[280px] max-w-full rounded-sm border border-brand-line bg-brand-surface px-3 py-2.5 text-sm outline-none focus:border-brand-accent"
    />

    <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="cliente in clientes"
        :key="cliente.id"
        class="flex flex-col rounded border border-brand-line bg-brand-surface p-5"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-accentSoft text-xs text-brand-accentInk"
            aria-hidden="true"
          >
            {{ initials(cliente.nombreCompleto) }}
          </span>
          <div>
            <h2 class="text-sm font-medium">{{ cliente.nombreCompleto }}</h2>
            <p class="mt-0.5 text-xs text-brand-inkSoft">{{ cliente.localidad }}</p>
          </div>
        </div>

        <p class="mt-4 text-xs text-brand-inkSoft">Animales</p>
        <p class="mt-1 text-sm">{{ cliente.animales.join(', ') }}</p>

        <p class="mt-4 text-xs text-brand-inkSoft">Próximo turno</p>
        <p class="mt-1 text-sm">
          <template v-if="cliente.proximo">
            {{ formatShortDate(cliente.proximo.fechaHora) }} · {{ cliente.proximo.animal }}
          </template>
          <template v-else>Sin turnos próximos</template>
        </p>

        <a
          :href="`https://wa.me/${cliente.telefono}`"
          target="_blank"
          rel="noreferrer"
          class="mt-5 text-xs text-brand-accentInk underline underline-offset-2"
        >
          Contactar por WhatsApp
        </a>
      </article>
    </div>

    <p v-if="clientes.length === 0" class="mt-6 text-sm text-brand-inkSoft">
      No hay clientes que coincidan con la búsqueda.
    </p>
  </div>
</template>
