// ═══ physchar2/tools/preswing_lab.mjs — DIAGNOSTIC pre-swing / resting-foot laboratory (preswing/; not a gate). One Jolt instance, a fresh simulation per run
// (gates/v2_unload.js incl. its optional bump / lift / push / turn protocol). Read-only measurement. Per run, for the released foot n after release:
//   contact-point SLIP (horizontal speed of the foot's material point at the measured CoP, integrated while touching with Fz ≥ 0.2 N) — separated from
//   ROTATION about the contact (tilt max, yaw change max) and from the origin displacement; friction utilisation |F_t| / F_n (Fz ≥ 0.5 N: max, p95);
//   resting load; contact losses before any lift; released-leg twist (knee axial / hip rotation change) and the applied hip-rotation torque;
//   lift: liftoff delay, hover error (max / RMS), clearance (min / mean), touchdown error vs the anchor, touchdown impact peak, bounce, LOAD_ACCEPT, final;
//   torque continuity (applied Δτ; Δτ at the lift command ± 0.1 s), energy-ledger closure, authority writes, external impulse vs the scheduled push.
// usage: node tools/preswing_lab.mjs --manifest=<json {runs:[{id, body, foot, drop, r, ramp, flags, end, push?, bump?, lift?, turn?}]}> --outdir=<dir> [--from] [--to]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), OUTD = arg("outdir", "."), FROM = +arg("from", 0), TO = +arg("to", 1e9); fs.mkdirSync(OUTD, { recursive: true });
const D = 180 / Math.PI, specs = {}, yawOf = (q) => { const v = Q.rot(q, [0, 0, 1]); return Math.atan2(v[0], v[2]) * D; }, tiltOf = (q) => Math.acos(Math.min(1, Q.rot(q, [0, 1, 0])[1])) * D;
const q95 = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(0.95 * (s.length - 1))]; }, mx = (a) => (a.length ? Math.max(...a) : null), mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
for (const run of M.runs.slice(FROM, Math.min(TO, M.runs.length))) { const outF = path.join(OUTD, run.id + ".json"); if (fs.existsSync(outF)) continue;
  const spec = specs[run.body] || (specs[run.body] = unloadSpec(run.body)), { s, nL, nS, H } = unloadSim(J, spec, run), C = s.ctrl, W = C.M * 9.81, f = C.feet[nL], B = spec.bodies;
  const pts = B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), clear = (st) => Math.min(...pts.map(p => V.add(st[f].pos, Q.rot(st[f].rot, p))[1])) * 1000;
  const JI = (n) => spec.joints.findIndex(j => j.name === n), sd = nL === 0 ? "L" : "R", KN = JI("knee_" + sd), HP = JI("hip_" + sd), anat = (k, key) => s.P.anat(s.P.jd[k], s.P.qcs(s.P.jd[k], s.st.map(b => b.rot)), key);
  let prevSt = null, tRel = null, ref = null, slip = 0, rot = { tilt: 0, yaw: 0, origin: 0, knee: 0, hip: 0 }, util = [], loads = [], prevTau = null, dTau = 0, dTauCmd = 0, prevE = null, prevW = null, closMax = -Infinity, closPos = 0, hipTauMax = 0, fzMax = 0;
  const trans = [[], []], hov = [], lift = { liftoff: null, tdErr: null, tdPeak: 0 };
  while (s.tick()) { const t = s.n * s.dt, st = s.st, lc = C.lc.feet, pr = s.probeRows[nL], sts = lc.map(x => x.state);
    if (prevSt) for (const n of [0, 1]) if (sts[n] !== prevSt[n]) { trans[n].push({ t, from: prevSt[n], to: sts[n] }); if (n === nL && tRel == null && prevSt[n] === "SUPPORT") tRel = t; } prevSt = sts;
    const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; let dT = 0; if (prevTau) for (const k in tau) dT = Math.max(dT, Math.abs(tau[k] - (prevTau[k] ?? tau[k]))); prevTau = tau;
    if (t >= 0.5) dTau = Math.max(dTau, dT); if (H.tL != null && Math.abs(t - H.tL) <= 0.1 + 1e-9) dTauCmd = Math.max(dTauCmd, dT);
    const L = s.ledger, E = s.last.E, Wt = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (Wt - prevW); prevE = E; prevW = Wt; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
    if (tRel != null) { if (!ref) ref = { p: st[f].pos.slice(), yaw: yawOf(st[f].rot), knee: anat(KN, "rot"), hip: anat(HP, "rot") };
      const pre = H.tL == null, Fz = pr ? pr.JyN : 0, touch = pr ? pr.pieces.filter(p => p.touch).length : 0;
      if (pre) { rot.tilt = Math.max(rot.tilt, tiltOf(st[f].rot)); rot.yaw = Math.max(rot.yaw, Math.abs(yawOf(st[f].rot) - ref.yaw)); rot.origin = Math.max(rot.origin, Math.hypot(st[f].pos[0] - ref.p[0], st[f].pos[2] - ref.p[2]) * 1000);
        rot.knee = Math.max(rot.knee, Math.abs(anat(KN, "rot") - ref.knee)); rot.hip = Math.max(rot.hip, Math.abs(anat(HP, "rot") - ref.hip));
        for (const i of [0, 1, 2]) if (tau[HP * 3 + i] != null && s.P.jd[HP].axes[i] && s.P.jd[HP].axes[i].key === "rot") hipTauMax = Math.max(hipTauMax, Math.abs(tau[HP * 3 + i]));
        if (touch && Fz >= 0.2 && pr.cop) { const vp = V.add(st[f].v, V.cross(st[f].w, V.sub(pr.cop, st[f].com))); slip += Math.hypot(vp[0], vp[2]) * s.dt * 1000; }
        if (touch && Fz >= 0.5) util.push(Math.hypot(pr.Jc[0], pr.Jc[2]) / pr.Jc[1]); if (t > tRel + 0.5) loads.push(Fz); if (t > tRel + 0.15) fzMax = Math.max(fzMax, Fz); }
      if (H.tL != null) { const sw = lc[nL].swing; if (lift.liftoff == null && sts[nL] === "AIRBORNE") lift.liftoff = t - H.tL;
        if (t >= H.tL + (run.lift.T || 0.4) && t < H.tL + (run.lift.T || 0.4) + run.lift.hover && sw) hov.push({ err: V.len(V.sub(st[f].pos, sw.pos)) * 1000, clr: clear(st) });
        if (sts[nL] === "TOUCHDOWN" && lift.tdErr == null && trans[nL].length && trans[nL][trans[nL].length - 1].to === "TOUCHDOWN") lift.tdErr = Math.hypot(st[f].pos[0] - H.anchor.pos[0], st[f].pos[2] - H.anchor.pos[2]) * 1000;
        if (lift.tdErr != null && H.cleared == null) lift.tdPeak = Math.max(lift.tdPeak, Fz); } } }
  const T = trans[nL], chat = (TT) => { let c = 0; for (let i = 2; i < TT.length; i++) if (TT[i].to === TT[i - 2].to && TT[i].t - TT[i - 2].t < 0.06) c++; return c; }, preEnd = H.tL ?? run.end;
  const g = s.g3summary(), sched = run.push ? run.push.J : 0, Jx = Math.hypot(...s.ledger.Jext);
  const out = { id: run.id, run, outcome: g.outcome, W, tRel, released: tRel != null, trans: T.map(x => `${x.t.toFixed(4)} ${x.from}→${x.to}`),
    preContactLoss: tRel != null ? T.filter(x => x.t > tRel && x.t < preEnd && (x.to === "LIFTOFF" || x.to === "AIRBORNE")).length : null, chatter: chat(trans[0]) + chat(trans[1]),
    slipMm: slip, tiltMaxDeg: rot.tilt, yawMaxDeg: rot.yaw, originMaxMm: rot.origin, kneeRotMaxDeg: rot.knee, hipRotMaxDeg: rot.hip, hipRotTauMax: hipTauMax,
    utilMax: mx(util), utilP95: q95(util), restLoadMean: mean(loads), restLoadMaxN: fzMax, restLoadMin: loads.length ? Math.min(...loads) : null,
    lift: run.lift ? { tL: H.tL, liftoff: lift.liftoff, airborne: H.tL != null ? T.filter(x => x.t >= H.tL && x.to === "AIRBORNE").length : null, touchdown: H.tL != null ? T.filter(x => x.t >= H.tL && x.to === "TOUCHDOWN").length : null,
      bounce: T.filter(x => x.from === "TOUCHDOWN" && x.to === "AIRBORNE").length, loadAccept: H.tL != null ? T.filter(x => x.t >= H.tL && x.to === "LOAD_ACCEPT").length : null, final: prevSt[nL],
      hoverErrMax: mx(hov.map(x => x.err)), hoverErrRms: hov.length ? Math.sqrt(mean(hov.map(x => x.err * x.err))) : null, clearMin: mx(hov.map(x => -x.clr)) == null ? null : -mx(hov.map(x => -x.clr)), clearMean: mean(hov.map(x => x.clr)),
      tdErrMm: lift.tdErr, tdPeakN: lift.tdPeak, dTauCmd } : null,
    dTauMax: dTau, closMax, closPos, authorityWrites: s.ledger.authorityWrites, extImpulse: Jx, extOk: Math.abs(Jx - sched) <= 1e-9 * Math.max(1, sched), hashEnd: (s.h >>> 0).toString(16).padStart(8, "0") };
  s.destroy(); fs.writeFileSync(outF, JSON.stringify(out));
  console.log(`${run.id}: ${g.outcome}; rel ${tRel?.toFixed(2)}; pre-loss ${out.preContactLoss}; slip ${slip.toFixed(3)} mm; tilt ${rot.tilt.toFixed(2)}° yaw ${rot.yaw.toFixed(2)}°; util p95 ${out.utilP95?.toFixed(2)}; rest ${out.restLoadMean?.toFixed(2)} N${out.lift ? `; lift: off ${out.lift.liftoff?.toFixed(2)} s, err ${out.lift.hoverErrMax?.toFixed(2)} mm, clr ${out.lift.clearMin?.toFixed(2)}, a/td/b ${out.lift.airborne}/${out.lift.touchdown}/${out.lift.bounce}, ${out.lift.final}` : ""}`); }
