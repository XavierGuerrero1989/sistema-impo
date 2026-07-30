export const ESTADOS_PROVEEDOR = ["ACTIVO", "SUSPENDIDO", "BLOQUEADO"];

export function normalizarProveedor(input = {}) {
  const direccionActual = typeof input.direccion === "object" && input.direccion
    ? input.direccion
    : {};

  return {
    ...input,
    proveedorId: String(input.proveedorId || "").trim().toUpperCase(),
    nombreComercial: String(input.nombreComercial || "").trim(),
    nombreLegal: String(input.nombreLegal || "").trim(),
    pais: String(input.pais || "").trim(),
    identificacionFiscal: String(input.identificacionFiscal || "").trim(),
    direccion: {
      ...direccionActual,
      direccion: String(direccionActual.direccion || input.direccionTexto || "").trim(),
      codigoPostal: String(direccionActual.codigoPostal || input.codigoPostal || "").trim(),
    },
    banco: {
      ...(input.banco || {}),
      banco: String(input.banco?.banco || "").trim(),
      swift: String(input.banco?.swift || input.swift || "").trim().toUpperCase(),
      numeroCuenta: String(input.banco?.numeroCuenta || input.numeroCuenta || "").trim(),
    },
    estado: ESTADOS_PROVEEDOR.includes(input.estado) ? input.estado : "ACTIVO",
    activo: input.activo !== false && input.estado !== "BLOQUEADO",
    comercial: {
      ...(input.comercial || {}),
      monedaHabitual: String(input.comercial?.monedaHabitual || "USD").toUpperCase(),
    },
  };
}

export function validarProveedor(input) {
  const proveedor = normalizarProveedor(input);
  const errors = [];
  if (!proveedor.proveedorId) errors.push("El ID del proveedor es obligatorio");
  if (!/^[A-Z0-9_-]+$/.test(proveedor.proveedorId)) {
    errors.push("El ID solo puede contener letras, números, guiones y guion bajo");
  }
  if (!proveedor.nombreComercial) errors.push("El nombre comercial es obligatorio");
  if (proveedor.contacto?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proveedor.contacto.email)) {
    errors.push("El email de contacto no es válido");
  }
  return errors;
}
