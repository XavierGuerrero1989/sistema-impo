import { dbLocal } from "./db";

export async function testDB() {
  await dbLocal.open();
  console.log("IndexedDB abierta correctamente");
}
