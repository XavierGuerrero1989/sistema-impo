import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOperacionesLocal,
  upsertOperacionLocal,
} from "../offline/operacionesRepo";
import { storage } from "../firebase/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import "./operacionesDetalle.css";

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

  /* ===== Finanzas ===== */
  const [montoInput, setMontoInput] = useState("");
  const [instrumentoInput, setInstrumentoInput] = useState("TRANSFERENCIA");
  const [bancoInput, setBancoInput] = useState("");
  const [fechaInput, setFechaInput] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tipoPago, setTipoPago] = useState("ADELANTO");

  /* ===== Documentos ===== */
  const [docNombre, setDocNombre] = useState("");
  const [docTipo, setDocTipo] = useState("FACTURA");
  const [docRef, setDocRef] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [subiendoDoc, setSubiendoDoc] = useState(false);

  useEffect(() => {
    async function load() {
      const ops = await getOperacionesLocal();
      const op = ops.find((o) => o.id === id);
      setOperacion(op || null);
      setNuevoEstado(op?.estado || "");
    }
    load().catch(console.error);
  }, [id]);

  /* ===== Finanzas cálculos (HOOKS SIEMPRE CORREN) ===== */
  const moneda = operacion?.moneda || "USD";
  const total = Number(operacion?.totalOperacion || 0);

  const movimientos = useMemo(() => {
    if (!operacion) return [];
    const adelantos = operacion.adelantos || [];
    const pagos = operacion.pagos || [];
    return [...adelantos, ...pagos].filter((m) => m.estado === "ACTIVO");
  }, [operacion]);

  const totalPagado = movimientos.reduce(
    (acc, m) => acc + Number(m.monto || 0),
    0
  );

  const saldo = Math.max(0, total - totalPagado);
  const progreso = total > 0 ? (totalPagado / total) * 100 : 0;

  const money = (n) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  /* ===== Guard ===== */
  if (!operacion) return <p className="loading">Cargando operación...</p>;

  /* ===== Finanzas acciones ===== */
  const registrarMovimiento = async () => {
    const monto = Number(String(montoInput).replace(",", "."));
    if (!monto || monto <= 0) return alert("Monto inválido");
    if (monto > saldo) return alert("Supera el saldo pendiente");
    if (!bancoInput.trim()) return alert("Indicá el banco");

    const nuevo = {
      monto,
      moneda,
      instrumento: instrumentoInput,
      banco: bancoInput,
      fecha: fechaInput,
      estado: "ACTIVO",
    };

    const campo = tipoPago === "ADELANTO" ? "adelantos" : "pagos";

    const updated = {
      ...operacion,
      [campo]: [...(operacion[campo] || []), nuevo],
      historial: [
        ...(operacion.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: `${tipoPago} registrado: ${money(
            monto
          )} · ${instrumentoInput} · ${bancoInput}`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setMontoInput("");
    setBancoInput("");
  };

  const cancelarMovimiento = async (tipo, index) => {
    const updated = {
      ...operacion,
      [tipo]: (operacion[tipo] || []).map((m, i) =>
        i === index ? { ...m, estado: "CANCELADO" } : m
      ),
      historial: [
        ...(operacion.historial || []),
        {
          fecha: new Date().toISOString(),
          evento: `${tipo === "adelantos" ? "Adelanto" : "Pago"} cancelado`,
        },
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* ===== Documentos (sube a Storage + guarda URL) ===== */
  const agregarDocumento = async () => {
    if (!docNombre.trim()) return alert("Nombre requerido");
    if (!docFile) return alert("Adjuntá el PDF del documento");
    if (docFile.type !== "application/pdf")
      return alert("Solo se permiten archivos PDF");

    setSubiendoDoc(true);

    try {
      const ext = (docFile.name.split(".").pop() || "pdf").toLowerCase();
      const uuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const storagePath = `operaciones/${operacion.id}/documentos/${uuid}.${ext}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, docFile);
      const downloadURL = await getDownloadURL(fileRef);

      const nuevoDoc = {
        nombre: docNombre,
        tipo: docTipo,
        referencia: docRef || null,
        archivo: {
          nombre: docFile.name,
          size: docFile.size,
          mime: docFile.type,
          storagePath,
          downloadURL,
        },
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
            evento: `Documento agregado: ${docNombre} (PDF)`,
          },
        ],
      };

      await upsertOperacionLocal(updated);
      setOperacion(updated);
      setDocNombre("");
      setDocRef("");
      setDocFile(null);
    } catch (e) {
      console.error(e);
      alert("Error subiendo el documento");
    } finally {
      setSubiendoDoc(false);
    }
  };

  const eliminarDocumento = async (index) => {
    const doc = (operacion.documentos || [])[index];
    if (!doc) return;

    const ok = window.confirm(`Eliminar documento "${doc.nombre}"?`);
    if (!ok) return;

    try {
      if (doc.archivo?.storagePath) {
        await deleteObject(ref(storage, doc.archivo.storagePath));
      }

      const updated = {
        ...operacion,
        documentos: (operacion.documentos || []).filter((_, i) => i !== index),
        historial: [
          ...(operacion.historial || []),
          {
            fecha: new Date().toISOString(),
            evento: `Documento eliminado: ${doc.nombre}`,
          },
        ],
      };

      await upsertOperacionLocal(updated);
      setOperacion(updated);
    } catch (e) {
      console.error(e);
      alert("Error eliminando documento");
    }
  };

  /* ===== Estado ===== */
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

  /* ===== Render ===== */
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
          <p className="op-id">Cliente ID: {operacion.clienteId || "-"}</p>
        </div>

        <span className={`estado-badge ${operacion.estado.toLowerCase()}`}>
          {operacion.estado.replace("_", " ")}
        </span>
      </div>

      {/* Finanzas */}
      <section className="detalle-card">
        <h3>Estado financiero</h3>

        <div className="pago-grid">
          <div>
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <div>
            <span>Pagado</span>
            <strong>{money(totalPagado)}</strong>
          </div>
          <div>
            <span>Saldo</span>
            <strong>{money(saldo)}</strong>
          </div>
        </div>

        <div className="progress-wrapper">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progreso}%` }} />
          </div>
          <span>{Math.round(progreso)}%</span>
        </div>

        <div className="pago-actions">
          <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}>
            <option value="ADELANTO">Adelanto</option>
            <option value="PAGO">Pago parcial</option>
          </select>

          <input
            type="number"
            placeholder="Monto"
            value={montoInput}
            onChange={(e) => setMontoInput(e.target.value)}
          />

          <input
            type="date"
            value={fechaInput}
            onChange={(e) => setFechaInput(e.target.value)}
          />

          <select
            value={instrumentoInput}
            onChange={(e) => setInstrumentoInput(e.target.value)}
          >
            <option>TRANSFERENCIA</option>
            <option>EFECTIVO</option>
            <option>CHEQUE</option>
          </select>

          <input
            type="text"
            placeholder="Banco"
            value={bancoInput}
            onChange={(e) => setBancoInput(e.target.value)}
          />

          <button className="btn-primary" onClick={registrarMovimiento}>
            Registrar
          </button>
        </div>

        {(operacion.adelantos || []).map((a, i) => (
          <div key={i} className="pago-line">
            Adelanto {money(a.monto)} · {a.instrumento} · {a.banco}
            {a.estado === "ACTIVO" && (
              <button onClick={() => cancelarMovimiento("adelantos", i)}>
                Cancelar
              </button>
            )}
          </div>
        ))}

        {(operacion.pagos || []).map((p, i) => (
          <div key={i} className="pago-line">
            Pago {money(p.monto)} · {p.instrumento} · {p.banco}
            {p.estado === "ACTIVO" && (
              <button onClick={() => cancelarMovimiento("pagos", i)}>
                Cancelar
              </button>
            )}
          </div>
        ))}
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

          {(operacion.documentos || []).map((d, i) => (
            <li key={i} className="doc-row">
              <div className="doc-left">
                <strong>{d.nombre}</strong> – {d.tipo}
                {d.referencia && ` · ${d.referencia}`}
                {d.archivo?.downloadURL && (
                  <>
                    {" · "}
                    <a
                      href={d.archivo.downloadURL}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-link"
                    >
                      Descargar
                    </a>
                  </>
                )}
              </div>

              <div className="doc-right">
                <button
                  className="btn-link danger"
                  onClick={() => eliminarDocumento(i)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>

        <input
          placeholder="Nombre"
          value={docNombre}
          onChange={(e) => setDocNombre(e.target.value)}
        />

        <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)}>
          <option value="FACTURA">Factura</option>
          <option value="BL">B/L</option>
          <option value="PACKING_LIST">Packing List</option>
          <option value="OTRO">Otro</option>
        </select>

        <input
          placeholder={
            docTipo === "FACTURA"
              ? "Número de factura"
              : docTipo === "BL"
              ? "Número BL"
              : "Referencia"
          }
          value={docRef}
          onChange={(e) => setDocRef(e.target.value)}
        />

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setDocFile(e.target.files[0] || null)}
        />

        <button
          className="btn-secondary"
          onClick={agregarDocumento}
          disabled={subiendoDoc}
        >
          {subiendoDoc ? "Subiendo..." : "Agregar documento"}
        </button>
      </section>

      {/* Historial (AL FINAL, como pediste) */}
      <section className="detalle-card">
        <h3>Historial</h3>

        <ul className="timeline">
          {(operacion.historial || []).length === 0 && (
            <li className="empty">Sin movimientos registrados</li>
          )}

          {(operacion.historial || []).map((h, i) => (
            <li key={i}>
              <span className="time">{new Date(h.fecha).toLocaleString()}</span>
              <span>{h.evento}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
