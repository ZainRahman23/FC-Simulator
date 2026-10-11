// CXA-1 mesh audit (read-only): the rendered footballers vs their V2 collision shapes, on the SAME frames the review renders.
// Both meshes are skinned exactly as the GPU does (Σ w · (boneWorld · invBind) · bindPos, 4 influences) with the render rule MC-1 §2(4) used by every
// PVP-1A-DX / ABI-1 visual (rotation retarget from the V2 bodies; positions by the rig's own FK from the V2 hip midpoint; runner bones without a V2
// carrier hold the LOCO row-50 presentation, tackler's are neutral). Two measurements:
//   (1) ENVELOPE: per vertex, the signed distance to its own character's collision shapes (its carrier body + parent + children; > 0 = outside every
//       collider) → how much visible anatomy lies outside the physical representation, per body region;
//   (2) VISIBLE INTERSECTION: per frame, vertices of one character lying INSIDE the other character's skinned surface (nearest-surface test with the
//       interpolated skinned normal; depth = distance to that surface) — what the viewer sees as phasing — reported with the bodies involved.
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node cxa1_mesh.mjs --run <record.json.gz> --fixture <fixture.json> --label <id> [--order RT|TR]
//        [--steps 1-62] [--envSteps 3,15,30,45,60] --out <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const GM = await import(new URL("./cxa1_geom.mjs", import.meta.url).href), { V, Q, CL } = GM;
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { IL, MC } = PL;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), FIX = JSON.parse(fs.readFileSync(arg("fixture"))), order = arg("order", "RT"), label = arg("label", "run");
const [s0, s1] = arg("steps", "1-62").split("-").map(Number), envSteps = arg("envSteps", "3,15,30,45,60").split(",").map(Number);
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT), nR = sR.bodies.length, { LOCO } = PL.records();
const LV = IL.loadLV2(), X = LV.X, M4 = X.M4, OFFS = [50, 0, -34], toW = (p) => V.add(p, OFFS);
const rig = (id) => { const SK = Object.assign({}, X.charSkel(id)); delete SK._r1body; return SK; }, SKR = rig("vinicius"), SKT = rig("gabriel");
const INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([body, bone]) => [bone, body]));
const EXTRA = { toe_R: "foot_R", toe_L: "foot_L", hand_R: "forearm_R", hand_L: "forearm_L", clavicle_R: "thorax", clavicle_L: "thorax", neck: "head", hair: "head", root: "pelvis" };
const boneBody = (name) => INV[name] || EXTRA[name];
const qmat = (q, p) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, p[0], p[1], p[2], 1]; };
const qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
function skinMats(SK, md, Sloc, q0) {   // MC-1 §2(4), identical to the clip preparation's retarget
  const Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q = [], p = [], bi = md.bi, offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5);
  for (const b of SK.bones) { const i = b.idx, vb = INV[b.name];
    if (!b.parent) { const pel = Sw[0].pos; q[i] = q0 ? q0[i] : [0, 0, 0, 1]; p[i] = [pel[0], 0, pel[2]]; continue; }
    q[i] = vb != null ? Q.norm(Q.mul(Sw[bi(vb)].rot, Q.conj(md.Z0[bi(vb)].rot))) : q0 ? Q.norm(Q.mul(q[b.parent.idx], Q.mul(Q.conj(q0[b.parent.idx]), q0[i]))) : q[b.parent.idx];
    p[i] = b.name === "pelvis" ? V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)) : V.add(p[b.parent.idx], Q.rot(q[b.parent.idx], b.off)); }
  const out = new Float64Array(SK.bones.length * 16); SK.bones.forEach((b, i) => out.set(M4.mul(qmat(q[b.idx], p[b.idx]), SK.invBind[i]), i * 16)); return out; }
function loadMesh(id, SK) { const dir = path.join(LV.arch || process.env.LV2_ARCHIVE, "assets/characters/outfield", id), rj = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"))), buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const T = { Float32Array, Uint16Array, Uint32Array, Uint8Array }, M = {}; for (const k in rj.mesh.layout) { const L = rj.mesh.layout[k]; M[k] = new T[L.elementType](ab, L.byteOffset, L.elementCount); }
  const nV = rj.mesh.vertexCount, dom = new Int32Array(nV); for (let i = 0; i < nV; i++) { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w > bw) { bw = w; best = M.joints[i * 4 + k]; } } dom[i] = best; }
  const body = Array.from(dom, j => boneBody(SK.bones[j].name)); return { M, nV, nT: M.indices.length / 3, dom, body }; }
