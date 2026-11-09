<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

// Accesos a las secciones administrativas conectadas a la API. El superadmin
// suma la gestión de usuarios. Mostrar el acceso no autoriza nada: cada endpoint
// valida el rol en el servidor.
const props = defineProps<{ incluirUsuarios?: boolean }>()

interface Acceso {
  titulo: string
  descripcion: string
  to: RouteLocationRaw
}

const accesos = computed<Acceso[]>(() => [
  {
    titulo: 'Turnos',
    descripcion: 'Agenda del consultorio y de campo, solicitudes y cambios de estado.',
    to: { name: 'admin-turnos' },
  },
  {
    titulo: 'Tutores',
    descripcion: 'Alta y edición de tutores, sus animales y establecimientos.',
    to: { name: 'admin-tutores' },
  },
  {
    titulo: 'Fichas',
    descripcion: 'Consulta de fichas e historias clínicas de los pacientes.',
    to: { name: 'admin-fichas' },
  },
  ...(props.incluirUsuarios
    ? [
        {
          titulo: 'Usuarios',
          descripcion: 'Creación y suspensión de cuentas del personal.',
          to: { name: 'vet-usuarios' },
        },
      ]
    : []),
])
</script>

<template>
  <section class="mt-10">
    <h2 class="text-base font-medium text-brand-ink">Gestión administrativa</h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RouterLink
        v-for="acceso in accesos"
        :key="acceso.titulo"
        :to="acceso.to"
        class="block rounded border border-brand-line bg-brand-surface p-5 transition-colors hover:border-brand-accent"
      >
        <p class="font-serif text-xl text-brand-ink">{{ acceso.titulo }}</p>
        <p class="mt-2 text-xs text-brand-inkSoft">{{ acceso.descripcion }}</p>
      </RouterLink>
    </div>
  </section>
</template>
