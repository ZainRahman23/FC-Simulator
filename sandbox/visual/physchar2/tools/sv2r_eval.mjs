// ═══ physchar2/tools/sv2r_eval.mjs — SV-2R: the swing / servo RE-QUALIFICATION for PG-1 on the final configuration (e2/SV2R_PREREG.md; written before the TD2C battery ran).
// A versioned copy of tools/swing_servo_eval2.mjs (SV-2's frozen evaluator): every criterion line (T-1 … T-3, I-1 … I-7), the validation rule and the §6 allowance rule are
// VERBATIM; only the input changes — the TD2C battery's nominal-terrain records of the final configuration PSTAR5CHABTDV (A + B + DVG + TD2C touchdown),
// <dir>/td2c_PSTAR5CHABTDV_nominal_<body>_<side>_<hz>_<traj>.json.gz, listed from the amended TD2C run list (--list=<TD2C_RUN_LIST.json>).
// (original header follows) evaluation of the swing-servo validation v2 (SV-2; e2/SWING_SERVO_VALIDATION_V2_PREREG.md §4 – §6; written before the battery ran).
// Reads tools/swing_servo_val2.mjs records <dir>/sv2_<body>_<side>_<hz>_<ff>_<traj>.json.gz and the frozen run list (--list=<json>). FOUR SEPARATE VERDICTS:
//   REACHABILITY (reported, never mixed into the others): pre-freeze rejections (from the list), runtime pre-check rejections, runtime unreached IK targets in the swing window;
//     a run failing reachability is excluded from tracking, integrity and the allowance and listed separately.
//   TRACKING ACCURACY (VAL-ON, reachable runs): T-1 D1 mechanism |β_ON| ≤ 0.25 pooled per trajectory id; T-2 E2-level tracking peak ≤ 10 mm and RMS ≤ 5 mm over φ ∈ [0, 0.8]
//     (every set); T-3 rate stability (R, C) |peak(hz) − peak(240)| ≤ 2 mm, |RMS(hz) − RMS(240)| ≤ 1 mm. Reported: RMS ON / OFF, β_OFF, the joint fit (β, γ, bias), lag.
//   INTEGRITY / ENERGY / TORQUE (VAL-ON, reachable runs): I-1 over-capacity 0; I-2 E1a-7 continuity (rate rule maxJumpSmooth, contact-onset windows) over the run; I-3 E1a-8
//     energy per run; I-4 saturation ≤ 5 % of swing rows and ≤ 50 ms continuous per leg axis (R, C); I-5 no swing-foot contact before φ 0.6; I-6 exactly one TOUCHDOWN of the
//     swing foot, no TOUCHDOWN→AIRBORNE, no state re-entered within 60 ms (either foot, from the step command); I-7 (R, C) no abort, both feet SUPPORT at the end.
//   VALIDATES iff every T and I item passes and every frozen run is present.
//   CLEARANCE ALLOWANCE (computed ONLY if it validates): per 0.05-φ bin of [0.2, 0.8], A = max(0, max downward deviation of the actual lowest boot point from the reference
//     pose's lowest boot point) over every reachable VAL-ON run of the R and C sets, all bodies / legs / rates, in BOTH conventions (the E2 evaluator's: the row's foot vs the
//     target computed one tick earlier; time-matched: vs the next row's target), rounded UP to 0.05 mm.
// Touchdown is reported (not a criterion here): contact φ, approach normal / tangential speed, instantaneous peak, max exact-window 10 / 20 ms mean load, 20 / 50 ms impulse,
//   penetration, rebound.
// usage: node tools/swing_servo_eval2.mjs --dir=<runs> --list=<frozen run list json> [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "."), TL = JSON.parse(fs.readFileSync(arg("list", ""))), JS = arg("json", "");
const LIST = { runs: TL.runs.filter(q => q.cfg === "PSTAR5CHABTDV" && q.cond === "nominal").map(q => ({ body: q.body, side: q.side, hz: q.hz, traj: q.traj, ff: "on" })), rejected: [] };   // SV-2R §2: TD2C nominal, final configuration (C-L11 excluded before runtime by the execution certifier)
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity);
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length)), BINS = []; for (let i = 0; i < 12; i++) BINS.push([+(0.2 + 0.05 * i).toFixed(2), +(0.25 + 0.05 * i).toFixed(2)]);
const binOf = (phi) => { for (let i = 0; i < BINS.length; i++) if (phi >= BINS[i][0] - 1e-9 && (phi < BINS[i][1] - 1e-9 || (i === BINS.length - 1 && phi <= 0.8 + 1e-9))) return i; return -1; };
// exact physical-time window mean of a piecewise-constant per-tick series (value v_i held over [t_i − dt, t_i)): max over window starts in [t0, t1]
// (the window mean is piecewise linear in the start a; its maximum lies where a or a + Tw meets a tick boundary, so both families of starts are evaluated)
function maxWindowMean(ts, vs, dt, Tw, t0, t1) { const starts = []; for (const t of ts) { starts.push(t - dt, t - Tw, t - dt - Tw, t); } let best = 0;
  for (const a of starts) { if (a < t0 - 1e-9 || a > t1 + 1e-9) continue; let acc = 0;
    for (let j = 0; j < ts.length; j++) { const lo = Math.max(ts[j] - dt, a), hi = Math.min(ts[j], a + Tw); if (hi > lo) acc += vs[j] * (hi - lo); } best = Math.max(best, acc / Tw); } return best; }
