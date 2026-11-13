#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { assess } from "./assess.js";
import { cbom } from "./cbom.js";
import { certsFromDir } from "./certs.js";
import { InventoryError, parseInventory } from "./model.js";
import { planMarkdown } from "./report.js";
import { findingsToAssets, scanText } from "./scan.js";
import { walk } from "./certs.js";

const USAGE = `pqc-readiness

  pqc-readiness assess <inventory.json> [more.json ...] [--cbom out.json] [--json] [--fail-on-high]
  pqc-readiness certs <dir>      X.509 PEM files to inventory JSON (stdout)
  pqc-readiness scan <dir>       source files to inventory JSON (stdout, lifetimes are defaults to confirm)

Offline: nothing is sent anywhere. Exit codes: 0 ok, 1 high-risk assets (with --fail-on-high), 2 bad input.`;

function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  try {
    if (cmd === "certs" && rest[0]) { process.stdout.write(JSON.stringify({ assets: certsFromDir(rest[0]) }, null, 2) + "\n"); return 0; }
    if (cmd === "scan" && rest[0]) {
      const dir = rest[0];
      const fs = walk(dir, /\.(ts|js|mjs|py|java|go|rs|c|cpp|cs|rb|php|conf|cfg|yml|yaml|json|properties|tf)$/i).flatMap((p) => scanText(p.slice(dir.length + 1) || p, readFileSync(p, "utf8")));
      process.stdout.write(JSON.stringify({ assets: findingsToAssets(fs) }, null, 2) + "\n");
      return 0;
    }
    if (cmd === "assess") {
      const files = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--cbom");
      if (!files.length) { console.error(USAGE); return 2; }
      const invs = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>);
      const merged = { ...invs[0], assets: invs.flatMap((x) => (Array.isArray(x["assets"]) ? x["assets"] : [])) };
      const a = assess(parseInventory(JSON.stringify(merged)));
      const i = rest.indexOf("--cbom"); if (i >= 0 && rest[i + 1]) writeFileSync(rest[i + 1]!, JSON.stringify(cbom(a), null, 2) + "\n");
      process.stdout.write(rest.includes("--json") ? JSON.stringify(a, null, 2) + "\n" : planMarkdown(a));
      return rest.includes("--fail-on-high") && a.results.some((r) => r.risk === "high" && r.cls !== "pq-ready") ? 1 : 0;
    }
    console.error(USAGE); return 2;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (e instanceof InventoryError || e instanceof SyntaxError || code === "ENOENT" || code === "ENOTDIR") { console.error(`error: ${(e as Error).message}`); return 2; }
    throw e;
  }
}

process.exitCode = main(process.argv.slice(2));
