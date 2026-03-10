import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dbLocal } from "../offline/db";

let synced = false;

export async function syncProveedores() {

  if (synced) return;

  synced = true;

  const snapshot = await getDocs(collection(db, "proveedores"));

  const proveedores = [];

  snapshot.forEach((doc) => {
    proveedores.push({
      proveedorId: doc.id,
      ...doc.data()
    });
  });

  await dbLocal.proveedores.bulkPut(proveedores);

  console.log("SYNC proveedores completado", proveedores.length);

}