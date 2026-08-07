import test from "node:test";
import assert from "node:assert/strict";
import { normalizarEntidad, validarEntidad } from "../src/domain/entidadLogistica.js";

test("normaliza una entidad logística", () => {
  const entidad = normalizarEntidad({
    entidadId: " fwd-01 ",
    nombreComercial: "  Transporte Global ",
    direccion: "  Av. Central 123, Santiago ",
  });
  assert.equal(entidad.entidadId, "FWD-01");
  assert.equal(entidad.nombreComercial, "Transporte Global");
  assert.equal(entidad.direccion, "Av. Central 123, Santiago");
  assert.equal(entidad.estado, "ACTIVO");
  assert.equal(entidad.comercial.monedaHabitual, "USD");
});

test("valida los campos compartidos por forwarders y agentes", () => {
  const errors = validarEntidad({
    entidadId: "ID inválido",
    contacto: { email: "correo-invalido" },
  }, "forwarder");
  assert.equal(errors.length, 3);
});

test("una entidad bloqueada queda inactiva", () => {
  const entidad = normalizarEntidad({
    entidadId: "AG-01",
    nombreComercial: "Agencia Uno",
    estado: "BLOQUEADO",
  });
  assert.equal(entidad.activo, false);
});
