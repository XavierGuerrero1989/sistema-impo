import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

import { dbLocal } from "../offline/db";
import {
  getOperacionByIdLocal,
  markOperacionAsSynced,
} from "../offline/operacionesRepo";

import {
  saveOperacionFirestore,
} from "../services/operacionesServices.js";
import { pushProveedor } from "../sync/PushProveedor";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { deleteEntidadRemota, pushEntidad } from "../sync/EntidadesSync";
import { ENTIDADES_CONFIG } from "../entidades/entidadesConfig";

export function useAutoSync() {
  const { user } = useAuth();

  useEffect(() => {
    // 🔐 BLOQUEO TOTAL SI NO HAY USUARIO
    if (!user) {
      return;
    }

    let syncing = false;
    let cancelled = false;

    async function sync() {
      if (syncing || cancelled) return;
      syncing = true;

      // 🔔 avisar inicio sync (Navbar)
      window.dispatchEvent(new Event("sync:start"));

      try {
        /* =====================================
           1️⃣ PROCESAR OUTBOX (SUBIR CAMBIOS)
        ====================================== */
        const pendingJobs = await dbLocal.outbox
          .orderBy("createdAt")
          .toArray();
        const latestByEntity = new Map();
        for (const job of pendingJobs) {
          latestByEntity.set(`${job.entityType}:${job.entityId}`, job);
        }
        const queue = [...latestByEntity.values()];

        for (const job of queue) {
          const { entityType, entityId, op } = job;

          if (entityType === "operacion" && op === "upsert") {
            const localOp = await getOperacionByIdLocal(entityId);
            if (!localOp) {
              await dbLocal.outbox.delete(job.key);
              continue;
            }

            await saveOperacionFirestore(user, localOp);
            await markOperacionAsSynced(entityId);
          }

          if (entityType === "operacion" && op === "delete") {
            const localOp = await getOperacionByIdLocal(entityId);
            if (localOp) await saveOperacionFirestore(user, localOp);
          }

          if (entityType === "proveedor" && op === "upsert") {
            const proveedor = await dbLocal.proveedores.get(entityId);
            if (!proveedor) {
              await dbLocal.outbox.delete(job.key);
              continue;
            }
            await pushProveedor(entityId, proveedor);
          }

          if (entityType === "proveedor" && op === "delete") {
            await deleteDoc(doc(db, "proveedores", entityId));
          }

          const entidadEntry = Object.values(ENTIDADES_CONFIG)
            .find((config) => config.tipo === entityType);
          if (entidadEntry && op === "upsert") {
            const entidad = await dbLocal[entidadEntry.tabla].get(entityId);
            if (!entidad) {
              await dbLocal.outbox.delete(job.key);
              continue;
            }
            await pushEntidad(entidadEntry.tabla, entityId, entidad);
          }
          if (entidadEntry && op === "delete") {
            await deleteEntidadRemota(entidadEntry.tabla, entityId);
          }

          await dbLocal.outbox.delete(job.key);
          await dbLocal.outbox
            .where("[entityType+entityId]")
            .equals([entityType, entityId])
            .delete();
        }

        window.dispatchEvent(new CustomEvent("data:changed", {
          detail: { entityType: "sync" },
        }));
      } catch (err) {
        console.error("SYNC ERROR:", err);
        window.dispatchEvent(new CustomEvent("sync:error", {
          detail: { message: err?.message || "No se pudo sincronizar" },
        }));
      } finally {
        syncing = false;

        // 🔔 avisar fin sync
        window.dispatchEvent(new Event("sync:end"));
      }
    }

    // ▶️ correr al autenticarse
    sync();

    const onOnline = () => sync();
    window.addEventListener("online", onOnline);

    // Red de seguridad; los cambios remotos llegan por escucha incremental.
    const interval = setInterval(sync, 60000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [user]); // 👈 CLAVE
}
