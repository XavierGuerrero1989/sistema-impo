import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

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
