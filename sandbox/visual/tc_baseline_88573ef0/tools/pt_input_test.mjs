// tc_playtest1/tools/pt_input_test.mjs — the on-screen stick is INPUT ONLY: (1) its direction is continuous (the owner's 7° … 137° come out
// exactly, never bucketed), the deadzone and the zones behave; (2) EQUIVALENT INPUTS GIVE IDENTICAL AUTHORITATIVE RESULTS — WASD vs the stick
// held at the equivalent normalised vector (forward, the diagonal, a turn sequence, sprint by Shift vs the SPRINT button, walk by Alt vs the WALK
// button): the same hash, contacts and actions; (3) the owner's playtest — sprint forward, the stick turned smoothly 0 → 30 → 45 → 60 → 75 → 90°,
// and snapped forward → 90° / → 150°: what the resolver does. The requests are built with pt_input.js — the page's own functions.
//   node pt_input_test.mjs [--json out.json]
import { makeSim } from "./pt_env.mjs";
import { STICK, stickVector, stickMode, headingFrom, stickAngleDeg } from "../pt_input.js";
import fs from "node:fs";
const out = process.argv.indexOf("--json") > 0 ? process.argv[process.argv.indexOf("--json") + 1] : null, DT = 1 / 240, DEG = Math.PI / 180, res = { pure: [], equivalence: [], playtest: [] };
const FRAME = 0;   // the camera forward latched at the start (the page latches it the same way for both sources)
// (1) the pure mapping
for (const a of [7, 23, 41, 68, 97, 137, -45, 180]) { const v = stickVector(Math.sin(a * DEG), Math.cos(a * DEG)), h = headingFrom(FRAME, v.x, v.y);
  res.pure.push({ deg: a, heading: +(h / DEG).toFixed(9), angle: +stickAngleDeg(v).toFixed(9), m: +v.m.toFixed(6), zone: stickMode(v.r) }); }
const dzTest = [0.02, 0.05, 0.07, 0.09, 0.2, 0.39, 0.41, 0.71, 0.73, 1.0].map((r) => { const v = stickVector(0, r); return { r, m: +v.m.toFixed(3), zone: v.m > 0 ? stickMode(v.r) : "deadzone" }; });
console.log("■ continuous direction (stick at full radius → requested heading, deg):", res.pure.map((p) => `${p.deg}→${p.heading}`).join("  "));
console.log("■ magnitude (raw r → |v|, zone; deadzone " + STICK.deadzone + "):", dzTest.map((d) => `${d.r}→${d.m} ${d.zone}`).join(" · ")); res.magnitude = dzTest;
// (2) equivalence: a request per tick from a timeline of inputs, keys or stick
const keysReq = (keys, mode) => { const f = (keys.includes("W") ? 1 : 0) - (keys.includes("S") ? 1 : 0), r = (keys.includes("D") ? 1 : 0) - (keys.includes("A") ? 1 : 0); return { h: headingFrom(FRAME, r, f), mode, keys: 0 }; };
const stickReq = (raw, mode) => { const v = stickVector(raw[0], raw[1]); return { h: v.m > 0 ? headingFrom(FRAME, v.x, v.y) : null, mode: mode || (v.m > 0 ? stickMode(v.r) : "RUN"), keys: 64 }; };
function run(timeline, dur, make) { const sim = makeSim({}); let i = 0, cur = null; const n = Math.round(dur / DT);
  for (let k = 0; k < n; k++) { const t = k * DT; while (i < timeline.length && timeline[i].t <= t + 1e-9) cur = timeline[i++]; sim.step(cur ? make(cur) : { h: null, mode: "RUN", keys: 0 }); }
  return { hash: sim.hash, contacts: sim.contacts.map((c) => `${c.k} ${c.F} ${c.surface} ${c.vOut.map((x) => x.toFixed(9))}`), actions: sim.log.actions.map((a) => `${a.t.toFixed(4)} ${a.label} ${a.m}`), sim }; }
const S2 = Math.SQRT1_2;
const EQ = [
  { name: "WASD forward vs stick exactly forward", keys: [{ t: 0.2, k: "W" }], stick: [{ t: 0.2, s: [0, 1] }], dur: 4 },
  { name: "WASD W+D vs stick normalised diagonal (√½, √½)", keys: [{ t: 0.2, k: "WD" }], stick: [{ t: 0.2, s: [S2, S2] }], dur: 4 },
  { name: "W → WD → D → SD → S vs the stick's equivalents", keys: [{ t: 0.2, k: "W" }, { t: 2.2, k: "WD" }, { t: 2.9, k: "D" }, { t: 3.6, k: "SD" }, { t: 4.3, k: "S" }], stick: [{ t: 0.2, s: [0, 1] }, { t: 2.2, s: [S2, S2] }, { t: 2.9, s: [1, 0] }, { t: 3.6, s: [S2, -S2] }, { t: 4.3, s: [0, -1] }], dur: 6.5 },
  { name: "Shift + W → A (sprint) vs stick + SPRINT button", keys: [{ t: 0.2, k: "W", m: "SPRINT" }, { t: 3.0, k: "A", m: "SPRINT" }], stick: [{ t: 0.2, s: [0, 1], m: "SPRINT" }, { t: 3.0, s: [-1, 0], m: "SPRINT" }], dur: 5.5 },
  { name: "Alt + W (walk) vs stick + WALK button", keys: [{ t: 0.2, k: "W", m: "WALK" }], stick: [{ t: 0.2, s: [0, 1], m: "WALK" }], dur: 4 },
  { name: "release: WASD up vs stick back to the centre", keys: [{ t: 0.2, k: "W" }, { t: 2.4, k: "" }], stick: [{ t: 0.2, s: [0, 1] }, { t: 2.4, s: [0, 0] }], dur: 5 },
];
console.log("\n■ equivalence (identical authoritative results):");
for (const e of EQ) { const A = run(e.keys, e.dur, (c) => keysReq(c.k, c.m || "RUN")), B = run(e.stick, e.dur, (c) => stickReq(c.s, c.m)), same = A.hash === B.hash && JSON.stringify(A.contacts) === JSON.stringify(B.contacts) && JSON.stringify(A.actions) === JSON.stringify(B.actions);
  res.equivalence.push({ name: e.name, keys: A.hash.toString(16), stick: B.hash.toString(16), contacts: A.contacts.length, identical: same }); console.log(`  ${same ? "IDENTICAL" : "DIFFERENT"}  ${e.name} · hash ${A.hash.toString(16)} / ${B.hash.toString(16)} · contacts ${A.contacts.length} / ${B.contacts.length}`); }
