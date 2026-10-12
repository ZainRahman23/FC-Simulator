// BALANCE-1 design analysis (not the qualification): a reduced AP model of the standing loop with the M1b body, to see which literature gain sets
// are stable and adequate on the physiological plant before any full-body run. Single-DOF inverted pendulum about the ankles:
//   I·θ¨ = mgh·θ − τ_ankle + τ_ext,  τ_ankle = τ_active + K_mus·(f_res·θ + w_s·θ_s + w_f·θ_f) + k_B·θ + D·θ˙
//   relaxing strain arms: θ_s˙ = θ˙ − θ_s/τ_s, θ_f˙ = θ˙ − θ_f/τ_f (S2 / M1b constants); τ_active = the commanded intent through the M1b cascade
//   (2-step delay → activation 15 / 50 ms → developed force τc,rise / τc,fall), around the tonic level (increase = rise constants, decrease = fall)
//   controller: Δτ = mgh·[kP·θ(t−d) + kD·θ˙(t−d) + kA·θ¨(t−d) + kI·∫θ(t−d)] + optional internal-model prediction over d (variant B)
// usage: node b1_linear.mjs  (prints a table for the candidate gain sets)
const dt = 1 / 240;
export const PLANT = { m: 73.91, h: 0.892, I: 73.91 * 0.892 * 0.892 + 5.0, Kmus: 2 * 249, kB: 2 * 46, D: 2 * 0.8, arms: { fRes: 0.15, wS: 0.30, tauS: 0.5, wF: 0.55, tauF: 0.02 },
  muscle: { delay: 2, tAct: 0.015, tDeact: 0.050, rise: 0.1467, fall: 0.0542 }, tonic: 21.4 * 2 };
export function simulate(g, opt = {}) { const P = { ...PLANT, ...(opt.plant || {}) }, mgh = P.m * 9.81 * P.h, d = g.delay ?? 24, N = Math.round((opt.T ?? 8) / dt), A = P.arms, mu = P.muscle;
  let th = 0, w = 0, ths = 0, thf = 0, I = 0; const hist = [], cmd = [], aS = { a: 0, f: 0 }, out = [], line = [];
  // the active torque modulation Δτ around the tonic level: an agonist (PF) increase uses the rise constants, a decrease the fall constants
  const muscleStep = (u) => { line.push(u); const ud = line.length > mu.delay ? line.shift() : 0; const ta = ud > aS.a ? mu.tAct : mu.tDeact; aS.a = ud + (aS.a - ud) * Math.exp(-dt / ta); const tc = aS.a > aS.f ? mu.rise : mu.fall; aS.f = aS.a + (aS.f - aS.a) * Math.exp(-dt / tc); return aS.f; };
  // internal model for B: the same pendulum + intrinsic model (relaxing arms), driven by the efference copy of the modelled developed torque
  const mdl = { line: [], a: 0, f: 0 }, mStep = (u) => { mdl.line.push(u); const ud = mdl.line.length > mu.delay ? mdl.line.shift() : 0; const ta = ud > mdl.a ? mu.tAct : mu.tDeact; mdl.a = ud + (mdl.a - ud) * Math.exp(-dt / ta); const tc = mdl.a > mdl.f ? mu.rise : mu.fall; mdl.f = mdl.a + (mdl.f - mdl.a) * Math.exp(-dt / tc); return mdl.f; };
  const fHist = [];
  for (let n = 0; n < N; n++) { const t = n * dt, ext = opt.ext ? opt.ext(t) : 0;
    hist.push([th, w]); const del = n - d >= 0 ? hist[n - d] : [0, 0], del6 = n - d - 6 >= 0 ? hist[n - d - 6] : [0, 0];
    let xs = del[0], vs = del[1];
    if (g.predict) { // propagate the delayed state over d with the model (no knowledge of ext), using the modelled torques of the last d steps
      let x = del[0], v = del[1], s = 0, f2 = 0; const Ms = fHist.slice(-d); for (let k = 0; k < Ms.length; k++) { const tq = Ms[k] + P.Kmus * A.fRes * x + P.kB * x; const acc = (mgh * x - tq) / P.I; v += acc * dt; x += v * dt; } xs = x; vs = v; }
    I += xs * dt; const acc = (del[1] - del6[1]) / (6 * dt);
    const u = mgh * (g.kP * xs + g.kD * vs + (g.kA || 0) * acc + (g.kI || 0) * I) + (opt.noise ? opt.noise(n) : 0);
    const ta = muscleStep(u); if (g.predict) fHist.push(mStep(u)); cmd.push(u);
    const tq = ta + P.Kmus * (A.fRes * th + A.wS * ths + A.wF * thf) + P.kB * th + P.D * w, a = (mgh * th - tq + ext) / P.I;
    w += a * dt; const dth = w * dt; th += dth; ths = (ths + dth) * Math.exp(-dt / A.tauS); thf = (thf + dth) * Math.exp(-dt / A.tauF); out.push({ t, th, w, tq, ta, u }); }
  return out; }
export function metrics(o, h = PLANT.h) { const x = o.map(r => r.th * h * 1000); let pk = 0, tpk = 0; x.forEach((v, i) => { if (Math.abs(v) > Math.abs(pk)) { pk = v; tpk = i * dt; } });
  const tail = x.slice(-240), grow = Math.max(...x.slice(-480).map(Math.abs)) > 1.5 * Math.max(...x.slice(-960, -480).map(Math.abs)) && Math.max(...x.slice(-480).map(Math.abs)) > 1;
  const fell = x.some(v => Math.abs(v) > 300); let sl = 0; for (let i = 6; i < o.length; i++) sl = Math.max(sl, Math.abs(o[i].ta - o[i - 6].ta) / (6 * dt)); return { peakMm: pk, tPeak: tpk, tailMm: Math.max(...tail.map(Math.abs)), growing: grow, fell, maxActiveSlew: sl }; }
if (process.argv[1] && process.argv[1].endsWith("b1_linear.mjs")) {
  const sets = { "P2 (PPR-3)": { kP: 1.196, kD: 0.45, kI: 0.17 }, "Peterka 2002": { kP: 1.3, kD: 0.43, kI: 0.17 }, "Pasma 2017 (no force fb)": { kP: 1.33, kD: 0.87, kA: 0.13 }, "van der Kooij & Peterka 2011": { kP: 1.29, kD: 0.43 } };
  const push = (J) => (t) => (t >= 1 && t < 1.05 ? J * 0.95 / 0.05 : 0), hold = (F) => (t) => (t >= 1 ? F * 0.95 : 0);
  for (const pred of [false, true]) for (const [lab, g] of Object.entries(sets)) { const G = { ...g, predict: pred }; const r1 = metrics(simulate(G, { ext: push(9.7), T: 8 })), r2 = metrics(simulate(G, { ext: hold(20), T: 8 })), r0 = metrics(simulate(G, { ext: push(2), T: 10 }));
    console.log(`${pred ? "B " : "A "}${lab.padEnd(30)} 2 N·s: peak ${r0.peakMm.toFixed(1)} mm @ ${r0.tPeak.toFixed(2)} s tail ${r0.tailMm.toFixed(2)} ${r0.growing ? "GROWING" : ""}${r0.fell ? " FELL" : ""} | 9.7 N·s: peak ${r1.peakMm.toFixed(0)} mm ${r1.fell ? "FELL" : ""} slew ${r1.maxActiveSlew.toFixed(0)} | 20 N held: peak ${r2.peakMm.toFixed(0)} ${r2.fell ? "FELL" : ""} tail ${r2.tailMm.toFixed(0)}`); } }
