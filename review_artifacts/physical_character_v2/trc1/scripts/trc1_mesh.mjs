// TRC-1 mesh audit (read-only): the rendered footballers' remaining mesh-vs-mesh interpenetration after the tackler render correction, on the SAME
// frames the review renders, BEFORE (tackler MC-1 §2(4)) and AFTER (tackler MC-1P, trc1_retarget.mjs); the runner is MC-1 in both (unchanged).
// Skinning, envelope and the visible-intersection test are CXA-1's (cxa1_mesh.mjs, copied so the committed CXA-1 tool stays as audited), with ONE fix
// applied to before AND after alike: inside / outside by the closest feature's angle-weighted pseudonormal and only certified nearest surfaces:
// 4-influence GPU skinning; ENVELOPE = signed distance of each vertex to its own character's colliders; VISIBLE INTERSECTION = vertices of one character
// inside the other character's skinned surface (nearest surface, interpolated normal; depth = distance to it). New here:
//   · ANATOMY breakdown: every hit is attributed to the anatomy of the penetrating vertex AND of the penetrated surface (boots = foot+toe, shins/calves,
//     thighs, pelvis/torso, arms incl. hands, head); per group: max depth and the ROBUST depth (the 10th-deepest vertex; 0 with < 10 vertices);
//   · the colliders at the same frame (min signed separation of the 196 runner × tackler shape pairs, exact, cxa1_geom) — unchanged by any render rule;
//   · the visual contact location (deepest overlapping vertex, or the closest approach when the meshes are apart) vs the Jolt contact points solved from
//     that configuration (rec[n], the manifold applied in step n + 1), and AT every impulse-carrying Jolt contact the visual separation of the two
//     contacting bodies' meshes within 80 mm of the contact point (< 0 overlap, > 0 a visible gap).
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node trc1_mesh.mjs --run <rec.json.gz> --label <id> [--fixture <fix.json> (adds step 0 = entry)]
//        [--steps 1-62] [--every 1] [--window 62] [--envSteps 3,15,30,45,60] --out <out.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const T = await import(new URL("./trc1_retarget.mjs", import.meta.url).href), { PL, MC } = T;
const GM = await import(new URL("../../cxa1/scripts/cxa1_geom.mjs", import.meta.url).href), { V, Q, CL } = GM;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), label = arg("label", "run"), FIX = arg("fixture") ? JSON.parse(fs.readFileSync(arg("fixture"))) : null;
const [s0, s1] = arg("steps", "1-62").split("-").map(Number), every = +arg("every", "1"), win = +arg("window", "62"), envSteps = arg("envSteps", "3,15,30,45,60").split(",").map(Number);
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), mdR = MC.model(sR), mdT = MC.model(sT), nR = sR.bodies.length, { LOCO } = PL.records(), LV = T.LV(), OFFS = T.OFFS;
const SKR = T.rig("vinicius"), SKT = T.rig("gabriel"), RT = T.buildPhys(SKT, sT), qRef = SKR.bones.map(b => MC.m2q(LOCO.pres[50].world[LOCO.bones.findIndex(x => x.name === b.name)]));
const INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([body, bone]) => [bone, body]));
const EXTRA = { toe_R: "foot_R", toe_L: "foot_L", hand_R: "forearm_R", hand_L: "forearm_L", clavicle_R: "thorax", clavicle_L: "thorax", neck: "head", hair: "head", root: "pelvis" };
const boneBody = (name) => INV[name] || EXTRA[name];
const GROUP = (body) => !body ? "other" : /^foot_/.test(body) ? "boots" : /^shank_/.test(body) ? "shins_calves" : /^thigh_/.test(body) ? "thighs" : /^(pelvis|abdomen|thorax)$/.test(body) ? "pelvis_torso" : /^(upperArm|forearm)_/.test(body) ? "arms" : body === "head" ? "head" : "other";
const GROUPS = ["boots", "shins_calves", "thighs", "pelvis_torso", "arms", "head"];
// ── CXA-1 helpers (unchanged) ──
function loadMesh(id, SK) { const dir = path.join(LV.arch || process.env.LV2_ARCHIVE, "assets/characters/outfield", id), rj = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"))), buf = fs.readFileSync(path.join(dir, "mesh.bin")), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array }, M = {}; for (const k in rj.mesh.layout) { const L = rj.mesh.layout[k]; M[k] = new TA[L.elementType](ab, L.byteOffset, L.elementCount); }
  const nV = rj.mesh.vertexCount, dom = new Int32Array(nV); for (let i = 0; i < nV; i++) { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w > bw) { bw = w; best = M.joints[i * 4 + k]; } } dom[i] = best; }
  const body = Array.from(dom, j => boneBody(SK.bones[j].name)), nT = M.indices.length / 3;
  // TRC-1: welded topology for angle-weighted pseudonormals (vertices duplicated at UV seams share a position and skin weights)
  const wm = new Map(), W = new Int32Array(nV), rep = []; for (let i = 0; i < nV; i++) { const k = Math.round(M.positions[i * 3] * 1e5) + "," + Math.round(M.positions[i * 3 + 1] * 1e5) + "," + Math.round(M.positions[i * 3 + 2] * 1e5); if (!wm.has(k)) { wm.set(k, wm.size); rep.push(i); } W[i] = wm.get(k); }
  const EA = new Map(); for (let t = 0; t < nT; t++) for (let e = 0; e < 3; e++) { let a = W[M.indices[t * 3 + e]], b = W[M.indices[t * 3 + (e + 1) % 3]]; if (a > b) [a, b] = [b, a]; const k = a * 1e6 + b; if (!EA.has(k)) EA.set(k, []); EA.get(k).push(t); }
  return { M, nV, nT, dom, body, group: body.map(GROUP), W, rep, nW: rep.length, EA }; }
