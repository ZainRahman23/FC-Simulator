import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const f = (x, d = 2) => x == null ? "-" : (+x).toFixed(d);
const r = G2.runG2a(J, spec, process.argv[3] || "G2a_walkInPlace", { poses, keepStates: true, seconds: +(process.env.SEC || 5) });
const t0 = +(process.env.T0 || 4.3), t1 = +(process.env.T1 || 4.9), ev = +(process.env.EV || 12);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue;
  const sat = q.arb.filter(e => Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat).map(e => spec.joints[e.joint] ? spec.joints[e.joint].name : e.joint);
  const yl = q.arb.filter(e => e.yielded && e.yielded.length).map(e => (spec.joints[e.joint] ? spec.joints[e.joint].name : e.joint) + ":" + e.yielded.map(y => y.m + "(" + y.why.join("/") + ")").join(","));
  console.log(f(q.t, 3), "trunk", f(q.trunk, 1), "cop", q.copSmooth ? q.copSmooth.map(v => f(v, 3)).join(",") : "-", "pStar", q.ctl && q.ctl.pStar ? q.ctl.pStar.map(v => f(v, 3)).join(",") : "-", "xiRef", q.ctl && q.ctl.xiRef ? q.ctl.xiRef.map(v => f(v, 3)).join(",") : "-", "| SAT", sat.join(" "), "| Y", yl.join(" ").slice(0, 200)); }
