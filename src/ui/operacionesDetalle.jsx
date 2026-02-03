import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOperacionesLocal,
  upsertOperacionLocal,
} from "../offline/operacionesRepo";
import "./OperacionesDetalle.css";

const ESTADOS = [
  "CREADA",
  "EN_TRANSITO",
  "EN_CHILE",
  "DOCS_PENDIENTES",
  "PAGOS_PENDIENTES",
  "FINALIZADA",
];

export default function OperacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [operacion, setOperacion] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [adelantoInput, setAdelantoInput] = useState("");

  // Documentos
  const [docNombre, setDocNombre] = useState("");
  const [docTipo, setDocTipo] = useState("FACTURA");

  useEffect(() => {
    async function load() {
      const ops = await getOperacionesLocal();
      const op = ops.find((o) => o.id === id);
      setOperacion(op);
      setNuevoEstado(op?.estado || "");
    }
    load().catch(console.error);
  }, [id]);

  if (!operacion) {
    return <p className="loading">Cargando operación...</p>;
  }

  /* =========================
     HELPERS FINANCIEROS
  ========================== */
  const moneda = operacion.moneda || "USD";
  const total = Number(operacion.totalOperacion || 0);
  const adelanto = Number(operacion.adelantoMonto || 0);
  const saldo = Math.max(0, total - adelanto);
  const progreso = total > 0 ? Math.min(100, (adelanto / total) * 100) : 0;

  const money = (n) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  /* =========================
     ACCIONES FINANZAS
  ========================== */
  const registrarAdelanto = async () => {
    const monto = Number(String(adelantoInput).replace(",", "."));

    if (!monto || monto <= 0) {
      alert("Ingresá un monto de adelanto válido.");
      return;
    }

    if (monto > total) {
      alert("El adelanto no puede ser mayor al total de la operación.");
      return;
    }

    const updated = {
      ...operacion,
      adelantoMonto: monto,
      historial: [
        ...(operacion.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: `Adelanto registrado: ${money(monto)}`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setAdelantoInput("");
  };

  const revertirAdelanto = async () => {
    const updated = {
      ...operacion,
      adelantoMonto: 0,
      historial: [
        ...(operacion.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: "Adelanto revertido a 0",
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* =========================
     ESTADO OPERACIÓN
  ========================== */
  const cambiarEstado = async () => {
    const updated = {
      ...operacion,
      estado: nuevoEstado,
      historial: [
        ...(operacion.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: `Estado cambiado a ${nuevoEstado}`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  const finalizarOperacion = async () => {
    const updated = {
      ...operacion,
      estado: "FINALIZADA",
      finalizada: true,
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* =========================
     DOCUMENTOS
  ========================== */
  const agregarDocumento = async () => {
    if (!docNombre.trim()) {
      alert("Ingresá el nombre del documento");
      return;
    }

    const nuevoDoc = {
      nombre: docNombre,
      tipo: docTipo,
      estado: "PENDIENTE",
      fecha: new Date().toISOString(),
    };

    const updated = {
      ...operacion,
      documentos: [...(operacion.documentos || []), nuevoDoc],
      historial: [
        ...(operacion.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: `Documento agregado: ${docNombre}`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setDocNombre("");
  };

  /* =========================
     RENDER
  ========================== */
  return (
    <section className="operacion-detalle-page">
      {/* Header */}
      <div className="detalle-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <div>
          <h1>{operacion.proveedor}</h1>
          <p className="op-id">ID {operacion.id}</p>
        </div>

        <span className={`estado-badge ${operacion.estado.toLowerCase()}`}>
          {operacion.estado.replace("_", " ")}
        </span>
      </div>

      {/* Resumen */}
      <section className="detalle-card">
        <h3>Resumen de la operación</h3>
        <p>
          <strong>Activo:</strong> {operacion.activo}
        </p>
        <p>
          <strong>Observaciones:</strong>{" "}
          {operacion.observaciones || "-"}
        </p>
      </section>

      {/* Finanzas */}
      <section className="detalle-card">
        <h3>Estado financiero</h3>

        <div className="pago-grid">
          <div className="pago-item">
            <span className="label">Total operación</span>
            <span className="value">{money(total)}</span>
          </div>

          <div className="pago-item">
            <span className="label">Adelanto pagado</span>
            <span className={`value ${adelanto > 0 ? "ok" : "pendiente"}`}>
              {money(adelanto)}
            </span>
          </div>

          <div className="pago-item">
            <span className="label">Saldo pendiente</span>
            <span className={`value ${saldo === 0 ? "ok" : "pendiente"}`}>
              {money(saldo)}
            </span>
          </div>
        </div>

        <div className="progress-wrapper">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="progress-text">
            {Math.round(progreso)}% pagado
          </span>
        </div>

        {adelanto > 0 ? (
          <div className="pago-ok-row">
            <span className="badge ok">Adelanto confirmado</span>
            <button className="btn-secondary" onClick={revertirAdelanto}>
              Revertir adelanto
            </button>
          </div>
        ) : (
          <div className="pago-actions">
            <div className="pago-input">
              <label>Monto de adelanto ({moneda})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 3500"
                value={adelantoInput}
                onChange={(e) => setAdelantoInput(e.target.value)}
              />
            </div>

            <button className="btn-primary" onClick={registrarAdelanto}>
              Registrar adelanto
            </button>
          </div>
        )}
      </section>

      {/* Estado */}
      <section className="detalle-card">
        <h3>Estado de la operación</h3>

        <div className="estado-actions">
          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e.replace("_", " ")}
              </option>
            ))}
          </select>

          <button className="btn-secondary" onClick={cambiarEstado}>
            Actualizar estado
          </button>
        </div>
      </section>

      {/* Documentos */}
      <section className="detalle-card">
        <h3>Documentos</h3>

        <ul className="docs-list">
          {(operacion.documentos || []).length === 0 && (
            <li className="empty">No hay documentos cargados</li>
          )}

          {(operacion.documentos || []).map((doc, i) => (
            <li key={i} className="doc-item">
              <div>
                <strong>{doc.nombre}</strong>
                <span className="doc-meta">
                  {doc.tipo} ·{" "}
                  {new Date(doc.fecha).toLocaleDateString()}
                </span>
              </div>

              <span
                className={`doc-status ${doc.estado.toLowerCase()}`}
              >
                {doc.estado}
              </span>
            </li>
          ))}
        </ul>

        <div className="doc-actions">
          <input
            type="text"
            placeholder="Nombre del documento"
            value={docNombre}
            onChange={(e) => setDocNombre(e.target.value)}
          />

          <select
            value={docTipo}
            onChange={(e) => setDocTipo(e.target.value)}
          >
            <option value="FACTURA">Factura</option>
            <option value="BL">B/L</option>
            <option value="PACKING_LIST">Packing List</option>
            <option value="OTRO">Otro</option>
          </select>

          <button className="btn-secondary" onClick={agregarDocumento}>
            Agregar documento
          </button>
        </div>
      </section>

      {/* Historial */}
      <section className="detalle-card">
        <h3>Historial</h3>

        <ul className="timeline">
          {(operacion.historial || []).length === 0 && (
            <li className="empty">Sin movimientos registrados</li>
          )}

          {(operacion.historial || []).map((h, i) => (
            <li key={i}>
              <span className="time">
                {new Date(h.fecha).toLocaleString()}
              </span>
              <span>{h.evento}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Acciones finales */}
      <section className="detalle-actions">
        {!operacion.finalizada && (
          <button className="btn-danger" onClick={finalizarOperacion}>
            Finalizar operación
          </button>
        )}
      </section>
    </section>
  );
}
