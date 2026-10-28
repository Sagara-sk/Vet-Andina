<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { panelRouteForRole } from '@/router/access'
import { useSessionStore } from '@/stores/session'

// Se muestra cuando hay sesión pero el rol no puede abrir la ruta pedida.
const session = useSessionStore()
const ownPanel = computed(() => (session.user ? panelRouteForRole(session.user.rol) : null))
</script>

<template>
  <section class="flex flex-1 items-center justify-center px-7 py-12 sm:px-12">
    <div class="animate-login-enter w-full max-w-88 text-center">
      <div class="flex justify-center">
        <span
          class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-accentSoft text-brand-accentInk"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-7 w-7"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </span>
      </div>

      <p class="mt-6 text-xs text-brand-inkSoft">Error 403</p>
      <h1 class="mt-2 font-serif text-[1.65rem] leading-tight">Acceso denegado</h1>
      <p class="mt-3 text-base text-brand-inkSoft">
        Tu cuenta no tiene permiso para ver esta página.
      </p>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <RouterLink v-if="ownPanel" :to="ownPanel" class="btn-primary">Ir a mi panel</RouterLink>
        <RouterLink :to="{ name: 'home' }" :class="ownPanel ? 'btn-outline' : 'btn-primary'">
          Volver al inicio
        </RouterLink>
      </div>
    </div>
  </section>
</template>