// (3) the owner's playtest on the stick: sprint forward, then the stick rotated smoothly (0 → 90° over 2.5 s, through 30 / 45 / 60 / 75°); snaps
const fmt = (r) => r.sim.log.actions.filter((a) => a.t > 0.3 && a.label !== "CARRY").map((a) => `${a.t.toFixed(2)} ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""}`).join(" → ") || "carry only";
const sweep = []; for (let i = 0; i <= 50; i++) { const a = (i / 50) * 90; sweep.push({ t: 3.0 + i * 0.05, s: [Math.sin(a * DEG), Math.cos(a * DEG)], m: "SPRINT" }); }
const PT = [
  { name: "sprint forward, stick rotated smoothly 0 → 90° over 2.5 s (30 / 45 / 60 / 75 / 90 on the way)", tl: [{ t: 0.2, s: [0, 1], m: "SPRINT" }].concat(sweep), dur: 7 },
  { name: "sprint forward, stick held at 30°", tl: [{ t: 0.2, s: [0, 1], m: "SPRINT" }, { t: 3.0, s: [Math.sin(30 * DEG), Math.cos(30 * DEG)], m: "SPRINT" }], dur: 6 },
  { name: "sprint forward, stick held at 60°", tl: [{ t: 0.2, s: [0, 1], m: "SPRINT" }, { t: 3.0, s: [Math.sin(60 * DEG), Math.cos(60 * DEG)], m: "SPRINT" }], dur: 6 },
  { name: "sprint forward → snap 90° right", tl: [{ t: 0.2, s: [0, 1], m: "SPRINT" }, { t: 3.0, s: [1, 0], m: "SPRINT" }], dur: 6 },
  { name: "sprint forward → snap 150° right", tl: [{ t: 0.2, s: [0, 1], m: "SPRINT" }, { t: 3.0, s: [Math.sin(150 * DEG), Math.cos(150 * DEG)], m: "SPRINT" }], dur: 6 },
  { name: "run (stick outer zone) forward → snap 41° left", tl: [{ t: 0.2, s: [0, 1] }, { t: 2.6, s: [-Math.sin(41 * DEG), Math.cos(41 * DEG)] }], dur: 5.5 },
  { name: "run forward → snap 68° right", tl: [{ t: 0.2, s: [0, 1] }, { t: 2.6, s: [Math.sin(68 * DEG), Math.cos(68 * DEG)] }], dur: 5.5 },
  { name: "run forward → snap 97° right", tl: [{ t: 0.2, s: [0, 1] }, { t: 2.6, s: [Math.sin(97 * DEG), Math.cos(97 * DEG)] }], dur: 5.5 },
  { name: "run forward → snap 137° left", tl: [{ t: 0.2, s: [0, 1] }, { t: 2.6, s: [-Math.sin(137 * DEG), Math.cos(137 * DEG)] }], dur: 5.5 },
  { name: "jog zone (stick at 0.55 of the radius) forward → 90° right", tl: [{ t: 0.2, s: [0, 0.55] }, { t: 2.6, s: [0.55, 0] }], dur: 5.5 },
];
console.log("\n■ the owner's playtest on the stick (what the resolver chooses — the stick only asks for a direction):");
for (const p of PT) { const r = run(p.tl, p.dur, (c) => stickReq(c.s, c.m)), A = r.sim.log.actions.filter((a) => a.t > 0.3 && a.label !== "CARRY");
  res.playtest.push({ name: p.name, actions: A.map((a) => ({ t: +a.t.toFixed(3), label: a.label + (a.m ? (a.m > 0 ? " R" : " L") : ""), why: (a.why || []).slice(0, 3).map((w) => `${w.label} ${w.J} [${w.note}]`) })), contacts: r.sim.contacts.length, missed: r.sim.contacts.filter((c) => c.missed).length });
  console.log(`  ${p.name}: ${fmt(r)} · contacts ${r.sim.contacts.length} (missed ${res.playtest[res.playtest.length - 1].missed})`); for (const a of A.slice(0, 3)) console.log(`      ${a.t.toFixed(2)} ${a.label}: ${(a.why || []).slice(0, 3).map((w) => `${w.label} ${w.J}`).join(" | ")}`); }
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