// per skinned instance: face normals and angle-weighted vertex pseudonormals (Bærentzen & Aanæs 2005); edge pseudonormal = Σ adjacent face normals
function pseudo(mesh, sk) { const { M, nT, W, nW } = mesh, P = sk.P, FN = new Float64Array(nT * 3), VN = new Float64Array(nW * 3);
  for (let t = 0; t < nT; t++) { const ia = M.indices[t * 3], ib = M.indices[t * 3 + 1], ic = M.indices[t * 3 + 2], A = [P[ia * 3], P[ia * 3 + 1], P[ia * 3 + 2]], B = [P[ib * 3], P[ib * 3 + 1], P[ib * 3 + 2]], C = [P[ic * 3], P[ic * 3 + 1], P[ic * 3 + 2]];
    const n = V.cross(V.sub(B, A), V.sub(C, A)), l = V.len(n); if (l < 1e-14) continue; const u = V.sc(n, 1 / l); FN.set(u, t * 3);
    const ang = (o, x, y) => { const e1 = V.norm(V.sub(x, o)), e2 = V.norm(V.sub(y, o)); return Math.acos(Math.max(-1, Math.min(1, V.dot(e1, e2)))); };
    [[ia, A, B, C], [ib, B, C, A], [ic, C, A, B]].forEach(([iv, o, x, y]) => { const w = W[iv], g = ang(o, x, y); VN[w * 3] += g * u[0]; VN[w * 3 + 1] += g * u[1]; VN[w * 3 + 2] += g * u[2]; }); }
  sk.FN = FN; sk.VN = VN; return sk; }
