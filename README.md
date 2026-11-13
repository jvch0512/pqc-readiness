# pqc-readiness

Post-quantum readiness for people who have to produce a plan, not a lecture. Feed it a cryptographic inventory and it tells you what is quantum-vulnerable, what can already be recorded today and read later, what to migrate first, and what to move to. It also emits a CycloneDX CBOM.

**Live demo:** https://jvch0512.github.io/pqc-readiness/ (runs in your browser, nothing is uploaded)

Zero runtime dependencies. TypeScript, Node 20+.

## What it does

- **Inventory from three sources.** A JSON inventory you maintain, X.509 PEM certificates (`certs`, uses `node:crypto`), and a source and config scan (`scan`) for RSA, ECDSA, Ed25519, JWT algorithms, MD5, SHA-1, 3DES, RC4 and early ML-KEM or ML-DSA use.
- **Classification.** Quantum-vulnerable key exchange or encryption, quantum-vulnerable signatures, broken today, symmetric choices worth tightening, unknown, already safe (ML-KEM, ML-DSA, SLH-DSA, LMS, XMSS, hybrids).
- **Harvest-now-decrypt-later.** Mosca's inequality: if how long the data must stay secret plus how long migration takes exceeds the years until your assumed quantum horizon (default 2035, configurable with `qDay`), the asset is flagged.
- **Waves.** Wave 0 broken today, wave 1 harvest-now, wave 2 high-risk by end of 2030, wave 3 the rest by end of 2035, each with a start-by date and a target algorithm.
- **Crypto-agility score** from how many assets can swap algorithms without a rewrite, minus vendor-controlled ones.
- **CBOM.** CycloneDX 1.6 `cryptographic-asset` components, one per algorithm, linked to the systems that use it.

## Use

```bash
npm install && npm run build
node dist/src/cli.js assess examples/inventory.json --cbom cbom.json
node dist/src/cli.js certs ./pki > certs.json
node dist/src/cli.js scan ./src > code.json
node dist/src/cli.js assess inventory.json certs.json code.json --fail-on-high   # merge sources, gate CI
npm start                                                                         # UI on http://localhost:8787
```

Exit codes: 0 ok, 1 high-risk assets (with `--fail-on-high`), 2 bad input.

Inventory shape (see [examples/inventory.json](examples/inventory.json)):

```json
{ "organisation": "Acme", "qDay": 2035, "assets": [
  { "id": "A2", "system": "Site-to-site VPN", "usage": "vpn", "algorithm": "RSA-2048",
    "confidentialityYears": 15, "migrationYears": 3, "critical": true, "vendorControlled": true, "agile": false } ] }
```

Sample outputs: [plan](docs/sample-plan.md), [CBOM](docs/sample-cbom.json). CI regenerates both and fails on drift.

## Dates and sources

| Item | What the tool assumes | Source |
|---|---|---|
| EU roadmap | First steps and national roadmaps by end of 2026, high-risk use cases by end of 2030, the rest by end of 2035 | [NIS Cooperation Group, Coordinated Implementation Roadmap, June 2025](https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography) |
| NIST dates | Quantum-vulnerable public-key algorithms deprecated after 2030 and disallowed after 2035, at every key size; AES and SHA-2 or SHA-3 stay approved | NIST IR 8547 final, 27 Oct 2026, via [Help Net Security](https://www.helpnetsecurity.com/?p=389358) and [postquantum.com](https://postquantum.com/security-pqc/nist-ir-8547-final/); read the primary text at csrc.nist.gov |
| Standards | ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205), LMS and XMSS (SP 800-208); ML-KEM-768 as default | NIST |
| CBOM | CycloneDX 1.6 cryptographic-asset shape (indicative) | [cyclonedx.org/capabilities/cbom](https://cyclonedx.org/capabilities/cbom/) |

"High risk" is this tool's reading: data that must stay confidential for 10 years or more, or assets flagged critical. The roadmap defines the categories at a higher level, so confirm your classification with your national authority. US federal deadlines (2030 for key establishment, 2031 for signatures on high-value assets) are not applied to you.

## Limits

- It is a planning aid built on your own inventory. Lifetimes, migration effort and the quantum horizon are inputs, not facts.
- The code scan is pattern matching: it finds mentions, not proof of use, and cannot see crypto inside binaries, libraries or HSMs. Findings come with default lifetimes marked "confirm with the owner".
- Certificate parsing covers public key algorithm, validity and CA flag. It does not walk chains or check revocation.
- The CBOM follows the CycloneDX 1.6 structure but is not validated against the schema in CI.
- Not legal advice.

## Tests

```bash
npm test   # 15 tests: classification, Mosca, waves, CBOM, certs, scan, input validation
```

MIT.
