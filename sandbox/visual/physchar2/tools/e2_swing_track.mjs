// ═══ physchar2/tools/e2_swing_track.mjs — DIAGNOSTIC swing-tracking / clearance decomposition of tools/e2_run.mjs step records (e2/VFF_RATE_CORRECTION.md, user decision
// 2026-10-06 overnight §Decision 3). Not an evaluator (the frozen criteria are tools/e2_eval.mjs). Per record, over the swing (measured AIRBORNE t_air → first contact t_c;
// φ = (t − t_air)/T, A1):
//   • tracking |foot origin − swing target| in the evaluator's convention (row state after the step vs the target that step executed: one tick apart) and TIME-MATCHED
//     (the foot at t vs the target computed at t, i.e. the next row's target) — the difference is the one-tick advance v·dt;
//   • SIGNED vertical error e_z = y_foot − y_target (time-matched) by phase: a pure lag puts the foot LOW while rising and HIGH while descending;
//   • clearance decomposition at φ: reference geometric clearance (the target pose's lowest boot point: target height − the flat foot's origin height above its lowest
//     point, from the resting foot at t = 1 s; the target orientation is the anchor's, flat), + vertical tracking error, + the remainder (foot tilt / yaw: the measured
//     lowest boot point minus the first two) = the measured clearance;
//   • liftoff transient: the error over the first 0.15 s after t_air against the airborne weight a; peak hip / knee torque utilisation.
// usage: node tools/e2_swing_track.mjs <rec.json.gz> [...] [--rows] [--json=<out>]
import fs from "fs"; import zlib from "zlib";
const files = process.argv.slice(2).filter(a => !a.startsWith("--")), ROWS = process.argv.includes("--rows"), JS = (process.argv.find(a => a.startsWith("--json=")) || "").slice(7);
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), rmsOf = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
const out = {};
for (const file of files) { const r = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), R = r.rows, n = r.lifted, T = 0.6, dt = 1 / r.cfg.hz;
  const iAir = R.findIndex((x, i) => i > 0 && x.st[n] === "AIRBORNE" && R[i - 1].st[n] !== "AIRBORNE" && x.t > 7), tAir = iAir >= 0 ? R[iAir].t : null;
  const iC = R.findIndex((x, i) => i > iAir && iAir >= 0 && x.st[n] !== "AIRBORNE"), tc = iC >= 0 ? R[iC].t : null; if (tAir == null) { console.log(file, "no liftoff"); continue; }
  const r0 = R.find(x => x.t >= 1.0 - 1e-9), h0 = r0.foot[n].p[1] - r0.foot[n].clear / 1000, phi = (t) => (t - tAir) / T;
  const sw = []; for (let i = iAir; i < iC - 1; i++) { const x = R[i], nx = R[i + 1]; if (!x.swing || !nx.swing) continue;
    const eConv = x.errMm, eM = Math.hypot(...x.foot[n].p.map((v, k) => v - nx.swing.p[k])) * 1000, ez = (x.foot[n].p[1] - nx.swing.p[1]) * 1000, refClr = (nx.swing.p[1] - h0) * 1000;
    sw.push({ t: x.t, phi: phi(x.t), a: x.a[n], eConv, eM, ez, refClr, clr: x.foot[n].clear, rem: x.foot[n].clear - refClr - ez, tilt: x.foot[n].tilt, vz: nx.swing.p[1] - x.swing.p[1] }); }
  const rise = sw.filter(s => s.phi < 0.5), desc = sw.filter(s => s.phi >= 0.5), win = sw.filter(s => s.phi >= 0.2 - 1e-9 && s.phi <= 0.8 + 1e-9), mn = win.reduce((b, s) => (!b || s.clr < b.clr ? s : b), null);
  const at = (p) => sw.reduce((b, s) => (!b || Math.abs(s.phi - p) < Math.abs(b.phi - p) ? s : b), null), lo = sw.filter(s => s.t - tAir <= 0.15 + 1e-9);
  const res = { run: r.run, config: r.cfg.config, tAir, tc, phiC: tc != null ? phi(tc) : null, trackConv: { rms: rmsOf(sw.map(s => s.eConv)), max: Math.max(...sw.map(s => s.eConv)) }, trackMatched: { rms: rmsOf(sw.map(s => s.eM)), max: Math.max(...sw.map(s => s.eM)) },
    ezRise: { mean: rise.reduce((a, s) => a + s.ez, 0) / Math.max(1, rise.length), min: Math.min(...rise.map(s => s.ez)), max: Math.max(...rise.map(s => s.ez)) }, ezDesc: { mean: desc.reduce((a, s) => a + s.ez, 0) / Math.max(1, desc.length), min: Math.min(...desc.map(s => s.ez)), max: Math.max(...desc.map(s => s.ez)) },
    clearMin2080: mn ? { clr: mn.clr, phi: mn.phi, refClr: mn.refClr, ez: mn.ez, rem: mn.rem } : null, at: Object.fromEntries([0.2, 0.35, 0.5, 0.65, 0.8].map(p => { const s = at(p); return [p, s ? { phi: s.phi, refClr: s.refClr, ez: s.ez, rem: s.rem, clr: s.clr } : null]; })),
    liftoff: { peak: Math.max(...lo.map(s => s.eM)), peakAt: lo.reduce((b, s) => (!b || s.eM > b.eM ? s : b), null), rows: lo.filter((_, i) => i % 6 === 0).map(s => ({ dt: s.t - tAir, a: s.a, eM: s.eM, ez: s.ez })) } };
  out[file.split("/").pop()] = res;
  console.log(`\n══ ${file.split("/").pop()} [${res.config}] t_air ${f2(tAir, 3)} contact φ ${f2(res.phiC)}`);
  console.log(`  tracking RMS / max: evaluator convention ${f2(res.trackConv.rms)} / ${f2(res.trackConv.max)} mm | time-matched ${f2(res.trackMatched.rms)} / ${f2(res.trackMatched.max)} mm`);
  console.log(`  signed vertical error e_z (foot − target): rising mean ${f2(res.ezRise.mean)} [${f2(res.ezRise.min)}, ${f2(res.ezRise.max)}] mm | descending mean ${f2(res.ezDesc.mean)} [${f2(res.ezDesc.min)}, ${f2(res.ezDesc.max)}] mm`);
  console.log(`  clearance min φ∈[0.2,0.8]: ${f2(res.clearMin2080 && res.clearMin2080.clr)} mm at φ ${f2(res.clearMin2080 && res.clearMin2080.phi)} = reference ${f2(res.clearMin2080 && res.clearMin2080.refClr)} + e_z ${f2(res.clearMin2080 && res.clearMin2080.ez)} + tilt/yaw ${f2(res.clearMin2080 && res.clearMin2080.rem)}`);
  console.log("  φ:  " + Object.entries(res.at).map(([p, s]) => s ? `${p}: ref ${f2(s.refClr, 1)} e_z ${f2(s.ez, 1)} rem ${f2(s.rem, 1)} = ${f2(s.clr, 1)}` : "").join(" | "));
  console.log(`  liftoff (first 0.15 s): peak ${f2(res.liftoff.peak)} mm at +${f2(res.liftoff.peakAt && res.liftoff.peakAt.t - tAir, 3)} s (a ${f2(res.liftoff.peakAt && res.liftoff.peakAt.a)}); ` + res.liftoff.rows.map(q => `+${f2(q.dt, 3)} a ${f2(q.a)} ${f2(q.eM, 1)}/${f2(q.ez, 1)}`).join(" "));
  if (ROWS) for (const s of sw) if (Math.round(s.phi * 100) % 5 === 0) console.log(`    φ ${f2(s.phi)} a ${f2(s.a)} eM ${f2(s.eM)} ez ${f2(s.ez)} ref ${f2(s.refClr)} clr ${f2(s.clr)} tilt ${f2(s.tilt)}`); }
if (JS) fs.writeFileSync(JS, JSON.stringify(out, null, 1));
