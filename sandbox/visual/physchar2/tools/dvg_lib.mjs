// ═══ physchar2/tools/dvg_lib.mjs — shared DVG record analysis (e2/DVG_PREREG.md CQ-2 (iii, iv), CQ-6), used by tools/dvg_eval.mjs (and by the TD2C evaluator after adoption).
// guardLaw(entries, hz, tau): entries = per DVG evaluation of one leg { tick, mode, w, valid, srcTick, Cprev, rateEnv, ax: [[k, i, dvx, dvu, dvf, …], …] } (tools/dvg_val.mjs guard
// trace, or the tools/dvg_wrap.mjs sidecar). Checks:
//   (i) exact law per axis — FADE / RAMP: applied dvx = w × unit source dvu (1e-9 N·m + 1e-12 relative); OFF: dvx = 0;
//   (ii) FADE holds one source — its source tick equals the preceding tick's source tick (a PASS / RAMP tick's source is itself; entering the domain: the tick before);
//   (iii) weight law — FADE w = w_prev − s(C), RAMP w = s(C) after OFF else w_prev + s(C), OFF only once w_prev − s(C) ≤ 1e-12, PASS after RAMP only once w_prev + s(C) ≥ 1 − 1e-12,
//        s(C) = min(dt / τ_g, ½ · 30 · 240 / hz / C); and the slew reference C equals the preceding tick's measured unit contribution (source in FADE / OFF, fresh in RAMP);
//   (iv) guard-attributable per-axis step |Δw| · |dvu| ≤ the E1a-7 commanded bound 30 · 240 / hz;
//   rate envelope — every applied joint-rate command below its axis's force–velocity limit (rateEnv < 1);
//   source feasibility — every FADE source tick was a valid (V1–V4) evaluation, or the domain-entry carry-over (counted).
// The AB2 per-run metrics (ab2Metrics) and TD2 metrics (tdMetrics) are tools/td2b_eval.mjs's, copied verbatim (CQ-1 (a): engaged AB runs).
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity), mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const med = (a) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b.length % 2 ? b[b.length >> 1] : 0.5 * (b[b.length / 2 - 1] + b[b.length / 2]); };
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length)), BINS = []; for (let i = 0; i < 12; i++) BINS.push([+(0.2 + 0.05 * i).toFixed(2), +(0.25 + 0.05 * i).toFixed(2)]);
const binOf = (phi) => { for (let i = 0; i < BINS.length; i++) if (phi >= BINS[i][0] - 1e-9 && (phi < BINS[i][1] - 1e-9 || (i === BINS.length - 1 && phi <= 0.8 + 1e-9))) return i; return -1; };
const SETS = { "R-F": "R", "R-L": "R", "C-F7": "C", "C-F13": "C", "C-L5": "C", "H-T45": "H", "H-A40": "H", "H-D": "H", "H-F15": "H" }, hyp = (a) => Math.hypot(...a), AB = "PSTAR5CHAB", TD = "PSTAR5CHABTDB";
// B-10 frozen cross-rate bounds (e2/TD2B_PREREG.md §3)
const XB = { vN: 30.78, vT: 62.53, place: 3.0, tilt: 0.339, w: 0.2268, yaw: 2.0, w10: 0.2761, i50: 1.742, i50tick: 0.25, pen: 2.0, slip: 3.0, supT: 0.1267 }, IN_WIN = ["nominal", "earlyC", "lateC"], CONTACT_CONDS = ["nominal", "earlyC", "lateC", "beyond"];
const FS_GATE = 0.6; const yawOf = (q) => { const f = [2 * (q[0] * q[2] + q[3] * q[1]), 2 * (q[1] * q[2] - q[3] * q[0]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])]; return Math.atan2(f[0], f[2]) * 180 / Math.PI; }, wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
// ── AB2 run metrics (verbatim from tools/ab2_eval.mjs, via tools/fb_eval.mjs) ──
export function ab2Metrics(r) { const dt = 1 / r.hz, wn = r.wn, T = r.tr.T, R = r.rows, W = r.W, ev = r.events, n = r.swing;
  const S = R.filter(x => x.ph === "swing" && x.u != null && x.u >= -1e-9 && x.u / T <= 0.8 + 1e-9), nx = (x) => R[R.indexOf(x) + 1];
  const SWc = R.filter(x => x.ph === "swing" && x.u != null && x.u >= -1e-9);   // liftoff → contact
  const reachRT = ev.reachRejected ? "pre-check rejected at runtime" : S.some(x => x.ikErr != null && x.ikErr > 1e-6) ? "IK target unreached in the swing window" : null;
  const e = S.map(x => Math.hypot(...x.foot.p.map((v, i) => v - x.ref.p[i])) * 1000);
  let num = 0, den = 0, ny = 0, dy = 0; for (const x of S) for (let i = 0; i < 3; i++) { const q = x.foot.p[i] - x.ref.p[i], ga = -x.ref.a[i] / (wn * wn); num += q * ga; den += ga * ga; if (i === 1) { ny += q * ga; dy += ga * ga; } }
  const iAir = S.findIndex(x => x.st === "AIRBORNE" && x.a >= 1 - 1e-9), phiAir = iAir >= 0 ? S[iAir].u / T : null; let nyA = 0, dyA = 0, nyL = 0, dyL = 0;
  S.forEach((x, j) => { const ga = -x.ref.a[1] / (wn * wn), q = x.foot.p[1] - x.ref.p[1]; if (iAir >= 0 && j >= iAir) { nyA += q * ga; dyA += ga * ga; } else { nyL += q * ga; dyL += ga * ga; } });
  const dlow = BINS.map(() => ({ ev: Infinity, tm: Infinity })); for (const x of S) { const b = binOf(x.u / T); if (b < 0) continue; dlow[b].ev = Math.min(dlow[b].ev, x.low - x.lowRef); const z = nx(x); if (z && z.lowRef != null) dlow[b].tm = Math.min(dlow[b].tm, x.low - z.lowRef); }
  const satRows = {}, run = {}, longest = {}; for (const x of SWc) { const ss = new Set(x.sat); for (const k of Object.keys(run)) if (!ss.has(+k)) run[k] = 0; for (const k of ss) { run[k] = (run[k] || 0) + 1; satRows[k] = (satRows[k] || 0) + 1; longest[k] = Math.max(longest[k] || 0, run[k]); } }
  const satFracMax = Object.keys(satRows).length ? mx(Object.values(satRows)) / Math.max(1, SWc.length) : 0, satLongestMs = Object.keys(longest).length ? mx(Object.values(longest)) * dt * 1000 : 0;
  const se = r.series, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), nw = r.hz === 240 ? 2 : Math.max(2, Math.ceil(2 * r.hz / 240)), exc = new Set(); se.onset.forEach((o, i) => { if (o) for (let j = 0; j < nw; j++) exc.add(i + j); });
  const tLo = ev.tLo, rT = R.find(x => tLo != null && x.t > tLo + 1e-9 && x.touch > 0), tNC = rT ? rT.t - dt : (ev.tC != null ? ev.tC - dt : Infinity), tSupTr = r.trans.find(q => q.n === n && ev.tC != null && q.t >= ev.tC - 1e-9 && q.to === "SUPPORT"), tSup = tSupTr ? tSupTr.t : Infinity;
  const inTr = (t) => t >= tNC - dt / 2 && t < tSup - dt / 2; let badA = 0, badC = 0, badSw = 0, badOut = 0, badTr = 0, dTauMax = 0, dTau0Max = 0, dTauSwMax = 0, trA = 0, trC = 0;
  se.t.forEach((t, i) => { if (t < 0.5 - 1e-9) return; dTauMax = Math.max(dTauMax, se.dTau[i]); dTau0Max = Math.max(dTau0Max, se.dTau0[i]); const vA = se.dTau[i] > (exc.has(i) ? 25 : 10) * rsA, vC = se.dTau0[i] > 30 * rs; if (vA) badA++; if (vC) badC++;
    if (inTr(t)) { trA = Math.max(trA, se.dTau[i]); trC = Math.max(trC, se.dTau0[i]); if (vA || vC) badTr++; } else if (vA || vC) badOut++;
    if (tLo != null && t > tLo + 1e-9 && t < tNC - dt / 2) { dTauSwMax = Math.max(dTauSwMax, se.dTau[i]); if (vA || vC) badSw++; } });
  const closMax = mx(se.closInc), closPos = se.closInc.reduce((s, v) => s + Math.max(0, v), 0);
  const early = ev.early || SWc.some(x => x.touch > 0 && x.u / T < 0.6 - 1e-9), tr = r.trans.filter(q => tLo != null && q.t >= tLo - 1e-9), tdN = tr.filter(q => q.n === n && q.to === "TOUCHDOWN").length, rebound = tr.filter(q => q.n === n && q.from === "TOUCHDOWN" && q.to === "AIRBORNE").length;
  let chatter = 0; for (const k of [0, 1]) { const tt = r.trans.filter(q => q.n === k && ev.tCmd != null && q.t >= ev.tCmd - 1e-9); for (let i = 2; i < tt.length; i++) if (tt[i].to === tt[i - 2].to && tt[i].t - tt[i - 2].t < 0.06) chatter++; }
  const atPh = (ph) => S.find(q => q.u / T >= ph - 1e-9) || null, tw = SWc.filter(q => q.u / T >= 0.6 - 1e-9 && q.u / T <= 0.85 + 1e-9);
  const tiltMean = tw.length ? mean(tw.map(q => q.tiltErr)) : null, tilt80 = atPh(0.8) ? atPh(0.8).tiltErr : null, ey85r = SWc.find(q => q.u / T >= 0.85 - 1e-9), ey85 = ey85r ? 1000 * (ey85r.foot.p[1] - ey85r.ref.p[1]) : null;
  const marg = SWc.filter(q => q.margin), marginMin = marg.length ? mn(marg.map(q => mn(q.margin))) : null, kneeMarginMin = marg.length ? mn(marg.map(q => q.margin[3])) : null, ikErrMaxC = SWc.length ? mx(SWc.map(q => q.ikErr ?? 0)) : null;
  let ledgerMax = 0, bOffAnkle = 0, bWithoutC = 0, bMax = 0; for (const x of R) { if (!x.L) continue; x.L.forEach((ax, j) => { if (!ax) return; ax.forEach(L => { if (!L) return; const sum = L.statics + L.d1 + L.kp + L.vffServo + L.passiveRef; ledgerMax = Math.max(ledgerMax, Math.abs(L.tau0 - sum) / Math.max(1, Math.abs(L.tau0)));
    if (L.passiveRef !== 0) { bMax = Math.max(bMax, Math.abs(L.passiveRef)); if (j !== 2) bOffAnkle++; if (!(L.c > 0)) bWithoutC++; } }); }); }
  let dcMax = 0, dwAbad = 0; const rel = 0.10; for (let i = 1; i < se.c.length; i++) { const dc = Math.abs(se.c[i] - se.c[i - 1]); dcMax = Math.max(dcMax, dc); }
  const aRows = R.filter(x => x.a != null); for (let i = 1; i < aRows.length; i++) { const x = aRows[i], y = aRows[i - 1]; if (Math.abs(x.wA - y.wA) > Math.abs(x.a - y.a) + Math.abs(x.cw - y.cw) + 1e-9) dwAbad++; }
  return { reachRT, n: S.length, rms: rms(e), peak: e.length ? mx(e) : null, num, den, ny, dy, nyA, dyA, nyL, dyL, phiAir, tNCrel: ev.tC != null ? (tNC - ev.tC) / dt : null, badOut, badTr, trA, trC, dlow, satFracMax, satLongestMs, dTauMax, dTau0Max, badA, badC, badSw, dTauSwMax, closMax, closPos, early, tdN, rebound, chatter,
    abort: ev.abortT != null, finalOk: ev.finalStates.every(s2 => s2 === "SUPPORT"), overCap: r.integrity.overCap, authority: r.integrity.authorityWrites, phiC: ev.phiC, noLift: ev.noLift, failedTD: ev.failedTD,
    tiltMean, tilt80, ey85, marginMin, kneeMarginMin, ikErrMaxC, ledgerMax, bOffAnkle, bWithoutC, bMax, dcMax, dcLimit: dt / rel + 2e-6, dwAbad, h7: r.hashes["7"] || null,
    // FB additions (shared windows)
    _tNC: tNC, _tSup: tSup, _exc: exc }; }
