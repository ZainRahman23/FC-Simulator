// PPR-2 DIAGNOSTIC (post-qualification, read-only; does NOT change the frozen verdict): time-resolved push responses. The frozen window W = 300 ms
// extends past the postural loop delay (τ ≈ 175 ms), after which a human's delayed responses act; this reports each push at 50 / 100 / 175 / 300 ms
// after onset (relative to the same law's unperturbed run): max key-axis deflection, relative pelvis drop, relative COM displacement and velocity,
// XcoM margin, and the joint-speed settling ratio inside τ (RMS 125–175 ms vs 50–100 ms).
// usage: V2_KNEE_MODEL=v2k node ppr2_diag_timeline.mjs --law A|S [--params <json>] --label <id> --out <json>
import fs from "fs";
const R = new URL("../../", import.meta.url).href, PL = await import(R + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, { runOne } = await import(R + "ppr2/scripts/ppr2_run.mjs"), BT = await import(R + "ppr2/scripts/ppr2_battery.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(new URL("pvp1/fixture/PVP1A_FIXTURE.json", R))), law = arg("law", "S"), params = arg("params") ? JSON.parse(fs.readFileSync(arg("params"))) : undefined, spec = PL.SPEC_R();
const B = BT.BATTERY.T2, t0 = BT.BATTERY.t0, steps = t0 + B.W + 1, pLocal = spec.bodies[0].comLocal, KA = BT.KEY_AXES, th = (r, k, i) => r.chars.runner.th[k][i];
const base = await runOne({ fixtureObj: FIX, law, params, scene: "SOLO", steps }), Rb = base.recs, out = { label: arg("label", law), runs: {} };
const edgesOf = () => { const pts = []; for (let q = t0 - 6; q < t0; q++) for (const m of Rb[q].contacts) if (m.kind === "turf-runner") for (const p of m.points) if (p.lam > 0 || p.depth >= -0.005) pts.push(p.p); return { fwd: Math.max(...pts.map(p => p[0])), back: Math.min(...pts.map(p => p[0])), left: Math.max(...pts.map(p => p[2])), right: Math.min(...pts.map(p => p[2])) }; }, E = edgesOf();
for (const [dir, u] of Object.entries(B.dirs)) for (const mag of ["small", "moderate"]) { const J = B.J[dir][mag], o = await runOne({ fixtureObj: FIX, law, params, scene: "SOLO", steps, perturb: [{ from: t0, to: t0 + B.pulse, body: "pelvis", F: V.sc(u, J / (B.pulse / 240)), pLocal }] }), Rr = o.recs, ax = u[0] !== 0 ? 0 : 2, sg = u[0] + u[2];
  const at = (ms) => { const q = t0 - 1 + Math.round(ms * 0.24); let dev = 0, who = null; for (let p = t0; p <= q; p++) for (const [n, k, i] of KA) { const d = Math.abs(th(Rr[p], k, i) - th(Rb[p], k, i)) * 180 / Math.PI; if (d > dev) { dev = d; who = n; } }
    const c = Rr[q].chars.runner.com, cb = Rb[q].chars.runner.com, v = V.sc(V.sub(c, Rr[q - 1].chars.runner.com), 240), vb = V.sc(V.sub(cb, Rb[q - 1].chars.runner.com), 240), xc = c[ax] + v[ax] / Math.sqrt(9.81 / c[1]);
    return { ms, maxDevDeg: +dev.toFixed(2), axis: who, pelvisDropMm: +((Rb[q].S[0].pos[1] - Rr[q].S[0].pos[1]) * 1000).toFixed(2), comRelMm: +((c[ax] - cb[ax]) * 1000 * sg).toFixed(1), comRelVel: +((v[ax] - vb[ax]) * sg).toFixed(3), xcomMarginMm: +((sg > 0 ? E[dir] - xc : xc - E[dir]) * 1000).toFixed(1) }; };
  const wr = []; for (let q = t0; q < t0 + 42; q++) wr.push(Math.hypot(...KA.map(([, k, i]) => (th(Rr[q], k, i) - th(Rr[q - 1], k, i) - (th(Rb[q], k, i) - th(Rb[q - 1], k, i))) * 240)));
  const rms = (a, b) => Math.sqrt(wr.slice(a, b).reduce((x, y) => x + y * y, 0) / (b - a));
  out.runs[dir + "." + mag] = { J, t: [50, 100, 175, 300].map(at), settleInsideTau: +(rms(30, 42) / rms(12, 24)).toFixed(3) }; }
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out.runs)) console.log(out.label, k.padEnd(15), v.t.map(x => `${x.ms}ms dev ${x.maxDevDeg}° (${x.axis}) drop ${x.pelvisDropMm} com ${x.comRelMm} v ${x.comRelVel} xm ${x.xcomMarginMm}`).join(" | "), "| settle(τ)", v.settleInsideTau);
