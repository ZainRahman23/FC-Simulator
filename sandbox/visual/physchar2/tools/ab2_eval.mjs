// ═══ physchar2/tools/ab2_eval.mjs — evaluation of the VERSIONED A + B swing-contract amendment AB2 (e2/AB2_VALIDATION_PREREG.md; written with it, before any AB2 run). A copy of the
// frozen tools/ab_eval.mjs (unchanged, its FAIL verdict preserved) with exactly the two re-owned regions, defined from measured-contact / lifecycle semantics:
//   (1) A's pelvis-motion compensation (AB2-7) is measured from the first tick at which the lifecycle reports the swing foot genuinely airborne (state AIRBORNE and airborne
//       weight a = 1) to φ 0.8; the liftoff transient [measured liftoff, that tick) is reported as a separate diagnostic (β_y per configuration), not gated.
//   (2) Torque continuity: the swing requirement (AB2-4a) covers the measured liftoff up to — not including — the solver step that contains the first measured Jolt contact of the
//       swing foot (t_nc = first tick with touching pieces − dt); the near-contact / contact-transition region [t_nc, first SUPPORT of the landed foot) is owned by the touchdown
//       coordinator validation: its continuity is REPORTED here (runs, max commanded / applied Δτ) as the requirement the coordinator must meet, never exempted. AB2-4b (no
//       regression) counts violations OUTSIDE that region only.
// Every other criterion, threshold and definition is the frozen AB one.
// usage: node tools/ab2_eval.mjs --dir=<runs> --list=<run list json> [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "."), LIST = JSON.parse(fs.readFileSync(arg("list", ""))), JS = arg("json", "");
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity), mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length)), BINS = []; for (let i = 0; i < 12; i++) BINS.push([+(0.2 + 0.05 * i).toFixed(2), +(0.25 + 0.05 * i).toFixed(2)]);
const binOf = (phi) => { for (let i = 0; i < BINS.length; i++) if (phi >= BINS[i][0] - 1e-9 && (phi < BINS[i][1] - 1e-9 || (i === BINS.length - 1 && phi <= 0.8 + 1e-9))) return i; return -1; };
const CFGS = { BASE: "PSTAR5CH", A: "PSTAR5CHA", B: "PSTAR5CHB", AB: "PSTAR5CHAB" }, SETS = { "R-F": "R", "R-L": "R", "C-F7": "C", "C-F13": "C", "C-L5": "C", "H-T45": "H", "H-A40": "H", "H-D": "H", "H-F15": "H" };
function runMetrics(r) { const dt = 1 / r.hz, wn = r.wn, T = r.tr.T, R = r.rows, W = r.W, ev = r.events, n = r.swing;
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
  // additions
  const atPh = (ph) => S.find(q => q.u / T >= ph - 1e-9) || null, tw = SWc.filter(q => q.u / T >= 0.6 - 1e-9 && q.u / T <= 0.85 + 1e-9);
  const tiltMean = tw.length ? mean(tw.map(q => q.tiltErr)) : null, tilt80 = atPh(0.8) ? atPh(0.8).tiltErr : null, ey85r = SWc.find(q => q.u / T >= 0.85 - 1e-9), ey85 = ey85r ? 1000 * (ey85r.foot.p[1] - ey85r.ref.p[1]) : null;
  const marg = SWc.filter(q => q.margin), marginMin = marg.length ? mn(marg.map(q => mn(q.margin))) : null, kneeMarginMin = marg.length ? mn(marg.map(q => q.margin[3])) : null, ikErrMaxC = SWc.length ? mx(SWc.map(q => q.ikErr ?? 0)) : null;
  let ledgerMax = 0, bOffAnkle = 0, bWithoutC = 0, bMax = 0; for (const x of R) { if (!x.L) continue; x.L.forEach((ax, j) => { if (!ax) return; ax.forEach(L => { if (!L) return; const sum = L.statics + L.d1 + L.kp + L.vffServo + L.passiveRef; ledgerMax = Math.max(ledgerMax, Math.abs(L.tau0 - sum) / Math.max(1, Math.abs(L.tau0)));
    if (L.passiveRef !== 0) { bMax = Math.max(bMax, Math.abs(L.passiveRef)); if (j !== 2) bOffAnkle++; if (!(L.c > 0)) bWithoutC++; } }); }); }
  let dcMax = 0, dwAbad = 0; const rel = 0.10; for (let i = 1; i < se.c.length; i++) { const dc = Math.abs(se.c[i] - se.c[i - 1]); dcMax = Math.max(dcMax, dc); }
  const aRows = R.filter(x => x.a != null); for (let i = 1; i < aRows.length; i++) { const x = aRows[i], y = aRows[i - 1]; if (Math.abs(x.wA - y.wA) > Math.abs(x.a - y.a) + Math.abs(x.cw - y.cw) + 1e-9) dwAbad++; }
  return { reachRT, n: S.length, rms: rms(e), peak: e.length ? mx(e) : null, num, den, ny, dy, nyA, dyA, nyL, dyL, phiAir, tNCrel: ev.tC != null ? (tNC - ev.tC) / dt : null, badOut, badTr, trA, trC, dlow, satFracMax, satLongestMs, dTauMax, dTau0Max, badA, badC, badSw, dTauSwMax, closMax, closPos, early, tdN, rebound, chatter,
    abort: ev.abortT != null, finalOk: ev.finalStates.every(s2 => s2 === "SUPPORT"), overCap: r.integrity.overCap, authority: r.integrity.authorityWrites, phiC: ev.phiC, noLift: ev.noLift, failedTD: ev.failedTD,
    tiltMean, tilt80, ey85, marginMin, kneeMarginMin, ikErrMaxC, ledgerMax, bOffAnkle, bWithoutC, bMax, dcMax, dcLimit: dt / rel + 2e-6, dwAbad, h7: r.hashes["7"] || null }; }
