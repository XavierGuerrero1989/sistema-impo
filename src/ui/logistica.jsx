import { useEffect, useMemo, useState } from "react";
import { getOperacionesLocal, upsertOperacionLocal } from "../offline/operacionesRepo";
import { useNavigate } from "react-router-dom";
import "./logistica.css";

const ETAPAS = [
  "ORIGEN",
  "EMBARCADO",
  "EN_TRANSITO",
  "ARRIBO_PUERTO",
  "EN_DEPOSITO",
  "LIBERADO",
];

export default function Logistica() {
  const [operaciones, setOperaciones] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getOperacionesLocal().then(setOperaciones).catch(console.error);
  }, []);

  /* =========================
     NORMALIZAR LOGÍSTICA
  ========================== */
  const items = useMemo(() => {
    return operaciones.map((op) => ({
      id: op.id,
      proveedor: op.proveedor,
      activo: op.activo,
      etapa: op.logistica?.etapa || "ORIGEN",
      eta: op.logistica?.eta || null,
      origen: op.logistica?.origen || "-",
      destino: op.logistica?.destino || "-",
      medio: op.logistica?.medio || "MARÍTIMO",
    }));
  }, [operaciones]);

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
          evento: `Logística: etapa cambiada a ${nuevaEtapa.replace("_", " ")}`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperaciones((prev) =>
      prev.map((o) => (o.id === opId ? updated : o))
    );
  };

  return (
    <section className="logistica-page">
      {/* Header */}
      <header className="logistica-header">
        <h1>Logística</h1>
        <p>Seguimiento físico de las operaciones</p>
      </header>

      {/* Tabla logística */}
      <div className="logistica-table-wrapper">
        <table className="logistica-table">
          <thead>
            <tr>
              <th>Operación</th>
              <th>Proveedor</th>
              <th>Activo</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Medio</th>
              <th>Etapa</th>
              <th>ETA</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan="9" className="empty">
                  No hay operaciones logísticas
                </td>
              </tr>
            )}

            {items.map((item) => (
              <tr key={item.id}>
                <td className="mono">{item.id}</td>
                <td>{item.proveedor}</td>
                <td>{item.activo}</td>
                <td>{item.origen}</td>
                <td>{item.destino}</td>
                <td>{item.medio}</td>
                <td>
                  <select
                    value={item.etapa}
                    onChange={(e) =>
                      cambiarEtapa(item.id, e.target.value)
                    }
                  >
                    {ETAPAS.map((e) => (
                      <option key={e} value={e}>
                        {e.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {item.eta
                    ? new Date(item.eta).toLocaleDateString()
                    : "-"}
                </td>
                <td>
                  <button
                    className="btn-link"
                    onClick={() => navigate(`/operaciones/${item.id}`)}
                  >
                    Ver operación
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pipeline visual */}
      <section className="pipeline-section">
        <h3>Pipeline logístico</h3>

        <div className="pipeline">
          {ETAPAS.map((etapa) => (
            <div key={etapa} className="pipeline-col">
              <span className="pipeline-title">
                {etapa.replace("_", " ")}
              </span>

              <span className="pipeline-count">
                {
                  items.filter((i) => i.etapa === etapa).length
                }
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
