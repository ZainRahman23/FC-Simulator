// PPR-3 standing qualification entry (NOT the PVP entry). From the PVP-1A-DX runner posture (the same athletic stance: knee ≈ 14°, hip ≈ 7°,
// ankle ≈ 10° dorsiflexion, ankle centres 0.42 m apart), two corrections only:
//   (1) each foot is rotated about its own ankle centre by the minimal rotation that makes its sole normal vertical (the PVP entry has both feet
//       rolled 4.43° onto their medial edges — PPR2_CRITERIA_AUDIT §5);
//   (2) the whole body is translated vertically so the lowest sole point is exactly at the turf (y = 0): no hover, no penetration.
// Velocities are zero. Nothing else changes (pelvis, trunk, arms, leg segments keep their poses). The tackler block is carried unchanged and unused
// (SOLO only). Writes ppr3/fixture/PPR3_STANDING_ENTRY.json.
// usage: node ppr3_entry.mjs
import fs from "fs"; import crypto from "crypto";
const R = new URL("../../", import.meta.url), PL = await import(new URL("pvp1/scripts/pvp1a_lib.mjs", R).href), GM = await import(new URL("cxa1/scripts/cxa1_geom.mjs", R).href), { V, Q } = PL;
const src = fs.readFileSync(new URL("pvp1/fixture/PVP1A_FIXTURE.json", R)), FIX = JSON.parse(src), spec = PL.SPEC_R(), B = spec.bodies;
const poses = FIX.write.runner.poses.map(p => ({ pos: p.pos.slice(), rot: p.rot.slice() })), log = {};
const between = (a, b) => { const c = V.cross(a, b), d = V.dot(a, b), s = Math.sqrt(2 * (1 + d)); return Q.norm([c[0] / s, c[1] / s, c[2] / s, s / 2]); };   // unit a → unit b
for (const side of ["L", "R"]) { const fi = B.findIndex(b => b.name === "foot_" + side), j = spec.joints.find(x => x.name === "ankle_" + side), p = poses[fi];
  const ank = V.add(p.pos, Q.rot(p.rot, V.sub(j.at, B[fi].origin))), n = Q.rot(p.rot, [0, 1, 0]), q = between(n, [0, 1, 0]);
  p.pos = V.add(ank, Q.rot(q, V.sub(p.pos, ank))); p.rot = Q.norm(Q.mul(q, p.rot));
  log["foot_" + side] = { soleNormalBefore: n, rollDeg: Math.asin(n[2]) * 180 / Math.PI, pitchDeg: Math.asin(-n[0]) * 180 / Math.PI, rotationDeg: 2 * Math.acos(Math.min(1, q[3])) * 180 / Math.PI }; }
const W = GM.worldShapes(spec, poses), low = Math.min(...W.filter(w => /^foot_/.test(w.name)).map(w => w.sup([0, -1, 0])[1]));
for (const p of poses) p.pos = V.add(p.pos, [0, -low, 0]);
const W2 = GM.worldShapes(spec, poses), feet = W2.filter(w => /^foot_/.test(w.name)), minY = Math.min(...feet.map(w => w.sup([0, -1, 0])[1])), others = Math.min(...W2.filter(w => !/^foot_/.test(w.name)).map(w => w.sup([0, -1, 0])[1]));
const M = B.reduce((s, b) => s + b.mass, 0), com = V.sc(poses.reduce((a, p, i) => V.add(a, V.sc(V.add(p.pos, Q.rot(p.rot, B[i].comLocal)), B[i].mass)), [0, 0, 0]), 1 / M);
const soleN = ["L", "R"].map(s => Q.rot(poses[B.findIndex(b => b.name === "foot_" + s)].rot, [0, 1, 0]));
const out = { fixture: "PPR-3 standing qualification entry", derivedFrom: { file: "pvp1/fixture/PVP1A_FIXTURE.json", sha256: crypto.createHash("sha256").update(src).digest("hex") },
  construction: { feetFlattened: log, loweredByM: low, minSoleY: minY, minNonFootY: others, soleNormalsAfter: soleN, com, massKg: M },
  write: { runner: { poses, vel: FIX.write.runner.vel.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })) }, tackler: FIX.write.tackler }, flags: FIX.flags, O: FIX.O };
fs.writeFileSync(new URL("ppr3/fixture/PPR3_STANDING_ENTRY.json", R), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.construction, (k, v) => (typeof v === "number" ? +v.toFixed(5) : v)));
