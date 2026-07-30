import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOperacionesLocal,
  upsertOperacionLocal,
} from "../offline/operacionesRepo";
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import "./operacionesDetalle.css";
import { auditEvent } from "../auth/audit";
import { useAuth } from "../auth/AuthContext";
import { isPrimaryAdmin, ROLES } from "../auth/roles";
import { countryFlag, countryLabel } from "../domain/paises";
import {
  condicionCumplida,
  condicionLabel,
  estadoPagoProgramado,
  importeCuota,
  obtenerPlanPagos,
} from "../domain/pagos";

const ESTADOS = [
  "PLANIFICADA",
  "PRODUCCION",
  "CARGADA",
  "EN_TRANSITO",
  "ARRIBADA",
  "EN_DESPACHO",
  "ENTREGADA",
  "BLOQUEADA",
];

// “Ruta” / medio de transporte (alineado con Logística)
const MEDIOS = ["MARÍTIMO", "TERRESTRE", "AÉREO"];
const TIPOS_CARGA = [
  "Carga suelta",
  "Pallet",
  "Contenedor 20 pies (Dry)",
  "Contenedor 40 pies (Dry)",
  "Contenedor 40 pies High Cube",
  "Contenedor 20 pies refrigerado",
  "Contenedor 40 pies refrigerado",
  "Carga aérea",
  "Carga a granel",
  "Otro",
];
const FLUJO_ESTADOS = [
  "PLANIFICADA",
  "PRODUCCION",
  "CARGADA",
  "EN_TRANSITO",
  "ARRIBADA",
  "EN_DESPACHO",
  "ENTREGADA",
];

const estadoLabel = (estado) =>
  estado === "PRODUCCION" ? "PRODUCCIÓN" : estado?.replaceAll("_", " ") || "-";
const medioIcon = (value) =>
  value === "AÉREO" ? "✈️" : value === "TERRESTRE" ? "🚚" : "⚓";

const FINANCIAL_DOCUMENT_TYPES = new Set([
  "FACTURA",
  "PROFORMA",
  "SWIFT",
  "TRANSFERENCIA",
]);

const LOGISTICS_DOCUMENT_TYPES = new Set([
  "BL",
  "PACKING_LIST",
  "DECLARACION_IMPORTACION",
]);

const inferDocumentArea = (documento = {}) => {
  if (documento.area) return documento.area;
  if (FINANCIAL_DOCUMENT_TYPES.has(documento.tipo)) return "finanzas";
  if (LOGISTICS_DOCUMENT_TYPES.has(documento.tipo)) return "logistica";
  const text = `${documento.nombre || ""} ${documento.referencia || ""}`.toLowerCase();
  return /(pago|factura|banco|swift|transfer|anticipo|adelanto)/.test(text)
    ? "finanzas"
    : "logistica";
};

const inferHistoryArea = (item = {}, documentos = []) => {
  if (item.area) return item.area;
  const event = String(item.evento || "").toLowerCase();
  if (/(pago|adelanto|monto|moneda|vencimiento|banco|finanz)/.test(event)) {
    return "finanzas";
  }
  if (/(estado|logística|logistica|arribo|tránsito|transito|despacho|entrega|finalizada)/.test(event)) {
    return "logistica";
  }
  if (event.includes("documento")) {
    const relatedDocument = documentos.find(
      (documento) => documento.nombre && documento.nombre === item.nombre
    );
    if (relatedDocument) return inferDocumentArea(relatedDocument);
    if (item.tipo) return inferDocumentArea({ tipo: item.tipo, nombre: item.nombre });
  }
  return "general";
};

