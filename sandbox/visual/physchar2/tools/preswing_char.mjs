// ═══ physchar2/tools/preswing_char.mjs — runner of the PRE-SWING / CONTACT-BOUNDARY validation (preswing/PRESWING_VALIDATION_PREREG.md; manifest preswing/manifest.json).
// One Jolt instance, a fresh simulation per run (gates/v2_unload.js incl. its optional bump / lift / push / turn protocol). Read-only measurement (a wrapper reads
// the command rows after compute). Per run: lifecycle transitions of both feet; release of foot n; contact losses / LOAD_ACCEPT before any lift command; resting
// load (max after release + 0.15 s; mean over the last 2 s before the lift / end); CONTACT-POINT SLIP of foot n (horizontal speed of its material point at the measured
// CoP, integrated while touching with Fz ≥ 0.2 N) over [t_rel − 0.1, t_rel + 0.5] s, over the pre-lift window, and from a perturbation to the end; foot-n rotation
// (tilt max, yaw change); stance slip; lift: AIRBORNE / TOUCHDOWN / bounce / LOAD_ACCEPT counts, final state, hover error (max / RMS), hover clearance (min, fraction
// ≥ 0.6 h), dwell clearance, touchdown error and impact peak; chatter (a state re-entered within 60 ms, either foot); applied Δτ (t ≥ 0.5 s; contact-onset tick + next
// excepted) and commanded Δτ0; energy-ledger closure increments; actuator over-capacity; authority writes; external impulse vs the scheduled push; outcome; running
// state hash every 1 s and at the end.
// usage: node tools/preswing_char.mjs --manifest=<json> --outdir=<dir> [--from=0] [--to=N] [--ids=a,b]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), OUTD = arg("outdir", "."), IDS = arg("ids", "").split(",").filter(Boolean), FROM = +arg("from", 0), TO = +arg("to", 1e9); fs.mkdirSync(OUTD, { recursive: true });
let list = M.runs.filter(r => !IDS.length || IDS.includes(r.id)); list = list.slice(FROM, Math.min(TO, list.length));
const D = 180 / Math.PI, specs = {}, yawOf = (q) => { const v = Q.rot(q, [0, 0, 1]); return Math.atan2(v[0], v[2]) * D; }, tiltOf = (q) => Math.acos(Math.min(1, Q.rot(q, [0, 1, 0])[1])) * D;
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null), mx = (a) => (a.length ? Math.max(...a) : null), mn = (a) => (a.length ? Math.min(...a) : null);
for (const run of list) { const outF = path.join(OUTD, run.id + ".json"); if (fs.existsSync(outF)) continue;
  const spec = specs[run.body] || (specs[run.body] = unloadSpec(run.body)), { s, nL, nS, H } = unloadSim(J, spec, run), C = s.ctrl, W = C.M * 9.81, FT = C.feet, f = FT[nL], B = spec.bodies;
  const pts = B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), clear = (st) => Math.min(...pts.map(p => V.add(st[f].pos, Q.rot(st[f].rot, p))[1])) * 1000;
  let cmd = null; { const oc = C.compute.bind(C); C.compute = (st, ev, dt) => { cmd = oc(st, ev, dt); return cmd; }; }
  const perHash = Math.round(1 / s.dt), hashes = {}, trans = [[], []], hov = [], dwell = [], pertT = run.push ? run.push.t : run.turn ? run.turn.t : run.bump ? run.bump.t : null;
  let prevSt = null, tRel = null, ref = null, foot0 = null, prevTau = null, prevCmd = null, prevTouch = null, onsets = [], prevE = null, prevW = null, closMax = -Infinity, closPos = 0, dTauMax = 0, dTauNon = 0, dTau0Max = 0;
  let slipRel = 0, slipPre = 0, slipPert = 0, tiltMax = 0, yawMax = 0, stanceSlip = 0, fzMax = 0; const tailLoads = [], lift = { tdErr: null, tdPeak: 0 };
  while (s.tick()) { const t = s.n * s.dt, st = s.st, lc = C.lc.feet, pr = s.probeRows[nL], se = C.sense, sts = lc.map(x => x.state);
    if (!foot0) foot0 = FT.map(i => st[i].pos.slice());
    if (prevSt) for (const n of [0, 1]) if (sts[n] !== prevSt[n]) { trans[n].push({ t, from: prevSt[n], to: sts[n] }); if (n === nL && tRel == null && prevSt[n] === "SUPPORT") tRel = t; } prevSt = sts;
    const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; let dT = 0; if (prevTau) for (const k in tau) dT = Math.max(dT, Math.abs(tau[k] - (prevTau[k] ?? tau[k])));
    let dC = 0; if (prevCmd) cmd.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) dC = Math.max(dC, Math.abs(r.tau0 - p.tau0)); }));
    const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice(); if (onset[0] || onset[1]) onsets.push(s.n);
    if (t >= 0.5 - 1e-9) { const exc = onsets.some(o => s.n === o || s.n === o + 1); dTauMax = Math.max(dTauMax, dT); if (!exc) dTauNon = Math.max(dTauNon, dT); dTau0Max = Math.max(dTau0Max, dC); }
    prevTau = tau; prevCmd = cmd.map(ax => ax && ax.map(r => (r ? { tau0: r.tau0 } : null)));
    const L = s.ledger, E = s.last.E, Wt = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (Wt - prevW); prevE = E; prevW = Wt; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
    stanceSlip = Math.max(stanceSlip, Math.hypot(st[FT[nS]].pos[0] - foot0[nS][0], st[FT[nS]].pos[2] - foot0[nS][2]) * 1000);
    const Fz = pr ? pr.JyN : 0, touch = pr ? pr.pieces.filter(p => p.touch).length : 0, vs = touch && Fz >= 0.2 && pr.cop ? (() => { const vp = V.add(st[f].v, V.cross(st[f].w, V.sub(pr.cop, st[f].com))); return Math.hypot(vp[0], vp[2]) * s.dt * 1000; })() : 0;
    if (tRel != null) { if (!ref) ref = { yaw: yawOf(st[f].rot) }; const preLift = H.tL == null;
      if (t >= tRel - 0.1 - 1e-9 && t <= tRel + 0.5 + 1e-9) slipRel += vs; if (preLift) { slipPre += vs; tiltMax = Math.max(tiltMax, tiltOf(st[f].rot)); yawMax = Math.max(yawMax, Math.abs(yawOf(st[f].rot) - ref.yaw)); if (t > tRel + 0.15) fzMax = Math.max(fzMax, Fz); tailLoads.push({ t, Fz }); } }
    if (pertT != null && t >= pertT) slipPert += vs;
    if (H.tL != null && run.lift) { const LT = run.lift.T || 0.4, sw = lc[nL].swing; if (t >= H.tL + LT && t < H.tL + LT + run.lift.hover && sw) { hov.push({ err: V.len(V.sub(st[f].pos, sw.pos)) * 1000, clr: clear(st) }); dwell.push(clear(st)); }
      if (sts[nL] === "TOUCHDOWN" && lift.tdErr == null && trans[nL].length && trans[nL][trans[nL].length - 1].to === "TOUCHDOWN") lift.tdErr = Math.hypot(st[f].pos[0] - H.anchor.pos[0], st[f].pos[2] - H.anchor.pos[2]) * 1000;
      if (lift.tdErr != null && H.cleared == null) lift.tdPeak = Math.max(lift.tdPeak, Fz); }
    if (s.n % perHash === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0"); }
  hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
  const T = trans[nL], preEnd = H.tL ?? run.end, preT = tRel != null ? T.filter(x => x.t > tRel && x.t < preEnd) : [], tail = tailLoads.filter(x => x.t >= preEnd - 2 - 1e-9).map(x => x.Fz);
  const chat = (TT) => { let c = 0; for (let i = 2; i < TT.length; i++) if (TT[i].to === TT[i - 2].to && TT[i].t - TT[i - 2].t < 0.06) c++; return c; };
  let overCap = 0; s.act.led.forEach(row => row.forEach(x => { if (x && x.n) overCap += x.overCap; }));
  const g = s.g3summary(), sched = run.push ? run.push.J : 0, Jx = Math.hypot(...s.ledger.Jext), h = run.lift ? run.lift.h * 1000 : null;
  const out = { id: run.id, run, W, nL, nS, outcome: g.outcome, fell: /fell/.test(g.outcome || ""), tRel, released: tRel != null, transL: T.map(x => `${x.t.toFixed(4)} ${x.from}→${x.to}`), transRaw: trans,
    chatter: chat(trans[0]) + chat(trans[1]), preContactLoss: preT.filter(x => x.to === "LIFTOFF" || x.to === "AIRBORNE").length, preLoadAccept: preT.filter(x => x.to === "LOAD_ACCEPT").length,
    restLoadMaxN: fzMax, restLoadMeanTailN: mean(tail), loadOnN: C.lc.o.loadOn * W, loadOffN: C.lc.o.loadOff * W, slipRelMm: slipRel, slipPreMm: slipPre, slipPertMm: slipPert, tiltMaxDeg: tiltMax, yawMaxDeg: yawMax, stanceSlipMm: stanceSlip,
    lift: run.lift ? { tL: H.tL, tR: H.tR, liftoff: H.tL != null ? ((T.find(x => x.t >= H.tL && x.to === "AIRBORNE") || {}).t ?? null) : null, airborne: H.tL != null ? T.filter(x => x.t >= H.tL && x.to === "AIRBORNE").length : null,
      touchdown: H.tL != null ? T.filter(x => x.t >= H.tL && x.to === "TOUCHDOWN").length : null, bounce: T.filter(x => x.from === "TOUCHDOWN" && x.to === "AIRBORNE").length, loadAccept: H.tL != null ? T.filter(x => x.t >= H.tL && x.to === "LOAD_ACCEPT").length : null,
      final: prevSt[nL], hoverErrMax: mx(hov.map(x => x.err)), hoverErrRms: hov.length ? Math.sqrt(mean(hov.map(x => x.err * x.err))) : null, clearMin: mn(dwell), clearFrac06: hov.length ? hov.filter(x => x.clr >= 0.6 * h).length / hov.length : null,
      tdErrMm: lift.tdErr, tdPeakN: lift.tdPeak } : null,
    dTauMax, dTauMaxNonOnset: dTauNon, dTau0Max, closMax, closPos, overCap, authorityWrites: s.ledger.authorityWrites, extImpulse: Jx, extOk: Math.abs(Jx - sched) <= 1e-9 * Math.max(1, sched) && Math.hypot(...s.ledger.Hext) === 0, hashes,
    ...(s.ctrl.g3 && s.ctrl.g3.aborted != null ? { abortT: s.ctrl.g3.aborted, putDown: s.ctrl.g3.putDownLog || null } : {}) };   // abort record (e1b_fix W set; absent without an abort, so earlier outputs are unchanged)
  s.destroy(); fs.writeFileSync(outF, JSON.stringify(out));
  console.log(`${run.id}: ${g.outcome}; rel ${tRel != null ? tRel.toFixed(3) : "—"}; pre-loss ${out.preContactLoss}; slipRel ${slipRel.toFixed(3)} slipPert ${slipPert.toFixed(2)} mm; rest ${out.restLoadMeanTailN?.toFixed(2)} N${out.lift && out.lift.tL != null ? `; lift a/td/b ${out.lift.airborne}/${out.lift.touchdown}/${out.lift.bounce} LA ${out.lift.loadAccept} ${out.lift.final} err ${out.lift.hoverErrMax?.toFixed(2)} clr ${out.lift.clearMin?.toFixed(2)}` : out.lift ? "; lift NOT started" : ""}`); }
