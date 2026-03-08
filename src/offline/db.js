import Dexie from "dexie";

export const dbLocal = new Dexie("sistema_impo");

dbLocal.version(1).stores({
  operaciones: "&id, estado, proveedor, deleted, updatedAtLocal",
  outbox: "++key, entityType, entityId, op, createdAt",
  meta: "key",
});

dbLocal.version(2).stores({
  operaciones: "&id, estado, proveedor, deleted, updatedAtLocal",
  outbox: "++key, entityType, entityId, op, createdAt",
  meta: "key",
  proveedores: "++id, proveedorId, nombreComercial, pais"
});