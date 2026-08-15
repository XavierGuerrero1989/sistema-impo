import {
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { db, storage } from "../firebase/firebase";

/* =========================
   GUARDAR / UPDATE
========================= */
export async function saveOperacionFirestore(user, operacion) {
  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  if (!operacion?.id) {
    throw new Error("La operación debe tener un ID");
  }

  const ref = doc(db, "operaciones", operacion.id);
  const {
    dirty: _dirty,
    updatedAtLocal: _updatedAtLocal,
    ...payload
  } = operacion;

  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: operacion.createdAt
        ? operacion.createdAt
        : serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   ELIMINACIÓN DEFINITIVA
========================= */
export async function deleteOperacionPermanenteFirestore(user, operacion) {
  if (!user) throw new Error("Usuario no autenticado");
  if (!operacion?.id) throw new Error("La operación debe tener un ID");

  const referencias = [...new Set(
    (operacion.documentos || [])
      .map((documento) => documento.archivo?.storagePath || documento.archivo?.downloadURL)
      .filter(Boolean)
  )];

  for (const referencia of referencias) {
    try {
      await deleteObject(storageRef(storage, referencia));
    } catch (error) {
      if (error?.code !== "storage/object-not-found") throw error;
    }
  }

  await deleteDoc(doc(db, "operaciones", operacion.id));
}