const runs = {}, missing = [];
for (const q of LIST.runs) { const f = path.join(DIR, `ab_${q.cfg}_${q.body}_${q.side}_${q.hz}_${q.traj}.json.gz`); if (!fs.existsSync(f)) { missing.push(path.basename(f)); continue; }
  const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))); runs[`${q.cfg}|${q.body}|${q.side}|${q.hz}|${q.traj}`] = { q, set: SETS[q.traj], m: runMetrics(r) }; }
const K = (cfg, q) => `${cfg}|${q.body}|${q.side}|${q.hz}|${q.traj}`, ok = (k) => runs[k] && !runs[k].m.reachRT, sel = (cfg, fn = () => true) => Object.entries(runs).filter(([k, R]) => R.q.cfg === cfg && ok(k) && fn(R));
const out = { missing, reach: Object.entries(runs).filter(([, R]) => R.m.reachRT).map(([k, R]) => `${k}: ${R.m.reachRT}`), checks: {}, causal: {}, perTraj: {}, failures: [] }, F = (id, why) => out.failures.push(`${id}: ${why}`);
const KEYN = { "3": ["num", "den"], y: ["ny", "dy"], yA: ["nyA", "dyA"], yL: ["nyL", "dyL"] };
const ids = Object.keys(SETS), pool = (cfg, id, key) => { const s = sel(CFGS[cfg], R => R.q.traj === id), [kn, kd] = KEYN[key]; const nn = s.reduce((a, [, R]) => a + R.m[kn], 0), dd = s.reduce((a, [, R]) => a + R.m[kd], 0); return dd > 0 ? nn / dd : null; };
for (const id of ids) { const P = {}; for (const c of Object.keys(CFGS)) { const s = sel(CFGS[c], R => R.q.traj === id); P[c] = { n: s.length, beta: pool(c, id, "3"), betaY: pool(c, id, "y"), betaYair: pool(c, id, "yA"), betaYlift: pool(c, id, "yL"), phiAir: mean(s.map(([, R]) => R.m.phiAir).filter(v => v != null)), trRuns: s.filter(([, R]) => R.m.badTr).length, trC: s.length ? mx(s.map(([, R]) => R.m.trC)) : null, trA: s.length ? mx(s.map(([, R]) => R.m.trA)) : null, tiltMean: mean(s.map(([, R]) => R.m.tiltMean).filter(v => v != null)), ey85: mean(s.map(([, R]) => R.m.ey85).filter(v => v != null)),
    binWorst: s.length ? mn(s.map(([, R]) => Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm))) : null, marginMin: s.length ? mn(s.map(([, R]) => R.m.marginMin)) : null, phiC: mean(s.map(([, R]) => R.m.phiC).filter(v => v != null)),
    runsSwViol: s.filter(([, R]) => R.m.badSw).length, runsViol: s.filter(([, R]) => R.m.badA || R.m.badC).length, rmsMean: mean(s.map(([, R]) => R.m.rms)), peakMax: s.length ? mx(s.map(([, R]) => R.m.peak)) : null,
    binsWorst: BINS.map((_, b) => (s.length ? mn(s.map(([, R]) => Math.min(R.m.dlow[b].ev, R.m.dlow[b].tm))) : null)) }; } out.perTraj[id] = P; }
