<script setup>
import { useRoute, useRouter } from 'vue-router';

import {useAuthStore} from '/@Stores/Auth'
import { defineStore } from 'pinia';

const router = useRouter()
const authStore = useAuthStore()

const backAt = async () => {
    //ejecuta la accion de store osea (peticion + limpieza)
    await authStore.logout()
    //Redirigir al /login
    Router,push('/login')
}

</script>

<template>
    <button @click="BackAt" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Cerrar Sesion</button>
</template>