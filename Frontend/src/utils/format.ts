const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function time(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} h`
}

// "Jueves 4 de septiembre, 10:30 h"
export function formatLongDate(date: Date) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}, ${time(date)}`
}

// "4 sep, 10:30 h"
export function formatShortDate(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]!.slice(0, 3)}, ${time(date)}`
}

// "Rocco" -> "RO", "Pedro Gómez" -> "PG"
export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2)
  return letters.toUpperCase()
}