function runMetrics(r) { const dt = 1 / r.hz, wn = r.wn, T = r.tr.T, R = r.rows, W = r.W, ev = r.events, n = r.swing, m = 1 - n;
  const S = R.filter(x => x.ph === "swing" && x.u != null && x.u >= -1e-9 && x.u / T <= 0.8 + 1e-9), nx = (x) => R[R.indexOf(x) + 1];
  const reachRT = ev.reachRejected ? "pre-check rejected at runtime" : S.some(x => x.ikErr != null && x.ikErr > 1e-6) ? "IK target unreached in the swing window" : null;
  const ep = (x) => x.foot.p.map((v, i) => v - x.ref.p[i]), nrm = (v) => Math.hypot(v[0], v[1], v[2]), e = S.map(x => nrm(ep(x)) * 1000);
  let num = 0, den = 0; const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0];
  for (const x of S) for (let i = 0; i < 3; i++) { const q = x.foot.p[i] - x.ref.p[i], ga = -x.ref.a[i] / (wn * wn); num += q * ga; den += ga * ga; const g = [ga, -x.ref.v[i] * (1.6 / wn), 1]; for (let a = 0; a < 3; a++) { y[a] += g[a] * q; for (let b = 0; b < 3; b++) A[a][b] += g[a] * g[b]; } }
  const fit = (() => { const M = A.map((row, i) => [...row, y[i]]); for (let c = 0; c < 3; c++) { let p = c; for (let q = c + 1; q < 3; q++) if (Math.abs(M[q][c]) > Math.abs(M[p][c])) p = q; [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-18) return null;
      for (let q = 0; q < 3; q++) if (q !== c) { const k = M[q][c] / M[c][c]; for (let w = c; w < 4; w++) M[q][w] -= k * M[c][w]; } } return { beta: M[0][3] / M[0][0], gamma: M[1][3] / M[1][1], biasMm: 1000 * M[2][3] / M[2][2] }; })();
  // lowest-boot-point deviation per φ bin, both conventions (negative = boot lower than the reference pose's)
  const dlow = BINS.map(() => ({ ev: Infinity, tm: Infinity })); for (const x of S) { const b = binOf(x.u / T); if (b < 0) continue; dlow[b].ev = Math.min(dlow[b].ev, x.low - x.lowRef); const z = nx(x); if (z && z.lowRef != null) dlow[b].tm = Math.min(dlow[b].tm, x.low - z.lowRef); }
  // saturation over the swing until contact
  const SW = R.filter(x => x.ph === "swing" && x.u != null && x.u >= -1e-9), satRows = {}, run = {}, longest = {}; for (const x of SW) { const ss = new Set(x.sat); for (const k of Object.keys(run)) if (!ss.has(+k)) run[k] = 0; for (const k of ss) { run[k] = (run[k] || 0) + 1; satRows[k] = (satRows[k] || 0) + 1; longest[k] = Math.max(longest[k] || 0, run[k]); } }
  const satFracMax = Object.keys(satRows).length ? mx(Object.values(satRows)) / Math.max(1, SW.length) : 0, satLongestMs = Object.keys(longest).length ? mx(Object.values(longest)) * dt * 1000 : 0;
  // E1a-7 (rate rule maxJumpSmooth) over the run, t ≥ 0.5 s
  const se = r.series, rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs), nw = r.hz === 240 ? 2 : Math.max(2, Math.ceil(2 * r.hz / 240)), exc = new Set(); se.onset.forEach((o, i) => { if (o) for (let j = 0; j < nw; j++) exc.add(i + j); });
  let badA = 0, badC = 0, dTauMax = 0, dTau0Max = 0; se.t.forEach((t, i) => { if (t < 0.5 - 1e-9) return; dTauMax = Math.max(dTauMax, se.dTau[i]); dTau0Max = Math.max(dTau0Max, se.dTau0[i]); if (se.dTau[i] > (exc.has(i) ? 25 : 10) * rsA) badA++; if (se.dTau0[i] > 30 * rs) badC++; });
  const closMax = mx(se.closInc), closPos = se.closInc.reduce((s, v) => s + Math.max(0, v), 0);
  // contact before φ 0.6; touchdown lifecycle
  const early = ev.early || SW.some(x => x.touch > 0 && x.u / T < 0.6 - 1e-9), tr = r.trans.filter(q => ev.tLo != null && q.t >= ev.tLo - 1e-9), tdN = tr.filter(q => q.n === n && q.to === "TOUCHDOWN").length, rebound = tr.filter(q => q.n === n && q.from === "TOUCHDOWN" && q.to === "AIRBORNE").length;
  let chatter = 0; for (const k of [0, 1]) { const tt = r.trans.filter(q => q.n === k && ev.tCmd != null && q.t >= ev.tCmd - 1e-9); for (let i = 2; i < tt.length; i++) if (tt[i].to === tt[i - 2].to && tt[i].t - tt[i - 2].t < 0.06) chatter++; }
  // touchdown metrics (reported)
  // window: from 2 ticks before the measured contact state (the probe can register the contact before the debounced TOUCHDOWN) to 0.1 s after it
  let td = null; if (ev.tC != null) { const t0 = ev.tC - 2 * dt, iC = R.findIndex(x => x.t >= ev.tC - 1e-9), first = R.findIndex(x => x.t >= t0 - 1e-9 && x.Fz > 0), pre = first > 0 ? R[first - 1] : iC > 0 ? R[iC - 1] : null;
    const win = R.filter(x => x.t >= t0 - 1e-9 && x.t <= ev.tC + 0.1 + 1e-9), ts = win.map(x => x.t), Fs = win.map(x => x.Fz), tF = first >= 0 ? R[first].t - dt : ev.tC;
    const imp = (Tw) => R.filter(x => x.t - dt >= tF - 1e-9 && x.t - dt < tF + Tw - 1e-9).reduce((s, x) => s + x.Fz * dt, 0);
    td = { phiC: ev.phiC, vNormal: pre ? -pre.foot.v[1] : null, vTangential: pre ? Math.hypot(pre.foot.v[0], pre.foot.v[2]) : null, peakPctBW: 100 * mx(Fs) / W, win10PctBW: 100 * maxWindowMean(ts, Fs, dt, 0.010, t0 - dt, ev.tC + 0.09) / W,
      win20PctBW: 100 * maxWindowMean(ts, Fs, dt, 0.020, t0 - dt, ev.tC + 0.08) / W, impulse20: imp(0.02), impulse50: imp(0.05), penetrationMm: Math.max(0, -mn(win.map(x => x.low))), rebound }; }
  return { reachRT, n: S.length, rms: rms(e), peak: e.length ? mx(e) : null, beta: den > 0 ? num / den : null, num, den, fit, dlow, tiltMax: S.length ? mx(S.map(x => x.tiltErr)) : null, satFracMax, satLongestMs,
    torqueFracMax: SW.length ? mx(SW.flatMap(x => x.legTau.map(q => Math.abs(q[2])))) : null, dTauMax, dTau0Max, badA, badC, closMax, closPos, early, tdN, rebound, chatter, td, abort: ev.abortT != null, finalOk: ev.finalStates.every(s2 => s2 === "SUPPORT"),
    overCap: r.integrity.overCap, authority: r.integrity.authorityWrites, phiC: ev.phiC, noLift: ev.noLift, failedTD: ev.failedTD }; }
