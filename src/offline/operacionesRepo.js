import { dbLocal } from "./db";

/**
 * Crear o actualizar una operación en IndexedDB
 * y registrar el cambio en la outbox para sync.
 */
export async function upsertOperacionLocal(operacion) {
  const now = Date.now();

  const data = {
    // flags locales (SIEMPRE presentes)
    deleted: false,
    dirty: true,
    updatedAtLocal: now,

    // datos reales de la operación
    ...operacion,
  };

  // 1️⃣ Guardar operación local
  await dbLocal.operaciones.put(data);

  // 2️⃣ Registrar cambio en outbox
  await dbLocal.outbox.add({
    entityType: "operacion",
    entityId: data.id,
    op: "upsert",
    createdAt: now,
  });

  return data;
}

/**
 * Obtener todas las operaciones locales activas
 */
export async function getOperacionesLocal() {
  const all = await dbLocal.operaciones.toArray();
  return all.filter(op => op.deleted !== true);
}

/**
 * Obtener una operación por ID
 */
export async function getOperacionByIdLocal(id) {
  return dbLocal.operaciones.get(id);
}
