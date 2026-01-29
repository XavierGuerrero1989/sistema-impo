import { dbLocal } from "./db";

/**
 * Guarda o actualiza una operación en IndexedDB
 */
export async function upsertOperacionLocal(operacion) {
  const now = Date.now();

  const data = {
    ...operacion,

    // flags locales
    deleted: false,  // soft delete (por si más adelante lo usás) 
    updatedAtLocal: now,
    dirty: true,        // tiene cambios pendientes de sync
      
  };

  await dbLocal.operaciones.put(data);

  return data;
}

/**
 * Obtiene todas las operaciones locales (no borradas)
 */
export async function getOperacionesLocal() {
  const all = await dbLocal.operaciones.toArray();
  return all.filter(op => op.deleted !== true);
}


/**
 * Obtiene una operación por ID
 */
export async function getOperacionByIdLocal(id) {
  return dbLocal.operaciones.get(id);
}
