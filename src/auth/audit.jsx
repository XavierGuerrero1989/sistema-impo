import { getAuth } from "firebase/auth";

export function getActor() {
  const user = getAuth().currentUser;

  return {
    uid: user?.uid || "unknown",
    email: user?.email || "unknown",
    nombre: user?.displayName || user?.email || "unknown",
  };
}

export function auditEvent(evento, extra = {}) {
  const actor = getActor();

  return {
    fecha: new Date().toISOString(),
    evento,

    actorUid: actor.uid,
    actorEmail: actor.email,
    actorNombre: actor.nombre,

    ...extra,
  };
}