export default function OperacionDetalle({ modo = "resumen" }) {
  const { permissions, profile, user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [operacion, setOperacion] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");

  /* ===== LOGÍSTICA (para el bloque de Estado) ===== */
  const [origen, setOrigen] = useState("");
  const destino = "Chile";
  const [medio, setMedio] = useState("MARÍTIMO"); // “ruta”
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaFinFabricacion, setFechaFinFabricacion] = useState("");
  const [eta, setEta] = useState("");
  const [fechaArribo, setFechaArribo] = useState("");
  const [deposito, setDeposito] = useState("");
  const [etaLiberacion, setEtaLiberacion] = useState("");
  const [tipoCarga, setTipoCarga] = useState("");
  const [cantidadBultos, setCantidadBultos] = useState("");

  /* ===== Finanzas ===== */
  const [editandoTotal, setEditandoTotal] = useState(false);

  const [montoInput, setMontoInput] = useState("");
  const [instrumentoInput, setInstrumentoInput] = useState("TRANSFERENCIA");
  const [bancoInput, setBancoInput] = useState("");
  const [fechaInput, setFechaInput] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [cuotaInput, setCuotaInput] = useState("adelanto");
  const [motivoInput, setMotivoInput] = useState("");
  const [confirmandoId, setConfirmandoId] = useState("");

  /* ===== Documentos ===== */
  const [docNombre, setDocNombre] = useState("");
  const [docTipo, setDocTipo] = useState(modo === "logistica" ? "BL" : "FACTURA");
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
      setMedio(l.medio || "MARÍTIMO");
      setFechaSalida(l.fechaSalida ? String(l.fechaSalida).slice(0, 10) : "");
      setFechaFinFabricacion(
        l.fechaFinFabricacion ? String(l.fechaFinFabricacion).slice(0, 10) : ""
      );
      setEta(l.eta ? String(l.eta).slice(0, 10) : "");
      setFechaArribo(l.fechaArribo ? String(l.fechaArribo).slice(0, 10) : "");
      setDeposito(l.deposito || "");
      setEtaLiberacion(
        l.etaLiberacion ? String(l.etaLiberacion).slice(0, 10) : ""
      );
      setTipoCarga(l.tipoCarga || "");
      setCantidadBultos(l.cantidadBultos || "");
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

  const esResumen = modo === "resumen";
  const esLogistica = modo === "logistica";
  const esFinanzas = modo === "finanzas";
  const esAdminGeneral =
    profile?.role === ROLES.ADMIN || isPrimaryAdmin(user?.email);

  /* ===== Guard ===== */
  if (!operacion) return <p className="loading">Cargando operación...</p>;

  const documentosConIndice = (operacion.documentos || []).map((documento, index) => ({
    documento,
    index,
  }));
  const documentosVisibles = esResumen
    ? documentosConIndice
    : documentosConIndice.filter(({ documento }) => inferDocumentArea(documento) === modo);
  const historialVisible = esResumen
    ? operacion.historial || []
    : (operacion.historial || []).filter(
        (item) => inferHistoryArea(item, operacion.documentos || []) === modo
      );
  const planPagos = obtenerPlanPagos(operacion);
  const pagosProgramados = operacion.pagosProgramados || [];

  /* ===== Finanzas acciones ===== */
  const programarPago = async () => {
    if (!permissions.manageFinances) return alert("No tenés permiso para modificar finanzas.");
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se pueden programar pagos.");
      return;
    }

    const monto = Number(String(montoInput).replace(",", "."));
    if (!monto || monto <= 0) return alert("Monto inválido");
    if (monto > saldo) return alert("Supera el saldo pendiente");
    if (!fechaInput) return alert("Indicá una fecha prevista");
    if (!motivoInput.trim()) return alert("Indicá el motivo del pago");

    const nuevoProgramado = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `pago_${Date.now()}`,
      cuotaId: cuotaInput,
      monto,
      moneda,
      fechaProgramada: fechaInput,
      motivo: motivoInput.trim(),
      estado: "POR_HACER",
      creadoAt: new Date().toISOString(),
    };

    const updated = {
      ...operacion,
      pagosProgramados: [...pagosProgramados, nuevoProgramado],
      historial: [
        ...(operacion.historial || []),
        auditEvent("Pago programado", {
          area: "finanzas",
          programadoId: nuevoProgramado.id,
          cuotaId: cuotaInput,
          monto,
          moneda,
          fecha: fechaInput,
          motivo: motivoInput.trim(),
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setMontoInput("");
    setMotivoInput("");
  };

  const confirmarPago = async (programado) => {
    if (!esAdminGeneral) {
      alert("Solo el administrador general puede confirmar pagos efectivos.");
      return;
    }
    if (!bancoInput.trim()) return alert("Indicá el banco");
    if (!fechaInput) return alert("Indicá la fecha efectiva");

    const campo = programado.cuotaId === "adelanto" ? "adelantos" : "pagos";
    const movimiento = {
      monto: Number(programado.monto || 0),
      moneda,
      instrumento: instrumentoInput,
      banco: bancoInput.trim(),
      fecha: fechaInput,
      estado: "ACTIVO",
      programadoId: programado.id,
    };
    const updated = {
      ...operacion,
      [campo]: [...(operacion[campo] || []), movimiento],
      pagosProgramados: pagosProgramados.map((pago) =>
        pago.id === programado.id
          ? {
              ...pago,
              estado: "PAGADO",
              pagadoAt: new Date().toISOString(),
              fechaEfectiva: fechaInput,
              banco: bancoInput.trim(),
              instrumento: instrumentoInput,
              confirmadoPor: user?.email || "",
            }
          : pago
      ),
      historial: [
        ...(operacion.historial || []),
        auditEvent("Pago efectivo confirmado", {
          area: "finanzas",
          programadoId: programado.id,
          monto: movimiento.monto,
          moneda,
          banco: movimiento.banco,
        }),
      ],
    };
    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setConfirmandoId("");
    setBancoInput("");
  };

  const cancelarPagoProgramado = async (programado) => {
    if (!permissions.manageFinances || programado.estado === "PAGADO") return;
    const updated = {
      ...operacion,
      pagosProgramados: pagosProgramados.map((pago) =>
        pago.id === programado.id ? { ...pago, estado: "CANCELADO" } : pago
      ),
      historial: [
        ...(operacion.historial || []),
        auditEvent("Pago programado cancelado", {
          area: "finanzas",
          programadoId: programado.id,
          monto: programado.monto,
          moneda,
        }),
      ],
    };
    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  const cancelarMovimiento = async (tipo, index) => {
    if (!permissions.manageFinances) return alert("No tenés permiso para modificar finanzas.");
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
        auditEvent(`${tipo === "adelantos" ? "Adelanto" : "Pago"} cancelado`, {
          area: "finanzas",
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* ===== Documentos (sube a Storage + guarda URL) ===== */
  const agregarDocumento = async () => {
    if (!permissions.manageDocuments) return alert("No tenés permiso para modificar documentos.");
    if (operacion.estado === "FINALIZADA") {
      alert("La operación está finalizada. No se pueden agregar documentos.");
      return;
    }

    if (!docNombre.trim()) return alert("Nombre requerido");
    if (!docFile) return alert("Adjuntá el PDF del documento");
    if (docFile.type !== "application/pdf")
      return alert("Solo se permiten archivos PDF");
    if (docFile.size > 10 * 1024 * 1024)
      return alert("El archivo no puede superar los 10 MB");

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
        area: modo,
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
            area: modo,
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
    if (!permissions.manageDocuments) return alert("No tenés permiso para modificar documentos.");
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
            area: inferDocumentArea(doc),
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

  const cambiarEstadoDocumento = async (index, estado) => {
    if (!permissions.manageDocuments) {
      return alert("No tenés permiso para validar documentos.");
    }
    if (operacion.estado === "FINALIZADA") return;

    const documento = operacion.documentos?.[index];
    if (!documento) return;
    const revision = auditEvent("Documento revisado");
    const updated = {
      ...operacion,
      documentos: operacion.documentos.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              estado,
              validadoAt: revision.fecha,
              validadoPor: revision.actorEmail,
            }
          : item
      ),
      historial: [
        ...(operacion.historial || []),
        auditEvent(`Documento ${estado.toLowerCase()}`, {
          area: inferDocumentArea(documento),
          nombre: documento.nombre,
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  /* ===== Estado =====
     + guarda logística / ruta según estado
  ===== */
  const cambiarEstado = async (estadoObjetivo = nuevoEstado) => {
    if (!permissions.manageOperations) return alert("No tenés permiso para modificar operaciones.");
    if (operacion.estado === "FINALIZADA") {
      alert("La operación ya está finalizada.");
      return;
    }

    if (estadoObjetivo === operacion.estado) {
      alert("El estado ya es ese.");
      return;
    }

    const logistica = {
      ...(operacion.logistica || {}),
      origen: origen || null,
      destino,
      medio: medio || "MARÍTIMO",
      fechaSalida: fechaSalida || null,
      fechaFinFabricacion: fechaFinFabricacion || null,
      eta: eta || null,
      fechaArribo: fechaArribo || null,
      deposito: deposito || null,
      etaLiberacion: etaLiberacion || null,
      tipoCarga: tipoCarga || null,
      cantidadBultos: cantidadBultos ? Number(cantidadBultos) : null,
    };

    const updated = {
      ...operacion,
      estado: estadoObjetivo,
      logistica,
      historial: [
        ...(operacion.historial || []),
        auditEvent("Estado cambiado", {
          area: "logistica",
          estado: estadoObjetivo,
        }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setNuevoEstado(estadoObjetivo);
  };

  const guardarLogistica = async () => {
    if (!permissions.manageOperations) return alert("No tenés permiso para modificar operaciones.");
    if (operacion.estado === "FINALIZADA") return;

    const updated = {
      ...operacion,
      logistica: {
        ...(operacion.logistica || {}),
        origen: origen || null,
        destino,
        medio: medio || "MARÍTIMO",
        fechaSalida: fechaSalida || null,
        fechaFinFabricacion: fechaFinFabricacion || null,
        eta: eta || null,
        fechaArribo: fechaArribo || null,
        deposito: deposito || null,
        etaLiberacion: etaLiberacion || null,
        tipoCarga: tipoCarga || null,
        cantidadBultos: cantidadBultos ? Number(cantidadBultos) : null,
      },
      historial: [
        ...(operacion.historial || []),
        auditEvent("Datos logísticos actualizados", { area: "logistica" }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
  };

  const actualizarTotalOperacion = async () => {
    if (!permissions.manageFinances) return alert("No tenés permiso para modificar finanzas.");
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
          area: "finanzas",
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
    if (!permissions.manageOperations) return alert("No tenés permiso para finalizar operaciones.");
    if (operacion.estado === "FINALIZADA") {
      alert("La operación ya está finalizada.");
      return;
    }
    if (operacion.estado !== "ENTREGADA") {
      alert("Para finalizar, la operación primero debe estar ENTREGADA.");
      return;
    }
    if (saldo > 0) {
      alert(`Todavía queda un saldo pendiente de ${money(saldo)}.`);
      return;
    }
    const documentosPendientes = (operacion.documentos || []).filter(
      (documento) => !["VALIDADO", "APROBADO"].includes(documento.estado)
    );
    if (documentosPendientes.length > 0) {
      alert("Hay documentos pendientes de validar antes de finalizar.");
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
        auditEvent("Operación finalizada", { area: "logistica" }),
      ],
    };

    await upsertOperacionLocal(updated);
    setOperacion(updated);
    setNuevoEstado("FINALIZADA");
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

        {esFinanzas ? (
          <div className="inline-group">
            <span className="mini-label">Moneda</span>
            <select
              value={operacion.moneda || "USD"}
              disabled={operacion.estado === "FINALIZADA" || !permissions.manageFinances}
              onChange={async (e) => {
                const nuevaMoneda = e.target.value;
                const updated = {
                  ...operacion,
                  moneda: nuevaMoneda,
                  historial: [
                    ...(operacion.historial || []),
                    auditEvent("Moneda modificada", { area: "finanzas", moneda: nuevaMoneda }),
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
        ) : (
          <div className="detalle-context">
            <span>{esLogistica ? "Módulo logístico" : "Resumen general"}</span>
            <strong>{esLogistica ? `${medioIcon(medio)} ${medio}` : operacion.moneda || "USD"}</strong>
          </div>
        )}

        <span className={`estado-badge ${String(operacion.estado || "").toLowerCase()}`}>
          {String(operacion.estado || "").replace("_", " ")}
        </span>
      </div>

      {esResumen && (
        <section className="detalle-card operation-overview">
          <div className="overview-heading">
            <div>
              <span className="workflow-eyebrow">Vista consolidada</span>
              <h3>Resumen de la operación</h3>
              <p>Esta pantalla es informativa. Las modificaciones se realizan desde cada área.</p>
            </div>
          </div>

          <div className="overview-metrics">
            <div><span>Estado logístico</span><strong>{estadoLabel(operacion.estado)}</strong></div>
            <div><span>Ruta</span><strong>{countryLabel(origen, "Origen")} → {countryLabel(destino)}</strong></div>
            <div><span>Total</span><strong>{money(total)}</strong></div>
            <div><span>Saldo pendiente</span><strong>{money(saldo)}</strong></div>
          </div>

          <div className="overview-actions">
            {permissions.manageOperations && (
              <button className="area-shortcut logistics" onClick={() => navigate(`/logistica/${operacion.id}`)}>
                <span className="area-shortcut-icon">→</span>
                <span><small>Gestión operativa</small><strong>Ir a Logística</strong></span>
                <b>↗</b>
              </button>
            )}
            {permissions.manageFinances && (
              <button className="area-shortcut finances" onClick={() => navigate(`/finanzas/${operacion.id}`)}>
                <span className="area-shortcut-icon">$</span>
                <span><small>Pagos y movimientos</small><strong>Ir a Finanzas</strong></span>
                <b>↗</b>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Finanzas */}
      {esFinanzas && (
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

        <section className="payment-plan-card">
          <div className="payment-plan-head">
            <div>
              <span className="workflow-eyebrow">Condición comercial</span>
              <h4>Plan de pagos</h4>
            </div>
            <small>{planPagos.reduce((sum, cuota) => sum + Number(cuota.porcentaje || 0), 0)}% distribuido</small>
          </div>
          <div className="payment-plan-grid">
            {planPagos.map((cuota) => {
              const habilitada = condicionCumplida(cuota.condicion, operacion.estado);
              return (
                <article className={`payment-installment ${habilitada ? "available" : ""}`} key={cuota.id}>
                  <div className="installment-percent">{cuota.porcentaje}%</div>
                  <div>
                    <strong>{cuota.nombre}</strong>
                    <span>{condicionLabel(cuota.condicion)}</span>
                    <small>{cuota.fechaEstimada ? `Estimado: ${new Date(`${cuota.fechaEstimada}T00:00:00`).toLocaleDateString("es-AR")}` : "Sin fecha estimada"}</small>
                  </div>
                  <div className="installment-amount">
                    <strong>{money(importeCuota(cuota, total))}</strong>
                    <span>{habilitada ? "Condición cumplida" : "Condición pendiente"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="payment-scheduler">
          <div className="payment-scheduler-head">
            <div>
              <span className="workflow-eyebrow">Agenda financiera</span>
              <h4>Programar un pago</h4>
              <p>La programación no modifica el saldo hasta que el administrador confirme el pago.</p>
            </div>
            <span className="scheduled-state">POR HACER</span>
          </div>
          <div className="payment-scheduler-form">
            <label>
              <span>Tramo</span>
              <select value={cuotaInput} onChange={(e) => setCuotaInput(e.target.value)}>
                {planPagos.map((cuota) => (
                  <option key={cuota.id} value={cuota.id}>{cuota.nombre} · {cuota.porcentaje}%</option>
                ))}
              </select>
            </label>
            <label>
              <span>Fecha prevista</span>
              <input type="date" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} />
            </label>
            <label>
              <span>Monto</span>
              <input type="number" placeholder="0" value={montoInput} onChange={(e) => setMontoInput(e.target.value)} />
            </label>
            <label className="scheduler-reason">
              <span>Motivo</span>
              <input type="text" placeholder="Ej. Adelanto solicitado por proveedor" value={motivoInput} onChange={(e) => setMotivoInput(e.target.value)} />
            </label>
            <button className="btn-primary" onClick={programarPago} disabled={operacion.estado === "FINALIZADA"}>
              Programar pago
            </button>
          </div>
        </section>

        <div className="scheduled-payments">
          <div className="scheduled-payments-head">
            <h4>Pagos programados</h4>
            <span>{pagosProgramados.filter((pago) => pago.estado !== "CANCELADO").length}</span>
          </div>
          {pagosProgramados.length === 0 && <p className="empty">No hay pagos programados.</p>}
          {pagosProgramados.map((programado) => {
            const status = estadoPagoProgramado(programado);
            const cuota = planPagos.find((item) => item.id === programado.cuotaId);
            return (
              <article className={`scheduled-payment ${status.toLowerCase()}`} key={programado.id}>
                <div className="scheduled-date">
                  <strong>{programado.fechaProgramada ? new Date(`${programado.fechaProgramada}T00:00:00`).getDate() : "–"}</strong>
                  <span>{programado.fechaProgramada ? new Date(`${programado.fechaProgramada}T00:00:00`).toLocaleDateString("es-AR", { month: "short" }) : "Sin fecha"}</span>
                </div>
                <div className="scheduled-copy">
                  <strong>{programado.motivo}</strong>
                  <span>{cuota?.nombre || "Pago"} · {money(programado.monto)}</span>
                </div>
                <span className={`scheduled-badge ${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span>
                {programado.estado === "POR_HACER" && (
                  <div className="scheduled-actions">
                    {esAdminGeneral && (
                      <button onClick={() => setConfirmandoId(programado.id)}>Confirmar pago</button>
                    )}
                    <button className="danger" onClick={() => cancelarPagoProgramado(programado)}>Cancelar</button>
                  </div>
                )}
                {confirmandoId === programado.id && (
                  <div className="payment-confirmation">
                    <strong>Confirmar pago efectivo</strong>
                    <input type="date" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} />
                    <select value={instrumentoInput} onChange={(e) => setInstrumentoInput(e.target.value)}>
                      <option>TRANSFERENCIA</option>
                      <option>EFECTIVO</option>
                      <option>CHEQUE</option>
                    </select>
                    <input type="text" placeholder="Banco" value={bancoInput} onChange={(e) => setBancoInput(e.target.value)} />
                    <button onClick={() => confirmarPago(programado)}>Confirmar efectivo</button>
                    <button className="cancel" onClick={() => setConfirmandoId("")}>Cerrar</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="effective-payments-title">Pagos efectivos confirmados</div>
        {(operacion.adelantos || []).map((a, i) => (
          <div key={i} className="pago-line">
            Adelanto {money(a.monto)} · {a.instrumento} · {a.banco}
            {a.estado === "ACTIVO" && operacion.estado !== "FINALIZADA" && esAdminGeneral && (
              <button onClick={() => cancelarMovimiento("adelantos", i)}>
                Cancelar
              </button>
            )}
          </div>
        ))}

        {(operacion.pagos || []).map((p, i) => (
          <div key={i} className="pago-line">
            Pago {money(p.monto)} · {p.instrumento} · {p.banco}
            {p.estado === "ACTIVO" && operacion.estado !== "FINALIZADA" && esAdminGeneral && (
              <button onClick={() => cancelarMovimiento("pagos", i)}>
                Cancelar
              </button>
            )}
          </div>
        ))}
      </section>
      )}

      {/* ===== ESTADO DE LA OPERACIÓN ===== */}
      {esLogistica && (
      <section className="detalle-card workflow-card">
        {(() => {
          const estadoActual = operacion.estado;
          const currentIndex = FLUJO_ESTADOS.indexOf(estadoActual);
          const safeIndex = Math.max(0, currentIndex);
          const proximoEstado =
            estadoActual === "FINALIZADA" || safeIndex >= FLUJO_ESTADOS.length - 1
              ? null
              : FLUJO_ESTADOS[safeIndex + 1];
          const avance =
            estadoActual === "FINALIZADA"
              ? 100
              : Math.round((safeIndex / (FLUJO_ESTADOS.length - 1)) * 100);
          const faltantes = [];
          if (!origen.trim()) faltantes.push("Definir país de origen");
          if (proximoEstado === "PRODUCCION" && !fechaSalida)
            faltantes.push("Ingresar salida estimada (ETD)");
          if (proximoEstado === "PRODUCCION" && !tipoCarga)
            faltantes.push("Seleccionar el tipo de carga");
          if (proximoEstado === "CARGADA" && !fechaFinFabricacion)
            faltantes.push("Ingresar fin estimado de fabricación");
          if (proximoEstado === "EN_TRANSITO" && !eta)
            faltantes.push("Ingresar fecha estimada de arribo");
          if (proximoEstado === "ARRIBADA" && !fechaArribo)
            faltantes.push("Ingresar fecha real de arribo");

          const avanzar = () => {
            if (faltantes.length) {
              alert(`Antes de avanzar:\n• ${faltantes.join("\n• ")}`);
              return;
            }
            cambiarEstado(proximoEstado);
          };

          return (
            <>
              <div className="workflow-head">
                <div>
                  <span className="workflow-eyebrow">Seguimiento logístico</span>
                  <h3>Estado de la operación</h3>
                  <p>Actualizá el recorrido y avanzá al siguiente hito.</p>
                </div>
                <div className="workflow-progress">
                  <strong>{avance}%</strong>
                  <span>completado</span>
                </div>
              </div>

              {operacion.estado === "FINALIZADA" && (
                <div className="operacion-finalizada">
                  ✓ Operación finalizada el{" "}
                  {new Date(operacion.fechaFinalizacion).toLocaleDateString()}
                </div>
              )}

              <div className="workflow-timeline" aria-label="Progreso de la operación">
                {FLUJO_ESTADOS.map((estado, index) => {
                  const completed = currentIndex > index || estadoActual === "FINALIZADA";
                  const active = estadoActual === estado;
                  return (
                    <div
                      key={estado}
                      className={`workflow-step ${completed ? "is-complete" : ""} ${
                        active ? "is-active" : ""
                      }`}
                    >
                      <span className="workflow-dot">{completed ? "✓" : index + 1}</span>
                      <span>{estadoLabel(estado)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="workflow-summary">
                <div>
                  <span>Estado actual</span>
                  <strong>{estadoLabel(estadoActual)}</strong>
                </div>
                <div>
                  <span>Transporte</span>
                  <strong>{medioIcon(medio)} {medio}</strong>
                </div>
                <div>
                  <span>Ruta</span>
                  <strong>{countryLabel(origen, "Origen")} → {countryLabel(destino, "Destino")}</strong>
                </div>
                <div>
                  <span>Próximo hito</span>
                  <strong>{proximoEstado ? estadoLabel(proximoEstado) : "Ciclo completo"}</strong>
                </div>
              </div>

              <div className="workflow-body">
                <div className="workflow-form-panel">
                  <h4>Datos del recorrido</h4>
                  <div className="workflow-form-grid">
                    <label>
                      <span>País de origen</span>
                      <div className="country-input">
                        <b>{countryFlag(origen)}</b>
                        <input
                          type="text"
                          placeholder="Ej. China"
                          value={origen}
                          disabled={estadoActual === "FINALIZADA"}
                          onChange={(e) => setOrigen(e.target.value)}
                        />
                      </div>
                    </label>
                    <label>
                      <span>País de destino</span>
                      <div className="country-input fixed-country" aria-label="Destino fijo: Chile">
                        <b>{countryFlag(destino)}</b>
                        <span>Chile</span>
                        <small>Destino fijo</small>
                      </div>
                    </label>
                    <label>
                      <span>Medio de transporte</span>
                      <select
                        value={medio}
                        onChange={(e) => setMedio(e.target.value)}
                        disabled={estadoActual === "FINALIZADA"}
                      >
                        {MEDIOS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </label>

                    {estadoActual === "PLANIFICADA" && (
                      <label>
                        <span>Salida estimada (ETD)</span>
                        <input type="date" value={fechaSalida} disabled={estadoActual === "FINALIZADA"} onChange={(e) => setFechaSalida(e.target.value)} />
                      </label>
                    )}

                    {estadoActual === "PRODUCCION" && (
                      <label>
                        <span>Fin estimado de fabricación</span>
                        <input type="date" value={fechaFinFabricacion} disabled={estadoActual === "FINALIZADA"} onChange={(e) => setFechaFinFabricacion(e.target.value)} />
                      </label>
                    )}

                    {(estadoActual === "CARGADA" || estadoActual === "EN_TRANSITO") && (
                        <label>
                          <span>Arribo estimado (ETA)</span>
                          <input type="date" value={eta} disabled={estadoActual === "FINALIZADA"} onChange={(e) => setEta(e.target.value)} />
                        </label>
                    )}

                    {(proximoEstado === "ARRIBADA" || nuevoEstado === "ARRIBADA") && (
                      <>
                        <label>
                          <span>Fecha real de arribo</span>
                          <input type="date" value={fechaArribo} disabled={estadoActual === "FINALIZADA"} onChange={(e) => setFechaArribo(e.target.value)} />
                        </label>
                        <label>
                          <span>Depósito</span>
                          <input type="text" value={deposito} disabled={estadoActual === "FINALIZADA"} onChange={(e) => setDeposito(e.target.value)} />
                        </label>
                        <label>
                          <span>Liberación estimada</span>
                          <input type="date" value={etaLiberacion} disabled={estadoActual === "FINALIZADA"} onChange={(e) => setEtaLiberacion(e.target.value)} />
                        </label>
                      </>
                    )}
                  </div>

                  <div className="cargo-details-cell">
                    <div className="cargo-details-copy">
                      <span>DETALLES DEL PRODUCTO / BULTO</span>
                      <strong>{operacion.activo || "Mercadería sin especificar"}</strong>
                      <small>Configuración física prevista para el embarque.</small>
                    </div>
                    <label>
                      <span>Tipo de carga</span>
                      <select
                        value={tipoCarga}
                        onChange={(e) => setTipoCarga(e.target.value)}
                        disabled={estadoActual === "FINALIZADA"}
                      >
                        <option value="">Seleccionar tipo</option>
                        {TIPOS_CARGA.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Cantidad de bultos <small>(opcional)</small></span>
                      <input
                        type="number"
                        min="1"
                        value={cantidadBultos}
                        disabled={estadoActual === "FINALIZADA"}
                        onChange={(e) => setCantidadBultos(e.target.value)}
                        placeholder="Ej. 12"
                      />
                    </label>
                  </div>

                  {estadoActual === "EN_TRANSITO" && (
                    <button className="save-logistics-button" onClick={guardarLogistica} disabled={!permissions.manageOperations}>
                      Guardar ETA y datos logísticos
                    </button>
                  )}
                </div>

                {estadoActual !== "FINALIZADA" && proximoEstado && (
                  <aside className="next-action-card">
                    <span>PRÓXIMO PASO</span>
                    <div className="next-action-icon">→</div>
                    <h4>{estadoLabel(proximoEstado)}</h4>
                    {faltantes.length ? (
                      <>
                        <p>Completá estos datos para continuar:</p>
                        <ul>{faltantes.map((item) => <li key={item}>{item}</li>)}</ul>
                      </>
                    ) : (
                      <p className="ready-message">✓ Todo listo para avanzar.</p>
                    )}
                    <button onClick={avanzar} disabled={!permissions.manageOperations}>
                      Avanzar a {estadoLabel(proximoEstado)}
                    </button>
                  </aside>
                )}
              </div>

              {estadoActual !== "FINALIZADA" && (
                <details className="workflow-more">
                  <summary>Más acciones y correcciones</summary>
                  <div className="workflow-more-content">
                    <label>
                      <span>Cambiar estado manualmente</span>
                      <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
                        {ESTADOS.map((estado) => <option key={estado} value={estado}>{estadoLabel(estado)}</option>)}
                      </select>
                    </label>
                    <button className="btn-secondary" onClick={() => cambiarEstado(nuevoEstado)}>
                      Guardar cambio
                    </button>
                    <button className="btn-danger btn-finalize" onClick={finalizarOperacion}>
                      Finalizar operación
                    </button>
                  </div>
                  <small>Solo se puede finalizar cuando esté entregada, sin saldo ni documentos pendientes.</small>
                </details>
              )}
            </>
          );
        })()}
      </section>
      )}

      {/* Documentos */}
      <details className="detalle-card shared-collapsible" open={esResumen ? true : undefined}>
        <summary>
          <span>
            <small>{esResumen ? "Documentación general" : `Documentación de ${modo}`}</small>
            <strong>Documentos</strong>
          </span>
          <b>{documentosVisibles.length}</b>
        </summary>

        <ul className="docs-list">
          {documentosVisibles.length === 0 && (
            <li className="empty">No hay documentos de esta área</li>
          )}

          {documentosVisibles.map(({ documento: d, index }) => (
            <li key={index} className="doc-row">
              <div className="doc-left">
                <strong>{d.nombre}</strong> – {d.tipo} · {d.estado || "PENDIENTE"}
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
                {!esResumen && operacion.estado !== "FINALIZADA" && (
                  <>
                    {d.estado !== "VALIDADO" && (
                      <button className="btn-link" onClick={() => cambiarEstadoDocumento(index, "VALIDADO")}>
                        Validar
                      </button>
                    )}
                    {d.estado !== "RECHAZADO" && (
                      <button className="btn-link" onClick={() => cambiarEstadoDocumento(index, "RECHAZADO")}>
                        Rechazar
                      </button>
                    )}
                    <button
                      className="btn-link danger"
                      onClick={() => eliminarDocumento(index)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!esResumen && (
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
            {esFinanzas ? (
              <>
                <option value="FACTURA">Factura comercial</option>
                <option value="PROFORMA">Factura proforma</option>
                <option value="SWIFT">Swift</option>
                <option value="TRANSFERENCIA">Comprobante transferencia</option>
              </>
            ) : (
              <>
                <option value="BL">B/L</option>
                <option value="PACKING_LIST">Packing List</option>
                <option value="DECLARACION_IMPORTACION">Declaración de importación</option>
              </>
            )}
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
        )}
      </details>

      {/* Historial */}
      <details className="detalle-card shared-collapsible" open={esResumen ? true : undefined}>
        <summary>
          <span>
            <small>{esResumen ? "Actividad completa" : `Actividad de ${modo}`}</small>
            <strong>Historial</strong>
          </span>
          <b>{historialVisible.length}</b>
        </summary>

        <ul className="timeline">
          {historialVisible.length === 0 && (
            <li className="empty">Sin movimientos registrados en esta área</li>
          )}

          {historialVisible.map((h, i) => (
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
      </details>
    </section>
  );
}
