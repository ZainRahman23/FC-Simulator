// tc_playtest1/tools/pt_pose_test.mjs — pose a scripted run every tick (or every Nth): timing, NaN, leg clearances, the ball against the boots, the feet
// above the turf; and ANIMATION NEUTRALITY (the same script with and without posing: identical hash, contacts, actions)
import { ENV, makeSim, runScript } from "./pt_env.mjs";
import { PlayBody } from "../pt_body.js";
import fs from "node:fs";
const SC = { wdwa: [{ t: 0.2, keys: "W" }, { t: 1.8, keys: "D" }, { t: 2.6, keys: "W" }, { t: 3.4, keys: "A" }], runA: [{ t: 0.2, keys: "W" }, { t: 2.2, keys: "A" }],
  sprintS: [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 2.6, keys: "S" }], mix: [{ t: 0.2, keys: "W" }, { t: 1.8, keys: "D" }, { t: 2.6, keys: "W", mode: "SPRINT" }, { t: 3.4, keys: "A" }, { t: 4.5, keys: "S", mode: "RUN" }, { t: 5.5, keys: "" }] };
const id = process.argv[2] || "mix", dur = +(process.argv[3] || 7), every = +(process.argv[4] || 1);
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url)));
const env = Object.assign({}, ENV, { colliders });
const A = makeSim({}), body = new PlayBody(env, A); let n = 0, tms = [], slow = [], badG = [], badL = [], worst = { clr: 9, at: 0, which: "" }, gapMin = { v: 9, t: 0, X: "" }, nan = 0, low = { v: 9, t: 0 };
runScript(A, SC[id], dur, (s, k) => { if (k % every) return; const c0 = performance.now(); const p = body.pose(s.t); const dtm = performance.now() - c0; tms.push(dtm); if (dtm > 5) slow.push(`${s.t.toFixed(3)}:${dtm.toFixed(0)}ms`); n++;
  const mg = Math.min(p.gap.R ? p.gap.R.gap : 9, p.gap.L ? p.gap.L.gap : 9), ml = Math.min(...Object.values(p.clr)); if (mg < -0.02) badG.push(s.t); if (ml < -0.02) badL.push(s.t);
  for (const v of p.skin) if (!Number.isFinite(v)) { nan++; break; }
  for (const [kk, v] of Object.entries(p.clr)) if (v < worst.clr) worst = { clr: v, at: s.t, which: kk };
  for (const X of ["R", "L"]) { if (p.gap[X] && p.gap[X].gap < gapMin.v) gapMin = { v: p.gap[X].gap, t: s.t, X, face: p.gap[X].face }; const a = p.feet[X].ank; if (a[2] < low.v) low = { v: a[2], t: s.t }; } });
const spans = (L) => { const o = []; for (const t of L) { const l = o[o.length - 1]; if (l && t - l[1] < 0.02) l[1] = t; else o.push([t, t]); } return o.map(([a, b]) => a.toFixed(2) + (b > a ? "–" + b.toFixed(2) : "")).join(" "); };
console.log(`  slow poses: ${slow.join(" ")}`); console.log(`  ball inside a boot > 20 mm: ${badG.length} ticks [${spans(badG)}]`); console.log(`  legs intersect > 20 mm: ${badL.length} ticks [${spans(badL)}]`);
console.log("  contacts: " + A.contacts.map((c) => `${c.t.toFixed(2)} ${c.F} ${c.surface} ${c.role}`).join(" | "));
const B = makeSim({}); runScript(B, SC[id], dur, () => {});
tms.sort((a, b) => a - b); const q = (x) => tms[Math.min(tms.length - 1, Math.floor(x * tms.length))];
console.log(`${id}: ${n} poses · mean ${(tms.reduce((a, b) => a + b, 0) / n).toFixed(3)} ms p95 ${q(0.95).toFixed(3)} p99 ${q(0.99).toFixed(3)} max ${tms[tms.length - 1].toFixed(2)} · NaN ${nan}`);
console.log(`  worst leg clearance ${(worst.clr * 1000).toFixed(0)} mm (${worst.which} @ ${worst.at.toFixed(2)}) · ball vs boot min gap ${(gapMin.v * 1000).toFixed(0)} mm (${gapMin.X} ${gapMin.face} @ ${gapMin.t.toFixed(2)}) · lowest ankle ${(low.v * 1000).toFixed(0)} mm @ ${low.t.toFixed(2)}`);
const same = A.hash === B.hash && A.contacts.length === B.contacts.length && JSON.stringify(A.log.actions.map((a) => [a.t, a.label])) === JSON.stringify(B.log.actions.map((a) => [a.t, a.label]));
console.log(`  NEUTRALITY animation ON ${A.hash.toString(16)} (${A.contacts.length} contacts) vs OFF ${B.hash.toString(16)} (${B.contacts.length}) → ${same ? "IDENTICAL" : "DIFFERENT"}`);
