// BALANCE-1 derivation [E]: contraction lags τc,rise / τc,fall for the muscle groups balance needs, inverted on the same discrete 240 Hz cascade as
// MUSCLE-1 (muscle1/scripts/m1_design_derive.mjs: activation 15 / 50 ms → developed force; the 2-step electrochemical delay does not change 10–90 %
// times) from the structure-independent human targets of balance1/research/BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md §19.1 (central [low, high]).
// No value is chosen with reference to simulator behaviour. usage: node b1_groups_derive.mjs [--json out.json]
import fs from "fs";
const dt = 1 / 240, lag = (y, x, tu, td) => x + (y - x) * Math.exp(-dt / (x > y ? tu : td));
function resp(tcU, tcD, up) { let a = up ? 0 : 1, f = a; const u = up ? 1 : 0, y = [f]; for (let n = 0; n < 2400; n++) { a = lag(a, u, 0.015, 0.050); f = lag(f, a, tcU, tcD); y.push(f); }
  const lo = up ? 0.1 : 0.9, hi = up ? 0.9 : 0.1, cross = (v) => { for (let i = 1; i < y.length; i++) if (up ? y[i] >= v : y[i] <= v) { const t0 = (i - 1) * dt, fr = (v - y[i - 1]) / (y[i] - y[i - 1]); return t0 + fr * dt; } return NaN; };
  return (cross(hi) - cross(lo)) * 1000; }
// floor: the cascade alone (τc → 0) already takes ≈ 110 ms to fall 90–10 % and ≈ 72 ms to rise; a target below the floor maps to τc ≈ 0
const inv = (target, up) => { let lo = 1e-5, hi = 1.0; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, t = up ? resp(m, 0.05, true) : resp(0.1, m, false); if (t < target) lo = m; else hi = m; } return +((lo + hi) / 2 * 1000).toFixed(1); };
// targets (ms): rise 10–90 % and fall 90–10 %: [central, low, high]; label: per-component evidence (§19.1)
export const TARGETS = {
  "hip.abduction": { rise: [280, 200, 400], fall: [175, 120, 250], label: "rise [E] low–moderate; fall [SENS] (no hip relaxation data)" },
  "hip.adduction": { rise: [280, 200, 400], fall: [175, 120, 250], label: "rise [E] low–moderate; fall [SENS]" },
  "hip.extension": { rise: [300, 220, 400], fall: [175, 120, 250], label: "rise [E] low; fall [SENS]" },
  "hip.flexion": { rise: [300, 220, 400], fall: [175, 120, 250], label: "rise [E] low; fall [SENS]" },
  "trunk.extension": { rise: [320, 200, 500], fall: [200, 120, 300], label: "[SENS] conflicting evidence (§3.4); fall no data" },
  "trunk.flexion": { rise: [300, 200, 450], fall: [200, 120, 300], label: "[SENS] fibre type only; no RTD, no relaxation" },
  "trunk.lateral": { rise: [300, 200, 450], fall: [200, 120, 300], label: "[SENS] no group-specific data" },
  "trunk.rotation": { rise: [300, 200, 450], fall: [200, 120, 300], label: "[SENS] no data" },
  "neck.all": { rise: [240, 180, 300], fall: [220, 150, 300], label: "rise [E] moderate (no direction separable); fall [SENS] (one SCM abstract)" },
  "ankle.frontal": { rise: [300, 200, 450], fall: [200, 120, 300], label: "[SENS] evertors weak reflex-torque estimate; invertors no timing data" },
  "elbow.flexion": { rise: [210, 150, 250], fall: [130, 110, 180], label: "[E] moderate (twitch + voluntary)" },
  "elbow.extension": { rise: [230, 190, 290], fall: [140, 115, 180], label: "[E] low (twitch × adopted-group calibration)" },
  "shoulder.all": { rise: [220, 150, 300], fall: [150, 110, 220], label: "[SENS] elbow values widened; no deltoid torque twitch" },
  "knee.flexion.refined": { rise: [240, 200, 300], fall: [160, 120, 200], label: "[E] low (Kozinc 2021 same-protocol RTD) — sensitivity only; canonical knee.flexion stays MUSCLE-1's [D]" } };
export function derive() { const out = {}; for (const [k, t] of Object.entries(TARGETS)) out[k] = { tauRiseMs: inv(t.rise[0], true), tauFallMs: inv(t.fall[0], false),
  range: { tauRiseMs: [inv(t.rise[1], true), inv(t.rise[2], true)], tauFallMs: [inv(t.fall[1], false), inv(t.fall[2], false)] }, targets: { rise10_90ms: t.rise, fall90_10ms: t.fall }, label: t.label }; return out; }
if (process.argv[1] && process.argv[1].endsWith("b1_groups_derive.mjs")) { const d = derive();
  for (const [k, v] of Object.entries(d)) console.log(k.padEnd(22), "rise", String(v.tauRiseMs).padStart(6), v.range.tauRiseMs.join("–").padStart(12), " fall", String(v.tauFallMs).padStart(6), v.range.tauFallMs.join("–").padStart(12), " ", v.label);
  const i = process.argv.indexOf("--json"); if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(d, null, 1)); }
