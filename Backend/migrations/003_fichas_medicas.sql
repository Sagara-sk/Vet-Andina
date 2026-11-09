
-- 1. Campo específico para documentar correcciones de evoluciones.
ALTER TABLE evolucion_clinica
  ADD COLUMN IF NOT EXISTS detalle_fe_erratas TEXT;

-- 2. Crear fichas para animales que todavía no tengan una.
-- La restricción UNIQUE de id_animal evita duplicados.
INSERT INTO ficha_medica (id_animal)
SELECT a.id_animal
FROM animal a
LEFT JOIN ficha_medica f ON f.id_animal = a.id_animal
WHERE f.id_ficha IS NULL
ON CONFLICT (id_animal) DO NOTHING;

-- 3. Evitar que una ficha con evoluciones pueda eliminarse
-- indirectamente mediante una eliminación en cascada.
ALTER TABLE evolucion_clinica
  DROP CONSTRAINT IF EXISTS evolucion_clinica_id_ficha_fkey;

ALTER TABLE evolucion_clinica
  ADD CONSTRAINT evolucion_clinica_id_ficha_fkey
  FOREIGN KEY (id_ficha)
  REFERENCES ficha_medica(id_ficha)
  ON DELETE RESTRICT;

-- 4. Función que impide modificar o eliminar evoluciones.
CREATE OR REPLACE FUNCTION impedir_modificacion_evolucion_clinica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Las evoluciones clínicas son inmutables. Para corregir un registro, agregue una fe de erratas.'
    USING ERRCODE = '55000';
END;
$$;

-- 5. Protección ante UPDATE y DELETE.
DROP TRIGGER IF EXISTS evolucion_clinica_inmutable
  ON evolucion_clinica;

CREATE TRIGGER evolucion_clinica_inmutable
BEFORE UPDATE OR DELETE ON evolucion_clinica
FOR EACH ROW
EXECUTE FUNCTION impedir_modificacion_evolucion_clinica();

-- 6. También impedir TRUNCATE de la tabla.
DROP TRIGGER IF EXISTS evolucion_clinica_no_truncate
  ON evolucion_clinica;

CREATE TRIGGER evolucion_clinica_no_truncate
BEFORE TRUNCATE ON evolucion_clinica
FOR EACH STATEMENT
EXECUTE FUNCTION impedir_modificacion_evolucion_clinica();

-- 7. Índice para consultar rápidamente el historial cronológico.
CREATE INDEX IF NOT EXISTS evolucion_clinica_ficha_fecha_idx
  ON evolucion_clinica (id_ficha, fecha_hora_registro);
