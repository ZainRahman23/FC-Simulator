// possess1/tools/p_outcomes.mjs — §20 TACKLE OUTCOMES, EMERGENT: Standing Tackle V1 (POKE, untuned) on the t_search set (100 random honest
// set-ups × request times 0 … 1.4 s = 1500 runs), under every mode. Nothing tuned toward a distribution — what naturally happens.
//   node p_outcomes.mjs [--n 100] [--seed 7] [--modes OLD,NONE,SHORT,MEDIUM,LONG] [--set search|moves|envelope] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { DT } from "../../vocab2/c_sim.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { runMode, outcomeOf, MODE_LIST } from "../p_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg("n", 100), seed = +arg("seed", 7), MODES = (arg("modes") || MODE_LIST.join(",")).split(","), SET = arg("set", "search");
const KINDS = ["MISS", "CONTACT — ATTACKER RETAINS", "CONTACT — ATTACKER RECOVERS", "CONTACT — DEFENDER RECOVERS", "CONTACT — BALL FREE"];
// the encounter sets
function setOf() { const L = [];
  if (SET === "search") for (let i = 0; i < N; i++) { const t0 = trialCase(i, seed); for (let q = 0; q <= 14; q++) L.push(Object.assign({}, t0, { id: `#${i}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)], grp: t0.c.tech === "CARRY" ? "CARRY · " + t0.c.variant : t0.c.tech })); }
  if (SET === "moves") { const MV = { BODY_FEINT: CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"), CROQUETA: CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L") };
    for (const [name, c] of Object.entries(MV)) for (const ahead of [2.4, 3.0, 3.6, 4.2]) for (const lat of [-1.0, -0.5, 0.5, 1.0]) for (let q = 0; q <= 10; q++) L.push({ id: `${name} ${ahead}/${lat}@${(q * 0.1).toFixed(1)}`, grp: name, c, def: { at: [ahead, lat], face: 180, stick: [] }, tackle: [+(q * 0.1).toFixed(1)] }); }
  if (SET === "envelope") { const carry = { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] };
    const AP = { "STANDING DEFENDER": { add: 0, stick: [] }, "WALKING IN": { add: 1.6, stick: [[-0.6, 0, "WALK"], [0.5, null, "WALK"]] }, "JOGGING IN": { add: 2.2, stick: [[-0.6, 0, "JOG"], [0.45, null, "JOG"]] } };
    for (const [name, a] of Object.entries(AP)) for (const pref of ["R", "L"]) for (const lat of [-1.0, -0.8, 0.8, 1.0]) for (const ahead of [3.6, 4.4, 5.2]) for (const tq of [0.2, 0.4, 0.6, 0.8]) L.push({ id: `${name} ${pref} ${ahead}/${lat}@${tq}`, grp: name + (pref === "L" ? " · MIRROR (left-footed carrier)" : ""), c: Object.assign({}, carry, { pref }), def: { at: [ahead + a.add, lat], face: 180, stick: a.stick }, tackle: [tq] }); }
  return L; }
const L = setOf(), T = {}, G = {}, est = {}, rows = []; let runs = 0;
for (const m of MODES) { T[m] = { committed: 0 }; G[m] = {}; est[m] = { ATT: [], DEF: [] }; }
for (const tc of L) { for (const m of MODES) { const r = runMode(ENV, tc, m), o = outcomeOf(r.W); runs++; if (!o) continue; const k = o.kind;
    T[m].committed++; T[m][k] = (T[m][k] || 0) + 1; const g = (G[m][tc.grp] || (G[m][tc.grp] = { committed: 0 })); g.committed++; g[k] = (g[k] || 0) + 1;
    if (o.est != null) est[m][k.includes("ATTACKER") ? "ATT" : "DEF"].push(o.est);
    rows.push({ id: tc.id, grp: tc.grp, mode: m, kind: k, v1: o.v1 || null, dv: o.dv != null ? +o.dv.toFixed(2) : null, est: o.est != null ? +o.est.toFixed(3) : null, kept: o.kept != null ? o.kept : null, contacts: r.W.auth ? r.W.contactLog.length : null, transitions: r.W.auth ? r.W.auth.log.filter((e) => e.to).length : null, denied: r.W.auth ? r.W.auth.denied.length : null }); }
  if (runs % 500 < MODES.length) process.stderr.write(`${runs} `); }
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : "—").padStart(5);
const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(x * s.length))] : null; };
console.log(`\nOUTCOMES — set "${SET}" (${L.length} encounters${SET === "search" ? `: ${N} set-ups × 15 request times, seed ${seed}` : ""}), Standing Tackle V1 POKE (untuned), committed tackles only`);
console.log(`  ${"".padEnd(30)} ${MODES.map((m) => m.padStart(13)).join("")}`);
console.log(`  ${"committed".padEnd(30)} ${MODES.map((m) => String(T[m].committed).padStart(13)).join("")}`);
for (const k of KINDS) console.log(`  ${k.padEnd(30)} ${MODES.map((m) => `${String(T[m][k] || 0).padStart(5)} ${pct(T[m][k] || 0, T[m].committed)}%`.padStart(13)).join("")}`);
console.log(`  establishment after the contact (median / p90 s): ${MODES.filter((m) => m !== "OLD").map((m) => `${m} ATT ${q(est[m].ATT, 0.5)?.toFixed(2) ?? "—"} / ${q(est[m].ATT, 0.9)?.toFixed(2) ?? "—"} · DEF ${q(est[m].DEF, 0.5)?.toFixed(2) ?? "—"} / ${q(est[m].DEF, 0.9)?.toFixed(2) ?? "—"}`).join("  |  ")}`);
const kept = (m) => rows.filter((r) => r.mode === m && r.kind === "CONTACT — DEFENDER RECOVERS"); console.log(`  DEFENDER RECOVERS kept to the replay's end: ${MODES.filter((m) => m !== "OLD").map((m) => `${m} ${kept(m).filter((r) => r.kept).length}/${kept(m).length}`).join(" · ")}`);
console.log("\nBY GROUP");
for (const g of [...new Set(L.map((x) => x.grp))]) { console.log(`  ${g}`); for (const m of MODES) { const x = G[m][g]; if (!x) continue; console.log(`    ${m.padEnd(7)} committed ${String(x.committed).padStart(3)}: ${KINDS.filter((k) => x[k]).map((k) => `${k.replace("CONTACT — ", "")} ${x[k]}`).join(" · ")}`); } }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, N, seed, MODES, T, G, rows }, null, 0));
