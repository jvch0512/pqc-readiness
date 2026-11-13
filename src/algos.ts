export type Role = "kex" | "pke" | "signature" | "symmetric" | "hash" | "kem-pq" | "signature-pq" | "hybrid";
export interface Algo {
  name: string; role: Role; family: string;
  quantumVulnerable: boolean;  // broken by Shor on a large quantum computer
  classicallyBroken: boolean;  // broken or deprecated against classical attackers
  classicalBits: number; note: string; target: string;
}

const A = (name: string, role: Role, family: string, qv: boolean, cb: boolean, bits: number, note: string, target: string): Algo => ({ name, role, family, quantumVulnerable: qv, classicallyBroken: cb, classicalBits: bits, note, target });

const KEX = "Hybrid X25519MLKEM768 now (TLS, SSH, VPN), ML-KEM-768 as the pure PQC target";
const SIG = "ML-DSA-65 (FIPS 204); SLH-DSA (FIPS 205) where conservatism matters; LMS or XMSS (SP 800-208) for firmware and code signing";

export function lookup(raw: string): Algo | null {
  const s = raw.trim().toLowerCase().replace(/[_\s]/g, "-");
  let m: RegExpExecArray | null;
  if ((m = /^rsa-?(\d{3,5})?(-(oaep|pkcs1|pss))?$/.exec(s))) {
    const bits = m[1] ? Number(m[1]) : 2048;
    const cls = bits >= 15360 ? 256 : bits >= 7680 ? 192 : bits >= 3072 ? 128 : bits >= 2048 ? 112 : 80;
    return A(`RSA-${bits}`, "pke", "RSA", true, bits < 2048, cls, bits < 2048 ? "Classically weak key size." : "Broken by Shor at any key size.", `${KEX} for key exchange or encryption; ${SIG} for signatures`);
  }
  if ((m = /^(ecdsa|ecdh)-?(p-?)?(256|384|521)$/.exec(s)) || (m = /^(ecdsa|ecdh)-(secp256r1|prime256v1|secp384r1|secp521r1)$/.exec(s))) {
    const kind = m[1]!;
    const bitsStr = /256|prime256/.test(m[0]) ? 256 : /384/.test(m[0]) ? 384 : 521;
    return A(`${kind.toUpperCase()}-P${bitsStr}`, kind === "ecdsa" ? "signature" : "kex", "EC", true, false, bitsStr === 256 ? 128 : bitsStr === 384 ? 192 : 256, "Broken by Shor at any curve size.", kind === "ecdsa" ? SIG : KEX);
  }
  if (s === "x25519" || s === "curve25519") return A("X25519", "kex", "EC", true, false, 128, "Broken by Shor.", KEX);
  if (s === "x448") return A("X448", "kex", "EC", true, false, 224, "Broken by Shor.", KEX);
  if (s === "ed25519" || s === "eddsa") return A("Ed25519", "signature", "EC", true, false, 128, "Broken by Shor.", SIG);
  if ((m = /^(dh|diffie-hellman|ffdhe)-?(\d{3,5})?$/.exec(s))) { const b = m[2] ? Number(m[2]) : 2048; return A(`DH-${b}`, "kex", "FFDH", true, b < 2048, b >= 3072 ? 128 : b >= 2048 ? 112 : 80, "Broken by Shor.", KEX); }
  if (s === "dsa") return A("DSA", "signature", "FFDSA", true, true, 80, "Deprecated classically and broken by Shor.", SIG);
  if ((m = /^aes-?(128|192|256)(-(gcm|cbc|ctr|ecb|xts))?$/.exec(s))) {
    const b = Number(m[1]); const mode = m[3];
    return A(`AES-${b}`, "symmetric", "AES", false, mode === "ecb", b, mode === "ecb" ? "ECB mode leaks patterns." : b === 128 ? "Still approved by NIST and adequate against quantum attack; AES-256 is the conservative choice for very long-lived data." : "Quantum-resistant.", "AES-256-GCM");
  }
  if (s === "3des" || s === "tdes" || s === "triple-des") return A("3DES", "symmetric", "DES", false, true, 80, "Deprecated; Sweet32.", "AES-256-GCM");
  if (s === "des") return A("DES", "symmetric", "DES", false, true, 56, "Broken.", "AES-256-GCM");
  if (s === "rc4") return A("RC4", "symmetric", "RC4", false, true, 0, "Broken.", "AES-256-GCM or ChaCha20-Poly1305");
  if (s === "md5") return A("MD5", "hash", "MD", false, true, 0, "Collisions are practical.", "SHA-256 or SHA-3");
  if (s === "sha-1" || s === "sha1") return A("SHA-1", "hash", "SHA", false, true, 63, "Collisions are practical.", "SHA-256 or SHA-3");
  if (/^sha-?(256|384|512|3.*)$/.test(s)) return A(raw.toUpperCase(), "hash", "SHA", false, false, 128, "Fine against quantum attack at 256 bits and above.", "keep");
  if (s === "chacha20-poly1305" || s === "chacha20") return A("ChaCha20-Poly1305", "symmetric", "ChaCha", false, false, 256, "Quantum-resistant.", "keep");
  if ((m = /^ml-?kem-?(512|768|1024)$/.exec(s))) return A(`ML-KEM-${m[1]}`, "kem-pq", "Lattice", false, false, 0, "NIST FIPS 203.", "keep (768 is the recommended default)");
  if ((m = /^ml-?dsa-?(44|65|87)$/.exec(s))) return A(`ML-DSA-${m[1]}`, "signature-pq", "Lattice", false, false, 0, "NIST FIPS 204.", "keep");
  if (/^slh-?dsa/.test(s) || /^(lms|xmss|hss)/.test(s)) return A(raw.toUpperCase(), "signature-pq", "Hash-based", false, false, 0, "Hash-based signature (FIPS 205 or SP 800-208).", "keep");
  if (s === "x25519mlkem768" || s === "x25519-mlkem768" || s === "secp256r1mlkem768") return A("X25519MLKEM768", "hybrid", "Hybrid", false, false, 128, "Hybrid classical plus ML-KEM.", "keep");
  return null;
}