function skin(mesh, mats) { const { M, nV } = mesh, P = new Float64Array(nV * 3), N = new Float64Array(nV * 3);
  for (let i = 0; i < nV; i++) { const px = M.positions[i * 3], py = M.positions[i * 3 + 1], pz = M.positions[i * 3 + 2], nx = M.normals[i * 3], ny = M.normals[i * 3 + 1], nz = M.normals[i * 3 + 2]; let x = 0, y = 0, z = 0, a = 0, b = 0, c = 0;
    for (let k = 0; k < 4; k++) { const w = M.weights[i * 4 + k]; if (w <= 0) continue; const o = M.joints[i * 4 + k] * 16, m = mats;
      x += w * (m[o] * px + m[o + 4] * py + m[o + 8] * pz + m[o + 12]); y += w * (m[o + 1] * px + m[o + 5] * py + m[o + 9] * pz + m[o + 13]); z += w * (m[o + 2] * px + m[o + 6] * py + m[o + 10] * pz + m[o + 14]);
      a += w * (m[o] * nx + m[o + 4] * ny + m[o + 8] * nz); b += w * (m[o + 1] * nx + m[o + 5] * ny + m[o + 9] * nz); c += w * (m[o + 2] * nx + m[o + 6] * ny + m[o + 10] * nz); }
    P[i * 3] = x - OFFS[0]; P[i * 3 + 1] = y - OFFS[1]; P[i * 3 + 2] = z - OFFS[2]; const l = Math.hypot(a, b, c) || 1; N[i * 3] = a / l; N[i * 3 + 1] = b / l; N[i * 3 + 2] = c / l; }
  return { P, N }; }   // V2 local frame
const nbr = (spec) => { const B = spec.bodies; return Object.fromEntries(B.map((b, i) => [b.name, [i, ...(b.parentIndex >= 0 ? [b.parentIndex] : []), ...B.map((c, j) => (c.parentIndex === i ? j : -1)).filter(j => j >= 0)]])); };
const NB = { R: nbr(sR), T: nbr(sT) };
function envelope(spec, mesh, sk, S, role) { const B = spec.bodies, per = {};
  for (let i = 0; i < mesh.nV; i++) { const bn = mesh.body[i]; if (!bn) continue; const p = [sk.P[i * 3], sk.P[i * 3 + 1], sk.P[i * 3 + 2]]; let d = Infinity;
    for (const j of NB[role][bn]) for (const s of B[j].shapes) d = Math.min(d, CL.sdShape(s, { pos: S[j].pos, rot: S[j].rot }, p));
    (per[bn] || (per[bn] = [])).push(d); }
  const q = (a, f) => a[Math.min(a.length - 1, Math.floor(f * (a.length - 1)))];
  return Object.fromEntries(Object.entries(per).map(([bn, a]) => { a.sort((x, y) => x - y); const n = a.length; return [bn, { n, outsideFrac: +(a.filter(x => x > 0.001).length / n).toFixed(3), over5mm: +(a.filter(x => x > 0.005).length / n).toFixed(3), over10mm: +(a.filter(x => x > 0.010).length / n).toFixed(3), over20mm: +(a.filter(x => x > 0.020).length / n).toFixed(3), p50mm: +(q(a, 0.5) * 1000).toFixed(1), p95mm: +(q(a, 0.95) * 1000).toFixed(1), maxMm: +(a[n - 1] * 1000).toFixed(1) }]; })); }
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
function signedToMesh(p, meshB, skB, GR, maxR = 0.12) { const { M } = meshB, P = skB.P, N = skB.N, c0 = [0, 1, 2].map(k => Math.floor(p[k] / GR.cell)); let best = null, bd = Infinity, cert = false;
  for (let r = 0; r * GR.cell <= maxR; r++) { for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) { if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== r) continue; const L = GR.G.get(GR.key(c0[0] + x, c0[1] + y, c0[2] + z)); if (!L) continue;
      for (const t of L) { const ia = M.indices[t * 3], ib = M.indices[t * 3 + 1], ic = M.indices[t * 3 + 2], va = [P[ia * 3], P[ia * 3 + 1], P[ia * 3 + 2]], vb = [P[ib * 3], P[ib * 3 + 1], P[ib * 3 + 2]], vc = [P[ic * 3], P[ic * 3 + 1], P[ic * 3 + 2]], [q, bc] = closestTri(p, va, vb, vc), d = V.dist(p, q);
        if (d < bd) { bd = d; best = { q, bc, ia, ib, ic, t }; } } }
    if (best && bd <= r * GR.cell) { cert = true; break; } }
  if (!best) return null; const iv = [best.ia, best.ib, best.ic], z = best.bc.map(x => x === 0), nz = z.filter(Boolean).length; let n;
  // TRC-1: sign by the angle-weighted pseudonormal of the closest FEATURE (face / edge / vertex) — correct for closed meshes, unlike CXA-1's interpolated
  // vertex normal, which can mis-sign points whose closest point lies on an edge or vertex (isolated "deep" vertices, robust depth unaffected)
  if (nz === 2) { const w = meshB.W[iv[best.bc.findIndex(x => x !== 0)]]; n = [skB.VN[w * 3], skB.VN[w * 3 + 1], skB.VN[w * 3 + 2]]; }
  else if (nz === 1) { const k = z.findIndex(Boolean); let a = meshB.W[iv[(k + 1) % 3]], b = meshB.W[iv[(k + 2) % 3]]; if (a > b) [a, b] = [b, a]; n = [0, 0, 0]; for (const t of meshB.EA.get(a * 1e6 + b) || [best.t]) n = V.add(n, [skB.FN[t * 3], skB.FN[t * 3 + 1], skB.FN[t * 3 + 2]]); }
  else n = [skB.FN[best.t * 3], skB.FN[best.t * 3 + 1], skB.FN[best.t * 3 + 2]];
  const s = V.dot(V.sub(p, best.q), n) < 0 ? -1 : 1, ni = [0, 1, 2].map(k => best.bc[0] * N[best.ia * 3 + k] + best.bc[1] * N[best.ib * 3 + k] + best.bc[2] * N[best.ic * 3 + k]), si = V.dot(V.sub(p, best.q), ni) < 0 ? -1 : 1;
  return { d: s * bd, dInterp: si * bd, tri: best.t, vtx: best.ia, cert }; }   // dInterp: CXA-1's interpolated-normal sign (kept for the --signCheck validation)   // cert: the nearest triangle is certified (every cell within bd searched) — added in TRC-1
