ALTER TABLE public.duenio
  ADD COLUMN IF NOT EXISTS tipo_persona varchar(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'duenio_tipo_persona_check'
      AND conrelid = 'public.duenio'::regclass
  ) THEN
    ALTER TABLE public.duenio
      ADD CONSTRAINT duenio_tipo_persona_check
      CHECK (
        tipo_persona IS NULL
        OR tipo_persona IN ('INDIVIDUAL', 'EMPRESA_PRODUCTOR')
      );
  END IF;
END;
$$;
