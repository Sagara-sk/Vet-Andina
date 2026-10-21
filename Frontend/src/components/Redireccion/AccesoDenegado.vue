<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const GoBack = () => {
    //Redirecciona a la pagina principal
    router.push('/')
}
 
</script>

<template>
<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full text-center space-y-6">
    <!--Icono de Advertencia / candado-->
    <div class="flex justify-center">
         <div class="bg-red-100 p-4 rounded-full text-red-600 animate-bounce">
            <svg xmlns="https://w3.org" fill="none" viewbox="0 0 24 24" stroke-width="2" stroke="currentcolor" class="w-16 h-16">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10">
                </path>
            </svg>
         </div>
        </div>
    </div>
</div>

<!--El Mensaje de error-->
<div class="space-y-2">
    <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">Eror 403</h1>

    
    <p class="text-xl font-semibold text-gray-700">Acceso Denegado</p>

    <p class="text-sm text-gray-500 max-w-xs mx-auto">No tienes los permisos necesarios para ver esta pagina</p>
</div>

<!--Boton para volver al Inicio-->
<div>
    <button @click="GoBack" class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo1-500 transition duration-150 ease-in-out w-full sm:w-auto">Volver al Inicio

    </button>
</div>
</template>
