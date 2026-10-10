// run1/tools/run1_handclear.cjs — hand ↔ body clearance on the SKINNED MESH: every vertex skinned as the GPU does; hand vertices (dominant
// influence hand_*) vs pelvis / thigh / spine vertices of the same side. Reports the closest approach over a stride (negative = the hand is
// inside the body's surface by at most that much along the line between the closest points — a proxy, the meshes are not watertight).
// Penetration: a hand vertex within 3 cm of its nearest body vertex and more than 2 mm behind that vertex's skinned normal.
// usage: node run1_handclear.cjs [--v 5.5] [--orig 1 | --v11 1]
const { loadRun1, REPO } = require("./run1_load.cjs"), fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), v = +arg("v", 5.5), E = arg("orig") ? X.RUN1_ORIG : arg("v11") ? X.RUN1_V11 : X;
const dir = path.join(REPO, "assets/characters/outfield/vinicius"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8"));
const buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const T = { Float32Array, Uint16Array, Uint32Array, Uint8Array }, M = {};
for (const k in rig.mesh.layout) { const L = rig.mesh.layout[k]; M[k] = new T[L.elementType](ab, L.byteOffset, L.elementCount); }
const skel = Object.assign({}, X.ofCharSkeleton({ rig })); delete skel._r1body; const B = skel.byName, nV = rig.mesh.vertexCount;
const dom = new Int32Array(nV); for (let i = 0; i < nV; i++) { let best = -1, bw = 0; for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w > bw) { bw = w; best = M.joints[i * 4 + k]; } } dom[i] = best; }
const sel = (names) => { const ids = new Set(names.map(n => B[n].idx)), o = []; for (let i = 0; i < nV; i++) if (ids.has(dom[i])) o.push(i); return o; };
const hand = { R: sel(["hand_R"]), L: sel(["hand_L"]) }, body = { R: sel(["pelvis", "thigh_R", "spine"]), L: sel(["pelvis", "thigh_L", "spine"]) };
function skinN(mats, i) { const nx = M.normals[i * 3], ny = M.normals[i * 3 + 1], nz = M.normals[i * 3 + 2]; let x = 0, y = 0, z = 0;
  for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w <= 0) continue; const m = mats.subarray(M.joints[i * 4 + k] * 16, M.joints[i * 4 + k] * 16 + 16); x += w * (m[0] * nx + m[4] * ny + m[8] * nz); y += w * (m[1] * nx + m[5] * ny + m[9] * nz); z += w * (m[2] * nx + m[6] * ny + m[10] * nz); }
  const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
function skin(mats, i) { const px = M.positions[i * 3], py = M.positions[i * 3 + 1], pz = M.positions[i * 3 + 2]; let x = 0, y = 0, z = 0;
  for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w <= 0) continue; const m = mats.subarray(M.joints[i * 4 + k] * 16, M.joints[i * 4 + k] * 16 + 16); x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]); y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]); }
  return [x, y, z]; }
const A = E.r1Make(skel), res = { R: { d: 1e9, ph: 0, pen: 0, nPen: 0, phPen: 0 }, L: { d: 1e9, ph: 0, pen: 0, nPen: 0, phPen: 0 } }, n = 120;
const G = E.r1Prepare(A, v);
for (let f = 0; f < n; f++) { const t = 2 + f / n * G.p.T, rs = E.r1Replay(A, () => v, null, t), ev = E.r1Evaluate(A, { x: 20 + v * t, y: 34, heading: 0, v }); rs();
  for (const sd of ["R", "L"]) { const H = hand[sd].map(i => skin(ev.skinMats, i)), Bd = body[sd].map(i => skin(ev.skinMats, i)), Bn = body[sd].map(i => skinN(ev.skinMats, i));
    let dm = 1e9, pen = 0, nPen = 0;
    for (const h of H) { let bi = -1, bd = 1e9; for (let j = 0; j < Bd.length; j++) { const b = Bd[j], d = (h[0] - b[0]) ** 2 + (h[1] - b[1]) ** 2 + (h[2] - b[2]) ** 2; if (d < bd) { bd = d; bi = j; } }
      bd = Math.sqrt(bd); if (bd < dm) dm = bd; if (bd < 0.03) { const b = Bd[bi], nn = Bn[bi], sdist = (h[0] - b[0]) * nn[0] + (h[1] - b[1]) * nn[1] + (h[2] - b[2]) * nn[2]; if (sdist < -0.002) { nPen++; pen = Math.max(pen, -sdist); } } }
    if (dm < res[sd].d) { res[sd].d = dm; res[sd].ph = A.phase; } if (pen > res[sd].pen) { res[sd].pen = pen; res[sd].nPen = nPen; res[sd].phPen = A.phase; } } }
const f = (r) => `closest ${(r.d * 100).toFixed(1)} cm @${r.ph.toFixed(2)}, deepest penetration ${(r.pen * 1000).toFixed(1)} mm (${r.nPen} hand verts > 2 mm inside) @${r.phPen.toFixed(2)}`;
console.log(`${arg("orig") ? "RUN-1.0" : arg("v11") ? "RUN-1.1" : X.RUN1.id} ${v} m/s — hand vs pelvis / thigh / spine skin: R ${f(res.R)} | L ${f(res.L)}`);
