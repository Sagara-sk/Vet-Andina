<script setup lang="ts">
import { onUnmounted, watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import PanelSidebar from '@/components/panel/PanelSidebar.vue'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

// Colores de la barra del navegador en celular; coinciden con --brand-bg.
const THEME_COLOR = { light: '#fafaf7', dark: '#161815' }

// El tema se aplica también a <html> para que el fondo al hacer scroll de más
// y la barra del navegador acompañen al panel. Las páginas públicas siguen en
// modo claro: al salir del panel se restaura todo.
watchEffect(() => {
  document.documentElement.classList.toggle('theme-dark', isDark.value)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark.value ? THEME_COLOR.dark : THEME_COLOR.light)
})

onUnmounted(() => {
  document.documentElement.classList.remove('theme-dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR.light)
})
</script>

<template>
  <div class="min-h-dvh bg-brand-bg text-brand-ink md:flex" :class="{ 'theme-dark': isDark }">
    <PanelSidebar />
    <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-12 md:py-11">
      <RouterView />
    </main>
  </div>
</template>
