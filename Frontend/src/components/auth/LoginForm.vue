<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const feedback = ref('')

function submitLogin() {
  feedback.value = 'El inicio de sesión todavía no está conectado al servidor.'
}

function showUnavailable(feature: string) {
  feedback.value = `${feature} todavía no está disponible.`
}
</script>

<template>
  <section class="flex flex-1 items-center justify-center px-7 py-12 sm:px-12">
    <div class="animate-login-enter w-full max-w-[22rem]">
      <h1 class="font-serif text-[1.65rem] leading-tight">Iniciar sesión</h1>
      <p class="mt-2 text-base text-brand-inkSoft">Ingresá con tu email y contraseña.</p>

      <form class="mt-8" @submit.prevent="submitLogin">
        <div>
          <label for="email" class="mb-1.5 block text-xs text-brand-inkSoft">Email</label>
          <input
            id="email"
            v-model="email"
            name="email"
            type="email"
            autocomplete="username"
            placeholder="nombre@ejemplo.com"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          >
        </div>

        <div class="mt-5">
          <label for="password" class="mb-1.5 block text-xs text-brand-inkSoft">Contraseña</label>
          <input
            id="password"
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="Tu contraseña"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          >
        </div>

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="text-xs text-brand-inkSoft underline underline-offset-2 hover:text-brand-ink"
            @click="showUnavailable('La recuperación de contraseña')"
          >
            Olvidé mi contraseña
          </button>
        </div>

        <button
          type="submit"
          class="mt-6 w-full rounded-[3px] bg-brand-accent py-3 text-sm font-medium text-white transition-colors hover:bg-brand-accentInk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          Entrar
        </button>
      </form>

      <p class="mt-2 min-h-5 text-center text-xs text-brand-inkSoft" role="status" aria-live="polite">
        {{ feedback }}
      </p>

      <p class="mt-3 text-center text-sm text-brand-inkSoft">
        ¿No tenés cuenta?
        <button
          type="button"
          class="text-brand-ink underline underline-offset-2 hover:text-brand-accent"
          @click="showUnavailable('El registro')"
        >
          Crear una cuenta
        </button>
      </p>
    </div>
  </section>
</template>
