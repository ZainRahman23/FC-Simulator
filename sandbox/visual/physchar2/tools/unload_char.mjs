// ═══ physchar2/tools/unload_char.mjs — runner of the unloading characterization V2 (unload_fix/UNLOAD_FIX_PREREG.md §3; manifest unload_fix/manifest.json).
// Runs manifest entries (one Jolt instance, a fresh simulation per run) and writes one result JSON per run. Measurement is read-only: a wrapper reads the
// controller's command rows after compute; nothing is written to the simulation. Per run (prereg §3.3): lifecycle states of both feet and the release time
// of the unloading foot n; requested / commanded share per foot; probe and sensed normal loads; the stance knee's flexion posture-PD and the locked-axis term
// tan t·(T·ẑ) (T = the controller's statics torque, t = the knee twist); pelvis target − actual; stance-foot slip; per-tick energy-closure increments;
// applied-torque / τ0 changes (t ≥ 0.5 s) and contact onsets; authority writes; external impulse vs the scheduled push; foot-n displacement across the
// release; the running state hash at every 1 s; 10 Hz series; full-rate load trajectory in [t_rel − 0.5, t_rel + 0.5] s.
// usage: node tools/unload_char.mjs --manifest=<json> --outdir=<dir> [--set=P] [--from=0] [--to=N] [--ids=a,b]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { decompose } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), OUTD = arg("outdir", "."), SET = arg("set", ""), IDS = arg("ids", "").split(",").filter(Boolean), FROM = +arg("from", 0), TO = +arg("to", 1e9);
let list = M.runs.filter(r => (!SET || r.set === SET) && (!IDS.length || IDS.includes(r.id))); list = list.slice(FROM, Math.min(TO, list.length)); fs.mkdirSync(OUTD, { recursive: true });
const G = 9.81, D = 180 / Math.PI, specs = {};
for (const run of list) { const outF = path.join(OUTD, run.id + ".json"); if (fs.existsSync(outF)) continue;
  const spec = specs[run.body] || (specs[run.body] = unloadSpec(run.body)), { s, nL, nS } = unloadSim(J, spec, run), C = s.ctrl, W = C.M * G, B = spec.bodies;
  const ji = (n) => spec.joints.findIndex(j => j.name === n), kneeS = ji("knee_" + ["L", "R"][nS]), diS = s.P.jd.findIndex(d => d.k === kneeS), pel = B.findIndex(b => b.name === "pelvis"), FT = C.feet;
  // read-only capture: the command rows and, with the controller's own inputs of this tick, the stance knee's locked-axis term tan t·(T·ẑ)
  let cmd = null, term = 0; { const oc = C.compute.bind(C); C.compute = (st, ev, dt) => { cmd = oc(st, ev, dt); const d = s.P.jd[diS], T = C.info.ff[diS], R2F2 = Q.mul(st[d.child].rot, d.F2);
      term = Math.tan(decompose(ev.qs[kneeS]).tw) * V.dot(T, Q.rot(R2F2, [0, 0, 1])); return cmd; }; }
  const rows = [], series = [], hashes = {}, trans = [[], []]; let prevSt = null, prevTau = null, prevCmd = null, prevE = null, prevW = null, prevTouch = null, foot0 = null, tRel = null, slip = 0, closMax = -Infinity, closPos = 0, dTauMax = 0, dTauMaxNon = 0, dTau0Max = 0, dTauWho = null, onsets = [];
  const buf = [];   // full-rate ring for the release window
  while (s.tick()) { const t = s.n * s.dt, I = C.info, st = s.st, lc = C.lc.feet, pr = s.probeRows, se = C.sense;
    if (!foot0) foot0 = FT.map(f => st[f].pos.slice());
    const states = lc.map(f => f.state); if (prevSt) for (const n of [0, 1]) if (states[n] !== prevSt[n]) { trans[n].push({ t, from: prevSt[n], to: states[n] }); if (n === nL && tRel == null && prevSt[n] === "SUPPORT" && states[n] === "UNLOADING") tRel = t; } prevSt = states;
    // stance knee: flexion posture PD and the locked-axis term
    const pd = cmd[diS][1].tau0 - cmd[diS][1].ff;
    // torques
    const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; let dT = 0, dWho = null; if (prevTau) for (const key in tau) { const dd = Math.abs(tau[key] - (prevTau[key] ?? tau[key])); if (dd > dT) { dT = dd; dWho = key; } }
    let dC = 0; if (prevCmd) cmd.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) dC = Math.max(dC, Math.abs(r.tau0 - p.tau0)); }));
    const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice(); if (onset[0] || onset[1]) onsets.push(s.n);
    if (t >= 0.5 - 1e-9) { const exc = onsets.some(o => s.n === o || s.n === o + 1); dTauMax = Math.max(dTauMax, dT); if (!exc && dT > dTauMaxNon) { dTauMaxNon = dT; dTauWho = dWho; } dTau0Max = Math.max(dTau0Max, dC); }
    prevTau = tau; prevCmd = cmd.map(ax => ax && ax.map(r => (r ? { tau0: r.tau0 } : null)));
    // energy
    const L = s.ledger, E = s.last.E, Wt = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (Wt - prevW); prevE = E; prevW = Wt; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
    slip = Math.max(slip, Math.hypot(st[FT[nS]].pos[0] - foot0[nS][0], st[FT[nS]].pos[2] - foot0[nS][2]) * 1000);
    const req = [1 - I.lam, I.lam], row = { t: +t.toFixed(5), st: states, s: lc.map(f => +f.s.toFixed(5)), req, cmdShare: I.share.slice(), Fz: se.Fz.slice(), Jy: pr.map(r => (r ? r.JyN : 0)), pd, term, pelErr: (C.pelHT - st[pel].pos[1]) * 1000, fp: st[FT[nL]].pos.slice() };
    buf.push(row); if (buf.length > 1300) buf.shift(); rows.push({ t: row.t, st: states[nL], Fz: row.Fz[nL], cmdShare: row.cmdShare[nL], req: req[nL], pd, term, pelErr: row.pelErr, fp: row.fp });
    if (s.n % 24 === 0) series.push({ t: row.t, stN: states[nL], sN: row.s[nL], FzN: row.Fz[nL], JyN: row.Jy[nL], FzS: row.Fz[nS], reqN: req[nL], cmdN: row.cmdShare[nL], pd, term, pelErr: row.pelErr });
    if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0"); }
  hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
  const g = s.g3summary(), tail = rows.filter(r => r.t >= run.end - 0.5 - 1e-9), mean = (f) => tail.reduce((a, r) => a + f(r), 0) / Math.max(1, tail.length);
  const relWin = tRel != null ? rows.filter(r => r.t >= tRel - 0.5 - 1e-9 && r.t <= tRel + 0.5 + 1e-9).map(r => ({ t: r.t, st: r.st, Fz: r.Fz })) : null;
  let dispRel = null; if (tRel != null) { const r0 = rows.find(r => r.t >= tRel - 0.1 - 1e-9), w = rows.filter(r => r.t >= tRel - 0.1 - 1e-9 && r.t <= tRel + 0.5 + 1e-9); dispRel = Math.max(...w.map(r => Math.hypot(r.fp[0] - r0.fp[0], r.fp[2] - r0.fp[2]))) * 1000; }
  const capViol = rows.filter(r => r.req < (C.lc.o.loadOff) && r.cmdShare > Math.max(0, r.req) + 1e-12).length;   // ticks where the commanded share exceeds the request below loadOff
  const sched = run.push ? run.push.J : 0, Jx = Math.hypot(...s.ledger.Jext), extOk = Math.abs(Jx - sched) <= 1e-9 * Math.max(1, sched) && Math.hypot(...s.ledger.Hext) === 0;
  const out = { id: run.id, run, W, nL, nS, outcome: g.outcome, fell: /fell/.test(g.outcome || ""), tRel, released: tRel != null, trans: trans.map(T => T.map(x => `${x.t.toFixed(4)} ${x.from}→${x.to}`)), transRaw: trans,
    residualN: mean(r => r.Fz), residualPct: 100 * mean(r => r.Fz) / W, fPD: (() => { const v = tail.filter(r => Math.abs(r.term) >= 1); return v.length ? v.reduce((a, r) => a + Math.abs(r.pd) / Math.abs(r.term), 0) / v.length : null; })(), pdTail: mean(r => r.pd), termTail: mean(r => r.term), leakN: mean(r => r.cmdShare * W), pelErrTail: mean(r => r.pelErr),
    capViolTicks: capViol, maxCmdShareBelowLoadOff: Math.max(0, ...rows.filter(r => r.req < C.lc.o.loadOff).map(r => r.cmdShare)), slipMm: slip, closMax, closPos, dTauMax, dTauMaxNonOnset: dTauMaxNon, dTauWho: dTauWho != null ? spec.joints[Math.floor(dTauWho / 3)].name + "." + "xyz"[dTauWho % 3] : null, dTau0Max,
    authorityWrites: s.ledger.authorityWrites, extImpulse: Jx, extOk, dispRelMm: dispRel, maxFzAfterRel: tRel != null ? Math.max(...rows.filter(r => r.t >= tRel - 1e-9).map(r => r.Fz)) : null, loadOnN: C.lc.o.loadOn * W, loadOff: C.lc.o.loadOff, hashes, series, relWin };
  s.destroy(); fs.writeFileSync(outF, JSON.stringify(out));
  console.log(`${run.id}: ${g.outcome}; release ${tRel != null ? tRel.toFixed(3) + " s" : "—"}; residual ${out.residualN.toFixed(2)} N (${out.residualPct.toFixed(3)} %); fPD ${out.fPD == null ? "—" : out.fPD.toFixed(3)}; leak ${out.leakN.toFixed(2)} N`); }
