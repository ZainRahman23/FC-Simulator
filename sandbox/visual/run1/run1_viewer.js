// ═══ run1/run1_viewer.js — RUN-1 viewer: the gameplay camera + close views, RUN-1.x versions vs Locomotion V1, playback, overlays ═══
// LANES: each lane = one presentation engine (RUN-1.3 = run1_gait.js · RUN-1.2 / RUN-1.1 / RUN-1.0 = the frozen run1_gait_v12 / _v11 / _orig.js ·
// V1 = the unmodified Locomotion V1 runtime) at the shared speed or at its own fixed speed; presets under "Lanes". BLIND (?blind=1…4): the lanes of
// the preset in a fixed shuffled order with every label hidden (L reveals) — the "which one is sprinting all-out?" test.
// One WebGL2 canvas, three viewports (the real character mesh draws through anim3d/of_char_gl.js ofCharDraw, so its GPU buffers live in
// ONE context). A 2D canvas on top carries the optional diagnostics. Nothing here is random; the mover is a closed-form function of time.
"use strict";
if (typeof gkRootMatrix !== "function") {                       // ofActorTick (Locomotion V1) needs it; same body as gk_graph.js gkRootMatrix
  // eslint-disable-next-line no-var
  var gkRootMatrix = r1RootMatrix;
}
const RV1 = {
  t: 0, rate: 1, playing: true, speedMode: "const", v1Mode: "v13", dir: "across", v: 5.5, zoom: 1, tickHz: 60, preset: "ladder", labels: true, blind: 0,
  ov: { skel: false, feet: false, com: false, trail: false },
  viewA: "L0:side", viewB: "L1:side", entry: null, R: null, ready: false, frame: 0,
  lanes: [], run1: null, engSkel: {}, warm: {}, lastT: null, perf: [],
};
// presentation engines (frozen copies get their own skeleton copy: every version caches its body / speed grid on skel._r1body)
const RV1_ENG = {
  run1: { name: () => (typeof RUN1 !== "undefined" ? RUN1.id : "RUN-1.3"), col: "#5ee0ff", api: () => ({ r1Make, r1Replay, r1Evaluate, r1Kinematics, r1GaitAt, RUN1 }), own: false },
  v12: { name: () => "RUN-1.2", col: "#ffd45e", api: () => RUN1_V12, own: true },
  v11: { name: () => "RUN-1.1", col: "#8fe388", api: () => RUN1_V11, own: true },
  orig: { name: () => "RUN-1.0", col: "#c79bff", api: () => RUN1_ORIG, own: true },
  v1: { name: () => "V1", col: "#ff8a5e" },
};
// lane presets: v = a fixed speed for that lane (null = the shared speed / ramp); tag = the regime label shown with the lane; views = the default
// close views [A, B]. RUN-1.3 ≡ RUN-1.2 at ≤ 8.0 m/s; the presets that show RUN-1.2's own regimes run the FROZEN copy (v12), byte for byte.
const RV1_VMAX = 9.5;                                            // the ALL-OUT anchor speed (RUN1.regimes.ALLOUT.v)
const RV1_PRESETS = {
  ladder: { label: "Ladder (RUN-1.3): LOW 3.0 · JOG 5.5 · FAST RUN 7.8 · ALL-OUT 9.5", views: ["L3:side", "L2:side"], lanes: [{ eng: "run1", v: 3.0, tag: "LOW 3.0" }, { eng: "run1", v: 5.5, tag: "JOG 5.5" }, { eng: "run1", v: 7.8, tag: "FAST RUN 7.8" }, { eng: "run1", v: RV1_VMAX, tag: "ALL-OUT 9.5" }] },
  top: { label: "Top end (RUN-1.3): FAST RUN 7.8 · ALL-OUT 9.5", views: ["L1:side", "L0:side"], lanes: [{ eng: "run1", v: 7.8, tag: "FAST RUN 7.8" }, { eng: "run1", v: RV1_VMAX, tag: "ALL-OUT 9.5" }] },
  stretch: { label: "Same 9.5 m/s: RUN-1.2 (its 7.8 gait stretched) · RUN-1.3 ALL-OUT", views: ["L1:side", "L0:side"], lanes: [{ eng: "v12", v: RV1_VMAX, tag: "9.5 (stretched)" }, { eng: "run1", v: RV1_VMAX, tag: "ALL-OUT 9.5" }] },
  hier12: { label: "RUN-1.2 frozen: 3.0 · 5.5 · 7.8 (as reviewed)", lanes: [{ eng: "v12", v: 3.0, tag: "LOW 3.0" }, { eng: "v12", v: 5.5, tag: "JOG 5.5" }, { eng: "v12", v: 7.8, tag: "FAST RUN 7.8" }] },
  review: { label: "RUN-1.2 review (frozen): RUN-1.1 at 5.5 · RUN-1.2 5.5 · RUN-1.2 7.8 · V1 at 5.5", lanes: [{ eng: "v11", v: 5.5, tag: "5.5" }, { eng: "v12", v: 5.5, tag: "5.5" }, { eng: "v12", v: 7.8, tag: "7.8" }, { eng: "v1", v: 5.5, tag: "5.5" }] },
  cmp: { label: "RUN-1.3 · RUN-1.2 · RUN-1.1 · V1 — same speed", lanes: [{ eng: "run1" }, { eng: "v12" }, { eng: "v11" }, { eng: "v1" }] },
  cmp4: { label: "RUN-1.3 · RUN-1.2 · RUN-1.1 · RUN-1.0 · V1 — same speed", lanes: [{ eng: "run1" }, { eng: "v12" }, { eng: "v11" }, { eng: "orig" }, { eng: "v1" }] },
  jogrun: { label: "RUN-1.1 at 5.5 · RUN-1.2 at 5.5 · RUN-1.2 at 7.8 (frozen)", lanes: [{ eng: "v11", v: 5.5, tag: "5.5" }, { eng: "v12", v: 5.5, tag: "5.5" }, { eng: "v12", v: 7.8, tag: "7.8" }] },
  hier11: { label: "RUN-1.1 at 3.0 · 5.5 · 7.8 (one gait stretched)", lanes: [{ eng: "v11", v: 3.0, tag: "3.0" }, { eng: "v11", v: 5.5, tag: "5.5" }, { eng: "v11", v: 7.8, tag: "7.8" }] },
};
RV1_PRESETS.hier = RV1_PRESETS.hier12;                           // the RUN-1.2 URL name (?lanes=hier) shows the same, frozen
const RV1_BLIND = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3]];   // fixed shuffles of a 4-lane preset (?blind=1…4); fewer lanes: the order filtered
const RV1_PRE = 1.0;                                             // seconds of pre-roll before the visible start (V1 settles into its gait)
const RV1_LOOP = 9.0;                                            // seconds per pass, then the run restarts

