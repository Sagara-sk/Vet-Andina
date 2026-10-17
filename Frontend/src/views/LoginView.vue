<script setup lang="ts">
import BrandPanel from '../components/login/BrandPanel.vue'
import LoginForm from '../components/login/LoginForm.vue'
</script>

<template>
  <main class="grid min-h-screen grid-cols-1 bg-brand-bg text-brand-ink md:grid-cols-2">
    <BrandPanel />
    <LoginForm />
  </main>
</template>
