ALTER TABLE evolucion_clinica
  ADD COLUMN IF NOT EXISTS tipo_registro VARCHAR(32) NOT NULL DEFAULT 'CONSULTA',
  ADD COLUMN IF NOT EXISTS detalles_especificos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fecha_hora_atencion TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'evolucion_clinica'::regclass
      AND conname = 'evolucion_clinica_tipo_registro_check'
  ) THEN
    ALTER TABLE evolucion_clinica
      ADD CONSTRAINT evolucion_clinica_tipo_registro_check
      CHECK (tipo_registro IN (
        'CONSULTA',
        'PESO',
        'VACUNA',
        'DESPARASITACION',
        'TRATAMIENTO_GRUPAL',
        'EVENTO_POBLACIONAL'
      ));
  END IF;
END $$;
