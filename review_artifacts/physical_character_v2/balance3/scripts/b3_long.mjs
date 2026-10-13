// BALANCE-3 long-window recovery measurement (12 s after onset; noise as each controller's own; twin-differenced). For each case: peak AP/ML COM
// excursion, the B2M overshoot over 4 s and over 12 s, the 10 %-of-peak / 2 mm settling time, the largest |Δx| after 3 s, HAT (pelvis-to-head
// composite) pitch residual after 3 s, hip vs ankle sagittal torque deviations over 1–12 s (RMS and correlation; anti-phase with both large =
// the "fighting" signature seen in C4), lumbar angle residual, boot-tip load share and heel lift. usage (worktree root):
//   node .../b3_long.mjs --ctrl <json> --ctrlModule <path> --ctrlClass <name> --cases back.small,... --label <id> --out <json>
// case names: "<dir>.<J>@<pulseSteps>" or B2M levels "<dir>.<level>" (50 ms); special "quiet" = undisturbed 12 s statistics vs the entry
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(RA + "balance2/scripts/b2_qualify.mjs");
const { support } = await import(RA + "balance2/scripts/c3_support.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), SPEC = PL.SPEC_R(), J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA)));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, ON = 480, W = 2880, STEPS = ON + W, R2D = 180 / Math.PI, REC0 = 840; // recovery-window start: 3.5 s after onset (BALANCE3_PREREGISTRATION.md R1 / R2)
const jk = (n) => SPEC.joints.findIndex(j => j.name === n), hatIds = SPEC.bodies.map((b, i) => i).filter(i => !/thigh|shank|foot/.test(SPEC.bodies[i].name));
const tq = (r, k, i) => { const a = (r.act || []).find(x => x[0] === k && x[1] === i); return (a ? a[2] : 0) + r.passive[k][i]; }, sum2 = (r, a, b) => tq(r, jk(a), 1) + tq(r, jk(b), 1);
const hatPitch = (r) => { let m = 0, x = 0, y = 0; for (const i of hatIds) { const mm = SPEC.bodies[i].mass; m += mm; x += mm * r.S[i].com[0]; y += mm * r.S[i].com[1]; } const H = r.S[jk("hip_L") >= 0 ? SPEC.joints[jk("hip_L")].childIndex : 0];
  const hp = SPEC.joints[jk("hip_L")].childIndex, hpR = SPEC.joints[jk("hip_R")].childIndex, px = (r.S[hp].pos[0] + r.S[hpR].pos[0]) / 2, py = (r.S[hp].pos[1] + r.S[hpR].pos[1]) / 2; return Math.atan2(x / m - px, y / m - py) * R2D; };
export async function measure(mk, cases) { const job = (x) => ({ law: "M1B", params: J("balance1/params/B1_BODY.json"), ctrl: mk, steps: STEPS, ...x }), base = await runOne(job({})), out = {};
  for (const cs of cases) { if (cs === "quiet") { const R = base.recs.slice(ON), c0 = R[0].chars.runner.com; let mx = 0; const xs = R.map(r => r.chars.runner.com[0]); const m = xs.reduce((s, x) => s + x, 0) / xs.length;
      out.quiet = { comAPrmsMm: +(Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) * 1000).toFixed(2), maxDriftMm: +(Math.max(...R.map(r => Math.hypot(r.chars.runner.com[0] - c0[0], r.chars.runner.com[2] - c0[2]))) * 1000).toFixed(2), stop: base.stop || null, ...support(base, null, ON, STEPS) }; continue; }
    const [dir, rest] = cs.split("."), [mag, pl] = rest.includes("@") ? rest.split("@") : [rest, "12"], Jn = isNaN(+mag) ? B2M.J[dir][mag] : +mag, pulse = +pl;
    const o = await runOne(job({ perturb: BT.pushJob(dir, Jn, ON, pulse) })), ax = dir === "fwd" || dir === "back" ? 0 : 2, sg = dir === "fwd" || dir === "left" ? 1 : -1, n = Math.min(base.recs.length, o.recs.length);
    const d = (q) => sg * (o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000; let pk = 0, ipk = ON; for (let q = ON; q < n; q++) if (d(q) > pk) { pk = d(q); ipk = q; }
    const opp = (end) => { let mn = 0; for (let q = ipk; q < Math.min(n, end); q++) mn = Math.min(mn, d(q)); return -mn; }, tol = Math.max(2, 0.1 * pk); let settle = 0; for (let q = ON; q < n; q++) if (Math.abs(d(q)) > tol) settle = (q - ON) / 240;
    let after3 = 0; for (let q = ON + 720; q < n; q++) after3 = Math.max(after3, Math.abs(d(q))); let afterR = 0; for (let q = ON + REC0; q < n; q++) afterR = Math.max(afterR, Math.abs(d(q)));
    const y0 = o.recs[ON - 1].S[0].pos[1]; let fall = null; for (let q = ON; q < n; q++) if ((y0 - o.recs[q].S[0].pos[1]) * 1000 > 150) { fall = (q - ON) / 240; break; }
    const hp = (q) => hatPitch(o.recs[q]) - hatPitch(base.recs[q]); let hat3 = 0; for (let q = ON + 720; q < n; q++) hat3 = Math.max(hat3, Math.abs(hp(q))); let hatR = 0; for (let q = ON + REC0; q < n; q++) hatR = Math.max(hatR, Math.abs(hp(q)));
    const lum = (q) => (o.recs[q].chars.runner.th[jk("lumbar")][1] - base.recs[q].chars.runner.th[jk("lumbar")][1]) * R2D; let lum3 = 0; for (let q = ON + 720; q < n; q++) lum3 = Math.max(lum3, Math.abs(lum(q)));
    const th = [], ta = []; for (let q = ON + 240; q < n; q++) { th.push(sum2(o.recs[q], "hip_L", "hip_R") - sum2(base.recs[q], "hip_L", "hip_R")); ta.push(sum2(o.recs[q], "ankle_L", "ankle_R") - sum2(base.recs[q], "ankle_L", "ankle_R")); }
    const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length, rms = (v) => Math.sqrt(mean(v.map(x => x * x))), mh = mean(th), ma = mean(ta), cov = mean(th.map((x, i) => (x - mh) * (ta[i] - ma))), corr = cov / (Math.sqrt(mean(th.map(x => (x - mh) ** 2))) * Math.sqrt(mean(ta.map(x => (x - ma) ** 2))) || 1);
    const trace = []; for (let q = ON; q < n; q += 24) trace.push([+((q - ON) / 240).toFixed(1), +d(q).toFixed(2), +hp(q).toFixed(3)]);
    out[cs] = { J: Jn, pulseSteps: pulse, fallAtS: fall, peakMm: +pk.toFixed(2), tPeakS: +((ipk - ON) / 240).toFixed(2), overshoot4s: +(opp(ON + 960) / (pk || 1)).toFixed(3), overshoot12s: +(opp(n) / (pk || 1)).toFixed(3), settleS: +settle.toFixed(2), settleTolMm: +tol.toFixed(2),
      maxAbsAfter3sMm: +after3.toFixed(2), maxAbsAfter3sFrac: +(after3 / (pk || 1)).toFixed(3), hatPitchMaxAfter3sDeg: +hat3.toFixed(3), maxAbsAfter3p5sMm: +afterR.toFixed(2), hatPitchMaxAfter3p5sDeg: +hatR.toFixed(3), R1tolMm: +Math.max(4.1, 0.10 * pk).toFixed(2), R1pass: afterR <= Math.max(4.1, 0.10 * pk), R2pass: hatR <= 1.0, lumbarMaxAfter3sDeg: +lum3.toFixed(3), hipTorqueRmsNm: +rms(th).toFixed(2), ankleTorqueRmsNm: +rms(ta).toFixed(2), hipAnkleCorr: +corr.toFixed(3), R3pass: !(corr < -0.5 && rms(th) > 2 && rms(ta) > 2),
      ...support(o, base, ON, n), trace }; }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b3_long.mjs")) { const abs = (p) => new URL(p, "file://" + process.cwd() + "/").href, CM = await import(abs(arg("ctrlModule"))), Ctrl = CM[arg("ctrlClass")], P = JSON.parse(fs.readFileSync(arg("ctrl")));
  const R = await measure(() => new Ctrl(P), arg("cases").split(",")); R.label = arg("label", ""); fs.writeFileSync(arg("out"), JSON.stringify(R, null, 1));
  for (const [k, v] of Object.entries(R)) { if (k === "label") continue; if (k === "quiet") { console.log(R.label, "quiet", JSON.stringify(v)); continue; } const { trace, ...s } = v; console.log(R.label, k.padEnd(16), JSON.stringify(s)); } }
