// ═══ physchar2/tools/touchrest_char.mjs — runner of the touch-rest validation (touch_semantics/TOUCHREST_PREREG.md; manifest touch_semantics/manifest.json).
// One Jolt instance, a fresh simulation per run (gates/v2_unload.js incl. its optional bump / lift protocol). Read-only measurement (a wrapper reads the command
// rows after compute). Per run: lifecycle transitions of both feet; release time of foot n; contact losses (LIFTOFF / AIRBORNE) and load acceptances after release
// and before any lift command; post-release sensed load (max; mean over the last 2 s of that window); sole clearance; lift events (liftoff, AIRBORNE / TOUCHDOWN
// entries, bounce, LOAD_ACCEPT entries, final state, hover clearance / servo error / transitions); chatter (a state re-entered within 60 ms); energy-closure
// increments; applied Δτ (t ≥ 0.5 s; contact-onset tick + next excepted) and Δτ0; actuator over-capacity events and saturation; authority writes; external
// impulse vs the scheduled push; foot-n displacement across the release; stance slip; running state hash every 1 s; 10 Hz series.
// usage: node tools/touchrest_char.mjs --manifest=<json> --outdir=<dir> [--set=P] [--from=0] [--to=N] [--ids=a,b]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), OUTD = arg("outdir", "."), SET = arg("set", ""), IDS = arg("ids", "").split(",").filter(Boolean), FROM = +arg("from", 0), TO = +arg("to", 1e9);
let list = M.runs.filter(r => (!SET || r.set === SET) && (!IDS.length || IDS.includes(r.id))); list = list.slice(FROM, Math.min(TO, list.length)); fs.mkdirSync(OUTD, { recursive: true });
const specs = {}, G = 9.81;
for (const run of list) { const outF = path.join(OUTD, run.id + ".json"); if (fs.existsSync(outF)) continue;
  const spec = specs[run.body] || (specs[run.body] = unloadSpec(run.body)), { s, nL, nS, H } = unloadSim(J, spec, run), C = s.ctrl, W = C.M * G, B = spec.bodies, FT = C.feet, f = FT[nL];
  const pts = B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), clear = (st) => Math.min(...pts.map(p => V.add(st[f].pos, Q.rot(st[f].rot, p))[1])) * 1000;
  let cmd = null; { const oc = C.compute.bind(C); C.compute = (st, ev, dt) => { cmd = oc(st, ev, dt); return cmd; }; }
  const rows = [], series = [], hashes = {}, trans = [[], []]; let prevSt = null, prevTau = null, prevCmd = null, prevE = null, prevW = null, prevTouch = null, foot0 = null, tRel = null, slip = 0, closMax = -Infinity, closPos = 0, dTauMax = 0, dTauNon = 0, dTau0Max = 0, onsets = [];
  while (s.tick()) { const t = s.n * s.dt, st = s.st, lc = C.lc.feet, pr = s.probeRows, se = C.sense;
    if (!foot0) foot0 = FT.map(i => st[i].pos.slice());
    const states = lc.map(x => x.state); if (prevSt) for (const n of [0, 1]) if (states[n] !== prevSt[n]) { trans[n].push({ t, from: prevSt[n], to: states[n] }); if (n === nL && tRel == null && prevSt[n] === "SUPPORT" && states[n] === "UNLOADING") tRel = t; } prevSt = states;
    const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; let dT = 0; if (prevTau) for (const k in tau) dT = Math.max(dT, Math.abs(tau[k] - (prevTau[k] ?? tau[k])));
    let dC = 0; if (prevCmd) cmd.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) dC = Math.max(dC, Math.abs(r.tau0 - p.tau0)); }));
    const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice(); if (onset[0] || onset[1]) onsets.push(s.n);
    if (t >= 0.5 - 1e-9) { const exc = onsets.some(o => s.n === o || s.n === o + 1); dTauMax = Math.max(dTauMax, dT); if (!exc) dTauNon = Math.max(dTauNon, dT); dTau0Max = Math.max(dTau0Max, dC); }
    prevTau = tau; prevCmd = cmd.map(ax => ax && ax.map(r => (r ? { tau0: r.tau0 } : null)));
    const L = s.ledger, E = s.last.E, Wt = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (Wt - prevW); prevE = E; prevW = Wt; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
    slip = Math.max(slip, Math.hypot(st[FT[nS]].pos[0] - foot0[nS][0], st[FT[nS]].pos[2] - foot0[nS][2]) * 1000);
    const swing = lc[nL].swing, row = { t: +t.toFixed(5), st: states[nL], s: lc[nL].s, Fz: se.Fz[nL], Jy: pr[nL] ? pr[nL].JyN : 0, touch: se.touch[nL], clear: clear(st), fp: st[f].pos.slice(), err: swing ? V.len(V.sub(st[f].pos, swing.pos)) * 1000 : null };
    rows.push(row); if (s.n % 24 === 0) series.push({ t: row.t, st: row.st, s: +row.s.toFixed(4), Fz: +row.Fz.toFixed(3), clear: +row.clear.toFixed(4), err: row.err == null ? null : +row.err.toFixed(3) });
    if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0"); }
  hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
  const g = s.g3summary(), T = trans[nL], tEndPre = H.tL != null ? H.tL : run.end, pre = tRel != null ? rows.filter(r => r.t >= tRel - 1e-9 && r.t < tEndPre - 1e-9) : [], preT = tRel != null ? T.filter(x => x.t > tRel && x.t < tEndPre) : [];
  const tail2 = pre.filter(r => r.t >= tEndPre - 2 - 1e-9), mean = (a, fn) => a.length ? a.reduce((x, r) => x + fn(r), 0) / a.length : null, mx = (a) => a.length ? Math.max(...a) : null, mn = (a) => a.length ? Math.min(...a) : null;
  const chat = (TT) => { let c = 0; for (let i = 2; i < TT.length; i++) if (TT[i].to === TT[i - 2].to && TT[i].t - TT[i - 2].t < 0.06) c++; return c; };
  let dispRel = null; if (tRel != null) { const r0 = rows.find(r => r.t >= tRel - 0.1 - 1e-9), w = rows.filter(r => r.t >= tRel - 0.1 - 1e-9 && r.t <= tRel + 0.5 + 1e-9); dispRel = Math.max(...w.map(r => Math.hypot(r.fp[0] - r0.fp[0], r.fp[2] - r0.fp[2]))) * 1000; }
  let overCap = 0, satFrac = 0, satAxis = null; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) { overCap += x.overCap; const fr = x.satTicks / x.n; if (fr > satFrac) { satFrac = fr; satAxis = spec.joints[k].name + "." + "xyz"[i]; } } }));
  const lift = run.lift ? (() => { if (H.tL == null) return { tL: null }; const after = T.filter(x => x.t >= H.tL), hov = rows.filter(r => r.t >= H.tL + 0.4 && r.t < H.tL + 0.4 + run.lift.hover);
    return { tL: H.tL, tR: H.tR, cleared: H.cleared, liftoff: (after.find(x => x.to === "AIRBORNE") || {}).t ?? null, airborne: after.filter(x => x.to === "AIRBORNE").length, touchdown: after.filter(x => x.to === "TOUCHDOWN").length, bounce: after.filter(x => x.from === "TOUCHDOWN" && x.to === "AIRBORNE").length,
      loadAccept: after.filter(x => x.to === "LOAD_ACCEPT").length, final: rows[rows.length - 1].st, hoverClearMin: mn(hov.map(r => r.clear)), hoverClearMean: mean(hov, r => r.clear), hoverErrMax: mx(hov.map(r => r.err ?? 0)), hoverTransitions: T.filter(x => x.t >= H.tL + 0.4 && x.t < H.tL + 0.4 + run.lift.hover).length }; })() : null;
  const sched = run.push ? run.push.J : 0, Jx = Math.hypot(...s.ledger.Jext);
  const out = { id: run.id, run, W, nL, nS, outcome: g.outcome, fell: /fell/.test(g.outcome || ""), tRel, released: tRel != null, trans: trans.map(TT => TT.map(x => `${x.t.toFixed(4)} ${x.from}→${x.to}`)), transRaw: trans, chatter: chat(trans[0]) + chat(trans[1]),
    pre: { contactLoss: preT.filter(x => x.to === "LIFTOFF" || x.to === "AIRBORNE").length, loadAccept: preT.filter(x => x.to === "LOAD_ACCEPT").length, FzMax: mx(pre.map(r => r.Fz)), FzMeanTail: mean(tail2, r => r.Fz), clearMax: mx(pre.map(r => r.clear)), n: pre.length },
    residualN: mean(rows.filter(r => r.t >= run.end - 0.5 - 1e-9), r => r.Fz), lift, slipMm: slip, closMax, closPos, dTauMax, dTauMaxNonOnset: dTauNon, dTau0Max, overCap, satMaxFrac: satFrac, satAxis, authorityWrites: s.ledger.authorityWrites, extImpulse: Jx, extOk: Math.abs(Jx - sched) <= 1e-9 * Math.max(1, sched) && Math.hypot(...s.ledger.Hext) === 0,
    dispRelMm: dispRel, loadOnN: C.lc.o.loadOn * W, loadOffN: C.lc.o.loadOff * W, hashes, series };
  s.destroy(); fs.writeFileSync(outF, JSON.stringify(out));
  console.log(`${run.id}: ${g.outcome}; release ${tRel != null ? tRel.toFixed(3) : "—"}; pre-lift contact losses ${out.pre.contactLoss}; resting load ${out.pre.FzMeanTail == null ? "—" : out.pre.FzMeanTail.toFixed(2)} N${lift && lift.tL != null ? `; lift ${lift.tL.toFixed(2)}: airborne ${lift.airborne}, touchdown ${lift.touchdown}, LA ${lift.loadAccept}, final ${lift.final}` : lift ? "; lift NOT started" : ""}`); }
