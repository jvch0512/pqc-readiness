import { assess } from "/lib/assess.js";
import { cbom } from "/lib/cbom.js";
import { parseInventory } from "/lib/model.js";
import { planMarkdown } from "/lib/report.js";

const $ = (id) => document.getElementById(id);
function el(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
function table(headers, rows, classes = []) {
  const t = document.createElement("table");
  const h = document.createElement("tr");
  headers.forEach((x) => h.append(el("th", x)));
  t.append(h);
  rows.forEach((r) => { const tr = document.createElement("tr"); r.forEach((c, i) => tr.append(el("td", String(c), classes[i] ? classes[i](c) : undefined))); t.append(tr); });
  return t;
}
function cards(items) {
  const box = el("div", undefined, "cards");
  for (const [label, value, cls] of items) { const c = el("div", undefined, `card ${cls ?? ""}`); c.append(el("b", String(value)), el("span", label)); box.append(c); }
  return box;
}
function panel(title, ...kids) { const p = el("div", undefined, "panel"); p.append(el("h2", title), ...kids); return p; }
function copyButton(getMd) {
  const b = el("button", "Copy markdown");
  b.type = "button";
  b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(getMd()); b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy markdown"; }, 1500); } catch { /* clipboard blocked */ } });
  return b;
}
function downloadButton(getMd, name) {
  const b = el("button", "Download .md");
  b.type = "button";
  b.addEventListener("click", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([getMd()], { type: "text/markdown" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); });
  return b;
}
async function sample(name) { return (await fetch(`/examples/${name}`)).text(); }
function showError(box, e) { box.replaceChildren(el("p", String(e.message ?? e), "err")); }
function setupTabs() {
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".tab").forEach((s) => { s.hidden = s.id !== `p-${b.dataset.tab}`; });
  }));
}
const cls = (map) => (v) => map[v] ?? "";


const WAVES = ["Wave 0: broken today, fix now", "Wave 1: harvest-now risk, start immediately", "Wave 2: high-risk, by 31 Dec 2030", "Wave 3: medium and low risk, by 31 Dec 2035", "Already quantum-safe or unaffected"];

function run() {
  const out = $("out");
  out.replaceChildren();
  if (!$("inv").value.trim()) return;
  try {
    const a = assess(parseInventory($("inv").value));
    const c = a.counts;
    out.append(cards([["Quantum-vulnerable", c["vulnerable-kex"] + c["vulnerable-signature"], c["vulnerable-kex"] + c["vulnerable-signature"] ? "warn" : "ok"], ["Harvest-now", a.results.filter((r) => r.harvestNow).length, a.results.some((r) => r.harvestNow) ? "bad" : "ok"], ["Broken today", c["broken-classic"], c["broken-classic"] ? "bad" : "ok"], ["Agility", a.agilityScore + "/100"]]));
    for (const w of [0, 1, 2, 3, 4]) {
      const rs = a.waves[w];
      if (!rs.length) continue;
      out.append(panel(WAVES[w], table(["Asset", "System", "Usage", "Algorithm", "Risk", "Start by", "Move to"], rs.map((r) => [r.asset.id, r.asset.system, r.asset.usage, r.asset.algorithm, r.risk + (r.overdue ? " (late)" : ""), w === 4 ? "-" : w === 0 ? "now" : r.startBy, w === 4 ? "-" : r.target]), [null, null, null, null, cls({ high: "s-high", "high (late)": "s-high", medium: "s-medium", low: "s-low" })]), ...(w === 4 ? [] : rs.filter((r) => r.reasons.length).map((r) => el("p", r.asset.id + ": " + r.reasons.join(" ")))))); 
    }
    const row = el("div", undefined, "row");
    row.append(copyButton(() => planMarkdown(a)), downloadButton(() => planMarkdown(a), "pqc-plan.md"), downloadButton(() => JSON.stringify(cbom(a), null, 2), "cbom.json", "application/json"));
    out.append(row);
  } catch (e) { showError(out, e); }
}

$("sample").addEventListener("click", async () => { $("inv").value = await sample("inventory.json"); run(); });
$("inv").addEventListener("input", run);
