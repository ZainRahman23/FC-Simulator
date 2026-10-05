// ═══ physchar2/tools/e1b_eval.mjs — E1b criteria (FROZEN: final_pre_e1a/E1_PREREGISTRATION.md §5 E1b-1 … 18; operational definitions e1a/E1B_HARNESS.md §2, committed
// before any E1b run). Built from tools/e1a_eval.mjs: E1a's computations unchanged except the §5 / E1B_HARNESS changes (E1b-3, E1b-5, E1b-8, P15, E1b-16 … 18).
// usage: node tools/e1b_eval.mjs --dir=<runs dir> [--config=V2|PSTAR|PSTAR2] [--out=<json>]   (files: e1b_<body>_L_none.json.gz × 8, e1b_V2-REF_R_none.json.gz, e1b_V2-REF_L_none_rep.json.gz,
//        e1b_<V2-REF|V2-165-62|V2-198-92>_L_<PF|PB|PL|PR|YAW|P15>.json.gz)
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "."), OUT = arg("out", ""), CONFIG = arg("config", "V2"), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, f))));
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"];
const mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity), f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
export function judge(r, cfgName = CONFIG, opts = {}) { const CONFIG = cfgName;   // opts (e1b_fix validation battery only): { hz: allowed physics rate, yawk: the footYaw capacity setting (default true = nominal) }
  if (!r.isE1b || r.liftM !== 0.02) throw new Error(`${r.human} ${r.side}: lift ${r.liftM} m is not the preregistered 20 mm`); const P = r.pert || "none", pert = P !== "none", P5 = pert && P !== "P15", HE = r.events.pertT, pEnd = HE != null ? HE + 0.1 : null;
  const c = r.cfg; if (!(c.kneeV2K && c.ankleK === 0.13 && c.lifecycle && c.ikRefTwist && c.contactSupport && c.holdUnloaded && c.ikFeasible && Math.abs(c.hz - (opts.hz ?? 240)) < 1e-9 && c.pelvisDrop)) throw new Error("configuration");
  // configuration VERSION (preswing/PRESWING_VALIDATION_PREREG.md §5): --config=V2 (default; the official runs carry no version field) or PSTAR; the criteria below are unchanged
  // PSTAR2 (e1b_fix/E1B_FIX_DESIGN.md, e1b_fix/E1B_FIX_VALIDATION_PREREG.md): PSTAR + the active foot-yaw path at its nominal capacity + the quintic abort put-down
  if (CONFIG === "PSTAR" ? !(c.config === "PSTAR" && c.ffLockedAxis && c.touchRest && c.lcVff === "lin" && c.reseed) : CONFIG === "PSTAR2" ? !(c.config === "PSTAR2" && c.ffLockedAxis && c.touchRest && c.lcVff === "lin" && c.reseed && c.footYaw === (opts.yawk ?? true) && c.lcPutDown && c.footYawAxes === 2)
    : !((c.config == null || c.config === "V2") && !c.ffLockedAxis && !c.touchRest && !c.lcVff && !c.reseed)) throw new Error("configuration version");
  const R = r.rows, H = r.events, n = r.lifted, m = r.stance, W = r.W, C = {}, add = (id, pass, v) => { C[id] = { pass: !!pass, v }; };
  const lifted = H.tL != null, hov = R.filter(x => x.ph === "hover"), win = lifted ? R.filter(x => x.t >= H.tL - 1e-9 && x.t < H.tL + r.protocol.LT + r.protocol.HOV + r.protocol.RT - 1e-9) : [], hovU = pert && HE != null ? hov.filter(x => x.t < HE - 1e-9) : hov;
  // transitions per foot from the per-tick lifecycle states
  const tr = [0, 1].map(k => { const o = []; for (let i = 1; i < R.length; i++) if (R[i].st[k] !== R[i - 1].st[k]) o.push({ t: R[i].t, from: R[i - 1].st[k], to: R[i].st[k] }); return o; });
  const chatter = tr.map(T => { let k = 0; for (let i = 2; i < T.length; i++) if (T[i].to === T[i - 2].to && T[i].t - T[i - 2].t < 0.06) k++; return k; });
  // E1a-1 true contact loss
  { const ok = hov.filter(x => x.touch[n] === 0 && x.Fz[n] < 0.05).length; add("E1a-1", lifted && hov.length > 0 && ok >= 0.8 * hov.length, lifted ? `${ok}/${hov.length} hover ticks with 0 touching pieces and load < 0.05 N (${f2(100 * ok / Math.max(1, hov.length), 1)} %)` : "no lift"); }
  // E1a-2 true single support
  { const bad = hov.filter(x => { const T = x.Jy[0] + x.Jy[1]; return !(x.s[n] <= 1e-12 && x.nSup === 1 && (T <= 0 || x.Jy[m] / T >= 0.999)); }); const minSh = mn(hov.map(x => { const T = x.Jy[0] + x.Jy[1]; return T > 0 ? x.Jy[m] / T : 1; }));
    add("E1a-2", lifted && hov.length > 0 && bad.length === 0, lifted ? `s = 0 & nSup = 1 & stance ≥ 99.9 %: ${hov.length - bad.length}/${hov.length} hover ticks; stance share min ${f2(100 * minSh, 3)} %` : "no lift"); }
  // E1a-3 controlled swing foot
  { const hv = hovU, e = hv.map(x => x.errMm).filter(x => x != null), rms = Math.sqrt(e.reduce((a, x) => a + x * x, 0) / Math.max(1, e.length)), p0 = hv.length ? hv[0].foot[n].p : null, p1 = hv.length ? hv[hv.length - 1].foot[n].p : null;
    const drift = p0 ? Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) * 1000 : null, tiltMax = mx(hv.map(x => x.foot[n].tilt)), yawMax = mx(hv.map(x => Math.abs(x.yawErr ?? 99))), clr = hv.filter(x => x.foot[n].clear >= 3).length;
    // E1b-3: unperturbed error max ≤ 5 mm; perturbed: peak ≤ 15 mm from the onset and back within 5 mm within 0.5 s after the perturbation ends (E1B_HARNESS §2.2)
    const ep = pert && HE != null ? hov.filter(x => x.t >= HE - 1e-9).map(x => ({ t: x.t, e: x.errMm })) : [], back = ep.length ? ep.filter(o => o.t > pEnd + 0.5 - 1e-9).every(o => o.e <= 5) && ep.some(o => o.t > pEnd + 0.5 - 1e-9) : true, pk = ep.length ? mx(ep.map(o => o.e)) : null;
    add("E1a-3", lifted && e.length === hv.length && hv.length > 0 && mx(e) <= 5 && rms <= 2 && drift <= 2 && tiltMax <= 1.5 && yawMax <= 2 && clr >= 0.8 * hv.length && (!pert || (pk <= 15 && back)),
      lifted ? `${pert ? `perturbed: peak ${f2(pk)} mm (≤ 15), back within 5 mm by +0.5 s ${back}; unperturbed part: ` : ""}error max ${f2(mx(e))} mm (≤ 5), RMS ${f2(rms)} mm; drift ${f2(drift)} mm; tilt max ${f2(tiltMax)}°; yaw error max ${f2(yawMax)}°; clearance ≥ 3 mm ${clr}/${hov.length} (min ${f2(mn(hov.map(x => x.foot[n].clear)))} mm, mean ${f2(hov.reduce((a, x) => a + x.foot[n].clear, 0) / Math.max(1, hov.length))} mm)` : "no lift"); }
  // E1a-4 bounded stance-foot slip (whole run, from the first tick)
  { const f0 = r.foot0[m], sl = mx(R.map(x => Math.hypot(x.foot[m].p[0] - f0.pos[0], x.foot[m].p[2] - f0.pos[2]) * 1000)), yw = mx(R.map(x => { let d = x.foot[m].yaw - f0.yaw; while (d > 180) d -= 360; while (d < -180) d += 360; return Math.abs(d); }));
    add("E1a-4", sl <= 1.0 && yw <= 0.5, `stance slip max ${f2(sl, 3)} mm, yaw change max ${f2(yw, 3)}°`); }
  // E1a-5 bounded balance
  { const xm = mn(hov.map(x => x.xiM)) * 100, c0 = win.length ? win[0].com : null, ce = c0 ? mx(win.map(x => Math.hypot(x.com[0] - c0[0], x.com[2] - c0[2]))) * 100 : null;
    add("E1a-5", lifted && hov.length > 0 && (P5 ? H.abortT == null : xm >= 1.0 && ce <= 2.0 && H.abortT == null), lifted ? `ξ margin in the stance foot during hover min ${f2(xm)} cm; COM excursion lift–replace ${f2(ce)} cm; abort ${H.abortT == null ? "none" : H.abortT.toFixed(3) + " s"}` : `no lift; abort ${H.abortT}`); }
  // E1a-6 lifecycle without chatter
  { const T = tr[n], la = T.filter(x => x.from === "LIFTOFF" && x.to === "AIRBORNE").length, td = T.filter(x => x.to === "TOUCHDOWN").length, bounce = T.filter(x => x.from === "TOUCHDOWN" && x.to === "AIRBORNE").length;
    add("E1a-6", la === 1 && td === 1 && bounce === 0 && chatter[0] === 0 && chatter[1] === 0 && !H.unloadTimeout && lifted, `LIFTOFF→AIRBORNE ${la}, TOUCHDOWN ${td}, bounce ${bounce}, re-entries < 60 ms L ${chatter[0]} / R ${chatter[1]}, unload ${H.unloadTimeout ? "TIME-OUT" : lifted ? "reached (lift at " + H.tL.toFixed(3) + " s)" : "—"}; lifted-foot path ${T.map(x => x.to).join("→")}`); }
  // E1a-7 no discontinuous torque commands (t ≥ 0.5 s: the G3 initial-contact-settle convention); contact-onset exception: the onset tick and the next tick
  // at a physics rate other than 240 Hz (e1b_fix validation battery RATE set only): the same torque RATE (limits × 240 / hz) and an onset window of the same duration (≥ 2 ticks)
  { const exc = new Set(), rs = c.hz === 240 ? 1 : 240 / c.hz, nw = c.hz === 240 ? 2 : Math.max(2, Math.ceil(2 * c.hz / 240)); R.forEach((x, i) => { if (x.onset[0] || x.onset[1]) for (let j = 0; j < nw; j++) exc.add(i + j); });
    const A = R.map((x, i) => ({ x, i })).filter(o => o.x.t >= 0.5 - 1e-9), badA = A.filter(o => o.x.dTau > (exc.has(o.i) ? 25 : 10) * rs), badC = A.filter(o => o.x.dTau0 > 30 * rs), wA = A.reduce((b, o) => (o.x.dTau > b.x.dTau ? o : b), A[0]), wC = A.reduce((b, o) => (o.x.dTau0 > b.x.dTau0 ? o : b), A[0]);
    const wN = A.filter(o => !exc.has(o.i)).reduce((b, o) => (!b || o.x.dTau > b.x.dTau ? o : b), null);
    add("E1a-7", badA.length === 0 && badC.length === 0, `applied Δτ max ${f2(wA.x.dTau)} N·m (${wA.x.dTauWho} at ${wA.x.t.toFixed(3)} s${exc.has(wA.i) ? ", contact-onset window" : ""}); outside onset windows max ${f2(wN.x.dTau)} N·m (${wN.x.dTauWho} at ${wN.x.t.toFixed(3)} s); commanded Δτ0 max ${f2(wC.x.dTau0)} N·m (${wC.x.dTau0Who} at ${wC.x.t.toFixed(3)} s); violations ${badA.length} / ${badC.length}`); }
  // E1a-8 no unexplained energy creation
  { const d = R.map(x => x.E.dClos), pos = d.reduce((a, x) => a + Math.max(0, x), 0), L = r.summary.ledger, jx = Math.hypot(...L.Jext) + Math.hypot(...L.Hext);
    const sched = { PF: 5, PB: 5, PL: 5, PR: 5, P15: 15, YAW: 0.5, none: 0 }[P];
    add("E1a-8", mx(d) <= 0.05 && pos <= 0.5 && L.authorityWrites === 0 && Math.abs(jx - sched) <= 1e-6 * Math.max(1, sched), `closure increment max ${mx(d).toExponential(2)} J/tick; Σ positive ${f2(pos, 3)} J; authority writes ${L.authorityWrites}; external impulse ${jx}`); }
  // E1a-9 actuator capacities respected
  { const oc = r.actAxes.reduce((a, x) => a + x.overCap, 0), cnt = {}; hov.forEach(x => x.sat.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; })); const worst = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    const frac = worst ? worst[1] / Math.max(1, hov.length) : 0; add("E1a-9", oc === 0 && frac <= 0.05 && hov.length > 0, `over-capacity events ${oc}; saturation in hover: ${worst ? `${r.axisNames[worst[0]]} ${worst[1]}/${hov.length} ticks (${f2(100 * frac, 1)} %)` : "none"}`); }
  // E1a-10 no anatomical-limit abuse
  { const hmin = R.map(x => mn(x.hard)), wi = hmin.indexOf(mn(hmin)), wj = R[wi].hard.indexOf(hmin[wi]), ik = R.map(x => x.ikSoft).filter(x => x != null), kf = mn(R.map(x => x.jnt.knee[n][0]));
    add("E1a-10", mn(hmin) >= -1e-9 && (ik.length === 0 || mn(ik) >= -2) && kf >= 0, `smallest hard-limit margin ${f2(mn(hmin))}° (${r.joints[wj]} at ${R[wi].t.toFixed(2)} s); swing-leg solved coordinates: smallest soft margin ${ik.length ? f2(mn(ik)) + "°" : "— (bounded IK not used)"}; swing-leg knee flexion min ${f2(kf)}°`); }
  // E1a-12 touchdown
  { const iTD = R.findIndex((x, i) => i > 0 && R[i - 1].st[n] === "AIRBORNE" && x.st[n] === "TOUCHDOWN"); let ok = false, v = "no touchdown";
    if (iTD > 0 && H.anchor) { const x = R[iTD], a = H.anchor, dp = Math.hypot(x.foot[n].p[0] - a.pos[0], x.foot[n].p[2] - a.pos[2]) * 1000, ay = (() => { const q = a.rot, f = [2 * (q[0] * q[2] + q[3] * q[1]), 2 * (q[1] * q[2] - q[3] * q[0]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])]; return Math.atan2(f[0], f[2]) * 180 / Math.PI; })();
      let dy = x.foot[n].yaw - ay; while (dy > 180) dy -= 360; while (dy < -180) dy += 360; const pk = mx(R.filter(y => y.t >= x.t - 1e-9 && y.t <= x.t + 0.1 + 1e-9).map(y => y.Jy[n])), bounce = tr[n].filter(y => y.from === "TOUCHDOWN" && y.to === "AIRBORNE").length;
      const last = R[R.length - 1], dEnd = Math.hypot(last.foot[n].p[0] - a.pos[0], last.foot[n].p[2] - a.pos[2]) * 1000;
      ok = dp <= 5 && Math.abs(dy) <= 2 && pk <= 0.25 * W && bounce === 0; v = `at TOUCHDOWN (${x.t.toFixed(3)} s): ${f2(dp)} mm, yaw ${f2(dy)}° from the original foothold; impact peak ${f2(pk, 1)} N (${f2(100 * pk / W, 1)} % BW); bounce ${bounce}; end of run ${f2(dEnd)} mm`; }
    add("E1a-12", ok, v); }
  // E1a-13 smooth load acceptance
  { const la = tr[n].filter(x => x.to === "LOAD_ACCEPT"), iLA = la.length ? R.findIndex(x => x.t >= la[0].t - 1e-9) : -1; let mono = false, reached = false;
    if (iLA >= 0) { mono = true; for (let i = iLA + 1; i < R.length; i++) { if (R[i].s[n] < R[i - 1].s[n] - 1e-12) mono = false; if (R[i].s[n] >= 1) { reached = true; break; } } }
    const trk = H.tA != null ? R.filter(x => x.t >= H.tA + 1 - 1e-9 && x.Jy[0] + x.Jy[1] > 0.5 * W).map(x => { const T = x.Jy[0] + x.Jy[1], ld = x.Jy[n] / T, rq = n === 1 ? x.lam : 1 - x.lam; return Math.abs(ld - rq); }) : [];
    add("E1a-13", la.length === 1 && mono && reached && trk.length > 0 && mx(trk) <= 0.10, `LOAD_ACCEPT entries ${la.length}; s monotone to 1 ${mono && reached}; load tracking |Δ| max ${f2(trk.length ? mx(trk) : null, 3)} over ${trk.length} ticks from λ-ramp end + 1 s`); }
  // E1a-14 recovery to a valid two-foot state (at the end; references at t = 1.0 s)
  { const x = R[R.length - 1], dxi = x.xiRef ? Math.hypot(x.xi[0] - x.xiRef[0], x.xi[1] - x.xiRef[1]) * 100 : null; let dyaw = x.pel.yaw - r.ref.pelvisYaw; while (dyaw > 180) dyaw -= 360; while (dyaw < -180) dyaw += 360;
    const dAnk = [0, 1].map(k => Math.abs(x.jnt.ankle[k][1] - r.ref.ankleFabd[k])), dKn = [0, 1].map(k => Math.abs(x.jnt.knee[k][2] - r.ref.kneeDev[k]));
    add("E1a-14", x.st[0] === "SUPPORT" && x.st[1] === "SUPPORT" && dxi <= 1.5 && Math.abs(dyaw) <= 1 && mx(dAnk) <= 2 && mx(dKn) <= 2, `end ${x.t.toFixed(2)} s: states ${x.st.join("/")}; |ξ − ξ_ref| ${f2(dxi)} cm; pelvis yaw Δ ${f2(dyaw)}°; ankle ab/adduction Δ ${dAnk.map(v => f2(v)).join(" / ")}°; knee |θ−θ0| Δ ${dKn.map(v => f2(v)).join(" / ")}°`); }
  // E1a-16 qualified knee envelope; E1a-17 knee reference path
  { const fl = R.flatMap(x => [x.jnt.knee[0][0], x.jnt.knee[1][0]]); add("E1a-16", mn(fl) >= 0 && mx(fl) <= 40, `knee flexion ${f2(mn(fl))}–${f2(mx(fl))}° (certified envelope 0–40°)`); }
  { const ons = R.filter(x => x.onset[0] || x.onset[1]).map(x => x.t), near = (t) => ons.some(o => t >= o - 1e-9 && t <= o + 0.2 + 1e-9);
    const dv = R.map(x => ({ t: x.t, d: Math.max(Math.abs(x.jnt.knee[0][2]), Math.abs(x.jnt.knee[1][2])) })), bad = dv.filter(o => o.d > (near(o.t) ? 6 : 3)), w = dv.reduce((b, o) => (o.d > b.d ? o : b), dv[0]), w1 = dv.filter(o => o.t >= 1).reduce((b, o) => (o.d > b.d ? o : b), { d: 0, t: null });
    add("E1a-17", bad.length === 0, `knee |θ − θ0| max ${f2(w.d)}° at ${w.t.toFixed(3)} s (from 1 s: ${f2(w1.d)}°${w1.t != null ? " at " + w1.t.toFixed(3) + " s" : ""}); violations ${bad.length}`); }
  // E1b-16 (5 N·s / YAW): recovered without abort or foot relocation
  if (P5) add("E1b-16", H.abortT == null && !/fell|step|relocated/.test(r.summary.outcome || ""), `outcome ${r.summary.outcome}; abort ${H.abortT == null ? "none" : H.abortT.toFixed(3) + " s"}`);
  // E1b-17 (YAW): stance-ankle ab/adduction excursion from the impulse onset ≤ 10°, back within 2° within 3 s
  if ((P === "YAW" || P === "YAWN") && HE != null) { const i0 = R.findIndex(x => x.t >= HE - 1e-9), a0 = R[i0].jnt.ankle[m][1], seg = R.filter(x => x.t >= HE - 1e-9 && x.t <= HE + 3 + 1e-9), ex = mx(seg.map(x => Math.abs(x.jnt.ankle[m][1] - a0))), end = seg.length ? Math.abs(seg[seg.length - 1].jnt.ankle[m][1] - a0) : 99;
    add("E1b-17", ex <= 10 && end <= 2 && seg.length && seg[seg.length - 1].t >= HE + 3 - 0.01, `stance-ankle ab/adduction excursion max ${f2(ex)}° (≤ 10); at +3 s ${f2(end)}° (≤ 2)`); }
  // E1b-18 (P15): recovered, or the abort puts the foot down (TOUCHDOWN ≤ 0.4 s after the trigger) and returns to bilateral without a fall; stance slip ≤ 5 mm; no hard-limit excursion
  if (P === "P15") { const f0 = r.foot0[m], sl = mx(R.map(x => Math.hypot(x.foot[m].p[0] - f0.pos[0], x.foot[m].p[2] - f0.pos[2]) * 1000)), hmin = mn(R.map(x => mn(x.hard))), last = R[R.length - 1], fell = /fell|step/.test(r.summary.outcome || "");
    const rec = H.abortT == null && !fell && !/relocated/.test(r.summary.outcome || ""), td = H.abortT != null ? tr[n].find(x => x.to === "TOUCHDOWN" && x.t >= H.abortT - 1e-9) : null, ab = H.abortT != null && td && td.t - H.abortT <= 0.4 + 1e-9 && last.st[0] === "SUPPORT" && last.st[1] === "SUPPORT" && !fell;
    add("E1b-18", (rec || ab) && sl <= 5 && hmin >= -1e-9, `${rec ? "recovered" : ab ? `abort at ${H.abortT.toFixed(3)} s, TOUCHDOWN +${f2(td.t - H.abortT, 3)} s, end ${last.st.join("/")}` : `NOT recovered; abort ${H.abortT}; touchdown ${td ? td.t.toFixed(3) : "none"}; end ${last.st.join("/")}; outcome ${r.summary.outcome}`}; stance slip ${f2(sl)} mm (≤ 5); smallest hard margin ${f2(hmin)}°`);
    const oc = r.actAxes.reduce((a, x) => a + x.overCap, 0); add("E1a-9p15", oc === 0, `over-capacity events ${oc}`); }
  // reported (not gating)
  const rep = { hoverErrMm: hov.map(x => x.errMm), clearMm: { min: lifted ? mn(hov.map(x => x.foot[n].clear)) : null, max: lifted ? mx(hov.map(x => x.foot[n].clear)) : null },
    stanceAnkleFabdExcDeg: lifted ? mx(win.map(x => Math.abs(x.jnt.ankle[m][1] - r.ref.ankleFabd[m]))) : null, pelvisYawMaxDeg: mx(R.map(x => { let d = x.pel.yaw - r.ref.pelvisYaw; while (d > 180) d -= 360; while (d < -180) d += 360; return Math.abs(d); })),
    events: { tL: H.tL, tR: H.tR, tA: H.tA, tEnd: H.tEnd, cleared: H.cleared, clearReason: H.clearReason, abortT: H.abortT, unloadTimeout: H.unloadTimeout }, outcome: r.summary.outcome,
    lifecycle: tr.map(T => T.map(x => `${x.t.toFixed(3)} ${x.from}→${x.to}`)), yawAtHoverEnd: hov.length ? hov[hov.length - 1].yaw : null };
  return { C, rep }; }