// ── intersection with anatomy attribution and closest approach (margin 30 mm around B so a small gap is still measured). Only CERTIFIED nearest
//    surfaces count (CXA-1 accepted the best triangle found even when the search radius could not certify it, which can mis-sign a vertex > 120 mm from
//    B's surface — none of the robust CXA-1 numbers depend on such vertices; counts of uncertified vertices are reported) ──
function intersection(meshA, skA, meshB, skB, roleA, roleB) { const GR = skB.GR, P = skA.P, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < meshB.nV; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], skB.P[i * 3 + k]); hi[k] = Math.max(hi[k], skB.P[i * 3 + k]); }
  const hits = []; let closest = null, uncert = 0;
  for (let i = 0; i < meshA.nV; i++) { const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; if (p.some((v, k) => v < lo[k] - 0.03 || v > hi[k] + 0.03)) continue; const r = signedToMesh(p, meshB, skB, GR); if (!r) continue; if (!r.cert) { uncert++; continue; }
    if (!closest || r.d < closest.d) closest = { d: r.d, p, gA: meshA.group[i], gB: meshB.group[r.vtx], bA: meshA.body[i], bB: meshB.body[r.vtx] };
    if (r.d < 0) hits.push({ i, d: -r.d, p, gA: meshA.group[i], gB: meshB.group[r.vtx], bA: meshA.body[i], bB: meshB.body[r.vtx], roleA, roleB }); }
  return { hits, closest, uncert }; }
