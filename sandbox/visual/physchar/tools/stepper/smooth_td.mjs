// ═══ physchar/tools/stepper/smooth_td.mjs — WHERE is the step-to-step response non-smooth? touchdown vs the next step start ══════════════
// At decision states along the controller's own walk (starts given), every candidate command of a grid around the controller's decision is
// executed from the same exact snapshot; the state is recorded (a) at the step's TOUCHDOWN (the physical contact event: COM / capture point
// relative to the landed foot, heading frame) and (b) at the NEXT STEP START (after the event-terminated double support). Per state, a quadratic
// in the command is fitted to each and the residual compared: the residual is what no smooth function of the command can represent.
// usage: node tools/stepper/smooth_td.mjs --starts R@0.5,L@0.6 --ks 4-12 --out f.json
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const { buildBodySpec, WORKING_CALIB } = await import("../../pc_body.js"); const { loadJolt } = await import("../../pc_jolt.js"); const { buildPoses } = await import("../../pc_control.js");
const { initOfLoco } = await import("../../pc_ref.js"); const { TESTS_G2 } = await import("../../pc_gateg2.js"); const { SimSession } = await import("./session.mjs"); const { stepFeatures } = await import("../../pc_stepfeat.js");
const { ridge } = await import("./surrogate.mjs");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Ly = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[Ly[k].elementType](ab, Ly[k].byteOffset, Ly[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), MODELS = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `mU1_tau${t}.json`), "utf8"))]));
const [k0, k1] = arg("--ks", "4-12").split("-").map(Number), out = [];
for (const start of arg("--starts", "R@0.5,L@0.6").split(",")) {
  const [first, atS] = start.split("@"), n = k1 + 12, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, models: MODELS, identFixed: true };
  const S = new SimSession(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.62, rhythmOver: { steps, at: +atS, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, char: { ...(base.char || {}) }, ctrl } } });
  const P = () => S.loco.planner, fell = () => S.st.obs.com[1] < 0.75, h0 = () => P().rhythm.wk.h0;
  const tdState = (d) => { const o = S.st.obs, hd = [Math.sin(h0()), Math.cos(h0())], rt = [hd[1], -hd[0]], sd = d.sw === "R" ? 1 : -1, c = d.td.center, rel = (p) => [(p[0] - c[0]) * hd[0] + (p[1] - c[1]) * hd[1], ((p[0] - c[0]) * rt[0] + (p[1] - c[1]) * rt[1]) * sd];
    return { t: o.t, xi: rel(o.xi), com: rel([o.com[0], o.com[2]]), v: [o.vcom[0] * hd[0] + o.vcom[2] * hd[1], (o.vcom[0] * rt[0] + o.vcom[2] * rt[1]) * sd] }; };
  // run on (no command) to step k's start (with a snapshot at k−1's touchdown on the way); the controller's own decision there
  const toStart = (k, snapTd) => { const ring = []; let snap = null;
    while (S.st.n < S.maxSteps) { if (snapTd != null && !snap && P().exec.done.find(e => e.kind === "rhythmic" && e.stepIndex === snapTd && e.td)) snap = S.snapshot();
      ring.push(S.st.obs); if (ring.length > 40) ring.shift(); S.tick(); if (fell()) return { fell: true, snap };
      const R = P().exec.R; if (R && R.kind === "rhythmic" && R.stepIndex === k) { const o = [...ring, S.st.obs].find(q => Math.abs(q.t - R.tSw0) < 1e-6), prev = P().exec.done.filter(e => e.kind === "rhythmic" && e.td).pop();
        const z = stepFeatures(spec, o, { sw: R.sw, pSt: R.pSt, h0: h0(), tSw0: R.tSw0, prevTd: prev ? prev.td.t : null }), lg = (P().rhythm.walkerLog || []).find(e => e.i === k); return { z, uc: lg ? lg.u.slice(0, 3) : null, snap }; } }
    return { ended: true, snap }; };
  let cur = toStart(k0, k0 - 1);
  for (let k = k0; k <= k1 && cur && cur.snap && cur.uc; k++) { const Sk = cur.snap, uc = cur.uc, rows = [];
    for (const d of [-0.12, -0.06, 0, 0.06, 0.12]) for (const t of [-0.06, 0, 0.06]) { const u = [uc[0] + d, uc[1], Math.max(0.30, Math.min(0.54, uc[2] + t))];
      S.restore(Sk); P().rhythm.walk.char[k] = { df: u[0], dl: u[1], T: u[2] }; let td = null, z1 = null, f = false;
      while (S.st.n < S.maxSteps) { S.tick(); if (fell()) { f = true; break; } const dk = P().exec.done.find(e => e.kind === "rhythmic" && e.stepIndex === k && e.td); if (dk && !td) td = { ...tdState(dk), dt: dk.td.t - cur.z.t };
        const R = P().exec.R; if (td && R && R.kind === "rhythmic" && R.stepIndex === k + 1) { z1 = { xi: [S.st.obs.xi[0], 0], t: S.st.obs.t }; break; } }
      // the next-start record from the same frame convention as the oracle (stepFeatures at the executor's tSw0 view)
      if (!f && z1) { const R = P().exec.R, o = S.st.loco.buf.find(q => Math.abs(q.t - R.tSw0) < 1e-6) || S.st.obs, prev = P().exec.done.filter(e => e.kind === "rhythmic" && e.td).pop();
        const zz = stepFeatures(spec, o, { sw: R.sw, pSt: R.pSt, h0: h0(), tSw0: R.tSw0, prevTd: prev ? prev.td.t : null }); rows.push({ u, td, z1: { xi: zz.xi, v: zz.v, dur: zz.t - cur.z.t } }); }
      else rows.push({ u, fell: f }); }
    out.push({ start, k, z: cur.z, uc, rows });
    // continue along the controller's own path: commit its own decision
    S.restore(Sk); P().rhythm.walk.char[k] = { df: uc[0], dl: uc[1], T: uc[2] }; const nx = toStart(k + 1, k); S.free(Sk); cur = nx;
    console.log(`${start} k ${k}: ${rows.filter(r => !r.fell).length}/${rows.length} candidates upright`); }
  S.destroy(); }