// ── the authoritative straight-line mover (INPUT to both presentations): constant speed, or the speed ramp (3.0 → 7.8 → 3.0 m/s) ─────────
const RV1_RAMP = { a: 3.0, b: 7.8, t1: 1.2, t2: 4.2, hold: 1.0 };          // 1.6 m/s² up, the same down; the loop is 9 s
const RV1_RAMP9 = { a: 6.0, b: 9.5, t1: 1.2, t2: 3.4, hold: 1.0 };        // into ALL-OUT and back: 6.0 → 9.5 → 6.0 m/s, 1.6 m/s² (the regime blend, not an acceleration model)
const rv1Ramp = () => RV1.speedMode === "ramp9" ? RV1_RAMP9 : RV1_RAMP;
function rv1V(t, L) {
  if (L && L.v != null) return L.v;
  if (RV1.speedMode !== "ramp" && RV1.speedMode !== "ramp9") return RV1.v;
  const R = rv1Ramp(), d = R.t2 - R.t1; if (t < R.t1) return R.a; if (t < R.t2) return R.a + (R.b - R.a) * (t - R.t1) / d;
  if (t < R.t2 + R.hold) return R.b; if (t < R.t2 + R.hold + d) return R.b + (R.a - R.b) * (t - R.t2 - R.hold) / d; return R.a;
}
function rv1Dist(t, L) {                                               // closed-form integral of rv1V
  if (L && L.v != null) return L.v * t;
  if (RV1.speedMode !== "ramp" && RV1.speedMode !== "ramp9") return RV1.v * t;
  const R = rv1Ramp(), d = R.t2 - R.t1, seg = [[0, R.t1, R.a, R.a], [R.t1, R.t2, R.a, R.b], [R.t2, R.t2 + R.hold, R.b, R.b], [R.t2 + R.hold, R.t2 + R.hold + d, R.b, R.a], [R.t2 + R.hold + d, 1e9, R.a, R.a]];
  let s = 0; for (const [t0, t1, v0, v1] of seg) { if (t <= t0) break; const te = Math.min(t, t1), f = (te - t0) / (t1 - t0); s += (te - t0) * (v0 + (v0 + (v1 - v0) * f)) / 2; } return s;
}
function rv1Path(L) {                                                 // each lane is centred at mid-loop, so lanes at different speeds pass together at t = 4.5 s
  const d = RV1.dir, len = rv1Dist(RV1_LOOP, L), lane = L.off;
  const hd = d === "across" ? 0 : d === "toward" ? Math.PI / 2 : d === "away" ? -Math.PI / 2 : Math.PI / 4;
  const ux = Math.cos(hd), uy = Math.sin(hd), lx = -uy, ly = ux;   // pitch frame (y south): (lx, ly) is the runner's RIGHT; + lane = nearer the camera when running across
  const cx = 52.5, cy = d === "across" ? 36 : 34;
  return { hd, ux, uy, x0: cx - ux * len / 2 + lx * lane, y0: cy - uy * len / 2 + ly * lane, len };
}
function rv1Sim(L, t) { const P = rv1Path(L), s = rv1Dist(t, L), v = rv1V(t, L); return { x: P.x0 + P.ux * s, y: P.y0 + P.uy * s, vx: P.ux * v, vy: P.uy * v, heading: P.hd, v }; }
function rv1LaneOff(i, n) { return n < 2 ? 0 : ((n - 1) / 2 - i) * 5.0 * (RV1.dir === "toward" || RV1.dir === "away" ? -1 : 1); }   // lanes 5 m apart, the first nearest the camera

