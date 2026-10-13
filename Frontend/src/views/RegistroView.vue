<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

// un contenedor para almacenar los datos del formulario
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

const envioFormulario = async () => {
  mensajeError.value = ''
  mensajeExito.value = ''

  if (formData.contrasena !== formData.confirmarContrasena) {
    mensajeError.value = 'Las contraseñas no coinciden'
    return
  }

  enviando.value = true

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCompleto: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          localidad: formData.localidad,
          contrasena: formData.contrasena,
        }),
      },
    )
    const result: { message?: string } = await response.json()

    if (!response.ok) {
      throw new Error(result.message ?? 'No fue posible crear la cuenta.')
    }

    mensajeExito.value = result.message ?? 'La cuenta se creó correctamente.'
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
  <main class="flex min-h-screen items-center justify-center bg-brand-bg px-6 py-12 text-brand-ink">
    <section class="w-full max-w-md border border-brand-line bg-brand-surface p-8">
      <h1 class="text-center font-serif text-3xl">Crear una cuenta</h1>
      <p class="mt-2 text-center text-sm text-brand-inkSoft">
        Completá tus datos para registrarte.
      </p>

      <div
        v-if="mensajeError"
        class="mt-6 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        role="alert"
      >
        {{ mensajeError }}
      </div>
      <div
        v-if="mensajeExito"
        class="mt-6 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        role="status"
      >
        {{ mensajeExito }}
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="envioFormulario">
        <div>
          <label for="nombre" class="mb-1.5 block text-xs text-brand-inkSoft">Nombre</label>
          <input
            id="nombre"
            v-model="formData.nombre"
            type="text"
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
            type="email"
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
            type="tel"
            autocomplete="tel"
            placeholder="Tu teléfono"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="localidad" class="mb-1.5 block text-xs text-brand-inkSoft">Localidad</label>
          <input
            id="localidad"
            v-model="formData.localidad"
            type="text"
            autocomplete="address-level2"
            placeholder="Tu localidad"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="contraseña" class="mb-1.5 block text-xs text-brand-inkSoft">
            Contraseña
          </label>
          <input
            id="contraseña"
            v-model="formData.contrasena"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <div>
          <label for="confirmarContraseña" class="mb-1.5 block text-xs text-brand-inkSoft">
            Confirmar contraseña
          </label>
          <input
            id="confirmarContraseña"
            v-model="formData.confirmarContrasena"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            required
            class="w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
          />
        </div>

        <button type="submit" class="btn-primary mt-2 w-full" :disabled="enviando">
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
    </section>
  </main>
</template>