function skin(mesh, mats) { const { M, nV } = mesh, P = new Float64Array(nV * 3), N = new Float64Array(nV * 3);
  for (let i = 0; i < nV; i++) { const px = M.positions[i * 3], py = M.positions[i * 3 + 1], pz = M.positions[i * 3 + 2], nx = M.normals[i * 3], ny = M.normals[i * 3 + 1], nz = M.normals[i * 3 + 2]; let x = 0, y = 0, z = 0, a = 0, b = 0, c = 0;
    for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w <= 0) continue; const o = M.joints[i * 4 + k] * 16, m = mats;
      x += w * (m[o] * px + m[o + 4] * py + m[o + 8] * pz + m[o + 12]); y += w * (m[o + 1] * px + m[o + 5] * py + m[o + 9] * pz + m[o + 13]); z += w * (m[o + 2] * px + m[o + 6] * py + m[o + 10] * pz + m[o + 14]);
      a += w * (m[o] * nx + m[o + 4] * ny + m[o + 8] * nz); b += w * (m[o + 1] * nx + m[o + 5] * ny + m[o + 9] * nz); c += w * (m[o + 2] * nx + m[o + 6] * ny + m[o + 10] * nz); }
    P[i * 3] = x - OFFS[0]; P[i * 3 + 1] = y - OFFS[1]; P[i * 3 + 2] = z - OFFS[2]; const l = Math.hypot(a, b, c) || 1; N[i * 3] = a / l; N[i * 3 + 1] = b / l; N[i * 3 + 2] = c / l; }
  return { P, N }; }   // V2 local frame
const meshR = loadMesh("vinicius", SKR), meshT = loadMesh("gabriel", SKT);
const split = (S) => (order === "TR" ? { R: S.slice(nR), T: S.slice(0, nR) } : { R: S.slice(0, nR), T: S.slice(nR) });
// ── (1) envelope: signed distance of each vertex to its carrier body's shapes ∪ parent / children bodies' shapes ──
const nbr = (spec) => { const B = spec.bodies; return Object.fromEntries(B.map((b, i) => [b.name, [i, ...(b.parentIndex >= 0 ? [b.parentIndex] : []), ...B.map((c, j) => (c.parentIndex === i ? j : -1)).filter(j => j >= 0)]])); };
const NB = { R: nbr(sR), T: nbr(sT) };
function envelope(spec, mesh, sk, S, role) { const B = spec.bodies, by = Object.fromEntries(B.map((b, i) => [b.name, i])), per = {};
  for (let i = 0; i < mesh.nV; i++) { const bn = mesh.body[i]; if (!bn) continue; const p = [sk.P[i * 3], sk.P[i * 3 + 1], sk.P[i * 3 + 2]]; let d = Infinity;
    for (const j of NB[role][bn]) for (const s of B[j].shapes) d = Math.min(d, CL.sdShape(s, { pos: S[j].pos, rot: S[j].rot }, p));
    (per[bn] || (per[bn] = [])).push(d); }
  const q = (a, f) => a[Math.min(a.length - 1, Math.floor(f * (a.length - 1)))];
  return Object.fromEntries(Object.entries(per).map(([bn, a]) => { a.sort((x, y) => x - y); const n = a.length; return [bn, { n, outsideFrac: +(a.filter(x => x > 0.001).length / n).toFixed(3), over5mm: +(a.filter(x => x > 0.005).length / n).toFixed(3), over10mm: +(a.filter(x => x > 0.010).length / n).toFixed(3), over20mm: +(a.filter(x => x > 0.020).length / n).toFixed(3), p50mm: +(q(a, 0.5) * 1000).toFixed(1), p95mm: +(q(a, 0.95) * 1000).toFixed(1), maxMm: +(a[n - 1] * 1000).toFixed(1) }]; })); }
// ── (2) visible intersection: vertices of mesh A inside mesh B's skinned surface ──
function grid(meshB, skB, cell) { const { M, nT } = meshB, P = skB.P, G = new Map(), key = (x, y, z) => x + "," + y + "," + z;
  for (let t = 0; t < nT; t++) { const a = M.indices[t * 3], b = M.indices[t * 3 + 1], c = M.indices[t * 3 + 2]; let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[v * 3 + k]); hi[k] = Math.max(hi[k], P[v * 3 + k]); }
    for (let x = Math.floor(lo[0] / cell); x <= Math.floor(hi[0] / cell); x++) for (let y = Math.floor(lo[1] / cell); y <= Math.floor(hi[1] / cell); y++) for (let z = Math.floor(lo[2] / cell); z <= Math.floor(hi[2] / cell); z++) { const k = key(x, y, z); if (!G.has(k)) G.set(k, []); G.get(k).push(t); } }
  return { G, cell, key }; }
