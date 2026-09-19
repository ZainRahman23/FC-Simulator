// ═══ anim3d/gl_renderer.js — zero-dependency WebGL2 character renderer for the skeletal prototype ═══
// Draws skeleton bones as capsule parts into an OFFSCREEN canvas whose projection is mathematically identical to the
// renderer's CAMERA_V1 (fproj3/sproj3: authored basis PROJ.{C,r,u,f,fpx}, rail TRAVEL, RIG.zoom, RES). The canvas is
// rendered at 1/pixelScale of the backing resolution and composited with nearest-neighbour drawImage (Option B),
// with quantised palette shading (Option D) and a 1-texel id/depth outline. Option C (per-character texture at a fixed
// texel size) is a mode switch on the same code path. Nothing here reads or writes simulation state.
// 3D world frame: x = pitch x, y = height, z = −pitch-y (right-handed). Convert at the boundary: glz = −pitchY.
const GL3D = {
  pixelScale: 2,          // 1 = backing resolution; 2/3 = chunkier texels (nearest upscale)
  bands: 3,               // shading quantisation bands
  outline: true,          // 1-texel dark outline from id/depth edges
  light: [-0.35, 0.9, 0.45], // direction TOWARD the light (3D world): high, slightly from the south-west/camera side
  near: 1.0, far: 400.0,
  segments: 10,           // capsule radial segments (low-poly look)
  fixedTexelM: 0.055,     // Option C: metres per texel at the character (≈ one sprite art pixel: 1.88 m body / 100 px)
  mode: "B",              // "B" screen-aligned low-res | "C" character-space fixed texel density (render scale from depth)
};
function glCreateRenderer() {
  const cv3 = document.createElement("canvas"); cv3.width = 16; cv3.height = 16;
  const gl = cv3.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: true, preserveDrawingBuffer: false });
  if (!gl) { console.warn("WebGL2 unavailable — SKELETAL_3D backend disabled"); return null; }
  const VS = `#version 300 es
  layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm;
  uniform mat4 uModel, uView, uProj; uniform mat3 uNrm;
  out vec3 vN; out float vDepth;
  void main(){ vec4 wp = uModel * vec4(aPos,1.0); vec4 vp = uView * wp; vN = normalize(uNrm * aNrm); vDepth = -vp.z; gl_Position = uProj * vp; }`;
  const FS = `#version 300 es
  precision mediump float; in vec3 vN; in float vDepth;
  uniform vec3 uColor; uniform vec3 uLight; uniform float uBands; uniform float uId;
  layout(location=0) out vec4 oColor; layout(location=1) out vec4 oId;
  void main(){
    float nl = max(0.0, dot(normalize(vN), normalize(uLight)));
    float q = floor(nl * uBands + 0.35) / uBands;             // quantised diffuse
    float shade = 0.55 + 0.45 * q;                            // band range: 0.55 (shadow) .. 1.0 (lit)
    oColor = vec4(uColor * shade, 1.0);
    oId = vec4(uId / 255.0, vDepth / 400.0, 0.0, 1.0);
  }`;
  const PVS = `#version 300 es
  layout(location=0) in vec2 aP; out vec2 vUv; void main(){ vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;
  const PFS = `#version 300 es
  precision mediump float; in vec2 vUv; uniform sampler2D uCol, uIdTex; uniform vec2 uTexel; uniform float uOutline; out vec4 o;
  void main(){
    vec4 c = texture(uCol, vUv); vec4 id = texture(uIdTex, vUv);
    if (c.a <= 0.0) { o = vec4(0.0); return; }
    bool edge = false;
    if (uOutline > 0.5) {
      vec2 d[4] = vec2[4](vec2(uTexel.x,0.0), vec2(-uTexel.x,0.0), vec2(0.0,uTexel.y), vec2(0.0,-uTexel.y));
      for (int i = 0; i < 4; i++) { vec4 n = texture(uIdTex, vUv + d[i]); vec4 nc = texture(uCol, vUv + d[i]);
        if (nc.a <= 0.0) edge = true;                                   // silhouette (inner outline)
        else if (abs(n.r - id.r) > 0.5/255.0 && (n.g < id.g - 0.0004)) edge = true;   // a nearer different part in front: crease line
      }
    }
    o = edge ? vec4(c.rgb * 0.35, 1.0) : c;
  }`;
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, v)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const P = prog(VS, FS), PP = prog(PVS, PFS);
  const U = (p, n) => gl.getUniformLocation(p, n);
  const R = { cv: cv3, gl, P, PP, u: { model: U(P, "uModel"), view: U(P, "uView"), proj: U(P, "uProj"), nrm: U(P, "uNrm"), color: U(P, "uColor"), light: U(P, "uLight"), bands: U(P, "uBands"), id: U(P, "uId") },
              up: { col: U(PP, "uCol"), idt: U(PP, "uIdTex"), texel: U(PP, "uTexel"), outline: U(PP, "uOutline") }, meshes: new Map(), fbo: null, fboW: 0, fboH: 0, quad: null };
  // fullscreen quad
  R.quad = gl.createVertexArray(); gl.bindVertexArray(R.quad); const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  return R;
}
// capsule along +y from 0 to len (hemispherical caps of radius rad beyond both ends) — one VAO per (len, rad) pair
function glCapsule(R, len, rad) {
  const key = len.toFixed(4) + "|" + rad.toFixed(4); if (R.meshes.has(key)) return R.meshes.get(key);
  const gl = R.gl, N = GL3D.segments, rings = 4, pos = [], nrm = [], idx = [];
  const ring = (y, r, ny) => { const base = pos.length / 3; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a); pos.push(cx * r, y, cz * r); const n = V3.norm([cx * (r > 1e-6 ? 1 : 0), ny, cz * (r > 1e-6 ? 1 : 0)]); nrm.push(n[0], n[1], n[2]); } return base; };
  const rows = [];
  for (let k = 0; k <= rings; k++) { const t = k / rings * Math.PI / 2; rows.push(ring(-rad * Math.cos(t), rad * Math.sin(t), -Math.cos(t))); }     // bottom cap (−rad .. 0)
  for (let k = rings; k >= 0; k--) { const t = k / rings * Math.PI / 2; rows.push(ring(len + rad * Math.cos(t), rad * Math.sin(t), Math.cos(t))); } // top cap (len .. len+rad)
  for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < N; i++) { const a = rows[r] + i, b = rows[r + 1] + i; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nrm), gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null); const m = { vao, n: idx.length }; R.meshes.set(key, m); return m;
}
function glEnsureTarget(R, w, h) {
  const gl = R.gl; if (R.fboW === w && R.fboH === h) return;
  R.cv.width = w; R.cv.height = h;
  if (R.fbo) { gl.deleteFramebuffer(R.fbo); gl.deleteTexture(R.texC); gl.deleteTexture(R.texI); gl.deleteRenderbuffer(R.rbD); }
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  R.texC = tex(); R.texI = tex(); R.rbD = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, R.rbD); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
  R.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, R.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, R.texC, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, R.texI, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, R.rbD); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); R.fboW = w; R.fboH = h;
}
// camera matrices reproducing sproj3 exactly: clip.x = fx·cx, clip.y = fy·cy, clip.w = cz  (cx,cy,cz = camera-space of (p − C))
function glCamera(cvW, cvH) {
  const C = PROJ.C, r = PROJ.r, u = PROJ.u, f = PROJ.f;
  const cam = [C.x + TRAVEL, C.y, -C.z];                                          // rail travel: render(pos0 + travel) == projectFixed(world − travel)
  const rg = [r.x, r.y, -r.z], ug = [u.x, u.y, -u.z], fg = [f.x, f.y, -f.z];
  const view = M4.ident();                                                         // rows = basis vectors, then translate
  view[0] = rg[0]; view[4] = rg[1]; view[8] = rg[2]; view[1] = ug[0]; view[5] = ug[1]; view[9] = ug[2]; view[2] = -fg[0]; view[6] = -fg[1]; view[10] = -fg[2];   // camera looks down −z in eye space
  const t = M4.transformDir(view, cam); view[12] = -t[0]; view[13] = -t[1]; view[14] = -t[2];
  const s = RIG.zoom * RES, fx = 2 * PROJ.fpx * s / cvW, fy = 2 * PROJ.fpx * s / cvH, N = GL3D.near, F = GL3D.far;
  const proj = new Float32Array(16); proj[0] = fx; proj[5] = fy; proj[10] = -(F + N) / (F - N); proj[11] = -1; proj[14] = -2 * F * N / (F - N);
  return { view, proj };
}
// draw a list of characters: [{ skel, fk, tint? }], each bone → capsule with its part material; returns composite-ready canvas
function glRenderCharacters(R, chars, cvW, cvH, opts) {
  const gl = R.gl, k = Math.max(1, GL3D.pixelScale), w = Math.max(2, Math.round(cvW / k)), h = Math.max(2, Math.round(cvH / k));
  glEnsureTarget(R, w, h);
  const cam = glCamera(cvW, cvH);
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.fbo); gl.viewport(0, 0, w, h); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(R.P); gl.uniformMatrix4fv(R.u.view, false, cam.view); gl.uniformMatrix4fv(R.u.proj, false, cam.proj);
  gl.uniform3fv(R.u.light, V3.norm(GL3D.light)); gl.uniform1f(R.u.bands, GL3D.bands);
  let draws = 0;
  for (const ch of chars) {
    const skel = ch.skel, fk = ch.fk, pal = ch.palette || SKEL_PARTS;
    for (const b of skel.bones) {
      if (!b.part || b.len <= 0) continue;
      const mesh = glCapsule(R, b.len, b.rad);
      const align = M4.fromTo([0, 1, 0], b.dir);                                   // mesh is authored along +y; bone direction in its own frame
      const model = M4.mul(fk.world[b.idx], align);
      gl.uniformMatrix4fv(R.u.model, false, model); gl.uniformMatrix3fv(R.u.nrm, false, M4.normalMat3(model));
      const col = pal[b.part] || [1, 0, 1]; gl.uniform3f(R.u.color, col[0], col[1], col[2]); gl.uniform1f(R.u.id, b.idx + 1);
      gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_SHORT, 0); draws++;
    }
  }
  gl.bindVertexArray(null);
  // post pass → canvas (outline + copy)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(R.PP); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.texC); gl.uniform1i(R.up.col, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.texI); gl.uniform1i(R.up.idt, 1);
  gl.uniform2f(R.up.texel, 1 / w, 1 / h); gl.uniform1f(R.up.outline, GL3D.outline ? 1 : 0);
  gl.bindVertexArray(R.quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  return { canvas: R.cv, w, h, draws, scale: k };
}
