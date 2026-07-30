import { dbLocal } from "../offline/db";
import { normalizarEntidad, validarEntidad } from "../domain/entidadLogistica";
import { entidadConfig } from "./entidadesConfig";

const tableFor = (tipo) => dbLocal[entidadConfig(tipo).tabla];

export async function getEntidadesLocal(tipo) {
  return tableFor(tipo).toArray();
}

export async function getEntidadById(tipo, entidadId) {
  return tableFor(tipo).get(entidadId);
}

export async function crearEntidad(tipo, input) {
  const config = entidadConfig(tipo);
  const entidad = normalizarEntidad(input);
  const errors = validarEntidad(entidad, config.singular);
  if (errors.length) throw new Error(errors.join("\n"));
  if (await tableFor(tipo).get(entidad.entidadId)) {
    throw new Error(`Ya existe un ${config.singular} con ese ID`);
  }
  entidad.createdAt = new Date();
  entidad.updatedAt = new Date();

  await dbLocal.transaction("rw", tableFor(tipo), dbLocal.outbox, async () => {
    await tableFor(tipo).put(entidad);
    await dbLocal.outbox.add({
      entityType: config.tipo,
      entityId: entidad.entidadId,
      op: "upsert",
      createdAt: Date.now(),
    });
  });
  return entidad.entidadId;
}

export async function actualizarEntidad(tipo, entidadId, data) {
  const config = entidadConfig(tipo);
  const current = await tableFor(tipo).get(entidadId);
  const entidad = normalizarEntidad({ ...current, ...data, entidadId });
  const errors = validarEntidad(entidad, config.singular);
  if (errors.length) throw new Error(errors.join("\n"));
  entidad.updatedAt = new Date();

  return dbLocal.transaction("rw", tableFor(tipo), dbLocal.outbox, async () => {
    const updated = await tableFor(tipo).update(entidadId, entidad);
    if (!updated) throw new Error(`${config.singular} no encontrado`);
    await dbLocal.outbox.add({
      entityType: config.tipo,
      entityId: entidadId,
      op: "upsert",
      createdAt: Date.now(),
    });
    return updated;
  });
}

export async function eliminarEntidad(tipo, entidadId) {
  const config = entidadConfig(tipo);
  return dbLocal.transaction("rw", tableFor(tipo), dbLocal.outbox, async () => {
    await tableFor(tipo).delete(entidadId);
    await dbLocal.outbox.add({
      entityType: config.tipo,
      entityId: entidadId,
      op: "delete",
      createdAt: Date.now(),
    });
  });
}
