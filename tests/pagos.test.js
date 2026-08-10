import test from "node:test";
import assert from "node:assert/strict";
import {
  condicionCumplida,
  crearPlanPagos,
  estadoFlujoPago,
  estadoPagoProgramado,
  importeCuota,
  montoSugeridoCuota,
  obtenerPlanPagos,
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

test("normaliza el flujo programado, aprobado y confirmado", () => {
  assert.equal(estadoFlujoPago({ estado: "POR_HACER" }), "PROGRAMADO");
  assert.equal(estadoFlujoPago({ estado: "APROBADO" }), "APROBADO");
  assert.equal(estadoFlujoPago({ estado: "PAGADO" }), "CONFIRMADO");
  assert.equal(estadoFlujoPago({ estado: "CONFIRMADO" }), "CONFIRMADO");
});

test("admite planes variables y sugiere el importe de cada cuota", () => {
  const operacion = {
    totalOperacion: 20000,
    condicionVenta: {
      cuotas: [
        { id: "cuota_1", nombre: "Adelanto", porcentaje: 50 },
        { id: "cuota_2", nombre: "Segundo pago", porcentaje: 30 },
        { id: "cuota_3", nombre: "Pago final", porcentaje: 20 },
      ],
    },
  };

  assert.equal(obtenerPlanPagos(operacion).length, 3);
  assert.equal(montoSugeridoCuota(operacion, "cuota_2"), 6000);
  assert.equal(montoSugeridoCuota(operacion, "cuota_3"), 4000);
});
