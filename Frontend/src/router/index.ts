import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '../layouts/PublicLayout.vue'
import HomeView from '../views/HomeView.vue'

const PanelPlaceholderView = () => import('../views/panel/PanelPlaceholderView.vue')
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import { useSessionStore } from '@/stores/session'
import { canAccess } from './access'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'turnos', name: 'turnos', component: () => import('../views/TurnosView.vue') },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/registro',
      name: 'registro',
      component: RegistroView,
    },
    {
      path: '/acceso-denegado',
      name: 'acceso-denegado',
      component: () => import('../views/AccesoDenegadoView.vue'),
    },
    {
      path: '/panel',
      meta: { requiresAuth: true, allowedRoles: ['CLIENTE'] },
      component: () => import('../layouts/PanelLayout.vue'),
      children: [
        { path: '', name: 'panel', component: () => import('../views/panel/PanelHomeView.vue') },
        {
          path: 'mascotas',
          name: 'panel-mascotas',
          component: PanelPlaceholderView,
          meta: { title: 'Mis mascotas' },
        },
        {
          path: 'reservar',
          name: 'panel-reservar',
          component: PanelPlaceholderView,
          meta: { title: 'Reservar turno' },
        },
        {
          path: 'turnos',
          name: 'panel-turnos',
          component: PanelPlaceholderView,
          meta: { title: 'Mis turnos' },
        },
      ],
    },
    {
      path: '/panel-veterinario',
      meta: { requiresAuth: true, allowedRoles: ['VETERINARIO', 'SUPERADMIN'] },
      component: () => import('@/views/veterinario/VeterinarioView.vue'),
      children: [
        {
          path: '',
          name: 'vet-dashboard',
          component: () => import('@/views/veterinario/DashboardView.vue'),
        },
        {
          path: 'offline',
          name: 'vet-offline',
          component: () => import('@/views/veterinario/OfflineView.vue'),
        },
      ],
    },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (!to.matched.some((record) => record.meta.requiresAuth)) return true

  // La sesión sale de Pinia; la API solo se consulta la primera vez (al cargar o
  // recargar la app). Sin sesión, se guarda la ruta pedida para volver tras el login.
  const user = await useSessionStore().ensureSession()

  if (!user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Con sesión pero sin permiso para esta ruta: página 403.
  return canAccess(to.matched, user.rol) ? true : { name: 'acceso-denegado' }
})

export default router