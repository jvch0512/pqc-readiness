import { Assessment } from "./assess.js";

const WAVE = ["Wave 0: fix now (broken today)", "Wave 1: harvest-now risk, start immediately", "Wave 2: high-risk use cases, complete by 31 Dec 2030", "Wave 3: medium and low risk, complete by 31 Dec 2035", "Already quantum-safe or unaffected"];

export function planMarkdown(a: Assessment): string {
  const c = a.counts;
  const L = [`# Post-quantum readiness: ${a.organisation}`, "", `Assessed ${a.today}. Quantum-risk horizon used: ${a.qDay} (your assumption, not a prediction).`, "",
    `${a.results.length} cryptographic assets: ${c["vulnerable-kex"]} quantum-vulnerable key exchange or encryption, ${c["vulnerable-signature"]} quantum-vulnerable signatures, ${c["broken-classic"]} broken today, ${c["weak-symmetric"]} weak symmetric, ${c.unknown} unknown, ${c["pq-ready"]} fine. Crypto-agility score: ${a.agilityScore}/100.`, ""];
  for (const w of [0, 1, 2, 3, 4]) {
    const rs = a.waves[w]!;
    if (!rs.length) continue;
    L.push(`## ${WAVE[w]}`, "", "| Asset | System | Usage | Algorithm | Risk | Start by | Move to |", "|---|---|---|---|---|---|---|");
    for (const r of rs) L.push(`| ${r.asset.id} | ${r.asset.system} | ${r.asset.usage} | ${r.asset.algorithm} | ${r.risk}${r.overdue ? " (late)" : ""} | ${w === 4 ? "-" : w === 0 ? "now" : r.startBy} | ${w === 4 ? "-" : r.target} |`);
    L.push("");
    if (w !== 4) for (const r of rs) if (r.reasons.length) L.push(`- **${r.asset.id}**: ${r.reasons.join(" ")}`);
    L.push("");
  }
  L.push("## Dates used", "", "- EU coordinated roadmap (NIS Cooperation Group, June 2025): national roadmaps and first steps by end of 2026, high-risk use cases migrated by end of 2030, medium and low risk by end of 2035. High risk here means data that must stay confidential for 10 years or more, or critical impact.", "- NIST IR 8547 (final, published 27 October 2026): every quantum-vulnerable public-key algorithm is deprecated after 2030 and disallowed after 2035, whatever the key size. AES and SHA-2 or SHA-3 stay approved. Federal high-value assets have earlier deadlines (key establishment by end of 2030, signatures by end of 2031), which apply to US federal systems, not to you by default.", "- Standards to move to: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA); SP 800-208 for LMS and XMSS.", "", "Planning aid built on your own inventory. Lifetimes, effort and the quantum-risk horizon are inputs, not facts. Not legal advice.");
  return L.join("\n") + "\n";
}
