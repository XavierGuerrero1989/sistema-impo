import test from "node:test";
import assert from "node:assert/strict";
import {
  condicionCumplida,
  crearPlanPagos,
  estadoPagoProgramado,
  importeCuota,
} from "../src/domain/pagos.js";

test("crea un plan de pagos de dos tramos", () => {
  const plan = crearPlanPagos({
    porcentajeAdelanto: 30,
    porcentajeSaldo: 70,
    condicionSaldo: "ARRIBO_CHILE",
  });
  assert.equal(plan.length, 2);
  assert.equal(importeCuota(plan[0], 10000), 3000);
  assert.equal(plan[1].condicion, "ARRIBO_CHILE");
});

test("detecta hitos logísticos para condiciones financieras", () => {
  assert.equal(condicionCumplida("ARRIBO_CHILE", "EN_TRANSITO"), false);
  assert.equal(condicionCumplida("ARRIBO_CHILE", "ARRIBADA"), true);
  assert.equal(condicionCumplida("ARRIBO_BODEGA", "ENTREGADA"), true);
});

test("clasifica pagos próximos y vencidos", () => {
  assert.equal(
    estadoPagoProgramado({ fechaProgramada: "2026-07-31", estado: "POR_HACER" }, new Date("2026-07-30")),
    "PROXIMO"
  );
  assert.equal(
    estadoPagoProgramado({ fechaProgramada: "2026-07-20", estado: "POR_HACER" }, new Date("2026-07-30")),
    "VENCIDO"
  );
});
