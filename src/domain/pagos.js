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
  if (Array.isArray(cuotas) && cuotas.length) return cuotas;
  return crearPlanPagos({
    porcentajeAdelanto: 0,
    porcentajeSaldo: 100,
    condicionSaldo: "SOLICITUD_PROVEEDOR",
  });
}

export function importeCuota(cuota, total) {
  return Math.max(0, Number(total || 0) * Number(cuota?.porcentaje || 0) / 100);
}

export function condicionCumplida(condicion, estadoOperacion) {
  const estado = String(estadoOperacion || "PLANIFICADA");
  const orden = [
    "PLANIFICADA",
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

export function estadoPagoProgramado(pago, today = new Date()) {
  if (pago?.estado === "PAGADO" || pago?.estado === "CANCELADO") return pago.estado;
  if (!pago?.fechaProgramada) return "POR_HACER";
  const due = new Date(`${pago.fechaProgramada}T23:59:59`);
  const now = new Date(today);
  const days = Math.ceil((due - now) / 86400000);
  if (days < 0) return "VENCIDO";
  if (days <= 7) return "PROXIMO";
  return "POR_HACER";
}

