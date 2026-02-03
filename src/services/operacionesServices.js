import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/* =========================
   COLLECTION REF
========================= */
const operacionesRef = collection(db, "operaciones");

/* =========================
   GUARDAR / UPDATE
========================= */
export async function saveOperacionFirestore(operacion) {
  if (!operacion?.id) {
    throw new Error("La operación debe tener un ID");
  }

  const ref = doc(db, "operaciones", operacion.id);

  await setDoc(
    ref,
    {
      ...operacion,
      updatedAt: serverTimestamp(),
      createdAt: operacion.createdAt
        ? operacion.createdAt
        : serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   OBTENER TODAS
========================= */
export async function getOperacionesFirestore() {
  const snap = await getDocs(operacionesRef);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* =========================
   OBTENER UNA
========================= */
export async function getOperacionFirestore(id) {
  const ref = doc(db, "operaciones", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}

/* =========================
   ELIMINAR
========================= */
export async function deleteOperacionFirestore(id) {
  const ref = doc(db, "operaciones", id);
  await deleteDoc(ref);
}
