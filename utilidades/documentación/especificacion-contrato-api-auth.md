# Especificación del Contrato de API: Módulo de Autenticación (/auth)

La presente especificación técnica define el contrato formal de la interfaz de programación de aplicaciones (API REST) para el módulo de autenticación del sistema de gestión veterinaria **Vet Andina**. Este documento establece las estructuras de datos de entrada (*payloads*), los encabezados de comunicación, el comportamiento de las sesiones orientadas a cookies seguras y los objetos de respuesta JSON codificados con sus respectivos códigos de estado HTTP.

---

## 1. Aspectos Generales y Seguridad

El backend de **Vet Andina** está implementado en Node.js con Express y TypeScript, conectado a una base de datos PostgreSQL Serverless alojada en Neon. La gestión de identidades y sesiones sigue las siguientes directivas de arquitectura y seguridad:

- **Ruta Base de Autenticación**: `/api/auth`
- **Formato de Intercambio**: `application/json`
- **Mecanismo de Sesión**: JSON Web Token (JWT) firmado en el servidor y transmitido mediante cookies HTTP seguras (`HttpOnly`, `Secure`, `SameSite=Strict`).
- **Seguridad en Navegadores**: Las peticiones desde la aplicación cliente (Vue 3 / Vite) deben incluir obligatoriamente el parámetro `credentials: 'include'` en cada llamada HTTP (`fetch` o `axios`) para permitir la transmisión e inspección de la cookie de sesión.
- **Protección contra Almacenamiento Inseguro**: El token JWT nunca se expone en el cuerpo de la respuesta HTTP para consumo en JavaScript ni se almacena en `localStorage` o `sessionStorage`, mitigando riesgos de ataques de script entre sitios (XSS).

---

## 2. Roles de Usuario en el Sistema

El atributo `rol` dentro de las respuestas de autenticación corresponde al tipo enumerado (`rol_usuario`) configurado en la base de datos de Neon:

| Rol Enumerado | Denominación Oficial | Alcance y Descripción |
| :--- | :--- | :--- |
| `SUPERADMIN` | Dirección General / Administrador del Sistema | Control total del sistema, auditoría de logs, gestión de personal y configuración global. |
| `ADMINISTRATIVO` | Personal de Recepción y Administración | Coordinación de agencias, atención al público, alta de tutores y gestión de turnos. |
| `VETERINARIO` | Médico Veterinario / Profesional Sanitario | Atención médica en consultorio y campo, registro de evoluciones clínicas e historial. |
| `CLIENTE` | Tutor / Propietario de Animales | Registro autónomo, consulta de historias clínicas propias y reserva de turnos. |

---

## 3. Inicio de Sesión: `POST /api/auth/login`

Valida las credenciales ingresadas por el usuario contra el registro almacenado en la base de datos de PostgreSQL mediante comparación de hash `bcrypt`. Ante una autenticación exitosa, genera la cookie de sesión y devuelve el perfil público del usuario.

### Solicitud (Request)
- **Método HTTP**: `POST`
- **Ruta**: `/api/auth/login`
- **Encabezados**: `Content-Type: application/json`

#### Cuerpo de la Solicitud (Payload)
```json
{
  "email": "persona@ejemplo.com",
  "contrasena": "una-clave-de-al-menos-8-caracteres"
}
```

### Respuestas Esperadas (Responses)

#### Respuesta Exitosa: `200 OK`
Se establece la cookie de sesión HttpOnly en los encabezados HTTP (`Set-Cookie`) y se retorna el objeto de confirmación:

```json
{
  "status": "ok",
  "user": {
    "id": "e3b0c442-98fc-11ee-b9d1-0242ac120002",
    "nombreCompleto": "María González",
    "email": "persona@ejemplo.com",
    "rol": "CLIENTE"
  }
}
```

#### Error por Datos Faltantes o Formato Inválido: `400 Bad Request`
Ocurre cuando falta alguno de los campos requeridos o el correo electrónico no cumple con la sintaxis estándar.

