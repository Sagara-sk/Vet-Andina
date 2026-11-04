-- Turnos: estado para los que todavía no se confirmaron con el tutor, y
-- columnas opcionales para el motivo de la consulta y el de cancelación.
-- Solo agrega; no modifica ni borra datos existentes.

ALTER TYPE estado_turno ADD VALUE IF NOT EXISTS 'PENDIENTE' BEFORE 'PENDIENTE_PAGO';

ALTER TABLE turno
  ADD COLUMN IF NOT EXISTS motivo VARCHAR(300),
  ADD COLUMN IF NOT EXISTS motivo_cancelacion VARCHAR(500);
