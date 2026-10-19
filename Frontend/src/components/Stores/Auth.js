import { defineStore } from 'pinia'

import { axios } from "axios"

export const useAuthStore = defineStore('auth', {
    state:() => {(
        user: null,
        token: null,
    )},
  actions: {
    async logout() {
        try {
            //consumir el Endpoint De Cerrar Sesion
            await axios.post('/auth/Logout')
        } catch (error) {
             console.error('Error Al cerrar sesion en el servidor', error);
        } finally {
            //Limpiar la store de pinia
            this.$reset() // o this.user = null; this token = null;
            localStore.removeItem('token') //aqui si guardas el token
        }
    }
  }
})