const AB = (fn) => sel(CFGS.AB, fn), RC = (R) => R.set === "R" || R.set === "C";
// AB-1 T-1 (frozen): pooled |β| ≤ 0.25 per trajectory id
for (const id of ids) { const b = out.perTraj[id].AB.beta; if (!(b != null && Math.abs(b) <= 0.25)) F("AB-1", `${id} pooled β ${f2(b, 3)} (|β| ≤ 0.25)`); }
// AB-2 T-2 / AB-3 T-3
for (const [k, R] of AB()) { if (!(R.m.peak <= 10 && R.m.rms <= 5)) F("AB-2", `${k} peak ${f2(R.m.peak)} RMS ${f2(R.m.rms)} mm`);
  if (RC(R) && R.q.hz !== 240) { const k2 = K(CFGS.AB, { ...R.q, hz: 240 }); if (ok(k2)) { const b = runs[k2].m; if (!(Math.abs(R.m.peak - b.peak) <= 2 && Math.abs(R.m.rms - b.rms) <= 1)) F("AB-3", `${k} peak ${f2(R.m.peak)} vs ${f2(b.peak)}, RMS ${f2(R.m.rms)} vs ${f2(b.rms)}`); } } }
// AB-4 continuity
for (const [k, R] of AB()) { if (R.m.badSw) F("AB-4a", `${k} E1a-7 violation in the swing (applied Δτ max in swing ${f2(R.m.dTauSwMax)} N·m)`); if (R.m.dcMax > R.m.dcLimit) F("AB-4c", `${k} |Δc| ${R.m.dcMax}`); if (R.m.dwAbad) F("AB-4c", `${k} w_A step beyond |Δa| + |Δc| on ${R.m.dwAbad} ticks`); }
for (const set of ["R", "C", "H"]) { const nb = sel(CFGS.BASE, R => R.set === set).filter(([, R]) => R.m.badOut).length, na = AB(R => R.set === set).filter(([, R]) => R.m.badOut).length; out.checks[`AB-4b ${set}`] = { base: nb, ab: na }; if (na > nb) F("AB-4b", `set ${set}: runs with E1a-7 violations outside the contact-transition region AB ${na} > BASE ${nb}`); }
for (const set of ["R", "C", "H"]) for (const c of Object.keys(CFGS)) { const s = sel(CFGS[c], R => R.set === set); out.checks[`TR ${set} ${c}`] = { runsWithViolation: s.filter(([, R]) => R.m.badTr).length, n: s.length, maxCmd: s.length ? mx(s.map(([, R]) => R.m.trC)) : null, maxApplied: s.length ? mx(s.map(([, R]) => R.m.trA)) : null }; }
// AB-5 energy (R, C)
for (const [k, R] of AB(RC)) if (R.m.closMax > 0.05 || R.m.closPos > 0.5 || R.m.authority) F("AB-5", `${k} closure max ${R.m.closMax.toExponential(2)} J/tick, Σ+ ${f2(R.m.closPos, 3)} J, authority ${R.m.authority}`);
// AB-6 orientation, AB-7 vertical (per R / C trajectory id)
for (const id of ids.filter(i => SETS[i] !== "H")) { const P = out.perTraj[id]; if (!(P.AB.tiltMean <= 0.5 * P.BASE.tiltMean)) F("AB-6", `${id} AB mean tilt ${f2(P.AB.tiltMean, 3)}° > 0.5 × BASE ${f2(P.BASE.tiltMean, 3)}°`);
  if (!(P.B.tiltMean <= 0.5 * P.BASE.tiltMean)) F("C-2", `${id} B mean tilt ${f2(P.B.tiltMean, 3)}° > 0.5 × BASE ${f2(P.BASE.tiltMean, 3)}° (M2 prediction)`);
  if (!(Math.abs(P.A.tiltMean - P.BASE.tiltMean) <= 0.25 * P.BASE.tiltMean)) F("C-2", `${id} A mean tilt ${f2(P.A.tiltMean, 3)}° not within ±25 % of BASE ${f2(P.BASE.tiltMean, 3)}° (A should not address M2)`);
  if (!(P.AB.betaYair <= 0.5 * P.BASE.betaYair && P.A.betaYair <= 0.5 * P.BASE.betaYair)) F("AB-7", `${id} airborne-window β_y AB ${f2(P.AB.betaYair, 3)} A ${f2(P.A.betaYair, 3)} (≤ 0.5 × BASE ${f2(P.BASE.betaYair, 3)})`);
  if (!(Math.abs(P.B.betaY - P.BASE.betaY) <= 0.05)) F("C-3", `${id} β_y B ${f2(P.B.betaY, 3)} vs BASE ${f2(P.BASE.betaY, 3)} (B should not address M1: ±0.05)`); }
