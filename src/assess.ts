import { Asset, Inventory } from "./model.js";

export type Class = "broken-classic" | "vulnerable-kex" | "vulnerable-signature" | "weak-symmetric" | "unknown" | "pq-ready";
export type Risk = "high" | "medium" | "low";
export interface Result {
  asset: Asset; cls: Class; risk: Risk; harvestNow: boolean; moscaGap: number;
  euDeadline: string; nistNote: string; startBy: string; overdue: boolean; wave: 0 | 1 | 2 | 3 | 4; reasons: string[]; target: string; score: number;
}
export interface Assessment { organisation: string; today: string; qDay: number; results: Result[]; agilityScore: number; counts: Record<Class, number>; waves: Record<number, Result[]> }

const CONF_USAGES = new Set(["tls", "vpn", "ssh", "storage", "database", "email", "backup", "api"]);
const SIGN_USAGES = new Set(["pki", "code-signing", "firmware-signing", "jwt", "document-signing", "iot"]);

export function targetFor(a: Asset, cls: Class): string {
  if (cls === "pq-ready") return "keep";
  if (cls === "unknown") return "classify by hand";
  if (cls === "broken-classic" || cls === "weak-symmetric") return a.algo?.target ?? "AES-256-GCM";
  if (a.usage === "firmware-signing" || a.usage === "code-signing") return "LMS or XMSS (SP 800-208), or ML-DSA-65";
  if (cls === "vulnerable-signature") return a.usage === "pki" ? "ML-DSA-65 root and issuing CAs, hybrid chains during transition" : "ML-DSA-65 (FIPS 204)";
  if (a.usage === "storage" || a.usage === "database" || a.usage === "backup") return "AES-256 data keys wrapped with ML-KEM-768";
  return "Hybrid X25519MLKEM768, then ML-KEM-768";
}

export function euClass(a: Asset): "high" | "medium" | "low" {
  if (a.critical || a.confidentialityYears >= 10) return "high";
  if (a.confidentialityYears >= 3 || a.usage === "pki" || a.usage === "firmware-signing") return "medium";
  return "low";
}

export function classify(a: Asset): Class {
  if (!a.algo) return "unknown";
  if (a.algo.role === "kem-pq" || a.algo.role === "signature-pq" || a.algo.role === "hybrid") return "pq-ready";
  if (a.algo.classicallyBroken) return a.algo.role === "symmetric" || a.algo.role === "hash" ? "broken-classic" : "vulnerable-kex";
  if (a.algo.quantumVulnerable) return a.algo.role === "signature" ? "vulnerable-signature" : "vulnerable-kex";
  if (a.algo.role === "symmetric" && a.algo.classicalBits < 192 && a.confidentialityYears >= 15) return "weak-symmetric";
  return "pq-ready";
}

const addYears = (d: string, y: number) => { const t = new Date(d + "T00:00:00Z"); t.setUTCMonth(t.getUTCMonth() + Math.round(y * 12)); return t.toISOString().slice(0, 10); };

export function assessAsset(a: Asset, inv: Inventory): Result {
  const cls = classify(a);
  const eu = euClass(a);
  const euDeadline = eu === "high" ? "2030-12-31" : "2035-12-31";
  const nowYear = Number(inv.today.slice(0, 4)) + (Number(inv.today.slice(5, 7)) - 1) / 12;
  const gap = a.confidentialityYears + a.migrationYears - (inv.qDay - nowYear);
  const conf = CONF_USAGES.has(a.usage) && cls === "vulnerable-kex";
  const harvestNow = conf && a.confidentialityYears > 0 && gap > 0;
  const reasons: string[] = [];
  let risk: Risk = "low";
  if (cls === "broken-classic") { risk = "high"; reasons.push(`${a.algo!.name} is broken today: ${a.algo!.note}`); }
  if (cls === "vulnerable-kex") {
    reasons.push(`${a.algo!.name} falls to a quantum computer (Shor).`);
    if (harvestNow) { risk = "high"; reasons.push(`Data kept ${a.confidentialityYears} years plus ${a.migrationYears} years to migrate exceeds the ${(inv.qDay - nowYear).toFixed(1)} years left until ${inv.qDay}: it can be recorded now and read later.`); }
    else risk = eu === "high" ? "high" : "medium";
  }
  if (cls === "vulnerable-signature") {
    risk = eu === "high" || a.usage === "firmware-signing" || a.usage === "code-signing" ? "high" : "medium";
    reasons.push(`${a.algo!.name} signatures can be forged once a quantum computer exists; no harvest-now risk, but long-lived signatures and roots of trust must move first.`);
    if (a.validUntil && Date.parse(a.validUntil) > Date.parse("2031-01-01")) { reasons.push(`Valid until ${a.validUntil}, beyond NIST's 2030 deprecation.`); risk = "high"; }
  }
  if (cls === "weak-symmetric") { risk = "low"; reasons.push(`${a.algo!.name} stays approved by NIST and resists quantum attack, but 256-bit keys are the conservative choice for data kept ${a.confidentialityYears} years.`); }
  if (cls === "unknown") { risk = "medium"; reasons.push(`Algorithm "${a.algorithm}" is not recognised: classify it by hand.`); }
  if (a.vendorControlled && cls !== "pq-ready") reasons.push("Vendor controlled: you need the supplier's PQC roadmap in writing.");
  if (a.needsInput) reasons.push("Confidentiality lifetime and migration effort are defaults: confirm them with the system owner.");
  const nist = cls === "vulnerable-kex" || cls === "vulnerable-signature" ? "NIST IR 8547 (final, Oct 2026): quantum-vulnerable public-key algorithms are deprecated after 2030 and disallowed after 2035, at every key size." : "";
  const startBy = addYears(euDeadline, -(a.migrationYears + 0.5));
  const overdue = cls !== "pq-ready" && Date.parse(startBy) < Date.parse(inv.today);
  const wave: Result["wave"] = cls === "pq-ready" ? 4 : cls === "broken-classic" ? 0 : harvestNow ? 1 : cls === "weak-symmetric" ? 3 : eu === "high" ? 2 : 3;
  const score = cls === "pq-ready" ? 0 : (risk === "high" ? 60 : risk === "medium" ? 35 : 15) + (harvestNow ? 25 : 0) + (overdue ? 10 : 0) + (a.critical ? 5 : 0);
  return { asset: a, cls, risk, harvestNow, moscaGap: Math.round(gap * 10) / 10, euDeadline, nistNote: nist, startBy, overdue, wave, reasons, target: targetFor(a, cls), score };
}

export function assess(inv: Inventory): Assessment {
  const results = inv.assets.map((a) => assessAsset(a, inv)).sort((x, y) => y.score - x.score);
  const counts: Record<Class, number> = { "broken-classic": 0, "vulnerable-kex": 0, "vulnerable-signature": 0, "weak-symmetric": 0, unknown: 0, "pq-ready": 0 };
  for (const r of results) counts[r.cls]++;
  const waves: Record<number, Result[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  for (const r of results) waves[r.wave]!.push(r);
  const n = inv.assets.length || 1;
  const agile = inv.assets.filter((a) => a.agile).length, vendor = inv.assets.filter((a) => a.vendorControlled).length;
  return { organisation: inv.organisation, today: inv.today, qDay: inv.qDay, results, agilityScore: Math.max(0, Math.round((agile / n) * 100 - (vendor / n) * 10)), counts, waves };
}
