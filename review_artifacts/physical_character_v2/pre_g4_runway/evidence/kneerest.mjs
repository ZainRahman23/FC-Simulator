// diagnostic: resting state of a G1 scenario (plane) at the env k — knee / ankle anatomical angles, the knee axial hard limits, passive torques
const P = process.argv[2], human = process.argv[3], key = process.argv[4]; const { jolt, specOf, makeSim, JS } = await import(P + "/tools/b_lib.mjs"); const J = await jolt();
const spec = specOf(human), s = makeSim(J, spec, key, { turf: "plane" }), jx = (n) => spec.joints.findIndex(j => j.name === n), D = 180 / Math.PI;
while (s.tick()); const ev = s.up.ev, A = (n, a) => s.P.anat(s.P.jd[jx(n)], ev.qs[jx(n)], a).toFixed(1), pj = (n) => (s.up.joints || []).find(j => j.k === jx(n));
const kj = spec.joints[jx("knee_L")], lim = kj.def.axes; const sm = s.summary();
const tq = (n) => { const p = pj(n); return p ? p.tau.map(v => v.toFixed(2)).join("/") : "—"; };
const footL = spec.bodies.findIndex(b => b.name === "foot_L"), up = (q) => { const { Q } = { Q: null }; return null; };
console.log(`k ${JS.ankleNeutralKPerDeg()} ${human} ${key}: rest exc ${sm.joints.hardExcRestDeg.toFixed(2)}° (${sm.joints.hardExcRestWho}); posture ${sm.outcome.posture}`);
for (const sd of ["L", "R"]) console.log(`   ${sd}: knee flex ${A("knee_" + sd, "flex")}° axial ${A("knee_" + sd, "rot")}° (hard ROM −40…+30, soft at this flexion = screw-home-scaled) | ankle fabd ${A("ankle_" + sd, "fabd")}° DF ${A("ankle_" + sd, "df")}° inv ${A("ankle_" + sd, "inv")}° | passive τ knee ${tq("knee_" + sd)} ankle ${tq("ankle_" + sd)} N·m | hip rot ${A("hip_" + sd, "rot")}°`);
s.destroy();
