import { Assessment } from "./assess.js";

/** Indicative CycloneDX 1.6 style CBOM: one cryptographic-asset component per distinct algorithm, linked to the systems that use it. */
export function cbom(a: Assessment): unknown {
  const by = new Map<string, { algo: NonNullable<Assessment["results"][number]["asset"]["algo"]>; used: string[] }>();
  for (const r of a.results) { const al = r.asset.algo; if (!al) continue; const e = by.get(al.name) ?? { algo: al, used: [] }; e.used.push(`${r.asset.system} (${r.asset.usage})`); by.set(al.name, e); }
  const prim = (role: string) => ({ kex: "key-agree", pke: "pke", signature: "signature", symmetric: "block-cipher", hash: "hash", "kem-pq": "kem", "signature-pq": "signature", hybrid: "kem" } as Record<string, string>)[role] ?? "other";
  return {
    bomFormat: "CycloneDX", specVersion: "1.6", version: 1,
    metadata: { timestamp: `${a.today}T00:00:00Z`, component: { type: "application", name: a.organisation } },
    components: [...by.values()].map(({ algo, used }) => ({
      type: "cryptographic-asset", "bom-ref": `crypto/algorithm/${algo.name.toLowerCase()}`, name: algo.name,
      cryptoProperties: { assetType: "algorithm", algorithmProperties: { primitive: prim(algo.role), classicalSecurityLevel: algo.classicalBits || undefined, nistQuantumSecurityLevel: algo.quantumVulnerable ? 0 : undefined } },
      properties: [{ name: "pqc:quantumVulnerable", value: String(algo.quantumVulnerable) }, { name: "pqc:usedBy", value: used.join("; ") }],
    })),
  };
}
