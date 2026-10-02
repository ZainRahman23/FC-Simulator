// foot-gate scratch loader: one spec per foot model
import fs from "fs"; import path from "path";
export const PC = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar";
const ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
export const J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const cache = {}; export function body(fm, x) { const k = fm + JSON.stringify(x || {}); if (!cache[k]) { const spec = buildBodySpec(rig, mesh, { calib: "V1.1", ...(fm && fm !== "F0" ? { footModel: fm } : {}), ...(x || {}) }); cache[k] = { spec, poses: buildPoses(spec) }; } return cache[k]; }
export const G2 = await import(PC + "/pc_gateg2.js"); export const G1 = await import(PC + "/pc_gateg1a.js"); export const C = await import(PC + "/pc_g2char.js"); export const M = await import(PC + "/pc_math.js");
export const f3 = (v, d = 3) => v == null || !Number.isFinite(v) ? "-" : (+v).toFixed(d);