// ── TD2 per-run metrics (prereg §3 definitions; row times recorded to 1e-6 s) ──
export function tdMetrics(r, m) { const dt = 1 / r.hz, T = r.tr.T, R = r.rows, ev = r.events, n = r.swing, se = r.series, W = r.W, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), tLo = ev.tLo, t1 = r.t1, P = r.td2.params;
  const tS = tLo != null ? tLo + T + (P && P.tauD ? P.tauD : 0) : null, nS = 1 - n, tSup = r.tSup ?? Infinity, pci0 = t1 != null ? Math.min(tS ?? Infinity, t1 - dt) : (tS ?? Infinity); let v = { sw: 0, pci: 0, out: 0, all: 0 }, worst = { pci: 0, all: 0 };
  se.t.forEach((t, i) => { if (t < 0.5 - 1e-9) return; const vA = se.dTau[i] > (m._exc.has(i) ? 25 : 10) * rsA, vC = se.dTau0[i] > 30 * rs, k = t >= pci0 - dt / 2 && t < tSup - dt / 2 ? "pci" : tLo != null && t > tLo + 1e-9 && t < pci0 - dt / 2 ? "sw" : "out";
    const ratio = Math.max(se.dTau0[i] / (30 * rs), se.dTau[i] / ((m._exc.has(i) ? 25 : 10) * rsA)); worst.all = Math.max(worst.all, ratio); if (k === "pci") worst.pci = Math.max(worst.pci, ratio); if (vA || vC) { v[k]++; v.all++; } });
  const i1 = t1 != null ? R.findIndex(x => Math.abs(x.t - t1) < 1e-7) : -1, x0 = i1 > 0 ? R[i1 - 1] : null, win = i1 >= 0 ? R.slice(i1).filter(x => x.t <= t1 + 0.1 + 1e-7) : [];
  const impact = win.length ? mx(win.map(x => x.Fz)) / W : null, imp12 = win.length ? mx(win.filter(x => x.t <= t1 + 0.012 + 1e-7).map(x => x.Fz)) / W : null;
  let w10 = null; if (win.length) { w10 = 0; for (let i = 0; i < win.length; i++) { let s = 0, tt = 0; for (let j = i; j < win.length && tt < 0.010 - 1e-12; j++) { const d = Math.min(dt, 0.010 - tt); s += win[j].Fz * d; tt += d; } w10 = Math.max(w10, s / 0.010 / W); } }
  const impulse = (dur) => (i1 >= 0 ? R.slice(i1).filter(x => x.t < t1 + dur - 1e-7).reduce((a, x) => a + x.Fz * dt, 0) : null), pen = win.length && r.lowRest != null ? mn(win.map(x => x.low)) - r.lowRest : null;
  const tr = r.trans.filter(q => q.n === n && tLo != null && q.t > tLo - 1e-9), tdN = tr.filter(q => q.to === "TOUCHDOWN").length, reb = tr.filter(q => q.from === "TOUCHDOWN" && q.to === "AIRBORNE").length, laN = tr.filter(q => q.to === "LOAD_ACCEPT").length;
  const la = tr.find(q => q.to === "LOAD_ACCEPT"), sup = la ? tr.find(q => q.t > la.t && q.to === "SUPPORT") : null, post = r.post || [], pS = post.find(q => r.tSup != null && q.t >= r.tSup - 1e-7);
  const place = pS && r.goal ? Math.hypot(pS.p[0] - r.goal.pos[0], pS.p[1] - r.goal.pos[2]) * 1000 : null, yawD = pS && pS.yaw != null && r.goal ? wrap(pS.yaw - yawOf(r.goal.rot)) : null;
  const slip = post.length ? mx(post.filter(q => q.t <= tSup + 1e-7).map(q => Math.hypot(q.p[0] - post[0].p[0], q.p[1] - post[0].p[1]) * 1000)) : null;
  // B-8: the commanded reference against the ACTIVE search floor before contact (first search: commanded foothold + h_B − D_max; after the escalation: the planner's turf floor)
  const preC = R.filter(x => x.ph === "swing" && (x.srch || x.re) && (ev.tC == null || x.t < ev.tC - 1e-7)), floorOf = (x) => (r.td2.failedTD != null && x.t >= r.td2.failedTD - 1e-7 && r.td2.reFloor != null ? r.td2.reFloor : r.goal.pos[1] + (P ? P.hB - P.Dmax : 0));
  const refMin = preC.length && r.goal && P ? mn(preC.map(x => x.ref.p[1] - floorOf(x))) : null;
  const xt = x0 ? { tilt: x0.tiltErr } : {}, yawSup = pS && pS.yaw != null ? pS.yaw : null, stanceTr = r.trans.filter(q => q.n === nS && ev.tCmd != null && q.t >= ev.tCmd - 1e-9);
  const tdBeforeEsc = r.td2.failedTD != null ? tr.filter(q => q.to === "TOUCHDOWN" && q.t < r.td2.failedTD - 1e-9).length : null, seq = tr.map(q => q.to).join(">");
  // the new region's tracking deviation (reported, Decision 4): reference minus actual lowest boot point, approach φ ∈ [0.8, 1.0) and during the search, before the first touching tick
  const dev = (S) => (S.length ? mx(S.map(x => x.lowRef - x.low)) : null), pre1 = R.filter(x => x.u != null && (t1 == null || x.t < t1 - 1e-7)), devA = dev(pre1.filter(x => x.u / T >= 0.8 - 1e-9 && x.u < T - 1e-9)), devS = dev(pre1.filter(x => x.srch));
  return { tilt1: xt.tilt ?? null, yawSup, stanceTr: stanceTr.length, stanceTrBeforeSup: stanceTr.filter(q => r.tSup == null || q.t < r.tSup - 1e-9).length, tdFail: r.td2.tdFail, reFloor: r.td2.reFloor, acceptPhi: r.td2.acceptPhi, earlySeen: r.td2.earlySeen,
    swingSupportEver: r.trans.some(q => q.n === n && tLo != null && q.t > tLo && q.to === "SUPPORT"), viaLA: (() => { const s1 = tr.findIndex(q => q.to === "SUPPORT"); return s1 > 0 && tr[s1 - 1].to === "LOAD_ACCEPT"; })(), supT: r.tSup != null && t1 != null ? r.tSup - t1 : null, W,
    t1, tS, tC1: t1 != null && tS != null ? t1 - tS : null, v, worst, vN: x0 ? x0.pc.vN : null, vT: x0 ? x0.pc.vT : null, fvN: x0 ? -x0.foot.v[1] : null, fvT: x0 ? Math.hypot(x0.foot.v[0], x0.foot.v[2]) : null, wF: x0 ? hyp(x0.wF) : null,
    impact, imp12, w10, i20: impulse(0.020), i50: impulse(0.050), pen, tdN, reb, laN, laSup: la && sup ? sup.t - la.t : null, tSupAbs: r.tSup, place, yawD, slip, refMin, tdBeforeEsc, esc: r.td2.failedTD, seq, devA, devS, phase: r.td2.tdPhase, params: P }; }