// ── camera math ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function rv1Persp(fyNdc, aspect, n, f) { const m = new Float32Array(16); m[0] = fyNdc / aspect; m[5] = fyNdc; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
// The anim3d world frame (x east, y up, z = −pitch y) is mirror-handed relative to the screen, and CAMERA_V1's view has det −1 to un-mirror
// it (the real characters' frontFace(CW) in of_char_gl.js relies on that). Close-view cameras therefore use the SAME handedness: screen-right
// = up × back negated. A conventional look-at would show a mirrored body with its front faces culled (a front / back swap).
function rv1LookAt(eye, at, up) {
  const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2];
  m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m;
}
// CAMERA_V1 (match.js AUTHOR_DEFAULTS + buildFrozenBasis + glCamera): height 30, dist 43, fov 28, depthoff 3, pitch 22, yaw 0; a rail camera
function rv1GameCam(travelX, zoom, vw, vh) {
  const th = 22 * Math.PI / 180, C = [52.5 + travelX, 30, -(68 + 43)];
  const r = [1, 0, 0], u = [0, Math.cos(th), Math.sin(th)], f = [0, -Math.sin(th), Math.cos(th)];   // GL frame (z = −pitch y)
  const view = M4.ident(); view[0] = r[0]; view[4] = r[1]; view[8] = r[2]; view[1] = u[0]; view[5] = u[1]; view[9] = u[2]; view[2] = -f[0]; view[6] = -f[1]; view[10] = -f[2];
  const t = M4.transformDir(view, C); view[12] = -t[0]; view[13] = -t[1]; view[14] = -t[2];
  const fpx = 360 / Math.tan(14 * Math.PI / 180), fy = 2 * fpx * zoom / 720;
  return { view, proj: rv1Persp(fy, vw / vh, 1.0, 400), eye: C };
}
// close views: orbit about the runner's pelvis, angles relative to the direction of travel
const RV1_ANGLES = { zoomFront: [0, 4, 2.0], zoomSide: [90, 4, 2.9], zoom34: [40, 12, 3.0], zoomRear34: [140, 12, 3.0], side: [90, 4, 5.2], front34: [35, 10, 5.4], rear34: [145, 10, 5.4], front: [0, 6, 6.0], rear: [180, 8, 6.0], top: [90, 70, 6.0], sideR: [-90, 4, 5.2] };   // side = camera on the runner's LEFT
function rv1CloseCam(subj, angle, vw, vh) {
  const a = RV1_ANGLES[angle] || RV1_ANGLES.side, hd = subj.sim.heading;
  const tgt = [subj.sim.x, 0.95, -subj.sim.y], fwdG = [Math.cos(hd), 0, -Math.sin(hd)], leftG = [-Math.sin(hd) * -1, 0, -Math.cos(hd) * -1];
  const az = a[0] * Math.PI / 180, el = a[1] * Math.PI / 180, d = a[2];
  const hor = V3.add(V3.scale(fwdG, Math.cos(az)), V3.scale(leftG, Math.sin(az)));
  const eye = V3.add(tgt, V3.add(V3.scale(hor, d * Math.cos(el)), [0, d * Math.sin(el), 0]));
  const fy = 1 / Math.tan(13 * Math.PI / 180);
  return { view: rv1LookAt(eye, tgt, [0, 1, 0]), proj: rv1Persp(fy, vw / vh, 0.2, 200), eye };
}

