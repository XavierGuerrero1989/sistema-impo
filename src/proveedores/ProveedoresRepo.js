import { dbLocal } from "../offline/db";
import { db } from "../firebase/firebase";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

const proveedoresCollection = collection(db, "proveedores");

/* =========================
   GET PROVEEDORES
========================== */

export async function getProveedoresLocal() {

  const snapshot = await getDocs(proveedoresCollection);

  const proveedores = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  /* refrescar cache local */

  await dbLocal.proveedores.clear();
  await dbLocal.proveedores.bulkAdd(proveedores);

  return proveedores;

}

/* =========================
   GET BY ID
========================== */

export async function getProveedorById(id) {

  return await dbLocal.proveedores.get(id);

}

/* =========================
   CREAR
========================== */

export async function crearProveedor(proveedor) {

  proveedor.createdAt = new Date().toISOString();
  proveedor.updatedAt = new Date().toISOString();

  const ref = await addDoc(proveedoresCollection, proveedor);

  const nuevo = {
    id: ref.id,
    ...proveedor
  };

  await dbLocal.proveedores.add(nuevo);

  return ref.id;

}

/* =========================
   ACTUALIZAR
========================== */

export async function actualizarProveedor(id, data) {

  data.updatedAt = new Date().toISOString();

  await updateDoc(doc(db, "proveedores", id), data);

  await dbLocal.proveedores.update(id, data);

}

/* =========================
   ELIMINAR
========================== */

export async function eliminarProveedor(id) {

  await deleteDoc(doc(db, "proveedores", id));

  await dbLocal.proveedores.delete(id);

}