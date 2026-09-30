import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const A = buildBodySpec(rig, mesh), Bv = buildBodySpec(rig, mesh, { calib: "V1.1" }), f = (v, d = 3) => Array.isArray(v) ? v.map(x => (+x).toFixed(d)).join(", ") : (+v).toFixed(d);
const shp = (s) => s.type === "box" ? `box he ${f(s.he, 3)} @ ${f(s.pos, 3)}` : s.type === "tapered" ? `tapered half ${f(s.half)} r ${f(s.rTop)}→${f(s.rBot)} @ ${f(s.pos)}` : s.type === "capsule" ? `capsule half ${f(s.half)} r ${f(s.r)} @ ${f(s.pos)}` : `sphere r ${f(s.r)} @ ${f(s.pos)}`;
const out = { bodies: [], joints: [] };
for (let i = 0; i < A.bodies.length; i++) { const a = A.bodies[i], b = Bv.bodies[i], dist = (s, bd) => { const J = s.joints.find(j => j.parent === bd.name && /knee|elbow|ankle|shin|foreArm/.test(j.child + j.name)); return null; };
  const len = (S, bd) => { const kid = S.joints.find(j => j.parentIndex === bd.index && !/lumbar|thoracic|neck|shoulder|hip/.test(j.name) || (j.parentIndex === bd.index && /knee|elbow|ankle/.test(j.name))); return kid ? Math.hypot(...kid.at.map((v, k) => v - bd.origin[k])) : null; };
  const la = len(A, a), lb = len(Bv, b), comW = (bd) => bd.origin.map((v, k) => v + bd.com[k]);
  out.bodies.push({ name: a.name, parent: a.parent, V1: { jointCentre: a.origin, length: la, mass: a.mass, comLocal: a.com, comWorld: comW(a), inertia: a.inertia, shapes: a.shapes.map(shp), fit: a.fit }, V11: { jointCentre: b.origin, length: lb, mass: b.mass, comLocal: b.com, comWorld: comW(b), inertia: b.inertia, shapes: b.shapes.map(shp), fit: b.fit }, cmNote: a.cmNote });
  const ch = (x, y) => JSON.stringify(x) === JSON.stringify(y) ? "" : "  ◀ changed";
  console.log(`${a.name.padEnd(11)} JC ${f(a.origin)} → ${f(b.origin)}${ch(a.origin, b.origin)}\n            len ${la == null ? "-" : f(la)} → ${lb == null ? "-" : f(lb)} · mass ${f(a.mass, 2)} kg · COM(world) ${f(comW(a))} → ${f(comW(b))} · I ${f(a.inertia, 4)}${ch(a.inertia, b.inertia)}\n            V1  ${a.shapes.map(shp).join(" | ")} · fit ${a.fit.insidePct}%\n            V1.1 ${b.shapes.map(shp).join(" | ")} · fit ${b.fit.insidePct}%`); }
console.log("\ntotal mass", A.totalMass.toFixed(4), Bv.totalMass.toFixed(4), "· L/R mass symmetric:", ["upperArm", "foreArm", "thigh", "shin", "foot"].every(n => Math.abs(A.bodies.find(b => b.name === n + "_L").mass - A.bodies.find(b => b.name === n + "_R").mass) < 1e-12));
const sym = (S) => ["upperArm", "foreArm", "thigh", "shin", "foot"].every(n => { const l = S.bodies.find(b => b.name === n + "_L"), r = S.bodies.find(b => b.name === n + "_R"); return Math.abs(l.origin[0] + r.origin[0]) < 1e-9 && Math.abs(l.com[0] + r.com[0]) < 1e-9 && Math.abs(l.com[1] - r.com[1]) < 1e-9; });
console.log("mirror-symmetric joint centres + COMs: V1", sym(A), "V1.1", sym(Bv));
const wc = (S) => { let m = 0, c = [0, 0, 0]; for (const b of S.bodies) { m += b.mass; c = c.map((v, k) => v + b.mass * (b.origin[k] + b.com[k])); } return c.map(v => v / m); };
console.log("whole-body COM at bind: V1", f(wc(A)), "V1.1", f(wc(Bv)), "(fraction of H:", (wc(A)[1] / rig.H).toFixed(3), (wc(Bv)[1] / rig.H).toFixed(3), ")");
console.log("\nJOINT LIMITS (deg) V1 → V1.1");
for (let i = 0; i < A.joints.length; i++) { const a = A.joints[i], b = Bv.joints[i], d = (r) => r.map(x => (x * 180 / Math.PI).toFixed(1));
  const ra = a.type === "hinge" ? `hinge [${d([a.lo, a.hi])}]` : `twist [${d(a.limits.twist)}] swingY [${d(a.limits.swingY)}] swingZ [${d(a.limits.swingZ)}]`, rb = b.type === "hinge" ? `hinge [${d([b.lo, b.hi])}]` : `twist [${d(b.limits.twist)}] swingY [${d(b.limits.swingY)}] swingZ [${d(b.limits.swingZ)}]`;
  out.joints.push({ name: a.name, V1: ra, V11: rb, bindAbductionDeg: b.bindAbductionDeg ?? null }); console.log(`${a.name.padEnd(11)} ${ra}\n            ${rb}${ra === rb ? "" : "  ◀ changed"}${b.bindAbductionDeg != null ? ` (bind femur abduction ${b.bindAbductionDeg}°)` : ""}`); }
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
