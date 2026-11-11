# Vet-Andina – Modo Offline   npm run preview 

## Descripción

Vet-Andina permite consultar fichas clínicas y registrar evoluciones veterinarias sin conexión a internet, especialmente durante visitas a zonas rurales.

## Tecnologías utilizadas

- **Vue 3 y TypeScript:** interfaz de la aplicación.
- **Service Worker:** almacena los archivos necesarios para cargar la aplicación sin conexión.
- **IndexedDB:** guarda fichas clínicas descargadas y evoluciones pendientes.
- **LocalStorage:** conserva una copia básica del perfil del usuario para recuperar el acceso a las funciones offline.

## ¿Cómo funciona?

1. **Preparación:** con internet, el usuario descarga las fichas de los animales que necesitará. También se almacenan los archivos de la aplicación y las vistas necesarias para trabajar offline.
2. **Trabajo sin conexión:** puede consultar las fichas descargadas y registrar nuevas evoluciones como borradores locales.
3. **Sincronización:** cuando vuelve internet, los borradores pueden enviarse al servidor mediante la opción **Enviar al servidor**.

## Pruebas realizadas

Se comprobó la carga de la aplicación sin conexión, la consulta de fichas descargadas, la recuperación del perfil del usuario, el almacenamiento de evoluciones offline y su posterior sincronización con el servidor.

## Limitaciones

Es necesario iniciar sesión y descargar previamente las fichas con conexión a internet. Las búsquedas, nuevas descargas y operaciones que requieren el servidor tampoco están disponibles offline.

## Resultado

El modo offline permite continuar el trabajo veterinario sin conexión, conservar los registros realizados y sincronizarlos con el servidor cuando se recupera internet.