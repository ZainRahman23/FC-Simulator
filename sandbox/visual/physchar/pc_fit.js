// ═══ physchar/pc_fit.js — RENDER FIT: solved physical bodies → the 23-bone skeleton → skin matrices (and CPU skinning for measurement) ═══
// Every rig bone belongs to exactly one body (pc_body.js BODY_DEFS[].bones). The Astra bind is translation-only and each body's origin is
// its bone's joint, so a bone's skin matrix is simply its body's rigid transform re-expressed about the bind: R_body, t = p_body − R_body·o_body.
// All bones of one body share that matrix (V1 has no authored sub-bone motion: toe / wrist / clavicle / neck–head split stay rigid in Gate A).
// The render is a pure function of the physical state — there is no animation pose anywhere.
import { V, Q } from "./pc_math.js";
import { BODY_DEFS } from "./pc_body.js";

export function boneBodyMap(rig) { const m = new Int32Array(rig.bones.length).fill(-1);
  rig.bones.forEach((b, i) => { const k = BODY_DEFS.findIndex(d => d.bones.includes(b.name)); m[i] = k; }); return m; }
// states: array of { pos, rot } per body; returns Float32Array(23·16) column-major skin matrices
export function skinMatrices(rig, spec, states, map, out) {
  out = out || new Float32Array(rig.bones.length * 16);
  for (let i = 0; i < rig.bones.length; i++) {
    const k = map[i] >= 0 ? map[i] : 0, s = states[k], o = spec.bodies[k].origin, [x, y, z, w] = s.rot;
    const t = V.sub(s.pos, Q.rot(s.rot, o)), m = i * 16;
    out[m] = 1 - 2 * (y * y + z * z); out[m + 1] = 2 * (x * y + z * w); out[m + 2] = 2 * (x * z - y * w); out[m + 3] = 0;
    out[m + 4] = 2 * (x * y - z * w); out[m + 5] = 1 - 2 * (x * x + z * z); out[m + 6] = 2 * (y * z + x * w); out[m + 7] = 0;
    out[m + 8] = 2 * (x * z + y * w); out[m + 9] = 2 * (y * z - x * w); out[m + 10] = 1 - 2 * (x * x + y * y); out[m + 11] = 0;
    out[m + 12] = t[0]; out[m + 13] = t[1]; out[m + 14] = t[2]; out[m + 15] = 1;
  }
  return out;
}
// CPU skinning of the referenced vertices → the rendered mesh's lowest point (visible ground penetration) — measurement only
export function meshLowestY(mesh, skin, refList) {
  let minY = 1e9, arg = -1; const P = mesh.positions, J = mesh.joints, W = mesh.weights;
  for (let n = 0; n < refList.length; n++) { const v = refList[n], px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2]; let y = 0;
    for (let k = 0; k < 4; k++) { const w = W[v * 4 + k]; if (w <= 0) continue; const m = J[v * 4 + k] * 16; y += w * (skin[m + 1] * px + skin[m + 5] * py + skin[m + 9] * pz + skin[m + 13]); }
    if (y < minY) { minY = y; arg = v; } }
  return { minY, vertex: arg };
}
export function referencedVertices(mesh) { const ref = new Uint8Array(mesh.positions.length / 3); for (let i = 0; i < mesh.indices.length; i++) ref[mesh.indices[i]] = 1;
  const out = []; for (let v = 0; v < ref.length; v++) if (ref[v]) out.push(v); return Uint32Array.from(out); }
