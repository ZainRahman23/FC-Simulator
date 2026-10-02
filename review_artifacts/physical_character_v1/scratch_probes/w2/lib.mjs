// shared loader for G2b walker experiments (scratch)
import fs from "fs"; import path from "path";
export const PC = process.env.PC || "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar";
const ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
export const spec = buildBodySpec(rig, mesh, { calib: "V1.1", ...(process.env.DIAGFOOT ? JSON.parse(process.env.DIAGFOOT) : {}) }); export const J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"); export const poses = buildPoses(spec);
export const G2 = await import(PC + "/pc_gateg2.js"); export const C = await import(PC + "/pc_g2char.js"); export const M = await import(PC + "/pc_math.js");
export const W = spec.totalMass * 9.81;
export const bi = (n) => spec.bodies.findIndex(b => b.name === n);
// run a walking config through the G2b_walk08 shell: walk = rhythm.walk, human = human.over additions, n steps, seconds
export function walk(x) { const base = C.CHAR_BASE(x.speed ?? 0.6, x.walkOver); const steps = []; const first = x.first || "R";
  for (let i = 0; i < (x.n ?? 12); i++) { const sw = (i % 2 === 0) === (first === "R") ? "R" : "L"; steps.push(i === 0 ? { sw, fwdK: 0.7 } : i === 1 ? { sw, fwdK: 0.9 } : { sw }); }
  let LOCO = null; const ro = { walk: { ...base.walk, ...(x.walk || {}) }, steps, at: x.at ?? 0.5, ...(x.rhythm || {}) };
  const hum = { ...base.human, ...(x.human || {}) }, lo = x.trunk || x.humanOpts || x.ctrl || x.loco ? { locoOver: { human: { walk: x.refWalk ?? 0.8, over: hum, ...(x.trunk ? { trunk: x.trunk } : {}), ...(x.humanOpts || {}) }, ...(x.ctrl ? { ctrl: x.ctrl } : {}), ...(x.loco || {}) } } : { humanOver: hum };
  const r = G2.runG2a(J, spec, "G2b_walk08", { poses, keepStates: !!x.keep, seconds: x.seconds ?? (1.6 + (x.n ?? 12) * 0.62), rhythmOver: ro, ...lo, onLoco: (l) => { LOCO = l; }, ...(x.push ? { pushChar: x.push } : {}) });
  r.LOCO = LOCO; return r; }
export const fallT = (r) => { const q = r.recs.find(q => q.com[1] < 0.75); return q ? q.t : Infinity; };
export const f3 = (v, d = 3) => v == null || !Number.isFinite(v) ? "-" : (+v).toFixed(d);
