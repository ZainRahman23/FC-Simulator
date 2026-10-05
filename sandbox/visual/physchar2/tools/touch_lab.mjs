// ═══ physchar2/tools/touch_lab.mjs — DIAGNOSTIC lab for the semantics of a released, still-touching foot (touch_semantics/; sources/2026-10-05_user_instruction_autonomous_runway_touching_foot.md).
// NOT E1a. The unloading scenario (gates/v2_unload.js: settle; planned pelvis drop; stance share 0.5 → 1 − r over 3–7 s, supervised) with any controller
// flags, and optionally:
//   --bump=<m>  a planned pelvis-height change after release (posture pelvisDrop target moved by −bump, min-jerk 1 s from --tb): + = the pelvis RISES, − = SINKS
//   --lift      a commanded lift test after release (the E1a SEQUENCE, diagnostic only): when the foot has been TOUCHING ≥ 0.5 s and t ≥ 7 s → swing target from the
//               contact anchor to anchor + 5 mm (min-jerk 0.4 s), hover 0.5 s, replace (0.4 s), held at the anchor until a contact state (grace 0.3 s), cleared;
//               then the request returns 1.0 → 0.5 stance share over 4 s from replace + 0.2 s (load acceptance); quiet to the end
// Measurements: release time; spontaneous liftoffs BEFORE any lift command; post-release sensed / probe load (pressing), foot rise and sole clearance, horizontal
// displacement; touching-leg hip / knee applied torques; stance slip; energy-closure increments; applied Δτ / Δτ0; lift: liftoff time, hover clearance and
// servo error, touchdown time and impact, LOAD_ACCEPT entries, s monotone. Read-only measurement; the only commands are the scenario's and the lift test's.
// usage: node tools/touch_lab.mjs --body=V2-REF --foot=L --drop=0.025 [--r=0] [--flags=<json>] [--bump=0.01 --tb=8] [--lift] [--end=11] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const LIFTH = +arg("liftH", 0.005), RAMPD = +arg("ramp", 4), HOVER = +arg("hover", 0.5), BODY = arg("body", "V2-REF"), FOOT = arg("foot", "L"), DROP = +arg("drop", 0.025), R = +arg("r", 0), FLAGS = JSON.parse(arg("flags", "{}")), BUMP = +arg("bump", 0), TB = +arg("tb", 8), LIFT = process.argv.includes("--lift"), HZ = +arg("hz", 240), OUT = arg("out", "");
const END = +arg("end", LIFT ? 16 : 11), mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const spec = unloadSpec(BODY), run = { foot: FOOT, drop: DROP, r: R, flags: FLAGS, end: END, ramp: RAMPD, ...(HZ !== 240 ? { hz: HZ } : {}) }, { s, nL, nS, pd } = unloadSim(J, spec, run), C = s.ctrl, B = spec.bodies, W = C.M * 9.81;
const FT = C.feet, f = FT[nL], pts = B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), clear = (st) => Math.min(...pts.map(p => V.add(st[f].pos, Q.rot(st[f].rot, p))[1])) * 1000;
const ji = (n) => spec.joints.findIndex(j => j.name === n), legT = ["hip_", "knee_"].map(p => ji(p + ["L", "R"][nL]));
const H = { tRel: null, touchT0: null, tL: null, tR: null, cleared: null, anchor: null, abort: null };
// lift test + load acceptance (diagnostic; the E1a sequence through the same mechanisms)
if (LIFT) { const orig = C.o.transfer; C.o.transfer = (t, c) => { const r = orig(t, c); if (c.g3 && c.g3.aborted != null) return r; if (H.tR == null || t < H.tR + 0.2) return r;
    const u = Math.min(1, (t - H.tR - 0.2) / 4), sg = 1.0 - 0.5 * mj(u), dsg = t < H.tR + 4.2 ? -0.5 * 30 * u * u * (1 - u) * (1 - u) / 4 : 0; return nS === 1 ? { lam: sg, dl: dsg, ddl: 0 } : { lam: 1 - sg, dl: -dsg, ddl: 0 }; }; }
{ const oc = C.compute.bind(C); C.compute = (st, ev, dt) => { const tc = C.n * dt, lf = C.lc.feet[nL];
    if (BUMP && tc >= TB) pd.dz = DROP - BUMP * mj((tc - TB) / 1);   // planned pelvis-height change through the posture target (an existing mechanism)
    if (LIFT && !(C.g3 && C.g3.aborted != null)) {
      if (H.tL == null) { if (lf.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null; if (tc >= 3 + RAMPD && H.touchT0 != null && tc - H.touchT0 >= 0.5) { H.tL = tc; const a = C.lc.target(nL); H.anchor = { pos: a.pos.slice(), rot: a.rot.slice() }; } }
      if (H.tL != null && H.cleared == null) { const u = tc - H.tL, A = H.anchor; if (u >= 0.8 + HOVER && H.tR == null) H.tR = H.tL + 0.8 + HOVER;
        if (u >= 0.8 + HOVER && (["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT"].includes(lf.state) || u >= 1.1 + HOVER)) { C.lc.setSwingTarget(nL, null); H.cleared = tc; }
        else { const h = u < 0.4 ? LIFTH * mj(u / 0.4) : u < 0.4 + HOVER ? LIFTH : u < 0.8 + HOVER ? LIFTH * (1 - mj((u - 0.4 - HOVER) / 0.4)) : 0; C.lc.setSwingTarget(nL, { pos: [A.pos[0], A.pos[1] + h, A.pos[2]], rot: A.rot }); H.h = h; } } }
    return oc(st, ev, dt); }; }
const rows = [], tr = [[], []]; let prev = null, prevTau = null, prevCmd = null, prevE = null, prevW = null, foot0 = null, y0 = null, p0 = null;
while (s.tick()) { const t = s.n * s.dt, st = s.st, lc = C.lc.feet, I = C.info, pr = s.probeRows;
  if (!foot0) foot0 = FT.map(i => st[i].pos.slice());
  const states = lc.map(x => x.state); if (prev) for (const n of [0, 1]) if (states[n] !== prev[n]) { tr[n].push({ t, from: prev[n], to: states[n] }); if (n === nL && H.tRel == null && prev[n] === "SUPPORT" && states[n] === "UNLOADING") { H.tRel = t; y0 = st[f].pos[1]; p0 = st[f].pos.slice(); } } prev = states;
  const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; let dT = 0; if (prevTau) for (const k in tau) dT = Math.max(dT, Math.abs(tau[k] - (prevTau[k] ?? tau[k]))); prevTau = tau;
  const L = s.ledger, E = s.last.E, Wt = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (Wt - prevW); prevE = E; prevW = Wt;
  rows.push({ t, st: states[nL], s: lc[nL].s, a: lc[nL].a, Fz: C.sense.Fz[nL], Jy: pr[nL] ? pr[nL].JyN : 0, touch: C.sense.touch[nL], dy: y0 == null ? null : (st[f].pos[1] - y0) * 1000, clear: clear(st), dxz: p0 ? Math.hypot(st[f].pos[0] - p0[0], st[f].pos[2] - p0[2]) * 1000 : null,
    slip: Math.hypot(st[FT[nS]].pos[0] - foot0[nS][0], st[FT[nS]].pos[2] - foot0[nS][2]) * 1000, dT, dCl, legTau: legT.map(k => [0, 1, 2].map(i => tau[k * 3 + i] ?? 0)), pelErr: (C.pelHT - st[B.findIndex(b => b.name === "pelvis")].pos[1]) * 1000,
    err: lc[nL].swing ? V.len(V.sub(st[f].pos, lc[nL].swing.pos)) * 1000 : null, h: H.h ?? null, share: I.share[nL], lam: I.lam });
  if (t >= END - 1e-9) break; }
const g = s.g3summary(); s.destroy();
const T = tr[nL], pre = rows.filter(r => H.tRel != null && r.t >= H.tRel && (H.tL == null || r.t < H.tL)), spont = T.filter(x => x.to === "AIRBORNE" && (H.tL == null || x.t < H.tL)).length, mx = (a) => a.length ? Math.max(...a) : null, mn = (a) => a.length ? Math.min(...a) : null;
const hov = H.tL != null ? rows.filter(r => r.t >= H.tL + 0.4 && r.t < H.tL + 0.4 + HOVER) : [], liftoff = H.tL != null ? (T.find(x => x.to === "AIRBORNE" && x.t >= H.tL) || {}).t ?? null : null, td = H.tL != null ? (T.find(x => x.to === "TOUCHDOWN" && x.t >= H.tL) || {}).t ?? null : null;
const after = (t0) => rows.filter(r => r.t >= t0);
const chat = (TT) => { let c = 0; for (let i = 2; i < TT.length; i++) if (TT[i].to === TT[i - 2].to && TT[i].t - TT[i - 2].t < 0.06) c++; return c; };
const out = { body: BODY, foot: FOOT, drop: DROP, r: R, flags: FLAGS, bump: BUMP, lift: LIFT, liftH: LIFTH, ramp: RAMPD, hover: HOVER, chatter: chat(tr[0]) + chat(tr[1]), hoverTransitions: H.tL != null ? T.filter(x => x.t >= H.tL + 0.4 && x.t < H.tL + 0.4 + HOVER).length : null, outcome: g.outcome, tRel: H.tRel, transitions: T.map(x => `${x.t.toFixed(3)} ${x.from}→${x.to}`), stanceTransitions: tr[nS].length,
  spontaneousAirborne: spont, preLift: pre.length ? { FzMax: mx(pre.map(r => r.Fz)), FzMean: pre.reduce((a, r) => a + r.Fz, 0) / pre.length, JyMax: mx(pre.map(r => r.Jy)), riseMaxMm: mx(pre.map(r => r.dy)), clearMaxMm: mx(pre.map(r => r.clear)), clearMinMm: mn(pre.map(r => r.clear)), dxzMaxMm: mx(pre.map(r => r.dxz)),
    kneeTauMax: mx(pre.map(r => Math.abs(r.legTau[1][1]))), hipTauMax: mx(pre.map(r => Math.max(...r.legTau[0].map(Math.abs)))), touchingFrac: pre.filter(r => r.st === "TOUCHING").length / pre.length } : null,
  bumpWin: BUMP ? (() => { const w = rows.filter(r => r.t >= TB && r.t < TB + 2); return { FzMax: mx(w.map(r => r.Fz)), JyMax: mx(w.map(r => r.Jy)), riseMaxMm: mx(w.map(r => r.dy)), clearMaxMm: mx(w.map(r => r.clear)), airborne: T.filter(x => x.to === "AIRBORNE" && x.t >= TB).length }; })() : null,
  lift: H.tL != null ? { tL: H.tL, liftoff, hoverClearMin: mn(hov.map(r => r.clear)), hoverClearMean: hov.length ? hov.reduce((a, r) => a + r.clear, 0) / hov.length : null, hoverErrMax: mx(hov.map(r => r.err ?? 0)), hoverFzMax: mx(hov.map(r => r.Fz)), hoverTouchZero: hov.filter(r => r.touch === 0).length / Math.max(1, hov.length),
    touchdown: td, impactJyMax: td != null ? mx(rows.filter(r => r.t >= td && r.t <= td + 0.1).map(r => r.Jy)) : null, loadAccept: T.filter(x => x.to === "LOAD_ACCEPT").length, airborneEntries: T.filter(x => x.to === "AIRBORNE" && x.t >= H.tL).length, finalState: rows[rows.length - 1].st, cleared: H.cleared } : (LIFT ? { tL: null } : null),
  slipMaxMm: mx(rows.map(r => r.slip)), closMax: mx(rows.map(r => r.dCl)), closPos: rows.reduce((a, r) => a + Math.max(0, r.dCl), 0), dTauMax: mx(rows.filter(r => r.t >= 0.5).map(r => r.dT)), W,
  series: rows.filter((r, i) => i % 6 === 0 && r.t >= 6).map(r => ({ t: +r.t.toFixed(3), st: r.st, Fz: +r.Fz.toFixed(3), dy: r.dy == null ? null : +r.dy.toFixed(4), clear: +r.clear.toFixed(4), pelErr: +r.pelErr.toFixed(3), kneeTau: +r.legTau[1][1].toFixed(3), h: r.h })) };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out));
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), P = out.preLift || {};
console.log(`${BODY} ${FOOT} d${DROP} r${R} ${JSON.stringify(FLAGS)}${BUMP ? " bump " + BUMP : ""}${LIFT ? " LIFT" : ""}: ${g.outcome}; release ${f2(H.tRel, 3)}; spontaneous airborne ${spont}; pre-lift Fz max ${f2(P.FzMax)} mean ${f2(P.FzMean)} N, rise ${f2(P.riseMaxMm, 3)} mm, clear ${f2(P.clearMinMm, 3)}–${f2(P.clearMaxMm, 3)} mm, dxz ${f2(P.dxzMaxMm, 3)} mm, knee τ ${f2(P.kneeTauMax)} N·m, touching ${f2(P.touchingFrac * 100, 0)} %` +
  (out.bumpWin ? ` | bump: Fz max ${f2(out.bumpWin.FzMax)} N, rise ${f2(out.bumpWin.riseMaxMm, 3)} mm, airborne ${out.bumpWin.airborne}` : "") + (out.lift && out.lift.tL != null ? ` | LIFT at ${f2(out.lift.tL, 3)}: liftoff ${f2(out.lift.liftoff, 3)}, hover clear ${f2(out.lift.hoverClearMin)}–${f2(out.lift.hoverClearMean)} mm, err ≤ ${f2(out.lift.hoverErrMax)} mm, touchdown ${f2(out.lift.touchdown, 3)}, impact ${f2(out.lift.impactJyMax, 1)} N, LA ${out.lift.loadAccept}, airborne ${out.lift.airborneEntries}, final ${out.lift.finalState}` : out.lift ? " | LIFT never started" : "") + ` | slip ${f2(out.slipMaxMm, 3)} mm, clos ${f2(out.closMax, 4)} J, Δτ ${f2(out.dTauMax)}`);
