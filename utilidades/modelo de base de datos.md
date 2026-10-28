# Modelo de Base de Datos en Neon (PostgreSQL) — Proyecto Vet Andina

Este documento detalla la arquitectura, estructura relacional, tipos de datos, restricciones e inmutabilidad de la base de datos de **Vet Andina**, alojada en el servicio **Neon (Serverless Postgres)**.

---

## 1. Visión General y Decisiones de Arquitectura

La base de datos constituye el núcleo de persistencia relacional y clínica del sistema. Su diseño responde tanto a las necesidades operativas de la atención médica urbana (mascotas individuales en consultorio) como a la logística ganadera rural (fincas, lotes y salidas a campo).

### Principales Características Técnicas:
* **Motor:** PostgreSQL (Serverless en Neon Cloud) con SSL obligatorio (`sslmode=require`).
* **Extensiones Nativas Habilitadas:**
  * `uuid-ossp`: Para la generación de identificadores únicos universales (UUID v4) en claves primarias.
  * `postgis`: Para el almacenamiento y procesamiento de datos geoespaciales y coordenadas GPS (`GEOMETRY(Point, 4326)`).
* **Modelo Clínico *Append-Only* (Solo Adición):** Las entradas de la historia clínica (`evolucion_clinica`) no admiten modificaciones (`PUT`, `PATCH`) ni eliminaciones (`DELETE`) para resguardar la validez médico-legal. Cualquier corrección se realiza mediante un registro de **Fe de Erratas** vinculado a la entrada original.
* **Estructura Híbrida (Relacional + JSONB):** Uso de campos `JSONB` en evoluciones clínicas para almacenar de forma flexible datos dinámicos como vacunas aplicadas, listas de estudios y archivos adjuntos.

---

## 2. Tipos Enumerados (ENUMs)

Para mantener la integridad y consistencia en el dominio del sistema, se definen los siguientes tipos ENUM:

* **`rol_usuario`**: `'SUPERADMIN'`, `'ADMINISTRATIVO'`, `'VETERINARIO'`, `'CLIENTE'`
* **`tipo_atencion`**: `'URBANO'`, `'RURAL'`
* **`estado_ficha`**: `'ACTIVO'`, `'INACTIVO'`, `'FALLECIDO'`
* **`estado_visita`**: `'PROGRAMADA'`, `'EN_TRANSITO'`, `'COMPLETADA'`, `'CANCELADA'`
* **`modalidad_turno`**: `'CONSULTORIO'`, `'RURAL'`
* **`estado_turno`**: `'PENDIENTE_PAGO'`, `'CONFIRMADO'`, `'REPROGRAMADO'`, `'CANCELADA'`, `'COMPLETADO'`, `'AUSENTE'`

---

## 3. Diagrama de Entidades y Relaciones

```text
                               ┌─────────────┐
                               │   Usuario   │
                               └──────┬──────┘
                                      │ 1:1 (opcional)
                               ┌──────┴──────┐
                               │   Duenio    │
                               └──────┬──────┘
                                      │ 1:N
             ┌────────────────────────┴────────────────────────┐
             ▼                                                 ▼
      ┌────────────┐                                     ┌────────────┐
      │   Finca    │ ◄────────────────────────────────── │   Animal   │
      └─────┬──────┘                 1:N                 └─────┬──────┘
            │ 1:N                                              │ 1:1
            ▼                                                  ▼
      ┌────────────┐                                     ┌────────────┐
      │   Visita   │                                     │Ficha_Medica│
      └─────┬──────┘                                     └─────┬──────┘
            │ 1:N                                              │ 1:N
            └────────────────────┐    ┌────────────────────────┘
                                 ▼    ▼
                              ┌──────────┐
                              │  Turno   │
                              └────┬─────┘
                                   │ 1:N
                                   ▼
                       ┌──────────────────────┐
                       │  Evolucion_Clinica   │
                       └──────────────────────┘
```

---

## 4. Diccionario de Datos y Tablas

El modelo está compuesto por **8 tablas principales**:

