import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOperacionesLocal,
  upsertOperacionLocal,
  deleteOperacionLocal,
} from "../offline/operacionesRepo";
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import "./operacionesDetalle.css";
import { auditEvent } from "../auth/audit";

const ESTADOS = [
  "PLANIFICADA",
  "CARGADA",
  "EN_TRANSITO",
  "ARRIBADA",
  "EN_DESPACHO",
  "ENTREGADA",
  "BLOQUEADA",
];

// “Ruta” / medio de transporte (alineado con Logística)
const MEDIOS = ["MARÍTIMO", "TERRESTRE", "AÉREO"];

export default function OperacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [operacion, setOperacion] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");

  /* ===== LOGÍSTICA (para el bloque de Estado) ===== */
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [medio, setMedio] = useState("MARÍTIMO"); // “ruta”
  const [fechaSalida, setFechaSalida] = useState("");
  const [eta, setEta] = useState("");
  const [fechaArribo, setFechaArribo] = useState("");
  const [deposito, setDeposito] = useState("");
  const [etaLiberacion, setEtaLiberacion] = useState("");

  /* ===== Finanzas ===== */
  const [editandoTotal, setEditandoTotal] = useState(false);

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

  const [totalOperacionInput, setTotalOperacionInput] = useState("");

  useEffect(() => {
    async function load() {
      const ops = await getOperacionesLocal();
      const op = ops.find((o) => o.id === id);

      setOperacion(op || null);
      setNuevoEstado(op?.estado || "");
      setTotalOperacionInput(op?.totalOperacion || "");

      // hidratar logística (si existe)
      const l = op?.logistica || {};
      setOrigen(l.origen || "");
      setDestino(l.destino || "");
      setMedio(l.medio || "MARÍTIMO");
      setFechaSalida(l.fechaSalida ? String(l.fechaSalida).slice(0, 10) : "");
      setEta(l.eta ? String(l.eta).slice(0, 10) : "");
      setFechaArribo(l.fechaArribo ? String(l.fechaArribo).slice(0, 10) : "");
      setDeposito(l.deposito || "");
      setEtaLiberacion(
        l.etaLiberacion ? String(l.etaLiberacion).slice(0, 10) : ""
      );
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
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se pueden registrar movimientos.");
      return;
    }

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
        auditEvent(`${tipoPago} registrado`, {
          monto,
          moneda,
          instrumento: instrumentoInput,
          banco: bancoInput,
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setMontoInput("");
    setBancoInput("");
  };

  const cancelarMovimiento = async (tipo, index) => {
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se pueden cancelar movimientos.");
      return;
    }

    const updated = {
      ...operacion,
      [tipo]: (operacion[tipo] || []).map((m, i) =>
        i === index ? { ...m, estado: "CANCELADO" } : m
      ),
      historial: [
        ...(operacion.historial || []),
        auditEvent(`${tipo === "adelantos" ? "Adelanto" : "Pago"} cancelado`),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* ===== Documentos (sube a Storage + guarda URL) ===== */
  const agregarDocumento = async () => {
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se pueden agregar documentos.");
      return;
    }

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
          auditEvent("Documento agregado", {
            nombre: docNombre,
            tipo: docTipo,
          }),
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
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se pueden eliminar documentos.");
      return;
    }

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
          auditEvent("Documento eliminado", {
            nombre: doc.nombre,
          }),
        ],
      };

      await upsertOperacionLocal(updated);
      setOperacion(updated);
    } catch (e) {
      console.error(e);
      alert("Error eliminando documento");
    }
  };

  /* ===== Estado =====
     + guarda logística / ruta según estado
  ===== */
  const cambiarEstado = async () => {
    if (operacion.estado === "FINALIZADA") {
      alert("La operación ya está finalizada.");
      return;
    }

    if (nuevoEstado === operacion.estado) {
      alert("El estado ya es ese.");
      return;
    }

    const logistica = {
      ...(operacion.logistica || {}),
      origen: origen || null,
      destino: destino || null,
      medio: medio || "MARÍTIMO",
      fechaSalida: fechaSalida || null,
      eta: eta || null,
      fechaArribo: fechaArribo || null,
      deposito: deposito || null,
      etaLiberacion: etaLiberacion || null,
    };

    const updated = {
      ...operacion,
      estado: nuevoEstado,
      logistica,
      historial: [
        ...(operacion.historial || []),
        auditEvent("Estado cambiado", {
          estado: nuevoEstado,
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setNuevoEstado(nuevoEstado);
  };

  const actualizarTotalOperacion = async () => {
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se puede modificar el total.");
      return;
    }

    const nuevoTotal = Number(String(totalOperacionInput).replace(",", "."));

    if (nuevoTotal < 0) {
      alert("Monto inválido");
      return;
    }

    if (nuevoTotal < totalPagado) {
      alert("El monto total no puede ser menor al ya pagado");
      return;
    }

    const updated = {
      ...operacion,
      totalOperacion: nuevoTotal,
      historial: [
        ...(operacion.historial || []),
        auditEvent("Monto total actualizado", {
          montoAnterior: operacion.totalOperacion || 0,
          montoNuevo: nuevoTotal,
          moneda: operacion.moneda || "USD",
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* ===== FINALIZAR OPERACIÓN ===== */
  const finalizarOperacion = async () => {
    if (operacion.estado === "FINALIZADA") {
      alert("La operación ya está finalizada.");
      return;
    }

    const confirmar = window.confirm(
      "¿Seguro que deseas finalizar esta operación?"
    );
    if (!confirmar) return;

    const updated = {
      ...operacion,
      estado: "FINALIZADA",
      fechaFinalizacion: new Date().toISOString(),
      historial: [
        ...(operacion.historial || []),
        auditEvent("Operación finalizada"),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setNuevoEstado("FINALIZADA");
  };

  /* ===== ELIMINAR OPERACIÓN ===== */
  const eliminarOperacion = async () => {
    const ok = window.confirm(
      `⚠️ Vas a eliminar la operación "${operacion.id}".\n` +
        `Esto la borra del sistema local.\n\n¿Confirmás?`
    );
    if (!ok) return;

    try {
      const updated = {
        ...operacion,
        historial: [
          ...(operacion.historial || []),
          auditEvent("Operación eliminada"),
        ],
      };

      await upsertOperacionLocal(updated);
      await deleteOperacionLocal(operacion.id);
      navigate("/operaciones");
    } catch (e) {
      console.error(e);
      alert("Error eliminando la operación");
    }
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
          <h1>{operacion.proveedorNombre || operacion.proveedor || "-"}</h1>
          <p className="op-id">ID {operacion.id}</p>
          <p className="op-id">Proveedor ID: {operacion.proveedorId || "-"}</p>
        </div>

        <div className="inline-group">
          <span className="mini-label">Moneda</span>
          <select
            value={operacion.moneda || "USD"}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={async (e) => {
              if (operacion.estado === "FINALIZADA") {
                alert("La operación está finalizada. No se puede modificar la moneda.");
                return;
              }

              const nuevaMoneda = e.target.value;

              const updated = {
                ...operacion,
                moneda: nuevaMoneda,
                historial: [
                  ...(operacion.historial || []),
                  auditEvent("Moneda modificada", {
                    moneda: nuevaMoneda,
                  }),
                ],
              };

              await upsertOperacionLocal(updated);
              setOperacion(updated);
            }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        <span className={`estado-badge ${String(operacion.estado || "").toLowerCase()}`}>
          {String(operacion.estado || "").replace("_", " ")}
        </span>
      </div>

      {/* Finanzas */}
      <section className="detalle-card">
        <h3>Estado financiero</h3>

        <div className="total-operacion">
          <span className="mini-label">Total operación</span>

          {!editandoTotal ? (
            <div className="total-view">
              <strong className="total-amount">
                {money(totalOperacionInput || 0)}
              </strong>

              {operacion.estado !== "FINALIZADA" && (
                <button
                  className="btn-link"
                  onClick={() => setEditandoTotal(true)}
                >
                  Editar
                </button>
              )}
            </div>
          ) : (
            <div className="total-edit">
              <input
                type="number"
                value={totalOperacionInput}
                onChange={(e) => setTotalOperacionInput(e.target.value)}
              />

              <button
                className="btn-secondary"
                onClick={async () => {
                  await actualizarTotalOperacion();
                  setEditandoTotal(false);
                }}
              >
                Guardar
              </button>

              <button
                className="btn-link"
                onClick={() => {
                  setEditandoTotal(false);
                  setTotalOperacionInput(operacion.totalOperacion || "");
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

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
          <select
            value={tipoPago}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setTipoPago(e.target.value)}
          >
            <option value="ADELANTO">Adelanto</option>
            <option value="PAGO">Pago parcial</option>
          </select>

          <input
            type="number"
            placeholder="Monto"
            value={montoInput}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setMontoInput(e.target.value)}
          />

          <input
            type="date"
            value={fechaInput}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setFechaInput(e.target.value)}
          />

          <select
            value={instrumentoInput}
            disabled={operacion.estado === "FINALIZADA"}
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
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setBancoInput(e.target.value)}
          />

          <button
            className="btn-primary"
            onClick={registrarMovimiento}
            disabled={operacion.estado === "FINALIZADA"}
          >
            Registrar
          </button>
        </div>

        {(operacion.adelantos || []).map((a, i) => (
          <div key={i} className="pago-line">
            Adelanto {money(a.monto)} · {a.instrumento} · {a.banco}
            {a.estado === "ACTIVO" && operacion.estado !== "FINALIZADA" && (
              <button onClick={() => cancelarMovimiento("adelantos", i)}>
                Cancelar
              </button>
            )}
          </div>
        ))}

        {(operacion.pagos || []).map((p, i) => (
          <div key={i} className="pago-line">
            Pago {money(p.monto)} · {p.instrumento} · {p.banco}
            {p.estado === "ACTIVO" && operacion.estado !== "FINALIZADA" && (
              <button onClick={() => cancelarMovimiento("pagos", i)}>
                Cancelar
              </button>
            )}
          </div>
        ))}
      </section>

      {/* ===== ESTADO DE LA OPERACIÓN ===== */}
      <section className="detalle-card">
        <h3>Estado de la operación</h3>

        {operacion.estado === "FINALIZADA" && (
          <div className="operacion-finalizada">
            ✔ Operación finalizada el{" "}
            {new Date(operacion.fechaFinalizacion).toLocaleDateString()}
          </div>
        )}

        <div className="estado-actual">
          <div>
            <strong>Estado:</strong>{" "}
            {operacion.estado?.replace("_", " ")}
          </div>
          <div>
            <strong>Vía:</strong> {operacion.logistica?.medio || "-"}
          </div>
          <div>
            <strong>Origen:</strong> {operacion.logistica?.origen || "-"}
          </div>
        </div>

        <div className="estado-actions">
          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
            disabled={operacion.estado === "FINALIZADA"}
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e.replace("_", " ")}
              </option>
            ))}
          </select>

          <div className="inline-group">
            <span className="mini-label">Ruta / Medio de transporte</span>
            <select
              value={medio}
              onChange={(e) => setMedio(e.target.value)}
              disabled={operacion.estado === "FINALIZADA"}
            >
              {MEDIOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn-secondary"
            onClick={cambiarEstado}
            disabled={operacion.estado === "FINALIZADA"}
          >
            Actualizar estado
          </button>
        </div>

        <div className="estado-actions" style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Origen"
            value={origen}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setOrigen(e.target.value)}
          />
        </div>

        {nuevoEstado === "EN_TRANSITO" && (
          <div className="estado-actions" style={{ marginTop: 12 }}>
            <div className="inline-group">
              <span className="mini-label">Fecha de salida</span>
              <input
                type="date"
                value={fechaSalida}
                disabled={operacion.estado === "FINALIZADA"}
                onChange={(e) => setFechaSalida(e.target.value)}
              />
            </div>

            <div className="inline-group">
              <span className="mini-label">
                ETA (fecha estimada de arribo)
              </span>
              <input
                type="date"
                value={eta}
                disabled={operacion.estado === "FINALIZADA"}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
          </div>
        )}

        {nuevoEstado === "ARRIBADA" && (
          <div className="estado-actions" style={{ marginTop: 12 }}>
            <div className="inline-group">
              <span className="mini-label">Fecha de arribo</span>
              <input
                type="date"
                value={fechaArribo}
                disabled={operacion.estado === "FINALIZADA"}
                onChange={(e) => setFechaArribo(e.target.value)}
              />
            </div>

            <input
              type="text"
              placeholder="Depósito"
              value={deposito}
              disabled={operacion.estado === "FINALIZADA"}
              onChange={(e) => setDeposito(e.target.value)}
            />

            <div className="inline-group">
              <span className="mini-label">ETA liberación</span>
              <input
                type="date"
                value={etaLiberacion}
                disabled={operacion.estado === "FINALIZADA"}
                onChange={(e) => setEtaLiberacion(e.target.value)}
              />
            </div>
          </div>
        )}

        {operacion.estado !== "FINALIZADA" && (
          <div className="estado-actions" style={{ marginTop: 20 }}>
            <button
              className="btn-danger"
              onClick={finalizarOperacion}
            >
              Finalizar operación
            </button>
          </div>
        )}
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
                {operacion.estado !== "FINALIZADA" && (
                  <button
                    className="btn-link danger"
                    onClick={() => eliminarDocumento(i)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="doc-form">
          <input
            placeholder="Nombre"
            value={docNombre}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setDocNombre(e.target.value)}
          />

          <select
            value={docTipo}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setDocTipo(e.target.value)}
          >
            <option value="FACTURA">Factura comercial</option>
            <option value="PROFORMA">Factura proforma</option>
            <option value="BL">B/L</option>
            <option value="PACKING_LIST">Packing List</option>
            <option value="SWIFT">Swift</option>
            <option value="TRANSFERENCIA">Comprobante transferencia</option>
            <option value="DECLARACION_IMPORTACION">Declaración de importación</option>
            <option value="OTRO">Otro</option>
          </select>

          <input
            placeholder={
              docTipo === "FACTURA" || docTipo === "PROFORMA"
                ? "Número de factura"
                : docTipo === "BL"
                ? "Número BL"
                : docTipo === "SWIFT"
                ? "Código SWIFT"
                : docTipo === "TRANSFERENCIA"
                ? "N° transferencia"
                : "Referencia"
            }
            value={docRef}
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setDocRef(e.target.value)}
          />

          <input
            className="file-input"
            type="file"
            accept="application/pdf"
            disabled={operacion.estado === "FINALIZADA"}
            onChange={(e) => setDocFile(e.target.files[0] || null)}
          />

          <button
            className="btn-secondary"
            onClick={agregarDocumento}
            disabled={subiendoDoc || operacion.estado === "FINALIZADA"}
          >
            {subiendoDoc ? "Subiendo..." : "Agregar documento"}
          </button>
        </div>
      </section>

      {/* ===== ZONA PELIGROSA (ELIMINAR OPERACIÓN) ===== */}
      <section className="detalle-card danger-zone">
        <h3 style={{ color: "#dc2626" }}>Zona peligrosa</h3>
        <p className="op-id" style={{ marginTop: 0 }}>
          Esto elimina la operación del almacenamiento local del sistema.
        </p>
        <button className="btn-danger" onClick={eliminarOperacion}>
          🗑 Eliminar operación
        </button>
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
              <span className="time">{new Date(h.fecha).toLocaleString()}</span>
              <span>
                {h.evento}
                {h.actorNombre && (
                  <em style={{ marginLeft: 6, opacity: 0.6 }}>
                    · {h.actorNombre}
                  </em>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}