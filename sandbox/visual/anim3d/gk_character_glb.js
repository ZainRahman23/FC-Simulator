// ═══ anim3d/gk_character_glb.js — FINISHED CHARACTER (approved true-proportion Courtois GLB) on the existing skeletal pipeline ═══
// Presentation only. Loads the approved glTF binary UNCHANGED (world scale 1; never rescaled from roster metadata), adapts its exact
// tall bind rig to the runtime skeleton object (same 23-bone hierarchy, same joint order, the asset's own inverse-bind matrices), and
// draws the skinned mesh with a GPU port of the approved "C / Native-output Refined" treatment (Soft Cel B inside; four fixed sub-pixel
// samples per output pixel; no expanding outline; inward kit-ink contour at fractional coverage). The character is rasterized in a
// render-ROI around the keeper at a chosen pixel density (live: the canvas density; Mixed review: 4× logical) with the exact CAMERA_V1
// projection (glCamera) — the world is never scaled or re-positioned to fit a box. The presentation ball is drawn in the same
// framebuffer with a shared depth buffer, so it occludes / is occluded by the character correctly.
//   authored action rotations → tall FK (skelFK on the asset's offsets) → existing procedural IK / contact solve → head look → skin (world × assetInverseBind)
// Nothing here reads or writes gk / ball state; simulation neutrality is unaffected (the backend already ran the description/graph/solve).
const GK_CHAR = {
  registry: {},                                                                                // name → { url, rigUrl, status, asset, skelRecords, contact, gl }
  define(name, url, rigUrl) { this.registry[name] = { name, url, rigUrl, status: "idle", asset: null, rig: null, gl: null }; },
  get(name) { return this.registry[name] || null; },
  // Approved C treatment constants (src/framebuffer-renderer.js): light (render-world, normalized), Soft Cel tone, skin palette, ink
  lightWorld: [-0.42, 0.72, -0.54],
  skin: { base: [0xc7, 0x9c, 0x83], shadow: [0x88, 0x69, 0x5a], light: [0xef, 0xd0, 0xb6] }, ink: [0x17, 0x2f, 0x42],
  growOnly: (new URLSearchParams(location.search).get("gkGrow") || "1") !== "0",                   // grow-only render targets / canvas (no per-frame reallocation; ?gkGrow=0 restores the exact-size path)
  merged: (new URLSearchParams(location.search).get("gkMerged") || "1") !== "0",                 // draw-call batching (one draw for the 29 primitives; verified pixel-identical — ?gkMerged=0 restores the per-primitive path)
  ssaa: 2,                                                                                     // 2×2 fixed sub-pixel samples per output pixel: (0.25,0.25) (0.75,0.25) (0.25,0.75) (0.75,0.75) = the approved four-sample resolve
};
GK_CHAR.define("COURTOIS", "../../assets/characters/courtois/Touchline_Player_courtois.glb", "../../assets/characters/courtois/courtois_rig.json");
// ── loading (async; the backend keeps drawing the previous character until the asset is ready) ────────────────────────────────
function gkCharLoad(name) {
  const e = GK_CHAR.get(name); if (!e || e.status !== "idle") return e ? e.promise : null;
  e.status = "loading";
  e.promise = Promise.all([fetch(e.url).then(r => { if (!r.ok) throw new Error("GLB " + r.status); return r.arrayBuffer(); }), fetch(e.rigUrl).then(r => r.json())]).then(async ([buf, rig]) => {
    e.asset = gkCharParseGLB(buf); e.rig = rig;
    // joint order check: the GLB skin joints (node names, in order) must equal the rig records' order
    const names = e.asset.skin.joints.map(i => e.asset.nodes[i].name); const rigNames = rig.bones.map(b => b.name);
    if (names.join() !== rigNames.join()) throw new Error("Courtois joint order mismatch: " + names.join() + " vs " + rigNames.join());
    e.asset.image = await gkCharDecodeImage(e.asset.imageBlob);
    e.status = "ready"; return e;
  }).catch(err => { e.status = "error"; e.error = String(err); console.error("[gk_character] load failed", err); throw err; });
  return e.promise;
}
function gkCharParseGLB(buf) {
  const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  const len = dv.getUint32(8, true); let off = 12, json = null, bin = null;
  while (off < len) { const cl = dv.getUint32(off, true), ct = dv.getUint32(off + 4, true); if (ct === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, cl))); else if (ct === 0x004e4942) bin = new Uint8Array(buf, off + 8, cl); off += 8 + cl; }
  const acc = (i) => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type], base = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const T = { 5126: Float32Array, 5123: Uint16Array, 5121: Uint8Array, 5125: Uint32Array }[a.componentType]; if (bv.byteStride && bv.byteStride !== n * T.BYTES_PER_ELEMENT) throw new Error("interleaved accessor not supported"); return { data: new T(buf, base, a.count * n), count: a.count, n, ctype: a.componentType }; };
  const mesh = json.meshes[0], prims = mesh.primitives.map(p => ({ material: json.materials[p.material], materialIndex: p.material, pos: acc(p.attributes.POSITION), nrm: acc(p.attributes.NORMAL), uv: acc(p.attributes.TEXCOORD_0), joints: acc(p.attributes.JOINTS_0), weights: acc(p.attributes.WEIGHTS_0), color: acc(p.attributes.COLOR_0), indexed: p.indices != null }));
  if (prims.some(p => p.indexed)) throw new Error("indexed primitives not expected in the approved export");
  const skin = json.skins[0], ibm = acc(skin.inverseBindMatrices);
  const inverseBind = []; for (let j = 0; j < ibm.count; j++) inverseBind.push(Array.from(ibm.data.subarray(j * 16, j * 16 + 16)));
  const img = json.images && json.images[0]; let imageBlob = null; if (img && img.bufferView != null) { const bv = json.bufferViews[img.bufferView]; imageBlob = new Blob([new Uint8Array(buf, bin.byteOffset + (bv.byteOffset || 0), bv.byteLength)], { type: img.mimeType }); }
  return { json, nodes: json.nodes, skin, inverseBind, prims, imageBlob, materials: json.materials, extras: json.extras || null, triangles: prims.reduce((s, p) => s + p.pos.count / 3, 0) };
}
async function gkCharDecodeImage(blob) { if (!blob) return null; return await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" }); }
// ── rig adapter: the serialized tall records → the runtime skeleton object skelFK / the solver expect (idx / off / dir / len / rad / part / parent / children / byName / H / prop) ──
function gkCharSkeleton(entry) {
  if (entry.skel) return entry.skel;
  const rig = entry.rig, bones = [], byName = {};
  for (const r of rig.bones) { const b = { name: r.name, idx: r.index, off: r.offsetLocal.slice(), dir: V3.norm(r.bindDirLocal), len: r.lengthM, rad: r.radiusM, part: r.part, parent: null, children: [] }; bones.push(b); byName[r.name] = b; }
  for (const r of rig.bones) { const b = byName[r.name]; if (r.parent) { b.parent = byName[r.parent]; b.parent.children.push(b); } }
  const skel = { H: rig.H, prop: Object.assign({ legs: 1, arms: 1, torso: 1, width: 1 }, rig.prop || {}), bones, byName, bindWidthM: rig.bindWidthM, character: entry.name, worldScale: 1,
    invBind: entry.asset.inverseBind.map(m => Float32Array.from(m)),                                    // the ASSET's inverse binds (float32), never recomputed from height
    contact: rig.contact };                                                                        // presentation-only contact calibration (palm point / normal, sole, laces) measured from the finished surfaces
  // cross-check: summed tall offsets (zero-rotation bind) vs the asset's inverse binds, and the measured bind height
  const fk = skelFK(skel, {}, M4.ident()); let maxErr = 0; for (const b of bones) { const ib = skel.invBind[b.idx], j = fk.joint[b.idx]; maxErr = Math.max(maxErr, Math.abs(ib[12] + j[0]), Math.abs(ib[13] + j[1]), Math.abs(ib[14] + j[2])); }
  skel.bindCheck = { inverseBindOriginMaxErrM: maxErr, jointOrder: bones.map(b => b.name) }; if (maxErr > 1e-5) console.warn("[gk_character] inverse-bind origins differ from summed offsets by", maxErr, "m");
  entry.skel = skel; return skel;
}
// ── GL resources: one program (C treatment), per-primitive VAOs (non-indexed), the kit atlas as RGBA8 (no colour-space conversion: the reference shades 8-bit display values) ──
function gkCharGL(R, entry) {
  if (entry.gl && entry.gl.R === R) return entry.gl;
  const gl = R.gl;
  const VS = `#version 300 es
  layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv; layout(location=3) in uvec4 aJ; layout(location=4) in vec4 aW; layout(location=5) in vec4 aCol;
  uniform mat4 uView, uProj, uPost; uniform mat4 uBones[24];
  out vec3 vN; out vec2 vUv; out vec4 vCol; out float vDepth;
  void main(){ mat4 sk = aW.x * uBones[aJ.x] + aW.y * uBones[aJ.y] + aW.z * uBones[aJ.z] + aW.w * uBones[aJ.w];
    vec4 wp = sk * vec4(aPos, 1.0); vec4 vp = uView * wp; vN = normalize(mat3(sk) * aNrm); vUv = aUv; vCol = aCol; vDepth = -vp.z; gl_Position = uPost * (uProj * vp); }`;
  // material classes: 0 default (clothing / gear), 1 body skin, 2 refined vertex-colour (face / hair), 3 refined eye, 4 glove latex, 5 gear rubber, 6 ink (emissive), 7 ball, 8 textured (atlas then default)
  const FS = `#version 300 es
  precision highp float; in vec3 vN; in vec2 vUv; in vec4 vCol; in float vDepth;
  uniform int uClass; uniform vec3 uBase; uniform sampler2D uAtlas; uniform vec3 uLight; uniform vec3 uSkinShadow, uSkinLight, uSkinBase;
  layout(location=0) out vec4 oColor;
  float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  vec3 toSRGB8(vec3 c){ vec3 lo = c * 12.92, hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055; return 255.0 * mix(hi, lo, step(c, vec3(0.0031308))); }
  void main(){
    vec3 n = normalize(vN); float ndl = max(0.0, dot(n, uLight)); float hemi = 0.45 + 0.55 * max(0.0, n.y); float lum = 0.12 + 0.72 * ndl + 0.16 * hemi;
    float tone = 0.24 + 0.36 * ss(0.25, 0.48, lum) + 0.36 * ss(0.57, 0.85, lum);
    vec3 c = uBase * 255.0;                                                              // 8-bit display-value domain, as the reference rasterizer
    if (uClass == 8) c = texture(uAtlas, vUv).rgb * 255.0;
    if (uClass == 2) c = toSRGB8(vCol.rgb) * (0.62 + 0.48 * lum);
    else if (uClass == 3) c = toSRGB8(vCol.rgb) * (0.86 + 0.17 * lum);
    else if (uClass == 1) { vec3 sh = uSkinShadow * 0.76 + c * 0.24; c = tone < 0.82 ? sh + (c - sh) * min(1.0, tone / 0.82) : c + (uSkinLight - uSkinBase) * (tone - 0.82) * 2.0; }
    else if (uClass == 4) c = c * (0.77 + 0.25 * lum);
    else if (uClass == 5) c = c * (0.72 + 0.36 * lum);
    else if (uClass == 6) c = c * (0.75 + tone * 0.28) + vec3(0.0, 0.0, 4.0 * (1.0 - tone));
    else if (uClass == 7) c = c * (0.62 + tone * 0.50);                                   // presentation ball: the same lighting language, lighter range (the 2D ball's palette)
    else c = c * (0.52 + tone * 0.60) + vec3(0.0, 0.0, 4.0 * (1.0 - tone));
    oColor = vec4(clamp(c, 0.0, 255.0) / 255.0, 1.0);
  }`;
  // resolve: 2×2 box of the supersampled layer (four fixed sub-pixel positions) → coverage alpha; inward ink contour at fractional coverage; premultiplied output
  const RVS = `#version 300 es
  layout(location=0) in vec2 aP; out vec2 vUv0; void main(){ vUv0 = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;
  const RFS = `#version 300 es
  precision highp float; in vec2 vUv0; uniform sampler2D uSrc; uniform vec2 uTexel; uniform vec3 uInk; uniform vec2 uScale; out vec4 o;
  void main(){
    vec4 s = vec4(0.0); vec2 vUv = vUv0 * uScale;
    s += texture(uSrc, vUv + uTexel * vec2(-0.5, -0.5)); s += texture(uSrc, vUv + uTexel * vec2(0.5, -0.5)); s += texture(uSrc, vUv + uTexel * vec2(-0.5, 0.5)); s += texture(uSrc, vUv + uTexel * vec2(0.5, 0.5));
    float a = s.a / 4.0; if (a <= 0.0) { o = vec4(0.0); return; }
    vec3 c = s.rgb / s.a;                                                                // covered-sample mean (the reference accumulates colour × alpha)
    if (a < 1.0) c = c * (1.0 - 0.08 * (1.0 - a)) + uInk * 0.08 * (1.0 - a);
    o = vec4(c * a, a);
  }`;
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, v)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const P = prog(VS, FS), PR = prog(RVS, RFS), U = (p, n) => gl.getUniformLocation(p, n);
  // MERGED path (draw-call batching, verified pixel-identical): all 29 primitives share one program and one VAO; the material index rides as a
  // per-vertex attribute and selects the class / base colour from uniform arrays — the fragment math is the same source text with the two
  // per-primitive uniforms replaced by flat varyings
  const VSM = VS.replace("layout(location=5) in vec4 aCol;", "layout(location=5) in vec4 aCol; layout(location=6) in float aMat;").replace("out vec3 vN;", "uniform int uClsArr[32]; uniform vec3 uBaseArr[32]; flat out int vCls; flat out vec3 vBase; out vec3 vN;").replace("vUv = aUv; vCol = aCol;", "vUv = aUv; vCol = aCol; int mi = int(aMat + 0.5); vCls = uClsArr[mi]; vBase = uBaseArr[mi];");
  const FSM = FS.replace("uniform int uClass; uniform vec3 uBase;", "flat in int vCls; flat in vec3 vBase;").split("uClass").join("vCls").split("uBase").join("vBase");
  const PM = prog(VSM, FSM);
  const G = { R, P, PR, PM, um: { view: U(PM, "uView"), proj: U(PM, "uProj"), post: U(PM, "uPost"), bones: U(PM, "uBones"), clsArr: U(PM, "uClsArr"), baseArr: U(PM, "uBaseArr"), atlas: U(PM, "uAtlas"), light: U(PM, "uLight"), skinShadow: U(PM, "uSkinShadow"), skinLight: U(PM, "uSkinLight"), skinBase: U(PM, "uSkinBase") }, merged: null, u: { view: U(P, "uView"), proj: U(P, "uProj"), post: U(P, "uPost"), bones: U(P, "uBones"), cls: U(P, "uClass"), base: U(P, "uBase"), atlas: U(P, "uAtlas"), light: U(P, "uLight"), skinShadow: U(P, "uSkinShadow"), skinLight: U(P, "uSkinLight"), skinBase: U(P, "uSkinBase") }, ur: { src: U(PR, "uSrc"), texel: U(PR, "uTexel"), ink: U(PR, "uInk"), scale: U(PR, "uScale") }, prims: [], tex: null, fbo: null, fboW: 0, fboH: 0, fboR: null, fboRW: 0, fboRH: 0 };
  // texture: RGBA8, bilinear, no mipmaps, clamp (software reference: bilinear within the atlas, no mip selection)
  G.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  if (entry.asset.image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, entry.asset.image); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const classOf = (m) => { const n = m.name; if (n === "skin") return 1; if (n.startsWith("refined_eye") || n.startsWith("refined_iris")) return 3; if (n.startsWith("refined_")) return 2; if (n === "glove" || n === "latexPanel" || n === "latexLight") return 4; if (n === "gearRubber") return 5; if (n === "ink") return 6; if (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture) return 8; return 0; };
  if (GK_CHAR.merged) {                                                                    // one VAO for the whole character (+ material index per vertex); class / base arrays in primitive order
    const prims = entry.asset.prims, n = prims.reduce((s, p) => s + p.pos.count, 0); const cat = (key, k) => { const out = new Float32Array(n * k); let o = 0; for (const p of prims) { out.set(p[key].data, o); o += p[key].data.length; } return out; };
    const jo = new Uint16Array(n * 4); { let o = 0; for (const p of prims) { jo.set(p.joints.data, o); o += p.joints.data.length; } } const mat = new Float32Array(n); { let o = 0; prims.forEach((p, i) => { mat.fill(i, o, o + p.pos.count); o += p.pos.count; }); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (loc, arr, k, integer) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); if (integer) gl.vertexAttribIPointer(loc, k, gl.UNSIGNED_SHORT, 0, 0); else gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0); };
    buf(0, cat("pos", 3), 3); buf(1, cat("nrm", 3), 3); buf(2, cat("uv", 2), 2); buf(3, jo, 4, true); buf(4, cat("weights", 4), 4); buf(5, cat("color", 4), 4); buf(6, mat, 1); gl.bindVertexArray(null);
    const cls = new Int32Array(32), base = new Float32Array(96); prims.forEach((p, i) => { cls[i] = classOf(p.material); const bc = (p.material.pbrMetallicRoughness && p.material.pbrMetallicRoughness.baseColorFactor) || [1, 1, 1, 1]; base[i * 3] = bc[0]; base[i * 3 + 1] = bc[1]; base[i * 3 + 2] = bc[2]; });
    cls[31] = 7; base[93] = 0xf2 / 255; base[94] = 0xf0 / 255; base[95] = 0xd5 / 255;               // slot 31 = the presentation ball
    G.merged = { vao, n, cls, base, prims: prims.length };
  }
  for (const p of entry.asset.prims) {
    if (G.merged) { G.prims.push({ n: p.pos.count, cls: classOf(p.material), name: p.material.name }); continue; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (loc, arr, n, integer) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); if (integer) gl.vertexAttribIPointer(loc, n, gl.UNSIGNED_SHORT, 0, 0); else gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
    buf(0, p.pos.data, 3); buf(1, p.nrm.data, 3); buf(2, p.uv.data, 2); buf(3, p.joints.data, 4, true); buf(4, p.weights.data, 4); buf(5, p.color.data, 4); gl.bindVertexArray(null);
    const bc = (p.material.pbrMetallicRoughness && p.material.pbrMetallicRoughness.baseColorFactor) || [1, 1, 1, 1];
    G.prims.push({ vao, n: p.pos.count, cls: classOf(p.material), base: [bc[0], bc[1], bc[2]], name: p.material.name });
  }
  // the presentation ball: a UV sphere (positions + normals; uv / joints / weights / colour constant) drawn with the same program (class 7, all weight on joint 0 = root, bone 0 set to the ball's model matrix)
  { const N = 24, M = 16, pos = [], nrm = []; const v = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const t0 = j / M * Math.PI, t1 = (j + 1) / M * Math.PI, p0 = i / N * Math.PI * 2, p1 = (i + 1) / N * Math.PI * 2; const a = v(t0, p0), b = v(t1, p0), c = v(t0, p1), d = v(t1, p1); for (const q of [a, b, c, c, b, d]) { pos.push(q[0], q[1], q[2]); nrm.push(q[0], q[1], q[2]); } }
    const n = pos.length / 3, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const bufF = (loc, arr, k) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0); };
    bufF(0, new Float32Array(pos), 3); bufF(1, new Float32Array(nrm), 3); bufF(2, new Float32Array(n * 2), 2); const jb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, jb); gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(n * 4), gl.STATIC_DRAW); gl.enableVertexAttribArray(3); gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_SHORT, 0, 0);
    const w = new Float32Array(n * 4); for (let i = 0; i < n; i++) w[i * 4] = 1; bufF(4, w, 4); bufF(5, new Float32Array(n * 4).fill(1), 4); gl.bindVertexArray(null); G.ball = { vao, n }; }
  entry.gl = G; return G;
}
function gkCharTargets(G, w, h, ss) {
  if (GK_CHAR.growOnly) { const up = (v) => Math.ceil(v / 64) * 64; const W0 = w * ss, H0 = h * ss; if (!(G.fbo && G.fboW >= W0 && G.fboH >= H0 && G.fboR && G.fboRW >= w && G.fboRH >= h)) { const wA = up(Math.max(w, G.fboRW || 0)), hA = up(Math.max(h, G.fboRH || 0)); return gkCharTargetsAlloc(G, wA, hA, ss); } return; }
  return gkCharTargetsAlloc(G, w, h, ss);
}
function gkCharTargetsAlloc(G, w, h, ss) {
  const gl = G.R.gl; const W = w * ss, H = h * ss;
  if (G.fboW !== W || G.fboH !== H) { const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    if (G.fbo) { gl.deleteFramebuffer(G.fbo); gl.deleteTexture(G.texC); gl.deleteRenderbuffer(G.rbD); }
    G.texC = tex(); G.rbD = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, G.rbD); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    G.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, G.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, G.texC, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, G.rbD); gl.bindFramebuffer(gl.FRAMEBUFFER, null); G.fboW = W; G.fboH = H; G.allocs = (G.allocs || 0) + 1; }
  if (G.fboRW !== w || G.fboRH !== h) { if (G.fboR) { gl.deleteFramebuffer(G.fboR); gl.deleteTexture(G.texR); } G.texR = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, G.texR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    G.fboR = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, G.fboR); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, G.texR, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); G.fboRW = w; G.fboRH = h; }
}
// ── render the character (+ presentation ball) into a render-ROI at `density` pixels per logical (CSS) pixel ──
//   roi = { x, y, w, h } in LOGICAL canvas pixels (cvW / RES); returns { canvas, w, h, roi } where canvas holds the resolved layer at density (premultiplied RGBA)
function gkCharRender(R, entry, skinMats, roi, density, cvW, cvH, RESv, ball) {
  const gl = R.gl, G = gkCharGL(R, entry), ss = GK_CHAR.ssaa; const w = Math.max(2, Math.round(roi.w * density)), h = Math.max(2, Math.round(roi.h * density));
  gkCharTargets(G, w, h, ss);
  const cam = glCamera(cvW, cvH);                                                            // the exact CAMERA_V1 matrices for the FULL canvas (backing pixels)
  // post-projection window: map the ROI (logical px, canvas y down) onto the framebuffer — the projection itself is untouched
  const Wl = cvW / RESv, Hl = cvH / RESv, sx = Wl / roi.w, sy = Hl / roi.h, tx = (Wl - 2 * roi.x) / roi.w - 1, ty = 1 - (Hl - 2 * roi.y) / roi.h;
  const post = M4.ident(); post[0] = sx; post[5] = sy; post[12] = tx; post[13] = ty;
  gl.bindFramebuffer(gl.FRAMEBUFFER, G.fbo); gl.viewport(0, 0, w * ss, h * ss); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);   // materials are double-sided
  const grown = G.fboW !== w * ss || G.fboH !== h * ss; if (grown) { gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, w * ss, h * ss); }   // grow-only targets: only the ROI sub-rectangle is cleared / drawn
  gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  let draws = 0;
  if (G.merged) {                                                                                // MERGED: one draw for the character (+ one for the ball)
    const u = G.um; gl.useProgram(G.PM); gl.uniformMatrix4fv(u.view, false, cam.view); gl.uniformMatrix4fv(u.proj, false, cam.proj); gl.uniformMatrix4fv(u.post, false, post);
    gl.uniform3fv(u.light, V3.norm(GK_CHAR.lightWorld)); gl.uniform3fv(u.skinShadow, GK_CHAR.skin.shadow); gl.uniform3fv(u.skinLight, GK_CHAR.skin.light); gl.uniform3fv(u.skinBase, GK_CHAR.skin.base);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.uniform1i(u.atlas, 0); gl.uniform1iv(u.clsArr, G.merged.cls); gl.uniform3fv(u.baseArr, G.merged.base);
    gl.uniformMatrix4fv(u.bones, false, skinMats); gl.bindVertexArray(G.merged.vao); gl.drawArrays(gl.TRIANGLES, 0, G.merged.n); draws++;
    if (ball) { const bm = new Float32Array(24 * 16); const m = M4.translate(ball.p[0], ball.p[1], ball.p[2]); m[0] = m[5] = m[10] = ball.r; bm.set(m, 0); gl.uniformMatrix4fv(u.bones, false, bm); gl.bindVertexArray(G.ball.vao); gl.vertexAttrib1f(6, 31); gl.drawArrays(gl.TRIANGLES, 0, G.ball.n); draws++; }
    gl.bindVertexArray(null);
  } else {
  gl.useProgram(G.P); gl.uniformMatrix4fv(G.u.view, false, cam.view); gl.uniformMatrix4fv(G.u.proj, false, cam.proj); gl.uniformMatrix4fv(G.u.post, false, post);
  gl.uniform3fv(G.u.light, V3.norm(GK_CHAR.lightWorld)); gl.uniform3fv(G.u.skinShadow, GK_CHAR.skin.shadow); gl.uniform3fv(G.u.skinLight, GK_CHAR.skin.light); gl.uniform3fv(G.u.skinBase, GK_CHAR.skin.base);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.uniform1i(G.u.atlas, 0);
  gl.uniformMatrix4fv(G.u.bones, false, skinMats);
  for (const p of G.prims) { gl.uniform1i(G.u.cls, p.cls); gl.uniform3fv(G.u.base, p.base); gl.bindVertexArray(p.vao); gl.drawArrays(gl.TRIANGLES, 0, p.n); draws++; }
  if (ball) { const bm = new Float32Array(24 * 16); const m = M4.translate(ball.p[0], ball.p[1], ball.p[2]); m[0] = m[5] = m[10] = ball.r; bm.set(m, 0); gl.uniformMatrix4fv(G.u.bones, false, bm); gl.uniform1i(G.u.cls, 7); gl.uniform3f(G.u.base, 0xf2 / 255, 0xf0 / 255, 0xd5 / 255); gl.bindVertexArray(G.ball.vao); gl.drawArrays(gl.TRIANGLES, 0, G.ball.n); draws++; }
  gl.bindVertexArray(null);
  }
  // resolve pass → layer texture at `density`
  gl.bindFramebuffer(gl.FRAMEBUFFER, G.fboR); gl.viewport(0, 0, w, h); if (grown) gl.scissor(0, 0, w, h); gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(G.PR); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.texC); gl.uniform1i(G.ur.src, 0); gl.uniform2f(G.ur.texel, 1 / G.fboW, 1 / G.fboH); gl.uniform2f(G.ur.scale, (w * ss) / G.fboW, (h * ss) / G.fboH); gl.uniform3f(G.ur.ink, GK_CHAR.ink[0] / 255, GK_CHAR.ink[1] / 255, GK_CHAR.ink[2] / 255);   // the resolve samples the ROI sub-rectangle of the (possibly larger) source
  gl.bindVertexArray(R.quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  // copy to the shared canvas (the renderer's canvas is what the backend composites from; grow-only: the layer sits in the top-left w×h of the canvas)
  if (R.cv.width < w || R.cv.height < h || !GK_CHAR.growOnly) { R.cv.width = GK_CHAR.growOnly ? Math.max(R.cv.width, Math.ceil(w / 64) * 64) : w; R.cv.height = GK_CHAR.growOnly ? Math.max(R.cv.height, Math.ceil(h / 64) * 64) : h; }
  const y0 = R.cv.height - h; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, y0, w, h); if (grown || R.cv.width !== w || R.cv.height !== h) { gl.enable(gl.SCISSOR_TEST); gl.scissor(0, y0, w, h); } gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);   // top-left of the canvas in 2D terms
  gl.useProgram(R.PP); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.texR); gl.uniform1i(R.up.col, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, G.texR); gl.uniform1i(R.up.idt, 1); gl.uniform2f(R.up.texel, 1 / w, 1 / h); gl.uniform1f(R.up.outline, 0); gl.uniform2f(R.up.scale, w / G.fboRW, h / G.fboRH);
  gl.bindVertexArray(R.quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null); gl.disable(gl.SCISSOR_TEST);
  return { canvas: R.cv, w, h, roi, draws, density, ss };
}
// ROI around the character: the projected joints / tips (screen, backing px) plus a margin in metres at the keeper's depth; clamped to the canvas
function gkCharROI(fk, skel, ballP, cvW, cvH, RESv, marginM) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const P3 = (p) => sproj3(p[0], p[1], -p[2]);
  const pts = []; for (const b of skel.bones) { pts.push(fk.joint[b.idx]); pts.push(fk.tip[b.idx]); } if (ballP) pts.push(ballP);
  for (const p of pts) { const s = P3(p); x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); }
  const pel = fk.joint[skel.byName.pelvis.idx], s0 = P3(pel), s1 = P3([pel[0], pel[1] + marginM, pel[2]]), mpx = Math.max(8, Math.abs(s0.y - s1.y));
  x0 = Math.floor((x0 - mpx) / RESv); y0 = Math.floor((y0 - mpx) / RESv); x1 = Math.ceil((x1 + mpx) / RESv); y1 = Math.ceil((y1 + mpx) / RESv);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(Math.ceil(cvW / RESv), x1); y1 = Math.min(Math.ceil(cvH / RESv), y1);
  return { x: x0, y: y0, w: Math.max(2, x1 - x0), h: Math.max(2, y1 - y0) };
}
