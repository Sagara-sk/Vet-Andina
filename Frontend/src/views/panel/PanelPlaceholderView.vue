<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { homeRouteForRole } from '@/router/access'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const home = computed(() => homeRouteForRole(session.user?.rol ?? ''))
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <h1 class="font-serif text-3xl text-brand-ink">{{ route.meta.title }}</h1>
    <p class="mt-3 text-brand-inkSoft">Esta sección todavía está en construcción.</p>
    <RouterLink :to="home" class="btn-outline mt-8">Volver al inicio</RouterLink>
  </div>
</template>
