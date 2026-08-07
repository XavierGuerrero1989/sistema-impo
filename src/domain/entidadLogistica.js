export const ESTADOS_ENTIDAD = ["ACTIVO", "SUSPENDIDO", "BLOQUEADO"];

export function normalizarEntidad(input = {}) {
  return {
    ...input,
    entidadId: String(input.entidadId || "").trim().toUpperCase(),
    nombreComercial: String(input.nombreComercial || "").trim(),
    nombreLegal: String(input.nombreLegal || "").trim(),
    pais: String(input.pais || "").trim(),
    direccion: String(input.direccion || "").trim(),
    identificacionFiscal: String(input.identificacionFiscal || "").trim(),
    estado: ESTADOS_ENTIDAD.includes(input.estado) ? input.estado : "ACTIVO",
    activo: input.activo !== false && input.estado !== "BLOQUEADO",
    contacto: {
      ...(input.contacto || {}),
      nombre: String(input.contacto?.nombre || "").trim(),
      email: String(input.contacto?.email || "").trim(),
      telefono: String(input.contacto?.telefono || "").trim(),
    },
    banco: {
      ...(input.banco || {}),
      banco: String(input.banco?.banco || "").trim(),
    },
    comercial: {
      ...(input.comercial || {}),
      monedaHabitual: String(input.comercial?.monedaHabitual || "USD").toUpperCase(),
      condicionPago: String(input.comercial?.condicionPago || "").trim(),
      plazoPagoDias: input.comercial?.plazoPagoDias || "",
    },
  };
}

export function validarEntidad(input, label = "entidad") {
  const entidad = normalizarEntidad(input);
  const errors = [];
  if (!entidad.entidadId) errors.push(`El ID del ${label} es obligatorio`);
  if (!/^[A-Z0-9_-]+$/.test(entidad.entidadId)) {
    errors.push("El ID solo puede contener letras, números, guiones y guion bajo");
  }
  if (!entidad.nombreComercial) errors.push("El nombre comercial es obligatorio");
  if (entidad.contacto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entidad.contacto.email)) {
    errors.push("El email de contacto no es válido");
  }
  return errors;
}
