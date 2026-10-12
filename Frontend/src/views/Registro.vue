<script setup>
import { reactive, ref } from 'vue'

// un contenedor para almacenar los datos del formulario
const formData = reactive({
  nombre: '',
  email: '',
  contraseña: '',
  confirmarContraseña: ''
})

//los mensajes de error para cada campo del formulario
const mensajeError = ref('')
const mensajeExito = ref('')

//las funciones para procesar el envio del formulario
const envioFormulario = () => {
  // limpiar mensajes previos
  mensajeError.value = ''
  mensajeExito.value = ''

  // validar que la contraseña coincida
  if (formData.contraseña !== formData.confirmarContraseña) {
    mensajeError.value = 'Las contraseñas no coinciden'
    return
  }

  mensajeExito.value = 'Cuenta creada con éxito.'

  // limpiar el formulario después de un registro exitoso
  formData.nombre = ''
  formData.email = ''
  formData.contraseña = ''
  formData.confirmarContraseña = ''
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
      <!-- primer encabezado -->
      <h2 class="text-2xl font-bold text-gray-800 text-center mb-6">
        Crea tu cuenta
      </h2>

      <!-- alerta de estado -->
      <div v-if="mensajeError" class="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">
        {{ mensajeError }}
      </div>

      <div v-if="mensajeExito" class="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded-lg">
        {{ mensajeExito }}
      </div>

      <!-- formulario -->
      <form @submit.prevent="envioFormulario" class="space-y-4">
        <div>
          <label for="nombre" class="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            id="nombre"
            v-model="formData.nombre"
            type="text"
            class="mt-1 block w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tu nombre"
            required
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Correo electrónico</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="mt-1 block w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div>
          <label for="contraseña" class="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            id="contraseña"
            v-model="formData.contraseña"
            type="password"
            class="mt-1 block w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label for="confirmarContraseña" class="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
          <input
            id="confirmarContraseña"
            v-model="formData.confirmarContraseña"
            type="password"
            class="mt-1 block w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Registrarse
        </button>
      </form>
    </div>
  </div>
</template>