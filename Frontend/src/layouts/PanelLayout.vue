<script setup lang="ts">
import { RouterView } from 'vue-router'
import PanelSidebar from '@/components/panel/PanelSidebar.vue'
</script>

<template>
  <div class="min-h-screen md:flex">
    <PanelSidebar />
    <main class="min-w-0 flex-1 px-6 py-8 md:px-12 md:py-11">
      <RouterView />
    </main>
  </div>
</template>
