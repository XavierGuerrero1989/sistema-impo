import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOperacionesLocal,
} from "./offline/operacionesRepo";
import KPIs from "./ui/KPIS";
import "./operacionesApp.css";
import { alertasOperacion } from "./domain/operacion";

function OperacionesApp() {
  const [operaciones, setOperaciones] = useState([]);
  const [filtro, setFiltro] = useState("TODAS");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const ops = await getOperacionesLocal();
      setOperaciones(ops);
    }
    load().catch(console.error);
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, []);

  /* =========================
     NORMALIZAR + ALERTAS
  ========================== */

  const items = useMemo(() => {
    const hoy = new Date();

    return operaciones.map((op) => {
      const estado = op.estado || "PLANIFICADA";
      const alertas = alertasOperacion(op, hoy);

      return {
        ...op,
        estado,
        alertas,
        alerta: alertas[0] || null,
      };
    });
  }, [operaciones]);

  /* =========================
     ORDEN INTELIGENTE
  ========================== */

  const prioridad = (op) => {
    if (op.estado === "BLOQUEADA") return 1;
    if (op.estado === "EN_TRANSITO" && op.alerta) return 2;
    if (op.estado === "EN_DESPACHO") return 3;
    if (op.estado === "ARRIBADA") return 4;
    if (op.estado === "EN_TRANSITO") return 5;
    if (op.estado === "PLANIFICADA") return 6;
    if (op.estado === "FINALIZADA") return 99;
    return 50;
  };

  /* =========================
     FILTROS
  ========================== */

  const visibles = useMemo(() => {
    let list = [...items].sort((a, b) => prioridad(a) - prioridad(b));

    if (filtro !== "TODAS") {
      list = list.filter((o) => o.estado === filtro);
    }

    return list;
  }, [items, filtro]);

  /* =========================
     ESTADOS DISPONIBLES
  ========================== */

  const filtrosEstado = [
    "TODAS",
    "PLANIFICADA",
    "CARGADA",
    "EN_TRANSITO",
    "ARRIBADA",
    "EN_DESPACHO",
    "ENTREGADA",
    "BLOQUEADA",
    "FINALIZADA",
  ];

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

      {/* Filtros */}

      <div className="op-filters">
        {filtrosEstado.map((f) => (
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
            No hay operaciones para mostrar
          </div>
        )}

        {visibles.map((op) => (
          <div
            key={op.id}
            className="operacion-card"
            onClick={() => navigate(`/operaciones/${op.id}`)}
          >
            <div className="card-header">

              <strong>{op.proveedorNombre}</strong>

              <span className={`estado-badge ${op.estado.toLowerCase()}`}>
                {op.estado.replace("_", " ")}
              </span>

            </div>

            <div className="card-body">

              <p className="activo">{op.activo}</p>
              <p className="id">ID {op.id}</p>

            </div>

            {op.alerta && (
              <div className={`alerta ${op.alerta.toLowerCase()}`}>
                ⚠ {op.alertas.map((alerta) => alerta.replaceAll("_", " ")).join(" · ")}
              </div>
            )}

          </div>
        ))}

      </div>
    </section>
  );
}

export default OperacionesApp;
