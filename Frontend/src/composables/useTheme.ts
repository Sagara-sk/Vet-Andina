import { computed, ref } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'vet-andina-theme'

// Preferencia de este navegador; si no hay una guardada, sigue al sistema.
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Sin acceso al almacenamiento (modo privado, bloqueado): se usa el del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Compartido entre componentes: el layout aplica la clase y el menú la cambia.
const theme = ref<Theme>(initialTheme())

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      // Si no se puede guardar, el cambio vale solo para esta visita.
    }
  }

  return { isDark, toggleTheme }
}
