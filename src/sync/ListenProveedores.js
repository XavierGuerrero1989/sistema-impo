import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dbLocal } from "../offline/db";

export function listenProveedores() {

  return onSnapshot(collection(db, "proveedores"), async (snapshot) => {

    const proveedores = [];

    snapshot.forEach((doc) => {
      proveedores.push({
        proveedorId: doc.id,
        ...doc.data()
      });
    });

    await dbLocal.proveedores.bulkPut(proveedores);

    console.log("Proveedores sincronizados:", proveedores.length);

  });

}