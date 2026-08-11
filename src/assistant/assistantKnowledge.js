const normalize = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export const assistantTopics = [
  {
    id: "crear-operacion",
    title: "Crear una operación",
    keywords: ["crear operacion", "nueva operacion", "iniciar operacion", "alta operacion"],
    answer: "Entrá en Operaciones y elegí “Nueva operación”. Completá proveedor, moneda, valor, Incoterm y el plan de pagos. Los tramos pueden ser tantos como necesites, pero sus porcentajes deben sumar exactamente 100%.",
    permission: "createOperations",
  },
  {
    id: "plan-pagos",
    title: "Armar el plan de pagos",
    keywords: ["plan de pagos", "tramos", "porcentaje", "adelanto", "cuotas", "condicion comercial"],
    answer: "Al crear la operación, agregá los tramos necesarios y definí porcentaje, condición y fecha estimada. El sistema calcula el importe de cada porcentaje y controla que la distribución total sea 100%.",
  },
  {
    id: "programar-pago",
    title: "Programar y confirmar un pago",
    keywords: ["programar pago", "aprobar pago", "confirmar pago", "pago programado", "pagar", "pagos"],
    answer: "En Finanzas, abrí la operación y seleccioná el tramo. El monto sugerido corresponde al porcentaje acordado. El pago pasa por tres estados: Programado, Aprobado y Confirmado; el saldo cambia únicamente cuando queda Confirmado.",
  },
  {
    id: "medios-pago",
    title: "Medios de pago disponibles",
    keywords: ["medio de pago", "transferencia propia", "credito santander", "credito bci", "banco"],
    answer: "Al confirmar el pago efectivo podés elegir Transferencia propia, Crédito Santander o Crédito BCI. Completá la fecha y la información solicitada antes de confirmar.",
  },
  {
    id: "importaciones",
    title: "Actualizar una importación",
    keywords: ["importaciones", "logistica", "etapa", "produccion", "transito", "arribada", "despacho", "entregada", "eta", "etd"],
    answer: "Entrá en Importaciones, abrí la operación y registrá el avance. El recorrido es Planificada, Producción, Cargada, En tránsito, Arribada, En despacho y Entregada. Revisá los datos del hito antes de avanzar de etapa.",
  },
  {
    id: "carga",
    title: "Registrar el tipo de carga",
    keywords: ["tipo de carga", "bulto", "fcl", "lcl", "ftl", "ltl", "awb", "contenedor"],
    answer: "En el detalle de Importaciones usá la tarjeta “Detalles del producto / bulto”. Elegí FCL 20, FCL 40, FCL 40HC, LCL, FTL, LTL o AWB, completá la cantidad de bultos y guardá los detalles.",
  },
  {
    id: "documentos",
    title: "Subir un documento",
    keywords: ["subir documento", "cargar documento", "documentos", "archivo", "adjuntar", "descargar documento"],
    answer: "Abrí la sección correspondiente de la operación, desplegá Documentos, elegí el tipo y subí el archivo. Podés descargarlo desde su enlace. Un documento cargado se ve negro, aprobado verde, rechazado rojo y eliminado tachado.",
  },
  {
    id: "permisos-documentos",
    title: "Permisos sobre documentos",
    keywords: ["eliminar documento", "borrar documento", "permisos documento", "rechazar documento", "aprobar documento"],
    answer: "Todos los roles habilitados pueden subir documentos en Finanzas e Importaciones. Fuera de su área pueden cargar archivos, pero no eliminar ni administrar los documentos existentes.",
  },
  {
    id: "forwarder",
    title: "Registrar cotizaciones de forwarders",
    keywords: ["forwarder", "cotizacion", "cotizaciones", "puja", "oferta", "oficial"],
    answer: "En el detalle de Importaciones buscá la tarjeta independiente de cotizaciones. Registrá cada oferta seleccionando un forwarder del directorio y, cuando compares las propuestas, marcá el elegido como forwarder oficial.",
  },
  {
    id: "agente-aduana",
    title: "Asignar agente de aduana",
    keywords: ["agente de aduana", "aduana", "agente aduanero", "asignar agente"],
    answer: "En el detalle de Importaciones encontrás la asignación del agente de aduana. Primero debe existir en su directorio; luego podés seleccionarlo para esa operación y guardar el cambio.",
  },
  {
    id: "proveedores",
    title: "Crear o editar un proveedor",
    keywords: ["proveedor", "crear proveedor", "swift", "numero de cuenta", "cuenta bancaria", "codigo postal"],
    answer: "Entrá en Proveedores para crear o abrir una ficha. Allí podés registrar dirección, código postal, SWIFT, número de cuenta y el resto de los datos comerciales y bancarios.",
  },
  {
    id: "usuarios",
    title: "Administrar usuarios y roles",
    keywords: ["usuario", "crear usuario", "rol", "permisos", "finanzas", "solo lectura", "admin"],
    answer: "La administración de usuarios está disponible para el rol Admin. Los roles son Admin, Importaciones, Finanzas y Solo lectura. Todos pueden ver las operaciones completas; el rol determina qué datos y acciones pueden modificar.",
    permission: "manageUsers",
  },
  {
    id: "password",
    title: "Recuperar la contraseña",
    keywords: ["olvide contraseña", "recuperar contraseña", "cambiar contraseña", "password", "no puedo entrar"],
    answer: "En la pantalla de inicio de sesión elegí “¿Olvidaste tu contraseña?”, ingresá tu correo y seguí el vínculo que recibirás. Revisá también la carpeta de correo no deseado.",
  },
];

