# ImportSys

Sistema interno de gestión de importaciones para un único cliente. Incluye
operaciones, proveedores, logística, documentos, finanzas y funcionamiento
offline.

## Requisitos

- Node.js 20 o superior
- Un proyecto de Firebase con Authentication, Firestore y Storage

## Instalación

1. Ejecutar `npm install`.
2. Copiar las variables de Firebase a un archivo `.env`.
3. Ejecutar `npm run dev`.

## Comprobaciones

- `npm run lint`: revisa problemas de código.
- `npm run build`: genera la versión de producción.
- `npm test`: ejecuta las pruebas automatizadas del dominio.
- `npm run check`: ejecuta análisis, pruebas y compilación.

## Firebase

Las reglas se encuentran en `firestore.rules` y `storage.rules`. Para publicarlas:

`firebase deploy --only firestore:rules,storage`

Publicar reglas es una acción independiente de compilar o desplegar la interfaz.

## Funcionamiento offline

Cada usuario autenticado utiliza una base IndexedDB separada. Las operaciones y
proveedores pendientes se guardan en una cola local y se sincronizan cuando
regresa la conexión. La primera sesión posterior a esta actualización migra los
datos de la base local anterior al primer usuario autenticado.

## Seguridad

El sistema es para un único cliente; no contiene tenants ni organizaciones.
Los roles internos requieren definir inicialmente la cuenta administradora antes
de activar las reglas restrictivas definitivas.

La cuenta administradora principal configurada es
`xavierignacioguerrero@gmail.com`. Desde la pantalla Usuarios puede asignar los
roles `admin`, `operaciones`, `finanzas` y `lectura`.

## Trazabilidad

Los cambios relevantes se incorporan al historial de cada operación. La pantalla
Historial permite buscar por operación, proveedor, evento o usuario, filtrar por
fechas y exportar los resultados a CSV.
