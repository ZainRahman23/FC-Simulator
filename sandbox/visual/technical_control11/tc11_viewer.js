// ═══ technical_control11/tc11_viewer.js — TECHNICAL-CONTROL-1.1: the FEET / ANKLES LAB (owner, feet pass) on TECHNICAL-CONTROL-1's lab ═══════════════
// TECHNICAL-CONTROL-1's lab (technical_control1/tc_viewer.js, copied) with the feet review mode: close cameras that FOLLOW the player's facing
// (front 3/4 · rear 3/4 · side · foot level), a quad view of all four, 1× … 0.1×, the live joint angles of both legs (ankle dorsi / plantarflexion,
// inversion / eversion, foot yaw relative to the shin, knee, hip rotation, ankle angular velocity — amber beyond the comfort range, red beyond
// the hard range), every contact's surface, and the body comparison: TECHNICAL-CONTROL-1's body beside TECHNICAL-CONTROL-1.1's on the SAME
// simulation (the ball and every contact identical).
// URL (added): body=tc11|tc1 · cmp=body · single=fF34|fR34|fSide|fSideL|fFoot|quad · angles=0
// (TECHNICAL-CONTROL-1 header follows.) ═══ technical_control1/tc_viewer.js — TECHNICAL-CONTROL-1: the unified TECHNICAL-CONTROL / DRIBBLING LAB ═══
// RECEIVE-ELITE-1's lab (receive_elite1/re1_viewer.js, copied) on TECHNICAL-CONTROL-1: the technical course (straight, cuts 30° – 180°, a left-right
// sequence, acceleration into space, a contested change of direction) and the receive → turn → dribble chain, at any Ball Control / Dribbling /
// Agility (1 – 99), any style and preferred foot; NEW = TECHNICAL-CONTROL-1, RE1 = RECEIVE-ELITE-1, CURRENT = RECEIVE-MOVING-1 (the receive chain).
// URL: ?case=CUT90&b=99&d=99&a=99&style=NEUTRAL&foot=R&compare=1|vs=B50_D99_A99|vsStyle=DIRECT_RUNNER&body=new|old&single=…&rate=…
// (RECEIVE-ELITE-1 header follows.) ═══ receive_elite1/re1_viewer.js — RECEIVE-ELITE-1: the ELITE TIGHT-CONTROL LAB (owner §17 – §19) ════════
// The same simulation the Node tools run (deterministic, scrubbable), for CURRENT (RECEIVE-MOVING-1 on RECEIVE-CONTROL-2) and NEW (RECEIVE-ELITE-1)
// at chosen Ball Control / Dribbling / Agility, on the elite review set (stationary 30 … 180, running 30 … 150 + 180, sprinting 0 … 180). Shows every
// AUTHORITATIVE CONTACT as a numbered marker with its time (from the first contact), the ball's and the body's tracks, the ball – player separation
// live and as a graph over time (CURRENT grey, NEW yellow), the TURN-1.2 switch and DRIBBLE-V1's takeover. Views: gameplay camera, close, top;
// speed 1× … 0.1×; compare mode puts CURRENT and NEW side by side on the same pass.
// URL: ?case=ST_180_V12&b=99&d=99&a=99&seed=1&pipe=NEW|CURRENT&compare=1&single=nearC|top|topC|game&A=nearC&B=top&rate=0.25&t=…&anim=0&graph=0
import { ReceiveSimE, DT, RX, BALL_DEFAULT } from "../receive_elite1/re1_core.js";
import { ReceiveSimM } from "../receive_moving1/rm1_core.js";
import { EliteBody } from "../receive_elite1/re1_body.js";
import { TechSim } from "../technical_control1/tc_core.js";
import { TechBody } from "../technical_control1/tc_body.js";
import { STYLES } from "../technical_control1/tc_attrs.js";
import { courseCase, COURSE, EXTRA } from "../technical_control1/tc_course.js";
import { LegBody } from "./tc11_body.js";
import { legAngles, overROM, Q, ROM } from "./tc11_leg.js";
import { RxBody } from "../receive11/rx_body.js";
import { PROFILES } from "../dribble1/d1_attrs.js";
import { ALL, SET, parseCase as parseRecv } from "../receive_elite1/re1_cases.js";
const isRecv = (id) => /^ST_|_RUN_|_SPRINT_|_JOG_/.test(id), parseCase = (id, seed) => (isRecv(id) ? parseRecv(id) : courseCase(id, seed));
const W = window, Vv = { t: 0, rate: 1, playing: true, ready: false, single: null, labels: true, A: "nearC", B: "top", graph: true, sims: [] };
// ── cameras (as the TURN-1 viewer: CAMERA_V1 rail-following; close views at a fixed world azimuth following the runner) ──────────────────────────
function persp(fyNdc, aspect, n, f) { const m = new Float32Array(16); m[0] = fyNdc / aspect; m[5] = fyNdc; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
function lookAt(eye, at, up) { const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m; }
function gameCam(px, py, zoom, vw, vh) {
  const th = 22 * Math.PI / 180, C = [px, 30, -(68 + 43)], r = [1, 0, 0], u = [0, Math.cos(th), Math.sin(th)], f = [0, -Math.sin(th), Math.cos(th)];
  const view = M4.ident(); view[0] = r[0]; view[4] = r[1]; view[8] = r[2]; view[1] = u[0]; view[5] = u[1]; view[9] = u[2]; view[2] = -f[0]; view[6] = -f[1]; view[10] = -f[2];
  const t = M4.transformDir(view, C); view[12] = -t[0]; view[13] = -t[1]; view[14] = -t[2];
  const fpx = 360 / Math.tan(14 * Math.PI / 180), fy = 2 * fpx * zoom / 720, proj = persp(fy, vw / vh, 1.0, 400);
  if (zoom > 1.01) { const pv = M4.transformPoint(view, [px, 0.9, -py]), w = -pv[2], nx = proj[0] * pv[0] / w, ny = proj[5] * pv[1] / w; for (let k = 0; k < 4; k++) { proj[k * 4] -= nx * proj[k * 4 + 3]; proj[k * 4 + 1] -= ny * proj[k * 4 + 3]; } }
  return { view, proj };
}
const ANG = { side: [90, 6, 6.0], near: [-90, 14, 4.6], nearC: [-90, 10, 3.2], rear34: [150, 14, 6.4], front34: [30, 12, 6.4], top: [-90, 64, 7.5], rearC: [180, 8, 3.6], low: [-90, 4, 3.0] };
// the feet cameras FOLLOW the player's facing (smoothed): [azimuth from the front, elevation, distance, target height]
Object.assign(ANG, { fF34: [38, 7, 2.5, 0.42], fR34: [142, 9, 2.5, 0.42], fSide: [90, 4, 2.3, 0.40], fSideL: [-90, 4, 2.3, 0.40], fFoot: [58, 3, 1.75, 0.20] });
const FOLLOW = /^f[A-Z]/;
function closeCam(cx, cy, angle, heading0, vw, vh) {
  const a = ANG[angle] || ANG.near, tgt = [cx, a[3] != null ? a[3] : 0.55, -cy], f = [Math.cos(heading0), 0, -Math.sin(heading0)], l = [Math.sin(heading0), 0, Math.cos(heading0)];
  const az = a[0] * Math.PI / 180, el = a[1] * Math.PI / 180, d = a[2], hor = V3.add(V3.scale(f, Math.cos(az)), V3.scale(l, Math.sin(az))), eye = V3.add(tgt, V3.add(V3.scale(hor, d * Math.cos(el)), [0, d * Math.sin(el), 0]));
  return { view: lookAt(eye, tgt, [0, 1, 0]), proj: persp(1 / Math.tan(17 * Math.PI / 180), vw / vh, 0.1, 200) };
}
// ── the pitch (the RUN-1 / TURN-1 viewer's procedural ground with contact shadows) ─────────────────────────────────────────────────────────────────
function shader(gl, t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
function groundProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW; void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[16]; uniform int uNSh; out vec4 o;
  float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float ring(vec2 p, vec2 c, float r, float w){ float d=abs(length(p-c)-r); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  void main(){ vec2 p = vec2(vW.x, -vW.z); bool inP = p.x > -2.0 && p.x < 107.0 && p.y > -2.0 && p.y < 70.0; float stripe = mod(floor(p.x / 5.25), 2.0);
    vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe); float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453); g *= 0.97 + 0.06 * n; if (!inP) g = vec3(0.17, 0.33, 0.19) * (0.97 + 0.06 * n);
    float w = 0.12, L = 0.0; L = max(L, seg(p, vec2(0,0), vec2(105,0), w)); L = max(L, seg(p, vec2(0,68), vec2(105,68), w)); L = max(L, seg(p, vec2(0,0), vec2(0,68), w)); L = max(L, seg(p, vec2(105,0), vec2(105,68), w));
    L = max(L, seg(p, vec2(52.5,0), vec2(52.5,68), w)); L = max(L, ring(p, vec2(52.5,34), 9.15, w));
    vec3 c = mix(g, vec3(0.93, 0.95, 0.92), L * 0.92); float sh = 0.0; for (int i = 0; i < 16; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    c *= 1.0 - min(0.6, sh); o = vec4(c, 1.0); }`;
  const p = program(gl, VS, FS), vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-25, 25, 130, 25, -25, -130, 130, -130]), gl.STATIC_DRAW); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } };
}
// ── the football: a lit sphere with truncated-icosahedron panels from its integrated orientation (rendering never writes the ball) ─────────────────
function ballProg(gl) {
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
// ── run the simulation once and keep the record ───────────────────────────────────────────────────────────────────────────────────────────────────

ANG.topC = [-90, 86, 6.5]; ANG.close = [-90, 12, 3.0];
// ── run the simulations once and keep their records ───────────────────────────────────────────────────────────────────────────────────────────
function playerWith(r, base, foot) { const p = base || PROFILES.HIGH; return Object.assign({}, p, foot ? { preferred_foot: foot, weak_foot: foot === "B" ? 5 : p.weak_foot } : {}, { attributes: Object.assign({}, p.attributes, { ball_control: r.bc, dribbling: r.dri, agility: r.agi }) }); }
async function simulate(ent) {
  const q = new URLSearchParams(location.search), seed = +(q.get("seed") || 1), id = q.get("case") || "CUT90", r = { bc: +(q.get("b") || 99), dri: +(q.get("d") || 99), agi: +(q.get("a") || 99) }, style = q.get("style") || "NEUTRAL", foot = q.get("foot") || null, bodyKind = q.get("body") || "tc11";
  Vv.style = style; Vv.foot = foot; const cs = parseCase(`${id}_B${r.bc}_D${r.dri}_A${r.agi}`, seed), colliders = await (await fetch("dribble1/d1_colliders.json")).json(), anim = q.get("anim") !== "0"; Vv.cs = cs; Vv.ratings = r; Vv.seed = seed; Vv.anim = anim;
  // vs=B50_D99_A99: NEW at the page's ratings beside NEW at these (the attribute comparisons); compare=1: CURRENT beside NEW
  const vs = q.get("vs") ? (() => { const m = /B(\d+)_D(\d+)_A(\d+)/.exec(q.get("vs")); return { bc: +m[1], dri: +m[2], agi: +m[3] }; })() : null, vsStyle = q.get("vsStyle") || null, vsFoot = q.get("vsFoot") || null; Vv.vs = vs; Vv.vsStyle = vsStyle; Vv.vsFoot = vsFoot;
  const pipes = q.get("cmp") === "body" ? ["NEW@tc1", "NEW"] : vs || vsStyle || vsFoot ? ["NEW", "NEW@vs"] : q.get("compare") === "1" ? [isRecv(id) ? "CURRENT" : "RE1", "NEW"] : q.get("compare") === "re1" ? ["RE1", "NEW"] : [q.get("pipe") || "NEW"];
  const curveOnly = q.get("graph") !== "0" && pipes.length === 1 && isRecv(id) ? (pipes[0] === "NEW" ? "RE1" : "NEW") : null;   // the other pipeline's separation curve for the graph
  for (const pipe0 of pipes.concat(curveOnly ? [curveOnly] : [])) { const shown = pipe0 !== curveOnly || pipes.includes(pipe0), t0 = performance.now(), pipe = pipe0 === "NEW@vs" || pipe0 === "NEW@tc1" ? "NEW" : pipe0, rr = pipe0 === "NEW@vs" && vs ? vs : r;
    const BodyK = pipe0 === "NEW@tc1" || bodyKind === "tc1" ? VTech : bodyKind === "old" ? EliteBody : VLeg;
    const st = pipe0 === "NEW@vs" && vsStyle ? vsStyle : style;
    const cfg = { T1: W.TURN1, E: W.RUN1_V13, M4: M4, TURN11: W.TURN11, skel: ent.skel, colliders, ball: BALL_DEFAULT, arch: "B", seed, player: playerWith(rr, null, pipe0 === "NEW@vs" && vsFoot ? vsFoot : foot), bc: rr.bc, wf: null, scenario: Object.assign({}, cs.scenario), ratings: rr,
      Body: anim && shown ? RxBody : null, EliteBody: anim && shown ? (pipe === "NEW" ? BodyK : EliteBody) : null, opts: { record: true, recViewer: shown, anim: anim && shown },
      style: st, bridge: q.get("bridge") || "off", moveIntent: cs.moveIntent || null, dribble: cs.dribble || null };
    const S = pipe === "NEW" ? new TechSim(cfg) : pipe === "RE1" ? new ReceiveSimE(cfg) : new ReceiveSimM(cfg);
    // (viewer only: each record gets the legs' joint angles of the pose just made — the simulation is not touched)
    if (S.record) { const rec0 = S.record.bind(S); S.record = () => { rec0(); const rr2 = S.rec && S.rec[S.rec.length - 1]; if (rr2) { rr2.legA = S._legA || null; S._legA = null; } }; }
    S.run(); const ms = performance.now() - t0;
    let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
    for (const rr of S.rec) { mix(rr.ball.p[0]); mix(rr.ball.p[1]); mix(rr.ball.p[2]); mix(rr.P[0]); mix(rr.P[1]); } for (const T of S.touches) mix(T.k);
    const sim = { pipe, tag: pipe0, body: pipe === "NEW" ? (BodyK === VTech ? "TECHNICAL-CONTROL-1 body" : BodyK === VLeg ? "TECHNICAL-CONTROL-1.1 body" : "RECEIVE-ELITE-1 body") : "", foot: pipe0 === "NEW@vs" && vsFoot ? vsFoot : foot, ratings: rr, style: pipe0 === "NEW@vs" && vsStyle ? vsStyle : style, S, rec: S.rec, ms, hash: h.toString(16), shown, contacts: contactsOf(S), sep: S.rec.map((rr) => Math.hypot(rr.ball.p[0] - rr.P[0], rr.ball.p[2] - rr.P[1])) };
    if (shown) Vv.sims.push(sim); else Vv.other = sim; }
  Vv.dur = Math.max(...Vv.sims.map((s) => (s.S.fault ? (s.rec.length - 1) * DT : cs.scenario.dur)));
}
// ── the bodies, as the viewer runs them: each pose leaves its legs' joint angles and the ankles' world positions for the record ───────────────
function legRec(body, o) { const A = {}; for (const X of ["R", "L"]) { const a = legAngles(o.pose.rot, X); a.Rl = o.pose.rot["foot_" + X]; a.planted = !!(o.feet && o.feet[X] && o.feet[X].planted); A[X] = a; }
  const fk = body.fk, ix = body.b.idx; A.ankW = { R: fk.joint[ix.foot_R].slice(), L: fk.joint[ix.foot_L].slice() }; body.sim._legA = A; }
class VLeg extends LegBody { poseAt(t, b) { const o = super.poseAt(t, b); legRec(this, o); return o; } }
class VTech extends TechBody { poseAt(t, b) { const o = super.poseAt(t, b); legRec(this, o); return o; } }
// the facing the feet cameras follow: the body's velocity over ±0.3 s (a turn is followed, a step is not)
function followHeading(sim, i) { const rec = sim.rec, a = Math.max(0, i - 72), b = Math.min(rec.length - 1, i + 72); let vx = 0, vy = 0; for (let k = a; k <= b; k += 6) { vx += rec[k].V[0]; vy += rec[k].V[1]; }
  if (Math.hypot(vx, vy) < 0.5 * ((b - a) / 6 + 1)) return sim._lastH != null ? sim._lastH : Vv.cs.scenario.init.heading || 0; sim._lastH = Math.atan2(vy, vx); return sim._lastH; }
// the live joint angles of both legs (amber beyond the comfort range, red beyond the hard range)
function feetPanel(ctx, vw, dpr, sim, i, r) { if (Vv.angles === false || !r.legA) return; const rec = sim.rec, A = r.legA, A0 = rec[i - 1] && rec[i - 1].legA, A1 = rec[i + 1] && rec[i + 1].legA;
  const lines = []; for (const X of ["R", "L"]) { const a = A[X], oc = overROM(a, "comfort"), oh = overROM(a, "hard"), w = A0 && A1 ? Q.angle(A0[X].Rl, A1[X].Rl) / (2 / 240) * 180 / Math.PI : 0;
    const col = (k) => (oh[k] > 0.5 ? "#ff6b6b" : oc[k] > 0.5 ? "#ffc35e" : "#dff3e7");
    lines.push([[`${X} ${a.planted ? "planted" : "swing  "}`, "#9fd8ff"], [`ankle ${a.df >= 0 ? "DF" : "PF"} ${Math.abs(a.df).toFixed(0)}°`, col("df")], [`${a.inv >= 0 ? "inv" : "ev"} ${Math.abs(a.inv).toFixed(0)}°`, col("inv")], [`foot yaw/shin ${a.footYawShin.toFixed(0)}°`, oh.abd > 0.5 || oh.tib > 0.5 ? "#ff6b6b" : oc.abd > 0.5 || oc.tib > 0.5 ? "#ffc35e" : "#dff3e7"], [`knee ${a.knee.toFixed(0)}°`, col("knee")], [`hip rot ${a.hipRot.toFixed(0)}°`, col("hip")], [`ankle ω ${w.toFixed(0)}°/s`, w > 1400 ? "#ff6b6b" : w > 1000 ? "#ffc35e" : "#dff3e7"]]); }
  ctx.font = `600 ${10.5 * dpr}px Menlo, monospace`; const y0 = vw.y + vw.h - 34; ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect((vw.x + 4) * dpr, (y0 - 13) * dpr, Math.min(vw.w - 8, 720) * dpr, 36 * dpr);
  lines.forEach((L2, j) => { let x = vw.x + 9; for (const [txt, c] of L2) { ctx.fillStyle = c; ctx.fillText(txt, x * dpr, (y0 + j * 15) * dpr); x += ctx.measureText(txt).width / dpr + 12; } });
  // the view's header: the body, the camera, the case, the ratings, the time from the first contact
  { const rt = sim.ratings || Vv.ratings, k1 = sim.contacts.k1, tR = k1 != null ? (i - k1) * DT : null, last = sim.contacts.list.filter((c) => c.recv && c.k <= i).pop();
    const tag = `${sim.body || ""} · ${vw.id === "fF34" ? "front 3/4" : vw.id === "fR34" ? "rear 3/4" : vw.id === "fFoot" ? "foot level" : vw.id === "fSideL" ? "left side" : "right side"} · ${Vv.cs.label || Vv.cs.base} · ${rt.bc}/${rt.dri}/${rt.agi}${sim.style && sim.style !== "NEUTRAL" ? " · " + (STYLES[sim.style] || { label: sim.style }).label : ""}`;
    const tg2 = `t ${r.t.toFixed(3)} s${tR != null ? ` (${tR >= 0 ? "+" : ""}${tR.toFixed(3)})` : ""}${last ? ` · last contact ${last.n} ${last.F} ${(last.reg || "").toLowerCase()} ${((i - last.k) * DT * 1000).toFixed(0)} ms ago` : ""} · ${Vv.rate}×`;
    ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; const wT = Math.max(ctx.measureText(tag).width, ctx.measureText(tg2).width) / dpr + 12; ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect((vw.x + 4) * dpr, (vw.y + 4) * dpr, wT * dpr, 33 * dpr);
    ctx.fillStyle = COL[sim.tag] || "#ffd45e"; ctx.fillText(tag, (vw.x + 10) * dpr, (vw.y + 17) * dpr); ctx.fillStyle = "#e8f5ee"; ctx.fillText(tg2, (vw.x + 10) * dpr, (vw.y + 32) * dpr); } }
// every launched touch: the receive's contacts numbered from 1 (time from the first contact), then DRIBBLE-V1's
function contactsOf(S) { const T = S.touches.filter((t) => t.launched).sort((a, b) => a.k - b.k), rx = T.filter((t) => t.receive), k1 = rx.length ? rx[0].k : null, out = []; let n = 0, d = 0;
  for (const t of T) { const recv = !!t.receive; out.push({ k: t.k, t: k1 != null ? (t.k - k1) * DT : 0, n: recv ? ++n : ++d, recv, F: t.F, reg: String(t.reg || "").toLowerCase(), fam: String(t.family || ""), exit: !!(t.elite && t.elite.exit) || /EXIT|REJOIN|SET-OFF/.test(String(t.family)), p: t.ball, speed: t.executed ? t.executed.speed : 0, recovery: !!t.recovery }); }
  return { list: out, k1 }; }
// ── draw ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const K2A = (p) => [p[0], p[1], -p[2]], QA = (q) => [-q[0], -q[1], q[2], q[3]], GH = 150;
function layout() { if (Vv.fixedLayout) return Vv.fixedLayout; if (Vv.bare) return mkLayout(window.innerWidth, window.innerHeight); const bar = document.getElementById("bar"), top = bar ? bar.getBoundingClientRect().height : 50, Wd = Math.max(640, Math.min(window.innerWidth - 8, 2400)), H0 = Math.max(420, window.innerHeight - top - 40);
  return mkLayout(Wd, H0); }
function mkLayout(Wd, H0) { const g = Vv.graph ? GH : 0, H = H0 - g, views = [];
  if (Vv.single === "quad") { const n = Vv.sims.length, w2 = Math.floor((Wd - 4) / 2), h2 = Math.floor((H - 4) / 2), ids = ["fF34", "fR34", "fSide", "fFoot"];
    if (n === 2) { for (const [j, id] of ["fF34", "fFoot"].entries()) for (let s2 = 0; s2 < 2; s2++) views.push({ id, s: s2, x: s2 * (w2 + 4), y: j * (h2 + 4), w: s2 ? Wd - w2 - 4 : w2, h: j ? H - h2 - 4 : h2 }); }
    else ids.forEach((id, j) => views.push({ id, s: 0, x: (j % 2) * (w2 + 4), y: Math.floor(j / 2) * (h2 + 4), w: j % 2 ? Wd - w2 - 4 : w2, h: j >= 2 ? H - h2 - 4 : h2 })); }
  else if (Vv.single && Vv.sims.length === 2) { const w2 = Math.floor((Wd - 4) / 2); views.push({ id: Vv.single, s: 0, x: 0, y: 0, w: w2, h: H }, { id: Vv.single, s: 1, x: w2 + 4, y: 0, w: Wd - w2 - 4, h: H }); }
  else if (Vv.single) views.push({ id: Vv.single, s: 0, x: 0, y: 0, w: Wd, h: H });
  else if (Vv.sims.length === 2) { const w2 = Math.floor((Wd - 4) / 2); views.push({ id: Vv.A, s: 0, x: 0, y: 0, w: w2, h: H }, { id: Vv.A, s: 1, x: w2 + 4, y: 0, w: Wd - w2 - 4, h: H }); }
  else { const gw = Math.round(Wd * 0.58), cw = Wd - gw - 4, ch = Math.floor((H - 4) / 2); views.push({ id: "game", s: 0, x: 0, y: 0, w: gw, h: H }, { id: Vv.A, s: 0, x: gw + 4, y: 0, w: cw, h: ch }, { id: Vv.B, s: 0, x: gw + 4, y: ch + 4, w: cw, h: H - ch - 4 }); }
  return { W: Wd, H: H0, H3: H, views, graph: g ? { x: 0, y: H, w: Wd, h: g } : null }; }
function proj3(cam, vw, dpr, p) { const v = M4.transformPoint(cam.view, p), pr = cam.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], w = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (w <= 1e-4) return null; return [(vw.x + (cx / w * 0.5 + 0.5) * vw.w) * dpr, (vw.y + (0.5 - cy / w * 0.5) * vw.h) * dpr]; }
const iAt = (sim, t) => Math.max(0, Math.min(sim.rec.length - 1, Math.floor(t / DT + 1e-6)));
function render() {
  const gl = Vv.gl, cv = Vv.cv, dpr = Vv.dpr || Math.min(window.devicePixelRatio || 1, 2), L = layout();
  if (cv.width !== Math.round(L.W * dpr) || cv.height !== Math.round(L.H * dpr)) { cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.width = L.W + "px"; cv.style.height = L.H + "px";
    Vv.ovc.width = cv.width; Vv.ovc.height = cv.height; Vv.ovc.style.width = cv.style.width; Vv.ovc.style.height = cv.style.height; const wr = document.getElementById("wrap"); wr.style.width = L.W + "px"; wr.style.height = L.H + "px"; }
  const ctx = Vv.ov2d; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, Vv.ovc.width, Vv.ovc.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.SCISSOR_TEST); gl.viewport(0, 0, cv.width, cv.height); gl.scissor(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const h0 = Vv.cs.scenario.init.heading || 0;
  for (const vw of L.views) { const sim = Vv.sims[vw.s], i = iAt(sim, Vv.t), r = sim.rec[i], bA = K2A(r.ball.p), sh = new Float32Array(64); let ns = 0; const pushSh = (x, y, s, w) => { if (ns < 16) { sh.set([x, y, s, w], ns * 4); ns++; } };
    pushSh(r.P[0], r.P[1], 0.42, 0.40); if (r.feet) for (const F of ["R", "L"]) { const a = r.feet[F], hg = Math.max(0, a[1] - 0.09); pushSh(a[0], -a[2], 0.15 + hg * 0.3, 0.5 * Math.exp(-hg * 7)); }
    const bh = Math.max(0, bA[1] - 0.11); pushSh(bA[0], -bA[2], 0.12 + bh * 0.4, 0.65 * Math.exp(-bh * 5));
    const px = Math.round(vw.x * dpr), py = Math.round((L.H - vw.y - vw.h) * dpr), pw = Math.round(vw.w * dpr), ph = Math.round(vw.h * dpr);
    gl.viewport(px, py, pw, ph); gl.scissor(px, py, pw, ph); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let cx = (r.P[0] + bA[0]) / 2, cy = (r.P[1] - bA[2]) / 2, hh = h0;
    if (FOLLOW.test(vw.id)) { hh = followHeading(sim, i); const fa = r.legA && r.legA.ankW; if (fa) { const mx = (fa.R[0] + fa.L[0]) / 2, mz = (fa.R[2] + fa.L[2]) / 2, wB = vw.id === "fFoot" ? 0.35 : 0.3; cx = mx * (1 - wB) + bA[0] * wB; cy = -(mz * (1 - wB) + bA[2] * wB); } }
    const cam = vw.id === "game" ? gameCam(r.P[0], r.P[1], Vv.zoom || 1, vw.w, vw.h) : closeCam(cx, cy, vw.id, hh, vw.w, vw.h); vw.cam = cam;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    const G = Vv.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, cam.view); gl.uniformMatrix4fv(G.u.proj, false, cam.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    if (r.skin) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(Vv.R, Vv.ent, r.skin, cam.view, cam.proj); gl.disable(gl.CULL_FACE); }
    const B = Vv.ball; gl.useProgram(B.p); gl.uniformMatrix4fv(B.u.view, false, cam.view); gl.uniformMatrix4fv(B.u.proj, false, cam.proj); gl.uniform3fv(B.u.c, bA); gl.uniform4fv(B.u.q, QA(r.ball.q)); gl.uniform1f(B.u.r, 0.11); gl.uniform3fv(B.u.tint, [1, 1, 1]);
    gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null);
    overlay(ctx, vw, cam, dpr, sim, i, r); }
  gl.disable(gl.SCISSOR_TEST);
  if (L.graph) graph(ctx, L.graph, dpr);
}
const COL = { CURRENT: "rgba(190,200,196,0.95)", RE1: "#8fd3ff", NEW: "#ffd45e", "NEW@vs": "#ff8fd8", "NEW@tc1": "#c9b37a", R: "rgba(110,255,150,0.95)", L: "rgba(255,110,200,0.95)", CONTROLLED: "#7dff9b", LOOSE: "#ffb347" };
const P2 = (p, h) => [p[0], h || 0.03, -p[1]];
function overlay(ctx, vw, cam, dpr, sim, i, r) {
  const P = (p) => proj3(cam, vw, dpr, p), rec = sim.rec, S = sim.S, top = /top/.test(vw.id), feetV = FOLLOW.test(vw.id), big = !feetV && (vw.id === "game" || Vv.single || Vv.sims.length === 2);
  ctx.save(); ctx.beginPath(); ctx.rect(vw.x * dpr, vw.y * dpr, vw.w * dpr, vw.h * dpr); ctx.clip();
  const line = (pts, col, wid, dash) => { ctx.beginPath(); let f = true; for (const q of pts) { const p = P(q); if (!p) continue; if (f) { ctx.moveTo(p[0], p[1]); f = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = wid * dpr; ctx.setLineDash(dash ? dash.map(d => d * dpr) : []); ctx.stroke(); ctx.setLineDash([]); };
  const ring = (c, rad, col, wid, dash) => { const pts = []; for (let a = 0; a <= 28; a++) pts.push([c[0] + rad * Math.cos(a / 28 * 6.283), c[1], c[2] + rad * Math.sin(a / 28 * 6.283)]); line(pts, col, wid, dash); };
  const text = (q, s, col, size) => { const p = P(q); if (!p) return; ctx.font = `600 ${(size || 11) * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(0,0,0,0.6)"; const w = ctx.measureText(s).width; ctx.fillRect(p[0] - 3 * dpr, p[1] - 12 * dpr, w + 6 * dpr, 15 * dpr); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1]); };
  // tracks: the ball (white) and the body's centre (cyan), the last 1.2 s
  const tr = (f, a, b) => rec.slice(Math.max(0, a), Math.min(rec.length, b)).filter((_, k) => k % 3 === 0).map(f);
  line(tr((q) => [q.ball.p[0], 0.015, -q.ball.p[2]], i - 290, i + 1), "rgba(255,255,255,0.75)", 1.6); line(tr((q) => [q.P[0], 0.012, -q.P[1]], i - 290, i + 1), "rgba(77,232,255,0.75)", 1.6);
  // the separation now: a line from the body's centre to the ball, its length
  const dNow = sim.sep[i]; line([[r.P[0], 0.02, -r.P[1]], [r.ball.p[0], 0.02, -r.ball.p[2]]], "rgba(255,212,94,0.7)", 1.2, [3, 3]);
  // THE AUTHORITATIVE CONTACTS: numbered markers at the ball's position at each launch, with the time from the first contact
  const ks = sim.contacts.list.filter((c) => c.k <= i && (c.recv || i - c.k < 360));
  for (const c of ks) { const a = c.recv ? 1 : Math.max(0.25, 1 - (i - c.k) / 360), col = c.recv ? (c.exit ? `rgba(125,255,155,${a})` : c.recovery ? `rgba(255,120,90,${a})` : `rgba(255,212,94,${a})`) : `rgba(125,240,255,${a})`, p = [c.p[0], 0.02, c.p[2]];
    ring(p, 0.13, col, i - c.k < 12 ? 3.4 : 2.0); const lab = c.recv ? `${c.n}` : `D${c.n}`; text([p[0], top ? 0.05 : feetV ? 0.24 + 0.04 * (c.n % 2) : 0.30 + 0.05 * (c.n % 2), p[2]], feetV ? `${lab} ${c.F} ${(c.reg || "").toLowerCase()}` : top || !big ? lab : `${lab} · ${c.t >= 0 ? "+" : ""}${c.t.toFixed(2)} s · ${c.F} ${c.reg}${c.exit ? " · exit" : ""}${c.recovery ? " · recovery" : ""}`, col, top ? 11 : 10); }
  // NEW: the next planned contact (dimmed), the exit touch's target on the exit line, the switch / takeover
  if (S.rc2 && S.rc2.kind === "ELITE") { const c2 = S.rc2, ep = c2.ep, F = c2.frame;
    if (c2.rejoin && c2.rejoin.target && i <= (S.rx.handoff && S.rx.handoff.kDribble ? S.rx.handoff.kDribble : 99999)) { const T = F.pitch(c2.rejoin.target); ring(P2(T, 0.015), 0.16, "rgba(125,255,155,0.55)", 1.4, [3, 3]); if (big && !top) text(P2(T, 0.25), "exit touch's target (DRIBBLE-V1 takes the ball)", "#bfffcf", 9); } }
  if (big) { const L = (s, y, col) => { ctx.font = `600 ${11.5 * dpr}px -apple-system, Helvetica`; const w = ctx.measureText(s).width; ctx.fillStyle = "rgba(0,0,0,0.58)"; ctx.fillRect((vw.x + 6) * dpr, (vw.y + y - 13) * dpr, w + 10 * dpr, 17 * dpr); ctx.fillStyle = col; ctx.fillText(s, (vw.x + 11) * dpr, (vw.y + y) * dpr); };
    const rt = sim.ratings || Vv.ratings, sp = Math.hypot(r.V[0], r.V[1]), k1 = sim.contacts.k1, tRel = k1 != null ? (i - k1) * DT : null, ph = phaseOf(sim, i);
    const ep0 = sim.S.rc2 && sim.S.rc2.ep, act0 = ep0 && ep0.techLog ? ep0.techLog.filter((e) => e.ev === "action" && e.t <= (i - (sim.S.rc2.kc || 0)) * DT + 0.6).pop() : null;
    L(`${sim.pipe === "NEW" ? "TECHNICAL-CONTROL-1 · " + sim.body : sim.pipe === "RE1" ? "RECEIVE-ELITE-1" : "CURRENT · RECEIVE-MOVING-1"} · ${Vv.cs.label || Vv.cs.base}${sim.pipe === "NEW" ? " · style " + (STYLES[sim.style] || STYLES.NEUTRAL).label + " · " + ({ R: "right-footed", L: "left-footed", B: "two-footed" }[sim.foot] || "right-footed") : ""}${act0 ? " · " + act0.fam.replace(/_/g, " ").toLowerCase() : ""}`, 20, COL[sim.tag || sim.pipe]);
    L(`Ball Control ${rt.bc} · Dribbling ${rt.dri} · Agility ${rt.agi}${sim.pipe === "CURRENT" ? " (the current receive reads Ball Control only)" : ""} · seed ${Vv.seed}${Vv.anim ? "" : " · ANIMATION OFF"}`, 38, "#e8f5ee");
    L(`t ${r.t.toFixed(2)} s${tRel != null ? ` (${tRel >= 0 ? "+" : ""}${tRel.toFixed(2)} s from the first contact)` : ""} · ${ph} · player ${sp.toFixed(1)} m/s · ball–player ${dNow.toFixed(2)} m`, 56, "#e8f5ee");
    const n = sim.contacts.list.filter((c) => c.recv).length; L(Vv.cs.kind === "course" ? `contacts ${n} · max separation (the whole run) ${sepMax(sim).toFixed(2)} m` : `contacts ${n} (receive + technical control) · max separation (first contact → DRIBBLE-V1's first touch, ≤ 2.5 s) ${sepMax(sim).toFixed(2)} m`, 74, "#ffe9a8"); }
  else if (Vv.labels && !feetV) { ctx.font = `600 ${11 * dpr}px -apple-system, Helvetica`; ctx.fillStyle = "rgba(230,240,235,0.85)"; ctx.fillText(vw.id, (vw.x + 8) * dpr, (vw.y + 16) * dpr); }
  if (feetV) feetPanel(ctx, vw, dpr, sim, i, r);
  ctx.restore();
}
function phaseOf(sim, i) { const S = sim.S, c2 = S.rc2, ho = S.rx.handoff, k1 = sim.contacts.k1; if (k1 == null || i < k1) return "preparation"; if (ho && ho.kDribble != null && i >= ho.kDribble) return "DRIBBLE-V1"; if (c2 && c2.t12 && i >= c2.t12.k) return "TURN-1.2 run-out (the ball rolls to DRIBBLE-V1's takeover)"; const ep = c2 && c2.ep;
  if (ep && ep.carryFrom != null && i >= ep.kc0 + Math.round(ep.carryFrom / DT)) return "technical control (carry · actions)"; return Vv.cs.kind === "course" ? "technical control (carry · actions)" : "receive action"; }
function sepMax(sim) { const S = sim.S, k1 = sim.contacts.k1; if (k1 == null) return 0; const d = sim.contacts.list.find((c) => !c.recv && c.k > k1), kE = Vv.cs.kind === "course" ? sim.rec.length - 1 : Math.min(sim.rec.length - 1, d ? d.k : k1 + 600, k1 + 600); let m = 0; for (let k = k1; k <= kE; k++) m = Math.max(m, sim.sep[k]); return m; }
// ── the separation graph: ball – player distance over time, CURRENT grey / NEW yellow, the contacts as ticks, the time cursor ─────────────────────
function graph(ctx, g, dpr) {
  const sims = Vv.sims.concat(Vv.other ? [Vv.other] : []), nw = sims.find((s) => s.pipe === "NEW") || sims[0], k1 = nw.contacts.k1 != null ? nw.contacts.k1 : 0, t0 = k1 * DT - 0.3, t1 = t0 + 3.0;
  const yMax = Math.max(1.5, Math.ceil(Math.max(...sims.map((s) => Math.max(...s.sep.slice(Math.max(0, Math.round(t0 / DT)), Math.round(t1 / DT))))) * 2) / 2);
  const X = (t) => (g.x + 52 + (t - t0) / (t1 - t0) * (g.w - 70)) * dpr, Y = (d) => (g.y + g.h - 22 - d / yMax * (g.h - 40)) * dpr;
  ctx.fillStyle = "#101614"; ctx.fillRect(g.x * dpr, g.y * dpr, g.w * dpr, g.h * dpr); ctx.font = `600 ${10.5 * dpr}px -apple-system, Helvetica`;
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1 * dpr; for (let d = 0; d <= yMax + 1e-9; d += 0.5) { ctx.beginPath(); ctx.moveTo(X(t0), Y(d)); ctx.lineTo(X(t1), Y(d)); ctx.stroke(); ctx.fillStyle = "#8fa49a"; ctx.fillText(d.toFixed(1) + " m", (g.x + 8) * dpr, Y(d) + 4 * dpr); }
  for (let t = Math.ceil((t0 - k1 * DT) * 2) / 2; t <= t1 - k1 * DT; t += 0.5) { ctx.fillStyle = "#8fa49a"; ctx.fillText((t >= 0 ? "+" : "") + t.toFixed(1) + " s", X(k1 * DT + t) - 12 * dpr, (g.y + g.h - 6) * dpr); }
  for (const s of sims) { ctx.beginPath(); let f = true; for (let k = Math.max(0, Math.round(t0 / DT)); k <= Math.min(s.sep.length - 1, Math.round(t1 / DT)); k += 2) { const x = X(k * DT), y = Y(s.sep[k]); if (f) { ctx.moveTo(x, y); f = false; } else ctx.lineTo(x, y); }
    ctx.strokeStyle = COL[s.tag || s.pipe]; ctx.lineWidth = (s.pipe === "NEW" ? 2.4 : 1.8) * dpr; ctx.stroke();
    for (const c of s.contacts.list) { if (c.k * DT < t0 || c.k * DT > t1) continue; ctx.fillStyle = c.recv ? COL[s.tag || s.pipe] : "rgba(125,240,255,0.9)"; const x = X(c.k * DT), y = Y(s.sep[c.k]); ctx.beginPath(); ctx.arc(x, y, (c.recv ? 3.6 : 2.6) * dpr, 0, 7); ctx.fill(); } }
  const xc = X(Vv.t); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.moveTo(xc, (g.y + 8) * dpr); ctx.lineTo(xc, (g.y + g.h - 18) * dpr); ctx.stroke();
  ctx.fillStyle = "#e8f5ee"; ctx.fillText("ball – player separation (ball centre ↔ the player's centre, horizontal) · dots: contacts (receive ● · DRIBBLE-V1 ● cyan)", (g.x + 56) * dpr, (g.y + 14) * dpr);
  let lx = g.x + g.w - 360; for (const s of sims) { const rt = s.ratings || Vv.ratings; ctx.fillStyle = COL[s.tag || s.pipe]; ctx.fillRect(lx * dpr, (g.y + 8) * dpr, 14 * dpr, 4 * dpr); ctx.fillText(s.pipe === "NEW" ? `NEW ${rt.bc}/${rt.dri}/${rt.agi}${s.style && s.style !== "NEUTRAL" ? " " + (STYLES[s.style] || { label: s.style }).label.split(" ")[0] : ""}${s.foot && s.foot !== "R" ? " " + s.foot : ""}` : s.pipe === "RE1" ? "RECEIVE-ELITE-1" : "CURRENT", (lx + 18) * dpr, (g.y + 14) * dpr); lx += 165; }
}
function hud() { const el = document.getElementById("hud"); if (!el || !Vv.sims.length) return; el.textContent = Vv.sims.concat(Vv.other ? [Vv.other] : []).map((s) => { const S = s.S, c = s.contacts.list.filter((x) => x.recv);
  return `${s.pipe}${s.shown ? "" : " (graph only)"} · ${Vv.cs.id} · contacts ${c.map((x) => `${x.n}@${x.t.toFixed(2)}s ${x.F}`).join(" ")} · max sep ${sepMax(s).toFixed(2)} m · ${S.rx.handoff && S.rx.handoff.kDribble ? "DRIBBLE-V1 " + (S.rx.handoff.kDribble * DT).toFixed(2) + " s" : "no takeover"} · control ${S.ctrl.state} · simulated in ${s.ms.toFixed(0)} ms · fingerprint ${s.hash}`; }).join("\n"); }
function frame(now) { if (Vv.lastT == null) Vv.lastT = now; const dt = Math.min(0.05, (now - Vv.lastT) / 1000); Vv.lastT = now;
  if (Vv.playing) { Vv.t += dt * Vv.rate; if (Vv.t > Vv.dur) Vv.t = 0; } render(); hud(); if (!Vv.external) requestAnimationFrame(frame); }
async function boot() {
  const q = new URLSearchParams(location.search);
  Vv.cv = document.getElementById("gl"); Vv.ovc = document.getElementById("ov"); Vv.ov2d = Vv.ovc.getContext("2d");
  const gl = Vv.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.body.textContent = "WebGL2 unavailable"; return; }
  Vv.gl = gl; Vv.R = { gl }; Vv.ground = groundProg(gl); Vv.ball = ballProg(gl);
  if (q.get("labels") === "0") Vv.labels = false; if (q.get("single")) Vv.single = q.get("single"); if (q.get("rate")) Vv.rate = +q.get("rate"); if (q.get("zoom")) Vv.zoom = +q.get("zoom"); if (q.get("A")) Vv.A = q.get("A"); if (q.get("B")) Vv.B = q.get("B"); if (q.get("graph") === "0") Vv.graph = false; if (q.get("angles") === "0") Vv.angles = false; if (q.get("bare") === "1") { Vv.bare = true; for (const id of ["bar", "hud"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; } document.body.style.overflow = "hidden"; }
  const sel = document.getElementById("selScn"), groups = [["technical course", COURSE.concat(COURSE.filter((c) => /^CUT|^CONTEST/.test(c)).map((c) => c + "_L"))], ["receive → turn → dribble · stationary", SET.stationary], ["… running", SET.running], ["… sprinting", SET.sprint], ["lab sections (stop · free turns)", EXTRA.concat(/^TURN/.test(q.get("case") || "") && !EXTRA.includes(q.get("case")) ? [q.get("case")] : [])]];
  sel.innerHTML = groups.map(([g, ids]) => `<optgroup label="${g}">` + ids.map((id) => `<option value="${id}">${id}</option>`).join("") + "</optgroup>").join(""); sel.value = q.get("case") || "CUT90";
  const ss = document.getElementById("selStyle"); ss.innerHTML = Object.entries(STYLES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join(""); ss.value = q.get("style") || "NEUTRAL"; ss.onchange = (e) => go({ style: e.target.value });
  const sf = document.getElementById("selFoot"); sf.value = q.get("foot") || ""; sf.onchange = (e) => go({ foot: e.target.value || null });
  const sp2 = document.getElementById("selPreset"); sp2.onchange = (e) => { const v = e.target.value.split("/"); if (v.length === 3) go({ b: v[0], d: v[1], a: v[2] }); };
  const go = (o) => { const u = new URL(location.href); for (const [k, v] of Object.entries(o)) { if (v == null) u.searchParams.delete(k); else u.searchParams.set(k, v); } location.href = u.toString(); };
  sel.onchange = (e) => go({ case: e.target.value });
  // the lab's free turn: any angle (0 – 180°) at any running speed, either side — TURN<deg>[_L]_V<m/s>
  const tm = /^TURN(\d+)(_L)?_V([\d.]+)/.exec(q.get("case") || ""), iT = document.getElementById("inTurn"), iV = document.getElementById("inV"), iS = document.getElementById("selSide");
  iT.value = tm ? tm[1] : 90; iV.value = tm ? tm[3] : 5.5; iS.value = tm && tm[2] ? "L" : "R";
  document.getElementById("bTurn").onclick = () => go({ case: `TURN${Math.round(Math.max(0, Math.min(180, +iT.value)))}${iS.value === "L" ? "_L" : ""}_V${Math.max(1, Math.min(9, +iV.value))}` });
  for (const [k, id] of [["b", "selB"], ["d", "selD"], ["a", "selA"]]) { const s = document.getElementById(id); s.innerHTML = Array.from({ length: 99 }, (_, i) => 99 - i).map((v) => `<option value="${v}">${v}</option>`).join(""); s.value = q.get(k) || "99"; s.onchange = (e) => go({ [k]: e.target.value }); }
  const sp = document.getElementById("selPipe"); sp.value = q.get("compare") === "1" ? "compare" : q.get("compare") === "re1" ? "re1" : (q.get("pipe") || "NEW"); sp.onchange = (e) => go(e.target.value === "compare" ? { compare: "1", pipe: null } : e.target.value === "re1" ? { compare: "re1", pipe: null } : { compare: null, pipe: e.target.value });
  const sv = document.getElementById("selView"); sv.value = q.get("single") || ""; sv.onchange = (e) => go({ single: e.target.value || null });
  const sb = document.getElementById("selBody"); if (sb) { sb.value = q.get("cmp") === "body" ? "cmp" : (q.get("body") || "tc11"); sb.onchange = (e) => go(e.target.value === "cmp" ? { cmp: "body", body: null } : { cmp: null, body: e.target.value }); }
  document.querySelectorAll("[data-rate]").forEach(b => { b.classList.toggle("on", +b.dataset.rate === Vv.rate); b.onclick = () => { Vv.rate = +b.dataset.rate; document.querySelectorAll("[data-rate]").forEach(x => x.classList.toggle("on", x === b)); }; });
  const bp = document.getElementById("bPlay"); bp.onclick = () => { Vv.playing = !Vv.playing; bp.textContent = Vv.playing ? "❚❚ Pause" : "▶ Play"; };
  window.addEventListener("keydown", (e) => { if (e.key === " ") { Vv.playing = !Vv.playing; e.preventDefault(); } if (e.key === ".") { Vv.playing = false; Vv.t += 1 / 60; } if (e.key === ",") { Vv.playing = false; Vv.t = Math.max(0, Vv.t - 1 / 60); } if (e.key === "r") Vv.t = 0; });
  const ent = await W.ofCharLoad(q.get("char") || "vinicius"); Vv.ent = ent;
  await simulate(ent); Vv.ready = true; if (q.get("t")) Vv.t = +q.get("t"); if (q.get("paused") === "1") Vv.playing = false;
  if (q.get("external") === "1") { Vv.external = true; render(); hud(); } else requestAnimationFrame(frame);
}
W.D1V = { state: Vv, set(t, o) { if (o) Object.assign(Vv, o); Vv.t = t; render(); hud(); return true; }, summary() { return Vv.sims.map((s) => ({ pipe: s.pipe, hash: s.hash, contacts: s.contacts.list, sepMax: sepMax(s), sum: s.S.rc2 && s.S.rc2.kind === "ELITE" ? s.S.summary2() : null })); }, ready: () => Vv.ready,
  firstContact() { const s = Vv.sims.find((x) => x.pipe === "NEW") || Vv.sims[0]; return s.contacts.k1 != null ? s.contacts.k1 * DT : null; },
  // every contact of the (last) NEW simulation: its page time, foot and surface (the feet strips are shot around each)
  contacts() { const s = Vv.sims.filter((x) => x.pipe === "NEW").pop() || Vv.sims[0], ep = s.S.rc2 && s.S.rc2.ep; const sur = new Map(ep ? ep.contacts.map((c) => [c.k, c.surface]) : []);
    return s.contacts.list.filter((c) => c.recv).map((c) => ({ t: c.k * DT, n: c.n, F: c.F, surface: sur.get(c.k) || c.reg, rel: c.t })); } };
 boot().catch((err) => { const h = document.getElementById("hud"); if (h) h.textContent = "TECHNICAL-CONTROL-1.1 feet lab failed: " + (err && err.stack || err); console.error(err); });
