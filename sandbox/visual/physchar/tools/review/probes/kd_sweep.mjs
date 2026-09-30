import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const pairs = [["QS20", "QS20_delay"], ["PF40", "DF40"], ["PF50", "DF50"], ["PB30", "DB30"], ["PR40", "DR40"]];
for (const kd of process.argv[3].split(",").map(Number)) { console.log(`--- stance kd scale ${kd}`);
  for (const [a, b] of pairs) { const x = C1.runC1(J, spec, a, { poses, stanceKdScale: kd, seconds: a.startsWith("QS") ? 10 : undefined }), y = C1.runC1(J, spec, b, { poses, stanceKdScale: kd, seconds: b.startsWith("QS") ? 10 : undefined });
    const f = (s) => `${s.outcome.padEnd(9)} rec ${String(s.recoveryS ?? "-").padStart(6)} exc ${String(s.whole.comMaxExcursionCm).padStart(5)} ξmin ${String(s.whole.xiMarginMinCm).padStart(7)} ${s.quiet ? "sway " + s.quiet.swayRmsMm + " mm" : ""}`;
    console.log(`${a.padEnd(6)} ${f(x)}   ||   ${b.padEnd(10)} ${f(y)}`); } }
