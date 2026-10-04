// ═══ physchar2/tools/b_quat_trace.mjs — overnight A2: WHY did global quaternion normalisation (option B, commit e9bcf96) change two marginal G1 outcomes?
// Runs a G1 scenario twice in one process: A = historical raw Jolt orientations (current wrapper), B = every Jolt-sourced orientation normalised
// (the former global scope, re-applied here by a diagnostic prototype patch on the second run only). Per tick: the first tick at which the two
// runs differ, the passive-layer torque difference at that tick (and its source: world torque axes from Q.rot of non-unit orientations), and the
// growth of the state divergence until the outcome differs. DIAGNOSTIC.   usage: node tools/b_quat_trace.mjs <human> <key> [hz]
import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import * as G1 from "../gates/v2_g1.js"; import { Q, V } from "../core/v2_math.js";
const J = await loadJolt(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vendor/jolt-physics.wasm-compat.js")), [human, key, hzS] = process.argv.slice(2), hz = +(hzS || 240), spec = generateSpec(VARIATION_SET.find(h => h.id === human));
const W = V2JoltWorld.prototype, orig = { read: W.read, rotationCS: W.rotationCS, rotCS: W.rotCS, driveTarget: W.driveTarget };
const setGlobal = (on) => { if (!on) { Object.assign(W, orig); return; } W.read = function (i) { const o = orig.read.call(this, i); o.rot = Q.norm(o.rot); return o; }; for (const m of ["rotationCS", "rotCS", "driveTarget"]) W[m] = function (k) { return Q.norm(orig[m].call(this, k)); }; };
function run(global) { setGlobal(global); const s = new G1.G1Sim(J, spec, key, { cfg: hz !== 240 ? { hz } : {} }), rows = []; const oc = s.P.compute.bind(s.P); let lastPlan = null; s.P.compute = (st, dt) => (lastPlan = oc(st, dt));
  while (s.tick()) { const T = lastPlan ? lastPlan.joints.map(j => (j && j.T ? j.T : j && j.tau ? j.tau : null)) : null; rows.push({ st: s.st.map(b => ({ pos: b.pos.slice(), rot: b.rot.slice() })), plan: lastPlan ? JSON.parse(JSON.stringify(lastPlan.joints.map(j => j && (j.Tw || j.T || j.torque || null)))) : null, E: s.A.E[s.A.E.length - 1] }); }
  const g = s.summary(); s.destroy(); setGlobal(false); return { rows, g }; }
const A = run(false), B = run(true), n = Math.min(A.rows.length, B.rows.length);
let first = null; const growth = [];
for (let i = 0; i < n; i++) { let dp = 0; for (let b = 0; b < A.rows[i].st.length; b++) dp = Math.max(dp, V.len(V.sub(A.rows[i].st[b].pos, B.rows[i].st[b].pos))); if (first == null && dp > 0) first = i; if (i % 24 === 0 || i === n - 1) growth.push([i, dp]); }
const raw0 = A.rows[0].st.map(b => Math.abs(b.rot.reduce((a, v) => a + v * v, 0) - 1));
console.log(`${human} ${key} @${hz} Hz | historical hash ${A.g.hash} vs global-normalisation hash ${B.g.hash}`);
console.log(`‖q‖² − 1 of the Jolt orientations at tick 1: max ${Math.max(...raw0).toExponential(2)}`);
console.log(`first tick with any body-position difference: ${first} (t = ${(first / hz).toFixed(4)} s)`);
console.log("divergence growth (tick: max body position difference, m): " + growth.filter((_, k) => k % 4 === 0).map(([i, d]) => `${i}: ${d.toExponential(1)}`).join(" · "));
const S = (g) => ({ posture: g.outcome && g.outcome.posture, settle: g.joints && g.joints.hardExcRestDeg, who: g.joints && g.joints.hardExcRestWho, engine: g.engine && g.engine.ticks, engAxes: g.engine && g.engine.axes });
console.log("historical:", JSON.stringify(S(A.g)), "\nglobal    :", JSON.stringify(S(B.g)));
