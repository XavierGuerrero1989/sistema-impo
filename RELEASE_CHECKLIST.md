# Lista de publicación de SISTEMA-IMPO

## Antes de publicar

- Confirmar que `xavierignacioguerrero@gmail.com` existe en Firebase Authentication.
- Exportar o respaldar Firestore.
- Ejecutar `npm install` y `npm run check`.
- Probar creación, edición, eliminación y restauración de una operación.
- Probar un ciclo offline: editar sin conexión, recuperar conexión y verificar Firestore.
- Probar carga, validación, rechazo y eliminación de un PDF menor a 10 MB.
- Confirmar que un usuario de solo lectura no puede modificar datos.

## Publicación

1. Publicar reglas de Firestore y Storage:
   `firebase deploy --only firestore:rules,storage`
2. Publicar la interfaz mediante el flujo habitual de Vercel.
3. Ingresar con la cuenta administradora.
4. Abrir Usuarios y asignar roles a las demás cuentas.

## Verificación posterior

- Revisar que Operaciones, Proveedores, Documentos, Finanzas y Logística carguen.
- Confirmar que el indicador superior muestre `Conectado`.
- Revisar la pantalla Historial.
- Confirmar que no existan errores de permisos en el navegador.
- Mantener disponible la versión anterior durante la primera jornada.

## Reversión

Si aparece un problema, volver a desplegar la versión anterior de la interfaz y
restaurar las reglas anteriores. No borrar IndexedDB: puede contener cambios
offline todavía no sincronizados.
