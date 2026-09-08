export const CONDICIONES_PAGO = [
  { value: "AL_CREAR", label: "Al crear la operación" },
  { value: "SALIDA_ORIGEN", label: "Contra salida de origen" },
  { value: "DOCUMENTOS_EMBARQUE", label: "Contra documentación de embarque" },
  { value: "ARRIBO_CHILE", label: "Al arribo del producto a Chile" },
  { value: "ARRIBO_BODEGA", label: "Al arribo a bodega propia" },
  { value: "FECHA_DETERMINADA", label: "En una fecha determinada" },
  { value: "SOLICITUD_PROVEEDOR", label: "Contra solicitud del proveedor" },
  { value: "OTRA", label: "Otra condición" },
];

export const condicionLabel = (value) =>
  CONDICIONES_PAGO.find((item) => item.value === value)?.label || "Otra condición";

export const PLAN_PAGOS_PREDETERMINADO = [
  { id: "cuota_1", nombre: "Adelanto", porcentaje: 30, condicion: "AL_CREAR", fechaEstimada: null },
  { id: "cuota_2", nombre: "Saldo", porcentaje: 70, condicion: "ARRIBO_CHILE", fechaEstimada: null },
];

export function normalizarPlanPagos(cuotas, fallback = PLAN_PAGOS_PREDETERMINADO) {
  const source = Array.isArray(cuotas) && cuotas.length ? cuotas : fallback;
  return source.map((cuota, index) => ({
    id: String(cuota?.id || `cuota_${index + 1}`),
    nombre: String(cuota?.nombre || (index === 0 ? "Adelanto" : `Pago ${index + 1}`)).trim(),
    porcentaje: Number(cuota?.porcentaje || 0),
    condicion: CONDICIONES_PAGO.some((item) => item.value === cuota?.condicion)
      ? cuota.condicion
      : index === 0 ? "AL_CREAR" : "SOLICITUD_PROVEEDOR",
    fechaEstimada: cuota?.fechaEstimada || null,
  }));
}

export function validarPlanPagos(cuotas) {
  const plan = normalizarPlanPagos(cuotas, []);
  const errors = [];
  if (!plan.length) errors.push("El plan debe contener al menos un pago");
  if (plan.some((cuota) => !cuota.nombre)) errors.push("Todos los pagos deben tener un nombre");
  if (plan.some((cuota) => !Number.isFinite(cuota.porcentaje) || cuota.porcentaje <= 0)) {
    errors.push("Todos los pagos deben tener un porcentaje mayor a 0%");
  }
  const total = plan.reduce((sum, cuota) => sum + cuota.porcentaje, 0);
  if (Math.abs(total - 100) > 0.001) errors.push("El plan de pagos debe sumar exactamente 100%");
  return errors;
}

export function crearPlanPagos({
  porcentajeAdelanto,
  porcentajeSaldo,
  condicionSaldo,
  fechaAdelanto,
  fechaSaldo,
} = {}) {
  return [
    {
      id: "adelanto",
      nombre: "Adelanto",
      porcentaje: Number(porcentajeAdelanto || 0),
      condicion: "AL_CREAR",
      fechaEstimada: fechaAdelanto || null,
    },
    {
      id: "saldo",
      nombre: "Saldo",
      porcentaje: Number(porcentajeSaldo || 0),
      condicion: condicionSaldo || "ARRIBO_CHILE",
      fechaEstimada: fechaSaldo || null,
    },
  ];
}

export function obtenerPlanPagos(operacion = {}) {
  const cuotas = operacion.condicionVenta?.cuotas;
  if (Array.isArray(cuotas) && cuotas.length) return normalizarPlanPagos(cuotas);
  return crearPlanPagos({
    porcentajeAdelanto: 0,
    porcentajeSaldo: 100,
    condicionSaldo: "SOLICITUD_PROVEEDOR",
  });
}

export function importeCuota(cuota, total) {
  return Math.max(0, Number(total || 0) * Number(cuota?.porcentaje || 0) / 100);
}

export function montoSugeridoCuota(operacion = {}, cuotaId) {
  const cuota = obtenerPlanPagos(operacion).find((item) => item.id === cuotaId);
  return cuota ? importeCuota(cuota, operacion.totalOperacion) : 0;
}

export function condicionCumplida(condicion, estadoOperacion) {
  const estado = String(estadoOperacion || "PLANIFICADA");
  const orden = [
    "PLANIFICADA",
    "PRODUCCION",
    "CARGADA",
    "EN_TRANSITO",
    "ARRIBADA",
    "EN_DESPACHO",
    "ENTREGADA",
    "FINALIZADA",
  ];
  const indice = orden.indexOf(estado);
  if (condicion === "AL_CREAR") return true;
  if (condicion === "SALIDA_ORIGEN" || condicion === "DOCUMENTOS_EMBARQUE") {
    return indice >= orden.indexOf("EN_TRANSITO");
  }
  if (condicion === "ARRIBO_CHILE") return indice >= orden.indexOf("ARRIBADA");
  if (condicion === "ARRIBO_BODEGA") return indice >= orden.indexOf("ENTREGADA");
  return false;
}

export function estadoFlujoPago(pago = {}) {
  const estado = String(pago.estado || "PROGRAMADO").toUpperCase();
  if (["PAGADO", "CONFIRMADO"].includes(estado)) return "CONFIRMADO";
  if (estado === "APROBADO") return "APROBADO";
  if (estado === "CANCELADO") return "CANCELADO";
  return "PROGRAMADO";
}

export function estadoPagoProgramado(pago, today = new Date()) {
  const flujo = estadoFlujoPago(pago);
  if (["CONFIRMADO", "CANCELADO"].includes(flujo)) return flujo;
  if (!pago?.fechaProgramada) return "POR_HACER";
  const due = new Date(`${pago.fechaProgramada}T23:59:59`);
  const now = new Date(today);
  const days = Math.ceil((due - now) / 86400000);
  if (days < 0) return "VENCIDO";
  if (days <= 7) return "PROXIMO";
  return "POR_HACER";
}