// per-state quadratic residuals
const Xq = (u) => [1, u[0], u[1], u[2], u[0] * u[0], u[2] * u[2], u[0] * u[2], u[1] * u[0]], res = {}, spr = {};
for (const d of out) { const ok = d.rows.filter(r => !r.fell && r.td && r.z1 && Math.abs(r.z1.xi[0]) < 0.3); if (ok.length < 12) continue;
  for (const [nm, f] of [["touchdown ξ_f (re the landed foot)", r => r.td.xi[0]], ["touchdown v_f", r => r.td.v[0]], ["touchdown time (from the step start)", r => r.td.dt], ["next-start ξ_f", r => r.z1.xi[0]], ["next-start v_f", r => r.z1.v[0]], ["next-start time (step duration)", r => r.z1.dur]]) {
    const y = ok.map(f), W = ridge(ok.map(r => Xq(r.u)), y.map(v => [v]), 1e-6), e = ok.map((r, i) => Xq(r.u).reduce((a, x, j) => a + x * W[j][0], 0) - y[i]), m = y.reduce((a, b) => a + b, 0) / y.length;
    (res[nm] = res[nm] || []).push(...e); (spr[nm] = spr[nm] || []).push(Math.sqrt(y.reduce((a, b) => a + (b - m) ** 2, 0) / y.length)); } }
const rms = (a) => Math.sqrt(a.reduce((x, y) => x + y * y, 0) / a.length), mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, summ = {};
for (const nm of Object.keys(res)) { summ[nm] = { spread: mean(spr[nm]), residual: rms(res[nm]), n: res[nm].length }; console.log(`${nm.padEnd(38)} true spread across candidates ${(100 * mean(spr[nm])).toFixed(2)} · per-state quadratic residual ${(100 * rms(res[nm])).toFixed(2)} (cm | cm/s | cs)`); }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ summary: summ, decisions: out }));
