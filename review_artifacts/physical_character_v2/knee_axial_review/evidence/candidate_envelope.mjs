// CANDIDATE (central-estimate) knee axial envelope from KNEE_AXIAL_MODEL_REVIEW.md §4.1 / §5 — a worked example of the recommendation, NOT adopted,
// NOT implemented in the simulator. Anatomical degrees, + = tibial internal rotation, zero = tibial orientation at full extension.
// Uses the existing V2 law SHAPE (zero torque inside soft; A(e^{B(x−s)}−1) from soft to hard reaching τ_hard; linear end-stop to the opposing
// capacity 3° beyond hard), with: moving neutral θ0(φ); per-side widths from θ0 scaled by flexion; knee τ_hard = 0.55 × opposing capacity.
const d2r = Math.PI / 180, S = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const mass = +(process.argv[2] || 78), cap = 0.35 * mass, tauH = 0.55 * cap, Tcap = 1.0 * cap, dS = 3, B = 6;
export const theta0 = (f) => f < 0 ? 0.3695 * f : f <= 120 ? 0.3695 * f - 2.958e-3 * f * f + 7.666e-6 * f ** 3 : 14.99 + (Math.min(f, 155) - 120) * (5 / 30);
export const factor = (f, side) => { const hyper = f < 0 ? 1 - 0.06 * Math.min(5, -f) : 1, deep = 1 - 0.4 * S((f - 125) / 25), ext = side === "ER" ? 0.5 + 0.5 * S(f / 35) : 1.0; return hyper * deep * ext; };
const PLATEAU = { IR: { soft: 3, hard: 14 }, ER: { soft: 1.5, hard: 24 } };
export function env(f) { const t0 = theta0(f), fi = factor(f, "IR"), fe = factor(f, "ER");
  return { t0, soft: [t0 - PLATEAU.ER.soft * fe, t0 + PLATEAU.IR.soft * fi], hard: [t0 - PLATEAU.ER.hard * fe, t0 + PLATEAU.IR.hard * fi], fi, fe }; }
function side(sw, hw) { const A = tauH / (Math.exp(B * (hw - sw) * d2r) - 1), kS = Math.max(0, (Tcap - A * (Math.exp(B * (hw - sw + dS) * d2r) - 1)) / dS);
  const T = (x) => x <= sw ? 0 : A * (Math.exp(B * (x - sw) * d2r) - 1) + (x > hw ? kS * (x - hw) : 0);
  const k = (x) => x <= sw ? 0 : A * B * d2r * Math.exp(B * (x - sw) * d2r) + (x > hw ? kS : 0);
  const inv = (Tq) => { let lo = 0, hi = 90; for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (T(m) < Tq) lo = m; else hi = m; } return lo; }; return { T, k, inv, kS }; }
if (!process.env.NO_MAIN) {
  console.log(`mass ${mass} kg; knee axial capacity ${cap.toFixed(1)} N·m; τ_hard ${tauH.toFixed(1)} N·m; end-stop → ${Tcap.toFixed(1)} N·m at hard + ${dS}°; B ${B}/rad`);
  console.log("flex | θ0 | width factor IR/ER | soft [ER,IR] abs | hard [ER,IR] abs | per side from θ0: IR° at 2.5/5/10/15/27 N·m | ER° at same | total at 5 N·m | max k (N·m/°) at end-stop IR/ER");
  for (const f of [-5, 0, 10, 20, 30, 45, 60, 90, 120, 135, 146, 155]) { const e = env(f), w = (x) => x.toFixed(1);
    const si = side(e.soft[1] - e.t0, e.hard[1] - e.t0), se = side(e.t0 - e.soft[0], e.t0 - e.hard[0]), Ts = [2.5, 5, 10, 15, 27];
    console.log(`${String(f).padStart(4)} | ${w(e.t0)} | ${e.fi.toFixed(2)}/${e.fe.toFixed(2)} | [${w(e.soft[0])}, ${w(e.soft[1])}] | [${w(e.hard[0])}, ${w(e.hard[1])}] | ${Ts.map(t => w(si.inv(t))).join("/")} | ${Ts.map(t => w(se.inv(t))).join("/")} | ${w(si.inv(5) + se.inv(5))} | ${si.k(e.hard[1] - e.t0 + 0.01).toFixed(2)}/${se.k(e.t0 - e.hard[0] + 0.01).toFixed(2)}`); }
  // context only (the user's instruction: tests are context, not targets): the prone-rest state of the current model
  const f = 146.3, a = 32.4, e = env(f), dev = a - e.t0, si = side(e.soft[1] - e.t0, e.hard[1] - e.t0);
  console.log(`\ncontext: current-model prone rest (flex ${f}°, axial +${a}° abs): candidate θ0 ${e.t0.toFixed(1)}° → +${dev.toFixed(1)}° IR from θ0; candidate passive torque there ${si.T(dev).toFixed(1)} N·m (IR hard at θ0 + ${(e.hard[1] - e.t0).toFixed(1)}°)`);
  for (const [t0, fac] of [[11, 1.0], [20, 1.0], [30, 1.0], [11, 0.3], [20, 0.3], [30, 0.3], [20, 0.6], [30, 0.6]]) { const s2 = side(3 * fac, 14 * fac), d = a - t0;
    console.log(`   θ0(146°) ${t0}°, deep-flexion factor ${fac}: deviation ${d.toFixed(1)}° → ${d <= 0 ? "on the ER side" : s2.T(d).toFixed(1) + " N·m"}`); }
}