// C-1 T-1 collapse for the predicted reason (C-F7, C-L5)
for (const id of ["C-F7", "C-L5"]) { const P = out.perTraj[id]; out.causal[id] = { BASE: P.BASE.beta, A: P.A.beta, B: P.B.beta, AB: P.AB.beta };
  if (!(P.BASE.beta > 0.25)) F("C-1", `${id} BASE β ${f2(P.BASE.beta, 3)} does not reproduce the SV-2 failure (> 0.25)`); if (!(P.A.beta <= 0.25 && P.AB.beta <= 0.25)) F("C-1", `${id} A ${f2(P.A.beta, 3)} / AB ${f2(P.AB.beta, 3)} not ≤ 0.25`);
  if (!(Math.abs(P.B.beta - P.BASE.beta) <= 0.05)) F("C-1", `${id} B β ${f2(P.B.beta, 3)} vs BASE ${f2(P.BASE.beta, 3)} (±0.05)`); if (!(Math.abs(P.AB.beta - P.A.beta) <= 0.05)) F("C-1", `${id} AB β ${f2(P.AB.beta, 3)} vs A ${f2(P.A.beta, 3)} (±0.05)`); }
// AB-8 clearance, binding window [0.75, 0.80], R + C, both conventions
{ const w = mn(AB(RC).map(([, R]) => Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm))); out.checks["AB-8"] = { abWorstMm: w, baseWorstMm: mn(sel(CFGS.BASE, RC).map(([, R]) => Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm))) }; if (!(w >= -0.80)) F("AB-8", `worst d_low in [0.75, 0.80] ${f2(w)} mm (≥ −0.80)`); }
// AB-9 IK reach + soft-limit margin through contact (R, C)
for (const [k, R] of AB(RC)) { const kb = K(CFGS.BASE, R.q); if (R.m.ikErrMaxC > 1e-6 || !(R.m.marginMin > 0)) F("AB-9", `${k} IK residual ${R.m.ikErrMaxC} / min soft-limit margin ${f2(R.m.marginMin)}° (liftoff → contact)`);
  else if (ok(kb) && R.m.marginMin < runs[kb].m.marginMin - 2) F("AB-9", `${k} min margin ${f2(R.m.marginMin)}° < BASE ${f2(runs[kb].m.marginMin)}° − 2°`); }
