import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, "S4_steps10", { poses, keepStates: true, loco: { delayFb: 0, delayPlan: 0 } }); const f = (x, d = 0) => (+x).toFixed(d);
for (const q of r.recs) { if (q.t < 1.05 || q.t > 1.40 || q.n % 6) continue; const row = [];
  for (const n of ["hip_R", "knee_R", "ankle_R"]) { const e = q.arb.find(a => a.joint === n); const hold = e.terms.find(t => t.kind === "hold"), damp = e.terms.find(t => t.kind === "damp"), ff = e.terms.find(t => t.m === "swing ID feed-forward");
    const v = (x) => Array.isArray(x) ? `[${x.map(y => f(y)).join(",")}]` : f(x); row.push(`${n} FF ${ff ? v(ff.req) : "-"} hold ${v(hold.req)} damp ${v(damp.req)} pred ${v(e.pred)} real ${v(e.real)} env lo ${v(e.env.lo)} hi ${v(e.env.hi)} sat ${JSON.stringify(e.sat)}`); }
  console.log(f(q.t, 3) + "\n   " + row.join("\n   ")); }
