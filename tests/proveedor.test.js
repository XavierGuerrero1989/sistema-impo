import test from "node:test";
import assert from "node:assert/strict";
import { normalizarProveedor, validarProveedor } from "../src/domain/proveedor.js";

test("normaliza el ID y estado de un proveedor", () => {
  const proveedor = normalizarProveedor({
    proveedorId: " prov-01 ",
    nombreComercial: "  Fábrica Uno ",
  });
  assert.equal(proveedor.proveedorId, "PROV-01");
  assert.equal(proveedor.nombreComercial, "Fábrica Uno");
  assert.equal(proveedor.estado, "ACTIVO");
});

test("valida ID, nombre y email", () => {
  const errors = validarProveedor({
    proveedorId: "ID inválido",
    contacto: { email: "correo-invalido" },
  });
  assert.equal(errors.length, 3);
});

test("un proveedor bloqueado queda inactivo", () => {
  const proveedor = normalizarProveedor({
    proveedorId: "PROV-2",
    nombreComercial: "Proveedor bloqueado",
    estado: "BLOQUEADO",
  });
  assert.equal(proveedor.activo, false);
});