// ── GL: ground (procedural pitch with markings and contact shadows) ───────────────────────────────────────────────────────────────
function rv1GroundProgram(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW;
  void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[16]; uniform int uNSh; layout(location=0) out vec4 o; layout(location=1) out vec4 oId;
  float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float ring(vec2 p, vec2 c, float r, float w){ float d=abs(length(p-c)-r); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float dotm(vec2 p, vec2 c, float r){ float d=length(p-c); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(r-aa, r+aa, d); }
  void main(){
    vec2 p = vec2(vW.x, -vW.z);                                           // pitch coordinates (x east, y south)
    bool inP = p.x > -2.0 && p.x < 107.0 && p.y > -2.0 && p.y < 70.0;
    float stripe = mod(floor(p.x / 5.25), 2.0);
    vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe);
    float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453);
    g *= 0.97 + 0.06 * n;
    if (!inP) g = vec3(0.17, 0.33, 0.19) * (0.97 + 0.06 * n);
    float w = 0.12, L = 0.0;
    L = max(L, seg(p, vec2(0,0), vec2(105,0), w)); L = max(L, seg(p, vec2(0,68), vec2(105,68), w));
    L = max(L, seg(p, vec2(0,0), vec2(0,68), w)); L = max(L, seg(p, vec2(105,0), vec2(105,68), w));
    L = max(L, seg(p, vec2(52.5,0), vec2(52.5,68), w)); L = max(L, ring(p, vec2(52.5,34), 9.15, w)); L = max(L, dotm(p, vec2(52.5,34), 0.15));
    for (int s = 0; s < 2; s++) { float x0 = s == 0 ? 0.0 : 105.0, sg = s == 0 ? 1.0 : -1.0;
      L = max(L, seg(p, vec2(x0, 13.84), vec2(x0 + sg*16.5, 13.84), w)); L = max(L, seg(p, vec2(x0, 54.16), vec2(x0 + sg*16.5, 54.16), w)); L = max(L, seg(p, vec2(x0 + sg*16.5, 13.84), vec2(x0 + sg*16.5, 54.16), w));
      L = max(L, seg(p, vec2(x0, 24.84), vec2(x0 + sg*5.5, 24.84), w)); L = max(L, seg(p, vec2(x0, 43.16), vec2(x0 + sg*5.5, 43.16), w)); L = max(L, seg(p, vec2(x0 + sg*5.5, 24.84), vec2(x0 + sg*5.5, 43.16), w));
      L = max(L, dotm(p, vec2(x0 + sg*11.0, 34.0), 0.15));
      float arc = ring(p, vec2(x0 + sg*11.0, 34.0), 9.15, w); if (sg * (p.x - (x0 + sg*16.5)) > 0.0) L = max(L, arc); }
    vec3 c = mix(g, vec3(0.93, 0.95, 0.92), L * 0.92);
    float sh = 0.0; for (int i = 0; i < 16; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    c *= 1.0 - min(0.55, sh);
    o = vec4(c, 1.0); oId = vec4(0.0); }`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  const X0 = -25, X1 = 130, Z0 = 25, Z1 = -130;                  // GL z = −pitch y; the quad reaches under the camera
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([X0, Z0, X1, Z0, X0, Z1, X1, Z1]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } };
}

// ── actors ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function rv1EngSkel(eng) {                                             // the skeleton an engine evaluates on (frozen versions: their own copy)
  const skel = RV1.entry.skel; if (!RV1_ENG[eng].own) return skel;
  if (!RV1.engSkel[eng]) { RV1.engSkel[eng] = Object.assign({}, skel); delete RV1.engSkel[eng]._r1body; } return RV1.engSkel[eng];
}
function rv1Reset() {
  const skel = RV1.entry.skel, P = RV1_PRESETS[RV1.preset] || RV1_PRESETS.cmp, n = P.lanes.length;
  RV1.lanes = rv1Order(n).map((pi, i) => { const sp = P.lanes[pi], eng = RV1_ENG[sp.eng], L = { key: "L" + pi, i, eng: sp.eng, v: sp.v != null ? sp.v : null, off: rv1LaneOff(i, n), col: RV1.blind ? "#e6efe9" : eng.col, trail: [], sim: null, fk: null, skin: null };
    L.label = eng.name() + (sp.tag ? " " + sp.tag : ""); L.blindName = "lane " + (n - i);   // blind: numbered from the far lane
    if (sp.eng === "v1") { const a = ofActorMake(skel, 0, 0, 0); a.motion = "LOCO"; a.loco = ofLocoMake(); a.state = { feet: {} }; L.a = a; L.v1T = -RV1_PRE; }
    else { L.E = eng.api(); L.A = L.E.r1Make(rv1EngSkel(sp.eng)); }
    return L; });
  // the ramp crosses ~20 speed-grid cells: solve every cell of every RUN engine in use once, up front, so the first pass never stalls mid-run
  if (RV1.speedMode === "ramp" || RV1.speedMode === "ramp9") for (const L of RV1.lanes) if (L.E && L.v == null && !RV1.warm[L.eng]) { for (let k = 0; k <= 30; k++) L.E.r1GaitAt(L.A.body, L.E.RUN1.ref, 2.5 + k * 0.25); RV1.warm[L.eng] = true; }
  RV1.run1 = RV1.lanes.find(L => L.eng === "run1") || RV1.lanes.find(L => L.E) || null;    // HUD / export / capture-label subject
  RV1.t = 0;
  for (const L of RV1.lanes) if (L.a) rv1V1Advance(L, 0);
}
function rv1Order(n) { if (!RV1.blind) return [...Array(n).keys()]; return RV1_BLIND[(RV1.blind - 1) % RV1_BLIND.length].filter(k => k < n).concat([...Array(n).keys()].filter(k => k >= 4)); }
const rv1Name = (L) => RV1.blind && !RV1.reveal ? L.blindName : L.label;
function rv1V1Advance(L, tTarget) {                              // Locomotion V1: fixed 60 Hz ticks of the unmodified runtime up to tTarget
  if (typeof OF_CONT !== "undefined") OF_CONT.on = RV1.v1Mode === "lc1";
  const dt = 1 / RV1.tickHz, a = L.a;
  while (L.v1T + dt <= tTarget + 1e-9) {
    L.v1T += dt; const s0 = rv1Sim(L, 0), hd = rv1Path(L).hd, s = L.v1T < 0 ? Object.assign(s0, { x: s0.x + Math.cos(hd) * rv1V(0, L) * L.v1T, y: s0.y + Math.sin(hd) * rv1V(0, L) * L.v1T }) : rv1Sim(L, L.v1T);
    a.x = s.x; a.y = s.y; a.facing = s.heading; a.speed = s.v; a.sim = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, facing: s.heading };
    ofActorTick(a, dt, L.v1T + 10);
    L.sim = s; L.fk = a.sol.fk; L.skin = a.skinMats;
  }
}
function rv1Run1Eval(t, L) {
  const s = rv1Sim(L, t), restore = L.E.r1Replay(L.A, (tt) => rv1V(tt, L), null, t);   // the runtime path: fixed 1/240 s grid from t = 0 (deterministic for any t)
  const out = L.E.r1Evaluate(L.A, s); L.sim = s; L.fk = out.fk; L.skin = out.skinMats; L.pose = out.pose; L.G = L.A.G; restore();
}
function rv1Update(t) {
  const tick = RV1.sampleTicks ? Math.floor(t * RV1.tickHz + 1e-9) / RV1.tickHz : t;
  if (RV1.lanes.some(L => L.a && t < L.v1T - 1e-9)) { const keep = t; rv1Reset(); RV1.t = keep; }   // time went backwards: replay V1 from its pre-roll (deterministic)
  for (const L of RV1.lanes) { if (L.a) { rv1V1Advance(L, t); continue; } const t0 = performance.now(); rv1Run1Eval(tick, L); if (L === RV1.run1) { RV1.perf.push(performance.now() - t0); if (RV1.perf.length > 240) RV1.perf.shift(); } }
  // trails (ankles), presentation-only
  const B = RV1.entry.skel.byName;
  for (const L of RV1.lanes) { if (!L.fk) continue; L.trail.push([L.fk.joint[B.foot_R.idx].slice(), L.fk.joint[B.foot_L.idx].slice(), L.fk.tip[B.toe_R.idx].slice(), L.fk.tip[B.toe_L.idx].slice()]); if (L.trail.length > 70) L.trail.shift(); }
}

// ── COM from segment masses (V2 fractions; segment centre ≈ joint→tip midpoint) ──────────────────────────────────────────────────
const RV1_MASS = { pelvis: 0.1116, spine: 0.1614, chest: 0.1603, head: 0.0686, upperArm_R: 0.0268, upperArm_L: 0.0268, foreArm_R: 0.0220, foreArm_L: 0.0220, thigh_R: 0.1403, thigh_L: 0.1403, shin_R: 0.0438, shin_L: 0.0438, foot_R: 0.0161, foot_L: 0.0161 };
function rv1COM(fk) { const B = RV1.entry.skel.byName; let c = [0, 0, 0], m = 0; for (const k in RV1_MASS) { const i = B[k].idx, p = V3.lerp(fk.joint[i], fk.tip[i], 0.5); c = V3.add(c, V3.scale(p, RV1_MASS[k])); m += RV1_MASS[k]; } return V3.scale(c, 1 / m); }

// ── rendering ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function rv1Layout() {                                                   // fit the window: wide screens put the close views in a right-hand column
  if (RV1.fixedLayout) return RV1.fixedLayout;
  const bar = document.getElementById("bar"), top = bar ? bar.getBoundingClientRect().height : 60;
  const W = Math.max(640, Math.min(window.innerWidth - 8, 2400)), Hav = Math.max(420, window.innerHeight - top - 46);
  if (W / Hav > 1.35) {
    const gw = Math.round(W * 0.64), cw = W - gw - 4, ch = Math.floor((Hav - 4) / 2);
    return { W, H: Hav, views: [{ id: "game", x: 0, y: 0, w: gw, h: Hav }, { id: "A", x: gw + 4, y: 0, w: cw, h: ch }, { id: "B", x: gw + 4, y: ch + 4, w: cw, h: Hav - ch - 4 }] };
  }
  const topH = Math.round(Hav * 0.58), botH = Hav - topH - 4;
  return { W, H: Hav, views: [{ id: "game", x: 0, y: 0, w: W, h: topH }, { id: "A", x: 0, y: topH + 4, w: Math.floor(W / 2) - 2, h: botH }, { id: "B", x: Math.floor(W / 2) + 2, y: topH + 4, w: W - Math.floor(W / 2) - 2, h: botH }] };
}
function rv1Subjects() { return RV1.lanes.map(L => ({ who: L.key, o: L })); }
function rv1Render() {
  const gl = RV1.R.gl, cv = RV1.cv, dpr = Math.min(window.devicePixelRatio || 1, 2), L = rv1Layout();
  if (cv.width !== Math.round(L.W * dpr) || cv.height !== Math.round(L.H * dpr)) {
    cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
    RV1.ovc.width = cv.width; RV1.ovc.height = cv.height; RV1.ovc.style.width = cv.style.width; RV1.ovc.style.height = cv.style.height;
    document.getElementById("wrap").style.width = L.W + "px"; document.getElementById("wrap").style.height = L.H + "px";
  }
  const ctx = RV1.ov2d; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, RV1.ovc.width, RV1.ovc.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.SCISSOR_TEST); gl.clearColor(0.06, 0.08, 0.07, 1); gl.viewport(0, 0, cv.width, cv.height); gl.scissor(0, 0, cv.width, cv.height); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const subj = rv1Subjects();
  // contact shadows: a soft blob under the pelvis and each foot (strength falls with height)
  const sh = new Float32Array(64); let ns = 0; const B = RV1.entry.skel.byName;
  for (const s of subj) { const fk = s.o.fk; if (!fk) continue; const P = (i) => fk.joint[i];
    const pv = P(B.pelvis.idx); sh.set([pv[0], -pv[2], 0.42, 0.42], ns * 4); ns++;
    for (const sd of ["R", "L"]) { const a = fk.joint[B["foot_" + sd].idx], tt = fk.tip[B["toe_" + sd].idx], m = V3.lerp(a, tt, 0.45), hgt = Math.max(0, m[1] - 0.05); sh.set([m[0], -m[2], 0.16 + hgt * 0.3, 0.55 * Math.exp(-hgt * 7)], ns * 4); ns++; } }
  for (const vw of L.views) {
    const px = Math.round(vw.x * dpr), py = Math.round((L.H - vw.y - vw.h) * dpr), pw = Math.round(vw.w * dpr), ph = Math.round(vw.h * dpr);
    gl.viewport(px, py, pw, ph); gl.scissor(px, py, pw, ph); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let cam, label;
    if (vw.id === "game") {
      const ss = subj.filter(q => q.o.sim), f = ss[0] ? ss[0].o.sim : { x: 52.5, y: 34 };
      const lead = ss.length ? ss.reduce((q, z) => q + z.o.sim.x, 0) / ss.length : f.x, leadY = ss.length ? ss.reduce((q, z) => q + z.o.sim.y, 0) / ss.length : f.y;
      cam = rv1GameCam(lead - 52.5, RV1.zoom, vw.w, vw.h); label = `GAMEPLAY CAMERA (CAMERA_V1) · zoom ${RV1.zoom}×`;
      if (RV1.zoom > 1.01) {                                    // zoomed: keep the subject centred by a clip-space offset (the camera pose / angle are CAMERA_V1's)
        const pv = M4.transformPoint(cam.view, [lead, 0.9, -leadY]), pr = cam.proj, w = -pv[2], nx = pr[0] * pv[0] / w, ny = pr[5] * pv[1] / w, P2 = new Float32Array(pr);
        for (let k = 0; k < 4; k++) { P2[k * 4] = pr[k * 4] - nx * pr[k * 4 + 3]; P2[k * 4 + 1] = pr[k * 4 + 1] - ny * pr[k * 4 + 3]; }
        cam = { view: cam.view, proj: P2, eye: cam.eye }; label += " · subject centred";
      }
    }
    else { const spec = (vw.id === "A" ? RV1.viewA : RV1.viewB).split(":"), o = RV1.lanes.find(L => L.key === spec[0]); if (!o || !o.sim) { rv1Overlay(ctx, vw, null, [], dpr, `lane ${spec[0]} not in this preset`); continue; } cam = rv1CloseCam(o, spec[1], vw.w, vw.h); label = RV1.blind && !RV1.reveal ? `${rv1Name(o)} · ${spec[1]}` : `${o.label} · ${o.sim.v.toFixed(1)} m/s · ${spec[1]}`; vw.subject = spec[0]; }
    vw.cam = cam;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    const G = RV1.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, cam.view); gl.uniformMatrix4fv(G.u.proj, false, cam.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns);
    gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    for (const s of subj) { if (vw.id !== "game" && s.who !== vw.subject && !RV1.closeBoth) continue; if (s.o.skin) ofCharDraw(RV1.R, RV1.entry, s.o.skin, cam.view, cam.proj); }
    rv1Overlay(ctx, vw, cam, subj, dpr, label);
  }
  gl.disable(gl.SCISSOR_TEST);
}
function rv1Proj(cam, vw, dpr, p) {
  const v = M4.transformPoint(cam.view, p), pr = cam.proj;                          // full projection (the zoomed gameplay view carries a clip-space offset)
  const cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], w = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15]; if (w <= 1e-4) return null;
  return [(vw.x + (cx / w * 0.5 + 0.5) * vw.w) * dpr, (vw.y + (0.5 - cy / w * 0.5) * vw.h) * dpr];
}
function rv1Overlay(ctx, vw, cam, subj, dpr, label) {
  ctx.save(); ctx.beginPath(); ctx.rect(vw.x * dpr, vw.y * dpr, vw.w * dpr, vw.h * dpr); ctx.clip();
  if (!cam) { ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(230,240,235,0.6)"; ctx.fillText(label, (vw.x + 8) * dpr, (vw.y + 16) * dpr); ctx.restore(); return; }
  const B = RV1.entry.skel.byName, bones = RV1.entry.skel.bones, P = (p) => rv1Proj(cam, vw, dpr, p);
  for (const s of subj) {
    if (vw.id !== "game" && s.who !== vw.subject && !RV1.closeBoth) continue;
    const fk = s.o.fk; if (!fk) continue; const col = s.o.col;
    if (RV1.ov.trail) { const tr = s.o.trail; for (let k = 0; k < 4; k++) { ctx.beginPath(); let first = true; for (const q of tr) { const p = P(q[k]); if (!p) continue; if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = k % 2 ? "rgba(255,120,200,0.8)" : "rgba(120,255,160,0.8)"; ctx.lineWidth = (k < 2 ? 1.6 : 1) * dpr; ctx.stroke(); } }
    if (RV1.ov.skel) { ctx.lineWidth = 2 * dpr; ctx.strokeStyle = col; for (const b of bones) { if (!b.parent || b.name === "pelvis" || b.name === "hair") continue; const a = P(fk.joint[b.parent.idx]), c = P(fk.joint[b.idx]); if (a && c) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); } }
      for (const n of ["toe_R", "toe_L", "head", "hand_R", "hand_L"]) { const a = P(fk.joint[B[n].idx]), c = P(fk.tip[B[n].idx]); if (a && c) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); } }
      ctx.fillStyle = "#fff"; for (const b of bones) { const a = P(fk.joint[b.idx]); if (a) { ctx.beginPath(); ctx.arc(a[0], a[1], 1.8 * dpr, 0, 7); ctx.fill(); } } }
    if (RV1.ov.feet) {
      for (const sd of ["R", "L"]) { let planted = false, gp = null;
        if (!s.o.a) { const lg = s.o.pose.legs[sd]; planted = lg.st; const a = fk.joint[B["foot_" + sd].idx]; gp = [a[0], 0.002, a[2]]; }
        else { const st = s.o.a.state.feet[sd]; planted = !!(st && st.locked && st.w > 0.5); const a = fk.joint[B["foot_" + sd].idx]; gp = [a[0], 0.002, a[2]]; }
        const p = P(gp); if (!p) continue; ctx.beginPath(); ctx.arc(p[0], p[1], (vw.id === "game" ? 3 : 6) * dpr, 0, 7); ctx.fillStyle = planted ? (sd === "R" ? "rgba(120,255,160,0.95)" : "rgba(255,120,200,0.95)") : "rgba(255,255,255,0.0)"; ctx.fill(); ctx.strokeStyle = sd === "R" ? "#78ffa0" : "#ff78c8"; ctx.lineWidth = 1.2 * dpr; ctx.stroke(); }
    }
    if (RV1.ov.com) { const pv = P(fk.joint[B.pelvis.idx]), cm = P(rv1COM(fk)); if (pv) { ctx.fillStyle = "#ffd45e"; ctx.fillRect(pv[0] - 3 * dpr, pv[1] - 3 * dpr, 6 * dpr, 6 * dpr); } if (cm) { ctx.beginPath(); ctx.arc(cm[0], cm[1], 4 * dpr, 0, 7); ctx.strokeStyle = "#ffd45e"; ctx.lineWidth = 2 * dpr; ctx.stroke(); } }
    if (vw.id === "game" && subj.length > 1 && (RV1.blind ? RV1.reveal : RV1.labels !== false)) {      // tag beside the pelvis, toward the screen side away from the direction of travel
      const pv = P(fk.joint[B.pelvis.idx]), ahead = P(V3.add(fk.joint[B.pelvis.idx], [Math.cos(s.o.sim.heading), 0, -Math.sin(s.o.sim.heading)])); if (pv && ahead) {
        const sx = ahead[0] >= pv[0] ? -1 : 1, x = pv[0] + sx * 14 * dpr; ctx.font = `600 ${10 * dpr}px -apple-system, Helvetica`; ctx.textAlign = sx < 0 ? "right" : "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.55)"; const w = ctx.measureText(rv1Name(s.o)).width; ctx.fillRect(sx < 0 ? x - w - 3 * dpr : x - 3 * dpr, pv[1] - 7 * dpr, w + 6 * dpr, 14 * dpr);
        ctx.fillStyle = col; ctx.fillText(rv1Name(s.o), x, pv[1]); ctx.textBaseline = "alphabetic"; } }
  }
  ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; ctx.textAlign = "left"; ctx.fillStyle = "rgba(230,240,235,0.85)"; ctx.fillText(label, (vw.x + 8) * dpr, (vw.y + 16) * dpr);
  ctx.restore();
}
function rv1Hud() {
  const r = RV1.run1; if (!r || !r.G) return; const p = r.G.p, lg = r.pose.legs;
  const pm = RV1.perf.length ? RV1.perf.reduce((a, b) => a + b, 0) / RV1.perf.length : 0;
  if (RV1.blind && !RV1.reveal) { document.getElementById("hud").textContent = `t ${RV1.t.toFixed(3)} s   rate ${RV1.rate}×   BLIND ${RV1.blind}: labels, speeds and the HUD hidden — press L to reveal`; return; }
  const ladder = r.E && r.E.RUN1 && r.E.RUN1.ladder, reg = ladder && ladder[p.anchor] ? ladder[p.anchor] : p.anchor;
  document.getElementById("hud").textContent =
    `t ${RV1.t.toFixed(3)} s   rate ${RV1.rate}×   ${r.label}: ${r.sim.v.toFixed(2)} m/s (${reg}, blend ${p.blend.toFixed(2)}) · lean+${(r.A.accLean || 0).toFixed(1)}° · cadence ${(p.cadence * 60).toFixed(0)} spm · step ${p.stepLen.toFixed(2)} m · contact ${(p.tc * 1000).toFixed(0)} ms · flight ${((p.Ts - p.tc) * 1000).toFixed(0)} ms · phase ${r.A.phase.toFixed(3)} · R ${lg.R.st ? "STANCE " + lg.R.s.toFixed(2) : "swing " + lg.R.w.toFixed(2)} · L ${lg.L.st ? "STANCE " + lg.L.s.toFixed(2) : "swing " + lg.L.w.toFixed(2)} · pose eval ${(pm * 1000).toFixed(0)} µs`;
}

// ── loop + UI ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function rv1Frame(now) {
  if (RV1.lastT == null) RV1.lastT = now; const dt = Math.min(0.05, (now - RV1.lastT) / 1000); RV1.lastT = now;
  if (RV1.playing) { RV1.t += dt * RV1.rate; if (RV1.t > RV1_LOOP) { rv1Reset(); } rv1Update(RV1.t); }
  rv1Render(); rv1Hud(); RV1.frame++;
  if (!RV1.external) requestAnimationFrame(rv1Frame);
}
function rv1SetPlaying(on) { RV1.playing = on; const b = document.getElementById("bPlay"); b.textContent = on ? "❚❚ Pause" : "▶ Play"; b.classList.toggle("on", on); }
function rv1Group(attr, fn) { document.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener("click", () => { document.querySelectorAll(`[data-${attr}]`).forEach(x => x.classList.toggle("on", x === b)); fn(b.dataset[attr]); })); }
function rv1Views() {
  const fix = () => { const P = RV1_PRESETS[RV1.preset] || RV1_PRESETS.cmp, opts = [];
    const n = P.lanes.length, ord = rv1Order(n);                   // blind: listed in screen order under the blind names, no preset views
    ord.forEach((pi, i) => { const sp = P.lanes[pi]; for (const a of ["side", "front34", "rear34", "front", "rear", "sideR", "top", "zoomFront", "zoomSide", "zoom34", "zoomRear34"]) opts.push([`L${pi}:${a}`, `${RV1.blind ? "lane " + (n - i) : RV1_ENG[sp.eng].name() + (sp.tag ? " " + sp.tag : "")} · ${a}`]); });
    for (const id of ["selA", "selB"]) { const s = document.getElementById(id); s.innerHTML = opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(""); }
    if (RV1.blind) { RV1.viewA = `L${ord[0]}:side`; RV1.viewB = `L${ord[Math.min(1, n - 1)]}:side`; }
    else { RV1.viewA = P.views ? P.views[0] : "L0:side"; RV1.viewB = P.views ? P.views[1] : (n > 1 ? "L1" : "L0") + (n > 1 ? ":side" : ":front34"); }
    document.getElementById("selA").value = RV1.viewA; document.getElementById("selB").value = RV1.viewB; };
  RV1.fixViews = fix; fix();
  document.getElementById("selA").onchange = (e) => { RV1.viewA = e.target.value; }; document.getElementById("selB").onchange = (e) => { RV1.viewB = e.target.value; };
}
function rv1Boot() {
  const q = new URLSearchParams(location.search);
  RV1.cv = document.getElementById("gl"); RV1.ovc = document.getElementById("ov"); RV1.ov2d = RV1.ovc.getContext("2d");
  const gl = RV1.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.body.innerHTML = "WebGL2 unavailable"; return; }
  RV1.R = { gl }; RV1.ground = rv1GroundProgram(gl);
  if (q.get("lanes") && RV1_PRESETS[q.get("lanes")]) RV1.preset = q.get("lanes");
  if (q.get("show") || q.get("cmp")) { const w = (q.get("show") || "").split(","); RV1.preset = w.includes("orig") || q.get("cmp") === "all" ? "cmp4" : "cmp"; }   // legacy URLs
  if (q.get("dir")) RV1.dir = q.get("dir"); if (q.get("zoom")) RV1.zoom = +q.get("zoom"); if (q.get("v")) { if (q.get("v") === "ramp" || q.get("v") === "ramp9") RV1.speedMode = q.get("v"); else RV1.v = +q.get("v"); }
  if (q.get("rate")) RV1.rate = +q.get("rate"); if (q.get("labels") === "0") RV1.labels = false; if (q.get("blind")) { RV1.blind = Math.max(1, +q.get("blind") || 1); if (!q.get("lanes")) RV1.preset = "ladder"; }
  if (q.get("v1")) RV1.v1Mode = q.get("v1"); if (q.get("ticks") === "1") RV1.sampleTicks = true;
  for (const k of ["skel", "feet", "com", "trail"]) if (q.get(k) === "1") { RV1.ov[k] = true; }
  rv1Views();
  rv1Group("rate", (v) => { RV1.rate = +v; }); rv1Group("zoom", (v) => { RV1.zoom = +v; });
  document.querySelectorAll("[data-rate]").forEach(x => x.classList.toggle("on", +x.dataset.rate === RV1.rate));
  const selL = document.getElementById("selLanes"); selL.innerHTML = Object.entries(RV1_PRESETS).map(([k, P]) => `<option value="${k}">${P.label}</option>`).join(""); selL.value = RV1.preset;
  selL.onchange = (e) => { RV1.preset = e.target.value; RV1.fixViews(); const t = RV1.t; rv1Reset(); rv1Update(t); RV1.t = t; };
  document.querySelectorAll("[data-zoom]").forEach(x => x.classList.toggle("on", +x.dataset.zoom === RV1.zoom));
  document.getElementById("bPlay").onclick = () => rv1SetPlaying(!RV1.playing);
  document.getElementById("bRestart").onclick = () => { rv1Reset(); rv1Update(0); };
  document.getElementById("bStep").onclick = () => { rv1SetPlaying(false); RV1.t += 1 / 60; rv1Update(RV1.t); };
  document.getElementById("bExport").onclick = () => {                 // the explicit continuous state (r1Kinematics) at the current time
    const L = RV1.run1, K = L.E.r1Kinematics(L.A, (tt) => rv1V(tt, L), (tt) => rv1Sim(L, tt), RV1.t);
    const blob = new Blob([JSON.stringify(K, null, 1)], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `run1_state_t${RV1.t.toFixed(3)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const selV1 = document.getElementById("selV1"); selV1.value = RV1.v1Mode; selV1.onchange = (e) => { RV1.v1Mode = e.target.value; rv1Reset(); rv1Update(0); };
  const selDir = document.getElementById("selDir"); selDir.value = RV1.dir; selDir.onchange = (e) => { RV1.dir = e.target.value; rv1Reset(); rv1Update(0); };
  const selV = document.getElementById("selV"); selV.value = RV1.speedMode !== "const" ? RV1.speedMode : RV1.v.toFixed(1); selV.onchange = (e) => { if (e.target.value.startsWith("ramp")) RV1.speedMode = e.target.value; else { RV1.speedMode = "const"; RV1.v = +e.target.value; } rv1Reset(); rv1Update(0); };
  const cL = document.getElementById("cLabels"); if (cL) { cL.checked = RV1.labels; cL.onchange = () => { RV1.labels = cL.checked; if (RV1.blind) RV1.reveal = cL.checked; }; }
  for (const [id, k] of [["cSkel", "skel"], ["cFeet", "feet"], ["cCom", "com"], ["cTrail", "trail"]]) { const c = document.getElementById(id); c.checked = RV1.ov[k]; c.onchange = () => { RV1.ov[k] = c.checked; }; }
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "SELECT") return;
    if (e.key === " ") { rv1SetPlaying(!RV1.playing); e.preventDefault(); } else if (e.key === "r" || e.key === "R") { rv1Reset(); rv1Update(0); }
    else if (e.key === ".") { rv1SetPlaying(false); RV1.t += 1 / 60; rv1Update(RV1.t); }
    else if ("1234".includes(e.key)) { const r = [1, 0.5, 0.25, 0.1][+e.key - 1]; RV1.rate = r; document.querySelectorAll("[data-rate]").forEach(x => x.classList.toggle("on", +x.dataset.rate === r)); }
    else if (e.key === "s" || e.key === "S") { RV1.ov.skel = !RV1.ov.skel; document.getElementById("cSkel").checked = RV1.ov.skel; }
    else if (e.key === "c" || e.key === "C") { RV1.ov.feet = !RV1.ov.feet; document.getElementById("cFeet").checked = RV1.ov.feet; }
    else if (e.key === "l" || e.key === "L") { if (RV1.blind) RV1.reveal = !RV1.reveal; else RV1.labels = !RV1.labels; const c = document.getElementById("cLabels"); if (c) c.checked = RV1.blind ? !!RV1.reveal : RV1.labels; }
  });
  const id = q.get("char") || "vinicius";
  ofCharLoad(id).then((e) => {
    RV1.entry = e; rv1Reset(); rv1Update(0); RV1.ready = true;
    if (q.get("t")) { RV1.t = +q.get("t"); rv1Update(RV1.t); }
    if (q.get("paused") === "1") rv1SetPlaying(false);
    if (q.get("external") === "1") { RV1.external = true; rv1Render(); rv1Hud(); } else requestAnimationFrame(rv1Frame);
  }).catch((err) => { document.getElementById("hud").textContent = "character load failed: " + err; });
}
// capture / test API (tools/run1_capture.cjs drives this; deterministic)
window.RUN1V = {
  state: RV1,
  layout() { return rv1Layout(); },
  set(t, opts) { if (opts) { const pre = RV1.preset; Object.assign(RV1, opts.top || {}); Object.assign(RV1.ov, opts.ov || {}); if (RV1.preset !== pre && RV1.fixViews) { RV1.fixViews(); opts.reset = true; } if (opts.reset) rv1Reset(); if (RV1.fixViews && opts.fixViews) RV1.fixViews(); if (opts.viewA) RV1.viewA = opts.viewA; if (opts.viewB) RV1.viewB = opts.viewB; }
    if (t < RV1.t - 1e-9 || (opts && opts.reset)) rv1Reset(); RV1.t = t; rv1Update(t); rv1Render(); rv1Hud(); return true; },
  report() { const r = RV1.run1; return r && r.G ? { p: Object.assign({}, r.G.p, { swing: undefined, late: undefined }), phase: r.A.phase } : null; },
};
window.addEventListener("load", rv1Boot);