export function guardLaw(entries, hz, tau) { const dt = 1 / hz, sDt = 15 * 240 / hz, lim = 30 * 240 / hz, byTick = new Map(entries.map(e => [e.tick, e])), s = (C) => Math.min(dt / tau, C > 0 ? sDt / C : Infinity);
  const R = { n: entries.length, lawBad: 0, lawWorst: 0, srcBad: 0, wBad: 0, cBad: 0, attrMax: 0, attrBad: 0, rateMax: 0, srcInvalid: 0, carryOver: 0, fades: 0, ramps: 0, heldMax: 0, why: [] };
  const maxAbs = (e, j) => (e && e.ax && e.ax.length ? Math.max(...e.ax.map(a => Math.abs(a[j]))) : 0);
  for (const e of entries) { const p = byTick.get(e.tick - 1) || null, wPrev = p ? p.w : 1, pm = p ? p.mode : "PASS"; R.rateMax = Math.max(R.rateMax, e.rateEnv || 0);
    for (const a of e.ax || []) { const [, , dvx, dvu] = a; if (e.mode === "FADE" || e.mode === "RAMP") { const d = Math.abs(dvx - e.w * dvu); R.lawWorst = Math.max(R.lawWorst, d); if (d > 1e-9 + 1e-12 * Math.abs(dvu)) R.lawBad++; } else if (e.mode === "OFF" && Math.abs(dvx) > 1e-12) R.lawBad++; }
    if (e.mode === "FADE") { R.heldMax = Math.max(R.heldMax, maxAbs(e, 3)); const want = p ? p.srcTick : e.tick - 1; if (e.srcTick !== want) { R.srcBad++; if (R.why.length < 5) R.why.push(`tick ${e.tick}: FADE source ${e.srcTick} ≠ ${want}`); }
      const se = byTick.get(e.srcTick), okOf = (x) => (x.valid != null ? x.valid : !!(x.okR && x.okC && x.okF && x.okT)); if (se) { if (!okOf(se)) R.srcInvalid++; } else R.carryOver++; if (pm !== "FADE") R.fades++; }
    if (e.mode === "RAMP" && pm === "OFF") R.ramps++;
    const exp = e.mode === "FADE" ? wPrev - s(e.Cprev) : e.mode === "RAMP" ? (pm === "OFF" ? s(e.Cprev) : wPrev + s(e.Cprev)) : null;
    if (exp != null && Math.abs(e.w - exp) > 1e-12) { R.wBad++; if (R.why.length < 5) R.why.push(`tick ${e.tick}: ${e.mode} w ${e.w} vs ${exp}`); }
    if (e.mode === "OFF" && (pm === "FADE" || pm === "RAMP") && !(wPrev - s(e.Cprev) <= 1e-12)) R.wBad++;
    if (e.mode === "PASS" && pm === "RAMP" && !(wPrev + s(e.Cprev) >= 1 - 1e-12 && e.w === 1)) R.wBad++;
    const cRef = !p ? null : e.mode === "RAMP" ? maxAbs(p, 4) : (e.mode === "FADE" || (e.mode === "OFF" && (pm === "FADE" || pm === "RAMP" || pm === "PASS"))) && pm !== "OFF" ? maxAbs(p, 3) : null;   // the preceding tick's measured unit contribution
    if (cRef != null && Math.abs(e.Cprev - cRef) > 1e-9 * Math.max(1, cRef)) { R.cBad++; if (R.why.length < 5) R.why.push(`tick ${e.tick}: slew reference ${e.Cprev} vs measured ${cRef}`); }
    const dw = Math.abs(e.w - wPrev); if (dw > 0) for (const a of e.ax || []) { const v = dw * Math.abs(a[3]); R.attrMax = Math.max(R.attrMax, v); if (v > lim + 1e-9) R.attrBad++; } }
  R.ok = !R.lawBad && !R.srcBad && !R.wBad && !R.cBad && !R.attrBad && R.rateMax < 1 && !R.srcInvalid; return R; }