const robust = (ds) => { if (ds.length < 10) return 0; const s = ds.slice().sort((a, b) => b - a); return s[9]; };
function summarize(hitsAll, closestAll) { const r1 = (x) => +(x * 1000).toFixed(1), out = { inside: hitsAll.length, maxMm: 0, robustMm: 0, groups: {}, pairs: {}, closestMm: null, visual: null };
  if (hitsAll.length) { out.maxMm = r1(Math.max(...hitsAll.map(h => h.d))); out.robustMm = r1(robust(hitsAll.map(h => h.d))); }
  for (const g of GROUPS) { const ds = hitsAll.filter(h => (h.roleA === "tackler" ? h.gA : h.gB) === g || (h.roleA === "runner" ? h.gA : h.gB) === g).map(h => h.d);
    const dT = hitsAll.filter(h => (h.roleA === "tackler" ? h.gA : h.gB) === g).map(h => h.d), dR = hitsAll.filter(h => (h.roleA === "runner" ? h.gA : h.gB) === g).map(h => h.d);
    out.groups[g] = { n: ds.length, maxMm: ds.length ? r1(Math.max(...ds)) : 0, robustMm: r1(robust(ds)), tackler: { maxMm: dT.length ? r1(Math.max(...dT)) : 0, robustMm: r1(robust(dT)) }, runner: { maxMm: dR.length ? r1(Math.max(...dR)) : 0, robustMm: r1(robust(dR)) } }; }
  for (const h of hitsAll) { const tg = h.roleA === "tackler" ? h.bA : h.bB, rg = h.roleA === "runner" ? h.bA : h.bB, k = `T.${tg} × R.${rg}`, e = out.pairs[k] || (out.pairs[k] = { ds: [] }); e.ds.push(h.d); }
  out.pairs = Object.fromEntries(Object.entries(out.pairs).map(([k, e]) => [k, { n: e.ds.length, maxMm: r1(Math.max(...e.ds)), robustMm: r1(robust(e.ds)) }]).sort((a, b) => b[1].maxMm - a[1].maxMm));
  const c = closestAll.filter(Boolean).sort((a, b) => a.d - b.d)[0]; if (c) out.closestMm = r1(c.d);
  if (hitsAll.length) { const deep = hitsAll.slice().sort((a, b) => b.d - a.d), d0 = deep[0], cl = deep.filter(h => V.dist(h.p, d0.p) < 0.06), cen = V.sc(cl.reduce((s, h) => V.add(s, h.p), [0, 0, 0]), 1 / cl.length);
    out.visual = { kind: "deepest overlap", p: d0.p.map(x => +x.toFixed(4)), centroid: cen.map(x => +x.toFixed(4)), tackler: d0.roleA === "tackler" ? d0.bA : d0.bB, runner: d0.roleA === "runner" ? d0.bA : d0.bB }; }
  else if (c) out.visual = { kind: "closest approach", p: c.p.map(x => +x.toFixed(4)), tackler: c.roleA === "tackler" ? c.bA : c.bB, runner: c.roleA === "runner" ? c.bA : c.bB };
  return out; }
// visual separation AT a physical contact site: vertices of the contacting tackler body within 80 mm of the Jolt contact point vs the runner's skinned
// surface, and vice versa; min signed distance (< 0 = the meshes overlap there, > 0 = a visible gap at a physical contact)
function siteSep(c, bT, bR, skR, skT) { let best = null, n = 0;
  for (const [mesh, sk, body, other, osk] of [[meshT, skT, bT, meshR, skR], [meshR, skR, bR, meshT, skT]]) for (let i = 0; i < mesh.nV; i++) { if (mesh.body[i] !== body) continue; const p = [sk.P[i * 3], sk.P[i * 3 + 1], sk.P[i * 3 + 2]]; if (V.dist(p, c) > 0.08) continue;
    const r = signedToMesh(p, other, osk, osk.GR); if (!r || !r.cert) continue; n++; if (best == null || r.d < best) best = r.d; }
  return best == null ? { sepMm: null, n } : { sepMm: +(best * 1000).toFixed(1), n }; }
function meshPair(skR, meshT, skT) { const a = intersection(meshT, skT, meshR, skR, "tackler", "runner"), b = intersection(meshR, skR, meshT, skT, "runner", "tackler");
  a.hits.forEach(h => { h.roleA = "tackler"; }); a.closest && (a.closest.roleA = "tackler"); b.hits.forEach(h => { h.roleA = "runner"; }); b.closest && (b.closest.roleA = "runner");
  return { ...summarize([...a.hits, ...b.hits], [a.closest, b.closest]), uncertified: a.uncert + b.uncert }; }
