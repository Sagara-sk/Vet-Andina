import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '../layouts/PublicLayout.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/veterinario/DashboardView.vue'
import VeterinarioView from '../views/veterinario/VeterinarioView.vue'
import OfflineView from '../views/veterinario/offlineview.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/panel-veterinario',
    },
    {
      path: '/inicio',
      component: PublicLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
      ],
    },
    {
      path: '/turnos',
      component: PublicLayout,
      children: [
        { path: '', name: 'turnos', component: () => import('../views/TurnosView.vue') },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/panel',
      component: () => import('../layouts/PanelLayout.vue'),
      children: [
        { path: '', name: 'panel', component: () => import('../views/panel/PanelHomeView.vue') },
        {
          path: 'mascotas',
          name: 'panel-mascotas',
          component: () => import('../views/panel/PanelPlaceholderView.vue'),
          meta: { title: 'Mis mascotas' },
        },
        {
          path: 'reservar',
          name: 'panel-reservar',
          component: () => import('../views/panel/PanelPlaceholderView.vue'),
          meta: { title: 'Reservar turno' },
        },
        {
          path: 'turnos',
          name: 'panel-turnos',
          component: () => import('../views/panel/PanelPlaceholderView.vue'),
          meta: { title: 'Mis turnos' },
        },
      ],
    },
    {
      path: '/panel-veterinario',
      component: VeterinarioView,
      children: [
        { path: '', name: 'dashboard', component: DashboardView },
        { path: 'offline', name: 'offline', component: OfflineView },
      ],
    },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
