import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '../layouts/PublicLayout.vue'
import HomeView from '../views/HomeView.vue'

const PanelPlaceholderView = () => import('../views/panel/PanelPlaceholderView.vue')
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import { getAuthSession } from '@/services/auth'

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
      path: '/panel',
      meta: { requiresAuth: true },
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
      meta: { requiresAuth: true, requiredRole: 'VETERINARIO' },
      component: () => import('@/views/veterinario/VeterinarioView.vue'),
      children: [
        {
          path: '',
          name: 'vet-dashboard',
          component: () => import('@/views/veterinario/DashboardView.vue'),
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

  const requiredRole = to.matched
    .map((record) => record.meta.requiredRole)
    .find((role): role is string => typeof role === 'string')

  try {
    const user = await getAuthSession()

    if (!user) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (requiredRole ? user.rol === requiredRole : user.rol === 'CLIENTE') return true

    return { name: 'home' }
  } catch {
    // Sin una sesión verificable, las rutas privadas vuelven al login.
  }

  return { name: 'login', query: { redirect: to.fullPath } }
})

export default router
