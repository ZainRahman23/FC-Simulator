// ═══ physchar2/tools/e2_eval.mjs — E2 criteria (e2/E2_PREREGISTRATION_v2.md §2 E2-1 … 18, §4 R-1 … 6) on tools/e2_run.mjs records. OPERATIONAL DEFINITIONS (fixed with the
// implementation record e2/E2_IMPLEMENTATION.md §5, before any official run):
//   swing foot n, stance foot m; t_L = the step command (= the planned swing start, t_S); t_TD = the planned touchdown of the last adopted plan; swing fraction
//   φ(t) = (t − t_S)/(t_TD − t_S) (the sequencer's 60 % gate uses the same); t_air = measured AIRBORNE; t_c = the first measured contact after AIRBORNE.
//   E2-1 last row before t_L: stance load share (probes) ≥ 0.95, swing-foot sensed load < 1 % BW, swing foot TOUCHING, released by the lifecycle (SUPPORT→UNLOADING→TOUCHING).
//   E2-2 swing foot after t_L, before t_c: exactly one LIFTOFF→AIRBORNE, t_air − t_L ≤ 0.3 s, at that row 0 touching pieces and load < 0.05 N; no AIRBORNE before t_L (from 1 s).
//   E2-3 rows t_air ≤ t < t_c: tracking error |foot origin − swing target| RMS ≤ 5 mm and max ≤ 10 mm, |yaw error| ≤ 2°, tilt ≤ 3°; no touching piece of foot n for
//        t_air ≤ t ≤ φ⁻¹(0.6); measured lowest boot point (clearance) ≥ 5 mm for 0.2 ≤ φ ≤ 0.8. S-LOW: the contact / clearance items are replaced by "handled" (§2a).
//   E2-4 first SUPPORT row of n after t_L: horizontal |foot origin − final commanded foothold| ≤ 10 mm, |yaw difference| ≤ 2°.
//   E2-5 TOUCHDOWN entries of n after t_air: exactly one, at φ ≥ 0.6; no state re-entered within 60 ms (either foot, from t_L); no TOUCHDOWN→AIRBORNE; impact (max probe
//        normal force within 100 ms of t_c) ≤ 25 % BW; approach velocity of foot n on the last row before t_c: downward ≤ 0.15 m/s, horizontal ≤ 0.05 m/s; impulse over
//        50 ms reported; penetration: lowest boot point within 100 ms of t_c ≥ −2 mm.
//   E2-6 LOAD_ACCEPT of n after t_L exactly once; |realised − requested landed share| ≤ 0.10 on every LOAD_ACCEPT row, requested = the controller's COMMANDED load share
//        (after the lifecycle's s cap — design §6.5 "realised loading is verified against the request"); LOAD_ACCEPT→SUPPORT ≤ T_r + 0.1 s; |realised − λ request| ≤ 0.10
//        for every row from t_A + 1 s (t_A = the sequencer's DONE) with total load > 0.5 BW (E1a-13).
//   E2-7 stance foot from t_L to the end: peak horizontal displacement from its t_L position ≤ 1.0 mm, accumulated path ≤ 2.0 mm, |yaw change| ≤ 0.5°, state SUPPORT on every row.
//   E2-8 ξ inside the stance region with ≥ 1 cm margin on every row t_L ≤ t < t_c (S-P: no fall; abort / re-plan reported).
//   E2-9 tools/e1b_eval.mjs E1a-7 rule (rate rule "maxJumpSmooth" off 240 Hz). E2-10 E1a-8 rule; motor / external work, damping and the residual reported.
//   E2-11 over-capacity events 0; per axis, saturated rows ≤ 5 % of the rows t_L ≤ t < t_c; longest continuous saturation of any axis from t_L ≤ 50 ms.
//   E2-12 decision-plan prediction at t_TD, contact-re-initialised prediction at LOAD_ACCEPT (nearest stored sample): |ξ_pred − ξ| ≤ 30 mm; last row: |ξ − ξ_terminal (qsRef)| ≤ 15 mm.
//   E2-13 last row: both SUPPORT, |ξ − qsRef| ≤ 1.5 cm, pelvis yaw within 1° and leg twists within 2° of their t = 1 s values (E1a-14), landed foot's final offset from the
//        anchor (stance frame: length, width) within 1 cm of the final commanded foothold's; no fall, no abort.
//   E2-14 E1a-16 / E1a-17. E2-17 from t_L to DONE: the plan VRP and p* (pRaw) outside the controller's support region by > 5 mm for > 20 ms (consecutive) = fail.
//   E2-18 every CERTIFIED planner output: valid landing geometry, certified reach node, swing path FEASIBLE at all samples.
//   R-1 … R-6 per §4 on the p15 records (abort t_ab; class decision e2dec).
// usage: node tools/e2_eval.mjs <file.json.gz> [...] [--kind=step|rb] [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { judge as e1bJudge } from "./e1b_eval.mjs";
const mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity), f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]), yawOfQ = (q) => { const f = [2 * (q[0] * q[2] + q[3] * q[1]), 2 * (q[1] * q[2] - q[3] * q[0]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])]; return Math.atan2(f[0], f[2]) * 180 / Math.PI; };
const wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
// E1a-7 / E1a-8 / E1a-16 / E1a-17 computed by the frozen E1b evaluator's code on an adapted record (its gates other than these are not used)
function e1bParts(r) { const c = r.cfg, P = r.run.protocol === "p15" ? r.run.pert : "none", ad = { ...r, isE1b: true, liftM: 0.02, pert: P === "none" || P == null ? "none" : P, events: { ...r.events, pertT: r.events.pertT }, protocol: { LT: 0.6, HOV: 1.5, RT: 0.6, GRACE: 0.3 },
    cfg: { ...c, config: "PSTAR4", footYaw: true }, summary: { ...r.summary, ledger: r.summary.ledger } };
  if (r.run.protocol === "step" && r.events.pertT != null) ad.pert = "PF";   // 5 N·s scheduled impulse (E1a-8 external-impulse check: 5)
  const j = e1bJudge(ad, "PSTAR4", { hz: c.hz, rateRule: "maxJumpSmooth" }); return j.C; }
