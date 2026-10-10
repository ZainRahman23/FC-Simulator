// run1/tools/run1_meshcontact.cjs — contact measured on the SKINNED MESH: every vertex of the real character skinned exactly as the GPU does
// (Σ w · skinMat · bindPos, 4 influences), the boot vertices (those weighted to foot / toe bones) per foot → the lowest boot point above the
// stud plane (y = 0, the rig's ground). Stance: should sit at ~0 (no hover, no sinking); swing: clearance. RUN-1 vs V1 (V1.3).
// usage: node run1_meshcontact.cjs [--v 5.5] [--char vinicius]
const { loadRun1, REPO } = require("./run1_load.cjs"), fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), id = arg("char", "vinicius"), v = +arg("v", 5.5);
const dir = path.join(REPO, "assets/characters/outfield", id), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8"));
const buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const T = { Float32Array, Uint16Array, Uint32Array, Uint8Array }, M = {};
for (const k in rig.mesh.layout) { const L = rig.mesh.layout[k]; M[k] = new T[L.elementType](ab, L.byteOffset, L.elementCount); }
const skel = X.ofCharSkeleton({ rig }), B = skel.byName, nV = rig.mesh.vertexCount;
const footBones = { R: [B.foot_R.idx, B.toe_R.idx], L: [B.foot_L.idx, B.toe_L.idx] };
const bootV = { R: [], L: [] };
for (let i = 0; i < nV; i++) { let best = -1, bw = 0; for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w > bw) { bw = w; best = M.joints[i * 4 + k]; } }
  for (const sd of ["R", "L"]) if (footBones[sd].includes(best)) bootV[sd].push(i); }
function lowest(skin, sd) { let lo = 1e9; for (const i of bootV[sd]) { const px = M.positions[i * 3], py = M.positions[i * 3 + 1], pz = M.positions[i * 3 + 2]; let y = 0;
    for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w <= 0) continue; const m = skin.subarray(M.joints[i * 4 + k] * 16, M.joints[i * 4 + k] * 16 + 16); y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); }
    if (y < lo) lo = y; } return lo; }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
function analyse(frames) { const st = [], sw = []; for (const f of frames) for (const sd of ["R", "L"]) (f.planted[sd] ? st : sw).push(f.low[sd]); return { stance: { min: q(st, 0), p05: q(st, 0.05), median: q(st, 0.5), p95: q(st, 0.95), max: q(st, 1) }, swing: { min: q(sw, 0), p05: q(sw, 0.05) } }; }
// RUN-1 (runtime replay path)
const A = X.r1Make(skel), r1 = []; for (let k = 60; k < 60 + 240; k++) { const t = k / 60, restore = X.r1Replay(A, () => v, null, t), ev = X.r1Evaluate(A, { x: 20 + v * t, y: 34, heading: 0, v }); restore();
  r1.push({ low: { R: lowest(ev.skinMats, "R"), L: lowest(ev.skinMats, "L") }, planted: { R: ev.pose.legs.R.st, L: ev.pose.legs.L.st } }); }
// V1.3
X.setCont(false); const a = X.ofActorMake(skel, 0, 0, 0); a.motion = "LOCO"; a.loco = X.ofLocoMake(); a.state = { feet: {} }; const v1 = [];
for (let k = -60; k < 300; k++) { const t = k / 60; a.x = 20 + v * t; a.y = 34; a.facing = 0; a.speed = v; a.sim = { x: a.x, y: a.y, vx: v, vy: 0, facing: 0 }; X.ofActorTick(a, 1 / 60, t + 10); if (k < 60) continue;
  const pl = (sd) => !!(a.state.feet[sd] && a.state.feet[sd].locked && a.state.feet[sd].w > 0.99 && a.state.feet[sd].rel == null); v1.push({ low: { R: lowest(a.skinMats, "R"), L: lowest(a.skinMats, "L") }, planted: { R: pl("R"), L: pl("L") } }); }
const fmt = (o) => Object.entries(o).map(([k, x]) => `${k} ${(x * 1000).toFixed(1)}`).join(" · ");
for (const [nm, F] of [["RUN-1", r1], ["V1.3", v1]]) { const r = analyse(F); console.log(`${nm} ${id} ${v} m/s — boot mesh lowest point above the stud plane (mm): STANCE ${fmt(r.stance)} | SWING ${fmt(r.swing)}`); }
console.log(`boot vertices R ${bootV.R.length}, L ${bootV.L.length} (by dominant influence on foot / toe bones)`);
