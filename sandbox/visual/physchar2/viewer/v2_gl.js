// ═══ physchar2/viewer/v2_gl.js — minimal zero-dependency WebGL2 renderer for the G0 review page (presentation only) ════════════════════
// The data are in the CCS (+X right, +Y up, +Z forward — LEFT-handed). The camera uses a LEFT-handed basis (screen-right = up × forward),
// so the image is anatomically correct: seen from the front, the character's RIGHT side appears on the viewer's LEFT.
export function createGL(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true }); if (!gl) throw new Error("WebGL2 unavailable");
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const tri = prog(`#version 300 es
    layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; uniform mat4 uVP, uM; out vec3 vN; out vec3 vW;
    void main(){ vec4 w = uM * vec4(aP,1.0); vW = w.xyz; vN = mat3(uM) * aN; gl_Position = uVP * w; }`,
    `#version 300 es
    precision highp float; in vec3 vN; in vec3 vW; uniform vec4 uC; uniform vec3 uL; out vec4 o;
    void main(){ float d = abs(dot(normalize(vN), normalize(uL))); float k = 0.38 + 0.62 * d; o = vec4(uC.rgb * k, uC.a); }`);
  const line = prog(`#version 300 es
    layout(location=0) in vec3 aP; layout(location=1) in vec4 aC; uniform mat4 uVP; out vec4 vC; void main(){ vC = aC; gl_Position = uVP * vec4(aP,1.0); }`,
    `#version 300 es
    precision highp float; in vec4 vC; out vec4 o; void main(){ o = vC; }`);
  const U = (p, n) => gl.getUniformLocation(p, n);
  const tu = { VP: U(tri, "uVP"), M: U(tri, "uM"), C: U(tri, "uC"), L: U(tri, "uL") }, lu = { VP: U(line, "uVP") };
  const lineBuf = gl.createBuffer(), lineVao = gl.createVertexArray();
  gl.bindVertexArray(lineVao); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12); gl.bindVertexArray(null);
  // triangle mesh from a flat xyz triangle list (flat normals); also its unique edges for wireframe
  function mesh(tris) {
    const n = tris.length / 9, data = new Float32Array(n * 18);
    for (let t = 0; t < n; t++) { const o = t * 9, a = [tris[o], tris[o + 1], tris[o + 2]], b = [tris[o + 3], tris[o + 4], tris[o + 5]], c = [tris[o + 6], tris[o + 7], tris[o + 8]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; let nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(...nn) || 1; nn = nn.map(x => x / l); for (let k = 0; k < 3; k++) { const p = [a, b, c][k]; data.set([p[0], p[1], p[2], nn[0], nn[1], nn[2]], (t * 3 + k) * 6); } }
    const vao = gl.createVertexArray(), buf = gl.createBuffer(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12); gl.bindVertexArray(null);
    // feature edges: keep edges whose two faces differ in normal by > 20° (or boundary)
    const key = (p) => p.map(x => Math.round(x * 1e5)).join(","), E = new Map();
    for (let t = 0; t < n; t++) { const o = t * 18, nn = [data[o + 3], data[o + 4], data[o + 5]];
      for (let k = 0; k < 3; k++) { const i = (t * 3 + k) * 6, j = (t * 3 + (k + 1) % 3) * 6, p = [data[i], data[i + 1], data[i + 2]], q = [data[j], data[j + 1], data[j + 2]], kk = [key(p), key(q)].sort().join("|");
        const e = E.get(kk); if (e) e.n2 = nn; else E.set(kk, { p, q, n1: nn, n2: null }); } }
    const edges = []; for (const e of E.values()) if (!e.n2 || e.n1[0] * e.n2[0] + e.n1[1] * e.n2[1] + e.n1[2] * e.n2[2] < 0.94) edges.push(e.p, e.q);
    return { vao, count: n * 3, edges };
  }
  function icosphere(r, sub = 2) {
    const t = (1 + Math.sqrt(5)) / 2; let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const l = Math.hypot(...v); return v.map(x => x / l); });
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < sub; s++) { const F2 = [], mid = {}, m = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (mid[k] != null) return mid[k]; const v = V[a].map((x, i) => (x + V[b][i]) / 2), l = Math.hypot(...v); V.push(v.map(x => x / l)); return (mid[k] = V.length - 1); };
      for (const [a, b, c] of F) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } F = F2; }
    const out = []; for (const f of F) for (const i of f) out.push(V[i][0] * r, V[i][1] * r, V[i][2] * r); return mesh(new Float32Array(out));
  }
  const m4 = { mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
    // LEFT-handed look-at (screen right = up × forward): anatomically correct image of the CCS data
    look(eye, tgt, up) { const f = norm(sub(tgt, eye)), r = norm(cross(up, f)), u = cross(f, r), o = new Float32Array(16);
      o[0] = r[0]; o[4] = r[1]; o[8] = r[2]; o[1] = u[0]; o[5] = u[1]; o[9] = u[2]; o[2] = -f[0]; o[6] = -f[1]; o[10] = -f[2];
      o[12] = -dot(r, eye); o[13] = -dot(u, eye); o[14] = dot(f, eye); o[15] = 1; return o; },
    trs(p, q, s = 1) { const [x, y, z, w] = q, o = new Float32Array(16);
      o[0] = (1 - 2 * (y * y + z * z)) * s; o[1] = 2 * (x * y + z * w) * s; o[2] = 2 * (x * z - y * w) * s; o[4] = 2 * (x * y - z * w) * s; o[5] = (1 - 2 * (x * x + z * z)) * s; o[6] = 2 * (y * z + x * w) * s;
      o[8] = 2 * (x * z + y * w) * s; o[9] = 2 * (y * z - x * w) * s; o[10] = (1 - 2 * (x * x + y * y)) * s; o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1; return o; } };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
  let VP = null;
  return { gl, m4, mesh, icosphere,
    begin(cam, w, h) { gl.viewport(0, 0, w, h); gl.clearColor(0.105, 0.115, 0.13, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      VP = m4.mul(m4.persp(cam.fov, w / h, 0.02, 50), m4.look(cam.eye, cam.target, [0, 1, 0])); return VP; },
    drawMesh(M, model, color, opts = {}) { gl.useProgram(tri); gl.uniformMatrix4fv(tu.VP, false, VP); gl.uniformMatrix4fv(tu.M, false, model); gl.uniform4fv(tu.C, color); gl.uniform3fv(tu.L, opts.light || [0.35, 0.8, 0.5]);
      if (color[3] < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); } gl.bindVertexArray(M.vao); gl.drawArrays(gl.TRIANGLES, 0, M.count); gl.depthMask(true); gl.disable(gl.BLEND); },
    drawLines(verts, opts = {}) { if (!verts.length) return; gl.useProgram(line); gl.uniformMatrix4fv(lu.VP, false, VP); gl.bindVertexArray(lineVao); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
      if (opts.overlay) gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.LINES, 0, verts.length / 7); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); },
    project(p, w, h) { const v = [p[0], p[1], p[2], 1], o = [0, 0, 0, 0]; for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[r] += VP[k * 4 + r] * v[k]; if (o[3] <= 0) return null; return [(o[0] / o[3] * 0.5 + 0.5) * w, (1 - (o[1] / o[3] * 0.5 + 0.5)) * h, o[2] / o[3]]; } };
}
