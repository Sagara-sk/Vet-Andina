
import { createRouter, createWebHistory } from 'vue-router'

// ======================================================
// IMPORTACIONES
// ======================================================

// Layout general de las páginas públicas.
import PublicLayout from '../layouts/PublicLayout.vue'

// Vistas públicas.
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'

// Gestión de autenticación y autorización.
import { useSessionStore } from '@/stores/session'
import { canAccess } from './access'

// ======================================================
// CONFIGURACIÓN DEL ROUTER
// ======================================================

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [

    // ==================================================
    // 1. RUTAS PÚBLICAS
    // ==================================================
    // Accesibles sin iniciar sesión.
    // No requieren permisos ni validación de roles.
    // ==================================================

    {
      path: '/',
      component: PublicLayout,

      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'turnos',
          name: 'turnos',
          component: () => import('../views/TurnosView.vue'),
        },
      ],
    },

    // Inicio de sesión.
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },

    // Registro de nuevos clientes.
    {
      path: '/registro',
      name: 'registro',
      component: RegistroView,
    },

    // Página de acceso denegado (403).
    {
      path: '/acceso-denegado',
      name: 'acceso-denegado',
      component: () => import('../views/AccesoDenegadoView.vue'),
    },


    // ==================================================
    // 2. DASHBOARD GENERAL
    // ==================================================
    // Punto de entrada común para todos los usuarios
    // autenticados.
    //
    // Roles habilitados:
    // - CLIENTE
    // - VETERINARIO
    // - ADMINISTRATIVO
    // - SUPERADMIN
    //
    // DashboardView determina qué módulos visualizar
    // según el perfil del usuario.
    // ==================================================

    {
      path: '/dashboard',

      meta: {
        requiresAuth: true,
        allowedRoles: [
          'CLIENTE',
          'VETERINARIO',
          'ADMINISTRATIVO',
          'SUPERADMIN',
        ],
      },

      component: () => import('../layouts/PanelLayout.vue'),

      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
      ],
    },


    // ==================================================
    // 3. PANEL DE CLIENTES
    // ==================================================
    // Accesible para usuarios con rol CLIENTE.
    //
    // La diferenciación entre clientes se realiza
    // mediante tipoPersona:
    //
    // - INDIVIDUAL: cliente urbano.
    // - EMPRESA_PRODUCTOR: cliente rural.
    //
    // Las rutas rurales también requieren tipoPersona EMPRESA_PRODUCTOR.
    // ==================================================

    {
      path: '/panel',

      meta: {
        requiresAuth: true,
        allowedRoles: ['CLIENTE'],
      },

      component: () => import('../layouts/PanelLayout.vue'),

      children: [

        // Conserva la ruta inicial anterior del panel
        // y redirige al dashboard general.
        {
          path: '',
          redirect: { name: 'dashboard' },
        },

        // ----------------------------------------------
        // FUNCIONALIDADES DEL CLIENTE
        // ----------------------------------------------

        // Gestión de mascotas (cliente urbano).
        {
          path: 'mascotas',
          name: 'panel-mascotas',
          component: () => import('../views/panel/PetsView.vue'),
        },
        {
          path: 'animales/nuevo',
          name: 'panel-animal-nuevo',
          component: () => import('../views/panel/ClientAnimalRegistrationView.vue'),
          meta: {
            title: 'Registrar mascota o lote',
          },
        },

        // Gestión de establecimientos (cliente rural).
        {
          path: 'mascotas/:id/ficha',
          name: 'panel-mascota-ficha',
          props: true,
          component: () => import('@/views/admin/FichaView.vue'),
        },
        {
          path: 'establecimientos/lotes/:id/ficha',
          name: 'panel-lote-ficha',
          props: true,
          component: () => import('@/views/admin/FichaView.vue'),
          meta: {
            title: 'Ficha de lote rural',
            allowedTipoPersona: ['EMPRESA_PRODUCTOR'],
          },
        },
        {
          path: 'establecimientos',
          name: 'panel-establecimientos',
          component: () => import('../views/panel/EstablishmentsView.vue'),
          meta: {
            title: 'Mis establecimientos',
            allowedTipoPersona: ['EMPRESA_PRODUCTOR'],
          },
        },

        // Reserva de turnos veterinarios.
        {
          path: 'reservar',
          name: 'panel-reservar',
          component: () => import('../views/panel/ReservaTurnoView.vue'),
          meta: {
            title: 'Reservar turno',
          },
        },

        // Consulta de turnos del cliente.
        {
          path: 'turnos',
          name: 'panel-turnos',
          component: () => import('../views/panel/AppointmentsView.vue'),
        },

        // Configuración y datos personales del cliente.
        // Se utiliza durante el registro y la configuración
        // inicial del perfil.
        {
          path: 'perfil',
          name: 'client-profile',
          component: () => import('../views/forms/ClientProfileView.vue'),
        },
      ],
    },


    // ==================================================
    // 4. PANEL VETERINARIO
    // ==================================================
    // Accesible para:
    // - VETERINARIO
    // - SUPERADMIN
    //
    // Permite consultar tutores, agenda, turnos y
    // funcionalidades operativas veterinarias.
    // ==================================================

    {
      path: '/panel-veterinario',

      meta: {
        requiresAuth: true,
        allowedRoles: [
          'VETERINARIO',
          'SUPERADMIN',
        ],
      },

      component: () => import('../layouts/PanelLayout.vue'),

      children: [

        // Conserva la ruta inicial anterior del panel.
        {
          path: '',
          redirect: { name: 'dashboard' },
        },

        // ----------------------------------------------
        // FUNCIONALIDADES VETERINARIAS
        // ----------------------------------------------

        // Consulta del padrón de tutores.
        {
          path: 'tutores',
          children: [
            {
              path: '',
              name: 'vet-tutores',
              component: () => import('@/views/admin/TutoresView.vue'),
            },
            {
              path: ':id',
              name: 'vet-tutor',
              props: true,
              component: () => import('@/views/admin/TutorDetailView.vue'),
            },
          ],
        },

        // Administración de la agenda veterinaria.
        {
          path: 'agenda',
          name: 'vet-agenda',
          component: () => import('@/views/veterinario/AgendaView.vue'),
        },

        // Gestión de turnos veterinarios.
        {
          path: 'turnos',
          name: 'vet-turnos',
          component: () => import('@/views/veterinario/TurnosGestionView.vue'),
        },

        // Administración de usuarios.
        // Acceso exclusivo del SUPERADMIN.
        {
          path: 'fichas',
          children: [
            {
              path: '',
              name: 'vet-fichas',
              component: () => import('@/views/admin/FichasView.vue'),
            },
            {
              path: ':id',
              name: 'vet-ficha',
              props: true,
              component: () => import('@/views/admin/FichaView.vue'),
            },
          ],
        },
        {
          path: 'usuarios',
          name: 'vet-usuarios',

          meta: {
            allowedRoles: ['SUPERADMIN'],
          },

          component: () => import('@/views/veterinario/UsersView.vue'),
        },

        // Funcionalidades disponibles sin conexión.
        {
          path: 'offline',
          name: 'vet-offline',
          component: () => import('@/views/veterinario/OfflineView.vue'),
        },
      ],
    },


    // ==================================================
    // 5. PANEL ADMINISTRATIVO
    // ==================================================
    // Accesible para:
    // - ADMINISTRATIVO
    // - SUPERADMIN
    //
    // Permite gestionar turnos, tutores y consultar
    // las fichas correspondientes.
    // ==================================================

    {
      path: '/panel-administrativo',

      meta: {
        requiresAuth: true,
        allowedRoles: [
          'ADMINISTRATIVO',
          'SUPERADMIN',
        ],
      },

      component: () => import('../layouts/PanelLayout.vue'),

      children: [

        // ----------------------------------------------
        // GESTIÓN DE TURNOS
        // ----------------------------------------------

        {
          path: '',
          name: 'admin-turnos',
          component: () => import('@/views/admin/TurnosView.vue'),
        },

        // ----------------------------------------------
        // AGENDA GENERAL DE VETERINARIOS
        // ----------------------------------------------

        {
          path: 'agenda',
          name: 'admin-agenda',
          component: () => import('@/views/admin/AgendaView.vue'),
        },

        // ----------------------------------------------
        // GESTIÓN DE TUTORES
        // ----------------------------------------------

        {
          path: 'tutores',

          children: [
            {
              path: '',
              name: 'admin-tutores',
              component: () => import('@/views/admin/TutoresView.vue'),
            },
            {
              // Detalle de un tutor identificado por su ID.
              path: ':id',
              name: 'admin-tutor',
              props: true,
              component: () => import('@/views/admin/TutorDetailView.vue'),
            },
          ],
        },

        // ----------------------------------------------
        // CONSULTA Y GESTIÓN DE FICHAS
        // ----------------------------------------------

        {
          path: 'fichas',

          children: [
            {
              path: '',
              name: 'admin-fichas',
              component: () => import('@/views/admin/FichasView.vue'),
            },
            {
              // Detalle de una ficha identificada por su ID.
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

  // ====================================================
  // COMPORTAMIENTO DE DESPLAZAMIENTO
  // ====================================================
  // Al navegar a un ancla, realiza un desplazamiento suave.
  // En cualquier otra navegación, vuelve al inicio.
  // ====================================================

  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    return { top: 0 }
  },
})


// ======================================================
// 6. MIDDLEWARE GLOBAL DE AUTENTICACIÓN Y AUTORIZACIÓN
// ======================================================
// Se ejecuta antes de cada navegación.
//
// Responsabilidades:
// 1. Permitir el acceso a rutas públicas.
// 2. Recuperar y verificar la sesión.
// 3. Redirigir usuarios no autenticados al login.
// 4. Comprobar los permisos del rol.
// 5. Exigir que los clientes completen su perfil.
// ======================================================
router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some(
    (record) => record.meta.requiresAuth,
  )

  if (!requiresAuth) return true

  const sessionStore = useSessionStore()
  const user = await sessionStore.ensureSession()

  if (!user) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  // El cliente debe completar su perfil antes de acceder
  // a las secciones específicas de su tipo de persona.
  if (user.rol === 'CLIENTE' && !user.profileComplete) {
    if (to.name !== 'client-profile') {
      return {
        name: 'client-profile',
        query: { redirect: to.fullPath },
      }
    }
  }

  // Un cliente con perfil completo ya no necesita volver
  // al formulario de configuración inicial.
  if (user.rol === 'CLIENTE' && user.profileComplete) {
    if (to.name === 'client-profile') {
      return { name: 'dashboard' }
    }
  }

  // Comprueba los permisos de todos los niveles de la ruta.
  if (!canAccess(to.matched, user.rol, user.tipoPersona)) {
    return { name: 'acceso-denegado' }
  }

  return true
})
// ======================================================
// EXPORTACIÓN
// ======================================================

export default router
