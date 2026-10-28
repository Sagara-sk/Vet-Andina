<script setup lang="ts">
import { useLogout } from '@/composables/useLogout'

// Cierra la sesión en la API, limpia el store y vuelve al login.
const { closeSession, logoutError, isLoggingOut } = useLogout()
</script>

<template>
  <div>
    <button
      type="button"
      class="text-xs text-brand-inkSoft underline hover:text-brand-ink disabled:opacity-60"
      :disabled="isLoggingOut"
      @click="closeSession"
    >
      {{ isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión' }}
    </button>
    <p v-if="logoutError" class="mt-2 text-xs text-brand-dangerInk" role="alert">
      {{ logoutError }}
    </p>
  </div>
</template>
