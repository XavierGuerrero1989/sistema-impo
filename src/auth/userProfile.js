import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { isPrimaryAdmin, ROLES } from "./roles";

export async function loadUserProfile(user) {
  if (!user) return null;

  const ref = doc(db, "usuarios", user.uid);
  const snapshot = await getDoc(ref);
  const role = isPrimaryAdmin(user.email)
    ? ROLES.ADMIN
    : snapshot.data()?.role || ROLES.LECTURA;

  await setDoc(ref, {
    email: user.email || "",
    nombre: user.displayName || user.email || "",
    role,
    ultimoAcceso: serverTimestamp(),
  }, { merge: true });

  return { uid: user.uid, ...snapshot.data(), email: user.email, role };
}
