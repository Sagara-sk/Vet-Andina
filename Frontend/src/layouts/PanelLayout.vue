<script setup lang="ts">
import { RouterView } from 'vue-router'
import PanelSidebar from '@/components/panel/PanelSidebar.vue'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
</script>

<template>
  <div class="min-h-screen bg-brand-bg text-brand-ink md:flex" :class="{ 'theme-dark': isDark }">
    <PanelSidebar />
    <main class="min-w-0 flex-1 px-6 py-8 md:px-12 md:py-11">
      <RouterView />
    </main>
  </div>
</template>