// colliders (exact; unchanged by any render rule)
function colliders(SR, ST) { const WR = GM.worldShapes(sR, SR), WT = GM.worldShapes(sT, ST); let best = null;
  for (const a of WR) for (const b of WT) { if (V.dist(a.bc, b.bc) - a.br - b.br > 0.05) continue; const g = GM.signedDistance(a.sup, b.sup); if (!best || g.d < best.d) best = { d: g.d, key: `T.${b.name} × R.${a.name}`, p: V.sc(V.add(g.pA, g.pB), 0.5) }; }
  return best ? { minSepMm: +(best.d * 1000).toFixed(2), pair: best.key, p: best.p.map(x => +x.toFixed(4)) } : { minSepMm: null }; }
const meshR = loadMesh("vinicius", SKR), meshT = loadMesh("gabriel", SKT);
const entryS = () => { const mk = (spec, w) => w.poses.map((p, i) => ({ pos: p.pos, rot: p.rot })); return [...mk(sR, FIX.write.runner), ...mk(sT, FIX.write.tackler)]; };
const out = { tool: "trc1_mesh.mjs", label, run: arg("run"), finalHash: run.finalHash, window: win, every, renderRules: { runner: "MC-1 §2(4) (unchanged)", tackler_before: "MC-1 §2(4)", tackler_after: "MC-1P (trc1_retarget.mjs)" },
  anatomy: "boots = foot + toe; shins_calves = shank; thighs; pelvis_torso = pelvis + abdomen + thorax (+ clavicles); arms = upper arm + forearm + hand; head (+ neck, hair); a hit counts for the group of the penetrating vertex and of the penetrated surface",
  meshes: { runner: { id: "vinicius", vertices: meshR.nV }, tackler: { id: "gabriel", vertices: meshT.nV } }, envelope: {}, frames: [] };