### 4.1. Tabla `Usuario`
Garantiza la autenticación, seguridad y control de acceso basado en roles (RBAC) para el personal clínico, administrativo y clientes.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_usuario` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador único del usuario. |
| `nombre_completo` | `VARCHAR(255)` | `NOT NULL` | Nombre y apellido del usuario. |
| `rol` | `rol_usuario` | `NOT NULL`, `DEFAULT 'CLIENTE'` | Rol asignado para el control de accesos. |
| `matricula_profesional`| `VARCHAR(100)` | `NULLABLE` | Matrícula médica (obligatoria para veterinarios). |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Correo electrónico de acceso. |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Credencial encriptada (Argon2id/BCrypt). |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Marca de tiempo de registro. |

---

### 4.2. Tabla `Duenio`
Almacena la información de los clientes/dueños de animales urbanos o productores rurales.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_duenio` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador único del dueño. |
| `id_usuario` | `UUID` | `NULLABLE`, `UNIQUE`, `REFERENCES Usuario(id_usuario)` | Enlace opcional con la cuenta de usuario web. |
| `nombre_completo` | `VARCHAR(255)` | `NOT NULL` | Nombre y apellido o razón social. |
| `dni_cuit` | `VARCHAR(50)` | `NULLABLE`, `UNIQUE` | Documento de identidad o identificación fiscal. |
| `telefono` | `VARCHAR(50)` | `NOT NULL` | Teléfono principal (obligatorio para WhatsApp). |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Correo electrónico de contacto. |
| `localidad` | `VARCHAR(100)` | `NOT NULL` | Localidad de residencia o fiscal. |
| `direccion_urbana` | `VARCHAR(255)` | `NULLABLE` | Domicilio urbano (para clientes de consultorio). |
| `turnos_inasistidos_count`| `INT` | `DEFAULT 0` | Contadores de ausencias para control de señas. |
| `requiere_senia_forzada`| `BOOLEAN` | `DEFAULT FALSE` | Indicador administrativo de cobro obligatorio. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de creación. |

---

### 4.3. Tabla `Finca`
Registra los establecimientos ganaderos o predios rurales donde se realizan atenciones veterinarias a campo.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_finca` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador de la finca. |
| `id_duenio` | `UUID` | `NOT NULL`, `REFERENCES Duenio(id_duenio) ON DELETE CASCADE` | Propietario o responsable del establecimiento. |
| `nombre_finca` | `VARCHAR(255)` | `NOT NULL` | Nombre del campo o establecimiento. |
| `localidad` | `VARCHAR(100)` | `NOT NULL` | Localidad o departamento rural. |
| `direccion_texto` | `VARCHAR(255)` | `NULLABLE` | Indicaciones escritas o paraje. |
| `ubicacion_gis` | `GEOMETRY(Point, 4326)` | `NULLABLE` | Coordenadas GPS (Latitud/Longitud via PostGIS). |
| `observaciones_acceso`| `TEXT` | `NULLABLE` | Detalle logístico del camino de llegada. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de registro. |

---

### 4.4. Tabla `Animal`
Maneja tanto a los pacientes individuales (mascotas urbanas) como a los lotes o tropas de ganado (entorno rural).

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_animal` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador único del paciente/lote. |
| `id_duenio` | `UUID` | `NOT NULL`, `REFERENCES Duenio(id_duenio) ON DELETE CASCADE` | Dueño responsable del animal o lote. |
| `id_finca` | `UUID` | `NULLABLE`, `REFERENCES Finca(id_finca) ON DELETE SET NULL` | Finca asignada (obligatoria en entorno rural). |
| `tipo_atencion` | `tipo_atencion` | `NOT NULL` | `'URBANO'` o `'RURAL'`. |
| `nombre_identificacion`| `VARCHAR(255)` | `NOT NULL` | Nombre de la mascota o identificador del lote. |
| `especie` | `VARCHAR(100)` | `NOT NULL` | Especie (ej. Canino, Felino, Bovino, Equino). |
| `raza` | `VARCHAR(100)` | `NULLABLE` | Raza del animal. |
| `cantidad_en_lote` | `INT` | `DEFAULT 1` | `1` para mascota urbana; $>1$ para tropas rurales. |
| `fecha_nacimiento` | `DATE` | `NULLABLE` | Fecha estimada o exacta de nacimiento. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de alta. |

