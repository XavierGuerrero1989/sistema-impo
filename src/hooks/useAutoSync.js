import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

import { dbLocal } from "../offline/db";
import {
  getOperacionByIdLocal,
  markOperacionAsSynced,
} from "../offline/operacionesRepo";

import {
  saveOperacionFirestore,
  deleteOperacionFirestore,
  getOperacionesFirestore,
} from "../services/operacionesServices.js";

export function useAutoSync() {
  const { user } = useAuth();

  useEffect(() => {
    // 🔐 BLOQUEO TOTAL SI NO HAY USUARIO
    if (!user) {
      console.log("SYNC detenido: usuario no autenticado");
      return;
    }

    let syncing = false;
    let cancelled = false;

    console.log("SYNC corriendo para user:", user.uid);

    async function sync() {
      if (syncing || cancelled) return;
      syncing = true;

      // 🔔 avisar inicio sync (Navbar)
      window.dispatchEvent(new Event("sync:start"));

      try {
        /* =====================================
           1️⃣ PROCESAR OUTBOX (SUBIR CAMBIOS)
        ====================================== */
        const queue = await dbLocal.outbox
          .orderBy("createdAt")
          .toArray();

        for (const job of queue) {
          const { entityType, entityId, op } = job;

          if (entityType !== "operacion") continue;

          if (op === "upsert") {
            const localOp = await getOperacionByIdLocal(entityId);
            if (!localOp) continue;

            await saveOperacionFirestore(user, localOp);
            await markOperacionAsSynced(entityId);
          }

          if (op === "delete") {
            await deleteOperacionFirestore(user, entityId);
          }

          // 👉 solo se borra si salió bien
          await dbLocal.outbox.delete(job.key);
        }

        /* =====================================
           2️⃣ BAJAR CAMBIOS DESDE FIRESTORE
        ====================================== */
        const remotas = await getOperacionesFirestore(user);

        for (const remoto of remotas) {
          const local = await getOperacionByIdLocal(remoto.id);

          const remoteTime = remoto.updatedAt?.toDate
            ? remoto.updatedAt.toDate().getTime()
            : new Date(remoto.updatedAt || 0).getTime();

          const localTime = local?.updatedAtLocal || 0;

          if (!local || remoteTime > localTime) {
            await dbLocal.operaciones.put({
              ...remoto,
              dirty: false,
              deleted: false,
              updatedAtLocal: remoteTime,
            });
          }
        }
      } catch (err) {
        console.error("SYNC ERROR:", err);
      } finally {
        syncing = false;

        // 🔔 avisar fin sync
        window.dispatchEvent(new Event("sync:end"));
      }
    }

    // ▶️ correr al autenticarse
    sync();

    // 🔁 repetir cada 15s
    const interval = setInterval(sync, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]); // 👈 CLAVE
}
