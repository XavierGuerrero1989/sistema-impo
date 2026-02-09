import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  upsertOperacionLocal,
  getOperacionesLocal,
} from "./offline/operacionesRepo";
import { useAutoSync } from "./hooks/useAutoSync";
import KPIs from "./ui/KPIS";
import "./operacionesApp.css";

function OperacionesApp() {
  const [operaciones, setOperaciones] = useState([]);
  const [filtro, setFiltro] = useState("TODAS");
  const navigate = useNavigate();

  // 🔁 Sync automático
  useAutoSync();

  useEffect(() => {
    async function init() {
      const ops = await getOperacionesLocal();
      setOperaciones(ops);
    }
    init().catch(console.error);
  }, []);

  /* =========================
     NORMALIZAR + ALERTAS
  ========================== */
  const items = useMemo(() => {
    const hoy = new Date();

    return operaciones.map((op) => {
      const etapa = op.logistica?.etapa || op.estado || "PLANIFICADA";
      const eta = op.logistica?.eta ? new Date(op.logistica.eta) : null;

      let alerta = null;

      if (etapa === "BLOQUEADA") alerta = "BLOQUEADA";
      else if (etapa === "EN_TRANSITO" && !eta) alerta = "SIN_ETA";
      else if (eta && eta < hoy && etapa !== "ENTREGADA")
        alerta = "ETA_VENCIDA";

      return {
        ...op,
        etapa,
        alerta,
      };
    });
  }, [operaciones]);

  /* =========================
     ORDEN INTELIGENTE
  ========================== */
  const prioridad = (op) => {
    if (op.etapa === "BLOQUEADA") return 1;
    if (op.etapa === "EN_TRANSITO" && op.alerta) return 2;
    if (op.etapa === "EN_DESPACHO") return 3;
    if (op.etapa === "ARRIBADA") return 4;
    if (op.etapa === "EN_TRANSITO") return 5;
    if (op.etapa === "PLANIFICADA") return 6;
    return 9;
  };

  const visibles = useMemo(() => {
    let list = [...items].sort((a, b) => prioridad(a) - prioridad(b));
    if (filtro === "ALERTAS") list = list.filter((o) => o.alerta);
    if (filtro !== "TODAS" && filtro !== "ALERTAS")
      list = list.filter((o) => o.etapa === filtro);
    return list;
  }, [items, filtro]);

  return (
    <section className="operaciones-page">
      {/* Header */}
      <header className="operaciones-header">
        <div>
          <h1>Operaciones</h1>
          <p>Panel general de control y seguimiento</p>
        </div>
      </header>

      {/* KPIs */}
      <KPIs operaciones={items} onFilter={setFiltro} />

      {/* Filtros rápidos */}
      <div className="op-filters">
        {["TODAS", "EN_TRANSITO", "ALERTAS", "BLOQUEADA"].map((f) => (
          <button
            key={f}
            className={`op-filter ${filtro === f ? "active" : ""}`}
            onClick={() => setFiltro(f)}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="operaciones-grid">
        {visibles.length === 0 && (
          <div className="op-empty">
            No hay operaciones activas
          </div>
        )}

        {visibles.map((op) => (
          <div
            key={op.id}
            className="operacion-card"
            onClick={() => navigate(`/operaciones/${op.id}`)}
          >
            <div className="card-header">
              <strong>{op.proveedor}</strong>

              <span className={`estado-badge ${op.etapa.toLowerCase()}`}>
                {op.etapa.replace("_", " ")}
              </span>
            </div>

            <div className="card-body">
              <p className="activo">{op.activo}</p>
              <p className="id">ID {op.id}</p>
            </div>

            {op.alerta && (
              <div className={`alerta ${op.alerta.toLowerCase()}`}>
                ⚠ {op.alerta.replace("_", " ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default OperacionesApp;