export const idsOfRun = (P, rep = false) => (P === "P15" ? ["E1a-7", "E1a-8", "E1a-9p15", "E1a-10", "E1b-18"] : P !== "none" && !rep ? [...IDS, "E1b-16", ...(P === "YAW" || P === "YAWN" ? ["E1b-17"] : [])] : IDS);
export const nm = (id) => (id === "E1a-16" || id === "E1a-17" ? id.replace("E1a-", "E1b-knee") : id.replace("E1a-", "E1b-"));   // erratum E1b-e1 (e1a/E1B_RESULTS.md §4): E1a-16 / -17 (knee envelope / path) get distinct keys — they collided with the real E1b-16 / -17
const IDS = ["E1a-1", "E1a-2", "E1a-3", "E1a-4", "E1a-5", "E1a-6", "E1a-7", "E1a-8", "E1a-9", "E1a-10", "E1a-12", "E1a-13", "E1a-14", "E1a-16", "E1a-17"];
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const runs = {}, PB = ["V2-REF", "V2-165-62", "V2-198-92"], PS = ["PF", "PB", "PL", "PR", "YAW", "P15"];
const files = [...BODIES.map(b => [`${b}|L`, `e1b_${b}_L_none.json.gz`]), ["V2-REF|R", "e1b_V2-REF_R_none.json.gz"], ["V2-REF|L|rep", "e1b_V2-REF_L_none_rep.json.gz"], ...PB.flatMap(b => PS.map(p => [`${b}|L|${p}`, `e1b_${b}_L_${p}.json.gz`]))];
for (const [k, f] of files) { const r = rd(f); runs[k] = { r, j: judge(r) }; }
const main = [...BODIES.map(b => `${b}|L`), "V2-REF|R"], pert5 = PB.flatMap(b => ["PF", "PB", "PL", "PR", "YAW"].map(p => `${b}|L|${p}`)), p15 = PB.map(b => `${b}|L|P15`), out = { runs: {}, criteria: {} };
const idsOf = (k) => (k.endsWith("|P15") ? ["E1a-7", "E1a-8", "E1a-9p15", "E1a-10", "E1b-18"] : k.split("|").length === 3 && !k.endsWith("|rep") ? [...IDS, "E1b-16", ...(k.endsWith("|YAW") ? ["E1b-17"] : [])] : IDS);
for (const k of [...main, ...pert5, ...p15]) { const { j } = runs[k]; console.log(`\n■ ${k} — outcome ${j.rep.outcome}; lift ${f2(j.rep.events.tL, 3)} s, clear ${f2(j.rep.events.cleared, 3)} s (${j.rep.events.clearReason}), end ${f2(j.rep.events.tEnd, 2)} s`);
  for (const id of idsOf(k)) console.log(`  ${j.C[id] && j.C[id].pass ? "PASS" : "FAIL"} ${nm(id).padEnd(9)} ${j.C[id] ? j.C[id].v : "(missing)"}`); out.runs[k] = j; }
