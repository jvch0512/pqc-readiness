# Post-quantum readiness: Acme Energy (sample)

Assessed 2026-11-13. Quantum-risk horizon used: 2035 (your assumption, not a prediction).

12 cryptographic assets: 5 quantum-vulnerable key exchange or encryption, 2 quantum-vulnerable signatures, 1 broken today, 1 weak symmetric, 1 unknown, 2 fine. Crypto-agility score: 32/100.

## Wave 0: fix now (broken today)

| Asset | System | Usage | Algorithm | Risk | Start by | Move to |
|---|---|---|---|---|---|---|
| A8 | Legacy HR export | email | 3DES | high | now | AES-256-GCM |

- **A8**: 3DES is broken today: Deprecated; Sweet32.

## Wave 1: harvest-now risk, start immediately

| Asset | System | Usage | Algorithm | Risk | Start by | Move to |
|---|---|---|---|---|---|---|
| A3 | Grid telemetry archive encryption keys | storage | RSA-2048 | high (late) | 2026-07-01 | AES-256 data keys wrapped with ML-KEM-768 |
| A2 | Site-to-site VPN to plants | vpn | RSA-2048 | high | 2027-07-01 | Hybrid X25519MLKEM768, then ML-KEM-768 |

- **A3**: RSA-2048 falls to a quantum computer (Shor). Data kept 25 years plus 4 years to migrate exceeds the 8.2 years left until 2035: it can be recorded now and read later.
- **A2**: RSA-2048 falls to a quantum computer (Shor). Data kept 15 years plus 3 years to migrate exceeds the 8.2 years left until 2035: it can be recorded now and read later. Vendor controlled: you need the supplier's PQC roadmap in writing.

## Wave 2: high-risk use cases, complete by 31 Dec 2030

| Asset | System | Usage | Algorithm | Risk | Start by | Move to |
|---|---|---|---|---|---|---|
| A5 | Substation controller firmware signing | firmware-signing | ECDSA-P256 | high (late) | 2025-07-01 | LMS or XMSS (SP 800-208), or ML-DSA-65 |
| A6 | Internal root CA | pki | RSA-4096 | high | 2027-07-01 | Hybrid X25519MLKEM768, then ML-KEM-768 |

- **A5**: ECDSA-P256 signatures can be forged once a quantum computer exists; no harvest-now risk, but long-lived signatures and roots of trust must move first. Vendor controlled: you need the supplier's PQC roadmap in writing.
- **A6**: RSA-4096 falls to a quantum computer (Shor).

## Wave 3: medium and low risk, complete by 31 Dec 2035

| Asset | System | Usage | Algorithm | Risk | Start by | Move to |
|---|---|---|---|---|---|---|
| A1 | Customer portal TLS | tls | ECDH-P256 | medium | 2034-07-01 | Hybrid X25519MLKEM768, then ML-KEM-768 |
| A7 | Admin SSH | ssh | Ed25519 | medium | 2034-07-01 | ML-DSA-65 (FIPS 204) |
| A9 | Mobile API tokens | jwt | RSA-2048 | medium | 2034-07-01 | Hybrid X25519MLKEM768, then ML-KEM-768 |
| A12 | Legacy file transfer | api | FROBNICATE-9 | medium | 2033-07-01 | classify by hand |
| A4 | Backup encryption | backup | AES-128 | low | 2029-07-01 | AES-256-GCM |

- **A1**: ECDH-P256 falls to a quantum computer (Shor).
- **A7**: Ed25519 signatures can be forged once a quantum computer exists; no harvest-now risk, but long-lived signatures and roots of trust must move first.
- **A9**: RSA-2048 falls to a quantum computer (Shor).
- **A12**: Algorithm "FROBNICATE-9" is not recognised: classify it by hand. Confidentiality lifetime and migration effort are defaults: confirm them with the system owner.
- **A4**: AES-128 stays approved by NIST and resists quantum attack, but 256-bit keys are the conservative choice for data kept 20 years.

## Already quantum-safe or unaffected

| Asset | System | Usage | Algorithm | Risk | Start by | Move to |
|---|---|---|---|---|---|---|
| A10 | Edge gateway (vendor X) | tls | X25519MLKEM768 | low | - | - |
| A11 | Meter firmware channel | iot | ML-DSA-65 | low | - | - |


## Dates used

- EU coordinated roadmap (NIS Cooperation Group, June 2025): national roadmaps and first steps by end of 2026, high-risk use cases migrated by end of 2030, medium and low risk by end of 2035. High risk here means data that must stay confidential for 10 years or more, or critical impact.
- NIST IR 8547 (final, published 27 October 2026): every quantum-vulnerable public-key algorithm is deprecated after 2030 and disallowed after 2035, whatever the key size. AES and SHA-2 or SHA-3 stay approved. Federal high-value assets have earlier deadlines (key establishment by end of 2030, signatures by end of 2031), which apply to US federal systems, not to you by default.
- Standards to move to: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA); SP 800-208 for LMS and XMSS.

Planning aid built on your own inventory. Lifetimes, effort and the quantum-risk horizon are inputs, not facts. Not legal advice.
