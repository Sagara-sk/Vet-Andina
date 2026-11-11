<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AccesosAdministrativos from '@/components/dashboard/AccesosAdministrativos.vue'
import ResumenAgendaStaff from '@/components/dashboard/ResumenAgendaStaff.vue'
import ResumenCliente from '@/components/dashboard/ResumenCliente.vue'
import type { Rol } from '@/router/access'
import { useSessionStore } from '@/stores/session'

// Inicio común de los paneles. Cada módulo se muestra según el rol de la sesión
// verificada por la API; esto solo decide qué se ve, la autorización real la
// aplica el servidor en cada endpoint.
const session = useSessionStore()

const rol = computed(() => session.user?.rol as Rol | undefined)

const modulos = computed(() => ({
  cliente: rol.value === 'CLIENTE',
  administrativo: rol.value === 'ADMINISTRATIVO' || rol.value === 'SUPERADMIN',
  usuarios: rol.value === 'SUPERADMIN',
}))

const SUBTITULOS: Record<Rol, string> = {
  CLIENTE: 'Así está la agenda de tus mascotas.',
  VETERINARIO: 'Tu jornada de hoy.',
  ADMINISTRATIVO: 'Accesos rápidos a la gestión del consultorio.',
  SUPERADMIN: 'Resumen de la clínica y accesos de administración.',
}

const subtitulo = computed(() => (rol.value ? SUBTITULOS[rol.value] : ''))
const saludo = computed(() => (session.firstName ? `Hola, ${session.firstName}` : 'Hola'))

const fechaHoy = (() => {
  const texto = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})()
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">{{ saludo }}</h1>
        <p class="mt-1.5 text-sm text-brand-inkSoft">{{ fechaHoy }}</p>
        <p v-if="subtitulo" class="mt-3 text-brand-inkSoft">{{ subtitulo }}</p>
      </div>
      <RouterLink v-if="modulos.cliente" :to="{ name: 'panel-reservar' }" class="btn-primary">
        Reservar turno
      </RouterLink>
    </header>

    <ResumenCliente v-if="modulos.cliente" :tipo-atencion="session.user?.tipoAtencion ?? null" />
    <ResumenAgendaStaff v-if="rol && rol !== 'CLIENTE'" :rol="rol" />
    <AccesosAdministrativos v-if="modulos.administrativo" :incluir-usuarios="modulos.usuarios" />
  </div>
</template>
