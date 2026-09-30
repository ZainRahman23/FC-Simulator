// EXPERIMENT: solver-config remedies for the rotating box-edge first touch (D6 slide, gap 0.85 m) — not the approved Gate A config
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const cfgs = process.env.SUB ? [["gate (240 Hz × 1)", null], ["240 Hz × 2 collision steps", { __coll: 2 }], ["240 Hz × 4 collision steps", { __coll: 4 }]] : [["gate (slop 5 mm, 30/4)", null], ["slop 2 mm", { slop: 0.002 }], ["slop 1 mm", { slop: 0.001 }], ["pos iterations 8", { posSteps: 8 }], ["vel iterations 60", { velSteps: 60 }], ["slop 2 mm + pos 8", { slop: 0.002, posSteps: 8 }]];
for (const [key, gap] of [["D6_slide", 0.85], ["D6_slide", 0.75], ["D2_shoved_into", null]]) for (const [nm, w] of cfgs) {
  const orig = D.TESTS_D.D6_slide.A.init.leadGap; if (gap) D.TESTS_D.D6_slide.A.init.leadGap = gap; const t0 = Date.now();
  const r = D.runD(J, spec, key, { keepStates: true, world: w && !w.__coll ? w : undefined, coll: w && w.__coll }); D.TESTS_D.D6_slide.A.init.leadGap = orig;
  const inv = r.contact.invariant, pk = inv ? Math.max(...inv.series.filter(q => q.step >= inv.touchStep - 1 && q.step <= inv.touchStep + 4 && q.gapMm != null).map(q => -q.gapMm)) : null;
  console.log(`${(key + " " + (gap ?? "")).padEnd(20)} ${nm.padEnd(24)} first-touch window max ${pk != null ? pk.toFixed(2) : "-"} mm · run max ${r.contact.maxDepthMm} mm · cpu ${r.cpu.msPerFrame} ms · A ${r.A.slide ? "slide " + r.A.slide.travelM : r.A.fell ? "FELL" : "UP"} B ${r.Bres.fell ? "FELL" : "UP"} · joint sep A ${r.A.maxJointSepMm} mm`); }
