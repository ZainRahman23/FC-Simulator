// occupy1/tools/o_geometry.mjs — THE OCCUPANCY VOLUMES FROM THE REAL BODY: every character's skinned mesh (assets/characters/outfield/<id>:
// rig.json + mesh.bin — read locally, never published), each vertex assigned to its dominant bone, its distance from that bone's segment in the
// bind pose (and, for the trunk, its sideways / front-back extent) — the percentiles the volumes' radii are chosen from (docs: O_REPORT.md)
//   node o_geometry.mjs [--json f]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = new URL("../../../../assets/characters/outfield/", import.meta.url), IDS = ["vinicius", "cucurella", "gabriel", "osimhen", "szoboszlai", "james"];
const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(x * s.length))] : NaN; };
const segD = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], u = L2 > 1e-12 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / L2)) : 0; return Math.hypot(p[0] - a[0] - d[0] * u, p[1] - a[1] - d[1] * u, p[2] - a[2] - d[2] * u); };
// the segments: a bone from its origin to its child's origin (the posed body's J[name].j → J[name].t is the same segment)
const CHILD = { pelvis: "spine", spine: "chest", chest: "neck", neck: "head", thigh_R: "shin_R", shin_R: "foot_R", foot_R: "toe_R", thigh_L: "shin_L", shin_L: "foot_L", foot_L: "toe_L", upperArm_R: "foreArm_R", foreArm_R: "hand_R", upperArm_L: "foreArm_L", foreArm_L: "hand_L" };
const out = {};
for (const id of IDS) { const dir = new URL(id + "/", ROOT); if (!fs.existsSync(new URL("rig.json", dir))) continue; const rig = JSON.parse(fs.readFileSync(new URL("rig.json", dir))), buf = fs.readFileSync(new URL("mesh.bin", dir)), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const L = rig.mesh.layout, V = (k, T) => new T(ab, L[k].byteOffset, L[k].elementCount), P = V("positions", Float32Array), J = V("joints", Uint16Array), Wt = V("weights", Float32Array), n = P.length / 3;
  const bone = rig.bones, by = Object.fromEntries(bone.map((b) => [b.name, b])), D = {};
  for (let i = 0; i < n; i++) { let bi = -1, bw = -1; for (let j = 0; j < 4; j++) if (Wt[4 * i + j] > bw) { bw = Wt[4 * i + j]; bi = J[4 * i + j]; } const nm = bone[bi].name, c = CHILD[nm]; if (!c) continue;
    const p = [P[3 * i], P[3 * i + 1], P[3 * i + 2]], a = by[nm].bindOrigin, b = by[c].bindOrigin, X = D[nm] || (D[nm] = { r: [], x: [], z: [], y: [] }); X.r.push(segD(p, a, b)); X.x.push(p[0] - a[0]); X.z.push(p[2] - a[2]); X.y.push(p[1]); }
  const R = {}; for (const [nm, X] of Object.entries(D)) R[nm] = { n: X.r.length, len: +Math.hypot(...[0, 1, 2].map((k) => by[CHILD[nm]].bindOrigin[k] - by[nm].bindOrigin[k])).toFixed(3), r50: +q(X.r, 0.5).toFixed(3), r75: +q(X.r, 0.75).toFixed(3), r90: +q(X.r, 0.9).toFixed(3), r95: +q(X.r, 0.95).toFixed(3), rMax: +q(X.r, 1).toFixed(3),
    xLo: +q(X.x, 0.03).toFixed(3), xHi: +q(X.x, 0.97).toFixed(3), zLo: +q(X.z, 0.03).toFixed(3), zHi: +q(X.z, 0.97).toFixed(3), yLo: +q(X.y, 0.02).toFixed(3), yHi: +q(X.y, 0.98).toFixed(3) };
  out[id] = { H: rig.H, hipY: +rig.hipHeightM.toFixed(3), hipX: { R: +by.thigh_R.bindOrigin[0].toFixed(3), L: +by.thigh_L.bindOrigin[0].toFixed(3) }, R }; }
for (const [id, o] of Object.entries(out)) { console.log(`\n${id} — stature ${o.H} m, hip joints at height ${o.hipY} m, x ${o.hipX.R} / ${o.hipX.L} m`);
  console.log("  bone          verts  len    r50    r75    r90    r95    max   | x 3–97 %         z (front +) 3–97 %   height 2–98 %");
  for (const [nm, r] of Object.entries(o.R)) console.log(`  ${nm.padEnd(12)} ${String(r.n).padStart(6)} ${r.len.toFixed(3)} ${r.r50.toFixed(3)} ${r.r75.toFixed(3)} ${r.r90.toFixed(3)} ${r.r95.toFixed(3)} ${r.rMax.toFixed(3)} | ${r.xLo.toFixed(3)}…${r.xHi.toFixed(3)}  ${r.zLo.toFixed(3)}…${r.zHi.toFixed(3)}  ${r.yLo.toFixed(3)}…${r.yHi.toFixed(3)}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
