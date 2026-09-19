// ═══ anim3d/skeleton.js — shared football-player skeleton: hierarchy, bind pose, FK, mirror, 2-bone IK ═══
// LOCAL (character) frame: +x = the character's RIGHT, +y = up, +z = forward (facing). Right-handed.
// 3D WORLD frame (gl_renderer): x = pitch x (east), y = height, z = −pitch-y (north) — right-handed; the renderer converts.
// A pose is { boneName: [pitchDeg, yawDeg, rollDeg] } applied in the bone's parent-aligned frame (bind rotations are identity),
// so clips are rotation-only and retarget to any proportions. Bone lengths/offsets are fractions of height H.
const SKEL_PARTS = {   // material groups (customisation seam: swap colours/meshes per group without touching clips)
  skin: [0.85, 0.63, 0.44], hair: [0.12, 0.09, 0.07], shirt: [0.22, 0.88, 0.11], shorts: [0.07, 0.07, 0.08],
  socks: [0.10, 0.10, 0.11], boots: [0.05, 0.05, 0.06], gloves: [0.96, 0.96, 0.96],
};
// name, parent, offset (fraction of H, local frame of the parent), bind direction (unit, local), length (H), radius (m at H 1.88), part
const SKEL_DEF = [
  ["root",       null,      [0, 0, 0],            [0, 1, 0],  0,     0,     null],
  ["pelvis",     "root",    [0, 0.50, 0],         [0, 1, 0],  0.06,  0.17,  "shorts"],
  ["spine",      "pelvis",  [0, 0.06, 0],         [0, 1, 0],  0.12,  0.17,  "shirt"],
  ["chest",      "spine",   [0, 0.12, 0],         [0, 1, 0],  0.14,  0.19,  "shirt"],
  ["neck",       "chest",   [0, 0.14, 0],         [0, 1, 0],  0.05,  0.06,  "skin"],
  ["head",       "neck",    [0, 0.05, 0],         [0, 1, 0],  0.12,  0.13,  "skin"],
  ["hair",       "head",    [0, 0.07, -0.005],    [0, 1, 0],  0.05,  0.133, "hair"],
  ["clavicle_R", "chest",   [0.03, 0.12, 0],      [1, 0, 0],  0.10,  0.05,  "shirt"],
  ["upperArm_R", "clavicle_R", [0.10, 0, 0],      [0, -1, 0], 0.17,  0.07,  "shirt"],
  ["foreArm_R",  "upperArm_R", [0, -0.17, 0],     [0, -1, 0], 0.15,  0.06,  "shirt"],
  ["hand_R",     "foreArm_R",  [0, -0.15, 0],     [0, -1, 0], 0.06,  0.07,  "gloves"],
  ["clavicle_L", "chest",   [-0.03, 0.12, 0],     [-1, 0, 0], 0.10,  0.05,  "shirt"],
  ["upperArm_L", "clavicle_L", [-0.10, 0, 0],     [0, -1, 0], 0.17,  0.055, "shirt"],
  ["foreArm_L",  "upperArm_L", [0, -0.17, 0],     [0, -1, 0], 0.15,  0.06,  "shirt"],
  ["hand_L",     "foreArm_L",  [0, -0.15, 0],     [0, -1, 0], 0.06,  0.07,  "gloves"],
  ["thigh_R",    "pelvis",  [0.095, 0, 0],        [0, -1, 0], 0.24,  0.095, "shorts"],
  ["shin_R",     "thigh_R", [0, -0.24, 0],        [0, -1, 0], 0.22,  0.075, "socks"],
  ["foot_R",     "shin_R",  [0, -0.22, 0],        [0, -0.3, 0.954], 0.10, 0.06, "boots"],
  ["toe_R",      "foot_R",  [0, -0.03, 0.095],    [0, 0, 1],  0.04,  0.04,  "boots"],
  ["thigh_L",    "pelvis",  [-0.095, 0, 0],       [0, -1, 0], 0.24,  0.085, "shorts"],
  ["shin_L",     "thigh_L", [0, -0.24, 0],        [0, -1, 0], 0.22,  0.075, "socks"],
  ["foot_L",     "shin_L",  [0, -0.22, 0],        [0, -0.3, 0.954], 0.10, 0.06, "boots"],
  ["toe_L",      "foot_L",  [0, -0.03, 0.095],    [0, 0, 1],  0.04,  0.04,  "boots"],
];
const DEG = Math.PI / 180;
function skelBuild(H) {                  // bind skeleton for a character of height H (m); radii scale with H/1.88
  const bones = [], byName = {};
  for (const [name, parent, off, dir, len, rad, part] of SKEL_DEF) {
    const b = { name, parent: parent ? byName[parent] : null, idx: bones.length, off: off.map(v => v * H), dir: V3.norm(dir), len: len * H, rad: rad * (H / 1.88), part, children: [] };
    bones.push(b); byName[name] = b; if (b.parent) b.parent.children.push(b);
  }
  return { H, bones, byName, bindWidthM: 0.19 * H };
}
// FK: pose (eulers deg per bone) + root matrix (character local → 3D world) → per-bone world matrices + joint/tip positions
function skelFK(skel, pose, rootM) {
  const out = { world: new Array(skel.bones.length), joint: new Array(skel.bones.length), tip: new Array(skel.bones.length) };
  for (const b of skel.bones) {
    const e = pose[b.name] || [0, 0, 0];
    const local = M4.mul(M4.translate(b.off[0], b.off[1], b.off[2]), M4.euler(e[0] * DEG, e[1] * DEG, e[2] * DEG));
    const w = b.parent ? M4.mul(out.world[b.parent.idx], local) : M4.mul(rootM, local);
    out.world[b.idx] = w; out.joint[b.idx] = M4.origin(w); out.tip[b.idx] = M4.transformPoint(w, V3.scale(b.dir, b.len));
  }
  return out;
}
function poseLerp(a, b, t) { const p = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of keys) { const x = a[k] || [0, 0, 0], y = b[k] || [0, 0, 0]; p[k] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]; } return p; }
function poseScale(a, s) { const p = {}; for (const k in a) p[k] = [a[k][0] * s, a[k][1] * s, a[k][2] * s]; return p; }
function poseAdd(a, b) { const p = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of keys) { const x = a[k] || [0, 0, 0], y = b[k] || [0, 0, 0]; p[k] = [x[0] + y[0], x[1] + y[1], x[2] + y[2]]; } return p; }
// mirror a pose across the character's sagittal plane: swap _L/_R bones, negate yaw and roll
function poseMirror(a) { const p = {}; for (const k in a) { const m = k.endsWith("_R") ? k.slice(0, -2) + "_L" : k.endsWith("_L") ? k.slice(0, -2) + "_R" : k; const e = a[k]; p[m] = [e[0], -e[1], -e[2]]; } return p; }
