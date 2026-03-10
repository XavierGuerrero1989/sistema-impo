import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function pushProveedor(proveedorId, data) {

  const ref = doc(db, "proveedores", proveedorId);

  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

}