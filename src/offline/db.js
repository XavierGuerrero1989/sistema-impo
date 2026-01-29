// src/offline/db.js
import Dexie from "dexie";

export const dbLocal = new Dexie("sistema_impo");

dbLocal.version(1).stores({
  // Operaciones (entidad principal)
  operaciones: "id, estado, proveedor, updatedAtLocal",

  // Cola de sincronización (outbox)
  outbox: "++key, entityType, entityId, op, createdAt",

  // Metadata (última sync, flags, etc.)
  meta: "key",
});
