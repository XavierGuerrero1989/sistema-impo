import { dbLocal } from "./db";

/* ======================================================
   CREAR / ACTUALIZAR OPERACIÓN (OFFLINE FIRST)
====================================================== */
export async function upsertOperacionLocal(operacion) {
  if (!operacion?.id) {
    throw new Error("La operación debe tener un ID");
  }

  const now = Date.now();

  const data = {
    /* =========================
       FLAGS LOCALES (SIEMPRE)
    ========================== */
    id: operacion.id,
    deleted: false,
    dirty: true,                 // pendiente de sync
    updatedAtLocal: now,

    /* =========================
       DATOS DE NEGOCIO
    ========================== */
    ...operacion,
  };

  await dbLocal.transaction("rw", dbLocal.operaciones, dbLocal.outbox, async () => {
    await dbLocal.operaciones.put(data);
    await dbLocal.outbox.add({
      entityType: "operacion",
      entityId: data.id,
      op: "upsert",
      createdAt: now,
    });
  });

  window.dispatchEvent(new CustomEvent("data:changed", {
    detail: { entityType: "operacion", entityId: data.id },
  }));
  return data;
}

/* ======================================================
   OBTENER TODAS LAS OPERACIONES ACTIVAS
====================================================== */
export async function getOperacionesLocal() {
  const all = await dbLocal.operaciones.toArray();
  return all.filter((op) => op.deleted !== true);
}

export async function getOperacionesEliminadasLocal() {
  const all = await dbLocal.operaciones.toArray();
  return all.filter((op) => op.deleted === true);
}

/* ======================================================
   OBTENER OPERACIÓN POR ID
====================================================== */
export async function getOperacionByIdLocal(id) {
  return dbLocal.operaciones.get(id);
}

/* ======================================================
   MARCAR OPERACIÓN COMO ELIMINADA (SOFT DELETE)
====================================================== */
export async function deleteOperacionLocal(id) {
  const now = Date.now();

  const op = await dbLocal.operaciones.get(id);
  if (!op) return;

  const deletedOp = {
    ...op,
    deleted: true,
    dirty: true,
    updatedAtLocal: now,
  };

  await dbLocal.transaction("rw", dbLocal.operaciones, dbLocal.outbox, async () => {
    await dbLocal.operaciones.put(deletedOp);
    await dbLocal.outbox.add({
      entityType: "operacion",
      entityId: id,
      op: "delete",
      createdAt: now,
    });
  });

  window.dispatchEvent(new CustomEvent("data:changed", {
    detail: { entityType: "operacion", entityId: id },
  }));
}

export async function restaurarOperacionLocal(id) {
  const operacion = await dbLocal.operaciones.get(id);
  if (!operacion?.deleted) return;

  return upsertOperacionLocal({
    ...operacion,
    deleted: false,
    restoredAt: new Date().toISOString(),
  });
}

/* ======================================================
   LIMPIAR FLAG DIRTY (DESPUÉS DE SYNC OK)
====================================================== */
export async function markOperacionAsSynced(id) {
  const op = await dbLocal.operaciones.get(id);
  if (!op) return;

  await dbLocal.operaciones.put({
    ...op,
    dirty: false,
  });
}
