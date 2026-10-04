// Current V2 knee axial passive law (spec/v2_joints.js + sim/v2_passive.js), anatomical degrees (+ = tibial internal rotation).
// Soft range [−30, +20] × clamp(flex/60, 0.1, 1); hard [−40, +30]; exponential B = 6/rad from soft to 25 % of opposing capacity at hard;
// C2 end-stop reaching 100 % capacity 3° beyond hard. Capacity 0.35 N·m/kg × mass.
const mass = +(process.argv[2] || 78), cap = 0.35 * mass, tauH = 0.25 * cap, B = 6, d2r = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function law(flex) {
  const s = clamp(flex / 60, 0.1, 1), soft = [-30 * s, 20 * s], hard = [-40, 30], dS = 3 * d2r;
  const side = (sgn) => { const sl = (sgn > 0 ? soft[1] : -soft[0]) * d2r, hl = (sgn > 0 ? hard[1] : -hard[0]) * d2r, A = tauH / (Math.exp(B * (hl - sl)) - 1);
    const kS = Math.max(0, (4 * tauH - A * (Math.exp(B * (hl - sl + dS)) - 1)) / dS);
    const tau = (x) => x <= sl ? 0 : A * (Math.exp(B * (x - sl)) - 1) + (x > hl ? kS * (x - hl) : 0);   // x = |θ| (rad) in that direction
    const stiff = (x) => x <= sl ? 0 : A * B * Math.exp(B * (x - sl)) + (x > hl ? kS : 0);
    const inv = (T) => { let lo = sl, hi = hl + 10 * d2r; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (tau(m) < T) lo = m; else hi = m; } return lo / d2r; };
    return { sl: sl / d2r, hl: hl / d2r, tau, stiff, inv }; };
  return { s, soft, hard, IR: side(+1), ER: side(-1) };
}
const Ts = [1, 2.5, 3, 5, 6.8, 10, 15, 20];
console.log(`mass ${mass} kg, capacity ${cap.toFixed(1)} N·m, tau at hard ${tauH.toFixed(2)} N·m`);
console.log("flex | soft [ER, IR] | IR° at T=" + Ts.join("/") + " N·m | ER° at same | total° at 2.5 / 5 / 10 | stiffness N·m/° at 5 N·m IR/ER");
for (const f of [0, 10, 20, 30, 45, 60, 90, 120, 146, 155]) {
  const L = law(f), ir = Ts.map(T => L.IR.inv(T)), er = Ts.map(T => L.ER.inv(T)), tot = (T) => (L.IR.inv(T) + L.ER.inv(T)).toFixed(1);
  const kIR = L.IR.stiff(L.IR.inv(5) * d2r) * d2r, kER = L.ER.stiff(L.ER.inv(5) * d2r) * d2r;
  console.log(`${String(f).padStart(3)} | [${L.soft[0].toFixed(1)}, ${L.soft[1].toFixed(1)}] | ${ir.map(x => x.toFixed(1)).join("/")} | ${er.map(x => x.toFixed(1)).join("/")} | ${tot(2.5)} / ${tot(5)} / ${tot(10)} | ${kIR.toFixed(2)} / ${kER.toFixed(2)}`);
}
