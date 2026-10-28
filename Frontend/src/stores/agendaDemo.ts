import { ref } from 'vue'
import { defineStore } from 'pinia'
import { clientesDemo, crearTurnosDemo, type TurnoDemo } from '@/data/agendaMock'
import { useSessionStore } from '@/stores/session'

// Agenda de demostración compartida por Dashboard, Agenda, Gestión de turnos y
// Clientes. Vive solo en memoria: al recargar vuelve a los datos de ejemplo.
// Al integrar el Backend, estas acciones pasan a llamar a la API y la vista no cambia.
export const useAgendaDemoStore = defineStore('agendaDemo', () => {
  const session = useSessionStore()
  const turnos = ref<TurnoDemo[]>(crearTurnosDemo())
  const clientes = clientesDemo

  const cliente = (id: number) => clientes.find((c) => c.id === id)

  // Matriz de roles: el superadmin modifica cualquier turno; el veterinario,
  // solo los asignados a él. La API tendrá que aplicar la misma regla.
  function puedeModificar(turno: TurnoDemo) {
    const user = session.user
    if (!user) return false
    if (user.rol === 'SUPERADMIN') return true
    return user.rol === 'VETERINARIO' && turno.veterinario === user.nombreCompleto
  }

  function turnoModificable(id: number) {
    const turno = turnos.value.find((t) => t.id === id)
    return turno && puedeModificar(turno) ? turno : undefined
  }

  function turnosDelDia(dia: Date) {
    return turnos.value
      .filter((t) => t.estado !== 'cancelado' && mismoDia(t.fechaHora, dia))
      .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
  }

  function reprogramar(id: number, fecha: string, hora: string) {
    const turno = turnoModificable(id)
    if (!turno) return

    const nueva = fecha ? new Date(`${fecha}T00:00`) : new Date(turno.fechaHora)
    const [hh, mm] = (hora || horaDe(turno.fechaHora)).split(':').map(Number)
    nueva.setHours(hh ?? 0, mm ?? 0, 0, 0)

    turno.fechaHora = nueva
    turno.estado = 'pendiente'
  }

  function cancelar(id: number, motivo: string) {
    const turno = turnoModificable(id)
    if (!turno) return
    turno.estado = 'cancelado'
    turno.motivoCancelacion = motivo || undefined
  }

  function confirmar(id: number) {
    const turno = turnoModificable(id)
    if (turno?.estado === 'pendiente') turno.estado = 'confirmado'
  }

  return { turnos, clientes, cliente, puedeModificar, turnosDelDia, reprogramar, cancelar, confirmar }
})

export function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function horaDe(fecha: Date) {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
}
