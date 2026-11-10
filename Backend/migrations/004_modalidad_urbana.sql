-- Unifica la modalidad urbana como URBANO en turnos y evoluciones.
-- Los clientes de API antiguos que envian CONSULTORIO se normalizan en los controladores.

DO $$
DECLARE
  constraint_row RECORD;
  column_type TEXT;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'turno'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%modalidad%'
  LOOP
    EXECUTE format('ALTER TABLE turno DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'turno'
    AND column_name = 'modalidad';

  IF column_type = 'USER-DEFINED' THEN
    ALTER TABLE turno
      ALTER COLUMN modalidad TYPE VARCHAR USING modalidad::text;
  END IF;

  UPDATE turno SET modalidad = 'URBANO' WHERE modalidad::text = 'CONSULTORIO';

  ALTER TABLE turno
    ADD CONSTRAINT turno_modalidad_duracion_check
    CHECK (
      (modalidad = 'URBANO' AND duracion_minutos = 30)
      OR (modalidad = 'RURAL' AND duracion_minutos BETWEEN 60 AND 120)
    );

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'evolucion_clinica'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%modalidad%'
  LOOP
    EXECUTE format(
      'ALTER TABLE evolucion_clinica DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;

  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'evolucion_clinica'
    AND column_name = 'modalidad';

  IF column_type = 'USER-DEFINED' THEN
    ALTER TABLE evolucion_clinica
      ALTER COLUMN modalidad TYPE VARCHAR USING modalidad::text;
  END IF;

  UPDATE evolucion_clinica
  SET modalidad = 'URBANO'
  WHERE modalidad::text = 'CONSULTORIO';

  ALTER TABLE evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_modalidad_check
    CHECK (modalidad IN ('URBANO', 'RURAL'));
END $$;
