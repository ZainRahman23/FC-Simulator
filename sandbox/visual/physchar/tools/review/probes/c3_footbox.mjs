// EXPERIMENT (not the approved body): all C3 tests with the art-fitted boot box vs a boot-sized box (29 × 10.5 × 8.8 cm, heel 6 cm behind the ankle)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const mk = (human) => { const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }); if (human) for (const b of spec.bodies) if (/^foot_/.test(b.name)) { const s = b.shapes[0], yb = s.pos[1] - s.he[1], hx = 0.0525, z0 = -0.06, z1 = 0.23, top = 0.0;
  b.shapes[0] = { ...s, pos: [s.pos[0], (yb + top) / 2, (z0 + z1) / 2], he: [hx, (top - yb) / 2, (z1 - z0) / 2] }; } return spec; };
const A = mk(false), Hh = mk(true), tally = { art: {}, boot: {} };
for (const t of Object.keys(C3.TESTS_C3)) { const out = [];
  for (const [nm, spec] of [["art", A], ["boot", Hh]]) { const r = C3.runC3(J, spec, t, {}), s = r.step || {}, td = s.touchdown; tally[nm][r.outcome] = (tally[nm][r.outcome] || 0) + 1;
    out.push(`${nm}: ${r.outcome.padEnd(20)} ${td ? `u@td ${String(td.uAt).padEnd(4)} err ${String(td.errCm).padStart(5)} cm` : "".padEnd(24)}`); }
  console.log(t.padEnd(19) + out.join(" | ")); }
console.log(JSON.stringify(tally));