// ── --signCheck <steps>: validation of the inside / outside test (before rule = CXA-1's frames). For every tested vertex, the CXA-1 sign (interpolated
//    normal, any nearest triangle found) vs the TRC-1 sign (pseudonormal, certified only); every disagreement deeper than 5 mm is arbitrated by ray parity
//    (7 fixed rays through the whole other mesh, majority of odd crossing counts = inside). --rule after checks the MC-1P frames; --verifyDeep <m> also ray-tests agreed inside vertices at least that deep. Writes the counts, exits. ──
if (arg("signCheck")) { const dirs = [[1, 0.13, 0.07], [-0.21, 1, 0.11], [0.09, -0.17, 1], [-1, -0.3, 0.2], [0.3, -1, -0.25], [-0.15, 0.27, -1], [0.6, 0.6, 0.53]].map(V.norm);
  const rayHits = (o, d, meshB, skB) => { const { M, nT } = meshB, P = skB.P; let c = 0; for (let t = 0; t < nT; t++) { const ia = M.indices[t * 3] * 3, ib = M.indices[t * 3 + 1] * 3, ic = M.indices[t * 3 + 2] * 3;
      const e1 = [P[ib] - P[ia], P[ib + 1] - P[ia + 1], P[ib + 2] - P[ia + 2]], e2 = [P[ic] - P[ia], P[ic + 1] - P[ia + 1], P[ic + 2] - P[ia + 2]], h = V.cross(d, e2), a = V.dot(e1, h); if (Math.abs(a) < 1e-14) continue;
      const f = 1 / a, sv = [o[0] - P[ia], o[1] - P[ia + 1], o[2] - P[ia + 2]], u = f * V.dot(sv, h); if (u < 0 || u > 1) continue; const q = V.cross(sv, e1), v = f * V.dot(d, q); if (v < 0 || u + v > 1) continue; if (f * V.dot(e2, q) > 1e-9) c++; } return c; };
  const res = { tool: "trc1_mesh.mjs --signCheck", label, rule: arg("rule", "before") === "after" ? "after (MC-1P)" : "before (MC-1, = CXA-1's frames)", rays: dirs.length, steps: {} };
  for (const n of arg("signCheck").split(",").filter(Boolean).map(Number).filter(n => n >= 1 && n <= run.recs.length)) { const S = run.recs[n - 1].S, SR = S.slice(0, nR), ST = S.slice(nR), prep = (mesh, sk) => { pseudo(mesh, sk); sk.GR = grid(mesh, sk, 0.025); return sk; };
    const skR = prep(meshR, skin(meshR, T.poseMC1(SKR, mdR, SR, qRef).skin)), skT = prep(meshT, skin(meshT, (arg("rule", "before") === "after" ? T.posePhys(RT, ST) : T.poseMC1(SKT, mdT, ST, null)).skin)), r = { cxa1Inside: 0, trc1Inside: 0, agreeInside: 0, disagree: 0, arbitrated: 0, parityInside: 0, parityOutside: 0, cxa1Only: { n: 0, parityInside: 0, parityOutside: 0 }, trc1Only: { n: 0, parityInside: 0, parityOutside: 0 }, cxa1OnlyDepths: [], uncertifiedCxa1Inside: 0 };
    for (const [mA, sA, mB, sB] of [[meshT, skT, meshR, skR], [meshR, skR, meshT, skT]]) { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < mB.nV; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], sB.P[i * 3 + k]); hi[k] = Math.max(hi[k], sB.P[i * 3 + k]); }
      for (let i = 0; i < mA.nV; i++) { const p = [sA.P[i * 3], sA.P[i * 3 + 1], sA.P[i * 3 + 2]]; if (p.some((v, k) => v < lo[k] - 0.01 || v > hi[k] + 0.01)) continue; const q = signedToMesh(p, mB, sB, sB.GR); if (!q) continue;
        const cx = q.dInterp < 0, tr = q.cert && q.d < 0; if (cx) r.cxa1Inside++; if (tr) r.trc1Inside++; if (cx && !q.cert) r.uncertifiedCxa1Inside++; if (cx && tr) { r.agreeInside++; const vd = +arg("verifyDeep", "0"); if (vd > 0 && -q.d >= vd) { const ins = dirs.filter(d => rayHits(p, d, mB, sB) % 2 === 1).length; const e = r.deepAgreed || (r.deepAgreed = { n: 0, parityInside: 0, parityOutside: 0, depths: [] }); e.n++; if (ins >= 4) e.parityInside++; else e.parityOutside++; e.depths.push([+(-q.d * 1000).toFixed(1), ins]); } continue; } if (cx === tr) continue; r.disagree++;
        if (Math.abs(q.d) < 0.005) continue; r.arbitrated++; const inside = dirs.filter(d => rayHits(p, d, mB, sB) % 2 === 1).length >= 4; if (inside) r.parityInside++; else r.parityOutside++; const cat = cx ? r.cxa1Only : r.trc1Only; cat.n++; if (inside) cat.parityInside++; else cat.parityOutside++; if (cx && !tr) r.cxa1OnlyDepths.push(+(-q.dInterp * 1000).toFixed(1)); else (r.trc1OnlyDepths || (r.trc1OnlyDepths = [])).push(+(-q.d * 1000).toFixed(1)); } }
    r.cxa1OnlyDepths = r.cxa1OnlyDepths.sort((a, b) => b - a).slice(0, 12); res.steps[n] = r; console.log(`${label} step ${n}: ${JSON.stringify(r)}`); }
  fs.writeFileSync(arg("out"), JSON.stringify(res, null, 1)); process.exit(0); }