function closestTri(p, a, b, c) {   // Ericson's closest point on triangle; returns [point, bary]
  const ab = V.sub(b, a), ac = V.sub(c, a), ap = V.sub(p, a), d1 = V.dot(ab, ap), d2 = V.dot(ac, ap); if (d1 <= 0 && d2 <= 0) return [a, [1, 0, 0]];
  const bp = V.sub(p, b), d3 = V.dot(ab, bp), d4 = V.dot(ac, bp); if (d3 >= 0 && d4 <= d3) return [b, [0, 1, 0]];
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [V.add(a, V.sc(ab, v)), [1 - v, v, 0]]; }
  const cp = V.sub(p, c), d5 = V.dot(ab, cp), d6 = V.dot(ac, cp); if (d6 >= 0 && d5 <= d6) return [c, [0, 0, 1]];
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [V.add(a, V.sc(ac, w)), [1 - w, 0, w]]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [V.add(b, V.sc(V.sub(c, b), w)), [0, 1 - w, w]]; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return [V.add(a, V.add(V.sc(ab, v), V.sc(ac, w))), [1 - v - w, v, w]]; }
function signedToMesh(p, meshB, skB, GR, maxR = 0.12) { const { M } = meshB, P = skB.P, N = skB.N, c0 = [0, 1, 2].map(k => Math.floor(p[k] / GR.cell)); let best = null, bd = Infinity;
  for (let r = 0; r * GR.cell <= maxR; r++) { for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) { if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== r) continue; const L = GR.G.get(GR.key(c0[0] + x, c0[1] + y, c0[2] + z)); if (!L) continue;
      for (const t of L) { const ia = M.indices[t * 3], ib = M.indices[t * 3 + 1], ic = M.indices[t * 3 + 2], va = [P[ia * 3], P[ia * 3 + 1], P[ia * 3 + 2]], vb = [P[ib * 3], P[ib * 3 + 1], P[ib * 3 + 2]], vc = [P[ic * 3], P[ic * 3 + 1], P[ic * 3 + 2]], [q, bc] = closestTri(p, va, vb, vc), d = V.dist(p, q);
        if (d < bd) { bd = d; best = { q, bc, ia, ib, ic, t }; } } }
    if (best && bd <= r * GR.cell) break; }
  if (!best) return null; const n = [0, 1, 2].map(k => best.bc[0] * N[best.ia * 3 + k] + best.bc[1] * N[best.ib * 3 + k] + best.bc[2] * N[best.ic * 3 + k]), s = V.dot(V.sub(p, best.q), n) < 0 ? -1 : 1;
  return { d: s * bd, tri: best.t, vtx: best.ia }; }
function intersection(meshA, skA, meshB, skB, roleA, roleB) { const GR = grid(meshB, skB, 0.025), P = skA.P, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < meshB.nV; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], skB.P[i * 3 + k]); hi[k] = Math.max(hi[k], skB.P[i * 3 + k]); }
  const hits = []; let tested = 0;
  for (let i = 0; i < meshA.nV; i++) { const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; if (p.some((v, k) => v < lo[k] - 0.01 || v > hi[k] + 0.01)) continue; tested++; const r = signedToMesh(p, meshB, skB, GR); if (r && r.d < 0) hits.push({ i, d: r.d, bodyA: meshA.body[i], bodyB: meshB.body[r.vtx] }); }
  const byPair = {}; for (const h of hits) { const k = `${roleA}.${h.bodyA} in ${roleB}.${h.bodyB}`, e = byPair[k] || (byPair[k] = { n: 0, maxMm: 0 }); e.n++; e.maxMm = Math.max(e.maxMm, -h.d * 1000); }
  return { tested, inside: hits.length, maxDepthMm: hits.length ? +(Math.max(...hits.map(h => -h.d)) * 1000).toFixed(2) : 0, byPair: Object.fromEntries(Object.entries(byPair).sort((a, b) => b[1].maxMm - a[1].maxMm).map(([k, e]) => [k, { n: e.n, maxMm: +e.maxMm.toFixed(2) }])), verts: hits.filter(h => -h.d > 0.002).map(h => [h.i, +(-h.d * 1000).toFixed(1)]) }; }
// ── run ──
const out = { tool: "cxa1_mesh.mjs", label, run: arg("run"), order, renderRule: "MC-1 §2(4) (identical to the review clips)", meshes: { runner: { id: "vinicius", vertices: meshR.nV, triangles: meshR.nT }, tackler: { id: "gabriel", vertices: meshT.nV, triangles: meshT.nT } }, envelope: {}, frames: [] };
for (let n = s0; n <= Math.min(s1, run.recs.length); n++) { const S = split(run.recs[n - 1].S), skR = skin(meshR, skinMats(SKR, mdR, S.R, qRef)), skT = skin(meshT, skinMats(SKT, mdT, S.T, null));
  if (envSteps.includes(n)) out.envelope[n] = { runner: envelope(sR, meshR, skR, S.R, "R"), tackler: envelope(sT, meshT, skT, S.T, "T") };
  const TinR = intersection(meshT, skT, meshR, skR, "tackler", "runner"), RinT = intersection(meshR, skR, meshT, skT, "runner", "tackler");
  out.frames.push({ n, tacklerInRunner: TinR, runnerInTackler: RinT, maxVisibleDepthMm: Math.max(TinR.maxDepthMm, RinT.maxDepthMm) });
  if (n % 5 === 0 || n === s0) console.log(`${label} step ${n}: visible intersection max ${Math.max(TinR.maxDepthMm, RinT.maxDepthMm).toFixed(1)} mm (T in R ${TinR.inside} verts ${JSON.stringify(Object.entries(TinR.byPair).slice(0, 2))}; R in T ${RinT.inside} verts ${JSON.stringify(Object.entries(RinT.byPair).slice(0, 2))})`); }
fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(out))); console.log("envelope steps", Object.keys(out.envelope).join(","));
