
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
    // IMPORTANTE:
    // Las restricciones específicas por tipoPersona
    // se incorporarán posteriormente en access.ts.
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

        // Gestión de establecimientos (cliente rural).
        {
          path: 'establecimientos',
          name: 'panel-establecimientos',
          component: () => import('../views/panel/EstablishmentsView.vue'),
          meta: {
            title: 'Mis establecimientos',
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
    // Permite gestionar clientes, agenda, turnos y
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

        // Consulta y gestión de clientes.
        {
          path: 'clientes',
          name: 'vet-clientes',
          component: () => import('@/views/veterinario/ClientesView.vue'),
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

  // ----------------------------------------------------
  // 1. VALIDACIÓN DE RUTA PÚBLICA
  // ----------------------------------------------------
  // Si ningún registro de la ruta requiere autenticación,
  // permite continuar sin consultar la sesión.

  const requiresAuth = to.matched.some(
    (record) => record.meta.requiresAuth,
  )

  if (!requiresAuth) {
    return true
  }


  // ----------------------------------------------------
  // 2. RECUPERACIÓN DE LA SESIÓN
  // ----------------------------------------------------
  // Pinia mantiene la sesión en memoria.
  // ensureSession consulta la API solamente cuando todavía
  // no se verificó la sesión durante la carga actual.

  const sessionStore = useSessionStore()
  const user = await sessionStore.ensureSession()


  // ----------------------------------------------------
  // 3. VALIDACIÓN DE AUTENTICACIÓN
  // ----------------------------------------------------
  // Si no existe una sesión válida, redirige al login.
  // Conserva la ruta solicitada para recuperarla después.

  if (!user) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }


  // ----------------------------------------------------
  // 4. VALIDACIÓN DE AUTORIZACIÓN
  // ----------------------------------------------------
  // Comprueba que el rol del usuario tenga permiso para
  // acceder a todos los niveles de la ruta solicitada.
  //
  // Las restricciones se centralizan en access.ts.

  if (!canAccess(to.matched, user.rol)) {
    return {
      name: 'acceso-denegado',
    }
  }


  // ----------------------------------------------------
  // 5. VALIDACIÓN DEL PERFIL DEL CLIENTE
  // ----------------------------------------------------
  // Los clientes deben completar su perfil antes de
  // utilizar el resto de las funcionalidades.
  //
  // Esta condición no afecta a veterinarios,
  // administrativos ni superadministradores.

  if (
    user.rol === 'CLIENTE' &&
    !user.profileComplete &&
    to.name !== 'client-profile'
  ) {
    return {
      name: 'client-profile',
      query: {
        redirect: to.fullPath,
      },
    }
  }


  // ----------------------------------------------------
  // 6. VALIDACIÓN DE PERFIL YA COMPLETADO
  // ----------------------------------------------------
  // Un cliente con perfil completo no necesita volver
  // a ingresar al formulario de configuración inicial.

  if (
    user.rol === 'CLIENTE' &&
    user.profileComplete &&
    to.name === 'client-profile'
  ) {
    return {
      name: 'dashboard',
    }
  }


  // Todas las validaciones fueron superadas.
  return true
})


// ======================================================
// EXPORTACIÓN
// ======================================================

export default router
