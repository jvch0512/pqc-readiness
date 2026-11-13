import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assess } from "../src/assess.js";
import { lookup } from "../src/algos.js";
import { cbom } from "../src/cbom.js";
import { certsFromDir } from "../src/certs.js";
import { InventoryError, parseInventory } from "../src/model.js";
import { planMarkdown } from "../src/report.js";
import { findingsToAssets, scanText } from "../src/scan.js";

const inv = () => parseInventory(readFileSync("examples/inventory.json", "utf8"));
const byId = (id: string) => assess(inv()).results.find((r) => r.asset.id === id)!;

test("algorithm lookup", () => {
  assert.equal(lookup("RSA-2048")?.quantumVulnerable, true);
  assert.equal(lookup("rsa_1024")?.classicallyBroken, true);
  assert.equal(lookup("AES-256")?.quantumVulnerable, false);
  assert.equal(lookup("ML-KEM-768")?.role, "kem-pq");
  assert.equal(lookup("x25519mlkem768")?.role, "hybrid");
  assert.equal(lookup("FROBNICATE-9"), null);
});

test("long-lived RSA key exchange is a harvest-now risk (Mosca)", () => {
  const r = byId("A3");
  assert.equal(r.harvestNow, true); assert.equal(r.wave, 1); assert.equal(r.risk, "high"); assert.ok(r.overdue);
});

test("short-lived data with fast migration is not harvest-now", () => {
  const r = byId("A1");
  assert.equal(r.harvestNow, false); assert.equal(r.wave, 3);
});

test("a later quantum horizon removes the harvest risk", () => {
  const i = inv(); i.qDay = 2060;
  assert.equal(assess(i).results.find((r) => r.asset.id === "A2")!.harvestNow, false);
});

test("signatures are not harvest-now but firmware signing is high", () => {
  const r = byId("A5");
  assert.equal(r.harvestNow, false); assert.equal(r.risk, "high"); assert.match(r.target, /LMS or XMSS/);
});

test("broken algorithms go to wave 0", () => { assert.equal(byId("A8").wave, 0); });
test("PQC and hybrid assets are left alone", () => { assert.equal(byId("A10").cls, "pq-ready"); assert.equal(byId("A11").wave, 4); });
test("unknown algorithms are flagged for manual classification", () => { const r = byId("A12"); assert.equal(r.cls, "unknown"); assert.match(r.reasons.join(" "), /not recognised/); });
test("AES-128 for 20-year data suggests 256-bit", () => { assert.equal(byId("A4").cls, "weak-symmetric"); });
test("crypto-agility score is bounded", () => { const s = assess(inv()).agilityScore; assert.ok(s >= 0 && s <= 100); });

test("CBOM is CycloneDX 1.6 with cryptographic-asset components", () => {
  const b = cbom(assess(inv())) as { specVersion: string; components: { type: string; name: string }[] };
  assert.equal(b.specVersion, "1.6");
  assert.ok(b.components.every((c) => c.type === "cryptographic-asset"));
  assert.equal(new Set(b.components.map((c) => c.name)).size, b.components.length);
});

test("plan markdown has waves and dates", () => {
  const md = planMarkdown(assess(inv()));
  assert.match(md, /Wave 1/); assert.match(md, /2030/); assert.match(md, /FIPS 203/);
});

test("certificates are parsed from PEM", () => {
  const cs = certsFromDir("examples/certs");
  assert.equal(cs.length, 2);
  assert.ok(cs.some((c) => c.algorithm === "RSA-2048" && c.usage === "pki"));
  assert.ok(cs.some((c) => c.algorithm === "ECDSA-P256" && c.usage === "tls"));
});

test("code scan finds weak and quantum-vulnerable usage", () => {
  const fs = scanText("a.ts", 'createHash("md5")\nconst a = "RS256"\nx = 1');
  assert.deepEqual(fs.map((f) => f.algorithm), ["MD5", "RSA-2048"]);
  assert.equal(findingsToAssets(fs).length, 2);
});

test("bad inventories raise InventoryError", () => {
  assert.throws(() => parseInventory("nope"), InventoryError);
  assert.throws(() => parseInventory('{"assets":[{"algorithm":"RSA-2048","usage":"bogus"}]}'), InventoryError);
  assert.throws(() => parseInventory('{"assets":[{"algorithm":"RSA-2048","confidentialityYears":-1}]}'), InventoryError);
});