// AB-10 rate stability of tilt and binding-bin deviation (R, C)
for (const [k, R] of AB(RC)) { if (R.q.hz === 240) continue; const k2 = K(CFGS.AB, { ...R.q, hz: 240 }); if (!ok(k2)) continue; const b = runs[k2].m, d1 = Math.min(R.m.dlow[11].ev, R.m.dlow[11].tm), d2 = Math.min(b.dlow[11].ev, b.dlow[11].tm);
  if (!(Math.abs(R.m.tiltMean - b.tiltMean) <= 0.2 && Math.abs(d1 - d2) <= 0.3)) F("AB-10", `${k} tilt ${f2(R.m.tiltMean, 3)} vs ${f2(b.tiltMean, 3)}°, bin d_low ${f2(d1)} vs ${f2(d2)} mm (240 Hz)`); }
// integrity (SV-2 I-1, I-4 … I-7 on AB; I-6 / I-7 for R, C; H reported)
for (const [k, R] of AB()) { const rc = RC(R); if (R.m.overCap) F("I-1", `${k} over-capacity ${R.m.overCap}`); if (rc && (R.m.satFracMax > 0.05 || R.m.satLongestMs > 50 + 1e-9)) F("I-4", `${k} saturation ${f2(100 * R.m.satFracMax, 1)} % / ${f2(R.m.satLongestMs, 0)} ms`);
  if (R.m.early || R.m.noLift || R.m.failedTD) F("I-5", `${k} early ${R.m.early} noLift ${R.m.noLift} failedTD ${R.m.failedTD}`); if (rc && !(R.m.tdN === 1 && R.m.rebound === 0 && R.m.chatter === 0)) F("I-6", `${k} TOUCHDOWN ${R.m.tdN} rebound ${R.m.rebound} re-entries ${R.m.chatter}`); if (rc && (R.m.abort || !R.m.finalOk)) F("I-7", `${k} abort ${R.m.abort} final ${R.m.finalOk}`); }
// ledger and identity before the step command (every configuration)
for (const [k, R] of Object.entries(runs)) { if (R.m.ledgerMax > 1e-9) F("L-1", `${k} ledger closure ${R.m.ledgerMax.toExponential(2)}`); if (R.m.bOffAnkle || R.m.bWithoutC) F("L-2", `${k} B off the ankle ${R.m.bOffAnkle} / without a commanded swing ${R.m.bWithoutC}`);
  const kb = K(CFGS.BASE, R.q); if (R.q.cfg !== CFGS.BASE && runs[kb] && R.m.h7 !== runs[kb].m.h7) F("G-3", `${k} hash at 7 s ${R.m.h7} ≠ BASE ${runs[kb].m.h7}`); }
