# Formularios de registro e inicio de sesión

## Propósito

Esta guía registra los campos, el contrato con la API y los criterios de diagnóstico para los formularios de autenticación. Distingue los roles del sistema de los datos que puede seleccionar un visitante público y ayuda a evitar que un error de red se confunda con un rechazo de credenciales.

La política completa de roles, permisos, sesiones y recursos está en [Autenticación y autorización](./Autenticaci%C3%B3n%20y%20autorizaci%C3%B3n.md) y la matriz funcional en [Matriz de roles y acciones](./Matriz%20de%20roles%20y%20acciones.md).

## Registro público

### Campos requeridos

El formulario público solo crea cuentas de **Cliente**. Solicita:

| Campo visible | Nombre JSON enviado | Reglas actuales |
| --- | --- | --- |
| Nombre completo | `nombreCompleto` | Obligatorio, entre 2 y 200 caracteres. |
| Correo electrónico | `email` | Obligatorio, formato email, hasta 254 caracteres; debe ser único. |
| Teléfono móvil | `telefono` | Obligatorio, entre 6 y 50 caracteres. Se utiliza para coordinación de turnos. |
| Localidad | `localidad` | Obligatoria, entre 2 y 150 caracteres. |
| Contraseña | `contrasena` | Obligatoria, mínimo 8 caracteres y máximo 72 bytes UTF-8 para bcrypt. |
| Confirmar contraseña | No se envía | Solo se usa en el frontend para comprobar que ambas contraseñas coincidan. |

El navegador no debe mostrar un selector de rol ni enviar el campo `rol`. El backend asigna `CLIENTE`; no se permite que un registro público cree cuentas Superadmin, Administrativas o Veterinarias. Tras el alta, el backend establece la cookie de sesión para habilitar el paso siguiente. El formulario solo confirma éxito cuando `POST /api/auth/register` devuelve una respuesta exitosa.

### Paso adicional del perfil de tutor

Después del registro inicial, `/registro/perfil` solicita únicamente los datos complementarios del perfil: DNI/CUIT, tipo de persona, dirección urbana opcional y, si corresponde, nombre de la finca. Nombre, email, teléfono y localidad ya se guardan durante el primer paso; el segundo formulario verifica la sesión y no depende de `sessionStorage`.

El formulario envía el siguiente contrato a `POST /api/duenios/perfil`, con `credentials: 'include'`:

```json
{
  "dni_cuit": "20123456789",
  "tipo_persona": "EMPRESA_PRODUCTOR",
  "direccion_urbana": null,
  "nombre_finca": "Estancia La Esperanza"
}
```

El endpoint autentica mediante la cookie y admite solo rol `CLIENTE`. Actualiza `duenio` dentro de una transacción; si hay finca, crea o actualiza `finca` y copia la localidad del perfil. `EMPRESA_PRODUCTOR` requiere nombre de finca. La migración `Backend/migrations/001_add_duenio_tipo_persona.sql` debe estar aplicada para guardar el tipo de persona.

Respuestas: `200` perfil guardado; `400` payload inválido; `401` sesión ausente/inválida; `403` rol no permitido; `409` DNI/CUIT ya usado; `503` esquema de base no preparado; `500` fallo inesperado de persistencia. El backend no devuelve éxito si faltan columnas necesarias o falla el guardado de finca.

### Contrato del endpoint

`POST /api/auth/register`

```json
{
  "nombreCompleto": "Nombre Apellido",
  "email": "persona@ejemplo.com",
  "telefono": "+54 9 299 000 0000",
  "localidad": "Cipolletti",
  "contrasena": "una-clave-de-al-menos-8-caracteres"
}
```

- `201`: cuenta Cliente creada.
- `400`: campos faltantes o inválidos.
- `409`: email ya registrado.
- `500`: error inesperado del servidor o de persistencia; consultar los logs del backend sin registrar contraseñas ni datos sensibles.

## Inicio de sesión

El formulario solicita únicamente email y contraseña. Envía `{ "email": "...", "contrasena": "..." }` a `POST /api/auth/login`, incluyendo `credentials: 'include'`.

La API compara la contraseña con el hash almacenado en PostgreSQL. Si es válida, establece la cookie de sesión JWT `HttpOnly`; no devuelve el JWT en el cuerpo. La sesión no debe persistirse en `localStorage` ni exponerse a JavaScript.

