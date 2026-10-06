// ═══ physchar2/tools/swing_servo_eval.mjs — evaluation of the swing-servo validation battery (e2/SWING_SERVO_VALIDATION_PREREG.md §2–§4; written before the battery ran).
// Reads tools/swing_servo_val.mjs records <dir>/servo_<body>_<side>_<hz>_<ff>_<seq>.json.gz; computes the §2 metrics per trajectory segment and the criteria V-1 … V-6;
// derives the §4 tracked-clearance allowance from the REPRESENTATIVE segments of VAL-ON. Segment window: u ∈ [0, T] (the trajectory); hold: u ∈ (T, T + 0.5].
// usage: node tools/swing_servo_eval.mjs --dir=<runs> [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIR = arg("dir", "."), JS = arg("json", ""), BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], HZS = [180, 240, 480];
const REP = ["L1", "R1", "L2", "R2"], f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity);
const phaseOf = (id, phi) => (id.startsWith("H5") ? (phi < 1 / 3 ? "rise" : phi <= 2 / 3 ? "apex" : "descent") : phi < 0.4 ? "rise" : phi <= 0.6 ? "apex" : "descent");
function segMetrics(r, rows) { const dt = 1 / r.hz, wn = r.wn, id = rows[0].id, T = rows[0].T, S = rows.filter(x => x.u >= -1e-9 && x.u <= T + 1e-9), Hd = rows.filter(x => x.u > T + 1e-9);
  const ep = (x) => x.foot.p.map((v, i) => v - x.ref.p[i]), nrm = (v) => Math.hypot(v[0], v[1], v[2]);
  const e = S.map(x => nrm(ep(x)) * 1000), ev = S.map(x => nrm(x.foot.v.map((v, i) => v - x.ref.v[i])) * 1000), ea = S.slice(1).map(x => nrm(x.foot.a.map((v, i) => v - x.ref.a[i])));
  const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length)); let num = 0, den = 0;
  for (const x of S) { const g = x.ref.a.map(a => -a / (wn * wn)), q = ep(x); num += q[0] * g[0] + q[1] * g[1] + q[2] * g[2]; den += g[0] * g[0] + g[1] * g[1] + g[2] * g[2]; }
  // phase lag: the shift τ (ticks) minimising RMS |p(t) − p_ref(t − τ)| over the segment (reference clamped to the recorded rows)
  const all = rows, i0 = all.indexOf(S[0]); let best = { k: 0, v: Infinity };
  for (let k = -Math.round(0.1 / dt); k <= Math.round(0.1 / dt); k++) { let s2 = 0; S.forEach((x, j) => { const rr = all[Math.min(all.length - 1, Math.max(0, i0 + j - k))].ref.p; s2 += (x.foot.p[0] - rr[0]) ** 2 + (x.foot.p[1] - rr[1]) ** 2 + (x.foot.p[2] - rr[2]) ** 2; }); if (s2 < best.v) best = { k, v: s2 }; }
  const ph = {}; for (const x of S) { const p = phaseOf(id, x.u / T), q = ph[p] || (ph[p] = { e: [], dlow: Infinity }); q.e.push(nrm(ep(x)) * 1000); q.dlow = Math.min(q.dlow, x.low - x.lowRef); }
  const phases = Object.fromEntries(Object.entries(ph).map(([k, q]) => [k, { rms: rms(q.e), peak: mx(q.e), dLowMin: q.dlow }]));
  // saturation per swing-leg axis: rows and longest continuous run
  const satRows = {}, run = {}, longest = {}; for (const x of S) { const ss = new Set(x.sat); for (const k of Object.keys(run)) if (!ss.has(+k)) run[k] = 0; for (const k of ss) { run[k] = (run[k] || 0) + 1; satRows[k] = (satRows[k] || 0) + 1; longest[k] = Math.max(longest[k] || 0, run[k]); } }
  const satFracMax = Object.keys(satRows).length ? mx(Object.values(satRows)) / S.length : 0, satLongestMs = Object.keys(longest).length ? mx(Object.values(longest)) * dt * 1000 : 0;
  // hold settling: peak in the two halves; sign changes of the error along the segment's motion direction (0.2 mm deadband)
  const dir = (() => { const a = S[0].ref.p, b = S[S.length - 1].ref.p, d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = nrm(d); return l > 1e-6 ? d.map(v => v / l) : [0, 1, 0]; })();
  const h1 = Hd.filter(x => x.u - T < 0.25), h2 = Hd.filter(x => x.u - T >= 0.25), hp = (a) => (a.length ? mx(a.map(x => nrm(ep(x)) * 1000)) : 0); let sc = 0, sgn = 0;
  for (const x of Hd) { const p = (ep(x)[0] * dir[0] + ep(x)[1] * dir[1] + ep(x)[2] * dir[2]) * 1000; const sg = p > 0.2 ? 1 : p < -0.2 ? -1 : 0; if (sg && sgn && sg !== sgn) sc++; if (sg) sgn = sg; }
  const rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs);
  return { id, T, n: S.length, rms: rms(e), peak: mx(e), vRms: rms(ev), vPeak: mx(ev), aRms: rms(ea), lagMs: best.k * dt * 1000, beta: den > 0 ? num / den : null, num, den, phases, tiltMax: mx(S.map(x => x.tiltErr)), yawMax: mx(S.map(x => Math.abs(x.yawErr))),
    satFracMax, satLongestMs, torqueFracMax: mx(S.flatMap(x => x.legTau.map(q => Math.abs(q[2])))), torqueNmMax: mx(S.flatMap(x => x.legTau.map(q => Math.abs(q[1])))), dTauMax: mx(S.map(x => x.dTau)), dTau0Max: mx(S.map(x => x.dTau0)),
    dTauOk: mx(S.map(x => x.dTau)) <= 10 * rsA + 1e-9 && mx(S.map(x => x.dTau0)) <= 30 * rs + 1e-9, contactRows: S.filter(x => x.touch > 0).length + Hd.filter(x => x.touch > 0).length, hold1: hp(h1), hold2: hp(h2), holdSignChanges: sc }; }
