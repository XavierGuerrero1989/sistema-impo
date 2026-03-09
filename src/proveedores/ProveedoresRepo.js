import { dbLocal } from "../offline/db";

export async function getProveedoresLocal() {
  return await dbLocal.proveedores.toArray();
}

export async function getProveedorById(proveedorId) {
  return await dbLocal.proveedores.get(proveedorId);
}

export async function crearProveedor(proveedor) {
  proveedor.createdAt = new Date();
  proveedor.updatedAt = new Date();

  return await dbLocal.proveedores.put(proveedor);
}

export async function actualizarProveedor(proveedorId, data) {
  data.updatedAt = new Date();

  return await dbLocal.proveedores.update(proveedorId, data);
}

export async function eliminarProveedor(proveedorId) {
  return await dbLocal.proveedores.delete(proveedorId);
}