const steps = []; for (let n = (FIX ? Math.min(0, s0) : Math.max(1, s0)); n <= Math.min(s1, run.recs.length); n++) if (n === 0 || n === s0 || n % every === 0 || n <= 8) steps.push(n);
for (const n of steps) { const S = n === 0 ? entryS() : run.recs[n - 1].S, SR = S.slice(0, nR), ST = S.slice(nR);
  const prep = (mesh, sk) => { pseudo(mesh, sk); sk.GR = grid(mesh, sk, 0.025); return sk; };
  const skR = prep(meshR, skin(meshR, T.poseMC1(SKR, mdR, SR, qRef).skin)), skTo = prep(meshT, skin(meshT, T.poseMC1(SKT, mdT, ST, null).skin)), skTn = prep(meshT, skin(meshT, T.posePhys(RT, ST).skin));
  if (envSteps.includes(n)) out.envelope[n] = { runner: envelope(sR, meshR, skR, SR, "R"), tackler_before: envelope(sT, meshT, skTo, ST, "T"), tackler_after: envelope(sT, meshT, skTn, ST, "T") };
  const next = n === 0 ? run.recs[0] : run.recs[n] || null, phys = next ? next.contacts.filter(c => c.kind === "cross" && c.points.length).map(c => ({ pair: `T.${c.b[1]} × R.${c.a[1]}`, bT: c.b[1], bR: c.a[1], J: +V.len(c.J2).toFixed(4), pts: c.points.map(p => p.p.map(x => +x.toFixed(4))) })) : [];
  for (const c of phys) if (c.J > 1e-3) { const cen = V.sc(c.pts.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / c.pts.length); c.site = { before: siteSep(cen, c.bT, c.bR, skR, skTo), after: siteSep(cen, c.bT, c.bR, skR, skTn) }; }
  const fr = { n, window: n === 0 ? "entry" : n <= win ? "w" : "beyond", colliders: colliders(SR, ST), phys, before: meshPair(skR, meshT, skTo), after: meshPair(skR, meshT, skTn) };
  const physPts = phys.filter(c => c.J > 1e-3).flatMap(c => c.pts); for (const k of ["before", "after"]) { const v = fr[k].visual; if (v && physPts.length) v.distToPhysContactMm = +(Math.min(...physPts.map(q => V.dist(q, v.centroid || v.p))) * 1000).toFixed(1); }
  out.frames.push(fr);
  if (n <= 6 || n % 10 === 0) console.log(`${label} step ${n}: colliders ${fr.colliders.minSepMm} mm (${fr.colliders.pair}) | mesh max/robust BEFORE ${fr.before.maxMm}/${fr.before.robustMm} AFTER ${fr.after.maxMm}/${fr.after.robustMm} mm | after groups ${GROUPS.map(g => g + " " + fr.after.groups[g].robustMm).join(" ")}${physPts.length ? ` | phys ${phys.filter(c => c.J > 1e-3).map(c => c.pair).join(",")} vs visual ${JSON.stringify(fr.after.visual)}` : ""}`); }
// window statistics (frames 1..window)
const W = out.frames.filter(f => f.window === "w"), med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const stat = (get) => { const v = W.map(get); return { median: med(v), max: Math.max(...v), framesOver5mm: v.filter(x => x > 5).length, frames: v.length }; };
out.window_stats = { colliders_minSepMm: { median: med(W.map(f => f.colliders.minSepMm)), min: Math.min(...W.map(f => f.colliders.minSepMm)) } };
for (const k of ["before", "after"]) { out.window_stats[k] = { all: { max: stat(f => f[k].maxMm), robust: stat(f => f[k].robustMm) }, groups: {} };
  for (const g of GROUPS) out.window_stats[k].groups[g] = { max: stat(f => f[k].groups[g].maxMm), robust: stat(f => f[k].groups[g].robustMm), tackler_robust: stat(f => f[k].groups[g].tackler.robustMm), runner_robust: stat(f => f[k].groups[g].runner.robustMm) };
  const pairs = {}; for (const f of W) for (const [p, e] of Object.entries(f[k].pairs)) { const q = pairs[p] || (pairs[p] = { frames: 0, maxMm: 0, robustMaxMm: 0 }); q.frames++; q.maxMm = Math.max(q.maxMm, e.maxMm); q.robustMaxMm = Math.max(q.robustMaxMm, e.robustMm); }
  out.window_stats[k].pairs = Object.fromEntries(Object.entries(pairs).sort((a, b) => b[1].robustMaxMm - a[1].robustMaxMm)); }
fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(out)));
for (const k of ["before", "after"]) console.log(`${label} window ${k}: all max ${JSON.stringify(out.window_stats[k].all.max)} robust ${JSON.stringify(out.window_stats[k].all.robust)}\n   groups robust (median/max): ${GROUPS.map(g => `${g} ${out.window_stats[k].groups[g].robust.median}/${out.window_stats[k].groups[g].robust.max}`).join(" · ")}`);
console.log(`colliders min sep in window: ${JSON.stringify(out.window_stats.colliders_minSepMm)}`);