const runs = {}, missing = [];
for (const b of BODIES) for (const sd of ["L", "R"]) for (const hz of HZS) for (const ff of ["off", "on"]) for (const seq of ["A", "B"]) { const f = path.join(DIR, `servo_${b}_${sd}_${hz}_${ff}_${seq}.json.gz`); if (!fs.existsSync(f)) { missing.push(path.basename(f)); continue; }
  const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), by = {}; for (const x of r.rows) (by[x.k] = by[x.k] || []).push(x);
  runs[`${b}|${sd}|${hz}|${ff}|${seq}`] = { r: { human: r.human, side: r.side, hz: r.hz, ff: r.ff, seq: r.seq, events: r.events, integrity: r.integrity, overCap: r.actAxes.reduce((s, a) => s + a.overCap, 0), outcome: r.outcome }, segs: Object.values(by).map(rows => segMetrics(r, rows)) }; }
const out = { missing, criteria: {}, allowance: null, perTrajectory: {}, failures: [] }, F = (id, why) => out.failures.push(`${id}: ${why}`);
const seg = (key, id) => (runs[key] ? runs[key].segs.find(s => s.id === id) : null);
for (const [key, R] of Object.entries(runs)) { const [b, sd, hz, ff, seq] = key.split("|"); if (ff !== "on") continue; const off = runs[`${b}|${sd}|${hz}|off|${seq}`], integ = R.r.integrity;
  const ids = seq === "A" ? ["L1", "R1", "H1", "H1r", "H2", "H2r"] : ["L2", "R2", "H3", "H3r", "H4", "H4r", "H5", "H5r"];
  for (const id of ids) { const s = seg(key, id), so = seg(`${b}|${sd}|${hz}|off|${seq}`, id), rep = REP.includes(id), tag = `${key}|${id}`;
    if (!s) { F("V-4", `${tag} segment not executed (abort ${R.r.events.abortT}, no liftoff ${R.r.events.noLift})`); continue; }
    if (!so) F("V-1", `${tag} no OFF counterpart`); else if (!(s.rms <= 0.5 * so.rms)) F("V-1", `${tag} RMS ON ${f2(s.rms)} vs OFF ${f2(so.rms)} mm (ratio ${f2(s.rms / so.rms)})`);
    if (rep && !(s.peak <= 10 && s.rms <= 5)) F("V-3", `${tag} peak ${f2(s.peak)} mm, RMS ${f2(s.rms)} mm`);
    if (R.r.overCap) F("V-4", `${tag} over-capacity events ${R.r.overCap}`); if (!s.dTauOk) F("V-4", `${tag} torque continuity Δτ ${f2(s.dTauMax)} / Δτ0 ${f2(s.dTau0Max)} N·m`); if (s.contactRows) F("V-4", `${tag} swing-foot contact rows ${s.contactRows}`);
    if (integ.closMax > 0.05 || integ.closPos > 0.5) F("V-4", `${key} energy closure max ${integ.closMax.toExponential(2)} Σ+ ${f2(integ.closPos, 3)}`);
    if (rep && (s.satFracMax > 0.05 || s.satLongestMs > 50 + 1e-9)) F("V-4", `${tag} saturation ${f2(100 * s.satFracMax, 1)} % / ${f2(s.satLongestMs, 0)} ms`); if (rep && R.r.events.abortT != null) F("V-4", `${tag} supervisor abort ${R.r.events.abortT}`);
    if (!(s.hold2 <= Math.max(s.hold1, 1) + 1e-9 && s.holdSignChanges <= 2)) F("V-5", `${tag} hold peaks ${f2(s.hold1)} → ${f2(s.hold2)} mm, sign changes ${s.holdSignChanges}`);
    if (rep && hz !== "240") { const s240 = seg(`${b}|${sd}|240|on|${seq}`, id); if (s240 && !(Math.abs(s.peak - s240.peak) <= 2 && Math.abs(s.rms - s240.rms) <= 1)) F("V-6", `${tag} peak ${f2(s.peak)} vs ${f2(s240.peak)} mm, RMS ${f2(s.rms)} vs ${f2(s240.rms)} mm (240 Hz)`); } } }
