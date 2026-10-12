// MUSCLE-1 §2 audit (measurement only; before any MUSCLE-1 model): (1) fixture validation — the standalone S2 axis model reproduces PPR-3's recorded
// actuator rows from the recorded kinematics and excitations; (2) servo speed of CURRENT V2's canonical actuator vs S2's actuator on identical
// isometric requests; (3) decomposition of PPR-3's ankle torque rise (frozen battery captures, onset 480) into command / activation / mechanics.
// usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node .../muscle1/scripts/m1_audit.mjs --capture <dir> --out <json>
import fs from "fs"; import zlib from "zlib";
const M = await import(new URL("./m1_models.mjs", import.meta.url).href), KIT = await import(new URL("./m1_kit.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, CAP = arg("capture"), OUT = arg("out");
const load = (run) => JSON.parse(zlib.gunzipSync(fs.readFileSync(`${CAP}/${run}.json.gz`)));
const VAX = [["ankle_L.df", 11, 1], ["ankle_R.df", 12, 1], ["ankle_L.inv", 11, 2], ["knee_L.flex", 9, 1], ["hip_L.flex", 7, 1]], kits = await KIT.bootKits(VAX), out = { validation: {}, servo: {}, decomposition: {} };
// ── (1) fixture validation ──
const WARM = 24, ONSET = 480;
for (const run of ["BASE_undisturbed", "fwd_moderate", "fwd_large", "left_moderate"]) { const C = load(run), F = Object.fromEntries(C.fields.map((f, i) => [f, i])); out.validation[run] = {};
  for (const [name] of VAX) { const R = C.axes[name].rows, kit = kits[name], m = new M.V2ActAxis(kit), worst = { rows: 0, tauMod: 0, tauAll: 0 }; m.plan({ anat: kit.anat0, w: 0, kneeDeg: kit.kneeDeg0, u: kit.u0 }, true);
    for (let q = 0; q < Math.min(R.length - 1, ONSET + 240); q++) { const t = m.torque(R[q][F.w]); if (q >= WARM) { const d = Math.abs(t.tau - R[q][F.tauApplied]); worst.tauAll = Math.max(worst.tauAll, d); if (q < ONSET + 120 || run !== "fwd_large") worst.tauMod = Math.max(worst.tauMod, d); }
      m.after(R[q][F.e]); const row = m.plan({ anat: R[q][F.anat], w: R[q][F.w], kneeDeg: R[q][F.kneeDeg], u: [R[q][F.uP], R[q][F.uM]] });
      if (q >= WARM) for (const f of ["drive", "tauE", "req", "hi", "lo"]) worst.rows = Math.max(worst.rows, Math.abs(row[f] - R[q][F[f]])); }
    out.validation[run][name] = Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toExponential(3)])); } }
// ── (2) servo speed on identical isometric requests (left ankle df at the entry) ──
const kit = kits["ankle_L.df"], inp = { anat: kit.anat0, w: 0, kneeDeg: kit.kneeDeg0 }, T0 = kit.tauStatic;
const timing = (y, y0, y1) => { const d = y1 - y0, f = (p) => y.findIndex(v => (v - y0) / d >= p), t10 = f(0.1), t90 = f(0.9); let m1 = 0, m6 = 0; for (let i = 1; i < y.length; i++) m1 = Math.max(m1, Math.abs(y[i] - y[i - 1]) * 240); for (let i = 6; i < y.length; i++) m6 = Math.max(m6, Math.abs(y[i] - y[i - 6]) / 0.025);
  return { rise10_90ms: t10 < 0 || t90 < 0 ? null : +((t90 - t10) / 0.24).toFixed(2), maxTickSlew: Math.round(m1), max25msSlew: Math.round(m6) }; };
for (const [lab, from, to] of [["stepUp50", T0, T0 - 50], ["stepDown50", T0 - 50, T0], ["inEnvelope2", T0, T0 - 2]]) {
  const e = new M.V2EnvAxis(kit); for (let q = 0; q < 480; q++) { e.plan(inp, { tau0: from, K: 0, D: 0 }); e.torque(0); } const ye = [from]; for (let q = 0; q < 120; q++) { e.plan(inp, { tau0: to, K: 0, D: 0 }); ye.push(e.torque(0).tau); }
  const s = new M.V2ActAxis(kit); for (let q = 0; q < 480; q++) s.plan({ ...inp, dTau: from - T0 }); const ys = [s.row.drive]; for (let q = 0; q < 120; q++) { s.plan({ ...inp, dTau: to - T0 }); ys.push(s.row.drive); }
  out.servo[lab] = { from, to, currentV2: timing(ye, ye[0], to), s2: timing(ys, ys[0], ys[0] + (to - from)) }; }
// ── (3) decomposition: both ankles df, relative to the undisturbed twin; components of the torque applied in step n + 1 from plan P_n ──
const base = load("BASE_undisturbed"), FB = Object.fromEntries(base.fields.map((f, i) => [f, i]));
for (const run of ["fwd_moderate", "fwd_large"]) { const C = load(run), F = FB, ser = { cmd: [], drive: [], tauE: [], tauP: [], damp: [], clamp: [], act: [] };
  for (let n = ONSET - 6; n < ONSET + 240; n++) { const s = { cmd: 0, drive: 0, tauE: 0, tauP: 0, damp: 0, clamp: 0, act: 0 };
    for (const name of ["ankle_L.df", "ankle_R.df"]) for (const [R, sg] of [[C.axes[name].rows, 1], [base.axes[name].rows, -1]]) { const r = R[n], r1 = R[n + 1], tau0 = r[F.drive] + r[F.tauE] + r[F.tauP];
      s.cmd += sg * r[F.dTauP2]; s.drive += sg * r[F.drive]; s.tauE += sg * r[F.tauE]; s.tauP += sg * r[F.tauP]; s.damp += sg * (r[F.req] - tau0); s.clamp += sg * (r1[F.tauApplied] - r[F.req]); s.act += sg * r1[F.tauApplied]; }
    for (const k of Object.keys(ser)) ser[k].push(s[k]); }
  const sl = (x) => { let m = 0, t = 0; for (let i = 6; i < x.length; i++) { const r = Math.abs(x[i] - x[i - 6]) / 0.025; if (r > m) { m = r; t = i; } } return { max: Math.round(m), tEndMs: +((t - 6) / 0.24).toFixed(1) }; };
  const pk = (x) => +x.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), 0).toFixed(2), S = Object.fromEntries(Object.entries(ser).map(([k, v]) => [k, { peak: pk(v), slew: sl(v) }]));
  const i1 = Math.round(S.act.slew.tEndMs * 0.24) + 6, i0 = i1 - 6, d = (k) => +((ser[k][i1] - ser[k][i0]) / 0.025).toFixed(0);
  out.decomposition[run] = { series: S, atActualMaxSlew: { windowMs: [+((i0 - 6) / 0.24).toFixed(1), +((i1 - 6) / 0.24).toFixed(1)], act: d("act"), drive: d("drive"), tauE: d("tauE"), tauP: d("tauP"), damp: d("damp"), clamp: d("clamp"), cmd: d("cmd") },
    activationPassFraction: +(S.drive.slew.max / S.cmd.slew.max).toFixed(3) }; }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.servo)); console.log(JSON.stringify(out.decomposition, null, 0)); console.log(JSON.stringify(out.validation));