export function evalStep(r) { const R = r.rows, n = r.lifted, m = r.stance, W = r.W, E2 = r.e2, H = r.events, C = {}, add = (id, pass, v) => { C[id] = { pass: !!pass, v }; }, rep = {};
  const dt = 1 / r.cfg.hz, tL = H.tL, low = r.run.variant === "low", late = r.run.variant === "late", sp = r.run.pert && typeof r.run.pert === "object";
  if (r.run.diag) rep.DIAGNOSTIC = "run with a diagnostic option (" + JSON.stringify(r.run.diag) + "): not an official E2 run";
  if (tL == null || !E2 || !E2.calls.length) { add("E2-0", false, `no step command (tL ${tL}, unload time-out ${H.unloadTimeout}, abort before lift ${H.abortBeforeLift})`); return { C, rep }; }
  const dec = E2.calls[0]; rep.decision = { verdict: dec.verdict, dx: dec.dx, dy: dec.dy, T: dec.T, Tr: dec.Tr, slack: dec.slack, nominal: dec.nominal };
  if (dec.verdict !== "CERTIFIED_ONE_STEP") { add("E2-0", false, `planner: ${dec.verdict} (${dec.why}) — step not executed`); return { C, rep }; }
  const tS = E2.tStart, tTD = E2.tTD, phi = (t) => (t - tS) / (tTD - tS), tAir = E2.tAir, tc = E2.tTDm ?? E2.tContact, tA = E2.doneT;
  const tr = [0, 1].map(k => { const o = []; for (let i = 1; i < R.length; i++) if (R[i].st[k] !== R[i - 1].st[k]) o.push({ t: R[i].t, from: R[i - 1].st[k], to: R[i].st[k], i }); return o; });
  const rowAt = (t) => R.find(x => x.t >= t - 1e-9), iL = R.findIndex(x => x.t >= tL - 1e-9);
  rep.times = { tL, tAir, tc, tTD, tA, liftoffDelay: tAir != null ? tAir - tL : null, touchdownVsPlan: tc != null ? tc - tTD : null, tAcc0: E2.tAcc0, handBack: E2.handBackT };
  // E2-1
  { const x = R[iL - 1], T = x.Jy[0] + x.Jy[1], sh = T > 0 ? x.Jy[m] / T : 0, rel = tr[n].filter(e => e.t < tL && e.t > 1); const okRel = rel.some(e => e.from === "SUPPORT" && e.to === "UNLOADING") && rel.some(e => e.to === "TOUCHING") && !rel.some(e => e.t > (rel.find(q => q.to === "TOUCHING") || {}).t && ["LOAD_ACCEPT", "LIFTOFF", "AIRBORNE"].includes(e.to));
    add("E2-1", sh >= 0.95 && x.Fz[n] < 0.01 * W && x.st[n] === "TOUCHING" && okRel, `before the command: stance share ${f2(100 * sh, 2)} %, swing-foot load ${f2(x.Fz[n], 2)} N (${f2(100 * x.Fz[n] / W, 3)} % BW), state ${x.st[n]}; release ${rel.map(e => e.to).join("→")}`); }
  // E2-2
  { const after = tr[n].filter(e => e.t >= tL - 1e-9 && (tc == null || e.t <= tc + 1e-9)), la = after.filter(e => e.from === "LIFTOFF" && e.to === "AIRBORNE"), before = tr[n].filter(e => e.t > 1 && e.t < tL && e.to === "AIRBORNE"), xa = la.length ? R[la[0].i] : null;
    add("E2-2", la.length === 1 && before.length === 0 && xa && xa.t - tL <= 0.3 + 1e-9 && xa.touch[n] === 0 && xa.Fz[n] < 0.05, la.length ? `LIFTOFF→AIRBORNE ${la.length} at +${f2(xa.t - tL, 3)} s (≤ 0.3); touching ${xa.touch[n]}, load ${f2(xa.Fz[n], 3)} N; before the command ${before.length}` : "no measured liftoff"); }
  // E2-3
  { const sw = R.filter(x => tAir != null && x.t >= tAir - 1e-9 && (tc == null || x.t < tc - 1e-9)), e = sw.map(x => x.errMm).filter(v => v != null), rms = Math.sqrt(e.reduce((a, v) => a + v * v, 0) / Math.max(1, e.length));
    const yw = mx(sw.map(x => Math.abs(x.yawErr ?? 0))), tl = mx(sw.map(x => x.foot[n].tilt)), t60 = tS + 0.6 * (tTD - tS), cont = sw.filter(x => x.t <= t60 + 1e-9 && x.touch[n] > 0).length;
    const win = R.filter(x => phi(x.t) >= 0.2 - 1e-9 && phi(x.t) <= 0.8 + 1e-9), clr = mn(win.map(x => x.foot[n].clear)), wClr = win.find(x => x.foot[n].clear === clr);
    rep.swing = { errMax: mx(e), errRms: rms, yawMax: yw, tiltMax: tl, clearMin2080: clr, clearMinAt: wClr ? phi(wClr.t) : null, contactBefore60: cont };
    const okC = low ? !(E2.early && E2.tAcc0 != null && phi(E2.tAcc0) < 0.6 - 1e-9 && !E2.calls.some(c => c.kind === "early-contact certification")) : cont === 0 && clr >= 5;
    add("E2-3", e.length > 0 && rms <= 5 && mx(e) <= 10 && yw <= 2 && tl <= 3 && okC, `tracking max ${f2(mx(e))} mm (≤ 10), RMS ${f2(rms)} mm (≤ 5); yaw ${f2(yw)}°; tilt ${f2(tl)}°; ${low ? `S-LOW early contact ${E2.early ? "at φ " + f2(phi(E2.early)) : "none"} handled ${okC}` : `touching rows before 60 % ${cont}; clearance min over 20–80 % ${f2(clr)} mm at φ ${f2(wClr ? phi(wClr.t) : null)} (≥ 5)`}`); }
  // E2-4
  const iS = R.findIndex(x => x.t > tL && x.st[n] === "SUPPORT"), Fc = E2.Fcmd;
  { const x = iS >= 0 ? R[iS] : null, d = x ? hyp(x.foot[n].p, Fc.pos) * 1000 : null, dyw = x ? wrap(x.foot[n].yaw - yawOfQ(Fc.rot)) : null;
    rep.placement = { firstSupportT: x ? x.t : null, dMm: d, yawDeg: dyw };
    add("E2-4", x && d <= 10 && Math.abs(dyw) <= 2, x ? `first SUPPORT ${x.t.toFixed(3)} s: ${f2(d)} mm from the final commanded foothold (≤ 10), yaw ${f2(dyw)}° (≤ 2)` : "no SUPPORT"); }
  // E2-5
  { const tds = tr[n].filter(e => tAir != null && e.t > tAir && e.to === "TOUCHDOWN"), bounce = tr[n].filter(e => e.t > tL && e.from === "TOUCHDOWN" && e.to === "AIRBORNE").length;
    const chat = [0, 1].map(k => { const T = tr[k].filter(e => e.t >= tL - 1e-9); let c = 0; for (let i = 2; i < T.length; i++) if (T[i].to === T[i - 2].to && T[i].t - T[i - 2].t < 0.06) c++; return c; });
    const ic = tc != null ? R.findIndex(x => x.t >= tc - 1e-9) : -1, pk = ic >= 0 ? mx(R.slice(ic, ic + Math.ceil(0.1 / dt) + 1).map(x => x.Jy[n])) : null, pre = ic > 0 ? R[ic - 1] : null;
    const vN = pre ? -pre.foot[n].v[1] : null, vT = pre ? Math.hypot(pre.foot[n].v[0], pre.foot[n].v[2]) : null, imp = ic >= 0 ? R.slice(ic, ic + Math.round(0.05 / dt)).reduce((a, x) => a + x.Jy[n] * dt, 0) : null;
    const pen = ic >= 0 ? mn(R.slice(ic, ic + Math.ceil(0.1 / dt) + 1).map(x => x.foot[n].clear)) : null, ph1 = tds.length ? phi(tds[0].t) : null;
    rep.touchdown = { n: tds.length, phi: ph1, impactN: pk, impactBW: pk != null ? pk / W : null, vNormal: vN, vTangential: vT, impulse50: imp, penetrationMm: pen, chatter: chat, bounce };
    add("E2-5", tds.length === 1 && ph1 >= 0.6 - 1e-9 && chat[0] === 0 && chat[1] === 0 && bounce === 0 && pk <= 0.25 * W && vN <= 0.15 && vT <= 0.05 && pen >= -2, tds.length ? `TOUCHDOWN ${tds.length} at φ ${f2(ph1)} (≥ 0.6); re-entries < 60 ms ${chat.join("/")}; rebound ${bounce}; impact ${f2(pk, 1)} N (${f2(100 * pk / W, 1)} % BW ≤ 25); approach ${f2(vN, 3)} m/s down (≤ 0.15), ${f2(vT, 3)} m/s horizontal (≤ 0.05); impulse 50 ms ${f2(imp, 2)} N·s; penetration ${f2(-Math.min(0, pen))} mm (≤ 2)` : "no TOUCHDOWN"); }
  // E2-6
  { const la = tr[n].filter(e => e.t >= tL && e.to === "LOAD_ACCEPT"), sup = la.length ? tr[n].find(e => e.t > la[0].t && e.to === "SUPPORT") : null, Tr = E2.Tr, share = (x) => { const T = x.Jy[0] + x.Jy[1]; return T > 0 ? x.Jy[n] / T : 0; }, req = (x) => (n === 1 ? x.lam : 1 - x.lam);
    const ramp = la.length && sup ? R.filter(x => x.t >= la[0].t - 1e-9 && x.t < sup.t - 1e-9) : [], dRamp = ramp.length ? mx(ramp.map(x => Math.abs(share(x) - x.share[n]))) : null;
    const trk = tA != null ? R.filter(x => x.t >= tA + 1 - 1e-9 && x.Jy[0] + x.Jy[1] > 0.5 * W).map(x => Math.abs(share(x) - req(x))) : [];
    rep.loading = { nLA: la.length, laT: la.length ? la[0].t : null, supT: sup ? sup.t : null, rampDur: sup && la.length ? sup.t - la[0].t : null, rampShareErrMax: dRamp, trackMax: trk.length ? mx(trk) : null, Tr };
    add("E2-6", la.length === 1 && sup && sup.t - la[0].t <= Tr + 0.1 + 1e-9 && dRamp <= 0.10 && trk.length > 0 && mx(trk) <= 0.10, la.length ? `LOAD_ACCEPT ${la.length} at ${la[0].t.toFixed(3)} s; →SUPPORT ${sup ? f2(sup.t - la[0].t, 3) + " s (≤ T_r + 0.1 = " + f2(Tr + 0.1, 3) + ")" : "never"}; realised − commanded share during the ramp max ${f2(dRamp, 3)} (≤ 0.10); load tracking from t_A + 1 s max ${f2(trk.length ? mx(trk) : null, 3)} over ${trk.length} rows` : "no LOAD_ACCEPT"); }
  // E2-7
  { const x0 = R[iL], w = R.slice(iL), peak = mx(w.map(x => hyp(x.foot[m].p, x0.foot[m].p) * 1000)); let acc = 0; for (let i = 1; i < w.length; i++) acc += hyp(w[i].foot[m].p, w[i - 1].foot[m].p) * 1000;
    const yw = mx(w.map(x => Math.abs(wrap(x.foot[m].yaw - x0.foot[m].yaw)))), nsup = w.filter(x => x.st[m] !== "SUPPORT").length; rep.stance = { peakMm: peak, pathMm: acc, yawDeg: yw, notSupportRows: nsup };
    add("E2-7", peak <= 1.0 && acc <= 2.0 && yw <= 0.5 && nsup === 0, `stance foot from t_L: peak ${f2(peak, 3)} mm (≤ 1.0), path ${f2(acc, 3)} mm (≤ 2.0), yaw ${f2(yw, 3)}° (≤ 0.5); rows not SUPPORT ${nsup}`); }
  // E2-8
  { const w = R.filter(x => x.t >= tL - 1e-9 && (tc == null || x.t < tc - 1e-9)), xm = mn(w.map(x => x.xiM)) * 100, fell = /fell/.test(r.summary.outcome || ""); rep.xiMarginCm = xm;
    add("E2-8", sp ? !fell : xm >= 1.0 && H.abortT == null, `ξ margin in the stance region during the swing min ${f2(xm)} cm (≥ 1)${sp ? `; S-P: fell ${fell}, abort ${H.abortT ?? "none"}, re-plans ${E2.calls.length - 1}` : ""}`); }
  // E2-9 / E2-10 / E2-14 (E1b evaluator code)
  { const P = e1bParts(r); add("E2-9", P["E1a-7"].pass, P["E1a-7"].v); const L = r.summary.ledger; add("E2-10", P["E1a-8"].pass, P["E1a-8"].v + `; motor work ${f2(L.Wact, 2)} J, external ${f2(L.Wext, 3)} J, damping ${f2(L.damping, 2)} J`);
    add("E2-14", P["E1a-16"].pass && P["E1a-17"].pass, P["E1a-16"].v + "; " + P["E1a-17"].v); }
  // E2-11
  { const oc = r.actAxes.reduce((a, x) => a + x.overCap, 0), sw = R.filter(x => x.t >= tL - 1e-9 && (tc == null || x.t < tc - 1e-9)), cnt = {}; sw.forEach(x => x.sat.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; }));
    const worst = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0], frac = worst ? worst[1] / Math.max(1, sw.length) : 0, run = {}, best = {}; let longest = 0, who = null;
    R.filter(x => x.t >= tL - 1e-9).forEach(x => { const s = new Set(x.sat); for (const k of Object.keys(run)) if (!s.has(+k)) delete run[k]; for (const k of s) { run[k] = (run[k] || 0) + 1; if (run[k] * dt > longest) { longest = run[k] * dt; who = k; } } });
    add("E2-11", oc === 0 && frac <= 0.05 && longest <= 0.05 + 1e-9, `over-capacity ${oc}; saturation during the swing ${worst ? `${r.axisNames[worst[0]]} ${worst[1]}/${sw.length} rows (${f2(100 * frac, 1)} %)` : "none"}; longest continuous ${f2(longest * 1000, 0)} ms${who != null ? " (" + r.axisNames[who] + ")" : ""} (≤ 50)`); }
  // E2-12
  { const dP = E2.preds.find(p => p.kind === "decision"), cP = E2.preds.find(p => p.kind === "contact re-initialisation"), near = (P, t) => P && P.traj.s.length ? P.traj.s.reduce((b, s) => (Math.abs(s[0] - t) < Math.abs(b[0] - t) ? s : b)) : null;
    const xTD = rowAt(tTD), sTD = near(dP, tTD), laT = rep.loading.laT, xLA = laT != null ? rowAt(laT) : null, sLA = laT != null ? near(cP, laT) : null, last = R[R.length - 1];
    const eTD = sTD && xTD ? Math.hypot(sTD[1][0] - xTD.xi[0], sTD[1][1] - xTD.xi[1]) * 1000 : null, eLA = sLA && xLA ? Math.hypot(sLA[1][0] - xLA.xi[0], sLA[1][1] - xLA.xi[1]) * 1000 : null, eEnd = last.qsRef ? Math.hypot(last.xi[0] - last.qsRef[0], last.xi[1] - last.qsRef[1]) * 1000 : null;
    rep.prediction = { atTD: eTD, atLA: eLA, atEnd: eEnd, sampleDtTD: sTD ? sTD[0] - tTD : null, sampleDtLA: sLA ? sLA[0] - laT : null };
    add("E2-12", eTD != null && eLA != null && eEnd != null && eTD <= 30 && eLA <= 30 && eEnd <= 15, `|ξ_pred − ξ| at planned touchdown ${f2(eTD, 1)} mm (≤ 30), at LOAD_ACCEPT ${f2(eLA, 1)} mm (≤ 30), end vs terminal ${f2(eEnd, 1)} mm (≤ 15)`); }
  // E2-13
  { const x = R[R.length - 1], dxi = x.qsRef ? Math.hypot(x.xi[0] - x.qsRef[0], x.xi[1] - x.qsRef[1]) * 100 : null, dyaw = wrap(x.pel.yaw - r.ref.pelvisYaw), dAnk = [0, 1].map(k => Math.abs(x.jnt.ankle[k][1] - r.ref.ankleFabd[k])), dKn = [0, 1].map(k => Math.abs(x.jnt.knee[k][2] - r.ref.kneeDev[k]));
    const A = E2.A.pos, fr = (() => { const q = R[iL]; const fw = [Math.sin(q.foot[m].yaw * Math.PI / 180), Math.cos(q.foot[m].yaw * Math.PI / 180)], right = [fw[1], -fw[0]], o = n === 0 ? [-right[0], -right[1]] : right; return { f: fw, o }; })();
    const off = (p) => { const d = [p[0] - A[0], p[2] - A[2]]; return [d[0] * fr.f[0] + d[1] * fr.f[1], d[0] * fr.o[0] + d[1] * fr.o[1]]; }, oF = off(x.foot[n].p), oC = off(Fc.pos), dl = (oF[0] - oC[0]) * 100, dw = (oF[1] - oC[1]) * 100, fell = /fell/.test(r.summary.outcome || "");
    rep.final = { dxiCm: dxi, pelvisYawDeg: dyaw, ankleDeg: dAnk, kneeDeg: dKn, stepLengthErrCm: dl, stepWidthErrCm: dw, stepCm: oF.map(v => v * 100) };
    add("E2-13", x.st[0] === "SUPPORT" && x.st[1] === "SUPPORT" && dxi <= 1.5 && Math.abs(dyaw) <= 1 && mx(dAnk) <= 2 && mx(dKn) <= 2 && Math.abs(dl) <= 1 && Math.abs(dw) <= 1 && !fell && H.abortT == null && tA != null && x.t - tA >= 4 - 1e-9,
      `end ${x.t.toFixed(2)} s (${f2(x.t - (tA ?? x.t), 2)} s after DONE): ${x.st.join("/")}; |ξ − terminal| ${f2(dxi)} cm; pelvis yaw Δ ${f2(dyaw)}°; ankle ab/add Δ ${dAnk.map(v => f2(v)).join("/")}°; knee Δ ${dKn.map(v => f2(v)).join("/")}°; step ${oF.map(v => f2(v * 100)).join(" × ")} cm vs command ${oC.map(v => f2(v * 100)).join(" × ")} (length ${f2(dl)} / width ${f2(dw)} cm); outcome ${r.summary.outcome}; abort ${H.abortT ?? "none"}`); }
  // E2-17
  { const w = R.filter(x => x.t >= tL - 1e-9 && (tA == null || x.t <= tA + 1e-9)), run = (key) => { let c = 0, longest = 0, worst = 0; for (const x of w) { const d = x.supD[key]; if (d == null) { c = 0; continue; } worst = Math.min(worst, d); if (d < -0.005) { c += dt; longest = Math.max(longest, c); } else c = 0; } return { longest, worst }; };
    const a = run("vrp"), b = run("pRaw"); rep.cop = { vrpWorstMm: a.worst * 1000, vrpLongestMs: a.longest * 1000, pRawWorstMm: b.worst * 1000, pRawLongestMs: b.longest * 1000 };
    add("E2-17", a.longest <= 0.02 + 1e-9 && b.longest <= 0.02 + 1e-9, `plan VRP outside the support by > 5 mm: longest ${f2(a.longest * 1000, 0)} ms (worst ${f2(-a.worst * 1000, 1)} mm outside); p*: longest ${f2(b.longest * 1000, 0)} ms (worst ${f2(-b.worst * 1000, 1)} mm) (≤ 20 ms)`); }
  // E2-18
  { const cs = E2.calls.filter(c => c.verdict === "CERTIFIED_ONE_STEP" && c.kind !== "early-contact certification"), bad = cs.filter(c => !(c.path && c.path.every(v => v === "FEASIBLE") && c.cert && c.cert.geometry === "ok" && c.cert.reach));
    add("E2-18", cs.length >= 1 && bad.length === 0, `${cs.length} CERTIFIED planner outputs; violations ${bad.length}; re-plans ${E2.calls.length - 1} (NO_CERTIFIED during the swing ${E2.nocertSwing})`); }
  rep.events = E2.events.map(e => `${e.t.toFixed(3)} ${e.what}`); rep.lifecycle = tr.map(T => T.filter(e => e.t >= tL - 1e-9).map(e => `${e.t.toFixed(3)} ${e.from}→${e.to}`)); rep.outcome = r.summary.outcome; rep.late = late ? { lateT: E2.late, failedTD: E2.failedTD } : undefined;
  return { C, rep }; }
