// ═══ physchar/tools/g2walk_diag.js — G2b WALKER DIAGNOSTICS: step-by-step accounting of the forward-speed loop (measurement only) ═══════════
// For every rhythmic step of a walking run (pc_gateg2 test key, deterministic starts) it records, separately:
//   DECISION   — the state the controller acted on (the feedback view's capture point relative to the stance foot, forward / inward), its
//                periodic target x*, the step-start decision u = [df, dl, T] and which bounds clamped it, every in-swing re-decision;
//   TRUTH      — the true COM velocity / offset and capture point at the decision instant (measurement error = view − truth);
//   EXECUTION  — the final target, the achieved foothold (touchdown sole centre), liftoff delay, airborne time, touchdown fraction,
//                single support (liftoff → touchdown) and the following double support (touchdown → next liftoff);
//   DYNAMICS   — the forward COM velocity at liftoff / touchdown / next liftoff (Δv over single and double support), and the horizontal turf
//                impulse along the heading per foot and phase, split into braking (−) and propulsive (+) parts;
//   BODY       — trailing-leg extension at the step start, mean saturated actuator axes and the joints that saturate;
//   MODEL      — the next decision's measured state vs the maps' predictions: with the decided inputs, with the last in-swing decision, and
//                with the ACHIEVED inputs (foothold, single-support time) — prediction error = model error once execution is accounted for.
// usage: node tools/g2walk_diag.js [--test G2W_A8] [--foot F0] [--starts 6] [--n 30] [--out file.json] [--rows]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
import { runG2a, TESTS_G2 } from "../pc_gateg2.js";
import { predictA, modelAt } from "../pc_walker.js";
import { V, Q } from "../pc_math.js";
import { dumpFrames } from "./fg_frames.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const foot = arg("--foot", "F0"), key = arg("--test", "G2W_A8"), n = +arg("--n", 30), nStarts = +arg("--starts", 6), outP = arg("--out", null);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(foot !== "F0" ? { footModel: foot } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const bi = (nm) => spec.bodies.findIndex(b => b.name === nm), W = spec.totalMass * 9.81, legLen = 0.9243;
const STARTS = [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]].slice(0, nStarts);
export function diagRun(first, at, extra) {
  const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const t0 = Date.now();
  // (--open "df,dl,T": an OPEN-LOOP walk — every step after the first is the same commanded foothold and timing, the controller decides nothing:
  //  swing execution compared on identical requests)
  let WX0 = arg("--walk", null) ? JSON.parse(arg("--walk")) : null; if (arg("--open", null)) { const [df, dl, T] = (arg("--open") + "").split(",").map(Number), base = TESTS_G2[key].loco.rhythm.walk.char || {}; const ch = { 0: base[0] }; for (let i = 1; i < n; i++) ch[i] = { df, dl, T }; WX0 = { ...(WX0 || {}), char: ch }; }
  // (--ctrl '{...}': Controller A option overrides for this run — e.g. a different nominal step; merged into the test's walk.ctrl)
  if (arg("--ctrl", null) || arg("--models", null)) { const JD = path.resolve(here, "../../../../review_artifacts/physical_character_v1/g2_walker/json"), mx = arg("--models", null) ? { models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `${arg("--models")}${t}.json`), "utf8"))])) } : {};
    WX0 = { ...(WX0 || {}), ctrl: { ...TESTS_G2[key].loco.rhythm.walk.ctrl, ...mx, ...(arg("--ctrl", null) ? JSON.parse(arg("--ctrl")) : {}) } }; }
  if (arg("--first", null)) { const [df, dl, T] = (arg("--first") + "").split(",").map(Number); WX0 = { ...(WX0 || {}), char: { ...((WX0 && WX0.char) || TESTS_G2[key].loco.rhythm.walk.char || {}), 0: { df, dl, T } } }; }
  const WX = WX0, HX = arg("--human", null) ? JSON.parse(arg("--human")) : null;   // (diagnostic variants: merged into the test's walk / human-swing options)
  const r = runG2a(J, spec, key, { poses, keepStates: true, seconds: 1.6 + n * 0.58, rhythmOver: { steps, at, ...(WX ? { walk: WX } : {}) }, ...(HX ? { humanOver: HX } : {}), ...(arg("--loco", null) ? { locoOver: JSON.parse(arg("--loco")) } : {}), onLoco: (l) => { LOCO = l; }, ...(extra || {}) });
  if (arg("--frames", null) && (arg("--frameStart", null) == null || arg("--frameStart") === first + "@" + at)) { const fr = dumpFrames(path.join(arg("--frames"), `${arg("--tag", key)}_${first}${at}.js`), spec, r.recs, LOCO.planner, { scenario: arg("--tag", key), foot, test: key, start: first + "@" + at, hash: r.hash }, { t1: ((r.recs.find(q => q.com[1] < 0.75) || { t: Infinity }).t) + 1.0 }); console.log("frames", fr.frames); }
  const R_ = r.recs, fall = R_.find(q => q.com[1] < 0.75), tF = fall ? fall.t : Infinity, P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]];
  const at_ = (t) => { let lo = 0, hi = R_.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R_[m].t < t) lo = m; else hi = m; } return R_[hi]; };
  const fw = (v2) => v2[0] * hd[0] + v2[1] * hd[1], vF = (q) => q.vcom[0] * hd[0] + q.vcom[2] * hd[1];
  const C = TESTS_G2[key].loco.rhythm.walk.ctrl, D = P.exec.done.filter(d => d.kind === "rhythmic"), WL = P.rhythm.walkerLog || [];
  const imp = (s, a, b) => { let br = 0, pr = 0, vt = 0; for (const q of R_) { if (q.t <= a || q.t > b) continue; const f = q.feet[s], h = fw([f.shear[0], f.shear[2]]) / 240; if (h < 0) br += h; else pr += h; vt += (f.load || 0) / 240; } return { brake: br, prop: pr, net: br + pr, vert: vt }; };
  // plan tracking over a phase: the stance legs' velocity reference vs the body's velocity (forward, mean), the planned vs measured capture point
  // at the phase end, and the CoP demand vs the measured CoP (forward, mean)
  const track = (a, b) => { const W2 = R_.filter(q => q.t > a && q.t <= b && q.vRef); if (!W2.length) return null; const e = W2[W2.length - 1];
    const dv = W2.reduce((s2, q) => s2 + fw(q.vRef) - vF(q), 0) / W2.length, cop = W2.filter(q => q.ctl && q.ctl.pStar && q.copSmooth), dc = cop.length ? cop.reduce((s2, q) => s2 + fw([q.ctl.pStar[0] - q.copSmooth[0], q.ctl.pStar[1] - q.copSmooth[1]]), 0) / cop.length : null;
    return { dvRef: dv, xiErr: e.xiRefP ? fw([e.xi[0] - e.xiRefP[0], e.xi[1] - e.xiRefP[1]]) : null, copErr: dc, n: W2.length }; };
  const rows = D.map((d, j) => { const lg = WL.find(w => w.i === d.stepIndex), q0 = at_(d.tSw0), sd = d.sw === "R" ? 1 : -1, ps = d.pSt, st = d.sw === "R" ? "L" : "R", nx = D[j + 1];
    const rel = (p) => [fw([p[0] - ps[0], p[1] - ps[1]]), ((p[0] - ps[0]) * rt[0] + (p[1] - ps[1]) * rt[1]) * sd];
    const xiT = rel(q0.xi), comT = rel([q0.com[0], q0.com[2]]);
    const thigh = q0.states[bi("thigh_" + d.sw)].pos, an = q0.states[bi("foot_" + d.sw)].pos, trail = Math.hypot(thigh[0] - an[0], thigh[1] - an[1], thigh[2] - an[2]) / legLen;
    const lift = d.liftoff ? Math.min(d.liftoff.t, tF) : null, td = d.td && d.td.t < tF ? d.td.t : null, nLift = nx && nx.liftoff && nx.liftoff.t < tF ? nx.liftoff.t : null;
    const ach = td != null ? rel(d.td.center) : null, fin = d.proj && d.proj.target ? rel(d.proj.target) : null;
    const satW = R_.filter(q => q.t >= d.tSw0 && q.t <= (nLift ?? td ?? d.tSw0 + 0.5) && q.arb), satJ = {}; for (const q of satW) for (const e of q.arb) if (Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat) satJ[e.joint] = (satJ[e.joint] || 0) + 1;
    const out = { k: d.stepIndex, sw: d.sw, tDec: d.tSw0, status: d.status, upright: td != null,
      dec: lg ? { x: lg.x, u: lg.u, dz: lg.dz, xs: lg.info.xs, yt: lg.info.yt, pred: lg.info.pred, clamped: lg.info.clamped || [], adj: lg.adj.map(a => ({ tau: a.tau, x: a.x, df: a.df, dl: a.dl, pred: a.pred, clamped: a.clamped })), b: lg.info.b } : null,
      truth: { xi: xiT, com: comT, vF: vF(q0), vL: (q0.vcom[0] * rt[0] + q0.vcom[2] * rt[1]) * sd, h: q0.com[1] },
      exec: { final: fin, ach, err: ach && fin ? [ach[0] - fin[0], ach[1] - fin[1]] : null, liftDelay: lift != null ? lift - d.tSw0 : null, air: lift != null && td != null ? td - lift : null, Tplan: d.walkK ? d.walkK.Tss : null, Tss: lift != null && td != null ? td - lift : null, uAt: d.td ? d.td.uAt : null, ds: td != null && nLift != null ? nLift - td : null },
      dyn: { xiLift: lift != null ? rel(at_(lift).xi) : null, comLift: lift != null ? rel([at_(lift).com[0], at_(lift).com[2]]) : null, vLift: lift != null ? vF(at_(lift)) : null, vTd: td != null ? vF(at_(td)) : null, vNext: nLift != null ? vF(at_(nLift)) : null,
        ssTrack: lift != null && td != null ? track(lift, td) : null, dsTrack: td != null && nLift != null ? track(td, nLift) : null,
        ssSt: lift != null && td != null ? imp(st, lift, td) : null, dsLead: td != null && nLift != null ? imp(d.sw, td, nLift) : null, dsTrail: td != null && nLift != null ? imp(st, td, nLift) : null },
      // (reachability geometry, for the failure classifier: the swing hip at the decision and at touchdown, relative to the stance centre along
      //  the heading, its height, the COM velocity; the swing leg's extension at touchdown; the landed foot's ankle height)
      geo: (() => { const hipB = bi("thigh_" + d.sw), relF = (p3) => fw([p3[0] - ps[0], p3[2] - ps[1]]), qd = q0, qt = td != null ? at_(td) : null, fsw = bi("foot_" + d.sw);
        const hipD = qd.states[hipB].pos, hipT = qt ? qt.states[hipB].pos : null, ankT = qt ? qt.states[fsw].pos : null;
        return { hipDec: [relF(hipD), hipD[1]], hipTd: hipT ? [relF(hipT), hipT[1]] : null, leadExt: hipT ? Math.hypot(hipT[0] - ankT[0], hipT[1] - ankT[1], hipT[2] - ankT[2]) / legLen : null, ankTdY: ankT ? ankT[1] : null,
          tTdPlan: d.plannedTd ? d.plannedTd.t : null, comV: vF(qd) }; })(),
      body: { trail, sat: satW.reduce((a, q) => a + (q.satN || 0), 0) / Math.max(1, satW.length), satJ },
      swing: (() => { if (lift == null) return null; const fb = bi("foot_" + d.sw), sh = spec.bodies[fb].planBox || spec.bodies[fb].shapes[0], tE = td ?? lift + 0.4; let minClr = null, recon = 0, prevT = false;
        for (const q of R_) { if (q.t < lift || q.t > tE) continue; const S2 = q.states[fb], u2 = q.exec ? q.exec.u : null; if (q.t > lift + 0.05 && u2 != null && u2 <= 0.85) { const y = Math.min(...[-1, 1].map(sx => V.add(S2.pos, Q.rot(S2.rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] - sh.he[1], sh.pos[2] + sh.he[2]]))[1])); minClr = Math.min(minClr ?? 9, y); }
          const tc = q.feet[d.sw].touching; if (tc && !prevT && q.t < tE - 0.01 && q.t > lift + 0.01) recon++; prevT = tc; }
        const qt = td != null ? at_(td) : null, vf = qt ? qt.states[fb].v : null;
        // (touchdown: peak vertical load in the first 0.1 s (BW); stance slip = the landed foot's horizontal travel from 20 ms after touchdown to its next liftoff)
        const tdPeakBW = td != null ? R_.filter(q2 => q2.t >= td && q2.t <= td + 0.1).reduce((a2, q2) => Math.max(a2, q2.feet[d.sw].load || 0), 0) / W : null;
        const nL2 = nx && nx.liftoff ? D.find(e => e.stepIndex === d.stepIndex + 2) : null, tEndSt = nL2 && nL2.liftoff ? Math.min(nL2.liftoff.t, tF) : null;
        // (slip = the SENSOR's contact slip (its anchored contact's tangential travel while sliding), max over the stance — not the ankle's travel,
        //  which moves forward several cm as the foot rolls heel → toe)
        const stanceSlip = td != null && tEndSt != null ? (at_(tEndSt).feet[d.sw].slipDist || 0) - (at_(td).feet[d.sw].slipDist || 0) : null;   // (the sensor's slid distance is cumulative: its increment over this stance)
        return { tdPeakBW, stanceSlip, minClr, recon, vTdF: vf ? fw([vf[0], vf[2]]) - vF(qt) * 0 : null, vTdY: vf ? vf[1] : null, early: d.td ? d.td.uAt < 0.8 : null, sw2: d.sw2 ? d.sw2.info : null }; })() };
    return out; });
  // the model check: the next decision's measured state vs the τ=0 map's prediction with decided / achieved inputs
  for (let j = 0; j + 1 < rows.length; j++) { const a = rows[j], b = rows[j + 1]; if (!a.dec || !b.dec || !b.upright && !a.upright) continue; const M = modelAt(C, 0);
    a.model = { xNext: b.dec.x, predDec: a.dec.pred, predLast: a.dec.adj.length ? a.dec.adj[a.dec.adj.length - 1].pred : a.dec.pred,
      predAch: a.exec.ach && a.exec.Tplan ? predictA(M, a.dec.x, [a.exec.ach[0], a.exec.ach[1], a.exec.Tplan]) : null };
    for (const k of ["predDec", "predLast", "predAch"]) if (a.model[k]) a.model["e_" + k] = [b.dec.x[0] - a.model[k][0], b.dec.x[1] - a.model[k][1]]; }
  const up = rows.filter(q => q.upright).length;
  return { first, at, hash: r.hash, tFall: Number.isFinite(tF) ? tF : null, upright: up, cpu: (Date.now() - t0) / 1000, ctrl: { nom: C.nom, lo: C.lo, hi: C.hi, rho: C.rho, inSwing: C.inSwing }, rows };
}
const f2 = (v, d = 2) => v == null || !Number.isFinite(v) ? "  -  " : (v >= 0 ? " " : "") + v.toFixed(d);
if (process.argv[1] && process.argv[1].endsWith("g2walk_diag.js")) {
  const out = { generated: "tools/g2walk_diag.js", test: key, foot, n, runs: [] };
  for (const [first, at] of STARTS) { const e = diagRun(first, at); out.runs.push(e); console.log(`${key}${foot !== "F0" ? "/" + foot : ""} ${first}@${at}: upright ${e.upright} · hash ${e.hash} · cpu ${e.cpu.toFixed(1)} s`);
    if (arg("--rows")) { console.log("   k sw | x_f   x*_f  err  | vF(dec) com_f | u_df  fin_df ach_df clamp | T_pl  Tss  liftD  DS   uAt | vLift  vTd  vNext | SS brk  SS prp | DS lead DS trail | trail sat | e_dec e_ach");
      for (const q of e.rows) { const d = q.dec, x = q.exec, y = q.dyn, m = q.model || {};
        console.log(`  ${String(q.k).padStart(2)} ${q.sw}  |${f2(d && d.x[0])}${f2(d && d.xs[0])}${f2(d && d.x[0] - d.xs[0])} |${f2(q.truth.vF)}${f2(q.truth.com[0])} |${f2(d && d.u[0])}${f2(x.final && x.final[0])}${f2(x.ach && x.ach[0])} ${d && d.clamped.length ? d.clamped.join("") : "  "}${d && d.adj.some(a => a.clamped.length) ? "*" : " "} |${f2(x.Tplan)}${f2(x.Tss)}${f2(x.liftDelay)}${f2(x.ds)}${f2(x.uAt)} |${f2(y.vLift)}${f2(y.vTd)}${f2(y.vNext)} |${f2(y.ssSt && y.ssSt.brake, 1)}${f2(y.ssSt && y.ssSt.prop, 1)} |${f2(y.dsLead && y.dsLead.net, 1)}${f2(y.dsTrail && y.dsTrail.net, 1)} |${f2(q.body.trail, 3)}${f2(q.body.sat, 1)} |${f2(m.e_predDec && m.e_predDec[0])}${f2(m.e_predAch && m.e_predAch[0])}${q.upright ? "" : "  DOWN"}`); } } }
  if (outP) { fs.writeFileSync(outP, JSON.stringify(out)); console.log("wrote", outP); }
}
