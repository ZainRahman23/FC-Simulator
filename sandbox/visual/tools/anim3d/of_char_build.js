'use strict';
// ══ OUTFIELD CHARACTER BUILD — Astra portable record + shared canonical library → deterministic runtime asset ══════════════════════
// This is a BUILD STEP, not a storage format change. Canonical storage stays what Astra shipped: the shared character library plus one
// ~2 KB portable record per player. Everything this writes is DERIVED and regenerable from those two inputs; nothing here is authored.
//
// Per player it emits, into assets/characters/outfield/<id>/:
//   mesh.bin   packed geometry exactly as the package's own exporter packs it (positions / normals / uvs / colors / joints / weights /
//              indices / inverseBinds, little-endian, documented offsets) plus a per-vertex material-class byte appended
//   rig.json   the fresh per-player bind (offsets, origins, inverse binds), derived bone directions / lengths / radii, the foot contact
//              landmarks (stud tip, sole, ankle, toe), stature and segment chains, part/material tables and the atlas layout
//   atlas.png  the frozen approved atlas, copied byte-for-byte
//
// The inverse binds are the fresh per-player ones from canonical/runtime-bind.cjs (origin summing, translation-only). The template's
// inherited inverseBind / bindJointsCharacter / definitionTable / bindWidthM / radii / variantDef are never read.
//   node of_char_build.js --pkg <extracted package dir> [--ids cucurella,gabriel] [--target mixed|studio] [--out <assets dir>]
const fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const PKG = opt("--pkg", ""), TARGET = opt("--target", "mixed");
const IDS = opt("--ids", "cucurella,gabriel,osimhen,szoboszlai,vinicius,james").split(",").filter(Boolean);
const OUT = opt("--out", path.join(__dirname, "../../../../assets/characters/outfield"));
if (!PKG) { console.error("--pkg <extracted TOUCHLINE_OUTFIELD_CHARACTER_INTEGRATION_V1 dir> is required"); process.exit(2); }
const { constructPortable, CANON, sha } = require(path.join(PKG, "integration/construct-portable.cjs"));
const FA = require(path.join(PKG, "integration/frozen-appearance.cjs"));
const V = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len: (v) => Math.hypot(v[0], v[1], v[2]) };