const IDS = ["AB-1", "AB-2", "AB-3", "AB-4a", "AB-4b", "AB-4c", "AB-5", "AB-6", "AB-7", "AB-8", "AB-9", "AB-10", "I-1", "I-4", "I-5", "I-6", "I-7", "L-1", "L-2", "G-3", "C-1", "C-2", "C-3"];
for (const id of IDS) { const fl = out.failures.filter(x => x.startsWith(id + ":")); out.checks[id] = { ...(out.checks[id] || {}), pass: fl.length === 0 && missing.length === 0, failures: fl.length }; }
out.validates = missing.length === 0 && IDS.every(id => out.checks[id].pass);
console.log(`runs ${Object.keys(runs).length}/${LIST.runs.length}${missing.length ? " MISSING " + missing.length : ""}; runtime reachability exclusions ${out.reach.length}`); out.reach.slice(0, 6).forEach(x => console.log("   reach: " + x));
console.log("trajectory | β (T-1, pooled) BASE / A / B / AB | β_y BASE / A / B / AB | mean tilt φ .6–.85 (°) BASE / A / B / AB | e_y φ .85 (mm) BASE / AB | worst d_low [.75,.80] (mm) BASE / A / B / AB | contact φ BASE / AB | min soft-limit margin (°) BASE / AB");
for (const id of ids) { const P = out.perTraj[id], c4 = (key, d = 3) => ["BASE", "A", "B", "AB"].map(c => f2(P[c][key], d)).join(" / ");
  console.log(`  ${id.padEnd(6)} | ${c4("beta")} | ${c4("betaY")} | ${c4("tiltMean")} | ${f2(P.BASE.ey85)} / ${f2(P.AB.ey85)} | ${c4("binWorst", 2)} | ${f2(P.BASE.phiC, 3)} / ${f2(P.AB.phiC, 3)} | ${f2(P.BASE.marginMin, 1)} / ${f2(P.AB.marginMin, 1)}`); }
console.log("A's compensation window: mean φ at which the lifecycle reports a = 1 (AIRBORNE) | pooled β_y over the airborne window BASE / A / B / AB | liftoff-transient β_y (diagnostic) BASE / A / B / AB");
for (const id of ids) { const P = out.perTraj[id], c4 = (key) => ["BASE", "A", "B", "AB"].map(c => f2(P[c][key], 3)).join(" / "); console.log(`  ${id.padEnd(6)} | φ_air ${f2(P.AB.phiAir, 3)} | ${c4("betaYair")} | ${c4("betaYlift")}`); }
console.log("CONTACT-TRANSITION region [step containing the first measured contact, SUPPORT) — owned by the touchdown coordinator (reported, not exempted): runs with E1a-7 violations / max commanded Δτ0 / max applied Δτ");
for (const set of ["R", "C", "H"]) console.log(`  ${set}: ` + Object.keys(CFGS).map(c => { const x = out.checks[`TR ${set} ${c}`]; return `${c} ${x.runsWithViolation}/${x.n} cmd ${f2(x.maxCmd, 1)} app ${f2(x.maxApplied, 1)}`; }).join(" | "));
console.log("per-bin worst d_low (mm), R + C, BASE vs AB (φ 0.20 … 0.75):"); for (const c of ["BASE", "AB"]) console.log(`  ${c.padEnd(4)} ` + BINS.map((_, b) => f2(mn(ids.filter(i => SETS[i] !== "H").map(i => out.perTraj[i][c].binsWorst[b])))).join(" "));
for (const [id, c] of Object.entries(out.checks)) if (c.pass !== undefined) console.log(`${c.pass ? "PASS" : "FAIL"} ${id} (${c.failures} failing items)`);
for (const id of IDS) out.failures.filter(x => x.startsWith(id + ":")).slice(0, 5).forEach(x => console.log("   " + x));
console.log(`AB-4b runs with E1a-7 violations BASE vs AB: ` + ["R", "C", "H"].map(s2 => `${s2} ${out.checks["AB-4b " + s2].base} → ${out.checks["AB-4b " + s2].ab}`).join(", ") + ` | AB-8 worst binding window: BASE ${f2(out.checks["AB-8"].baseWorstMm)} → AB ${f2(out.checks["AB-8"].abWorstMm)} mm`);
console.log(out.validates ? "AB2: A + B SWING CONTRACT VALIDATES" : "AB2: A + B SWING CONTRACT DOES NOT VALIDATE");
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(runs).map(([k, R]) => [k, { q: R.q, set: R.set, m: { ...R.m, num: undefined, den: undefined } }])) }, null, 1));
