import { collection, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dbLocal } from "../offline/db";
import { entidadConfig } from "../entidades/entidadesConfig";

export async function pushEntidad(tipo, entidadId, data) {
  const config = entidadConfig(tipo);
  await setDoc(doc(db, config.coleccion, entidadId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteEntidadRemota(tipo, entidadId) {
  const config = entidadConfig(tipo);
  await deleteDoc(doc(db, config.coleccion, entidadId));
}

export function listenEntidades(tipo, onError) {
  const config = entidadConfig(tipo);
  return onSnapshot(collection(db, config.coleccion), async (snapshot) => {
    const pendingJobs = await dbLocal.outbox
      .where("entityType")
      .equals(config.tipo)
      .toArray();
    const pendingIds = new Set(pendingJobs.map((job) => job.entityId));
    let changed = false;

    for (const change of snapshot.docChanges()) {
      const entidadId = change.doc.id;
      if (pendingIds.has(entidadId)) continue;
      if (change.type === "removed") {
        await dbLocal[config.tabla].delete(entidadId);
      } else {
        await dbLocal[config.tabla].put({ entidadId, ...change.doc.data() });
      }
      changed = true;
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent("data:changed", {
        detail: { entityType: config.tipo },
      }));
    }
  }, onError);
}
