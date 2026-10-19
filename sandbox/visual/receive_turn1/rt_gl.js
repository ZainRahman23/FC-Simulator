// ═══ receive_turn1/rt_gl.js — the labs' WebGL pieces (the pitch, the ball, cameras, projection), from RECEIVE-KILL's lab (rk_lab.js), shared ═══
import { toW } from "./rk_sim.js";
function shader(gl, t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
// ── WebGL: the pitch and the ball (the RUN-1 / TURN-1 / DRIBBLE-V1 viewers' programs) ────────────────────────────────────────────────────────────
export function persp(fy, aspect, n, f) { const m = new Float32Array(16); m[0] = fy / aspect; m[5] = fy; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
export function lookAt(eye, at, up) { const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fz = nrm(sub(eye, at)), fx = nrm(cr(up, fz)), fy = cr(fz, fx), m = new Float32Array(16); m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -dt(fx, eye); m[13] = -dt(fy, eye); m[14] = -dt(fz, eye); m[15] = 1; return m; }
export function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
export function groundProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW; void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[8]; uniform int uNSh; out vec4 o;
  void main(){ vec2 p = vec2(vW.x, -vW.z); float stripe = mod(floor(p.x / 5.25), 2.0); vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe);
    float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453); g *= 0.97 + 0.06 * n;
    vec2 q = fract(p); float grid = (smoothstep(0.985, 1.0, q.x) + smoothstep(0.985, 1.0, q.y)) * 0.05; g += grid;
    float sh = 0.0; for (int i = 0; i < 8; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    o = vec4(g * (1.0 - min(0.6, sh)), 1.0); }`;
  const p = program(gl, VS, FS), vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-25, 25, 130, 25, -25, -130, 130, -130]), gl.STATIC_DRAW); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } };
}
export function ballProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec3 aP; uniform mat4 uView, uProj; uniform vec3 uC; uniform vec4 uQ; uniform float uR; out vec3 vL; out vec3 vN;
  vec3 rot(vec4 q, vec3 v){ vec3 t = 2.0 * cross(q.xyz, v); return v + q.w * t + cross(q.xyz, t); }
  void main(){ vL = aP; vN = rot(uQ, aP); gl_Position = uProj * (uView * vec4(uC + uR * vN, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vL; in vec3 vN; uniform vec3 uTint; out vec4 o;
  void main(){ vec3 n = normalize(vL); const float P = 1.6180339887; vec3 c[6] = vec3[6](vec3(0,1,P), vec3(0,-1,P), vec3(1,P,0), vec3(-1,P,0), vec3(P,0,1), vec3(P,0,-1));
    float m = 0.0; for (int i = 0; i < 6; i++) { vec3 a = normalize(c[i]); m = max(m, abs(dot(n, a))); }
    float dark = smoothstep(0.928, 0.936, m); vec3 base = mix(vec3(0.95, 0.94, 0.90), vec3(0.11, 0.13, 0.14), dark) * uTint;
    float l = 0.45 + 0.55 * max(0.0, dot(normalize(vN), normalize(vec3(0.35, 0.9, 0.25)))); o = vec4(base * l, 1.0); }`;
  const p = program(gl, VS, FS), pts = [], idx = [], NU = 28, NV = 16;
  for (let j = 0; j <= NV; j++) { const v = Math.PI * j / NV; for (let i = 0; i <= NU; i++) { const u = 2 * Math.PI * i / NU; pts.push(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); gl.bindVertexArray(null);
  const U = (n) => gl.getUniformLocation(p, n); return { p, vao, n: idx.length, u: { view: U("uView"), proj: U("uProj"), c: U("uC"), q: U("uQ"), r: U("uR"), tint: U("uTint") } };
}
// ── cameras (local offsets from the receiver's stance, then the kernel world) ───────────────────────────────────────────────────────────────────
export const CAMS_K = { broadcast: { eye: [1.2, -24, 12], at: [1.2, 0, 0.6], fov: 13 }, near: { eye: [-2.6, -5.2, 2.4], at: [0.9, 0, 0.75], fov: 30 }, side: { eye: [0.8, -6.5, 1.2], at: [0.8, 0, 0.9], fov: 30 }, behind: { eye: [-4.8, -1.1, 2.0], at: [1.4, 0, 0.7], fov: 30 }, front: { eye: [5.2, -1.6, 1.7], at: [0.2, 0, 0.9], fov: 32 } };
export function camForBase(id, w, h) { const c = CAMS_K[id] || CAMS_K.near; return { view: lookAt(toW(c.eye), toW(c.at), [0, 1, 0]), proj: persp(1 / Math.tan(c.fov * Math.PI / 360), w / h, 0.1, 300) }; }
export function proj3(cam, w, h, p) { const v = cam.view, pr = cam.proj, x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], z = v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14];
  const cx = pr[0] * x, cy = pr[5] * y, cw = -z; if (cw <= 1e-3) return null; return [(cx / cw * 0.5 + 0.5) * w, (0.5 - cy / cw * 0.5) * h]; }


// a camera from an eye / target / fov in local coordinates (the turn lab orbits the receiver)
export function camLocal(eye, at, fov, w, h) { return { view: lookAt(toW(eye), toW(at), [0, 1, 0]), proj: persp(1 / Math.tan(fov * Math.PI / 360), w / h, 0.1, 300) }; }
