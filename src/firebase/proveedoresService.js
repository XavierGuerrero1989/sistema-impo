import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase";

const proveedoresRef = collection(db, "proveedores");

export async function getProveedoresFirebase() {

  const snapshot = await getDocs(proveedoresRef);

  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

}

export async function crearProveedorFirebase(data) {

  const ref = await addDoc(proveedoresRef, data);

  return ref.id;

}

export async function eliminarProveedorFirebase(id) {

  await deleteDoc(doc(db, "proveedores", id));

}

export async function actualizarProveedorFirebase(id, data) {

  await updateDoc(doc(db, "proveedores", id), data);

}