// Node only: not imported by the browser UI.
import { X509Certificate } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CertAsset { id: string; system: string; usage: "pki" | "tls"; algorithm: string; validUntil: string; confidentialityYears: number; migrationYears: number; critical: boolean; agile: boolean; vendorControlled: boolean }

export function algoOf(c: X509Certificate): string {
  const k = c.publicKey, t = k.asymmetricKeyType, d = k.asymmetricKeyDetails ?? {};
  if (t === "rsa") return `RSA-${d.modulusLength ?? 2048}`;
  if (t === "ec") { const n = String(d.namedCurve ?? ""); return /384/.test(n) ? "ECDSA-P384" : /521/.test(n) ? "ECDSA-P521" : "ECDSA-P256"; }
  if (t === "ed25519") return "Ed25519";
  if (t === "x25519") return "X25519";
  return String(t);
}

export function pemBlocks(text: string): string[] { return text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? []; }

export function certsFromText(name: string, text: string): CertAsset[] {
  return pemBlocks(text).flatMap((pem, i) => {
    try {
      const c = new X509Certificate(pem);
      const ca = c.ca;
      const cn = /CN=([^\n,]+)/.exec(c.subject)?.[1] ?? name;
      return [{ id: `${name}#${i + 1}`, system: cn, usage: ca ? "pki" as const : "tls" as const, algorithm: algoOf(c), validUntil: new Date(c.validTo).toISOString().slice(0, 10), confidentialityYears: ca ? 10 : 0, migrationYears: ca ? 3 : 1, critical: ca, agile: false, vendorControlled: false }];
    } catch { return []; }
  });
}

export function walk(dir: string, accept: RegExp, out: string[] = [], depth = 0): string[] {
  if (depth > 6) return out;
  for (const f of readdirSync(dir).sort()) {
    if (f === "node_modules" || f === ".git") continue;
    const p = join(dir, f), s = statSync(p);
    if (s.isDirectory()) walk(p, accept, out, depth + 1); else if (accept.test(f) && s.size < 2_000_000) out.push(p);
  }
  return out;
}

export function certsFromDir(dir: string): CertAsset[] {
  return walk(dir, /\.(pem|crt|cer)$/i).flatMap((p) => certsFromText(p.slice(dir.length + 1) || p, readFileSync(p, "utf8")));
}