---

### 4.5. Tabla `Ficha_Medica`
Funciona como el expediente o carátula principal del paciente o lote. Mantiene una relación de 1 a 1 exacta con la tabla `Animal`.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_ficha` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador de la ficha. |
| `id_animal` | `UUID` | `NOT NULL`, `UNIQUE`, `REFERENCES Animal(id_animal) ON DELETE CASCADE` | Animal o lote al que pertenece la ficha (1:1). |
| `fecha_apertura` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de apertura de la historia clínica. |
| `alergias_antecedentes`| `TEXT` | `NULLABLE` | Antecedentes mórbidos o alergias preexistentes. |
| `estado` | `estado_ficha` | `DEFAULT 'ACTIVO'` | Estado de la ficha (`ACTIVO`, `INACTIVO`, `FALLECIDO`). |

---

### 4.6. Tabla `Visita`
Modela la logística, viáticos y planificación de las salidas a campo para atenciones rurales agrupadas.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_visita` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador único de la salida rural. |
| `id_finca` | `UUID` | `NOT NULL`, `REFERENCES Finca(id_finca) ON DELETE CASCADE` | Finca o establecimiento de destino. |
| `id_veterinario` | `UUID` | `NOT NULL`, `REFERENCES Usuario(id_usuario) ON DELETE RESTRICT` | Veterinario a cargo del viaje. |
| `fecha_programada` | `DATE` | `NOT NULL` | Fecha agendada para el traslado. |
| `estado` | `estado_visita` | `DEFAULT 'PROGRAMADA'` | Estado del viaje a campo. |
| `costo_traslado` | `DECIMAL(10,2)` | `NOT NULL`, `DEFAULT 0.00` | Costo asignado en concepto de viáticos/traslado. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Registro del agendamiento de visita. |

---

### 4.7. Tabla `Turno`
Administra las citas programadas tanto para el consultorio urbano como para la atención individual en salidas a campo.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_turno` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador del turno. |
| `id_duenio` | `UUID` | `NOT NULL`, `REFERENCES Duenio(id_duenio) ON DELETE CASCADE` | Dueño solicitante del servicio. |
| `id_animal` | `UUID` | `NOT NULL`, `REFERENCES Animal(id_animal) ON DELETE CASCADE` | Paciente o lote a atender. |
| `id_veterinario` | `UUID` | `NULLABLE`, `REFERENCES Usuario(id_usuario) ON DELETE SET NULL` | Veterinario asignado para la atención. |
| `id_visita` | `UUID` | `NULLABLE`, `REFERENCES Visita(id_visita) ON DELETE SET NULL` | Visita rural vinculada (si aplica). |
| `fecha_hora` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL` | Fecha y hora agendada. |
| `modalidad` | `modalidad_turno` | `NOT NULL` | `'CONSULTORIO'` o `'RURAL'`. |
| `estado` | `estado_turno` | `DEFAULT 'CONFIRMADO'` | Estado de la cita. |
| `requiere_senia` | `BOOLEAN` | `DEFAULT FALSE` | Indica si exigió pago anticipado de seña. |
| `monto_senia` | `DECIMAL(10,2)` | `NULLABLE` | Monto pagado por reserva. |
| `comprobante_senia_url`| `VARCHAR(500)` | `NULLABLE` | Enlace al comprobante de transferencia subido. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de creación del turno. |

---

### 4.8. Tabla `Evolucion_Clinica`
Representa el historial clínico inmutable (*Append-Only*). Acumula cronológicamente todas las atenciones médicas realizadas en consultorio o campo.

