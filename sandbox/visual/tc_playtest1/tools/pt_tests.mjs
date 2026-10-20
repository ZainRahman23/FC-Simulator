// tc_playtest1/tools/pt_tests.mjs — the owner's explicit input tests, scripted on the same simulation the page runs (headless, 240 Hz): each
// sequence's actions (with the resolver's reason), its contacts, missed contacts, the ball's separation, and — after the last direction change —
// when the body AND the ball are on the new line (heading within 15°, the ball moving within 25° of it); a timing sweep (the same turn pressed at
// different moments of the stride) shows different, sensible outcomes; determinism (twice) per sequence
//   node pt_tests.mjs [--json out.json]
import { makeSim, runScript, keysToH } from "./pt_env.mjs";
import fs from "node:fs";
const out = process.argv.indexOf("--json") > 0 ? process.argv[process.argv.indexOf("--json") + 1] : null, DEG = Math.PI / 180, hyp = Math.hypot;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const TESTS = {
  "W→WD→D→SD→S": [{ t: 0.2, keys: "W" }, { t: 2.2, keys: "WD" }, { t: 2.9, keys: "D" }, { t: 3.6, keys: "SD" }, { t: 4.3, keys: "S" }],
  "sprint W→A": [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 3.0, keys: "A" }],
  "sprint W→S": [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 3.0, keys: "S" }],
  "W→D→W→A": [{ t: 0.2, keys: "W" }, { t: 2.2, keys: "D" }, { t: 3.2, keys: "W" }, { t: 4.2, keys: "A" }],
  "run W→A": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "A" }],
  "run W→S": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "S" }],
  "run W→WA (45°)": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "WA" }],
  "run W→SA (135°)": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "SA" }],
  "walk W→A": [{ t: 0.2, keys: "W", mode: "WALK" }, { t: 2.4, keys: "A" }],
  "jog W→D": [{ t: 0.2, keys: "W", mode: "JOG" }, { t: 2.4, keys: "D" }],
  "stop": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "" }],
  "standing S": [{ t: 0.3, keys: "S" }],
  "rapid WA/WD": [{ t: 0.2, keys: "W" }, { t: 2.0, keys: "WA" }, { t: 2.4, keys: "WD" }, { t: 2.8, keys: "WA" }, { t: 3.2, keys: "WD" }, { t: 3.6, keys: "W" }],
};
function run(script, dur, o = {}) { const sim = makeSim(o); let sepMax = 0, sepMaxAfter = 0; const tLast = script[script.length - 1].t, hLast = keysToH(script[script.length - 1].keys || "", 0); let onLine = null;
  runScript(sim, script, dur, (s) => { const st = s.stateAt(s.t), b = s.ball.p, v = s.ball.v, sep = hyp(b[0] - st.P[0], b[1] - st.P[1]); sepMax = Math.max(sepMax, sep); if (s.t > tLast) sepMaxAfter = Math.max(sepMaxAfter, sep);
    if (onLine == null && hLast != null && s.t > tLast) { const bs = hyp(v[0], v[1]); if (st.s > 1.0 && Math.abs(wrap(st.h - hLast)) < 15 * DEG && bs > 0.5 && Math.abs(wrap(Math.atan2(v[1], v[0]) - hLast)) < 25 * DEG && sep < 1.6) onLine = s.t - tLast; } });
  return { sim, sepMax, sepMaxAfter, onLine }; }
const res = {};
for (const [name, sc] of Object.entries(TESTS)) { const dur = sc[sc.length - 1].t + 2.6, A = run(sc, dur), B = run(sc, dur), S = A.sim;
  const acts = S.log.actions.filter((a) => a.t > 0.25).map((a) => ({ t: +a.t.toFixed(3), label: a.label + (a.m ? (a.m > 0 ? " R" : " L") : ""), why: (a.why || []).slice(0, 3).map((w) => `${w.label} ${w.J} [${w.note}]`) }));
  res[name] = { actions: acts, contacts: S.contacts.length, missed: S.contacts.filter((c) => c.missed).length, sepMax: +A.sepMax.toFixed(2), sepMaxAfterLast: +A.sepMaxAfter.toFixed(2), onNewLine: A.onLine == null ? null : +A.onLine.toFixed(2),
    deterministic: A.sim.hash === B.sim.hash, contactList: S.contacts.map((c) => `${c.t.toFixed(2)} ${c.F} ${c.surface} ${c.role} [${c.tech}]`) };
  console.log(`\n■ ${name}: ${acts.filter((a) => a.label !== "CARRY").map((a) => `${a.t.toFixed(2)} ${a.label}`).join(" → ") || "carry only"} · contacts ${S.contacts.length} (missed ${res[name].missed}) · sep max ${res[name].sepMax} m (after the last change ${res[name].sepMaxAfterLast}) · body + ball on the new line +${res[name].onNewLine ?? "—"} s · ${res[name].deterministic ? "deterministic" : "NOT DETERMINISTIC"}`);
  for (const a of acts.filter((x) => x.label !== "CARRY")) console.log(`    ${a.t.toFixed(2)} ${a.label}: ${a.why.join(" | ")}`); }
// THE TIMING SWEEP: run → A pressed at 2.00 … 2.60 s (every 0.05 s — the stride phase changes): the resolver's choice each time
console.log("\n■ timing sweep · run W → A pressed at t:"); res.sweep = [];
for (let t = 2.0; t <= 2.6 + 1e-9; t += 0.05) { const { sim, onLine } = run([{ t: 0.2, keys: "W" }, { t, keys: "A" }], t + 2.6); const a = sim.log.actions.filter((x) => x.t >= t - 1e-6 && x.label !== "CARRY")[0];
  const row = { t: +t.toFixed(2), first: a ? a.label + (a.m ? (a.m > 0 ? " R" : " L") : "") : "carry", at: a ? +(a.t - t).toFixed(3) : null, onNewLine: onLine == null ? null : +onLine.toFixed(2), why: a ? (a.why || []).slice(0, 2).map((w) => `${w.label} ${w.J}`) : [] }; res.sweep.push(row);
  console.log(`    ${t.toFixed(2)} → ${row.first.padEnd(18)} on the line +${row.onNewLine ?? "—"} s · ${row.why.join(" | ")}`); }
console.log("\n■ timing sweep · sprint W → A pressed at t:"); res.sweepSprint = [];
for (let t = 2.6; t <= 3.2 + 1e-9; t += 0.05) { const { sim, onLine } = run([{ t: 0.2, keys: "W", mode: "SPRINT" }, { t, keys: "A" }], t + 2.6); const a = sim.log.actions.filter((x) => x.t >= t - 1e-6 && x.label !== "CARRY")[0];
  const row = { t: +t.toFixed(2), first: a ? a.label + (a.m ? (a.m > 0 ? " R" : " L") : "") : "carry", onNewLine: onLine == null ? null : +onLine.toFixed(2), why: a ? (a.why || []).slice(0, 2).map((w) => `${w.label} ${w.J}`) : [] }; res.sweepSprint.push(row);
  console.log(`    ${t.toFixed(2)} → ${row.first.padEnd(18)} on the line +${row.onNewLine ?? "—"} s · ${row.why.join(" | ")}`); }
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
