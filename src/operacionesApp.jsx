import { useEffect, useState } from "react";
import {
  upsertOperacionLocal,
  getOperacionesLocal,
} from "../src/offline/operacionesRepo";
import { dbLocal } from "../src/offline/db";
import { useAutoSync } from "../src/hooks/useAutoSync";

function operacionesApp() {
  const [operaciones, setOperaciones] = useState([]);

  // 🔁 Sync automático (online / intervalo)
  useAutoSync();

  useEffect(() => {
    async function init() {
      // 🧪 Operación de ejemplo (solo para esta etapa)
      const operacionEjemplo = {
        id: "op_2025_07_001",
        proveedor: "GIVA",
        activo: "3 theremas + sillón",
        estado: "EN_CHILE",

        finanzas: {
          moneda: "USD",
          adelanto: 18376,
          saldo: 5513,
          totalTransferido: 12863,
          swiftEnviado: true,
          fechaSwift: "2025-07-30",
        },

        logistica: {
          fechaPedido: "2025-07-15",
          fechaSalidaOrigen: "2025-07-22",
          fechaLlegadaChile: "2025-08-05",
          fechaEntregaCliente: null,
        },

        documentos: {
          invoice: { recibido: true },
          packingList: { recibido: true },
          certificadoOrigen: { recibido: false },
          bl: { recibido: true },
        },

        despachante: {
          despachoLiberado: false,
        },

        observaciones: "Se envió el SWIFT al proveedor",
      };

      // 👉 upsert local (genera outbox si corresponde)
      await upsertOperacionLocal(operacionEjemplo);

      // 👉 leer operaciones locales
      const ops = await getOperacionesLocal();
      setOperaciones(ops);

      // 🧪 debug outbox (temporal)
      const outbox = await dbLocal.outbox.toArray();
      console.log("OUTBOX:", outbox);
    }

    init().catch(console.error);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Sistema de Importaciones</h1>

      <h2>Operaciones locales</h2>

      <pre
        style={{
          background: "#f4f4f4",
          padding: 16,
          borderRadius: 6,
          maxWidth: 900,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(operaciones, null, 2)}
      </pre>
    </div>
  );
}

export default operacionesApp;
