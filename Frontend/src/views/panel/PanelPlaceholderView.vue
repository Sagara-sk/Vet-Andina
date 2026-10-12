<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <h1 class="font-serif text-3xl text-brand-ink">{{ route.meta.title }}</h1>
    <p class="mt-3 text-brand-inkSoft">Esta sección todavía está en construcción.</p>
    <RouterLink to="/panel" class="btn-outline mt-8">Volver al inicio</RouterLink>
  </div>
</template>