function build(id) {
  const recPath = path.join(PKG, "players", id + ".json"), recordBytes = fs.readFileSync(recPath);
  const record = JSON.parse(recordBytes);
  const built = constructPortable(record);                                     // shared construction: geometry, colours, weights, part ids
  const mesh = built.mesh, bind = built.bind;
  // exact approved appearance: verifies the config and atlas hashes, then stamps the frozen pixels and the canonical kit materials
  const cp = FA.loadCheckpoint(recordBytes, path.join(PKG, "reference", id));
  const R = FA.applyFrozenAppearance(mesh, cp, TARGET);
  const compiled = R.compile(mesh);
  const n0 = mesh.verts.length, nt = mesh.tris.length;
  // Per-VERTEX material so the character is ONE indexed draw. The normal builder splits vertices per part, but a few sit on a material
  // seam inside a part. Those are DUPLICATED rather than forced onto one material: lossless, and the original vertex range keeps its
  // order and values, so regression hashes over it still hold. Duplicates are appended after the original count.
  const vmatArr = new Int32Array(n0).fill(-1); const dupMap = new Map(); const extra = [];
  for (const t of mesh.tris) for (let e = 0; e < 3; e++) {
    const vi = t.v[e];
    if (vi < n0 && vmatArr[vi] < 0) { vmatArr[vi] = t.mat; continue; }
    const cur = vi < n0 ? vmatArr[vi] : extra[vi - n0].mat;
    if (cur === t.mat) continue;
    const key = vi + ":" + t.mat; let ni = dupMap.get(key);
    if (ni === undefined) { ni = n0 + extra.length; extra.push({ src: vi < n0 ? vi : extra[vi - n0].src, mat: t.mat }); dupMap.set(key, ni); }
    t.v[e] = ni;
  }
  const matConflicts = extra.length, n = n0 + extra.length;
  const A = { positions: new Float32Array(n * 3), normals: new Float32Array(n * 3), uvs: new Float32Array(n * 2),
              colors: new Float32Array(n * 4), joints: new Uint16Array(n * 4), weights: new Float32Array(n * 4),
              indices: new Uint32Array(nt * 3), inverseBinds: new Float32Array(bind.inverseBindMatrices.flat()) };
  const vmat = new Uint16Array(n);
  const fill = (dst, src) => {
    const v = mesh.verts[src];
    A.positions.set(v.p, dst * 3); A.normals.set(compiled.normals[src], dst * 3); A.uvs.set(v.uv, dst * 2);
    A.colors.set([...(v.color || [255, 255, 255]).map(x => x / 255), 1], dst * 4);
    if (v.weights.length > 4) throw new Error("more than four influences");
    v.weights.forEach((w, j) => { A.joints[dst * 4 + j] = w.b; A.weights[dst * 4 + j] = w.w; });
  };
  for (let i = 0; i < n0; i++) { fill(i, i); vmat[i] = vmatArr[i] < 0 ? 0 : vmatArr[i]; }
  for (let k = 0; k < extra.length; k++) { fill(n0 + k, extra[k].src); vmat[n0 + k] = extra[k].mat; }
  mesh.tris.forEach((t, i) => A.indices.set(t.v, i * 3));
  // ── bake the appearance per VERTEX so the whole character is one draw, using Astra's own material semantics ──────────────────────
  //   shade 0 default · 1 skin · 2 refined (interpolated vertex colour) · 3 emissive;  bit0 = textured (sample the atlas)
  const SKIN = new Set(["skin", "face", "skinLight", "lip", "earInner", "faceBase", "faceShadow", "faceLight", "faceSurface"]);
  const EMISSIVE = new Set(["pupil", "iris", "eyeWhite", "glint", "ink", "hair", "eyeSclera", "eyeIris", "eyePupil", "eyeCatchlight"]);
  const AW = 512, AH = 512;
  const cls = new Uint8Array(n), baseCol = new Uint8Array(n * 3), uvA = new Float32Array(n * 2);
  const vRefined = new Uint8Array(n);                                          // a refined_ part uses its interpolated vertex colour
  for (const t of mesh.tris) if (String(t.part).startsWith("refined_")) for (const vi of t.v) vRefined[vi] = 1;
  for (let i = 0; i < n; i++) {
    const mi = vmat[i], m = mesh.materials[mi] || {}, c = compiled.materials[mi] || {};
    const region = c.region || null, rgb = c.rgb || [255, 255, 255];
    const textured = region ? 1 : 0;
    let shade = 0;
    if (vRefined[i] && (mesh.verts[i < n0 ? i : extra[i - n0].src] || {}).color) shade = 2;
    else if (SKIN.has(m.name)) shade = 1;
    else if (EMISSIVE.has(m.name)) shade = 3;
    cls[i] = textured | (shade << 1);
    if (shade === 2) { const v = mesh.verts[i < n0 ? i : extra[i - n0].src]; const col = v.color || [255, 255, 255];
      baseCol[i * 3] = col[0]; baseCol[i * 3 + 1] = col[1]; baseCol[i * 3 + 2] = col[2]; }
    else { baseCol[i * 3] = rgb[0]; baseCol[i * 3 + 1] = rgb[1]; baseCol[i * 3 + 2] = rgb[2]; }
    if (textured) {                                                            // UVs are LOCAL to the material's atlas region: make them global
      const u = Math.min(0.999999, Math.max(0, A.uvs[i * 2])), v = Math.min(0.999999, Math.max(0, A.uvs[i * 2 + 1]));
      uvA[i * 2] = (region[0] + u * region[2]) / AW; uvA[i * 2 + 1] = (region[1] + v * region[3]) / AH;
    }
  }
  // drawable set: unreferenced construction vertices are never indexed, so an indexed draw never touches them
  const used = new Uint8Array(n); for (const i of A.indices) used[i] = 1;
  let unreferenced = 0; for (let i = 0; i < n; i++) if (!used[i]) unreferenced++;
  // ── bone directions / lengths / radii, derived from this player's own bind and geometry ─────────────────────────────────────────
  const byName = Object.fromEntries(bind.bones.map(b => [b.name, b]));
  const childrenOf = {}; for (const b of bind.bones) if (b.parent) (childrenOf[b.parent] ||= []).push(b);
  const PRIMARY = { pelvis: "spine", spine: "chest", chest: "neck", neck: "head", head: "hair", root: "pelvis",
                    clavicle_R: "upperArm_R", clavicle_L: "upperArm_L", upperArm_R: "foreArm_R", upperArm_L: "foreArm_L",
                    foreArm_R: "hand_R", foreArm_L: "hand_L", thigh_R: "shin_R", thigh_L: "shin_L",
                    shin_R: "foot_R", shin_L: "foot_L", foot_R: "toe_R", foot_L: "toe_L" };
  // rigid vertex cloud per bone (weight ~1), used for leaf tips and radii
  const cloud = {}; for (const b of bind.bones) cloud[b.name] = [];
  for (let i = 0; i < n0; i++) {                                                // original vertices only; duplicates add no new geometry
    if (!used[i]) continue;
    const w = mesh.verts[i].weights.filter(x => x.w > 0.5);
    if (w.length === 1) cloud[mesh.bones[w[0].b]].push(mesh.verts[i].p);
  }
  const bones = bind.bones.map(b => {
    const o = b.bindOrigin; let dir = [0, 1, 0], len = 0;
    const kid = PRIMARY[b.name] && byName[PRIMARY[b.name]];
    if (kid) { const d = V.sub(kid.bindOrigin, o); len = V.len(d); if (len > 1e-9) dir = d.map(x => x / len); }
    else {                                                                     // leaf: reach to the furthest rigidly-bound vertex
      const pts = cloud[b.name] || []; let best = null, bd = 0;
      for (const p of pts) { const d = V.sub(p, o), L = V.len(d); if (L > bd) { bd = L; best = d; } }
      if (best && bd > 1e-6) { dir = best.map(x => x / bd); len = bd; }
    }
    let rad = 0.02; const pts = cloud[b.name] || [];
    if (pts.length) { let s = 0; for (const p of pts) { const d = V.sub(p, o); s += Math.hypot(d[0], d[2]); } rad = Math.max(0.015, s / pts.length); }
    return { index: b.index, name: b.name, parent: b.parent, offsetLocal: b.offsetLocal, bindOrigin: b.bindOrigin,
             bindDirLocal: dir, lengthM: +len.toFixed(6), radiusM: +rad.toFixed(4), part: partCategory(b.name) };
  });
  const meas = JSON.parse(fs.readFileSync(path.join(PKG, "derived", id, "measurements.json")));
  const feet = {}; for (const sd of ["R", "L"]) {
    const f = meas.feet[sd];
    feet[sd] = { ankle: f.ankleBindOriginM, toe: f.toeBindOriginM,
                 studTipY: f.lowestFootwearY, soleBottomY: f.rubberSoleBoundsBindM.min[1], soleTopY: f.rubberSoleBoundsBindM.max[1],
                 footwearMin: f.footwearBoundsBindM.min, footwearMax: f.footwearBoundsBindM.max };
  }
  const attach = JSON.parse(fs.readFileSync(path.join(PKG, "derived", id, "attachments.json")));
  A.uvAtlas = uvA; A.baseColor = baseCol; A.shadeClass = cls; A.vertexMaterials = vmat;
  let offset = 0; const layout = {};
  const order = ["positions", "normals", "uvAtlas", "baseColor", "shadeClass", "joints", "weights", "indices", "inverseBinds", "vertexMaterials"];
  for (const k of order) { const arr = A[k]; layout[k] = { byteOffset: offset, byteLength: arr.byteLength, elementType: arr.constructor.name, elementCount: arr.length }; offset += arr.byteLength; }
  const buffer = Buffer.concat(order.map(k => Buffer.from(A[k].buffer, A[k].byteOffset, A[k].byteLength)));
  const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "mesh.bin"), buffer);
  fs.copyFileSync(path.join(PKG, "reference", id, `atlas-B-${TARGET}.png`), path.join(dir, "atlas.png"));
  const rig = {
    classification: "DERIVED RUNTIME ASSET — regenerate with tools/anim3d/of_char_build.js; canonical storage is the portable record + shared library",
    schema: "touchline.outfield-runtime-rig.v1", playerId: id,
    identity: { name: record.identity && (record.identity.displayName || record.identity.name) || id,
                heightCm: meas.sourceDimensions.databaseHeightCm, weightKg: meas.sourceDimensions.weightKg },
    configSha256: sha(recordBytes), appearanceTarget: TARGET,
    units: "metres", coordinateSystem: "character-local Y-up, +Z forward, _R on +X, right-handed", matrixLayout: "column-major",
    H: meas.actualModeledCraniumAboveLowestFootwearM,
    hipHeightM: meas.hipHeightM, segments: meas.segments,
    legLenM: meas.segments.R.legHipToAnkleChainM, ankleHeightM: feet.R.ankle[1],
    ground: { reference: "lowest stud tips", studTipY: feet.R.studTipY, soleBottomY: feet.R.soleBottomY, soleTopY: feet.R.soleTopY,
              note: "Ground is the lowest stud tip (y~0). The rubber sole bottom sits ~12 mm above it; the ankle joint 88 mm; the toe joint 31 mm." },
    feet, bones,
    mesh: { vertexCount: n, originalVertexCount: n0, triangleCount: nt, unreferencedVertices: unreferenced, materialSeamDuplicates: matConflicts,
            byteOrder: "little-endian", layout },
    shading: { model: "Astra framebuffer-renderer treatment B (Soft Cel), Mixed light",
               light: [-0.42, 0.72, -0.54],
               lum: "0.12 + 0.72*max(0,n.l) + 0.16*(0.45 + 0.55*max(0,n.y))",
               tone: "0.24 + 0.36*smoothstep(0.25,0.48,lum) + 0.36*smoothstep(0.57,0.85,lum)",
               skin: ["skin", "skinShadow", "skinLight"].map(nm => { const i = mesh.materials.findIndex(v => v.name === nm);
                 return i >= 0 && compiled.materials[i] ? compiled.materials[i].rgb : null; }),
               classes: "bit0 = textured (sample atlas at uvAtlas); bits1+ = 0 default, 1 skin, 2 refined vertex colour, 3 emissive" },
    materials: mesh.materials.map((m, i) => { const c = compiled.materials[i] || {}; return { name: m.name, rgb: c.rgb || null, region: c.region || null }; }),
    atlas: { file: "atlas.png", width: 512, height: 512 },
    parts: attach.parts.map(p => ({ name: p.name, category: p.category, vertexCount: p.vertexCount, triangleCount: p.triangleCount,
                                    bones: Object.keys(p.bones || {}), blended: p.blendedVertexCount != null ? p.blendedVertexCount : undefined })),
    hairWarnings: (JSON.parse(fs.readFileSync(path.join(PKG, "derived", id, "construction-check.json"))).hairWarnings) || [],
  };
  fs.writeFileSync(path.join(dir, "rig.json"), JSON.stringify(rig, null, 1));
  return { id, bytes: buffer.length, n, nt, unreferenced, matConflicts, H: rig.H, legLen: rig.legLenM, ankleH: rig.ankleHeightM };
}
function partCategory(bone) {
  if (/^(toe|foot)_/.test(bone)) return "boots"; if (/^shin_/.test(bone)) return "socks";
  if (/^(thigh)_/.test(bone)) return "shorts"; if (/^(hand)_/.test(bone)) return "skin";
  if (bone === "hair") return "hair"; if (bone === "head" || bone === "neck") return "skin";
  return "shirt";
}
const rows = [];
for (const id of IDS) { try { rows.push(build(id)); } catch (e) { console.error(id, "FAILED:", e.message); process.exitCode = 1; } }
console.log("player        vertices  triangles  unref  matConflict   mesh.bin      H     legLen   ankleH");
for (const r of rows) console.log(`${r.id.padEnd(13)}${String(r.n).padStart(9)}${String(r.nt).padStart(11)}${String(r.unreferenced).padStart(7)}${String(r.matConflicts).padStart(13)}${(r.bytes / 1048576).toFixed(2).padStart(9)} MB${r.H.toFixed(3).padStart(8)}${r.legLen.toFixed(4).padStart(9)}${r.ankleH.toFixed(4).padStart(9)}`);
