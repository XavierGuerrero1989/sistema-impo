import { dbLocal } from "../offline/db";

export async function getProveedoresLocal() {
  return await dbLocal.proveedores.toArray();
}

export async function getProveedorById(id) {
  return await dbLocal.proveedores.get(id);
}

export async function crearProveedor(proveedor) {
  proveedor.createdAt = new Date();
  proveedor.updatedAt = new Date();

  return await dbLocal.proveedores.add(proveedor);
}

export async function actualizarProveedor(id, data) {
  data.updatedAt = new Date();

  return await dbLocal.proveedores.update(id, data);
}

export async function eliminarProveedor(id) {
  return await dbLocal.proveedores.delete(id);
}