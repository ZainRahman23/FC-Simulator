import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// stance ankle audit: the arbiter's terms / prediction / envelope / realised torque on the stance ankle (all three axes) + CoP vs p*
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 2.5), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
const t0 = +(process.env.T0 || 2.0), t1 = +(process.env.T1 || 2.4), ev = +(process.env.EV || 12), jn = process.env.J || "ankle_R", v3 = (x) => Array.isArray(x) ? x.map(v => (+v).toFixed(0)).join("/") : (+x).toFixed(0);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const e = q.arb.find(a => a.joint === jn); if (!e) continue;
  console.log(`${f(q.t)} ${jn} owner ${e.owner} | ` + e.terms.map(tm => `${tm.m.slice(0, 10)}:${v3(tm.req)}${tm.alw !== undefined ? "→" + v3(tm.alw) : ""}`).join(" ") + ` | pred ${v3(e.pred)} env ${e.env ? v3(e.env.lo) + ".." + v3(e.env.hi) : "-"} real ${v3(e.real)} sat ${JSON.stringify(e.sat)} | p* ${q.ctl && q.ctl.pStar ? q.ctl.pStar.map(v => f(v)).join(",") : "-"} cop ${q.copSmooth ? q.copSmooth.map(v => f(v)).join(",") : "-"}`); }
