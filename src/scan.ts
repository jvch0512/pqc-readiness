// Pure and browser-safe: scans source text for cryptographic algorithm usage.
export interface Finding { file: string; line: number; algorithm: string; usage: string; snippet: string }

const RULES: { re: RegExp; algorithm: string; usage: string }[] = [
  { re: /\bssh-rsa\b/, algorithm: "RSA-2048", usage: "ssh" },
  { re: /\becdsa-sha2-nistp256\b/, algorithm: "ECDSA-P256", usage: "ssh" },
  { re: /\bRSA[-_ ]?(1024|2048|3072|4096)\b/i, algorithm: "RSA", usage: "code" },
  { re: /\b(?:generateKeyPair(?:Sync)?|generate_private_key|RSA\.generate|KeyPairGenerator\.getInstance)\(\s*["']?rsa/i, algorithm: "RSA-2048", usage: "code" },
  { re: /\bsecp256r1|prime256v1|P-256|ECDSA|ECDH\b/i, algorithm: "ECDSA-P256", usage: "code" },
  { re: /\bed25519\b/i, algorithm: "Ed25519", usage: "code" },
  { re: /\bx25519\b/i, algorithm: "X25519", usage: "code" },
  { re: /\b(?:RS|PS)(256|384|512)\b/, algorithm: "RSA-2048", usage: "jwt" },
  { re: /\bES(256|384|512)\b/, algorithm: "ECDSA-P256", usage: "jwt" },
  { re: /\bEdDSA\b/, algorithm: "Ed25519", usage: "jwt" },
  { re: /\bMD5\b|createHash\(\s*["']md5/i, algorithm: "MD5", usage: "code" },
  { re: /\bSHA-?1\b|createHash\(\s*["']sha1/i, algorithm: "SHA-1", usage: "code" },
  { re: /\bDES(?:ede3)?\b|\b3DES\b|TripleDES/i, algorithm: "3DES", usage: "code" },
  { re: /\bRC4\b/i, algorithm: "RC4", usage: "code" },
  { re: /\bAES[-_ ]?128\b/i, algorithm: "AES-128", usage: "storage" },
  { re: /\bml[-_]?kem[-_]?(512|768|1024)\b|\bkyber\b/i, algorithm: "ML-KEM-768", usage: "code" },
  { re: /\bml[-_]?dsa[-_]?(44|65|87)\b|\bdilithium\b/i, algorithm: "ML-DSA-65", usage: "code" },
];

export function scanText(file: string, text: string): Finding[] {
  const out: Finding[] = [];
  text.split(/\r?\n/).forEach((ln, i) => {
    if (ln.length > 400) return;
    for (const r of RULES) {
      const m = r.re.exec(ln);
      if (!m) continue;
      let algorithm = r.algorithm;
      if (algorithm === "RSA" && m[1]) algorithm = `RSA-${m[1]}`; else if (algorithm === "RSA") algorithm = "RSA-2048";
      out.push({ file, line: i + 1, algorithm, usage: r.usage, snippet: ln.trim().slice(0, 120) });
      break;
    }
  });
  return out;
}

export function findingsToAssets(fs: Finding[]) {
  const by = new Map<string, Finding[]>();
  for (const f of fs) { const k = `${f.file}|${f.algorithm}`; by.set(k, [...(by.get(k) ?? []), f]); }
  return [...by.values()].map((g, i) => {
    const f = g[0]!;
    const usage = f.usage === "jwt" || f.usage === "ssh" || f.usage === "storage" ? f.usage : "other";
    return { id: `code-${i + 1}`, system: `${f.file}:${f.line}${g.length > 1 ? ` (+${g.length - 1})` : ""}`, usage, algorithm: f.algorithm, confidentialityYears: 0, migrationYears: 1, needsInput: true };
  });
}
