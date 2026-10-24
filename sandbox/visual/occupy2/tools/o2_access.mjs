// occupy2/tools/o2_access.mjs — §14 / §15 / §18 THE BALL-ACCESS AUDIT, OLD · STAGE 1 · STAGE 2 (the bodies as drawn):
//   1. EVERY BALL CONTACT MADE — the playing leg against the opponent's body at the contact's own tick: CLEAR (≤ the tolerance) · AMBIGUOUS
//      (tolerance … hard limit) · THROUGH (> the hard limit); and the LATENCY check: the same leg at the tick before and the tick after — a contact
//      made while the leg was through the body one tick either side is the "body blocks on N, the boot wins on N + 1" inconsistency
//   2. EVERY CONTACT DENIED — by the access window (the playing leg through the body in the 0.1 s before) or, STAGE 2 only, by the gate at the
//      contact's own tick (both bodies posed then: what Stage 1's one-tick lag let through); inside a committed move: the move held to its release
//   3. THE STANDING TACKLE'S BOOT — each boot-to-ball contact: AROUND the carrier's body (the boot leg ≤ the tolerance inside him) · AMBIGUOUS ·
//      THROUGH; the boot contacts denied
//   node o2_access.mjs --set review|search|moves [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf } from "./o2_metrics.mjs";
import { runO2 } from "../o2_run.js";
import { measureRun } from "../../occupy1/tools/o_measure.mjs";
import { volumesOf, legThrough, OCC } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "review"), MODES = ["OLD", "S1", "S2"], DT = 1 / 240;
const L = setOf(SET), S = {}; for (const m of MODES) S[m] = { runs: 0, made: 0, CLEAR: 0, AMBIGUOUS: 0, THROUGH: 0, latency: 0, denied: 0, deniedWindow: 0, deniedNow: 0, held: 0, boot: { AROUND: 0, AMBIGUOUS: 0, THROUGH: 0 }, bootDenied: 0, through: [], lat: [] };
const legAt = (W, k, by, F) => { const f = W.frames.get(k); if (!f) return null; const va = volumesOf(f.a.J), vd = volumesOf(f.d.J); return legThrough(by === "ATT" ? va : vd, by === "ATT" ? vd : va, F).pen; };
let n = 0;
for (const tc of L) { if (tc.onlyCommitted) { const p = runO2(ENV, tc, "OLD", { record: false }); if (!p.W.tk.act) continue; } n++;
  for (const m of MODES) { const r = runO2(ENV, tc, m), W = r.W, rec = measureRun(ENV, W, r.clip), s = S[m]; s.runs++;
    for (const c of rec.contacts) { s.made++; s[c.verdict]++; if (c.verdict === "THROUGH") s.through.push(`${tc.id} ${c.by} ${c.kind} ${c.F} ${c.A}→${c.B} ${(c.pen * 100).toFixed(1)} cm`);
      if (c.kind === "tackle") s.boot[c.verdict === "CLEAR" ? "AROUND" : c.verdict]++;
      const nb = [legAt(W, c.k - 1, c.by, c.F), legAt(W, c.k + 1, c.by, c.F)].filter((x) => x != null); if (c.verdict !== "THROUGH" && nb.some((x) => x > OCC.hard)) { s.latency++; s.lat.push(`${tc.id} ${c.by} ${c.kind} ${c.F} at ${(c.pen * 100).toFixed(1)} cm, neighbours ${nb.map((x) => (x * 100).toFixed(1)).join("/")} cm`); } }
    if (W.occ && W.occOn !== false && m !== "OLD") for (const e of W.occ.events) { if (e.kind === "BALL ACCESS BLOCKED") { s.denied++; if (e.through && e.through.now) s.deniedNow++; else s.deniedWindow++; if (e.held) s.held++; } if (e.kind === "TACKLE BOOT BLOCKED") { s.bootDenied++; if (e.through && e.through.now) s.deniedNow++; else s.deniedWindow++; } }
    W.frames = null; }
  if (n % 20 === 0) process.stderr.write(`${n} `); }
console.log(`\nBALL ACCESS — set "${SET}", ${n} encounters (the bodies as drawn; tolerance ${OCC.tol * 100} cm, hard limit ${OCC.hard * 100} cm)`);
const row = (l, f) => console.log(`  ${l.padEnd(74)}${MODES.map((m) => String(f(S[m])).padStart(12)).join("")}`); console.log(`  ${"".padEnd(74)}${MODES.map((m) => m.padStart(12)).join("")}`);
row("ball contacts made", (s) => s.made); row("   CLEAR (the playing leg ≤ the tolerance in the opponent)", (s) => s.CLEAR); row("   AMBIGUOUS (tolerance … hard limit)", (s) => s.AMBIGUOUS); row("   THROUGH THE OPPONENT'S BODY (> the hard limit)", (s) => s.THROUGH);
row("   made with the leg through the body one tick before or after (LATENCY)", (s) => s.latency);
row("contacts DENIED (touches + tackle boots)", (s) => s.denied + s.bootDenied); row("   by the access window (the leg through the body in the 0.1 s before)", (s) => s.deniedWindow); row("   by the gate AT the contact's own tick (no one-tick lag)", (s) => s.deniedNow); row("   a committed move's touch denied: the move held to its release", (s) => s.held);
row("STANDING TACKLE boot-to-ball: AROUND the carrier's body", (s) => s.boot.AROUND); row("   AMBIGUOUS", (s) => s.boot.AMBIGUOUS); row("   THROUGH the carrier's body", (s) => s.boot.THROUGH); row("   boot contacts denied", (s) => s.bootDenied);
for (const m of MODES) { if (S[m].through.length) console.log(`  ${m} THROUGH: ${S[m].through.slice(0, 6).join(" · ")}`); if (S[m].lat.length) console.log(`  ${m} LATENCY: ${S[m].lat.slice(0, 6).join(" · ")}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ SET, n, S }, null, 0));
