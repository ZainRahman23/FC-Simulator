// PPR-2 isolated test I1 — stance-ankle stiffness vs amplitude (displacement-controlled, the human protocols of Vlutters et al. 2015 and
// Sakanaka et al. 2021): the runner stands alone in the PVP-1A-DX entry pose; at 50 ms both feet become kinematic platforms and rotate toes-up
// about their ankle centres by amp ∈ {0.005, 0.01, 0.02, 0.04, 0.08} rad in a 41.7 ms ramp, then hold. Ankle torque = actuator + passive tissue
// (exact readbacks), both ankles summed, MINUS the same law's held-platform baseline (amp 0); stiffness K = |ΔT|/Δθ_ankle (measured) at the end
// of the 41.7 ms ramp, at 70.8 ms and at 100 ms after ramp start (Sakanaka: first 70 ms). Human reference (both legs, reflex-excluded): 0.93 mgh at 0.29° →
// 0.44 mgh at 4.6° (Vlutters 2015); 0.94 mgh at 0.2° and 0.58 mgh at 0.9° (Sakanaka 2021).
// usage: V2_KNEE_MODEL=v2k node ppr2_ankle_platform.mjs --fixture <fix> --law A|S [--params <json>] --label <id> --out <json>
import fs from "fs";
const { runOne } = await import(new URL("./ppr2_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const I1 = Object.freeze({ from: 12, ramp: 10, steps: 48, amps: [0.005, 0.01, 0.02, 0.04, 0.08], mgh: 647.2 });
const ANK = [11, 12], DF = 1;   // joint indices ankle_L / ankle_R, constraint axis of dorsiflexion
const T = (r, k) => { const a = r.act.find(x => x[0] === k && x[1] === DF); return a[2] + r.passive[k][DF]; };
export async function ankleCurve(FIX, law, params, label) {
  const run = (amp) => runOne({ fixtureObj: FIX, law, params, scene: "SOLO", steps: I1.steps, platform: { from: I1.from, ramp: I1.ramp, amp }, label });
  const base = await run(0), rows = [];
  // stiffness on the MEASURED ankle rotation (mean of both ankles' dorsiflexion change vs the baseline run): the body above can follow the platform
  for (const amp of I1.amps) { const o = await run(amp), at = (m) => { const q = I1.from + m - 1, thP = amp * Math.min(1, m / I1.ramp), dT = ANK.reduce((s, k) => s + (T(o.recs[q], k) - T(base.recs[q], k)), 0);
      const dth = ANK.reduce((s, k) => s + (o.recs[q].chars.runner.th[k][DF] - base.recs[q].chars.runner.th[k][DF]), 0) / 2, th = Math.abs(dth);
      return { ms: +(m * 1000 / 240).toFixed(1), platformDeg: thP * 180 / Math.PI, ankleDeg: th * 180 / Math.PI, followFrac: 1 - th / Math.max(1e-12, thP), dT, K: Math.abs(dT) / th, Kmgh: Math.abs(dT) / th / I1.mgh, sign: Math.sign(dT * dth) }; };
    rows.push({ ampRad: amp, ampDeg: amp * 180 / Math.PI, endRamp: at(I1.ramp), at71: at(17), at100: at(24), stop: o.stop || null }); }
  return { label, law, rows };
}
if (process.argv[1] && process.argv[1].endsWith("ppr2_ankle_platform.mjs")) {
  const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), law = arg("law", "S"), params = arg("params") ? JSON.parse(fs.readFileSync(arg("params"))) : undefined, r = await ankleCurve(FIX, law, params, arg("label", law));
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(r, null, 1));
  console.log(`I1 ankle platform · ${r.label}`); for (const x of r.rows) console.log(`  platform ${x.ampDeg.toFixed(2).padStart(5)}° · K/mgh (ankle °) end of ramp ${x.endRamp.Kmgh.toFixed(3)} (${x.endRamp.ankleDeg.toFixed(2)}°, body follows ${(100 * x.endRamp.followFrac).toFixed(0)} %) · 71 ms ${x.at71.Kmgh.toFixed(3)} (${x.at71.ankleDeg.toFixed(2)}°) · 100 ms ${x.at100.Kmgh.toFixed(3)} (${x.at100.ankleDeg.toFixed(2)}°)${x.stop ? " STOP " + x.stop.reason : ""}`);
}
