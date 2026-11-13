import { Algo, lookup } from "./algos.js";

export class InventoryError extends Error {}

export type Usage = "tls" | "vpn" | "ssh" | "pki" | "code-signing" | "firmware-signing" | "jwt" | "storage" | "database" | "email" | "backup" | "document-signing" | "iot" | "api" | "other";
export const USAGES: Usage[] = ["tls", "vpn", "ssh", "pki", "code-signing", "firmware-signing", "jwt", "storage", "database", "email", "backup", "document-signing", "iot", "api", "other"];

export interface Asset {
  id: string; system: string; usage: Usage; algorithm: string; algo: Algo | null;
  confidentialityYears: number; migrationYears: number; critical: boolean; vendorControlled: boolean; agile: boolean;
  validUntil: string | null; needsInput: boolean;
}
export interface Inventory { organisation: string; today: string; qDay: number; assets: Asset[] }

const o = (v: unknown, w: string): Record<string, unknown> => { if (typeof v !== "object" || v === null || Array.isArray(v)) throw new InventoryError(`${w} must be an object`); return v as Record<string, unknown>; };
const num = (v: unknown, d: number, w: string): number => { if (v === undefined) return d; if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new InventoryError(`${w} must be a non-negative number`); return v; };

export function parseInventory(text: string): Inventory {
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new InventoryError("inventory is not valid JSON"); }
  const r = o(j, "inventory");
  if (!Array.isArray(r["assets"])) throw new InventoryError("inventory.assets must be an array");
  const today = typeof r["today"] === "string" ? r["today"] : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today))) throw new InventoryError("today must be YYYY-MM-DD");
  const assets = r["assets"].map((x, i): Asset => {
    const a = o(x, `assets[${i}]`);
    const alg = a["algorithm"];
    if (typeof alg !== "string" || !alg) throw new InventoryError(`assets[${i}].algorithm must be a string`);
    const usage = typeof a["usage"] === "string" ? (a["usage"] as Usage) : "other";
    if (!USAGES.includes(usage)) throw new InventoryError(`assets[${i}].usage "${usage}" is not one of ${USAGES.join(", ")}`);
    const vu = a["validUntil"];
    if (vu !== undefined && (typeof vu !== "string" || Number.isNaN(Date.parse(vu)))) throw new InventoryError(`assets[${i}].validUntil must be a date`);
    return {
      id: typeof a["id"] === "string" ? a["id"] : `asset-${i + 1}`, system: typeof a["system"] === "string" ? a["system"] : "(unspecified)", usage, algorithm: alg, algo: lookup(alg),
      confidentialityYears: num(a["confidentialityYears"], 0, `assets[${i}].confidentialityYears`), migrationYears: num(a["migrationYears"], 2, `assets[${i}].migrationYears`),
      critical: a["critical"] === true, vendorControlled: a["vendorControlled"] === true, agile: a["agile"] === true, validUntil: typeof vu === "string" ? vu : null, needsInput: a["needsInput"] === true,
    };
  });
  const qDay = num(r["qDay"], 2035, "qDay");
  return { organisation: typeof r["organisation"] === "string" ? r["organisation"] : "(unnamed)", today, qDay, assets };
}
