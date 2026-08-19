import { INCOTERMS_VERSION, isValidIncoterm } from "./incoterms.js";

export const ESTADOS_OPERACION = [
  "PLANIFICADA",
  "PRODUCCION",
  "CARGADA",
  "EN_TRANSITO",
  "ARRIBADA",
  "EN_DESPACHO",
  "ENTREGADA",
  "BLOQUEADA",
  "FINALIZADA",
];

export const TIPOS_DOCUMENTO = [
  "FACTURA",
  "PROFORMA",
  "PACKING_LIST",
  "BL",
  "DECLARACION_IMPORTACION",
  "OTRO",
];

export function generarIdInternoOperacion() {
  const year = new Date().getFullYear();
  const unique = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `op_${year}_${unique}`;
}

export function referenciaOperacion(input = {}) {
  return String(input.referenciaOperacion || input.id || "").trim();
}

export function referenciaOperacionDuplicada(operaciones = [], referencia = "", excluirId = "") {
  const normalized = String(referencia || "").trim().toLocaleLowerCase("es");
  if (!normalized) return false;
  return operaciones.some((operacion) =>
    operacion.id !== excluirId
    && referenciaOperacion(operacion).toLocaleLowerCase("es") === normalized
  );
}

export function normalizarOperacion(input = {}) {
  return {
    ...input,
    id: String(input.id || "").trim(),
    referenciaOperacion: String(input.referenciaOperacion || "").trim(),
    proveedorId: String(input.proveedorId || "").trim(),
    proveedorNombre: String(input.proveedorNombre || input.proveedor || "").trim(),
    activo: String(input.activo || "").trim(),
    incoterm: String(input.incoterm || "").trim().toUpperCase(),
    incotermVersion: String(input.incotermVersion || INCOTERMS_VERSION),
    moneda: String(input.moneda || "USD").toUpperCase(),
    totalOperacion: Number(input.totalOperacion || input.total || 0),
    estado: ESTADOS_OPERACION.includes(input.estado) ? input.estado : "PLANIFICADA",
    adelantos: Array.isArray(input.adelantos) ? input.adelantos : [],
    pagos: Array.isArray(input.pagos) ? input.pagos : [],
    pagosProgramados: Array.isArray(input.pagosProgramados) ? input.pagosProgramados : [],
    cotizacionesForwarder: Array.isArray(input.cotizacionesForwarder) ? input.cotizacionesForwarder : [],
    forwarderId: String(input.forwarderId || "").trim(),
    forwarderNombre: String(input.forwarderNombre || "").trim(),
    agenteAduanaId: String(input.agenteAduanaId || "").trim(),
    agenteAduanaNombre: String(input.agenteAduanaNombre || "").trim(),
    condicionVenta: input.condicionVenta || null,
    documentos: Array.isArray(input.documentos) ? input.documentos : [],
    historial: Array.isArray(input.historial) ? input.historial : [],
  };
}

export function validarOperacion(input) {
  const operacion = normalizarOperacion(input);
  const errors = [];

  if (!operacion.id) errors.push("El ID es obligatorio");
  if (!operacion.proveedorId) errors.push("El proveedor es obligatorio");
  if (!operacion.activo) errors.push("La mercadería es obligatoria");
  if (operacion.incoterm && !isValidIncoterm(operacion.incoterm)) {
    errors.push("El Incoterm seleccionado no es válido");
  }
  if (!Number.isFinite(operacion.totalOperacion) || operacion.totalOperacion < 0) {
    errors.push("El total debe ser un número positivo");
  }

  return errors;
}

export function calcularFinanzas(input) {
  const operacion = normalizarOperacion(input);
  const movimientos = [...operacion.adelantos, ...operacion.pagos];
  const pagado = movimientos
    .filter((movimiento) => String(movimiento.estado || "").toUpperCase() === "ACTIVO")
    .reduce((total, movimiento) => total + Math.max(0, Number(movimiento.monto || 0)), 0);

  const saldo = Math.max(0, operacion.totalOperacion - pagado);
  const progreso = operacion.totalOperacion > 0
    ? Math.min(100, (pagado / operacion.totalOperacion) * 100)
    : 0;

  return { total: operacion.totalOperacion, pagado, saldo, progreso };
}

export function alertasOperacion(input, now = new Date()) {
  const operacion = normalizarOperacion(input);
  const alerts = [];
  const etaValue = operacion.logistica?.eta;
  const eta = etaValue
    ? new Date(String(etaValue).includes("T") ? etaValue : `${etaValue}T00:00:00`)
    : null;

  if (operacion.estado === "BLOQUEADA") alerts.push("BLOQUEADA");
  if (operacion.estado === "EN_TRANSITO" && !eta) alerts.push("SIN_ETA");
  if (eta && eta < now && !["ENTREGADA", "FINALIZADA"].includes(operacion.estado)) {
    alerts.push("ETA_VENCIDA");
  }
  if (operacion.documentos.some((documento) => documento.estado === "PENDIENTE")) {
    alerts.push("DOCUMENTOS_PENDIENTES");
  }
  if (operacion.estado !== "FINALIZADA" && calcularFinanzas(operacion).saldo > 0) {
    alerts.push("PAGO_PENDIENTE");
  }

  return alerts;
}
