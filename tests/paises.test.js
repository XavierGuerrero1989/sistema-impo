import test from "node:test";
import assert from "node:assert/strict";
import { countryFlag, countryLabel } from "../src/domain/paises.js";

test("resuelve países sin depender de mayúsculas ni acentos", () => {
  assert.equal(countryFlag("CHINA"), "🇨🇳");
  assert.equal(countryFlag("México"), "🇲🇽");
});

test("usa un globo cuando el país todavía no está reconocido", () => {
  assert.equal(countryLabel("País nuevo"), "🌐 País nuevo");
  assert.equal(countryLabel("", "Origen"), "🌐 Origen");
});
