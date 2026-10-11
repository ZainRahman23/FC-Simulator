// PPR-2 DIAGNOSTIC (post-qualification, read-only; not a criterion): ground reaction per foot during the T2 pushes (same jobs as the battery,
// deterministic) — peak / minimum vertical load per foot, peak horizontal (friction) force per foot, within W = 300 ms from onset.
// usage: V2_KNEE_MODEL=v2k node ppr2_diag_grf.mjs --law A|S [--params <json>] --label <id> --out <json>
import fs from "fs";
const R = new URL("../../", import.meta.url).href, PL = await import(R + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, { runOne } = await import(R + "ppr2/scripts/ppr2_run.mjs"), { BATTERY } = await import(R + "ppr2/scripts/ppr2_battery.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(new URL("pvp1/fixture/PVP1A_FIXTURE.json", R))), law = arg("law", "S"), params = arg("params") ? JSON.parse(fs.readFileSync(arg("params"))) : undefined, spec = PL.SPEC_R();
const B = BATTERY.T2, t0 = BATTERY.t0, steps = t0 + B.W + 1, pLocal = spec.bodies[0].comLocal, out = { label: arg("label", law), runs: {} };
const grf = (r) => { const f = { foot_L: { n: 0, t: [0, 0, 0] }, foot_R: { n: 0, t: [0, 0, 0] } }; for (const m of r.contacts || []) if (m.kind === "turf-runner" && f[m.b[1]]) { f[m.b[1]].n += m.Jn * 240; f[m.b[1]].t = V.add(f[m.b[1]].t, V.sc(m.J2, 240)); } return f; };
for (const [dir, u] of Object.entries(B.dirs)) for (const mag of ["small", "moderate", "large"]) { const J = B.J[dir][mag], o = await runOne({ fixtureObj: FIX, law, params, scene: "SOLO", steps, perturb: [{ from: t0, to: t0 + B.pulse, body: "pelvis", F: V.sc(u, J / (B.pulse * (1 / 240))), pLocal }] });
  const s = { L: { max: 0, min: Infinity, hmax: 0 }, R: { max: 0, min: Infinity, hmax: 0 }, totMax: 0 };
  for (let q = t0; q < Math.min(o.recs.length, t0 + B.W); q++) { const g = grf(o.recs[q]); for (const [k, n] of [["L", "foot_L"], ["R", "foot_R"]]) { s[k].max = Math.max(s[k].max, g[n].n); s[k].min = Math.min(s[k].min, g[n].n); s[k].hmax = Math.max(s[k].hmax, Math.hypot(g[n].t[0], g[n].t[2])); } s.totMax = Math.max(s.totMax, g.foot_L.n + g.foot_R.n); }
  out.runs[dir + "." + mag] = { J, footL: s.L, footR: s.R, totalVerticalMaxN: s.totMax, bodyWeightN: 73.91 * 9.81 }; }
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out.runs)) console.log(out.label, k.padEnd(15), `vertical L ${v.footL.min.toFixed(0)}–${v.footL.max.toFixed(0)} R ${v.footR.min.toFixed(0)}–${v.footR.max.toFixed(0)} N, total max ${v.totalVerticalMaxN.toFixed(0)} (BW 725), friction peak L ${v.footL.hmax.toFixed(0)} R ${v.footR.hmax.toFixed(0)} N`);
