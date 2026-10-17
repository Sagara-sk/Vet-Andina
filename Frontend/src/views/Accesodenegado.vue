<script setup>
import {useRouter} from 'vue-router'

const router = useRouter() 

//una funcion para Redirigir al usuario a la pagina principal
const handLeGoHome = () => {
    router.push('/')
}

</script>

<template>
 <div class="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 py-12">
     <div class="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">


       <!--icono de Acceso Denegdo-->
        <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-50 text-red-500">

        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewbox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10" aria-hidden="true">
        
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />

        </svg>




</div>

<!--Mensaje informativo de lo que pasa-->

<div class="space-y-2">
    <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Acceso Denegado</h1>

    <p class="text-base text-gray-500"> Lo sentimos, no tienes los permisos necesarios para acceder a esta
          página. Si crees que se trata de un error, por favor contacta al
          administrador.</p>

</div>



<!--el volver al inicio-->
<div class="pt-2">
<button type="button" @click="handLeGoHome" class="inline-flex w-full justify-center items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">Volver al Inicio

</button>
</div>
</div>
</div>






</template>