import { dbLocal } from "../offline/db";
import { normalizarProveedor, validarProveedor } from "../domain/proveedor";

export async function getProveedoresLocal() {
  return await dbLocal.proveedores.toArray();
}

export async function getProveedorById(proveedorId) {
  return await dbLocal.proveedores.get(proveedorId);
}

export async function crearProveedor(proveedor) {
  proveedor = normalizarProveedor(proveedor);
  const errors = validarProveedor(proveedor);
  if (errors.length) throw new Error(errors.join("\n"));
  const proveedorId = proveedor.proveedorId;
  if (await dbLocal.proveedores.get(proveedorId)) {
    throw new Error("Ya existe un proveedor con ese ID");
  }
  proveedor.createdAt = new Date();
  proveedor.updatedAt = new Date();
  proveedor.proveedorId = proveedorId;

  await dbLocal.transaction("rw", dbLocal.proveedores, dbLocal.outbox, async () => {
    await dbLocal.proveedores.put(proveedor);
    await dbLocal.outbox.add({
      entityType: "proveedor",
      entityId: proveedorId,
      op: "upsert",
      createdAt: Date.now(),
    });
  });

  return proveedorId;
}

export async function actualizarProveedor(proveedorId, data) {
  const current = await dbLocal.proveedores.get(proveedorId);
  data = normalizarProveedor({ ...current, ...data, proveedorId });
  const errors = validarProveedor(data);
  if (errors.length) throw new Error(errors.join("\n"));
  data.updatedAt = new Date();
  return dbLocal.transaction("rw", dbLocal.proveedores, dbLocal.outbox, async () => {
    const updated = await dbLocal.proveedores.update(proveedorId, data);
    if (!updated) throw new Error("Proveedor no encontrado");
    await dbLocal.outbox.add({
      entityType: "proveedor",
      entityId: proveedorId,
      op: "upsert",
      createdAt: Date.now(),
    });
    return updated;
  });
}

export async function eliminarProveedor(proveedorId) {
  return dbLocal.transaction("rw", dbLocal.proveedores, dbLocal.outbox, async () => {
    await dbLocal.proveedores.delete(proveedorId);
    await dbLocal.outbox.add({
      entityType: "proveedor",
      entityId: proveedorId,
      op: "delete",
      createdAt: Date.now(),
    });
  });
}
