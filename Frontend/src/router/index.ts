import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '../layouts/PublicLayout.vue'
import HomeView from '../views/HomeView.vue'

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
      // Inicio común de todos los paneles: DashboardView muestra los módulos que
      // corresponden al rol de la sesión. Las secciones de cada rol siguen en
      // /panel, /panel-veterinario y /panel-administrativo.
      path: '/dashboard',
      meta: {
        requiresAuth: true,
        allowedRoles: ['CLIENTE', 'VETERINARIO', 'ADMINISTRATIVO', 'SUPERADMIN'],
      },
      component: () => import('../layouts/PanelLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
      ],
    },
    {
      path: '/panel',
      meta: { requiresAuth: true, allowedRoles: ['CLIENTE'] },
      component: () => import('../layouts/PanelLayout.vue'),
      children: [
        // Inicio anterior del panel cliente; se conserva para enlaces guardados.
        { path: '', redirect: { name: 'dashboard' } },
        {
          path: 'mascotas',
          name: 'panel-mascotas',
          component: () => import('../views/panel/PetsView.vue'),
        },
        {
          path: 'establecimientos',
          name: 'panel-establecimientos',
          component: () => import('../views/panel/EstablishmentsView.vue'),
          meta: { title: 'Mis establecimientos' },
        },
        {
          path: 'reservar',
          name: 'panel-reservar',
          component: () => import('../views/panel/ReservaTurnoView.vue'),
          meta: { title: 'Reservar turno' },
        },
        {
          path: 'turnos',
          name: 'panel-turnos',
          component: () => import('../views/panel/AppointmentsView.vue'),
        },
        {
          path: 'perfil',
          name: 'client-profile',
          component: () => import('../views/forms/ClientProfileView.vue'),
        },
      ],
    },
    {
      path: '/panel-veterinario',
      meta: { requiresAuth: true, allowedRoles: ['VETERINARIO', 'SUPERADMIN'] },
      component: () => import('../layouts/PanelLayout.vue'),
      children: [
        // Inicio anterior del panel veterinario; se conserva para enlaces guardados.
        { path: '', redirect: { name: 'dashboard' } },
        {
          path: 'clientes',
          name: 'vet-clientes',
          component: () => import('@/views/veterinario/ClientesView.vue'),
        },
        {
          path: 'agenda',
          name: 'vet-agenda',
          component: () => import('@/views/veterinario/AgendaView.vue'),
        },
        {
          path: 'turnos',
          name: 'vet-turnos',
          component: () => import('@/views/veterinario/TurnosGestionView.vue'),
        },
        {
          path: 'usuarios',
          name: 'vet-usuarios',
          meta: { allowedRoles: ['SUPERADMIN'] },
          component: () => import('@/views/veterinario/UsersView.vue'),
        },
        {
          path: 'offline',
          name: 'vet-offline',
          component: () => import('@/views/veterinario/OfflineView.vue'),
        },
      ],
    },
    {
      // Gestión de agenda, tutores y lectura de fichas, conectada a la API.
      path: '/panel-administrativo',
      meta: { requiresAuth: true, allowedRoles: ['ADMINISTRATIVO', 'SUPERADMIN'] },
      component: () => import('../layouts/PanelLayout.vue'),
      children: [
        {
          path: '',
          name: 'admin-turnos',
          component: () => import('@/views/admin/TurnosView.vue'),
        },
        {
          path: 'tutores',
          children: [
            {
              path: '',
              name: 'admin-tutores',
              component: () => import('@/views/admin/TutoresView.vue'),
            },
            {
              path: ':id',
              name: 'admin-tutor',
              props: true,
              component: () => import('@/views/admin/TutorDetailView.vue'),
            },
          ],
        },
        {
          path: 'fichas',
          children: [
            {
              path: '',
              name: 'admin-fichas',
              component: () => import('@/views/admin/FichasView.vue'),
            },
            {
              path: ':id',
              name: 'admin-ficha',
              props: true,
              component: () => import('@/views/admin/FichaView.vue'),
            },
          ],
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
  if (!canAccess(to.matched, user.rol)) return { name: 'acceso-denegado' }

  if (user.rol === 'CLIENTE' && !user.profileComplete && to.name !== 'client-profile') {
    return { name: 'client-profile', query: { redirect: to.fullPath } }
  }

  if (user.rol === 'CLIENTE' && user.profileComplete && to.name === 'client-profile') {
    return { name: 'dashboard' }
  }

  return true
})

export default router
