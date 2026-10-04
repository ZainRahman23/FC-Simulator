// diagnostic: how a constant 2 N·m pelvis yaw torque (G3 Y:0.5:2, from 6 s) is reacted at the ground, mean over 10–13 s: foot free moments
// (vertical moment about each foot's CoP) vs the force couple of the horizontal shear forces about the feet's midpoint, plus the passive
// ankle ab/adduction and knee axial torques and the hip-rotation actuator torques
const P = process.argv[2], stand = JSON.parse(process.argv[3] || "{}"); const { loadJolt } = await import(P + "/core/v2_jolt.js"), { generateSpec } = await import(P + "/spec/v2_spec.js"), { VARIATION_SET } = await import(P + "/spec/v2_human.js"), { G3Sim, g3Def } = await import(P + "/gates/v2_g3.js"), { ankleNeutralKPerDeg } = await import(P + "/spec/v2_joints.js"), { V } = await import(P + "/core/v2_math.js");
const J = await loadJolt(P + "/vendor/jolt-physics.wasm-compat.js"), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), jx = (n) => spec.joints.findIndex(j => j.name === n);
const s = new G3Sim(J, spec, g3Def("Y:0.5:2"), Object.keys(stand).length ? { stand } : {}); const acc = { free: 0, couple: 0, n: 0, pasAnk: [0, 0], pasKnee: [0, 0], actHip: [0, 0] }, aK = [jx("ankle_L"), jx("ankle_R")], kK = [jx("knee_L"), jx("knee_R")], hK = [jx("hip_L"), jx("hip_R")];
while (s.tick()) { const t = s.n * s.dt; if (t < 10 || t > 13) continue; const pr = s.probeRows; if (!pr || !pr[0] || !pr[1] || !pr[0].cop || !pr[1].cop) continue;
  const mid = V.sc(V.add(pr[0].cop, pr[1].cop), 0.5); let free = 0, couple = 0;
  for (const r of pr) { const F = V.sc(r.Jc, 1 / r.dt); couple += V.cross(V.sub(r.cop, mid), F)[1]; const Mcop = r.McA[1] / r.dt + V.cross(V.sub(s.st[spec.bodies.findIndex(b => b.name === (r === pr[0] ? "foot_L" : "foot_R"))].pos, r.cop), F)[1]; free += Mcop; }
  acc.free += free; acc.couple += couple; acc.n++;
  aK.forEach((k, n) => { const pj = (s.up.joints || []).find(j => j.k === k); if (pj) acc.pasAnk[n] += pj.tau[0]; }); kK.forEach((k, n) => { const pj = (s.up.joints || []).find(j => j.k === k); if (pj) acc.pasKnee[n] += pj.tau[0]; });
  hK.forEach((k, n) => { const r = (s.actRes || []).find(x => x.k === k && x.i === 0); if (r) acc.actHip[n] += r.tau; }); }
const m = (v) => v / acc.n, f = (v) => m(v).toFixed(3); s.destroy();
console.log(`k ${ankleNeutralKPerDeg()} ${JSON.stringify(stand)}: ground reaction to the 2 N·m pelvis yaw torque — foot free moments ${f(acc.free)} N·m, shear-force couple ${f(acc.couple)} N·m (sum ${(m(acc.free) + m(acc.couple)).toFixed(3)}); passive ankle fabd τ ${acc.pasAnk.map(f).join("/")}, passive knee axial τ ${acc.pasKnee.map(f).join("/")}, hip-rotation actuator τ ${acc.actHip.map(f).join("/")} N·m`);
