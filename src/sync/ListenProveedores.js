import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dbLocal } from "../offline/db";

export function listenProveedores(onError) {
  return onSnapshot(collection(db, "proveedores"), async (snapshot) => {
    const pendingJobs = await dbLocal.outbox
      .where("entityType")
      .equals("proveedor")
      .toArray();
    const pendingIds = new Set(pendingJobs.map((job) => job.entityId));

    let changed = false;
    for (const change of snapshot.docChanges()) {
      const proveedorId = change.doc.id;
      if (pendingIds.has(proveedorId)) continue;

      if (change.type === "removed") {
        await dbLocal.proveedores.delete(proveedorId);
      } else {
        await dbLocal.proveedores.put({
          proveedorId,
          ...change.doc.data(),
        });
      }
      changed = true;
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent("data:changed", {
        detail: { entityType: "proveedor" },
      }));
    }
  }, onError);

}
