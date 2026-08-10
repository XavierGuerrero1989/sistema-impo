import test from "node:test";
import assert from "node:assert/strict";
import { permissionsFor, ROLES } from "../src/auth/roles.js";

test("Importaciones crea operaciones y solo modifica logística", () => {
  const permissions = permissionsFor(ROLES.OPERACIONES);
  assert.equal(permissions.createOperations, true);
  assert.equal(permissions.manageOperations, true);
  assert.equal(permissions.manageFinances, false);
  assert.equal(permissions.manageUsers, false);
  assert.equal(permissions.viewFinances, true);
  assert.equal(permissions.uploadDocuments, true);
  assert.equal(permissions.manageFinanceDocuments, false);
});

test("Finanzas solo modifica el área financiera", () => {
  const permissions = permissionsFor(ROLES.FINANZAS);
  assert.equal(permissions.createOperations, false);
  assert.equal(permissions.manageOperations, false);
  assert.equal(permissions.manageFinances, true);
  assert.equal(permissions.confirmPayments, true);
  assert.equal(permissions.viewLogistics, true);
  assert.equal(permissions.uploadDocuments, true);
  assert.equal(permissions.manageDocuments, false);
});

test("Solo lectura ve todas las áreas sin editar", () => {
  const permissions = permissionsFor(ROLES.LECTURA);
  assert.equal(permissions.viewLogistics, true);
  assert.equal(permissions.viewFinances, true);
  assert.equal(permissions.manageOperations, false);
  assert.equal(permissions.manageFinances, false);
  assert.equal(permissions.uploadDocuments, false);
});

test("Administrador conserva control total", () => {
  const permissions = permissionsFor(ROLES.ADMIN);
  assert.equal(Object.values(permissions).every(Boolean), true);
});
