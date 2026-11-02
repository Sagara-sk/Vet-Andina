<script setup lang="ts">
import { reactive, ref } from 'vue'
import { createStaffUser, type StaffRol, type StaffUser } from '@/services/users'

const formData = reactive({
  nombre: '',
  email: '',
  rol: 'VETERINARIO' as StaffRol,
  matricula: '',
  contrasena: '',
  confirmarContrasena: '',
})

const mensajeError = ref('')
const enviando = ref(false)
// Solo los creados en esta sesión: todavía no hay endpoint para listar usuarios.
const creados = ref<StaffUser[]>([])

const ROLES: { value: StaffRol; label: string }[] = [
  { value: 'VETERINARIO', label: 'Veterinario' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
]

const inputClass =
  'w-full rounded-[3px] border border-brand-line bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15'

async function envioFormulario() {
  mensajeError.value = ''

  if (formData.contrasena !== formData.confirmarContrasena) {
    mensajeError.value = 'Las contraseñas no coinciden.'
    return
  }

  enviando.value = true

  try {
    const user = await createStaffUser({
      nombreCompleto: formData.nombre,
      email: formData.email,
      rol: formData.rol,
      ...(formData.rol === 'VETERINARIO' ? { matriculaProfesional: formData.matricula } : {}),
      contrasena: formData.contrasena,
    })

    creados.value.unshift(user)
    formData.nombre = ''
    formData.email = ''
    formData.matricula = ''
    formData.contrasena = ''
    formData.confirmarContrasena = ''
  } catch (error) {
    mensajeError.value = error instanceof Error ? error.message : 'No fue posible crear el usuario.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <h1 class="font-serif text-3xl text-brand-ink">Usuarios</h1>
    <p class="mt-3 text-brand-inkSoft">Dá de alta veterinarios y personal administrativo.</p>

    <div class="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <section class="border border-brand-line bg-brand-surface p-6">
        <h2 class="text-base text-brand-ink">Agregar usuario</h2>

        <div
          v-if="mensajeError"
          class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
          role="alert"
        >
          {{ mensajeError }}
        </div>

        <form class="mt-6 space-y-5" @submit.prevent="envioFormulario">
          <fieldset>
            <legend class="mb-1.5 block text-xs text-brand-inkSoft">Rol</legend>
            <div class="flex gap-2">
              <label
                v-for="rol in ROLES"
                :key="rol.value"
                class="flex flex-1 cursor-pointer items-center gap-2 rounded-[3px] border px-3 py-2.5 text-sm"
                :class="
                  formData.rol === rol.value
                    ? 'border-brand-accent bg-brand-accentSoft text-brand-ink'
                    : 'border-brand-line text-brand-inkSoft'
                "
              >
                <input v-model="formData.rol" type="radio" name="rol" :value="rol.value" class="accent-brand-accent" />
                {{ rol.label }}
              </label>
            </div>
          </fieldset>

          <div>
            <label for="nombre" class="mb-1.5 block text-xs text-brand-inkSoft">Nombre completo</label>
            <input
              id="nombre"
              v-model="formData.nombre"
              type="text"
              autocomplete="off"
              minlength="2"
              maxlength="200"
              required
              :class="inputClass"
            />
          </div>

          <div>
            <label for="email" class="mb-1.5 block text-xs text-brand-inkSoft">Correo electrónico</label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              autocomplete="off"
              maxlength="254"
              required
              :class="inputClass"
            />
          </div>

          <div v-if="formData.rol === 'VETERINARIO'">
            <label for="matricula" class="mb-1.5 block text-xs text-brand-inkSoft">
              Matrícula profesional
            </label>
            <input
              id="matricula"
              v-model="formData.matricula"
              type="text"
              autocomplete="off"
              minlength="2"
              maxlength="50"
              required
              :class="inputClass"
            />
          </div>

          <div>
            <label for="contrasena" class="mb-1.5 block text-xs text-brand-inkSoft">
              Contraseña inicial
            </label>
            <input
              id="contrasena"
              v-model="formData.contrasena"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              :class="inputClass"
            />
          </div>

          <div>
            <label for="confirmarContrasena" class="mb-1.5 block text-xs text-brand-inkSoft">
              Confirmar contraseña
            </label>
            <input
              id="confirmarContrasena"
              v-model="formData.confirmarContrasena"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              :class="inputClass"
            />
          </div>

          <button type="submit" :disabled="enviando" class="btn-primary w-full disabled:cursor-wait disabled:opacity-60">
            {{ enviando ? 'Creando usuario...' : 'Crear usuario' }}
          </button>
        </form>
      </section>

      <section>
        <h2 class="text-base text-brand-ink">Creados en esta sesión</h2>
        <p v-if="creados.length === 0" class="mt-4 text-sm text-brand-inkSoft">
          Todavía no creaste usuarios.
        </p>
        <ul v-else class="mt-4 divide-y divide-brand-line border border-brand-line bg-brand-surface">
          <li v-for="user in creados" :key="user.id" class="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <div>
              <p class="text-sm text-brand-ink">{{ user.nombreCompleto }}</p>
              <p class="mt-0.5 text-xs text-brand-inkSoft">
                {{ user.email }}<span v-if="user.matriculaProfesional"> · Mat. {{ user.matriculaProfesional }}</span>
              </p>
            </div>
            <span class="rounded-full bg-brand-accentSoft px-2.5 py-1 text-xs text-brand-accentInk">
              {{ user.rol === 'VETERINARIO' ? 'Veterinario' : 'Administrativo' }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