```json
{
  "status": "error",
  "message": "Ingresá un email y una contraseña válidos."
}
```

#### Error por Credenciales Incorrectas: `401 Unauthorized`
Respuesta genérica por seguridad cuando la cuenta no existe o la contraseña no coincide con el hash almacenado.

```json
{
  "status": "error",
  "message": "Credenciales inválidas."
}
```

#### Error Interno del Servidor: `500 Internal Server Error`
Se emite ante fallos imprevistos de infraestructura o pérdida de conexión con la base de datos en Neon.

```json
{
  "status": "error",
  "message": "No fue posible iniciar sesión."
}
```

---

## 4. Cierre de Sesión: `POST /api/auth/logout`

Invalida y elimina la cookie de sesión activa en el navegador del cliente.

### Solicitud (Request)
- **Método HTTP**: `POST`
- **Ruta**: `/api/auth/logout`
- **Encabezados**: `Content-Type: application/json` (requiere `credentials: 'include'`)
- **Cuerpo de la Solicitud**: Vacío `{}`

### Respuestas Esperadas (Responses)

#### Respuesta Exitosa: `200 OK`
Limpia la cookie de sesión en los encabezados de respuesta y confirma el cierre:

```json
{
  "status": "ok",
  "message": "Sesión cerrada."
}
```

#### Error Interno del Servidor: `500 Internal Server Error`
```json
{
  "status": "error",
  "message": "No se pudo cerrar la sesión."
}
```

---

## 5. Estado de la Sesión Actual: `GET /api/auth/me`

Inspecciona la validez del token JWT en la cookie enviada por el navegador. Se utiliza al recargar la aplicación para rehidratar el estado reactivo del usuario en Pinia.

*(Nota: En la arquitectura del repositorio backend, este endpoint también se expone bajo la ruta alias `GET /api/auth/session`)*.

### Solicitud (Request)
- **Método HTTP**: `GET`
- **Ruta**: `/api/auth/me` (o `/api/auth/session`)
- **Encabezados**: Requiere transmisión automática de cookies mediante `credentials: 'include'`
- **Cuerpo de la Solicitud**: Vacío

### Respuestas Esperadas (Responses)

#### Respuesta Exitosa: `200 OK`
Retorna la identidad activa del usuario autenticado:

```json
{
  "status": "ok",
  "user": {
    "id": "e3b0c442-98fc-11ee-b9d1-0242ac120002",
    "nombreCompleto": "María González",
    "email": "persona@ejemplo.com",
    "rol": "CLIENTE"
  }
}
```

#### Error de Sesión Ausente o Expirada: `401 Unauthorized`
Se emite cuando la cookie no está presente, ha superado su tiempo de vida de 8 horas o la firma JWT no es válida.

```json
{
  "status": "error",
  "message": "Sesión no válida."
}
```

#### Error Interno del Servidor: `500 Internal Server Error`
```json
{
  "status": "error",
  "message": "No fue posible verificar la sesión."
}
```

---

## 6. Matriz de Resumen de Códigos HTTP

| Endpoint | Método | Código HTTP | Condición / Escenario |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | `200 OK` | Autenticación exitosa y emisión de cookie. |
| `/api/auth/login` | `POST` | `400 Bad Request` | Formato de email o contraseña inválido/incompleto. |
| `/api/auth/login` | `POST` | `401 Unauthorized` | Email no registrado o contraseña incorrecta. |
| `/api/auth/login` | `POST` | `500 Internal Error` | Fallo de conexión con PostgreSQL en Neon. |
| `/api/auth/logout` | `POST` | `200 OK` | Cookie de sesión eliminada correctamente. |
| `/api/auth/me` | `GET` | `200 OK` | Sesión activa y token JWT válido. |
| `/api/auth/me` | `GET` | `401 Unauthorized` | Cookie ausente, alterada o expirada. |