const routeContext = [
  { match: /^\/operaciones\/nueva/, label: "la creación de una operación", topicIds: ["crear-operacion", "plan-pagos"] },
  { match: /^\/operaciones/, label: "Operaciones", topicIds: ["crear-operacion", "plan-pagos", "forwarder"] },
  { match: /^\/finanzas/, label: "Finanzas", topicIds: ["programar-pago", "plan-pagos", "medios-pago", "documentos"] },
  { match: /^\/logistica/, label: "Importaciones", topicIds: ["importaciones", "carga", "forwarder", "agente-aduana"] },
  { match: /^\/documentos/, label: "Documentos", topicIds: ["documentos", "permisos-documentos"] },
  { match: /^\/proveedores/, label: "Proveedores", topicIds: ["proveedores"] },
  { match: /^\/forwarders/, label: "Forwarders", topicIds: ["forwarder"] },
  { match: /^\/agentes-aduana/, label: "Agentes de aduana", topicIds: ["agente-aduana"] },
  { match: /^\/usuarios/, label: "Usuarios", topicIds: ["usuarios", "password"] },
  { match: /^\/$/, label: "Inicio", topicIds: ["crear-operacion", "programar-pago", "importaciones", "documentos"] },
];

export function availableTopics(permissions = {}) {
  return assistantTopics.filter((topic) => !topic.permission || permissions[topic.permission]);
}

export function contextForPath(pathname, permissions = {}) {
  const context = routeContext.find((entry) => entry.match.test(pathname)) || {
    label: "esta pantalla",
    topicIds: ["crear-operacion", "importaciones", "programar-pago", "documentos"],
  };
  const allowed = availableTopics(permissions);
  const suggested = context.topicIds
    .map((id) => allowed.find((topic) => topic.id === id))
    .filter(Boolean)
    .slice(0, 4);
  return { label: context.label, suggested };
}

export function findAssistantAnswer(question, permissions = {}, pathname = "/") {
  const normalizedQuestion = normalize(question);
  const topics = availableTopics(permissions);
  if (!normalizedQuestion) return null;

  if (["que puedo hacer aqui", "ayuda con esta pantalla", "como funciona esta pantalla"].some((phrase) => normalizedQuestion.includes(phrase))) {
    const context = contextForPath(pathname, permissions);
    const names = context.suggested.map((topic) => topic.title).join(", ");
    return {
      id: "context-help",
      title: `Ayuda con ${context.label}`,
      answer: names
        ? `En ${context.label} puedo ayudarte con: ${names}. Elegí una sugerencia o escribime qué necesitás hacer.`
        : `Puedo orientarte sobre el uso de ${context.label}. Escribime qué necesitás hacer.`,
    };
  }

  let best = null;
  let bestScore = 0;
  topics.forEach((topic) => {
    const score = topic.keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalize(keyword);
      if (normalizedQuestion.includes(normalizedKeyword)) return total + normalizedKeyword.split(" ").length + 2;
      return total + normalizedKeyword.split(" ").filter((word) => word.length > 3 && normalizedQuestion.includes(word)).length;
    }, 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  });

  return bestScore >= 2 ? best : null;
}
