import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dbLocal } from "../offline/db";

function remoteTimestamp(value) {
  if (value?.toDate) return value.toDate().getTime();
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function listenOperaciones(onError) {
  return onSnapshot(
    collection(db, "operaciones"),
    async (snapshot) => {
      let changed = false;

      for (const change of snapshot.docChanges()) {
        const id = change.doc.id;
        const local = await dbLocal.operaciones.get(id);

        if (change.type === "removed") {
          if (local?.dirty) continue;
          if (local) {
            await dbLocal.operaciones.update(id, {
              deleted: true,
              dirty: false,
            });
            changed = true;
          }
          continue;
        }

        const remote = { id, ...change.doc.data() };
        const remoteTime = remoteTimestamp(remote.updatedAt);
        if (local?.dirty) continue;

        await dbLocal.operaciones.put({
          ...remote,
          dirty: false,
          deleted: remote.deleted === true,
          updatedAtLocal: remoteTime,
        });
        changed = true;
      }

      if (changed) {
        window.dispatchEvent(new CustomEvent("data:changed", {
          detail: { entityType: "operacion" },
        }));
      }
    },
    onError
  );
}
