// PVP-0 tackler: contact vs no-contact (read-only, from the run records). CALIB is the NOMINAL tackler (same start, same tracker, same speed) placed
// 10 m to the side of the recipient: it lands and slides on the turf with no player contact. Against it: the tackler COM velocity 25 ms before and
// 100 ms after NOMINAL's first contact, the travel (−z local) and lateral (x) displacement and the stop time (horizontal COM speed < 0.1 m/s), for
// CALIB and each strength — separating "the tackler reacts to hitting another mass" from its own landing / turf friction.
// usage (worktree root): node .../pvp0_tackler_ref.mjs --dir <records dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, ST = PL.SPEC_T(), MT = ST.bodies.reduce((s, b) => s + b.mass, 0);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, k + ".json.gz"))));
const r2 = (v) => v.map(x => +x.toFixed(2)), out = { protocol: "PVP-0 tackler contact vs no-contact (CALIB)", tacklerMassKg: +MT.toFixed(2), cases: {} };
const NOM_FC = 456; // NOMINAL first contact (PVP0_ANALYSIS.json); the same window is used for every case
for (const cse of ["CALIB", "LIGHT", "NOMINAL", "HEAVY"]) { const o = load(cse), R = o.recs, A = o.setup.activate, at = (n) => R.find(r => r.n === n).chars.tackler, v = (n) => V.sc(at(n).P, 1 / MT);
  const c0 = at(A + 1).com; let stop = null; for (const r of R) if (r.n > A + 24 && stop == null && Math.hypot(r.chars.tackler.P[0], r.chars.tackler.P[2]) / MT < 0.1) stop = +((r.n - A) / 240).toFixed(3);
  const ce = R[R.length - 1].chars.tackler.com, vb = v(NOM_FC - 7), va = v(NOM_FC + 23);
  out.cases[cse] = { vBefore: r2(vb), vAfter100ms: r2(va), dvHorizMs: +Math.hypot(va[0] - vb[0], va[2] - vb[2]).toFixed(2), travelM: +(c0[2] - ce[2]).toFixed(2), lateralM: +(ce[0] - c0[0]).toFixed(2), stopSAfterActivation: stop }; }
{ const N = load("NOMINAL").recs, C = load("CALIB").recs, jk = (nm) => ST.joints.findIndex(j => j.name === nm), th = (R, n, k) => R.find(r => r.n === n).chars.tackler.th[k];
  const dev = (n, k) => Math.max(...[0, 1, 2].map(i => Math.abs(th(N, n, k)[i] - th(C, n, k)[i]) * 180 / Math.PI)), pk = (k, a, b) => { let m = 0; for (let n = a; n <= b; n++) m = Math.max(m, dev(n, k)); return +m.toFixed(1); };
  out.limbDeflectionNominalVsCalibDeg = Object.fromEntries(["hip_R", "knee_R", "ankle_R", "hip_L", "knee_L"].map(nm => { const k = jk(nm); return [nm, { preContact: +dev(NOM_FC - 1, k).toFixed(2), peak50ms: pk(k, NOM_FC, NOM_FC + 12), peak100ms: pk(k, NOM_FC, NOM_FC + 24), peak300ms: pk(k, NOM_FC, NOM_FC + 72) }]; })); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
