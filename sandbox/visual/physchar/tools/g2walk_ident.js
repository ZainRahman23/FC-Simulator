// ═══ physchar/tools/g2walk_ident.js — G2b WALKER: identification data for Controller A's measured, timing-conditioned step map ════════════
// Open-loop commanded footsteps (rhythm.walk.char) on the walker's inner loop, from a SEEDED random design (deterministic): each run takes a
// first step from standing and then 4 random steps (forward foothold, width, single-support duration), with a small push / yaw couple at the
// start of step 2 in a third of the runs. Recorded per step: the state at the step's DECISION instant (the planner's view at the step start —
// what a controller deciding that step can know), the commanded and achieved foothold and timing, the double support, the fall time.
// Measurement only. usage: node tools/g2walk_ident.js [--n 400] [--seed 1] [--inner v2] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
import { runChar } from "../pc_g2char.js";
import { dumpFrames } from "./fg_frames.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const diagFoot = arg("--diagFoot", null) ? JSON.parse(arg("--diagFoot")) : null;   // (DIAGNOSTIC ONLY: { diagFootWidth, diagFootToe })
const footModel = arg("--foot", "F0");   // (FOOT-ARCHITECTURE GATE)
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(diagFoot || {}), ...(footModel !== "F0" ? { footModel } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
// the walker's inner loops (the natural one of the characterisation + the G2b walker's double-support fixes)
export const INNER = { natural: { kXiAlong: -1, kXiAcross: -1, kXiDS: -1 }, v2: { kXiAlong: -1, kXiAcross: -1, kXiDS: -1, dsLead: true, dsFlat: false },
  // (v3: + the double support TRACKS the sideways capture point to the measured nominal offset — the CoP between the feet, ramping onto the new
  //  stance foot by the end, re-solved every tick; never extends the double support)
  v3: { kXiAlong: -1, kXiAcross: -1, dsLead: true, dsFlat: false, latDS: "track", latExt: 0, dsLatTarget: 0.07 },
  // (v4: v3 + the C8 safety — the double support ends early at 96 % trailing-leg extension — and the swing clearance from the ACTUAL foot pitch)
  v4: { kXiAlong: -1, kXiAcross: -1, dsLead: true, dsFlat: false, latDS: "track", latExt: 0, dsLatTarget: 0.07, dsExtEnd: 0.96 } };
  // (v5: v2 + the C8 safety (early end at 96 % trailing-leg extension) + swing clearance from the actual pitch through mid-swing only, faded
  //  before the landing approach + the late-change blend; no double-support tracking)
INNER.v5 = { kXiAlong: -1, kXiAcross: -1, kXiDS: -1, dsLead: true, dsFlat: false, dsExtEnd: 0.96 };
// (v6: v5 + the double support TRACKS the sideways capture point to the measured nominal inward offset (CoP between the feet, ramping onto the
//  new stance foot by the end), never extending the double support)
INNER.v6 = { kXiAlong: -1, kXiAcross: -1, dsLead: true, dsFlat: false, dsExtEnd: 0.96, latDS: "track", latExt: 0, dsLatTarget: 0.07 };
// (v7: v5 + the walking double support keeps the stance legs within 96 % of full extension — the trailing knee keeps some flexion for toe-off)
INNER.v7 = { kXiAlong: -1, kXiAcross: -1, kXiDS: -1, dsLead: true, dsFlat: false, dsExtEnd: 0.96, reachExt: 0.96 };
// (v8: v7 + a higher early swing lift — the swing path's lift bump 0.20 m instead of 0.09: the rigid boot's tip is the last point to leave the
//  turf and scuffed in early swing; identification: swing failures 43 % → 14 %)
INNER.v8 = INNER.v7;
export const HUMAN = { v8: { clrActual: true, clrActualUntil: [0.5, 0.2], lateBlend: true, swingLiftH: 0.20 }, v7: { clrActual: true, clrActualUntil: [0.5, 0.2], lateBlend: true }, v4: { clrActual: true }, v5: { clrActual: true, clrActualUntil: [0.5, 0.2], lateBlend: true }, v6: { clrActual: true, clrActualUntil: [0.5, 0.2], lateBlend: true } };
const humanX = { ...(HUMAN[arg("--inner", "v2")] || {}), ...JSON.parse(arg("--human", "{}")) }, walkX = JSON.parse(arg("--walk", "{}")), N = +arg("--n", 400), seed = +arg("--seed", 1), inner = arg("--inner", "v2"), outP = arg("--out", null), speed = +arg("--speed", 0.6);
let s0 = seed >>> 0; const rnd = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const U = (a, b) => +(a + (b - a) * rnd()).toFixed(4);
// (--mode cl: CLOSED-LOOP identification — Controller A, deciding at the step start only (no in-swing re-decision, so each executed step
//  is the commanded one), with a seeded dither on its decisions; the data then lie where the controller operates. --models <prefix> loads
//  the current maps <prefix><τ>.json; --steps n per run; --rho)
const mode = arg("--mode", "ol"), nSteps = +arg("--steps", mode === "cl" ? 12 : 5), JD = path.resolve(here, "../../../../review_artifacts/physical_character_v1/g2_walker/json");
const loadModels = (pre) => { const m = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) { const f = path.join(JD, `${pre}${t}.json`); if (fs.existsSync(f)) m[t] = JSON.parse(fs.readFileSync(f, "utf8")); } return m; };
const models = mode === "cl" ? loadModels(arg("--models", "model0_tau")) : null, sd = (arg("--dither", "0.03,0.03,0.02") + "").split(",").map(Number);
const runs = [], t0 = Date.now();
const ONLY = arg("--only", null) ? new Set((arg("--only") + "").split(",").map(Number)) : arg("--range", null) ? new Set((() => { const [a, b] = (arg("--range") + "").split(",").map(Number); return Array.from({ length: b - a }, (_, k) => a + k); })()) : null;
// (G2b speed work, --ctrlX '{...}': Controller A option overrides during identification — e.g. the stance-ankle term — so the maps are
//  identified with the same inner loop the walker will run)
const CTRLX = arg("--ctrlX", null) ? JSON.parse(arg("--ctrlX")) : {};
for (let i = 0; i < N; i++) { const steps = { 0: arg("--slow") ? { df: U(0.22, 0.26), dl: U(0.33, 0.37), T: U(0.42, 0.47) } : { df: U(0.21, 0.27), dl: U(0.33, 0.38), T: U(0.40, 0.48) } }; let push = null, walkOver = { ...INNER[inner], ...walkX };
  if (mode === "cl") { walkOver = { ...INNER[inner], ...walkX, ctrl: { kind: "A", models, nom: arg("--slow") ? [U(0.18, 0.28), U(0.20, 0.28), U(0.36, 0.44)] : [U(0.28, 0.40), U(0.20, 0.28), U(0.38, 0.46)], rho: +arg("--rho", 0.5), sig: [0.05, 0.05, 0.03], lo: [0.10, +arg("--wMin", 0.17), 0.36], hi: arg("--slow") ? [0.32, 0.40, 0.48] : [0.50, 0.34, 0.50], inSwing: arg("--inSwing") ? +arg("--inSwing") : 0, commitMargin: 0.12, adapt: arg("--inSwing") ? { gain: 0.3, max: 0.06 } : undefined, ...(arg("--inSwing") ? { ytDither: { seed: seed * 100003 + i, sd: [0.03, 0.03] } } : { dither: { seed: seed * 100003 + i, sd } }), ...CTRLX } };
    push = rnd() < 0.25 ? { step: 3 + Math.floor(rnd() * 3), u: 0, J: [U(-6, 6), U(-4, 4)], Lz: U(-1.5, 1.5) } : null; }
  else { for (let k = 1; k <= 4; k++) steps[k] = { df: U(0.24, 0.46), dl: U(0.17, 0.34), T: U(0.34, 0.50) };
    push = rnd() < 0.33 ? { step: 2, u: 0, J: [U(-8, 8), U(-6, 6)], Lz: U(-2, 2) } : null; }
  // (FOOT GATE: --only i,j replays just those runs — every run's random draws above are still made, so run i is bit-identical to its place in
  //  the full identification; --frames dir records it for the review page)
  if (ONLY && !ONLY.has(i)) continue;
  const onRun = arg("--frames", null) ? (r, LOCO) => { const fr = dumpFrames(path.join(arg("--frames"), `${arg("--tag", "ident")}_${footModel}_i${i}.js`), spec, r.recs, LOCO.planner, { scenario: arg("--tag", "ident"), foot: footModel, seed, run: i, models: arg("--models", null), hash: r.hash }, { t1: ((r.recs.find(q => q.com[1] < 0.75) || { t: Infinity }).t) + 1.0 }); console.log("frames", i, fr.frames); } : undefined;
  let LOG = null; const res = runChar(J, spec, poses, { speed, n: nSteps, walkOver, humanOver: humanX, rhythmX: JSON.parse(arg("--rhythm", "{}")), steps: mode === "cl" ? { 0: steps[0] } : steps, push, seconds: 1.6 + nSteps * 0.6, onLog: (l) => { LOG = l; }, onRun });
  const wl = res.walkerLog || [];
  const finalU = (e) => { const a = e.adj && e.adj.length ? e.adj[e.adj.length - 1] : null; return a ? { df: a.df, dl: a.dl, T: e.u[2] } : { df: e.u[0], dl: e.u[1], T: e.u[2] }; };
  runs.push({ i, steps: mode === "cl" ? Object.fromEntries([[0, steps[0]], ...wl.map(e => [e.i, finalU(e)])]) : steps, push, tFall: res.tFall, hash: res.hash, nom: walkOver.ctrl ? walkOver.ctrl.nom : null,
    rows: res.steps.map(e => ({ k: e.k, sw: e.sw, tStart: e.tStart, lift: e.lift, td: e.td, T: e.T, upright: e.upright, atStart: e.atStart || null, atDec: e.atDec || null, atLift: e.atLift || null, atTd: e.atTd || null, foothold: e.foothold || null, ds: e.ds, clearance: e.clearance ?? null, kneeTd: e.kneeTd ?? null, pelvisYawPeak: e.pelvisYawPeak ?? null, sat: e.sat ?? null })) });
  if ((i + 1) % 25 === 0) console.log(`run ${i + 1}/${N} · ${((Date.now() - t0) / 1000).toFixed(0)} s · steps upright so far ${runs.reduce((a, r) => a + r.rows.filter(q => q.upright && q.td != null).length, 0)}`); }
const out = { generated: "tools/g2walk_ident.js", ctrlX: CTRLX, range: arg("--range", null), mode, calib: WORKING_CALIB, inner, innerGains: INNER[inner], seed, speed, dither: mode === "cl" ? sd : null, human: humanX, walk: walkX, diagFoot, footModel, models: mode === "cl" ? arg("--models", "model0_tau") : null, runs };
if (outP) { fs.mkdirSync(path.dirname(outP), { recursive: true }); fs.writeFileSync(outP, JSON.stringify(out)); console.log("wrote", outP); }