const runs = {}, missing = [];
for (const q of LIST.runs) { const f = path.join(DIR, `td2c_PSTAR5CHABTDV_nominal_${q.body}_${q.side}_${q.hz}_${q.traj}.json.gz`); if (!fs.existsSync(f)) { missing.push(path.basename(f)); continue; }
  const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))); runs[`${q.body}|${q.side}|${q.hz}|${q.ff}|${q.traj}`] = { q, set: r.tr.set, m: runMetrics(r) }; }
const out = { missing, reachability: { preFreezeRejected: LIST.rejected, runtime: [] }, tracking: {}, integrity: {}, failures: [], perTrajectory: {}, allowance: null }, F = (id, why) => out.failures.push(`${id}: ${why}`);
for (const [k, R] of Object.entries(runs)) if (R.m.reachRT) out.reachability.runtime.push(`${k}: ${R.m.reachRT}`);
const ok = (k) => runs[k] && !runs[k].m.reachRT;
// TRACKING ACCURACY
const ids = [...new Set(LIST.runs.map(q => q.traj))];
for (const id of ids) { const on = Object.entries(runs).filter(([k, R]) => R.q.traj === id && R.q.ff === "on" && ok(k)), off = Object.entries(runs).filter(([k, R]) => R.q.traj === id && R.q.ff === "off" && ok(k));
  const pool = (a) => { const nn = a.reduce((s, [, R]) => s + R.m.num, 0), dd = a.reduce((s, [, R]) => s + R.m.den, 0); return dd > 0 ? nn / dd : null; }, bOn = pool(on), bOff = pool(off);
  const ratio = on.map(([k, R]) => { const ko = k.replace("|on|", "|off|"); return runs[ko] && ok(ko) ? R.m.rms / runs[ko].m.rms : null; }).filter(v => v != null);
  out.perTrajectory[id] = { set: on[0] ? on[0][1].set : null, nOn: on.length, betaOn: bOn, betaOff: bOff, rmsOnMean: on.reduce((s, [, R]) => s + R.m.rms, 0) / Math.max(1, on.length), rmsOffMean: off.reduce((s, [, R]) => s + R.m.rms, 0) / Math.max(1, off.length),
    peakOnMax: on.length ? mx(on.map(([, R]) => R.m.peak)) : null, ratioOnOff: ratio.length ? [mn(ratio), mx(ratio)] : null, gammaOffMean: off.length ? off.reduce((s, [, R]) => s + (R.m.fit ? R.m.fit.gamma : 0), 0) / off.length : null };
  if (!(bOn != null && Math.abs(bOn) <= 0.25)) F("T-1", `${id} pooled β_ON ${f2(bOn)} (|β| ≤ 0.25)`); }
