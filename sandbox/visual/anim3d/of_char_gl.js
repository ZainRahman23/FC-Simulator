// ══ anim3d/of_char_gl.js — GPU draw for Astra's real outfield characters ══════════════════════════════════════════════════════════
// One indexed draw per character. The shading is a direct GLSL port of Astra's own framebuffer renderer (canonical/source/src/
// framebuffer-renderer.js) in its approved Mixed configuration: light [-0.42, 0.72, -0.54], luminance 0.12 + 0.72*n·l + 0.16*hemi,
// treatment B ("Soft Cel") tone, and the four material behaviours — default, skin (its own three-tone palette per player), refined
// interpolated vertex colour, and emissive. Textured materials sample the frozen approved atlas; their UVs were converted from
// material-local to atlas-global at build time, because treating region-local UVs as full-atlas UVs is the documented way to get
// the appearance wrong.
// Skinning applies the inverse bind ONCE (world × inverseBind against character-space bind positions).
function ofCharProgram(R) {
  if (R._ofCharP) return R._ofCharP;
  const gl = R.gl;
  const VS = `#version 300 es
  layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv;
  layout(location=3) in vec3 aCol; layout(location=4) in uint aCls; layout(location=5) in uvec4 aJ; layout(location=6) in vec4 aW;
  uniform mat4 uView, uProj; uniform mat4 uBones[23];
  out vec3 vN; out vec2 vUv; out vec3 vCol; flat out uint vCls;
  void main(){
    mat4 sk = aW.x*uBones[aJ.x] + aW.y*uBones[aJ.y] + aW.z*uBones[aJ.z] + aW.w*uBones[aJ.w];
    vec4 wp = sk * vec4(aPos,1.0); vN = normalize(mat3(sk)*aNrm); vUv = aUv; vCol = aCol; vCls = aCls;
    gl_Position = uProj * (uView * wp); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vN; in vec2 vUv; in vec3 vCol; flat in uint vCls;
  uniform sampler2D uAtlas; uniform vec3 uLight, uSkinBase, uSkinShadow, uSkinLight;
  layout(location=0) out vec4 oColor; layout(location=1) out vec4 oId;
  float ss(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0.0, 1.0); return t*t*(3.0-2.0*t); }
  void main(){
    vec3 n = normalize(vN);
    float ndl = max(0.0, dot(n, normalize(uLight)));
    float hemi = 0.45 + 0.55*max(0.0, n.y);
    float lum = 0.12 + 0.72*ndl + 0.16*hemi;
    float tone = 0.24 + 0.36*ss(0.25,0.48,lum) + 0.36*ss(0.57,0.85,lum);     // treatment B, the approved Soft Cel
    bool textured = (vCls & 1u) == 1u; uint shade = vCls >> 1u;
    vec3 c = textured ? texture(uAtlas, vUv).rgb * 255.0 : vCol;
    if (shade == 2u) { c *= (0.62 + 0.48*lum); }                              // refined vertex colour
    else if (shade == 1u) {                                                   // skin: this player's own three tones
      vec3 shadow = uSkinShadow*0.76 + c*0.24;
      c = tone < 0.82 ? shadow + (c-shadow)*min(1.0, tone/0.82)
                      : c + (uSkinLight-uSkinBase)*(tone-0.82)*2.0; }
    else { float f = (shade == 3u) ? (0.75 + tone*0.28) : (0.52 + tone*0.60);
           c = c*f + vec3(0.0, 0.0, (1.0-tone)*4.0); }
    oColor = vec4(clamp(c/255.0, 0.0, 1.0), 1.0);
    oId = vec4(float(shade)/8.0, 0.0, 0.0, 1.0); }`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("of_char shader: " + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("of_char link: " + gl.getProgramInfoLog(p));
  R._ofCharP = { p, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"),
    bones: gl.getUniformLocation(p, "uBones"), atlas: gl.getUniformLocation(p, "uAtlas"), light: gl.getUniformLocation(p, "uLight"),
    skinBase: gl.getUniformLocation(p, "uSkinBase"), skinShadow: gl.getUniformLocation(p, "uSkinShadow"), skinLight: gl.getUniformLocation(p, "uSkinLight") } };
  return R._ofCharP;
}
// per-character GPU buffers, built once and reused (shared immutable geometry: a second player of the same identity reuses these)
function ofCharBuffers(R, entry) {
  if (entry.gl && entry.gl.R === R) return entry.gl;
  const gl = R.gl, M = entry.mesh, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const ab = (data, loc, size, type, norm, int) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    if (int) gl.vertexAttribIPointer(loc, size, type, 0, 0); else gl.vertexAttribPointer(loc, size, type, !!norm, 0, 0); gl.enableVertexAttribArray(loc); return b; };
  ab(M.positions, 0, 3, gl.FLOAT, false, false);
  ab(M.normals, 1, 3, gl.FLOAT, false, false);
  ab(M.uvAtlas, 2, 2, gl.FLOAT, false, false);
  ab(M.baseColor, 3, 3, gl.UNSIGNED_BYTE, false, false);                       // 0..255, the shader keeps that scale
  ab(M.shadeClass, 4, 1, gl.UNSIGNED_BYTE, false, true);
  ab(M.joints, 5, 4, gl.UNSIGNED_SHORT, false, true);
  ab(M.weights, 6, 4, gl.FLOAT, false, false);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, M.indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, entry.atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const sk = (entry.rig.shading && entry.rig.shading.skin) || [];
  entry.gl = { R, vao, ib, tex, count: M.indices.length,
    skinBase: (sk[0] || [196, 142, 107]).map(v => v / 1), skinShadow: (sk[1] || [129, 94, 71]), skinLight: (sk[2] || [229, 166, 125]),
    bytes: M.positions.byteLength + M.normals.byteLength + M.uvAtlas.byteLength + M.baseColor.byteLength + M.shadeClass.byteLength + M.joints.byteLength + M.weights.byteLength + M.indices.byteLength };
  return entry.gl;
}
// one indexed draw, into whatever framebuffer / viewport the caller has already bound
function ofCharDraw(R, entry, skinMats, view, proj) {
  const gl = R.gl, P = ofCharProgram(R), G = ofCharBuffers(R, entry);
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.view, false, view); gl.uniformMatrix4fv(P.u.proj, false, proj);
  gl.uniformMatrix4fv(P.u.bones, false, skinMats);
  gl.uniform3fv(P.u.light, entry.rig.shading.light);
  gl.uniform3fv(P.u.skinBase, G.skinBase); gl.uniform3fv(P.u.skinShadow, G.skinShadow); gl.uniform3fv(P.u.skinLight, G.skinLight);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.uniform1i(P.u.atlas, 0);
  // FACE WINDING. Astra's triangles are CCW seen from outside (verified against the shipped per-vertex normals: 98.8% of osimhen's
  // 122k triangles have (v1-v0)x(v2-v0) along the outward normal). This engine's camera transform reverses winding in screen space,
  // so the pipeline's own meshes are drawn with frontFace(CCW) and Astra's need frontFace(CW). Without this the BACK faces survive
  // culling: you see the inside of the far side of the shirt, which reads as mirrored lettering and a front/back swap.
  const prevFront = gl.getParameter(gl.FRONT_FACE);
  gl.frontFace(gl.CW);
  gl.bindVertexArray(G.vao); gl.drawElements(gl.TRIANGLES, G.count, gl.UNSIGNED_INT, 0); gl.bindVertexArray(null);
  gl.frontFace(prevFront);
  return 1;
}
