import { useEffect, useState } from "react";
import {
  upsertOperacionLocal,
  getOperacionesLocal,
} from "./offline/operacionesRepo";
import { useAutoSync } from "./hooks/useAutoSync";
import "./operacionesApp.css";
import KPIs from "./ui/KPIs";


function OperacionesApp() {
  const [operaciones, setOperaciones] = useState([]);

  // 🔁 Sync automático
  useAutoSync();

  useEffect(() => {
    async function init() {
      const operacionEjemplo = {
        id: "op_2025_07_001",
        proveedor: "GIVA",
        activo: "3 theremas + sillón",
        estado: "EN_CHILE",
        observaciones: "Se envió el SWIFT al proveedor",
      };

      await upsertOperacionLocal(operacionEjemplo);
      const ops = await getOperacionesLocal();
      setOperaciones(ops);
    }

    init().catch(console.error);
  }, []);

  return (
    <section className="operaciones-page">
      <header className="operaciones-header">
        <h1>Operaciones</h1>
        <p>Seguimiento integral de importaciones activas</p>
      </header>

      <KPIs operaciones={operaciones} />

      <section className="operaciones-list-header">
  <h2>Operaciones activas</h2>
  <p>Operaciones en curso o con acciones pendientes</p>
</section>



      <div className="operaciones-grid">
        {operaciones.map((op) => (
          <div key={op.id} className="operacion-card">
            <div className="card-header">
              <strong>{op.proveedor}</strong>
              <span className={`estado ${op.estado.toLowerCase()}`}>
                {op.estado.replace("_", " ")}
              </span>
            </div>

            <div className="card-body">
              <p className="activo">{op.activo}</p>
              <p className="id">ID: {op.id}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OperacionesApp;
