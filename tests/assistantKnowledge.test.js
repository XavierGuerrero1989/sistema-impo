import test from "node:test";
import assert from "node:assert/strict";
import { contextForPath, findAssistantAnswer } from "../src/assistant/assistantKnowledge.js";

const allPermissions = { createOperations: true, manageUsers: true };

test("responde preguntas frecuentes aunque no tengan tildes", () => {
  const result = findAssistantAnswer("Como programo y confirmo un pago?", allPermissions, "/finanzas/123");
  assert.equal(result.id, "programar-pago");
});

test("sugiere ayuda relacionada con la pantalla actual", () => {
  const context = contextForPath("/logistica/123", allPermissions);
  assert.equal(context.label, "Importaciones");
  assert.equal(context.suggested[0].id, "importaciones");
});

test("no recomienda administrar usuarios sin permiso", () => {
  const context = contextForPath("/usuarios", { manageUsers: false });
  assert.equal(context.suggested.some((topic) => topic.id === "usuarios"), false);
});

test("evita inventar una respuesta cuando no reconoce la consulta", () => {
  const result = findAssistantAnswer("Cuál es el clima de mañana?", allPermissions, "/");
  assert.equal(result, null);
});