for (const [k, R] of Object.entries(runs)) { if (R.q.ff !== "on" || !ok(k)) continue; const m = R.m;
  if (!(m.peak != null && m.peak <= 10 && m.rms <= 5)) F("T-2", `${k} peak ${f2(m.peak)} mm, RMS ${f2(m.rms)} mm`);
  if ((R.set === "R" || R.set === "C") && R.q.hz !== 240) { const k240 = `${R.q.body}|${R.q.side}|240|on|${R.q.traj}`; if (ok(k240)) { const b = runs[k240].m; if (!(Math.abs(m.peak - b.peak) <= 2 && Math.abs(m.rms - b.rms) <= 1)) F("T-3", `${k} peak ${f2(m.peak)} vs ${f2(b.peak)}, RMS ${f2(m.rms)} vs ${f2(b.rms)} mm (240 Hz)`); } } }
// INTEGRITY / ENERGY / TORQUE
for (const [k, R] of Object.entries(runs)) { if (R.q.ff !== "on" || !ok(k)) continue; const m = R.m, rc = R.set === "R" || R.set === "C";
  if (m.overCap) F("I-1", `${k} over-capacity events ${m.overCap}`);
  if (m.badA || m.badC) F("I-2", `${k} E1a-7: applied Δτ max ${f2(m.dTauMax)} (violations ${m.badA}), commanded Δτ0 max ${f2(m.dTau0Max)} (violations ${m.badC}) N·m`);
  if (m.closMax > 0.05 || m.closPos > 0.5 || m.authority) F("I-3", `${k} energy closure max ${m.closMax.toExponential(2)} J/tick, Σ+ ${f2(m.closPos, 3)} J, authority ${m.authority}`);
  if (rc && (m.satFracMax > 0.05 || m.satLongestMs > 50 + 1e-9)) F("I-4", `${k} saturation ${f2(100 * m.satFracMax, 1)} % / ${f2(m.satLongestMs, 0)} ms`);
  if (m.early || m.noLift || m.failedTD) F("I-5", `${k} contact before φ 0.6 ${m.early} (contact φ ${f2(m.phiC)}), no liftoff ${m.noLift}, failed touchdown ${m.failedTD}`);
  if (!(m.tdN === 1 && m.rebound === 0 && m.chatter === 0)) F("I-6", `${k} TOUCHDOWN entries ${m.tdN}, rebound ${m.rebound}, re-entries < 60 ms ${m.chatter}`);
  if (rc && (m.abort || !m.finalOk)) F("I-7", `${k} abort ${m.abort}, final both SUPPORT ${m.finalOk}`); }
