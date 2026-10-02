import { J, body, G2, f3 } from "./lib.mjs";
const { spec, poses } = body("F2"); const r = G2.runG2a(J, spec, "G2a_walkInPlace", { poses, seconds: 6 });
let mx = { a: -9, tau: 0 }, mn = { a: 9 }; const toeContact = { L: 0, R: 0 };
for (const q of r.recs) { for (const s of ["L", "R"]) { const m = q.mtp[s]; if (m.a > mx.a) mx = { ...m, t: q.t, s }; if (m.a < mn.a) mn = { ...m, t: q.t, s }; } }
console.log("MTP angle range (deg):", f3(mn.a * 57.3, 1), "…", f3(mx.a * 57.3, 1), "at t", f3(mx.t, 2), mx.s, "torque at max", f3(mx.tau, 1), "N·m");
for (const q of r.recs.filter(q => q.t > 1.8 && q.t < 3.0 && q.n % 12 === 0)) console.log(`t ${f3(q.t, 2)} L ${f3(q.mtp.L.a * 57.3, 1)}° ${f3(q.mtp.L.tau, 1)} N·m toe? ${q.feet.L.toe} heel? ${q.feet.L.heel} load ${f3(q.feet.L.load, 0)} | R ${f3(q.mtp.R.a * 57.3, 1)}° ${f3(q.mtp.R.tau, 1)} toe? ${q.feet.R.toe} heel? ${q.feet.R.heel} load ${f3(q.feet.R.load, 0)}`);
