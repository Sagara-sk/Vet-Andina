-- --------------------------------------------------
-- TIPOS ENUMERADOS (ENUMS)
-- --------------------------------------------------
CREATE TYPE rol_usuario AS ENUM ('SUPERADMIN', 'ADMINISTRATIVO', 'VETERINARIO', 'CLIENTE');
CREATE TYPE tipo_atencion AS ENUM ('URBANO', 'RURAL');
CREATE TYPE estado_ficha AS ENUM ('ACTIVO', 'INACTIVO', 'FALLECIDO');
CREATE TYPE estado_visita AS ENUM ('PROGRAMADA', 'EN_TRANSITO', 'COMPLETADA', 'CANCELADA');
CREATE TYPE modalidad_turno AS ENUM ('CONSULTORIO', 'RURAL');
CREATE TYPE estado_turno AS ENUM ('PENDIENTE_PAGO', 'CONFIRMADO', 'REPROGRAMADO', 'CANCELADA', 'COMPLETADO', 'AUSENTE');

-- --------------------------------------------------
-- TABLA: Usuario (Seguridad y Roles)
-- --------------------------------------------------
CREATE TABLE Usuario (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'CLIENTE',
    matricula_profesional VARCHAR(100) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- TABLA: Duenio (Clientes / Tutores)
-- --------------------------------------------------
CREATE TABLE Duenio (
    id_duenio UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NULL UNIQUE REFERENCES Usuario(id_usuario) ON DELETE SET NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    dni_cuit VARCHAR(50) NULL UNIQUE,
    telefono VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    direccion_urbana VARCHAR(255) NULL,
    turnos_inasistidos_count INT DEFAULT 0,
    requiere_senia_forzada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- TABLA: Finca (Establecimientos Rurales)
-- --------------------------------------------------
CREATE TABLE Finca (
    id_finca UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_duenio UUID NOT NULL REFERENCES Duenio(id_duenio) ON DELETE CASCADE,
    nombre_finca VARCHAR(255) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    direccion_texto VARCHAR(255) NULL,
    ubicacion_gis GEOMETRY(Point, 4326) NULL,
    observaciones_acceso TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- TABLA: Animal (Pacientes / Lotes)
-- --------------------------------------------------
CREATE TABLE Animal (
    id_animal UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_duenio UUID NOT NULL REFERENCES Duenio(id_duenio) ON DELETE CASCADE,
    id_finca UUID NULL REFERENCES Finca(id_finca) ON DELETE SET NULL,
    tipo_atencion tipo_atencion NOT NULL,
    nombre_identificacion VARCHAR(255) NOT NULL,
    especie VARCHAR(100) NOT NULL,
    raza VARCHAR(100) NULL,
    cantidad_en_lote INT DEFAULT 1,
    fecha_nacimiento DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- TABLA: Ficha_Medica (Carátula del Expediente)
-- --------------------------------------------------
CREATE TABLE Ficha_Medica (
    id_ficha UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_animal UUID NOT NULL UNIQUE REFERENCES Animal(id_animal) ON DELETE CASCADE,
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alergias_antecedentes TEXT NULL,
    estado estado_ficha DEFAULT 'ACTIVO'
);

-- --------------------------------------------------
-- TABLA: Visita (Logística Rural)
-- --------------------------------------------------
CREATE TABLE Visita (
    id_visita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_finca UUID NOT NULL REFERENCES Finca(id_finca) ON DELETE CASCADE,
    id_veterinario UUID NOT NULL REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    fecha_programada DATE NOT NULL,
    estado estado_visita DEFAULT 'PROGRAMADA',
    costo_traslado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- TABLA: Turno (Gestión de Citas)
-- --------------------------------------------------
CREATE TABLE Turno (
    id_turno UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_duenio UUID NOT NULL REFERENCES Duenio(id_duenio) ON DELETE CASCADE,
    id_animal UUID NOT NULL REFERENCES Animal(id_animal) ON DELETE CASCADE,
    id_veterinario UUID NULL REFERENCES Usuario(id_usuario) ON DELETE SET NULL,
    id_visita UUID NULL REFERENCES Visita(id_visita) ON DELETE SET NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    modalidad modalidad_turno NOT NULL,
    estado estado_turno DEFAULT 'CONFIRMADO',
    requiere_senia BOOLEAN DEFAULT FALSE,
    monto_senia DECIMAL(10,2) NULL,
    comprobante_senia_url VARCHAR(500) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- TABLA: Evolucion_Clinica (Historial Inmutable)
-- --------------------------------------------------
CREATE TABLE Evolucion_Clinica (
    id_evolucion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ficha UUID NOT NULL REFERENCES Ficha_Medica(id_ficha) ON DELETE CASCADE,
    id_autor UUID NOT NULL REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    id_turno UUID NULL REFERENCES Turno(id_turno) ON DELETE SET NULL,
    fecha_hora_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modalidad modalidad_turno NOT NULL,
    motivo_consulta TEXT NOT NULL,
    diagnostico TEXT NULL,
    tratamiento TEXT NULL,
    vacunas_aplicadas JSONB NULL,
    archivos_adjuntos JSONB NULL,
    es_fe_de_erratas BOOLEAN DEFAULT FALSE,
    id_evolucion_referenciada UUID NULL REFERENCES Evolucion_Clinica(id_evolucion) ON DELETE SET NULL
);