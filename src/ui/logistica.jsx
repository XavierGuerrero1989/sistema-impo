import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal, upsertOperacionLocal } from "../offline/operacionesRepo";
import { useNavigate } from "react-router-dom";
import "./logistica.css";

/* =========================
   ETAPAS NORMALIZADAS
========================== */
const ETAPAS = [
  "PLANIFICADA",
  "CARGADA",
  "EN_TRANSITO",
  "ARRIBADA",
  "EN_DESPACHO",
  "ENTREGADA",
  "BLOQUEADA",
];

const ETAPA_LABEL = (e) => e.replace("_", " ");

export default function Logistica() {
  const [operaciones, setOperaciones] = useState([]);
  const [filtroEtapa, setFiltroEtapa] = useState("TODAS");
  const navigate = useNavigate();

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  /* =========================
     NORMALIZAR ITEMS
  ========================== */
  const items = useMemo(() => {
    return operaciones.map((op) => {
      const etapa = op.logistica?.etapa || "PLANIFICADA";

      // ✅ ETA CORRECTA: fecha estimada de arribo
      const eta = op.logistica?.eta
        ? new Date(`${op.logistica.eta}T00:00:00`)
        : null;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      let alerta = null;

      if (etapa === "BLOQUEADA") {
        alerta = "BLOQUEADA";
      } else if (etapa === "EN_TRANSITO" && !eta) {
        alerta = "SIN_ETA";
      } else if (
        etapa === "EN_TRANSITO" &&
        eta &&
        eta < hoy
      ) {
        alerta = "ETA_VENCIDA";
      }

      return {
        id: op.id,
        proveedor: op.proveedor,
        activo: op.activo,
        origen: op.logistica?.origen || "-",
        destino: op.logistica?.destino || "-",
        medio: op.logistica?.medio || "MARÍTIMO",
        etapa,
        eta,
        alerta,
      };
    });
  }, [operaciones]);

  /* =========================
     KPIs
  ========================== */
  const kpis = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return {
      enTransito: items.filter((i) => i.etapa === "EN_TRANSITO").length,
      conAlertas: items.filter((i) => i.alerta).length,
      proximos: items.filter(
        (i) =>
          i.etapa === "EN_TRANSITO" &&
          i.eta &&
          (i.eta - hoy) / (1000 * 60 * 60 * 24) <= 7 &&
          i.eta >= hoy
      ).length,
      bloqueadas: items.filter((i) => i.etapa === "BLOQUEADA").length,
    };
  }, [items]);

  /* =========================
     FILTRADO
  ========================== */
  const visibles = useMemo(() => {
    if (filtroEtapa === "TODAS") return items;
    return items.filter((i) => i.etapa === filtroEtapa);
  }, [items, filtroEtapa]);

  /* =========================
     CAMBIAR ETAPA
  ========================== */
  const cambiarEtapa = async (opId, nuevaEtapa) => {
    const op = operaciones.find((o) => o.id === opId);
    if (!op) return;

    const updated = {
      ...op,
      logistica: {
        ...(op.logistica || {}),
        etapa: nuevaEtapa,
      },
      historial: [
        ...(op.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: `Logística: etapa cambiada a ${ETAPA_LABEL(nuevaEtapa)}`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperaciones((prev) =>
      prev.map((o) => (o.id === opId ? updated : o))
    );
  };

  return (
    <section className="log-page">
      {/* Header */}
      <header className="log-header">
        <div>
          <h1>Logística</h1>
          <p>Seguimiento físico y operativo de las operaciones</p>
        </div>
      </header>

      {/* KPIs */}
      <div className="log-kpis">
        <div className="log-kpi" onClick={() => setFiltroEtapa("EN_TRANSITO")}>
          <span>En tránsito</span>
          <strong>{kpis.enTransito}</strong>
        </div>

        <div className="log-kpi warn" onClick={() => setFiltroEtapa("TODAS")}>
          <span>Con alertas</span>
          <strong>{kpis.conAlertas}</strong>
        </div>

        <div className="log-kpi ok" onClick={() => setFiltroEtapa("TODAS")}>
          <span>Próximos arribos (7 días)</span>
          <strong>{kpis.proximos}</strong>
        </div>

        <div className="log-kpi alert" onClick={() => setFiltroEtapa("BLOQUEADA")}>
          <span>Bloqueadas</span>
          <strong>{kpis.bloqueadas}</strong>
        </div>
      </div>

      {/* Pipeline */}
      <section className="log-pipeline">
        {ETAPAS.map((e) => (
          <button
            key={e}
            className={`log-pipe ${filtroEtapa === e ? "active" : ""}`}
            onClick={() => setFiltroEtapa(e)}
          >
            <span>{ETAPA_LABEL(e)}</span>
            <strong>{items.filter((i) => i.etapa === e).length}</strong>
          </button>
        ))}
      </section>

      {/* Tabla */}
      <div className="log-table-wrap">
        <table className="log-table">
          <thead>
            <tr>
              <th>Operación</th>
              <th>Proveedor</th>
              <th>Ruta</th>
              <th>Estado</th>
              <th>ETA</th>
              <th>Alerta</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan="7" className="log-empty">
                  No hay operaciones logísticas
                </td>
              </tr>
            )}

            {visibles.map((i) => (
              <tr key={i.id}>
                <td className="mono">{i.id}</td>
                <td>{i.proveedor}</td>
                <td>
                  {i.origen} → {i.destino}
                </td>
                <td>
                  <select
                    value={i.etapa}
                    onChange={(e) => cambiarEtapa(i.id, e.target.value)}
                  >
                    {ETAPAS.map((e) => (
                      <option key={e} value={e}>
                        {ETAPA_LABEL(e)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {i.eta ? (
                    i.eta.toLocaleDateString()
                  ) : (
                    <span className="muted">–</span>
                  )}
                </td>
                <td>
                  {i.alerta ? (
                    <span className={`log-alert ${i.alerta.toLowerCase()}`}>
                      {i.alerta.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="muted">OK</span>
                  )}
                </td>
                <td>
                  <button
                    className="log-link"
                    onClick={() => navigate(`/operaciones/${i.id}`)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
