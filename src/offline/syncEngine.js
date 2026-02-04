import { dbLocal } from "./db";
import { db as dbRemote } from "../firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Sincroniza la outbox con Firestore
 */
export async function syncOutbox(user) {
  // 🔐 BLOQUEO DURO
  if (!user) {
    console.warn("SYNC: abortado, usuario no autenticado");
    return;
  }

  if (!navigator.onLine) {
    console.log("SYNC: offline, abort");
    return;
  }

  const jobs = await dbLocal.outbox.orderBy("createdAt").toArray();
  if (jobs.length === 0) {
    console.log("SYNC: outbox vacía");
    return;
  }

  console.log("SYNC: procesando outbox", jobs.length);

  const byEntity = new Map();
  for (const job of jobs) {
    const key = `${job.entityType}:${job.entityId}`;
    byEntity.set(key, job);
  }

  for (const job of byEntity.values()) {
    if (job.entityType !== "operacion") continue;

    const op = await dbLocal.operaciones.get(job.entityId);
    if (!op) continue;

    const { dirty, deleted, updatedAtLocal, ...payload } = op;

    await setDoc(
      doc(dbRemote, "operaciones", op.id),
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await dbLocal.operaciones.update(op.id, {
      dirty: false,
    });
  }

  await dbLocal.outbox.clear();
  console.log("SYNC: completo");
}
