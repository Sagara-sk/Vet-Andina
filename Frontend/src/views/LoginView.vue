<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')

function onSubmit() {
  // TODO: autenticar contra el Backend. Por ahora entra directo al panel de ejemplo.
  router.push('/panel')
}
</script>

<template>
  <main class="border-b border-brand-line">
    <div class="container-page flex justify-center py-20 md:py-24">
      <form
        class="w-full max-w-[400px] border border-brand-line bg-brand-surface p-8"
        @submit.prevent="onSubmit"
      >
        <h1 class="font-serif text-3xl text-brand-ink">Iniciar sesión</h1>

        <label class="mt-8 block text-xs text-brand-inkSoft" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-2 w-full rounded-sm border border-brand-line bg-brand-bg px-3 py-2.5 text-brand-ink outline-none focus:border-brand-accent"
        />

        <label class="mt-5 block text-xs text-brand-inkSoft" for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="mt-2 w-full rounded-sm border border-brand-line bg-brand-bg px-3 py-2.5 text-brand-ink outline-none focus:border-brand-accent"
        />

        <button type="submit" class="btn-primary mt-8 w-full">Ingresar</button>
      </form>
    </div>
  </main>
</template>
