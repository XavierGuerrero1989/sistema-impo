import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal, upsertOperacionLocal } from "../offline/operacionesRepo";
import { useNavigate } from "react-router-dom";
import "./logistica.css";
import { useAuth } from "../auth/AuthContext";

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
  const [search, setSearch] = useState("");
  const [filtroEta, setFiltroEta] = useState("TODAS");

  const navigate = useNavigate();
  const { permissions } = useAuth();

  useEffect(() => {
    const load = () => getOperacionesLocal().then(setOperaciones).catch(console.error);
    load();
    window.addEventListener("data:changed", load);
    return () => window.removeEventListener("data:changed", load);
  }, []);

  /* =========================
     NORMALIZAR ITEMS
  ========================== */

  const items = useMemo(() => {

    return operaciones
    
    .filter(op => op.estado !== "FINALIZADA")  
    .map((op) => {
      
      const etapa = op.logistica?.etapa || "PLANIFICADA";

      const eta = op.logistica?.eta
        ? new Date(
            String(op.logistica.eta).includes("T")
              ? op.logistica.eta
              : `${op.logistica.eta}T00:00:00`
          )
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diasEta = eta ? Math.ceil((eta - today) / 86400000) : null;

      return {
        id: op.id,
        proveedor: op.proveedorNombre || op.proveedor || "-",
        activo: op.activo,
        origen: op.logistica?.origen || "-",
        destino: op.logistica?.destino || "-",
        medio: op.logistica?.medio || "MARÍTIMO",
        etapa,
        eta,
        diasEta,
      };

    });

  }, [operaciones]);

  /* =========================
     KPIs
  ========================== */

  const kpis = useMemo(() => {

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    return {

      enTransito: items.filter(
        (i) => i.etapa === "EN_TRANSITO"
      ).length,

      proximos: items.filter((i) => {

        if (i.etapa !== "EN_TRANSITO") return false;
        if (!i.eta) return false;

        const dias = (i.eta - hoy) / (1000 * 60 * 60 * 24);

        return dias <= 7 && dias >= 0;

      }).length,

      bloqueadas: items.filter(
        (i) => i.etapa === "BLOQUEADA"
      ).length,

    };

  }, [items]);

  /* =========================
     FILTRADO
  ========================== */

  const visibles = useMemo(() => {

    const query = search.trim().toLowerCase();
    return items
      .filter((item) => filtroEtapa === "TODAS" || item.etapa === filtroEtapa)
      .filter((item) => {
        if (filtroEta === "VENCIDA") return item.diasEta !== null && item.diasEta < 0;
        if (filtroEta === "7_DIAS") {
          return item.diasEta !== null && item.diasEta >= 0 && item.diasEta <= 7;
        }
        if (filtroEta === "SIN_ETA") return item.diasEta === null;
        return true;
      })
      .filter((item) => !query || [
        item.id,
        item.proveedor,
        item.activo,
        item.origen,
        item.destino,
      ].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((a, b) => {
        if (a.diasEta === null) return 1;
        if (b.diasEta === null) return -1;
        return a.diasEta - b.diasEta;
      });

  }, [items, filtroEtapa, filtroEta, search]);

  /* =========================
     CAMBIAR ETAPA
  ========================== */

  const cambiarEtapa = async (opId, nuevaEtapa) => {
    if (!permissions.manageOperations) return;

    const op = operaciones.find(
      (o) => o.id === opId
    );

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
      prev.map((o) =>
        o.id === opId ? updated : o
      )
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

        <div
          className="log-kpi"
          onClick={() => setFiltroEtapa("EN_TRANSITO")}
        >
          <span>En tránsito</span>
          <strong>{kpis.enTransito}</strong>
        </div>

        <div
          className="log-kpi ok"
          onClick={() => setFiltroEtapa("EN_TRANSITO")}
        >
          <span>Próximos arribos (7 días)</span>
          <strong>{kpis.proximos}</strong>
        </div>

        <div
          className="log-kpi alert"
          onClick={() => setFiltroEtapa("BLOQUEADA")}
        >
          <span>Bloqueadas</span>
          <strong>{kpis.bloqueadas}</strong>
        </div>

      </div>

      {/* Pipeline */}

      <section className="log-pipeline">

        <button
          className={`log-pipe ${filtroEtapa === "TODAS" ? "active" : ""}`}
          onClick={() => setFiltroEtapa("TODAS")}
        >
          <span>TODAS</span>
          <strong>{items.length}</strong>
        </button>

        {ETAPAS.map((e) => (

          <button
            key={e}
            className={`log-pipe ${filtroEtapa === e ? "active" : ""}`}
            onClick={() => setFiltroEtapa(e)}
          >
            <span>{ETAPA_LABEL(e)}</span>
            <strong>
              {items.filter((i) => i.etapa === e).length}
            </strong>
          </button>

        ))}

      </section>

      <div className="log-filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar operación, proveedor, mercadería o ruta…"
        />
        <select value={filtroEta} onChange={(event) => setFiltroEta(event.target.value)}>
          <option value="TODAS">Todas las ETA</option>
          <option value="VENCIDA">ETA vencida</option>
          <option value="7_DIAS">Próximos 7 días</option>
          <option value="SIN_ETA">Sin ETA</option>
        </select>
      </div>

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
              <th></th>
            </tr>
          </thead>

          <tbody>

            {visibles.length === 0 && (
              <tr>
                <td colSpan="6" className="log-empty">
                  No hay operaciones logísticas
                </td>
              </tr>
            )}

            {visibles.map((i) => (

              <tr key={i.id}>

                <td className="mono">
                  {i.id}
                </td>

                <td>
                  {i.proveedor}
                </td>

                <td>
                  {i.origen} → {i.destino}
                </td>

                <td>

                  <select
                    disabled={!permissions.manageOperations}
                    value={i.etapa}
                    onChange={(e) =>
                      cambiarEtapa(i.id, e.target.value)
                    }
                  >

                    {ETAPAS.map((e) => (

                      <option
                        key={e}
                        value={e}
                      >
                        {ETAPA_LABEL(e)}
                      </option>

                    ))}

                  </select>

                </td>

                <td>

                  {i.eta ? (
                    <>
                      {i.eta.toLocaleDateString("es-AR")}
                      {i.diasEta < 0 && <strong className="log-eta-danger"> · Vencida</strong>}
                      {i.diasEta >= 0 && i.diasEta <= 7 && (
                        <strong className="log-eta-warning"> · {i.diasEta} día(s)</strong>
                      )}
                    </>
                  ) : (
                    <span className="muted">–</span>
                  )}

                </td>

                <td>

                  <button
                    className="log-link"
                    onClick={() =>
                      navigate(`/operaciones/${i.id}`)
                    }
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
