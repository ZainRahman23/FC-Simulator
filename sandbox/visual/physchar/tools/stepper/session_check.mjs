// ═══ physchar/tools/stepper/session_check.mjs — VALIDATION of the snapshot session (must pass before any use) ═══════════════════════════════
// 1. a straight SimSession run equals runG2a (state hash over the same ticks);
// 2. branching: snapshot at step K−1's touchdown; branch A (command a for step K) → run to step K+1's start; restore; branch B (command b);
//    restore; branch A again — A, B, A' compared bit for bit with from-scratch replays of the same commanded sequences (runG2a + stopWhen).
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../../pc_body.js";
import { loadJolt } from "../../pc_jolt.js";
import { buildPoses } from "../../pc_control.js";
import { initOfLoco } from "../../pc_ref.js";
import { runG2a, TESTS_G2 } from "../../pc_gateg2.js";
import { SimSession, findClosures } from "./session.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), MODELS = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `mU1_tau${t}.json`), "utf8"))]));
const CTRL = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false };
const mk = (first, at, n, fixed) => { const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, ...CTRL, models: MODELS, ...(fixed && Object.keys(fixed).length ? { identFixed: true } : {}) };
  return { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, char: { ...(base.char || {}), ...(fixed || {}) }, ctrl } }; };
const sig = (o) => JSON.stringify([o.com, o.vcom, o.xi, ...o.states.map(s => [s.pos, s.rot, s.v, s.w])]);
const report = { checks: [] }, ok = (name, pass, detail) => { report.checks.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };
// ── 1. straight run equals runG2a ──
{ const secs = 9.0, ro = mk("L", 0.6, 16, null); const r = runG2a(J, spec, "G2W_A8", { poses, seconds: secs, rhythmOver: ro });
  const S = new SimSession(J, spec, "G2W_A8", { poses, seconds: secs, rhythmOver: ro }); for (let i = 0; i < S.maxSteps; i++) S.tick();
  ok("straight session run == runG2a (9 s, L@0.6)", S.hash === r.hash, `${S.hash} vs ${r.hash}`); console.log("closures in the controller / sensor graph:", findClosures(S.st, S.shared).join(", ")); S.destroy(); }
// ── 2. branching ──
for (const [K, first, at] of [[6, "R", 0.5], [12, "R", 0.5], [9, "L", 0.55]]) { const O = JSON.parse(fs.readFileSync(path.join(ROOT, "review_artifacts/physical_character_v1/g2_stepper/json/oracle_legacy1.json"), "utf8")).results.find(r => r.start === first + "@" + at);
  const prefix = Object.fromEntries(Object.entries(O.fixed).filter(([k]) => +k < K)), a = O.fixed[K], b = { df: a.df + 0.06, dl: a.dl - 0.03, T: Math.min(0.54, a.T + 0.06) }, n = K + 4;
  // from-scratch references: the walk with prefix + {K: a} / {K: b}, to step K+1's start
  const refRun = (cmd) => { let stop = null, z = null, LOCO = null; runG2a(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.62, rhythmOver: mk(first, at, n, { ...prefix, [K]: cmd }), onLoco: (l) => { LOCO = l; const ctl = l.control.bind(l), ring = [];
      l.control = (truth, x) => { ring.push(truth); if (ring.length > 40) ring.shift(); const out = ctl(truth, x), R = l.planner.exec.R; if (!stop && R && R.kind === "rhythmic" && R.stepIndex === K + 1) { z = ring.find(q => Math.abs(q.t - R.tSw0) < 1e-6); stop = true; } return out; }; }, stopWhen: () => !!stop });
    return z ? sig(z) : null; };
  const zA = refRun(a), zB = refRun(b);
  // the session: run the prefix (with a placeholder for K) to step K−1's touchdown, snapshot, then branch
  const S = new SimSession(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.62, rhythmOver: mk(first, at, n, { ...prefix, [K]: a }) });
  const P = () => S.loco.planner, doneK1 = () => P().exec.done.find(d => d.kind === "rhythmic" && d.stepIndex === K - 1 && d.td);
  while (!doneK1() && S.st.n < S.maxSteps) S.tick(); const snap = S.snapshot(); ok(`K=${K} ${first}@${at}: reached step K−1's touchdown`, !!doneK1(), `t = ${S.t.toFixed(3)}`);
  const branch = (cmd) => { S.restore(snap); P().rhythm.walk.char[K] = { ...cmd }; let z = null; const ring = [];
    while (S.st.n < S.maxSteps) { ring.push(S.st.obs); if (ring.length > 40) ring.shift(); S.tick(); const R = P().exec.R; if (R && R.kind === "rhythmic" && R.stepIndex === K + 1) { z = [...ring, S.st.obs].find(q => Math.abs(q.t - R.tSw0) < 1e-6); break; } }
    return z ? sig(z) : null; };
  const sA = branch(a), sB = branch(b), sA2 = branch(a);
  ok(`K=${K}: branch A == from-scratch replay A`, !!sA && sA === zA, sA && zA ? "" : "missing"); ok(`K=${K}: branch B == from-scratch replay B`, !!sB && sB === zB, ""); ok(`K=${K}: branch A after B == branch A (no leakage)`, !!sA && sA2 === sA, ""); ok(`K=${K}: A and B differ (the branch is real)`, sA !== sB, "");
  S.free(snap); S.destroy(); }
fs.writeFileSync(path.join(ROOT, "review_artifacts/physical_character_v1/g2_stepper/json/session_check.json"), JSON.stringify(report, null, 1));
