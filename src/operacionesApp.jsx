import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOperacionesLocal,
} from "./offline/operacionesRepo";
import KPIs from "./ui/KPIS";
import "./operacionesApp.css";
import { alertasOperacion } from "./domain/operacion";
import { useAuth } from "./auth/AuthContext";
import { countryLabel } from "./domain/paises";

function OperacionesApp() {
  const [operaciones, setOperaciones] = useState([]);
  const [filtro, setFiltro] = useState("TODAS");
  const navigate = useNavigate();
  const { permissions } = useAuth();

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
      <header className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-kicker">Resumen operativo · {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</span>
          <h1>Todo bajo control,<br/><em>de origen a destino.</em></h1>
          <p>Prioridades, vencimientos y movimientos importantes en un solo lugar.</p>
        </div>
        <div className="hero-actions">
          {permissions.manageOperations && (
            <button className="hero-primary" onClick={() => navigate("/operaciones/nueva")}>＋ Nueva operación</button>
          )}
          <button className="hero-secondary" onClick={() => navigate("/operaciones")}>Ver todas →</button>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
      </header>

      <KPIs operaciones={items} onFilter={setFiltro} />

      <div className="dashboard-section-head">
        <div><span className="section-kicker">Seguimiento</span><h2>Operaciones prioritarias</h2></div>
        <div className="op-filters">
          {filtrosEstado.map((f) => (
            <button key={f} className={`op-filter ${filtro === f ? "active" : ""}`} onClick={() => setFiltro(f)}>
              {f.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="operaciones-grid">
        {visibles.length === 0 && (
          <div className="op-empty"><span>✓</span><strong>Todo despejado</strong><p>No hay operaciones para mostrar con este filtro.</p></div>
        )}

        {visibles.slice(0, 8).map((op) => (
          <div
            key={op.id}
            className="operacion-card"
            onClick={() => navigate(`/operaciones/${op.id}`)}
          >
            <div className="card-accent" />
            <div className="card-header">
              <span className="card-id">{op.id}</span>
              <span className={`estado-badge ${op.estado.toLowerCase()}`}>
                {op.estado.replaceAll("_", " ")}
              </span>
            </div>
            <div className="card-body">
              <strong>{op.proveedorNombre || op.proveedor || "Sin proveedor"}</strong>
              <p className="activo">{op.activo || "Mercadería sin especificar"}</p>
              <div className="card-route">
                <span>{countryLabel(op.logistica?.origen, "Origen")}</span><b>→</b><span>{countryLabel(op.logistica?.destino, "Destino")}</span>
              </div>
            </div>
            {op.alerta && (
              <div className="card-alert">
                <span>!</span>{op.alertas.map((alerta) => alerta.replaceAll("_", " ")).join(" · ")}
              </div>
            )}
            <div className="card-open">Abrir operación <span>↗</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default OperacionesApp;
