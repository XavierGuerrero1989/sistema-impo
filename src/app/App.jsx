import { useEffect, useState } from "react";
import {
  upsertOperacionLocal,
  getOperacionesLocal,
} from "../offline/operacionesRepo";

function App() {
  const [operaciones, setOperaciones] = useState([]);

  useEffect(() => {
    async function init() {
      // operación de ejemplo
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

      // guardamos local
      await upsertOperacionLocal(operacionEjemplo);

      // leemos todo
      const ops = await getOperacionesLocal();
      setOperaciones(ops);
    }

    init();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Sistema de Importaciones</h1>

      <h2>Operaciones locales</h2>

      <pre>{JSON.stringify(operaciones, null, 2)}</pre>
    </div>
  );
}

export default App;