// E1b-11 determinism: unperturbed V2-REF left-lift run vs its repeat
{ const a = runs["V2-REF|L"].r.hashes, b = runs["V2-REF|L|rep"].r.hashes, keys = [...new Set([...Object.keys(a), ...Object.keys(b)])], diff = keys.filter(k => a[k] !== b[k]);
  out.criteria["E1b-11"] = { pass: diff.length === 0 && keys.length > 1, v: `${keys.length - diff.length}/${keys.length} hash marks identical (end ${a.end} / ${b.end})` }; console.log(`\n${out.criteria["E1b-11"].pass ? "PASS" : "FAIL"} E1b-11  determinism (V2-REF ×2): ${out.criteria["E1b-11"].v}`); }
const allK = [...main, ...pert5, ...p15], cids = [...new Set(allK.flatMap(idsOf))];
for (const id of cids) { const ks = allK.filter(k => idsOf(k).includes(id)), f = ks.filter(k => !(runs[k].j.C[id] && runs[k].j.C[id].pass)); out.criteria[nm(id)] = { pass: f.length === 0, failing: f, n: ks.length }; }
const all = cids.every(id => out.criteria[nm(id)].pass); out.criteria["E1b-15"] = { pass: all, v: all ? "every run passes its applicable criteria" : "failing: " + cids.filter(id => !out.criteria[nm(id)].pass).map(id => `${nm(id)} [${out.criteria[nm(id)].failing.join(", ")}]`).join("; ") };
console.log(`\n══ E1b criteria ══`); for (const [id, c] of Object.entries(out.criteria)) console.log(`  ${c.pass ? "PASS" : "FAIL"} ${id}${c.n ? ` (${c.n} runs)` : ""}${c.failing && c.failing.length ? "  failing: " + c.failing.join(", ") : ""}${c.v ? "  " + c.v : ""}`);
const pass = all && out.criteria["E1b-11"].pass; out.E1b = pass ? "PASS" : "FAIL"; console.log(`\nE1b RESULT: ${out.E1b}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
}
