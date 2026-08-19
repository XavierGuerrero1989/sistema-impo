import test from "node:test";
import assert from "node:assert/strict";
import {
  alertasOperacion,
  calcularFinanzas,
  normalizarOperacion,
  validarOperacion,
} from "../src/domain/operacion.js";

test("normaliza colecciones y valores básicos", () => {
  const result = normalizarOperacion({ id: " OP-1 ", moneda: "usd", incoterm: "fob" });
  assert.equal(result.id, "OP-1");
  assert.equal(result.moneda, "USD");
  assert.equal(result.incoterm, "FOB");
  assert.equal(result.incotermVersion, "2020");
  assert.deepEqual(result.documentos, []);
  assert.equal(result.estado, "PLANIFICADA");
});

test("reconoce producción como etapa logística válida", () => {
  const result = normalizarOperacion({ id: "OP-2", estado: "PRODUCCION" });
  assert.equal(result.estado, "PRODUCCION");
});

test("normaliza cotizaciones e intervinientes logísticos", () => {
  const result = normalizarOperacion({
    id: "OP-3",
    cotizacionesForwarder: [{ id: "COT-1" }],
    forwarderId: " FWD-1 ",
    agenteAduanaId: " AG-1 ",
  });
  assert.equal(result.cotizacionesForwarder.length, 1);
  assert.equal(result.forwarderId, "FWD-1");
  assert.equal(result.agenteAduanaId, "AG-1");
});

test("calcula saldo usando solo movimientos activos", () => {
  const result = calcularFinanzas({
    totalOperacion: 1000,
    adelantos: [{ monto: 200, estado: "ACTIVO" }],
    pagos: [
      { monto: 300, estado: "ACTIVO" },
      { monto: 900, estado: "CANCELADO" },
    ],
  });
  assert.deepEqual(result, { total: 1000, pagado: 500, saldo: 500, progreso: 50 });
});

test("no permite que pagos excedentes produzcan saldo negativo", () => {
  assert.equal(calcularFinanzas({
    totalOperacion: 100,
    pagos: [{ monto: 150, estado: "ACTIVO" }],
  }).saldo, 0);
});

test("valida campos obligatorios e importes", () => {
  assert.equal(validarOperacion({ totalOperacion: -1 }).length, 4);
});

test("permite crear sin Incoterm y rechaza un código inválido", () => {
  const base = { id: "OP-1", proveedorId: "P-1", activo: "Carga", totalOperacion: 100 };
  assert.deepEqual(validarOperacion({ ...base, incoterm: "" }), []);
  assert.deepEqual(validarOperacion({ ...base, incoterm: "ZZZ" }), [
    "El Incoterm seleccionado no es válido",
  ]);
});

test("detecta ETA vencida, documentos y pagos pendientes", () => {
  const alerts = alertasOperacion({
    id: "OP-1",
    proveedorId: "P-1",
    activo: "Equipo",
    estado: "EN_TRANSITO",
    totalOperacion: 100,
    logistica: { eta: "2026-01-01" },
    documentos: [{ estado: "PENDIENTE" }],
  }, new Date("2026-02-01T00:00:00"));

  assert.deepEqual(alerts, [
    "ETA_VENCIDA",
    "DOCUMENTOS_PENDIENTES",
    "PAGO_PENDIENTE",
  ]);
});

test("detecta una operación bloqueada y sin ETA", () => {
  const alerts = alertasOperacion({
    estado: "BLOQUEADA",
    totalOperacion: 0,
  });
  assert.deepEqual(alerts, ["BLOQUEADA"]);

  const transitAlerts = alertasOperacion({
    estado: "EN_TRANSITO",
    totalOperacion: 0,
  });
  assert.deepEqual(transitAlerts, ["SIN_ETA"]);
});

test("una operación finalizada no genera alerta de pago pendiente", () => {
  assert.equal(alertasOperacion({
    estado: "FINALIZADA",
    totalOperacion: 1000,
  }).includes("PAGO_PENDIENTE"), false);
});