export const STEP_IDS = ["E2-1", "E2-2", "E2-3", "E2-4", "E2-5", "E2-6", "E2-7", "E2-8", "E2-9", "E2-10", "E2-11", "E2-12", "E2-13", "E2-14", "E2-17", "E2-18"];
// ── R-B recovery steps (§4) ──
export function evalRB(r) { const R = r.rows, n = r.lifted, m = r.stance, W = r.W, E2 = r.e2, H = r.events, C = {}, add = (id, pass, v) => { C[id] = { pass: !!pass, v }; }, rep = {}, dt = 1 / r.cfg.hz, dec = r.e2dec, tab = H.abortT;
  rep.decision = dec; const call = E2 && E2.calls.length ? E2.calls[0] : null; rep.planner = call ? { verdict: call.verdict, dx: call.dx, dy: call.dy, T: call.T, Tr: call.Tr, slack: call.slack } : null;
  const fell = /fell/.test(r.summary.outcome || ""), last = R[R.length - 1], cert = call && call.verdict === "CERTIFIED_ONE_STEP";
  const four = fell ? "fell" : !dec ? "no abort / no class decision" : dec.verdict === "in place" ? "recovered without changing foothold" : cert && E2.ph === "DONE" ? "recovered by stepping" : cert ? "step started, not completed" : "step required (NO_CERTIFIED_ONE_STEP)";
  rep.fourWay = four; rep.noCertified = call && call.verdict !== "CERTIFIED_ONE_STEP";
  add("R-1", four === "recovered by stepping" && last.st[0] === "SUPPORT" && last.st[1] === "SUPPORT", `${four}; end ${last.st.join("/")}; outcome ${r.summary.outcome}`);
  if (!cert) return { C, rep };
  const tr = [0, 1].map(k => { const o = []; for (let i = 1; i < R.length; i++) if (R[i].st[k] !== R[i - 1].st[k]) o.push({ t: R[i].t, from: R[i - 1].st[k], to: R[i].st[k], i }); return o; });
  { const iA = R.findIndex(x => x.t >= tab - 1e-9), p0 = R[iA].foot[m].p, air = tr[m].filter(e => e.t >= tab && (e.to === "AIRBORNE" || e.to === "LIFTOFF")).length, pk = mx(R.slice(iA).map(x => hyp(x.foot[m].p, p0) * 1000));
    rep.oldStance = { airborne: air, peakMm: pk }; add("R-2", air === 0 && pk <= 5, `old stance foot: LIFTOFF/AIRBORNE entries ${air}; peak displacement from the abort ${f2(pk, 2)} mm (≤ 5)`); }
  { const iS = R.findIndex(x => x.t > dec.t && x.st[n] === "SUPPORT"), d = iS >= 0 ? hyp(R[iS].foot[n].p, E2.Fcmd.pos) * 1000 : null; rep.landedMm = d;
    add("R-3", call.verdict === "CERTIFIED_ONE_STEP" && call.cert && call.cert.geometry === "ok" && call.cert.reach && call.path.every(v => v === "FEASIBLE") && d != null && d <= 20, `planner ${call.verdict} (dx ${call.dx}, dy ${call.dy}, T ${f2(call.T, 3)} s, T_r ${call.Tr} s, slack ${f2(call.slack * 1000, 1)} ms); landed ${f2(d)} mm from it (≤ 20)`); }
  // R-4: E2-5 / E2-6 analogues with the recovery plan
  { const tds = tr[n].filter(e => e.t > dec.t && e.to === "TOUCHDOWN"), bounce = tr[n].filter(e => e.t > dec.t && e.from === "TOUCHDOWN" && e.to === "AIRBORNE").length, tc = tds.length ? tds[0].t : null, ic = tc != null ? R.findIndex(x => x.t >= tc - 1e-9) : -1;
    const pk = ic >= 0 ? mx(R.slice(ic, ic + Math.ceil(0.1 / dt) + 1).map(x => x.Jy[n])) : null, pre = ic > 0 ? R[ic - 1] : null, vN = pre ? -pre.foot[n].v[1] : null, vT = pre ? Math.hypot(pre.foot[n].v[0], pre.foot[n].v[2]) : null, pen = ic >= 0 ? mn(R.slice(ic, ic + Math.ceil(0.1 / dt) + 1).map(x => x.foot[n].clear)) : null;
    const chat = [0, 1].map(k => { const T = tr[k].filter(e => e.t >= tab); let c = 0; for (let i = 2; i < T.length; i++) if (T[i].to === T[i - 2].to && T[i].t - T[i - 2].t < 0.06) c++; return c; });
    const la = tr[n].filter(e => e.t > dec.t && e.to === "LOAD_ACCEPT"), sup = la.length ? tr[n].find(e => e.t > la[0].t && e.to === "SUPPORT") : null, sustained = la.length && tc != null ? la[0].t - tc >= 0.05 - 1e-9 : false, both = R.find(x => x.t > tab && x.st[0] === "SUPPORT" && x.st[1] === "SUPPORT");
    const share = (x) => { const T = x.Jy[0] + x.Jy[1]; return T > 0 ? x.Jy[n] / T : 0; }, req = (x) => (n === 1 ? x.lam : 1 - x.lam), ramp = la.length && sup ? R.filter(x => x.t >= la[0].t - 1e-9 && x.t < sup.t - 1e-9) : [], dRamp = ramp.length ? mx(ramp.map(x => Math.abs(share(x) - x.share[n]))) : null;
    rep.touchdown = { n: tds.length, tc, impactBW: pk != null ? pk / W : null, vN, vT, pen, chat, bounce, laT: la.length ? la[0].t : null, supT: sup ? sup.t : null, sustained, bilateralT: both ? both.t - tab : null, rampShareErrMax: dRamp };
    add("R-4", tds.length === 1 && bounce === 0 && chat[0] === 0 && chat[1] === 0 && pk <= 0.25 * W && vN <= 0.15 && vT <= 0.05 && pen >= -2 && la.length === 1 && sup && sup.t - la[0].t <= E2.Tr + 0.1 + 1e-9 && dRamp <= 0.10 && sustained && both && both.t - tab <= 2 + 1e-9,
      `TOUCHDOWN ${tds.length}; rebound ${bounce}; re-entries ${chat.join("/")}; impact ${f2(pk != null ? 100 * pk / W : null, 1)} % BW; approach ${f2(vN, 3)} / ${f2(vT, 3)} m/s; penetration ${f2(pen != null ? -Math.min(0, pen) : null)} mm; LOAD_ACCEPT ${la.length} (${sustained ? "after sustained contact" : "NOT sustained"}), →SUPPORT ${sup && la.length ? f2(sup.t - la[0].t, 3) : "—"} s (≤ T_r + 0.1); share error in the ramp ${f2(dRamp, 3)}; bilateral +${both ? f2(both.t - tab, 3) : "never"} s after the abort (≤ 2)`); }
  // R-5 integrity: E2-9, 10, 11, 12, 17, 18 (computed with the step definitions on the recovery window: t_L := the class decision)
  { const P = e1bParts(r), L = r.summary.ledger, oc = r.actAxes.reduce((a, x) => a + x.overCap, 0), w = R.filter(x => x.t >= dec.t - 1e-9), run = {}; let longest = 0; w.forEach(x => { const s = new Set(x.sat); for (const k of Object.keys(run)) if (!s.has(+k)) delete run[k]; for (const k of s) { run[k] = (run[k] || 0) + 1; longest = Math.max(longest, run[k] * dt); } });
    const tA = E2.doneT, ww = R.filter(x => x.t >= dec.t - 1e-9 && (tA == null || x.t <= tA + 1e-9)), runD = (key) => { let c = 0, lg = 0; for (const x of ww) { const d = x.supD[key]; if (d != null && d < -0.005) { c += dt; lg = Math.max(lg, c); } else c = 0; } return lg; };
    const cP = E2.preds.find(p => p.kind === "contact re-initialisation"), dP = E2.preds[0], near = (Pp, t) => Pp && Pp.traj.s.length ? Pp.traj.s.reduce((b, s) => (Math.abs(s[0] - t) < Math.abs(b[0] - t) ? s : b)) : null, rowAt = (t) => R.find(x => x.t >= t - 1e-9);
    const sTD = near(dP, E2.tTD), xTD = rowAt(E2.tTD), laT = rep.touchdown.laT, sLA = laT != null ? near(cP, laT) : null, xLA = laT != null ? rowAt(laT) : null, last2 = R[R.length - 1];
    const eTD = sTD ? Math.hypot(sTD[1][0] - xTD.xi[0], sTD[1][1] - xTD.xi[1]) * 1000 : null, eLA = sLA ? Math.hypot(sLA[1][0] - xLA.xi[0], sLA[1][1] - xLA.xi[1]) * 1000 : null, eEnd = last2.qsRef ? Math.hypot(last2.xi[0] - last2.qsRef[0], last2.xi[1] - last2.qsRef[1]) * 1000 : null;
    const v = runD("vrp"), p = runD("pRaw"), cs = E2.calls.filter(c => c.verdict === "CERTIFIED_ONE_STEP"), bad = cs.filter(c => !(c.path && c.path.every(q => q === "FEASIBLE") && c.cert && c.cert.geometry === "ok" && c.cert.reach));
    rep.integrity = { e1a7: P["E1a-7"].v, e1a8: P["E1a-8"].v, overCap: oc, longestSatMs: longest * 1000, predTD: eTD, predLA: eLA, predEnd: eEnd, vrpOutMs: v * 1000, pRawOutMs: p * 1000, certViolations: bad.length, ledger: { Wact: L.Wact, Wext: L.Wext, damping: L.damping } };
    add("R-5", P["E1a-7"].pass && P["E1a-8"].pass && oc === 0 && longest <= 0.05 + 1e-9 && eTD <= 30 && eLA <= 30 && eEnd <= 15 && v <= 0.02 + 1e-9 && p <= 0.02 + 1e-9 && bad.length === 0,
      `E2-9: ${P["E1a-7"].pass ? "pass" : "FAIL"} (${P["E1a-7"].v}); E2-10: ${P["E1a-8"].pass ? "pass" : "FAIL"}; over-capacity ${oc}, longest saturation ${f2(longest * 1000, 0)} ms; prediction ${f2(eTD, 1)} / ${f2(eLA, 1)} / ${f2(eEnd, 1)} mm (≤ 30 / 30 / 15); VRP / p* outside > 5 mm longest ${f2(v * 1000, 0)} / ${f2(p * 1000, 0)} ms (≤ 20); certificate violations ${bad.length}`); }
  { const both = R.find(x => x.t > dec.t && x.st[0] === "SUPPORT" && x.st[1] === "SUPPORT"); rep.R6 = { slackMs: call.slack * 1000, xiMarginAtFullSupportCm: both ? both.xiMsup * 100 : null };
    add("R-6", both && both.xiMsup >= 0, `predicted slack at the decision ${f2(call.slack * 1000, 1)} ms; measured ξ margin in the support at full support ${both ? f2(both.xiMsup * 100) + " cm" : "—"} (inside: ${both ? both.xiMsup >= 0 : false})`); }
  rep.events = E2.events.map(e => `${e.t.toFixed(3)} ${e.what}`); rep.lifecycle = tr.map(T => T.filter(e => e.t >= tab - 1e-9).map(e => `${e.t.toFixed(3)} ${e.from}→${e.to}`));
  return { C, rep }; }
export const RB_IDS = ["R-1", "R-2", "R-3", "R-4", "R-5", "R-6"];
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2).filter(a => !a.startsWith("--")), JS = (process.argv.find(a => a.startsWith("--json=")) || "").slice(7), out = {};
  for (const f of files) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), rb = r.run.protocol === "p15", j = rb ? evalRB(r) : evalStep(r), ids = rb ? RB_IDS : ["E2-0", ...STEP_IDS];
    console.log(`\n■ ${path.basename(f)} — ${r.human} ${r.side} ${r.run.protocol === "step" ? r.run.kind + (r.run.variant ? " " + r.run.variant : "") + (r.run.pert ? " pert " + JSON.stringify(r.run.pert) : "") : r.run.pert} ${r.cfg.hz} Hz${r.run.smoke ? " [SMOKE " + JSON.stringify(r.run.nominal) + "]" : ""}`);
    for (const id of ids) if (j.C[id]) console.log(`  ${j.C[id].pass ? "PASS" : "FAIL"} ${id.padEnd(6)} ${j.C[id].v}`);
    out[path.basename(f)] = j; }
  if (JS) fs.writeFileSync(JS, JSON.stringify(out, null, 1)); }