| Columna | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_evolucion` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Identificador único de la entrada médica. |
| `id_ficha` | `UUID` | `NOT NULL`, `REFERENCES Ficha_Medica(id_ficha) ON DELETE CASCADE` | Ficha médica a la que pertenece la entrada. |
| `id_autor` | `UUID` | `NOT NULL`, `REFERENCES Usuario(id_usuario) ON DELETE RESTRICT` | Profesional o administrativo que registra. |
| `id_turno` | `UUID` | `NULLABLE`, `REFERENCES Turno(id_turno) ON DELETE SET NULL` | Turno de origen de la consulta. |
| `fecha_hora_registro` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Marca de tiempo inalterable del registro. |
| `modalidad` | `modalidad_turno` | `NOT NULL` | Modalidad de la atención (`CONSULTORIO`/`RURAL`). |
| `motivo_consulta` | `TEXT` | `NOT NULL` | Motivo declarado para la consulta. |
| `diagnostico` | `TEXT` | `NULLABLE` | Diagnóstico profesional determinado. |
| `tratamiento` | `TEXT` | `NULLABLE` | Indicaciones o plan farmacológico. |
| `vacunas_aplicadas` | `JSONB` | `NULLABLE` | Datos estructurados de vacunas y dosis. |
| `archivos_adjuntos` | `JSONB` | `NULLABLE` | Enlaces a estudios, imágenes o análisis en PDF. |
| `es_fe_de_erratas` | `BOOLEAN` | `DEFAULT FALSE` | Indicador si la entrada es una corrección. |
| `id_evolucion_referenciada`| `UUID` | `NULLABLE`, `REFERENCES Evolucion_Clinica(id_evolucion) ON DELETE SET NULL` | Enlace a la evolución original que se está aclarando. |

---

## 5. Script DDL Completo en SQL Nativo

El siguiente código SQL permite regenerar el esquema completo de la base de datos en una consola o cliente conectado a Neon:

```sql
-- --------------------------------------------------
-- 1. EXTENSIONES REQUERIDAS
-- --------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- --------------------------------------------------
-- 2. TIPOS ENUMERADOS
-- --------------------------------------------------
CREATE TYPE rol_usuario AS ENUM ('SUPERADMIN', 'ADMINISTRATIVO', 'VETERINARIO', 'CLIENTE');
CREATE TYPE tipo_atencion AS ENUM ('URBANO', 'RURAL');
CREATE TYPE estado_ficha AS ENUM ('ACTIVO', 'INACTIVO', 'FALLECIDO');
CREATE TYPE estado_visita AS ENUM ('PROGRAMADA', 'EN_TRANSITO', 'COMPLETADA', 'CANCELADA');
CREATE TYPE modalidad_turno AS ENUM ('CONSULTORIO', 'RURAL');
CREATE TYPE estado_turno AS ENUM ('PENDIENTE_PAGO', 'CONFIRMADO', 'REPROGRAMADO', 'CANCELADA', 'COMPLETADO', 'AUSENTE');

-- --------------------------------------------------
-- 3. CREACIÓN DE TABLAS
-- --------------------------------------------------

-- TABLA: Usuario
CREATE TABLE Usuario (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'CLIENTE',
    matricula_profesional VARCHAR(100) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: Duenio
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

-- TABLA: Finca
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

-- TABLA: Animal
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

-- TABLA: Ficha_Medica
CREATE TABLE Ficha_Medica (
    id_ficha UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_animal UUID NOT NULL UNIQUE REFERENCES Animal(id_animal) ON DELETE CASCADE,
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alergias_antecedentes TEXT NULL,
    estado estado_ficha DEFAULT 'ACTIVO'
);

-- TABLA: Visita
CREATE TABLE Visita (
    id_visita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_finca UUID NOT NULL REFERENCES Finca(id_finca) ON DELETE CASCADE,
    id_veterinario UUID NOT NULL REFERENCES Usuario(id_usuario) ON DELETE RESTRICT,
    fecha_programada DATE NOT NULL,
    estado estado_visita DEFAULT 'PROGRAMADA',
    costo_traslado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: Turno
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

-- TABLA: Evolucion_Clinica
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
```