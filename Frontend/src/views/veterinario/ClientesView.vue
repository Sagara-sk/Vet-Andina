<script setup>
import { Script } from 'vm'
import { ref } from 'vue'
import { computed, ref } from 'vue'
import { formatShortDate, initials } from '@/utils/format'

const busqueda = ref('')

const clientes = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  const ahora = Date.now()

  return agenda.clientes
    .filter(
      (c) =>
        !texto ||
        c.nombreCompleto.toLowerCase().includes(texto) ||
        c.animales.some((a) => a.toLowerCase().includes(texto)),
    )
    .map((c) => ({
      ...c,
      proximo: agenda.turnos
        .filter((t) => t.idCliente === c.id && t.estado !== 'cancelado' && t.fechaHora.getTime() >= ahora)
        .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())[0],
    }))
})

//boton para agregar 
const abrirModalAgregar = () => {
  // Aquí puedes gatillar la lógica de un modal o redirección
  alert('Lógica para abrir el formulario de nueva mascota')
}
</Script>




<template>
  <div class="min-h-screen bg-slate-100 p-6 flex justify-center items-start">
    <!-- Tarjeta Principal del Cliente -->
    <div class="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      
      <!-- Encabezado / Datos del Cliente -->
      <div class="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="text-xs font-semibold tracking-wider uppercase bg-white/20 px-3 py-1 rounded-full">
              Perfil del Cliente
            </span>
            <h1 class="text-2xl font-bold mt-2">{{ cliente.nombre }}</h1>
            <p class="text-indigo-100 text-sm mt-1">ID: {{ cliente.id }} • Desde: {{ cliente.fechaRegistro }}</p>
          </div>
          
          <!-- Información de contacto rápida -->
          <div class="text-sm bg-white/10 p-3 rounded-xl backdrop-blur-sm w-full sm:w-auto">
            <p class="flex items-center gap-2">📍 {{ cliente.direccion }}</p>
            <p class="flex items-center gap-2 mt-1">📞 {{ cliente.telefono }}</p>
            <p class="flex items-center gap-2 mt-1">✉️ {{ cliente.email }}</p>
          </div>
        </div>
      </div>

      <!-- Cuerpo de la Tarjeta / Sección de Mascotas -->
      <div class="p-6">
        <div class="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
          <div>
            <h2 class="text-xl font-bold text-slate-800">Mascotas Registradas</h2>
            <p class="text-sm text-slate-500">Administra los animales asociados a esta cuenta</p>
          </div>
          
          <!-- Botón Agregar Mascota -->
          <button 
            @click="abrirModalAgregar"
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <svg xmlns="http://w3.org" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Agregar mascota
          </button>
        </div>

        <!-- Estado Vacío (Si no hay mascotas) -->
        <div v-if="mascotas.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <p class="text-slate-400 text-lg">Este cliente aún no tiene mascotas registradas.</p>
        </div>

        <!-- Rejilla de Mascotas -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="mascota in mascotas" 
            :key="mascota.id"
            class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
          >
            <div class="flex items-center gap-4">
              <!-- Icono/Avatar de la mascota según su tipo -->
              <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl shadow-inner">
                {{ mascota.tipo === 'Perro' ? '🐶' : mascota.tipo === 'Gato' ? '🐱' : '🐹' }}
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-lg">{{ mascota.nombre }}</h3>
                <p class="text-sm text-slate-500">{{ mascota.especie }} • {{ mascota.edad }}</p>
              </div>
            </div>
            
            <!--Etiqueta de Estado-->
            <span class="text-xs px-2.5 py-1 rounded-md font-medium bg-emerald-100 text-emerald-800">
              Activo
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