for (const v of ["T-1", "T-2", "T-3"]) { const fl = out.failures.filter(x => x.startsWith(v + ":")); out.tracking[v] = { pass: fl.length === 0 && missing.length === 0, failures: fl.length }; }
for (const v of ["I-1", "I-2", "I-3", "I-4", "I-5", "I-6", "I-7"]) { const fl = out.failures.filter(x => x.startsWith(v + ":")); out.integrity[v] = { pass: fl.length === 0 && missing.length === 0, failures: fl.length }; }
out.validates = missing.length === 0 && [...Object.values(out.tracking), ...Object.values(out.integrity)].every(c => c.pass);
// CLEARANCE ALLOWANCE (only if it validates; computed for the record otherwise, marked NOT VALID)
const allow = BINS.map(() => ({ mm: 0, ev: 0, tm: 0, where: null })); for (const [k, R] of Object.entries(runs)) { if (R.q.ff !== "on" || !ok(k) || !(R.set === "R" || R.set === "C")) continue;
  R.m.dlow.forEach((d, b) => { const e1 = isFinite(d.ev) ? -d.ev : 0, e2 = isFinite(d.tm) ? -d.tm : 0; if (e1 > allow[b].ev) allow[b].ev = e1; if (e2 > allow[b].tm) allow[b].tm = e2; const w = Math.max(e1, e2); if (w > allow[b].mm) { allow[b].mm = w; allow[b].where = k; } }); }
out.allowance = { valid: out.validates, phi0: 0.2, width: 0.05, binsMm: allow.map(a => Math.ceil(Math.max(0, a.mm) * 20 - 1e-9) / 20), raw: allow, from: "reachable VAL-ON runs of the R and C sets, all bodies / legs / rates, both conventions, rounded up to 0.05 mm" };
// summary
console.log(`runs ${Object.keys(runs).length}/${LIST.runs.length}${missing.length ? " MISSING " + missing.length : ""}; pre-freeze reachability rejections ${LIST.rejected.length}; runtime reachability rejections ${out.reachability.runtime.length}`);
out.reachability.runtime.slice(0, 10).forEach(x => console.log("   reach: " + x));
console.log("trajectory | set | n ON | β ON | β OFF | γ OFF | RMS ON / OFF mean (mm) | ON/OFF ratio | peak ON max"); for (const [id, q] of Object.entries(out.perTrajectory)) console.log(`  ${id.padEnd(6)} | ${q.set} | ${q.nOn} | ${f2(q.betaOn)} | ${f2(q.betaOff)} | ${f2(q.gammaOffMean)} | ${f2(q.rmsOnMean)} / ${f2(q.rmsOffMean)} | ${q.ratioOnOff ? f2(q.ratioOnOff[0]) + "–" + f2(q.ratioOnOff[1]) : "—"} | ${f2(q.peakOnMax)}`);
for (const [v, c] of [...Object.entries(out.tracking), ...Object.entries(out.integrity)]) console.log(`${c.pass ? "PASS" : "FAIL"} ${v} (${c.failures} failing items)`);
for (const v of ["T-1", "T-2", "T-3", "I-1", "I-2", "I-3", "I-4", "I-5", "I-6", "I-7"]) out.failures.filter(x => x.startsWith(v + ":")).slice(0, 6).forEach(x => console.log("   " + x));
console.log(out.validates ? "SV-2R: SERVO VALIDATES" : "SV-2R: SERVO DOES NOT VALIDATE");
console.log(`per-bin allowance (mm, φ 0.20 … 0.80 in 0.05 bins)${out.validates ? "" : " — NOT VALID (the servo did not validate)"}: ${out.allowance.binsMm.map(v => v.toFixed(2)).join(" ")}`);
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(runs).map(([k, R]) => [k, { q: R.q, set: R.set, m: { ...R.m, num: undefined, den: undefined } }])) }, null, 1));
