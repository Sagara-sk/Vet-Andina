<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { register } from '@/services/auth'

const formData = reactive({
  nombre: '',
  email: '',
  telefono: '',
  localidad: '',
  contrasena: '',
  confirmarContrasena: '',
})

const mensajeError = ref('')
const mensajeExito = ref('')
const enviando = ref(false)

async function envioFormulario() {
  mensajeError.value = ''
  mensajeExito.value = ''

  if (formData.contrasena !== formData.confirmarContrasena) {
    mensajeError.value = 'Las contraseñas no coinciden.'
    return
  }

  enviando.value = true

  try {
    mensajeExito.value = await register({
      nombreCompleto: formData.nombre,
      email: formData.email,
      telefono: formData.telefono,
      localidad: formData.localidad,
      contrasena: formData.contrasena,
    })
    formData.nombre = ''
    formData.email = ''
    formData.telefono = ''
    formData.localidad = ''
    formData.contrasena = ''
    formData.confirmarContrasena = ''
  } catch (error) {
    mensajeError.value =
      error instanceof Error ? error.message : 'No se pudo establecer conexión con el servidor.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="flex flex-1 items-center justify-center px-7 py-12 sm:px-12">
    <div class="animate-login-enter w-full max-w-88">
      <h1 class="font-serif text-[1.65rem] leading-tight">Crear una cuenta</h1>
      <p class="mt-2 text-base text-brand-inkSoft">Completá tus datos para registrarte.</p>

      <div
        v-if="mensajeError"
        class="mt-6 border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        role="alert"
      >
        {{ mensajeError }}
      </div>
      <div
        v-if="mensajeExito"
        class="mt-6 border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        role="status"
      >
        {{ mensajeExito }}
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="envioFormulario">
        <div>
          <label for="nombre" class="mb-1.5 block text-xs text-brand-inkSoft">Nombre</label>
          <input
            id="nombre"
            v-model="formData.nombre"
            name="nombre"
            type="text"
            autocomplete="name"
            placeholder="Tu nombre"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="email" class="mb-1.5 block text-xs text-brand-inkSoft">
            Correo electrónico
          </label>
          <input
            id="email"
            v-model="formData.email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="correo@ejemplo.com"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="telefono" class="mb-1.5 block text-xs text-brand-inkSoft">Teléfono</label>
          <input
            id="telefono"
            v-model="formData.telefono"
            name="telefono"
            type="tel"
            autocomplete="tel"
            placeholder="+54 9 299 000 0000"
            minlength="6"
            maxlength="50"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="localidad" class="mb-1.5 block text-xs text-brand-inkSoft">Localidad</label>
          <input
            id="localidad"
            v-model="formData.localidad"
            name="localidad"
            type="text"
            autocomplete="address-level2"
            placeholder="Cipolletti"
            minlength="2"
            maxlength="150"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="contrasena" class="mb-1.5 block text-xs text-brand-inkSoft">
            Contraseña
          </label>
          <input
            id="contrasena"
            v-model="formData.contrasena"
            name="contrasena"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            minlength="8"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="confirmarContrasena" class="mb-1.5 block text-xs text-brand-inkSoft">
            Confirmar contraseña
          </label>
          <input
            id="confirmarContrasena"
            v-model="formData.confirmarContrasena"
            name="confirmarContrasena"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <button
          type="submit"
          :disabled="enviando"
          class="btn-primary mt-2 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ enviando ? 'Creando cuenta…' : 'Registrarse' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-brand-inkSoft">
        ¿Ya tenés cuenta?
        <RouterLink
          to="/login"
          class="text-brand-ink underline underline-offset-2 hover:text-brand-accent"
        >
          Iniciar sesión
        </RouterLink>
      </p>
    </div>
  </section>
</template>