Después del login, el frontend dirige a la persona al destino solicitado protegido o a su panel correspondiente. En el estado actual del frontend hay rutas de panel para `CLIENTE` y `VETERINARIO`; los roles `SUPERADMIN` y `ADMINISTRATIVO` requieren que se implementen sus paneles/rutas antes de habilitar esa navegación.

## Diagnóstico de errores

`Failed to fetch` o el mensaje “No se pudo conectar con la API” significa que el navegador no obtuvo una respuesta HTTP legible. No confirma que el email o la contraseña sean incorrectos. Una credencial inválida debería producir una respuesta HTTP `401` con un mensaje del backend; otros errores de validación o persistencia también producen respuestas HTTP.

1. Desde `Backend/`, iniciar el servidor con `npm run dev` y mantener esa terminal abierta.
2. Comprobar `http://localhost:3000/api/health`. Debe responder `status: ok`.
3. Comprobar `http://localhost:3000/api/db/health`. Debe responder `database.connected: 1`; si no, verificar que `DATABASE_URL` sea la conexión real de PostgreSQL y que la base esté disponible. Los valores de ejemplo no son credenciales funcionales.
4. Abrir la aplicación exactamente en `http://localhost:5173` y comprobar que `Frontend/.env` define `VITE_API_BASE_URL=http://localhost:3000`. Reiniciar Vite después de editar `.env`, porque las variables `VITE_*` se leen al iniciar el servidor.
5. `Frontend/vite.config.ts` usa el puerto 5173 en modo estricto. Si está ocupado, Vite debe informar el conflicto; cerrar el proceso que lo usa o elegir de forma coordinada otro puerto y permitir el origen exacto en `FRONTEND_URL` dentro de `Backend/.env`.
6. Verificar que `Backend/.env` contenga `FRONTEND_URL` como origen, incluyendo esquema y puerto, por ejemplo `http://localhost:5173` (sin path `/registro`). Si se usa `http://127.0.0.1:5173`, permitir también ese origen o usar consistentemente `localhost`.
7. En herramientas del navegador (`F12` → **Network**), buscar `POST /api/auth/login`:
   - **No aparece:** el formulario/script no llegó a ejecutar la solicitud; revisar errores de consola y recargar la página.
   - **`ERR_CONNECTION_REFUSED`, timeout o fallo DNS:** URL/puerto incorrectos o backend detenido.
   - **Error CORS / preflight:** el origen real de la barra del navegador no coincide con `FRONTEND_URL`; revisar también `Access-Control-Allow-Origin` y `Access-Control-Allow-Credentials`.
   - **`401`:** la solicitud sí llegó a la API; revisar email y contraseña, y confirmar que la cuenta se creó en la misma base PostgreSQL usada por el backend.
   - **`500`:** la solicitud sí llegó a la API; revisar el log del servidor. Para login, causas posibles incluyen conexión/esquema de base no disponible.
   - **`200` pero el panel no abre:** revisar guardas, rol devuelto y cookie/sesión; es un problema posterior a la conexión.

Compartir para diagnóstico únicamente el estado HTTP, mensaje no sensible, URL de la página (sin parámetros privados) y errores CORS/Network. Nunca compartir contraseñas, cookies, JWT, contenido de `.env` ni información clínica.

## Configuración local segura

- `Frontend/.env.example` documenta `VITE_API_BASE_URL`; crear `Frontend/.env` local a partir de ese ejemplo.
- `Backend/.env.example` documenta los nombres esperados. Sustituir todos los valores de muestra por valores válidos de entorno; en particular, `DATABASE_URL` debe ser una conexión real y `JWT_SECRET` un secreto aleatorio de al menos 32 bytes.
- Mantener ambos `.env` locales fuera de Git. No pegar sus contenidos en issues, chats ni capturas.

## Referencias de implementación

- Formulario de registro: `Frontend/src/components/login/RegisterForm.vue`.
- Formulario de login: `Frontend/src/components/login/LoginForm.vue`.
- Cliente de API de autenticación: `Frontend/src/services/auth.ts`.
- URL base del backend: `Frontend/src/config/api.ts`.
- Puerto de Vite: `Frontend/vite.config.ts`.
- CORS y rutas de la API: `Backend/src/app.ts`.
- Validación HTTP de login/registro: `Backend/src/controllers/auth.controller.ts`.
- Persistencia y hashing: `Backend/src/services/auth.service.ts` y `Backend/src/models/owner.model.ts`.