// V-2 pooled mechanism slope per trajectory id
for (const id of ["L1", "R1", "L2", "R2", "H1", "H1r", "H2", "H2r", "H3", "H3r", "H4", "H4r", "H5", "H5r"]) { const pool = { on: [0, 0], off: [0, 0] }, rmsOn = [], rmsOff = [], peakOn = [];
  for (const [key, R] of Object.entries(runs)) { const s = R.segs.find(q => q.id === id); if (!s) continue; const ff = key.split("|")[3]; pool[ff][0] += s.num; pool[ff][1] += s.den; (ff === "on" ? rmsOn : rmsOff).push(s.rms); if (ff === "on") peakOn.push(s.peak); }
  const bOn = pool.on[1] ? pool.on[0] / pool.on[1] : null, bOff = pool.off[1] ? pool.off[0] / pool.off[1] : null; out.perTrajectory[id] = { betaOff: bOff, betaOn: bOn, rmsOffMean: rmsOff.reduce((a, v) => a + v, 0) / Math.max(1, rmsOff.length), rmsOnMean: rmsOn.reduce((a, v) => a + v, 0) / Math.max(1, rmsOn.length), peakOnMax: peakOn.length ? mx(peakOn) : null, n: rmsOn.length };
  if (!(bOff >= 0.5 && Math.abs(bOn) <= 0.25)) F("V-2", `${id} pooled β OFF ${f2(bOff)} (≥ 0.5), ON ${f2(bOn)} (|β| ≤ 0.25)`); }
for (const v of ["V-1", "V-2", "V-3", "V-4", "V-5", "V-6"]) { const fl = out.failures.filter(x => x.startsWith(v + ":")); out.criteria[v] = { pass: fl.length === 0 && missing.length === 0, failures: fl.length }; }
out.validates = Object.values(out.criteria).every(c => c.pass);
// §4 allowance (representative VAL-ON segments): worst downward lowest-boot-point deviation per phase
const allow = { rise: 0, apex: 0, descent: 0 }; for (const [key, R] of Object.entries(runs)) { if (key.split("|")[3] !== "on") continue; for (const s of R.segs) if (REP.includes(s.id)) for (const [p, q] of Object.entries(s.phases)) allow[p] = Math.max(allow[p], -q.dLowMin); }
out.allowance = { rise_mm: allow.rise, apex_mm: allow.apex, descent_mm: allow.descent, from: "representative VAL-ON segments (L1 R1 L2 R2), all bodies / legs / rates" };
// summary
console.log(`runs ${Object.keys(runs).length}/192${missing.length ? " MISSING " + missing.length : ""}`);
console.log("trajectory | β OFF | β ON | RMS OFF mean | RMS ON mean | peak ON max (mm)"); for (const [id, q] of Object.entries(out.perTrajectory)) console.log(`  ${id.padEnd(4)} | ${f2(q.betaOff)} | ${f2(q.betaOn)} | ${f2(q.rmsOffMean)} | ${f2(q.rmsOnMean)} | ${f2(q.peakOnMax)}`);
for (const [v, c] of Object.entries(out.criteria)) console.log(`${c.pass ? "PASS" : "FAIL"} ${v} (${c.failures} failing items)`);
for (const v of ["V-1", "V-2", "V-3", "V-4", "V-5", "V-6"]) out.failures.filter(x => x.startsWith(v + ":")).slice(0, 6).forEach(x => console.log("   " + x));
console.log(`allowance (mm): rise ${f2(allow.rise)}, apex ${f2(allow.apex)}, descent ${f2(allow.descent)}`); console.log(out.validates ? "SERVO VALIDATES" : "SERVO DOES NOT VALIDATE");
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(runs).map(([k, R]) => [k, { r: R.r, segs: R.segs.map(s => ({ ...s, num: undefined, den: undefined })) }])) }, null, 1));
