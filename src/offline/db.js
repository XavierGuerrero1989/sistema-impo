import Dexie from "dexie";

function safeUserKey(uid) {
  return String(uid || "sin_sesion").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function createDatabase(uid) {
  const database = new Dexie(`sistema_impo_${safeUserKey(uid)}`);

  database.version(1).stores({
    operaciones: "&id, estado, proveedorId, deleted, updatedAtLocal",
    outbox: "++key, entityType, entityId, op, createdAt",
    meta: "key",
    proveedores: "&proveedorId, nombreComercial, pais",
  });

  database.version(2).stores({
    operaciones: "&id, estado, proveedorId, deleted, updatedAtLocal",
    outbox: "++key, [entityType+entityId], entityType, entityId, op, createdAt",
    meta: "key",
    proveedores: "&proveedorId, nombreComercial, pais",
  });

  return database;
}

export let dbLocal = createDatabase();

async function migrateLegacyData(uid) {
  if (!uid) return;

  const legacy = new Dexie("sistema_impo");
  legacy.version(2).stores({
    operaciones: "&id, estado, proveedor, deleted, updatedAtLocal",
    outbox: "++key, entityType, entityId, op, createdAt",
    meta: "key",
    proveedores: "&proveedorId, nombreComercial, pais",
  });

  try {
    const owner = await legacy.meta.get("migratedToUser");
    if (owner?.value && owner.value !== uid) return;

    const alreadyMigrated = await dbLocal.meta.get("legacyMigrated");
    if (alreadyMigrated) return;

    const [operaciones, outbox, proveedores] = await Promise.all([
      legacy.operaciones.toArray(),
      legacy.outbox.toArray(),
      legacy.proveedores.toArray(),
    ]);

    await dbLocal.transaction(
      "rw",
      dbLocal.operaciones,
      dbLocal.outbox,
      dbLocal.proveedores,
      dbLocal.meta,
      async () => {
        if (operaciones.length) await dbLocal.operaciones.bulkPut(operaciones);
        if (outbox.length) {
          const jobs = outbox.map(({ key: _key, ...job }) => job);
          await dbLocal.outbox.bulkAdd(jobs);
        }
        if (proveedores.length) await dbLocal.proveedores.bulkPut(proveedores);
        await dbLocal.meta.put({ key: "legacyMigrated", value: true });
      }
    );

    await legacy.meta.put({ key: "migratedToUser", value: uid });
  } finally {
    legacy.close();
  }
}

export async function selectLocalDatabase(uid) {
  const nextName = `sistema_impo_${safeUserKey(uid)}`;
  if (dbLocal.name === nextName) return;

  dbLocal.close();
  dbLocal = createDatabase(uid);
  await migrateLegacyData(uid);
}
