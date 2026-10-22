// ═══ phys1/ (PHYSICAL RATINGS V1, a copy of ballon1/) — phys1.html sets window.PHYS: THE BALL-OFF PHYSICAL-ATTRIBUTE PLAYGROUND — the switch
// PHYSICAL-99 / PHYSICAL-80-A / -B / -C (Sprint Speed · Acceleration · Agility as ratings, ratings.js; A / B / C = the Agility scaling candidate
// only), the other (99 ⇄ 80) as the reference runner on the same input, ⇄ N the same input through the next, the ratings readout (vmax, the
// acceleration capability and % vmax, the agility scale, the redirection demand, the momentum retained, the new-line establishment time), the
// owner's tests (s_tests.js PHYS_TESTS); ⚙ a custom rating set. Never the ball here: Dribbling is not calibrated. LOCAL ONLY ═══════════════════
// ═══ ballon1/ (a copy of speed99/; BALL-ON PACE V1) — speed99/u_viewer.js — SPEED-99-V1 (owner, 21 Oct): THE BALL-OFF PACE PLAYGROUND — LOCAL ONLY (a real player's model) ═══════════════════════
// TC-CONTROLLED-1's page with the PACE switch (SPRINT SPEED + ACCELERATION 99: CURRENT = TC-CONTROLLED-1's movement exactly · candidates A / B /
// C, pace.js), a REFERENCE runner (a second simulation on the same input, 2.5 m to the side, drawn as a second player — BALL OFF only), the pace
// presets (s_tests.js), and a live pace panel: speed, top speed, distance and the 5 / 10 / 20 / 30 / 40 / 60 m splits of the run (from the moment
// the stick is pushed from rest, or SPRINT pressed), the reference's beside it. ⇄ N: this session's input through the next pace. BALL defaults OFF
// (the ball-on integration, CONTROLLED-99-PACE, comes after the owner chooses the ceiling); the ball model / poke / release sit behind ⚙.
// ── (TC-CONTROLLED-1's header) ── tc_controlled1/u_viewer.js — TC-CONTROLLED-1 (owner, 21 Oct: "zero unforced loss at 99"): TC-UNIFIED-1's page with the BALL CONTROL MODEL
// switch — CURRENT FREE (TC-UNIFIED-1's FULL, bit-identical) / CONTROLLED (CONTROLLED_BALL: c_sim.js) — same player, same C, same joystick, same
// B4 / B5, same support; ⇄ M plays this session's input through the other model. OPPONENT POKE drives a deterministic opponent foot into the real
// ball (recorded as an event — replays exactly); RELEASE turns the next touch into a knock-on (an intentional release). Diagnostics (⚙) show the
// possession state, the controlled action, the ball's phase, the next planned contact, support / technical foot, committed, threat / fallback and
// the reason the last CONTROLLED_BALL ended.
// ── (TC-UNIFIED-1's header) ── tc_unified1/u_viewer.js — TC-UNIFIED-1: THE PRIMARY MORNING PAGE (owner's overnight brief §26 – 29) — LOCAL ONLY (a real player's model) ════════
// One clean playable page: BC99 / D99 / A99-C, the FULL stack (88573ef0 + A99-C + the persistent support + B4 + B5), BALL ON, the joystick — open
// it and dribble. The stack presets A · A + C · A + C + SUPPORT · A + C + SUPPORT + B4 · FULL stay in view (same input → next: X); the owner's
// morning playtest cases and the favourable named-move / generic examples launch from one menu; BALL OFF = Astra's movement probe. Everything
// diagnostic (the layer toggles, attributes, panels, body warnings, performance) behind ⚙. The simulation is u_sim.js (UnifiedSim).
// ── (TC-LAYERED-2's header) ── THE B4 + B5 PLAYGROUND on BASELINE-88573ef0 (TC-LAYERED-1's page, continued)
// The candidate stack A · A + B4 · A + B5 · A + B4 + B5 · (+ B2) as presets; the rejected layers (B1, B3, B6) as toggles, off; the HUD names the
// SELECTED SOLUTION, why it won, the nearest alternative, the predicted contact time and exit (B4's predicted outcome); the owner's playtest list
// and the named-move scenarios as stick tests.
// ── (TC-LAYERED-1's header) ──
// The baseline's page with: the ENGINE (the layered copy with its toggles, or the LOCKED 88573ef0 engine itself, imported read-only); the LAYER
// toggles and the cumulative PRESETS (A = all off = exact 88573ef0 … ALL); SAME INPUT → a configuration (this session's recorded input re-simulated
// through it and replayed; ⇄ / X steps it along the chain A → B1 → B2 → B3 → B4 → B5 → ALL); the owner's required TESTS played through the stick;
// the BODY WARNINGS (§17: pelvis ↔ root, the contact foot ↔ the ball, support slides, unsupported travel, the body pulled after a planted foot, leg
// intersections) — shown for visual review, never acted on.
// ── (88573ef0's header, unchanged) ── tc_playtest1/pt_viewer.js — TECHNICAL-CONTROL PLAYTEST-1: THE PLAYABLE DRIBBLING SANDBOX (owner: "I can open the browser, use WASD to freely
// walk / run / sprint with the ball … It should feel like I am controlling an elite footballer with the ball") — LOCAL ONLY (a real player's model) ═
// The page runs the authoritative simulation (pt_sim.js: the request → the resolver → the plan → the kernel ball) in real time at 240 Hz and draws
// the presentation (pt_body.js) on top; nothing the page draws feeds back. WASD is a desired movement DIRECTION in the camera's frame, latched when
// the key combination changes (the camera turning under a held key never turns the request); Shift = sprint, Alt / Option = walk, 1 – 4 the base
// mode. No skill button. Replay: the last 12 s are history (plans, contacts, the ball's track, every tick's input) — any recent instant is re-posed
// from it; the WASD actually pressed is shown. Determinism: V re-simulates the whole session from the recorded input on a fresh simulation.
// (The GL ground / ball programs and the camera math: TECHNICAL-CONTROL-1.5's lab, copied; the pitch gets a 1 m / 5 m grid.)
import * as TL from "./c_sim.js";
import { PlayBody as TLBody } from "./u_body.js";
import * as BS from "../tc_baseline_88573ef0/pt_sim.js";
import * as BB from "../tc_baseline_88573ef0/pt_body.js";
import { TESTS as OWNER_TESTS, MORNING, MODES as TMODES } from "./u_tests.js";
import { PACE, PACE_IDS, PACE_MAIN } from "./pace.js";
import { CARRY_ENV } from "./carry_env.js";
// (S99 MISSION: THE PRIMARY PAGE — s99.html sets window.S99_PRIMARY: it opens straight into the owner's 99 player (S99 38 km/h · Acceleration 99
// D38 · Agility 99 A99-C · D99 · BC99 · CONTROLLED_BALL · FULL · BALL ON · the joystick) with ONE pace switch, 99 PACE ⇄ CURRENT PACE, same input)
// (BALL-ON PACE V1: ballon1.html sets window.BALLON too — the switch BALL OFF / CARRY-A / CARRY-B / CARRY-C, the same player BALL OFF as the
// reference runner on the same input, the envelope's readout)
import * as RATINGS from "./ratings.js";
const PHYS = !!window.PHYS, { PHYS_PRESETS, PHYS_IDS } = RATINGS, physOf = (id) => Object.assign({ id }, PHYS_PRESETS[id]);
const physName = (p) => (p ? (p.id && p.id !== "CUSTOM" ? p.id : `CUSTOM S${p.sprint} / Acc${p.accel} / A${p.agility}-${p.agiScale}`) : "—");
// (DRIBBLING VOCAB-1: vocab1_lab.html sets window.LAB — THE DRIBBLING LAB: the technique gallery by family, every card a deterministic curated
// replay (v_cases.js, run by v_run.js — the same code as node), PLAY at 1× in the gameplay camera, LOOP, 0.5× / 0.25×, frame step, scrub,
// cameras (gameplay · close side · front · rear · overhead), MIRROR and L | R side by side, AUTO (B4 decides from the same state) vs FORCE,
// REJECTED setups with their reasons, the CHAINS, diagnostics off by default, TRY IT LIVE. vocab1_sandbox.html sets window.VOCAB_SANDBOX: the
// joystick sandbox with the full vocabulary and the manual skill palette)
import { META, FAMILIES, META_BY_ID, intentOf } from "./v_meta.js";
import { CASES, CHAINS, caseKey } from "./v_cases.js";
import { caseOpts, runCaseOn, summarize } from "./v_run.js";
const LAB = !!window.LAB, SANDBOX = !!window.VOCAB_SANDBOX;
const BALLON = !!window.BALLON, CARRY_SW = ["OFF", "A", "B", "C"], carryName = (c) => (c === "OFF" ? "BALL OFF" : "CARRY-" + c);
const PRIMARY = !!window.S99_PRIMARY, PACE_SW = PRIMARY ? ["D38", "CURRENT"] : PACE_MAIN, PACE_NAME = (id) => (PRIMARY ? (id === "D38" ? "99 PACE" : id === "CURRENT" ? "CURRENT PACE" : id) : id);
import { PACE_TESTS, MISSION_TESTS, BALLON_TESTS, PHYS_TESTS } from "./s_tests.js";
const TESTS = (window.BALLON ? BALLON_TESTS.map((x) => Object.assign({ fam: "ballon" }, x)) : []).concat(window.S99_PRIMARY ? MISSION_TESTS.map((x) => Object.assign({ fam: "s99" }, x)) : []).concat(PACE_TESTS.map((x) => Object.assign({ fam: "pace" }, x)), MORNING, OWNER_TESTS);
if (window.PHYS) TESTS.unshift(...PHYS_TESTS.map((x) => Object.assign({ fam: "phys" }, x)));   // (PHYSICAL RATINGS V1: the owner's tests first)
const { DT, MODES, LABEL, wrap, dir, hdg, LAYERS, PRESETS, PRESET_LABEL, REJECTED, presetLayers, actionId } = TL;
const ENG = { layered: { Sim: TL.ControlledSim, Body: TLBody }, baseline: { Sim: BS.PlaySim, Body: BB.PlayBody } };
const CHAIN = ["A", "AC", "ACS", "ACS4", "FULL"];
import { DIRS } from "../technical_control15/tc15_ref.js";
import { STICK, stickVector, stickMode, headingFrom, stickAngleDeg, BITS } from "../tc_baseline_88573ef0/pt_input.js";
const W = window, hyp = Math.hypot, DEG = Math.PI / 180, max = Math.max, min = Math.min, abs = Math.abs;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const START = { P: [52.5, 34], h: 0 };
const V = { engine: "layered", layers: presetLayers("FULL"), ballOn: false, control: "CONTROLLED", pace: "C38", refPace: "CURRENT", ref: null, refBody: null, run: null, lastReq: null, test: null, diag: { prev: null, air: 0, hist: [] }, ready: false, paused: false, rate: 1, acc: 0, baseMode: "RUN", keys: new Set(), latch: { combo: "", h: 0 }, camId: "follow", cam: null, camH: 0,
  // the on-screen stick (input only): the source that last became active authors the movement — "keys" (a WASD key went down) or "stick"
  src: "keys", stick: { pid: null, raw: { x: 0, y: 0 }, v: { x: 0, y: 0, m: 0, r: 0 }, latch: 0, moving: false, cfg: Object.assign({}, STICK) }, btn: { sprint: false, walk: false, lock: false }, inStick: null, stickLog: [],
  show: { hud: true, side: false, prot: false, body: false, anim: true, diag: false }, course: null, replay: null, perf: { frame: [], sim: [], pose: [], render: [], work: [] }, lastNow: null, lastShown: null, dom: {}, verify: null };
// ── GL ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function persp(fyNdc, aspect, n, f) { const m = new Float32Array(16); m[0] = fyNdc / aspect; m[5] = fyNdc; m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n); return m; }
function lookAt(eye, at, up) { const fz = V3.norm(V3.sub(eye, at)), fx = V3.norm(V3.cross(fz, up)), fy = V3.cross(fx, fz), m = M4.ident();
  m[0] = fx[0]; m[4] = fx[1]; m[8] = fx[2]; m[1] = fy[0]; m[5] = fy[1]; m[9] = fy[2]; m[2] = fz[0]; m[6] = fz[1]; m[10] = fz[2]; m[12] = -V3.dot(fx, eye); m[13] = -V3.dot(fy, eye); m[14] = -V3.dot(fz, eye); return m; }
function shader(gl, t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
function groundProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec2 aXZ; uniform mat4 uView, uProj; out vec3 vW; void main(){ vW = vec3(aXZ.x, 0.0, aXZ.y); gl_Position = uProj * (uView * vec4(vW, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vW; uniform vec4 uSh[16]; uniform int uNSh; out vec4 o;
  float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float ring(vec2 p, vec2 c, float r, float w){ float d=abs(length(p-c)-r); float aa=max(fwidth(d),1e-4); return 1.-smoothstep(w*0.5-aa, w*0.5+aa, d); }
  float grid(vec2 p, float s, float w){ vec2 q = abs(fract(p / s + 0.5) - 0.5) * s; float d = min(q.x, q.y); float aa = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, d); }
  void main(){ vec2 p = vec2(vW.x, -vW.z); bool inP = p.x > -2.0 && p.x < 107.0 && p.y > -2.0 && p.y < 70.0; float stripe = mod(floor(p.x / 5.25), 2.0);
    vec3 g = mix(vec3(0.20, 0.42, 0.22), vec3(0.235, 0.475, 0.245), stripe); float n = fract(sin(dot(floor(p * 7.0), vec2(12.9898, 78.233))) * 43758.5453); g *= 0.97 + 0.06 * n; if (!inP) g = vec3(0.17, 0.33, 0.19) * (0.97 + 0.06 * n);
    float fade = 1.0 - smoothstep(0.05, 0.16, length(fwidth(p)));   // the 1 m lines fade where a pixel spans > 5 – 16 cm (far away)
    g = mix(g, g * 1.10 + 0.015, grid(p, 1.0, 0.018) * 0.55 * fade); g = mix(g, g * 1.22 + 0.03, grid(p, 5.0, 0.04) * 0.7);
    float w = 0.12, L = 0.0; L = max(L, seg(p, vec2(0,0), vec2(105,0), w)); L = max(L, seg(p, vec2(0,68), vec2(105,68), w)); L = max(L, seg(p, vec2(0,0), vec2(0,68), w)); L = max(L, seg(p, vec2(105,0), vec2(105,68), w));
    L = max(L, seg(p, vec2(52.5,0), vec2(52.5,68), w)); L = max(L, ring(p, vec2(52.5,34), 9.15, w)); L = max(L, ring(p, vec2(52.5,34), 0.15, 0.3));
    L = max(L, seg(p, vec2(0,13.84), vec2(16.5,13.84), w)); L = max(L, seg(p, vec2(16.5,13.84), vec2(16.5,54.16), w)); L = max(L, seg(p, vec2(0,54.16), vec2(16.5,54.16), w));
    L = max(L, seg(p, vec2(105,13.84), vec2(88.5,13.84), w)); L = max(L, seg(p, vec2(88.5,13.84), vec2(88.5,54.16), w)); L = max(L, seg(p, vec2(105,54.16), vec2(88.5,54.16), w));
    vec3 c = mix(g, vec3(0.93, 0.95, 0.92), L * 0.92); float sh = 0.0; for (int i = 0; i < 16; i++) { if (i >= uNSh) break; vec4 s = uSh[i]; vec2 d = (p - s.xy) / s.z; sh += s.w * exp(-dot(d, d)); }
    c *= 1.0 - min(0.6, sh); o = vec4(c, 1.0); }`;
  const p = program(gl, VS, FS), vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-200, 200, 320, 200, -200, -270, 320, -270]), gl.STATIC_DRAW); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.bindVertexArray(null);
  return { p, vao, u: { view: gl.getUniformLocation(p, "uView"), proj: gl.getUniformLocation(p, "uProj"), sh: gl.getUniformLocation(p, "uSh"), nsh: gl.getUniformLocation(p, "uNSh") } };
}
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
// a training cone (flat-shaded; visual only — never a physical obstacle)
function coneProg(gl) {
  const VS = `#version 300 es
  layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; uniform mat4 uView, uProj; uniform vec3 uOff; out vec3 vN; void main(){ vN = aN; gl_Position = uProj * (uView * vec4(aP + uOff, 1.0)); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vN; uniform vec3 uCol; out vec4 o; void main(){ float l = 0.5 + 0.5 * max(0.0, dot(normalize(vN), normalize(vec3(0.35, 0.9, 0.25)))); o = vec4(uCol * l, 1.0); }`;
  const p = program(gl, VS, FS), N = 18, r = 0.11, h = 0.30, v = [];
  for (let i = 0; i < N; i++) { const a0 = 2 * Math.PI * i / N, a1 = 2 * Math.PI * (i + 1) / N, nrm = (a) => { const k = r / h; const l = Math.hypot(1, k); return [Math.cos(a) / l, k / l, Math.sin(a) / l]; };
    v.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, ...nrm(a0), 0, h, 0, ...nrm((a0 + a1) / 2), Math.cos(a1) * r, 0, Math.sin(a1) * r, ...nrm(a1));
    v.push(Math.cos(a0) * r * 1.6, 0.004, Math.sin(a0) * r * 1.6, 0, 1, 0, 0, 0.004, 0, 0, 1, 0, Math.cos(a1) * r * 1.6, 0.004, Math.sin(a1) * r * 1.6, 0, 1, 0); }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12); gl.enableVertexAttribArray(1); gl.bindVertexArray(null);
  const U = (n) => gl.getUniformLocation(p, n); return { p, vao, n: v.length / 6, u: { view: U("uView"), proj: U("uProj"), off: U("uOff"), col: U("uCol") } };
}
const A3 = (p, h) => [p[0], h != null ? h : (p[2] || 0), -p[1]];   // pitch [x, y, h] → anim3d world [x, h, −y]
const QA = (q) => [-q[0], -q[1], q[2], q[3]];
// ── THE SIMULATION + THE BODY ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function newSim(o0) { const o = o0 ? JSON.parse(JSON.stringify(o0)) : { attrs: { bc: +V.dom.aBC.value, dri: +V.dom.aDRI.value, agi: +V.dom.aAGI.value }, foot: V.dom.selFoot.value, style: V.dom.selStyle.value, seed: 1, start: START };
  if (V.engine === "layered") { o.layers = Object.assign({}, V.layers); o.ballOn = V.ballOn; o.control = V.control; o.pace = V.pace; o.vocab = V.vocab; if (V.forceFam) o.forceFam = V.forceFam; else delete o.forceFam; if (BALLON && V.ballOn && V.carry && V.carry !== "OFF") o.carry = V.carry; else delete o.carry; if (PHYS) { o.ballOn = false; delete o.carry; o.phys = JSON.parse(JSON.stringify(V.phys)); } if (V.noFeint) o.noFeint = true; else delete o.noFeint; } else { delete o.layers; delete o.ballOn; delete o.control; delete o.pace; delete o.vocab; delete o.forceFam; delete o.phys; }
  V.sim = new ENG[V.engine].Sim(V.env, o); V.body = new ENG[V.engine].Body(V.env, V.sim);
  // (the REFERENCE runner: the same options and input with the reference pace, started 2.5 m to the side — BALL OFF, the unified engine only)
  V.ref = null; V.refBody = null; V.run = null; V.lastReq = null; V.redir = null; V.demandNow = 0;
  if (PHYS && V.engine === "layered" && V.refPhys) { const r = JSON.parse(JSON.stringify(o)), h0 = r.start.h; r.phys = refPhysOf(); r.start = { P: [r.start.P[0] + 2.5 * Math.sin(h0), r.start.P[1] - 2.5 * Math.cos(h0)], h: h0 }; V.ref = new ENG.layered.Sim(V.env, r); V.refBody = new ENG.layered.Body(V.env, V.ref); }
  else if (PHYS) {}
  else if (BALLON && V.engine === "layered" && V.ballOn && V.refBallOff) { const r = JSON.parse(JSON.stringify(o)), h0 = r.start.h; r.ballOn = false; delete r.carry; r.start = { P: [r.start.P[0] + 2.5 * Math.sin(h0), r.start.P[1] - 2.5 * Math.cos(h0)], h: h0 }; V.ref = new ENG.layered.Sim(V.env, r); V.refBody = new ENG.layered.Body(V.env, V.ref); }
  else if (V.engine === "layered" && !V.ballOn && V.refPace !== "off" && V.refPace !== V.pace) { const r = JSON.parse(JSON.stringify(o)), h0 = r.start.h; r.pace = V.refPace; r.start = { P: [r.start.P[0] + 2.5 * Math.sin(h0), r.start.P[1] - 2.5 * Math.cos(h0)], h: h0 }; V.ref = new ENG.layered.Sim(V.env, r); V.refBody = new ENG.layered.Body(V.env, V.ref); } V.o0 = JSON.parse(JSON.stringify(o)); V.stickLog = []; V.acc = 0; V.trail = []; V.cam = null; V.lastShown = null; V.replay = null; V.verify = null; V.diag = { prev: null, air: 0, hist: [] }; showReplayUI(false); showConfig(); }
// ── THE CONFIGURATION: the engine and the layers (the label: a preset's name when the toggles are exactly one, else the toggles listed) ──────────
function configName(eng, L) { if (eng === "baseline") return "locked 88573ef0"; for (const n of CHAIN) { const P = presetLayers(n); if (LAYERS.every((x) => !!P[x.id] === !!L[x.id])) return PRESET_LABEL[n]; } return "custom: " + LAYERS.filter((x) => L[x.id]).map((x) => x.id).join("+"); }
function showConfig() { const d = V.dom; if (!d.selEng) return; d.selEng.value = V.engine; const on = V.engine === "layered";
  for (const x of LAYERS) { const c = document.getElementById("L_" + x.id); if (c) { c.checked = !!V.layers[x.id]; c.disabled = !on; } }
  document.querySelectorAll("[data-preset]").forEach((b) => { const P = presetLayers(b.dataset.preset); b.classList.toggle("on", on && LAYERS.every((x) => !!P[x.id] === !!V.layers[x.id])); });
  d.ver.textContent = on ? `TC-CONTROLLED-1 · ${configName("layered", V.layers)}${V.ballOn ? "" : " · BALL OFF (Astra's probe)"}` : "LOCKED 88573ef0 engine"; d.ver.style.background = on ? "#ff9b8d" : "#8dffa6"; if (d.cBall) d.cBall.checked = V.ballOn;
  document.querySelectorAll("[data-model]").forEach((b) => b.classList.toggle("on", on && b.dataset.model === V.control));
  document.querySelectorAll("[data-pace]").forEach((b) => b.classList.toggle("on", on && b.dataset.pace === V.pace)); document.querySelectorAll("[data-vocab]").forEach((b) => b.classList.toggle("on", on && b.dataset.vocab === (V.vocab || "CORE"))); document.querySelectorAll("[data-carry]").forEach((b) => b.classList.toggle("on", on && b.dataset.carry === (V.ballOn ? V.carry : "OFF"))); if (d.cRefOff) d.cRefOff.checked = !!V.refBallOff; document.querySelectorAll("[data-phys]").forEach((b) => b.classList.toggle("on", on && !!V.phys && b.dataset.phys === V.phys.id)); if (d.cRefPhys) d.cRefPhys.checked = !!V.refPhys; if (d.selForce) d.selForce.value = V.forceFam || ""; if (d.selRef) d.selRef.value = V.refPace;
  if (on) { const pr = PACE[V.pace] || PACE.CURRENT; d.ver.textContent = (LAB || SANDBOX) ? `DRIBBLING VOCAB-1 · ${LAB ? "THE DRIBBLING LAB" : "THE JOYSTICK SANDBOX"} · S99 · D38 · A99-C (Agility scale B below 99) · D99 · BC99 · CARRY-B · CONTROLLED · EXPANDED + the library${V.sim && V.sim.o && V.sim.o.foot === "L" ? " · left-footed" : ""}` : PHYS ? physTitle() : BALLON ? `BALL-ON PACE V1 · S99 38 km/h · D38 · A99-C · D99 · BC99 · ${V.ballOn ? "CONTROLLED · BALL ON · " + carryName(V.carry) + (CARRY_ENV[V.carry] ? " — " + CARRY_ENV[V.carry].label.slice(CARRY_ENV[V.carry].label.indexOf("· ") + 2) : "") : "BALL OFF (the physical capability)"} · ${V.vocab === "EXPANDED" ? "EXPANDED" : "CORE"} techniques${V.forceFam ? " · REVIEW: " + V.forceFam + " forced" : ""}` : PRIMARY ? `S99 · ${pr.id === "D38" ? "99 PACE: Sprint 99 = 38 km/h · Acceleration 99 = D38 · Agility 99 = A99-C" : pr.id === "CURRENT" ? "CURRENT PACE (TC-CONTROLLED-1)" : pr.id} · D99 · BC99 · ${V.control === "CONTROLLED" ? "CONTROLLED_BALL" : "FREE ball"} · ${configName("layered", V.layers)} · ${V.vocab === "EXPANDED" ? "EXPANDED techniques" : "CORE techniques"}${V.forceFam ? " · REVIEW: " + V.forceFam + " forced" : ""}${V.ballOn ? " · BALL ON" : " · BALL OFF"}` : `SPEED-99-V1 · ${pr.id === "CURRENT" ? "CURRENT pace" : "candidate " + pr.id}${V.ballOn ? " · BALL ON (not yet adapted)" : " · BALL OFF"}`; d.ver.style.background = pr.color; } }
// re-simulate a recorded session (its input every tick, its live changes, the stick's record) through a configuration — identical input
function loadRec(rec, eng, layers, control, pace) { V.engine = eng; if (layers) V.layers = Object.assign({}, layers); const o0 = JSON.parse(JSON.stringify(rec.o0)); delete o0.layers; if (o0.ballOn != null) V.ballOn = o0.ballOn; if (control) V.control = control; else if (o0.control) V.control = o0.control; delete o0.control; if (pace) V.pace = pace; else if (o0.pace) V.pace = o0.pace; delete o0.pace; if (o0.vocab) V.vocab = o0.vocab; delete o0.vocab; if (BALLON) V.carry = o0.ballOn === false ? "OFF" : o0.carry || V.carry; delete o0.carry; if (PHYS && o0.phys) V.phys = o0.phys; delete o0.phys; V.forceFam = o0.forceFam || null; delete o0.forceFam; newSim(o0); const S = V.sim, I = rec.input, E = rec.events || [], L = rec.stick || []; let ei = 0;
  for (let k = 0; k < I.length / 3; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") S.setAttrs(e.v); else if (e.kind === "foot") S.setFoot(e.v); else if (S.applyEvent) S.applyEvent(e); }
    const h = I[3 * k], rq = { h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }; S.step(rq); if (V.ref) V.ref.step(rq); trackRun(rq); V.stickLog.push(L[4 * k] || 0, L[4 * k + 1] || 0, L[4 * k + 2] || 0, L[4 * k + 3] || 0); }
  V.paused = true; setRateButtons(); if (V.body.feetAt) for (let k = Math.max(0, S.k - Math.round(12.5 / DT)); k <= S.k; k++) V.body.feetAt(k * DT); return { t: S.t, hash: S.hash }; }
// SAME INPUT → a configuration ("baseline" = the locked engine; else a preset name): the recorded session through it, then its replay (same window)
function sameInput(target) { if (V.sim.k < 10) return; stopTest(); const rec = W.PT.record(), tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer";
  V.dom.bSame.textContent = "re-simulating…"; setTimeout(() => { if (target === "baseline") loadRec(rec, "baseline", null); else loadRec(rec, "layered", presetLayers(target)); startReplay(kind); if (tRep != null && V.replay) V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); V.dom.bSame.textContent = "▶ replay through it"; V.dom.selSame.value = target; }, 20); }
function otherModel() { if (V.sim.k < 10 || V.engine !== "layered") return; stopTest(); const rec = W.PT.record(), tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer", target = V.control === "CONTROLLED" ? "FREE" : "CONTROLLED";
  setTimeout(() => { loadRec(rec, "layered", V.layers, target); startReplay(kind); if (tRep != null && V.replay) V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); }, 20); }
// SAME INPUT → THE NEXT PACE (N): this session's recorded input re-simulated with the next candidate, then its replay (same window)
function nextPace() { if (V.sim.k < 10 || V.engine !== "layered") return; stopTest(); const rec = W.PT.record(), tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer", L = PACE_SW, target = L[(L.indexOf(V.pace) + 1) % L.length];
  setTimeout(() => { loadRec(rec, "layered", V.layers, null, target); startReplay(kind); if (tRep != null && V.replay) V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); }, 20); }
// (S99 MISSION: the same input through the other technique vocabulary — CORE ⇄ EXPANDED — then its replay, same window)
function otherVocab() { if (V.sim.k < 10 || V.engine !== "layered") return; stopTest(); const rec = W.PT.record(), tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer"; rec.o0 = Object.assign({}, rec.o0, { vocab: V.vocab === "EXPANDED" ? "CORE" : "EXPANDED" });
  setTimeout(() => { loadRec(rec, "layered", V.layers, null, null); startReplay(kind); if (tRep != null && V.replay) V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); }, 20); }
// (BALL-ON PACE V1: the same input through the next of BALL OFF → CARRY-A → CARRY-B → CARRY-C, then its replay, same window)
function nextCarry() { if (V.sim.k < 10 || V.engine !== "layered") return; stopTest(); const rec = W.PT.record(), tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer", cur = V.ballOn ? V.carry : "OFF", target = CARRY_SW[(CARRY_SW.indexOf(cur) + 1) % CARRY_SW.length];
  rec.o0 = Object.assign({}, rec.o0, { ballOn: target !== "OFF", carry: target !== "OFF" ? target : undefined });
  setTimeout(() => { loadRec(rec, "layered", V.layers, null, null); startReplay(kind); if (tRep != null && V.replay) V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); }, 20); }
function setCarry(c) { V.carry = c; V.ballOn = c !== "OFF"; stopTest(); newSim(); }
// (PHYSICAL RATINGS V1: the switch, the same input through the next of PHYSICAL-99 → 80-A → 80-B → 80-C (then its replay, same window), the
// reference runner — the other: PHYSICAL-99 beside an 80, the last-played PHYSICAL-80 scale beside the 99)
function setPhys(id) { V.phys = physOf(id); if (id !== "PHYSICAL-99") V.lastScale = V.phys.agiScale; stopTest(); newSim(); }
function refPhysOf() { return V.phys && V.phys.id === "PHYSICAL-99" ? physOf("PHYSICAL-80-" + (V.lastScale || "B")) : physOf("PHYSICAL-99"); }
function nextPhys() { if (V.sim.k < 10 || V.engine !== "layered") return; stopTest(); const rec = W.PT.record(), tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer", cur = V.phys ? V.phys.id : null, target = PHYS_IDS[(PHYS_IDS.indexOf(cur) + 1) % PHYS_IDS.length];
  rec.o0 = Object.assign({}, rec.o0, { phys: physOf(target) }); if (target !== "PHYSICAL-99") V.lastScale = PHYS_PRESETS[target].agiScale;
  setTimeout(() => { loadRec(rec, "layered", V.layers, null, null); startReplay(kind); if (tRep != null && V.replay) V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); }, 20); }
function physTitle() { const p = V.phys; if (!p) return "PHYSICAL RATINGS V1"; return `PHYSICAL RATINGS V1 · ${physName(p)} · Sprint Speed ${p.sprint} (${RATINGS.sprintKmh(p.sprint).toFixed(1)} km/h) · Acceleration ${p.accel} (${(RATINGS.accCapability(p.accel) * 100).toFixed(1)} %) · Agility ${p.agility}${p.agility === 99 ? " (A99-C)" : " · scale " + p.agiScale + " (" + (RATINGS.agiCapability(p.agility, p.agiScale) * 100).toFixed(1) + " %)"} · BALL OFF`; }
const motionNow = (S, t) => { const P = S.planAt(t), L = (P && P.am) || []; let m = null; for (const x of L) if (x.t <= t + 1e-9) m = x.m; return m; };
// (the last REDIRECTION: opened when the request leaves the travel by ≥ 15° above 1 m/s — its entry speed, the largest angle asked, the peak
// redirection demand (the movement's own, per motion), the lowest speed; ESTABLISHED when the travel holds the request within 5° above 1 m/s:
// the time and the speed then — the momentum retained, before Acceleration rebuilds it)
function trackRedir(req) { const S = V.sim, st = S.stateAt(S.t), m = motionNow(S, S.t), R = V.redir; V.demandNow = m ? m.demand || 0 : 0;
  if (req.h == null) { if (R && R.est == null) R.open = false; return; }
  const err = abs(wrap(req.h - st.h)) / DEG, fresh = !R || R.est != null || !R.open || abs(wrap(req.h - R.target)) / DEG > 30;
  if (fresh && err >= 15 && st.s > 1) { V.redir = { t0: S.t, s0: V.prevS != null ? V.prevS : st.s, angle: err, target: req.h, demand: m ? m.demand || 0 : 0, vMin: st.s, est: null, vEst: null, open: true }; return; }
  if (R && R.est == null && R.open) { R.target = req.h; R.angle = max(R.angle, err); R.vMin = min(R.vMin, st.s); if (m) R.demand = max(R.demand, m.demand || 0); if (err < 5 && st.s > 1) { R.est = S.t - R.t0; R.vEst = st.s; } } }
const MS_CACHE = new Map(); function physMilestones(p) { const k = `${p.sprint}/${p.accel}`; if (!MS_CACHE.has(k)) { const A = RATINGS.accProfile(p.accel), v = RATINGS.sprintMs(p.sprint); MS_CACHE.set(k, RATINGS.milestoneTimes(RATINGS.curveOf(A.a0, A.p, A.aEnd, v), v)); } return MS_CACHE.get(k); }
function nextInChain() { const cur = V.engine === "baseline" ? -1 : CHAIN.findIndex((n) => { const P = presetLayers(n); return LAYERS.every((x) => !!P[x.id] === !!V.layers[x.id]); }); sameInput(CHAIN[(cur + 1) % CHAIN.length]); }
// THE OPPONENT POKE: a deterministic opponent foot aimed at the ball as it will be in 0.25 s, from alternate sides of its travel (recorded event)
let pokeN = 0; function poke() { const S = V.sim; if (!S.addOpponent || V.replay) return; S.addOpponent(S.pokeProbe(pokeN++ % 2 ? 1 : -1, 8)); }
// THE OWNER'S TESTS through the page's own stick (reset first: the same run-up as the report card's)
function startTest(name) { const T = TESTS.find((x) => x.name === name); if (!T) return; if (V.replay) stopReplay(); if (V.dom.selTest) V.dom.selTest.value = name; if (T.force !== undefined) { V.forceFam = T.force; if (T.force) V.vocab = "EXPANDED"; } if (PRIMARY) setLock(false); newSim(); if (T.cam && (T.cam !== "pair" || V.ref)) { V.camId = T.cam; if (V.dom.selCam) V.dom.selCam.value = T.cam; V.cam = null; V.lastShown = null; } V.paused = false; setRateButtons(); V.test = { T, M: TMODES[T.mode] }; V.course = T.course && !T.courseAt ? makeCourse(T.course) : null; if (V.dom.selCourse) V.dom.selCourse.value = V.course ? V.course.id : "none"; V.src = "stick"; V.stick.moving = false; V.dom.bTest.textContent = "■ stop"; }
function stopTest() { if (!V.test) return; V.test = null; V.btn.tSprint = false; const S = V.stick; S.pid = null; S.raw = { x: 0, y: 0 }; S.v = stickVector(0, 0, S.cfg.deadzone); drawStick(); if (V.dom.bTest) V.dom.bTest.textContent = "▶ play"; }
// the request (pt_input.js): from the keys held — a direction in the camera frame latched when the combination changed, the base mode — or from
// the stick when it is the active source — its continuous direction in the camera frame latched when it left its deadzone, its zone's mode; Shift
// or the SPRINT button = sprint, Alt or the WALK button = walk, for both. One source at a time — never the two added
function request() {
  if (V.test) { const T = V.test, tt = V.sim.t; if (tt > T.T.dur || V.src !== "stick") stopTest(); else { const M = T.T.m ? TMODES[T.T.m(tt)] : T.M, fa = T.T.f(tt), a = (fa ?? 0) * DEG, r = fa === null ? 0 : M.r; V.stick.pid = -3; V.stick.raw = { x: Math.sin(a) * r, y: Math.cos(a) * r }; V.stick.v = stickVector(V.stick.raw.x, V.stick.raw.y, V.stick.cfg.deadzone); V.btn.tSprint = !!M.sprint; if (tt < 0.2) V.stick.v = stickVector(0, 0, V.stick.cfg.deadzone); } }
  const K = V.keys, w = K.has("KeyW"), a = K.has("KeyA"), s = K.has("KeyS"), d = K.has("KeyD"), shK = K.has("ShiftLeft") || K.has("ShiftRight"), altK = K.has("AltLeft") || K.has("AltRight");
  const sh = shK || V.btn.sprint || V.btn.lock || V.btn.tSprint, alt = altK || V.btn.walk, S = V.stick, useStick = V.src === "stick";
  const combo = (w ? "W" : "") + (a ? "A" : "") + (s ? "S" : "") + (d ? "D" : ""); if (combo !== V.latch.combo) { V.latch.combo = combo; V.latch.h = V.camH; }
  const bits = (w ? BITS.W : 0) | (a ? BITS.A : 0) | (s ? BITS.S : 0) | (d ? BITS.D : 0) | (shK ? BITS.SHIFT : 0) | (altK ? BITS.ALT : 0) | (useStick ? BITS.STICK : 0) | (V.btn.sprint || V.btn.lock || V.btn.tSprint ? BITS.SPRINT_BTN : 0) | (V.btn.walk ? BITS.WALK_BTN : 0);
  // (S99 MISSION, the primary page: a PRESET's stick frame is the player's own start heading, not the camera's — after another preset the camera
  // can still be turning when the stick leaves its deadzone, and the same preset then played a different state than node's)
  if (useStick) { const v = S.v; if (v.m > 0 && !S.moving) S.latch = PRIMARY && V.test && V.o0 && V.o0.start ? V.o0.start.h : V.camH; S.moving = v.m > 0; V.inStick = v;
    return { h: v.m > 0 ? headingFrom(S.latch, v.x, v.y) : null, mode: sh ? "SPRINT" : alt ? "WALK" : v.m > 0 ? stickMode(v.r, S.cfg) : V.baseMode, keys: bits }; }
  V.inStick = null; S.moving = false;
  const f = (w ? 1 : 0) - (s ? 1 : 0), r = (d ? 1 : 0) - (a ? 1 : 0);
  return { h: headingFrom(V.latch.h, r, f), mode: sh ? "SPRINT" : alt ? "WALK" : V.baseMode, keys: bits };
}
// one simulation tick with the request, and the stick's record for it (raw displacement, the analog vector — the replay shows what was held)
function stepSim(req) { V.sim.step(req); if (V.ref) V.ref.step(req); trackRun(req); if (V.test && V.test.T.courseAt && !V.test.courseDone && V.sim.t >= V.test.T.courseAt) { V.course = makeCourse(V.test.T.course); V.test.courseDone = true; } const S = V.stick, on = !!(req.keys & BITS.STICK); V.stickLog.push(on ? S.raw.x : 0, on ? S.raw.y : 0, on ? S.v.x : 0, on ? S.v.y : 0); }
// ── THE RUN being measured (the pace panel): it starts when the stick is pushed from rest, or SPRINT is pressed with the stick pushed — the
// path length since then, the time and speed at 5 / 10 / 20 / 30 / 40 / 60 m, the top speed; the reference runner's beside it (same input)
const MARKS = [5, 10, 20, 30, 40, 60, 80], TOP_NAME = "TOP SPEED RUN · standing → straight full sprint (80 m)", BOOM_NAME = "EXPLOSION TEST · the first 15 m (close camera)";
function runOf(S, prev) { const st = S.stateAt(S.t); return { t0: S.t - DT, P: S.stateAt(Math.max(0, S.t - DT)).P.slice(), d: 0, entry: prev ? prev.s : st.s, splits: {}, vmax: 0 }; }
function adv(R, S) { const st = S.stateAt(S.t), V0 = S.P.speed.SPRINT; R.d += hyp(st.P[0] - R.P[0], st.P[1] - R.P[1]); R.P = st.P.slice(); R.vmax = max(R.vmax, st.s); R.s = st.s; R.t = S.t - R.t0; for (const m of MARKS) if (R.splits[m] == null && R.d >= m) R.splits[m] = { t: R.t, v: st.s };
  R.pct = R.pct || {}; for (const f of [90, 95, 99]) if (R.pct[f] == null && st.s >= f / 100 * V0 - 1e-9) R.pct[f] = { t: R.t, d: R.d }; }
function trackRun(req) { const L = V.lastReq, S = V.sim; V.lastReq = req; if (V.engine !== "layered") return; const v0 = S.stateAt(Math.max(0, S.t - DT)).s; if (PHYS) { trackRedir(req); V.prevS = S.stateAt(S.t).s; }
  if (req.mode !== "SPRINT" || req.h == null) V.noSprint = (V.noSprint || 0) + DT; const ns = V.noSprint || 0; if (req.mode === "SPRINT" && req.h != null) V.noSprint = 0;
  // (a new run: pushed from rest, or SPRINT pressed after ≥ 0.1 s without it — never a one-tick flicker)
  const start = !V.run || (req.h != null && (!L || L.h == null) && v0 < 0.3) || (req.h != null && req.mode === "SPRINT" && L && (L.mode !== "SPRINT" || L.h == null) && ns >= 0.1 - 1e-9);
  if (start) { V.run = runOf(S, { s: S.stateAt(Math.max(0, S.t - DT)).s }); V.run.ref = V.ref ? runOf(V.ref, { s: V.ref.stateAt(Math.max(0, V.ref.t - DT)).s }) : null; V.run.from = req.mode; }
  adv(V.run, S); if (V.run.ref && V.ref) adv(V.run.ref, V.ref); }
function paceBox(h) { const d = V.dom.pacebox; if (!d) return; if (V.engine !== "layered") { d.classList.add("hidden"); return; } d.classList.remove("hidden");
  const S = V.sim, st = h ? h.st : S.stateAt(S.t), pr = PACE[V.pace] || PACE.CURRENT, R0 = V.run, vmax = S.P.speed.SPRINT, mode = h ? h.mode : "RUN", moving = h && h.reqH != null, req = moving ? S.P.speed[mode] : 0;
  const src = V.replay ? (h && h.keys & BITS.SPRINT_BTN ? "SPRINT (recorded)" : null) : sprintSrc(), kmh = (v) => (v * 3.6).toFixed(1), sp = (R) => MARKS.map((m) => `${m} m ${R && R.splits[m] ? R.splits[m].t.toFixed(2) : "  — "}`).join(" · ");
  const tiers = ["WALK", "JOG", "RUN", "SPRINT"].map((m) => (m === mode && moving ? `<b style="color:#ffd45e">[${m} ${S.P.speed[m].toFixed(2)}]</b>` : `${m} ${S.P.speed[m].toFixed(2)}`)).join(" · ");
  let html = `<span class="lab2">CURRENT SPEED</span> <span class="big">${st.s.toFixed(2)} m/s · ${kmh(st.s)} km/h</span>\n` +
    `<span class="lab2">REQUESTED SPEED</span> ${req.toFixed(2)} m/s   <span class="lab2">MOVEMENT MODE</span> <b style="color:${mode === "SPRINT" && moving ? "#ff8a3d" : "#e6efe9"}">${moving ? mode : "— (stick released)"}</b>   <span class="lab2">SPRINT INPUT</span> ${src ? `<b style="color:#ff8a3d">ON · ${src}</b>` : `<b style="color:#8fa49a">OFF</b>`}\n` +
    `<span class="lab2">CANDIDATE VMAX</span> <span style="color:${pr.color};font-weight:700">${vmax.toFixed(2)} m/s · ${kmh(vmax)} km/h</span>  ${pr.label}\n<span style="color:#8fa49a">tiers (m/s): ${tiers}</span>\n<span style="color:#8fa49a">the stick: walk < 40 % · jog < 72 % · run beyond · SPRINT = hold SPRINT / Shift · or SPRINT LOCK (= Mode SPRINT, key 4)</span>\n`;
  if (BALLON) { const C = h && V.replay && S.ctlAt ? S.ctlAt(h.t) : S.ctl && S.P.ballEnv && S.ctl.vA != null ? [0, S.ctl.D, S.ctl.raw, S.ctl.O, S.ctl.vA, S.ctl.mul, S.ctl.aPhys, S.ctl.aBall, S.ctl.type, S.ctl.m] : null, pr2 = S.P.pace, a0 = pr2 ? (pr2.a0 != null ? pr2.a0 : pr2.vmax / pr2.tau) : 0;
    const bar = (x, col) => `<span style="display:inline-block;width:120px;height:9px;background:#26302b;vertical-align:middle;border-radius:3px"><span style="display:block;width:${Math.round(120 * Math.max(0, Math.min(1, x)))}px;height:9px;background:${col};border-radius:3px"></span></span>`;
    html = `<span class="lab2">CURRENT SPEED</span> <span class="big">${st.s.toFixed(2)} m/s · ${kmh(st.s)} km/h</span>
` +
      `<span class="lab2">PHYSICAL VMAX</span> ${vmax.toFixed(2)} m/s · ${kmh(vmax)} km/h (S99) · <span class="lab2">PHYSICAL ACCELERATION</span> D38 · launch ${a0.toFixed(1)} m/s² · p ${pr2 ? pr2.p : "—"} · now ${C ? C[6].toFixed(2) : "—"} m/s²
`;
    if (!V.ballOn) html += `<b style="color:#9ad7ff">BALL OFF</b> — the full physical capability (no envelope)
`;
    else if (C) { const env = CARRY_ENV[V.carry]; html += `<span class="lab2">BALL-ON AVAILABLE VMAX</span> <span style="color:${env.color};font-weight:700;font-size:15px">${C[4].toFixed(2)} m/s · ${kmh(C[4])} km/h</span> (${(C[4] / vmax * 100).toFixed(1)} % of physical) · <b>${C[8]}</b>
` +
      `<span class="lab2">BALL-ON ACCELERATION</span> push available ${((C[9] != null ? C[9] : 1) * 100).toFixed(0)} % of D38's ${bar(C[9] != null ? C[9] : 1, env.color)} · now ${C[7].toFixed(2)} m/s² (${(C[5] * 100).toFixed(0)} % of the physical ${C[6].toFixed(2)} at this speed; 0 at the available vmax)
` +
      `<span class="lab2">CONTROL DEMAND</span> ${C[1].toFixed(2)} (instant ${C[2].toFixed(2)}) ${bar(C[1], "#ff8a80")}  <span class="lab2">RUNNING TO THE BALL</span> ${C[3].toFixed(2)}
<span style="color:#8fa49a">${env.label} · open ${(env.open * 100).toFixed(1)} % · tight ${(env.tight * 100).toFixed(0)} % · knock-on ${(env.knock * 100).toFixed(0)} % · per-touch cost ${env.c}</span>
`; }
    else html += `${carryName(V.carry)} — the envelope starts with the first tick
`; }
  if (PHYS && V.phys) { const p = V.phys, P2 = S.P, ms = physMilestones(p), A = RATINGS.accProfile(p.accel), g = p.agility === 99 ? 1 : RATINGS.agiCapability(p.agility, p.agiScale), cc = RATINGS.curveCapacity(p.agility === 99 ? null : g), R = V.redir, live = !V.replay;
    const bar = (x, col) => `<span style="display:inline-block;width:120px;height:9px;background:#26302b;vertical-align:middle;border-radius:3px"><span style="display:block;width:${Math.round(120 * Math.max(0, Math.min(1, x)))}px;height:9px;background:${col};border-radius:3px"></span></span>`;
    const aNow = P2.accel ? P2.accel(st.s) : 0, pct = st.s / vmax;
    html = `<span class="lab2">CURRENT SPEED</span> <span class="big">${st.s.toFixed(2)} m/s · ${kmh(st.s)} km/h</span>  <b style="color:#ffd45e">${physName(p)}</b>
` +
      `<span class="lab2">SPRINT SPEED</span> <b style="font-size:14px">${p.sprint}</b> → vmax <b>${vmax.toFixed(2)} m/s · ${RATINGS.sprintKmh(p.sprint).toFixed(1)} km/h</b>
` +
      `<span class="lab2">ACCELERATION</span> <b style="font-size:14px">${p.accel}</b> → capability <b>${(A.c * 100).toFixed(1)} %</b> of Acc99 (D38) · launch ${A.a0.toFixed(2)} m/s² · p ${A.p.toFixed(2)} · available now ${aNow.toFixed(2)} m/s²
` +
      `   <span class="lab2">CURRENT % VMAX</span> <b>${(pct * 100).toFixed(1)} %</b> ${bar(pct, "#ffd45e")}  <span style="color:#8fa49a">25 / 50 / 70 / 80 / 90 / 95 % vmax at ${ms.map((x) => x.toFixed(2)).join(" / ")} s</span>
` +
      `<span class="lab2">AGILITY</span> <b style="font-size:14px">${p.agility}</b> ${p.agility === 99 ? "= A99-C exactly" : `· <b>SCALE ${p.agiScale}</b> ${RATINGS.AGI_SCALES[p.agiScale].label.split("· ")[1]} → capability <b>${(g * 100).toFixed(1)} %</b> · curve capacity ${cc.toFixed(1)} m/s²`}
` +
      `   <span class="lab2">REDIRECTION DEMAND</span> ${live ? `<b>${V.demandNow.toFixed(2)}</b> ${bar(V.demandNow, "#ff8a80")}` : "— (live)"}
`;
    if (R && live) html += `   <span class="lab2">LAST REDIRECTION</span> ${R.angle.toFixed(0)}° at ${R.s0.toFixed(1)} m/s · demand ${R.demand.toFixed(2)} · ` + (R.est != null ? `<span class="lab2">NEW LINE</span> <b style="color:#8dffa6">${R.est.toFixed(2)} s</b> · <span class="lab2">MOMENTUM RETAINED</span> <b style="color:#8dffa6">${(R.vEst / R.s0 * 100).toFixed(0)} %</b> (${R.vEst.toFixed(1)} m/s) · lowest ${R.vMin.toFixed(1)} m/s` : R.open ? `establishing… ${(S.t - R.t0).toFixed(2)} s · lowest ${R.vMin.toFixed(1)} m/s` : "released before the line was established") + "\n";
    else html += `   <span class="lab2">LAST REDIRECTION</span> — (a request ≥ 15° away from the travel, above 1 m/s)
`; }
  if (R0) html += `this run (from ${R0.entry < 0.3 ? "rest" : R0.entry.toFixed(1) + " m/s"}): ${R0.d.toFixed(1)} m in ${R0.t.toFixed(2)} s · PEAK ${R0.vmax.toFixed(2)} m/s (${kmh(R0.vmax)} km/h) · 90 % ${R0.pct && R0.pct[90] ? R0.pct[90].t.toFixed(2) + " s" : "—"} · 95 % ${R0.pct && R0.pct[95] ? R0.pct[95].t.toFixed(2) + " s" : "—"} · 99 % ${R0.pct && R0.pct[99] ? R0.pct[99].t.toFixed(2) + " s" : "—"}\n${sp(R0)}`;
  if (R0 && R0.ref && V.ref && PHYS) html += `\n<span class="ref">reference ${physName(V.ref.o.phys)} (beside, the same input): ${sp(R0.ref)} · peak ${R0.ref.vmax.toFixed(2)} · ${R0.d - R0.ref.d >= 0 ? "player ahead" : "player behind"} by ${abs(R0.d - R0.ref.d).toFixed(1)} m</span>`;
  else if (R0 && R0.ref && V.ref && BALLON) html += `\n<span class="ref">the same player BALL OFF (beside): ${sp(R0.ref)} · peak ${R0.ref.vmax.toFixed(2)} · ${R0.d - R0.ref.d >= 0 ? "ball-on player ahead" : "ball-on player behind"} by ${abs(R0.d - R0.ref.d).toFixed(1)} m</span>`;
  else if (R0 && R0.ref && V.ref) { const rp = PACE[V.refPace] || PACE.CURRENT; html += `\n<span class="ref">reference ${rp.id} (top ${V.ref.P.speed.SPRINT.toFixed(2)} m/s): ${sp(R0.ref)} · peak ${R0.ref.vmax.toFixed(2)} · ${R0.d - R0.ref.d >= 0 ? "player ahead" : "player behind"} by ${abs(R0.d - R0.ref.d).toFixed(1)} m</span>`; }
  d.innerHTML = html;
  // (the SPRINT button / banner: lit whenever sprint is actually being requested, whatever asks for it)
  const on = !!src && !V.replay; if (V.dom.bSprint) V.dom.bSprint.classList.toggle("on", on || V.btn.sprint); drawStick(); if (V.dom.sprintBanner) { V.dom.sprintBanner.classList.toggle("hidden", !on); V.dom.sprintBanner.textContent = on ? `SPRINT ON · ${src}` : ""; } }
// ── what the page shows at time t (live: now; replay: a recent instant) — all from the recorded history ────────────────────────────────────────
function hudAt(t) {
  const S = V.sim, P = S.planAt(t), st = S.stateAt(t, P), B = S.ballTrack(t), k = Math.round(t / DT), I = S.log.input, a = P.action;
  const ik = min(k, I.length / 3 - 1), reqH = ik >= 0 && I[3 * ik] !== -99 ? I[3 * ik] : null, mode = ik >= 0 ? MODES[I[3 * ik + 1]] : "RUN", keys = ik >= 0 ? I[3 * ik + 2] : 0;
  let last = null, n3 = 0; for (let i = S.contacts.length - 1; i >= 0; i--) { const c = S.contacts[i]; if (c.t > t + 1e-9) continue; if (!last && !c.missed) last = c; if (c.t > t - 3 && !c.missed) n3++; else if (c.t <= t - 3) break; }
  let phase = a.label; if (a.tech) phase = t < a.tA ? "ENTRY · approach" : t < a.tC - 0.01 ? "ENTRY" : t < a.tC + 0.03 ? "CONTACT" : t < a.tRelease ? "PROTECTION" : "EXIT";
  const travel = st.s > 1.0 ? st.h : st.psi, L = V.stickLog, stick = ik >= 0 && keys & BITS.STICK && 4 * ik + 3 < L.length ? { raw: [L[4 * ik], L[4 * ik + 1]], v: [L[4 * ik + 2], L[4 * ik + 3]] } : null;
  return { t, k, plan: P, stick, action: a.label + (a.m ? (a.m > 0 ? " (R)" : " (L)") : ""), kind: a.kind, phase, speed: st.s, ballSpeed: hyp(B.v[0], B.v[1]), reqH, mode, reqSpeed: reqH != null ? S.P.speed[mode] : 0, keys,
    facing: st.psi, travel, turn: reqH != null ? wrap(reqH - travel) : 0, sep: hyp(B.p[0] - st.P[0], B.p[1] - st.P[1]), cps: n3 / 3, last, why: P.why || [], st, ball: B };
}
const deg = (r) => (r == null ? "  —" : ((wrap(r) / DEG).toFixed(0) + "°").padStart(5));
// ── THE CAMERAS: each returns { view, proj, h (its forward heading on the pitch: the WASD frame), eye, tgt } ────────────────────────────────────────
function cameraFor(h, vw, vh, dtc) {
  const st = h.st, Bp = h.ball.p, P = st.P, C = V.cam || (V.cam = { yaw: h.travel, tgt: [P[0], P[1]], side: st.psi + Math.PI / 2, tx: P[0], ty: P[1] }), snap = dtc < 0;
  const k = (tc) => (snap ? 1 : 1 - Math.exp(-max(0, dtc) / tc));
  // the follow target: between the player and the ball, a little ahead along the travel
  // (SPEED-99-V1: BALL OFF follows the player alone — the 28 % pull toward the ball aimed the camera at the untouched start-spot ball: at 80 m it
  // looked ≈ 22 m behind the player, the 99 player ran out of the picture and the reference runner filled it)
  const wb = V.ballOn || V.engine !== "layered" ? 0.28 : 0, ahead = clamp(st.s * 0.18, 0, 1.4), want = [P[0] * (1 - wb) + Bp[0] * wb + Math.cos(C.yaw) * ahead, P[1] * (1 - wb) + Bp[1] * wb + Math.sin(C.yaw) * ahead];
  C.tgt = [C.tgt[0] + (want[0] - C.tgt[0]) * k(0.16), C.tgt[1] + (want[1] - C.tgt[1]) * k(0.16)];
  let eye, tgt, up = [0, 1, 0], fov = 46, camH;
  if (V.camId === "follow") {
    // the yaw follows the general movement: a slow spring toward the travel (only while moving), rate-limited — cuts never snap it
    if (st.s > 1.4 || snap) { const e = wrap(h.travel - C.yaw), rate = 110 * DEG * max(0, dtc); C.yaw += snap ? e : clamp(e * k(0.85), -rate, rate); }
    const D = 10.5, el = 27 * DEG, f = dir(C.yaw); tgt = [C.tgt[0], 0.55, -C.tgt[1]]; eye = [C.tgt[0] - f[0] * D * Math.cos(el), 0.55 + D * Math.sin(el), -(C.tgt[1] - f[1] * D * Math.cos(el))]; camH = C.yaw; fov = 50; }
  else if (V.camId === "touchline") { C.tx += (P[0] - C.tx) * k(0.5); C.ty += (P[1] - C.ty) * k(2.5); eye = [C.tx, 17, -(min(C.ty, 34) - 31)]; tgt = [C.tgt[0], 0.5, -C.tgt[1]]; fov = 26; camH = hdg([tgt[0] - eye[0], -(tgt[2] - eye[2])]); }
  else if (V.camId === "explosion") {
    // (SPEED-99-V1.1: THE EXPLOSION camera — close and side-on, on the player's side (the reference runner's lane beyond), following the player:
    // the first steps, the lean, the stride opening)
    if (st.s > 1.4 || snap) { const e = wrap(h.travel - C.yaw), rate = 110 * DEG * max(0, dtc); C.yaw += snap ? e : clamp(e * k(0.85), -rate, rate); }
    const f = dir(C.yaw), n = [-f[1], f[0]], A = [P[0] + f[0] * 0.6, P[1] + f[1] * 0.6]; C.em = C.em ? [C.em[0] + (A[0] - C.em[0]) * k(0.08), C.em[1] + (A[1] - C.em[1]) * k(0.08)] : A.slice();
    tgt = [C.em[0], 0.85, -C.em[1]]; eye = [C.em[0] + n[0] * 6.2, 1.55, -(C.em[1] + n[1] * 6.2)]; fov = 48; camH = C.yaw; }
  else if (V.camId === "pair" && V.ref) {
    // (SPEED-99-V1: BOTH RUNNERS, side-on — the midpoint of the player and the reference runner, seen from the side of the travel; it backs off as
    // the gap grows, so the 99 player pulling away stays in the picture)
    if (st.s > 1.4 || snap) { const e = wrap(h.travel - C.yaw), rate = 110 * DEG * max(0, dtc); C.yaw += snap ? e : clamp(e * k(0.85), -rate, rate); }
    const rs = V.ref.stateAt(Math.min(h.t, V.ref.t)), M = [(P[0] + rs.P[0]) / 2, (P[1] + rs.P[1]) / 2], gap = hyp(P[0] - rs.P[0], P[1] - rs.P[1]), D = max(10, 0.62 * gap + 7), f = dir(C.yaw), n = [-f[1], f[0]];
    C.pm = C.pm ? [C.pm[0] + (M[0] - C.pm[0]) * k(0.12), C.pm[1] + (M[1] - C.pm[1]) * k(0.12)] : M.slice(); C.pd = C.pd ? C.pd + (D - C.pd) * k(0.4) : D;
    tgt = [C.pm[0], 0.8, -C.pm[1]]; eye = [C.pm[0] + n[0] * C.pd, 2.2 + 0.16 * C.pd, -(C.pm[1] + n[1] * C.pd)]; fov = 42; camH = C.yaw; }
  else if (V.camId === "front" || V.camId === "rear") { if (st.s > 1.4 || snap) { const e = wrap(h.travel - C.yaw), rate = 110 * DEG * max(0, dtc); C.yaw += snap ? e : clamp(e * k(0.85), -rate, rate); }
    const f = dir(C.yaw), sgnF = V.camId === "front" ? 1 : -1, A = [P[0] + f[0] * 0.4, P[1] + f[1] * 0.4]; C.fm = C.fm ? [C.fm[0] + (A[0] - C.fm[0]) * k(0.08), C.fm[1] + (A[1] - C.fm[1]) * k(0.08)] : A.slice();
    tgt = [C.fm[0], 0.8, -C.fm[1]]; eye = [C.fm[0] + sgnF * f[0] * 5.6, 1.7, -(C.fm[1] + sgnF * f[1] * 5.6)]; fov = 46; camH = V.camId === "front" ? C.yaw + Math.PI : C.yaw; }
  else if (V.camId === "top") { tgt = [C.tgt[0], 0, -C.tgt[1]]; eye = [C.tgt[0], 14, -C.tgt[1]]; up = [1, 0, 0]; fov = 40; camH = 0; }
  else { const e = wrap(st.psi + Math.PI / 2 - C.side); C.side += snap ? e : e * k(0.6); const f = dir(C.side); tgt = [P[0], 0.75, -P[1]]; eye = [P[0] - f[0] * 5.2, 1.15, -(P[1] - f[1] * 5.2)]; fov = 40; camH = C.side; }
  return { view: lookAt(eye, tgt, up), proj: persp(1 / Math.tan(fov / 2 * DEG), vw / vh, 0.1, 400), h: camH, eye, tgt };
}
function proj3(c, vw, dpr, p) { const v = M4.transformPoint(c.view, p), pr = c.proj, cx = pr[0] * v[0] + pr[4] * v[1] + pr[8] * v[2] + pr[12], cy = pr[1] * v[0] + pr[5] * v[1] + pr[9] * v[2] + pr[13], w = pr[3] * v[0] + pr[7] * v[1] + pr[11] * v[2] + pr[15];
  if (w <= 1e-4) return null; return [(cx / w * 0.5 + 0.5) * vw.w * dpr, (0.5 - cy / w * 0.5) * vw.h * dpr]; }
// ── THE COURSES (visual guides only; placed from the player where he stands, along his travel / facing) ────────────────────────────────────────────
function makeCourse(id) {
  if (id === "none") return null; const h = hudAt(V.sim.t), P = h.st.P, th = h.st.s > 1 ? h.travel : h.st.psi, at = (a, l) => [P[0] + a * Math.cos(th) - l * Math.sin(th), P[1] + a * Math.sin(th) + l * Math.cos(th)];
  const cones = [], lines = [], labels = [];
  if (id === "straight") { for (const a of [5, 10, 20, 30, 40, 60, 80]) { cones.push(at(a, -1.6), at(a, 1.6)); labels.push([at(a, 2.4), a + " m"]); } lines.push([at(0, 0), at(80, 0), "rgba(255,255,255,0.35)", [6, 6]], [at(40, -1.6), at(40, 1.6), "rgba(255,212,94,0.9)"], [at(80, -1.6), at(80, 1.6), "rgba(255,212,94,0.9)"]); }
  else if (id === "explosion") { for (const a of [2.5, 5, 7.5, 10, 12.5, 15]) { cones.push(at(a, -1.6), at(a, 1.6)); labels.push([at(a, 2.4), a + " m"]); } lines.push([at(0, 0), at(15, 0), "rgba(255,255,255,0.35)", [6, 6]], [at(15, -1.6), at(15, 1.6), "rgba(255,212,94,0.9)"]); }
  else if (id === "slalom") { for (let i = 0; i < 9; i++) cones.push(at(5 + i * 3.5, 0)); lines.push([at(0, 0), at(5 + 8 * 3.5 + 4, 0), "rgba(255,255,255,0.25)", [4, 6]]); labels.push([at(5, 1.2), "slalom · 3.5 m"]); }
  else if (id === "cuts") { const C = at(12, 0); cones.push(C); lines.push([at(0, 0), C, "rgba(255,255,255,0.45)", [6, 5]]);
    for (const d of [45, 90, 120, 150, 180, -45, -90, -120, -150]) { const e = th + d * DEG, E = [C[0] + Math.cos(e) * 7, C[1] + Math.sin(e) * 7]; lines.push([C, E, abs(d) >= 150 ? "rgba(255,140,120,0.75)" : abs(d) >= 120 ? "rgba(255,190,110,0.75)" : "rgba(140,220,255,0.75)"]); cones.push(E); labels.push([[C[0] + Math.cos(e) * 7.8, C[1] + Math.sin(e) * 7.8], (d > 0 ? "R " : d < 0 ? "L " : "") + abs(d) + "°"]); } }
  else if (id === "box") { const c = at(4.5, 0), s = 3; for (const [a, l] of [[-s, -s], [-s, 0], [-s, s], [0, -s], [0, s], [s, -s], [s, 0], [s, s]]) cones.push([c[0] + a * Math.cos(th) - l * Math.sin(th), c[1] + a * Math.sin(th) + l * Math.cos(th)]);
    const q = (a, l) => [c[0] + a * Math.cos(th) - l * Math.sin(th), c[1] + a * Math.sin(th) + l * Math.cos(th)]; lines.push([q(-s, -s), q(s, -s), "rgba(255,255,255,0.4)"], [q(s, -s), q(s, s), "rgba(255,255,255,0.4)"], [q(s, s), q(-s, s), "rgba(255,255,255,0.4)"], [q(-s, s), q(-s, -s), "rgba(255,255,255,0.4)"]); labels.push([q(-s - 0.8, 0), "tight box 6 × 6 m"]); }
  return { id, cones, lines, labels };
}
// ── RENDER ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function layout() { const top = V.dom.bar.getBoundingClientRect().height, Wd = window.innerWidth, H = window.innerHeight - top; V.dom.stage.style.top = top + "px"; V.dom.stage.style.height = H + "px"; return { w: Wd, h: H }; }
function render(pose, h, dtc) {
  const gl = V.gl, cv = V.cv, dpr = min(window.devicePixelRatio || 1, 2), vw = layout();
  if (cv.width !== Math.round(vw.w * dpr) || cv.height !== Math.round(vw.h * dpr)) { cv.width = Math.round(vw.w * dpr); cv.height = Math.round(vw.h * dpr); cv.style.width = vw.w + "px"; cv.style.height = vw.h + "px"; V.ovc.width = cv.width; V.ovc.height = cv.height; V.ovc.style.width = cv.style.width; V.ovc.style.height = cv.style.height; }
  const c = cameraFor(h, vw.w, vw.h, dtc); V.camH = c.h; V.camNow = c;
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
  const B = h.ball.p, sh = new Float32Array(64); let ns = 0; const push = (x, y, s, w) => { if (ns < 16) { sh.set([x, y, s, w], ns * 4); ns++; } };
  push(h.st.P[0], h.st.P[1], 0.42, 0.40); const tRef = V.ref ? Math.min(h.t, V.ref.t) : null, refSt = V.ref ? V.ref.stateAt(tRef) : null; if (refSt) push(refSt.P[0], refSt.P[1], 0.42, 0.32); if (pose) for (const X of ["R", "L"]) { const a = pose.feet[X].ank, hg = max(0, a[2] - 0.09); push(a[0], a[1], 0.15 + hg * 0.3, 0.5 * Math.exp(-hg * 7)); }
  const ballShown = V.ballOn || V.engine !== "layered";   // (SPEED-99-V1: BALL OFF draws no ball — the simulation's ball-off ball is left untouched at the start spot)
  const bh = max(0, B[2] - 0.11); if (ballShown) push(B[0], B[1], 0.12 + bh * 0.4, 0.65 * Math.exp(-bh * 5));
  const G = V.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, c.view); gl.uniformMatrix4fv(G.u.proj, false, c.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  if (V.course && V.course.cones.length) { const K = V.cone; gl.useProgram(K.p); gl.uniformMatrix4fv(K.u.view, false, c.view); gl.uniformMatrix4fv(K.u.proj, false, c.proj); gl.uniform3fv(K.u.col, [1.0, 0.45, 0.08]); gl.bindVertexArray(K.vao);
    for (const q of V.course.cones) { gl.uniform3fv(K.u.off, [q[0], 0, -q[1]]); gl.drawArrays(gl.TRIANGLES, 0, K.n); } gl.bindVertexArray(null); }
  if (pose) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(V.R, V.ent, pose.skin, c.view, c.proj); gl.disable(gl.CULL_FACE); }
  if (pose && V.refBody) { const rp = V.refBody.pose(tRef); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(V.R, V.ent, rp.skin, c.view, c.proj); gl.disable(gl.CULL_FACE); }
  const Bp = V.ballProg; if (ballShown) { gl.useProgram(Bp.p); gl.uniformMatrix4fv(Bp.u.view, false, c.view); gl.uniformMatrix4fv(Bp.u.proj, false, c.proj); gl.uniform3fv(Bp.u.c, A3(B)); gl.uniform4fv(Bp.u.q, QA(h.ball.q)); gl.uniform1f(Bp.u.r, 0.11); gl.uniform3fv(Bp.u.tint, [1, 1, 1]);
  gl.bindVertexArray(Bp.vao); gl.drawElements(gl.TRIANGLES, Bp.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); }
  if (V.ref && V.refBall && V.refBody) { const tR = Math.min(h.t, V.ref.t), RB = V.ref.ballTrack(tR); gl.useProgram(Bp.p); gl.uniformMatrix4fv(Bp.u.view, false, c.view); gl.uniformMatrix4fv(Bp.u.proj, false, c.proj); gl.uniform3fv(Bp.u.c, A3(RB.p)); gl.uniform4fv(Bp.u.q, QA(RB.q)); gl.uniform1f(Bp.u.r, 0.11); gl.uniform3fv(Bp.u.tint, [1, 1, 1]); gl.bindVertexArray(Bp.vao); gl.drawElements(gl.TRIANGLES, Bp.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); }
  overlay(c, vw, dpr, pose, h);
  if (LAB && V.labDiag) labOverlay(c, vw, dpr, h);
}
function overlay(c, vw, dpr, pose, h) {
  const ctx = V.ov2d, S = V.sim, t = h.t, P = (q) => proj3(c, vw, dpr, q); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, V.ovc.width, V.ovc.height);
  const G = (p, ht) => [p[0], ht != null ? ht : 0.015, -p[1]];
  const line = (pts, col, wid, dash) => { ctx.beginPath(); let f = true; for (const q of pts) { const p = P(q); if (!p) { f = true; continue; } if (f) { ctx.moveTo(p[0], p[1]); f = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = wid * dpr; ctx.setLineDash(dash ? dash.map((d) => d * dpr) : []); ctx.stroke(); ctx.setLineDash([]); };
  const ring = (cc, rad, col, wid) => { const pts = []; for (let a = 0; a <= 28; a++) pts.push([cc[0] + rad * Math.cos(a / 28 * 6.283), cc[1], cc[2] + rad * Math.sin(a / 28 * 6.283)]); line(pts, col, wid); };
  const text = (q, s, col, size) => { const p = P(q); if (!p) return; ctx.font = `600 ${(size || 11) * dpr}px -apple-system, Helvetica`; const w = ctx.measureText(s).width; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(p[0] - 3 * dpr, p[1] - 12 * dpr, w + 6 * dpr, 15 * dpr); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1]); };
  const arrow = (from, hh, len, col, wid) => { const e = [from[0] + Math.cos(hh) * len, from[1] + Math.sin(hh) * len], l = 0.28; line([G(from, 0.03), G(e, 0.03)], col, wid); line([G([e[0] - Math.cos(hh - 0.45) * l, e[1] - Math.sin(hh - 0.45) * l], 0.03), G(e, 0.03), G([e[0] - Math.cos(hh + 0.45) * l, e[1] - Math.sin(hh + 0.45) * l], 0.03)], col, wid); };
  // the reference runner's label (its pace and speed)
  if (V.ref) { const rs = V.ref.stateAt(Math.min(t, V.ref.t)), rp = LAB ? { id: V.ref.o.foot === "L" ? "MIRROR · left-footed" : "MIRROR" } : PHYS ? { id: physName(V.ref.o.phys) } : BALLON ? { id: "BALL OFF" } : PACE[V.refPace] || PACE.CURRENT; text([rs.P[0], 2.05, -rs.P[1]], `reference ${rp.id} · ${rs.s.toFixed(1)} m/s`, "#c8d4ce", 10.5); }
  // the course
  if (V.course) { for (const [a, b, col, dash] of V.course.lines) line([G(a), G(b)], col, 1.6, dash); for (const [q, s] of V.course.labels) text(G(q, 0.05), s, "#ffe2a8", 10.5); }
  // the request (where the keys point) — a thin arrow at the feet; the WASD actually pressed during a replay
  if (h.reqH != null) arrow(h.st.P, h.reqH, 1.3 + 0.12 * h.reqSpeed, V.replay ? "rgba(255,212,94,0.95)" : "rgba(255,212,94,0.55)", V.replay ? 3 : 2);
  // contacts just made: a ring at the ball, the technique · foot · surface
  for (let i = S.contacts.length - 1; i >= 0; i--) { const cn = S.contacts[i]; if (cn.t > t + 1e-9) continue; if (t - cn.t > 0.7) break; const tech = cn.tech && cn.tech !== "CARRY", col = cn.missed ? "rgba(255,90,80,0.95)" : tech ? "rgba(255,212,94,0.95)" : "rgba(125,240,255,0.85)";
    ring(G(cn.ball, 0.02), 0.16, col, 2.4); if (tech || V.show.body || V.replay) text(G(cn.ball, 0.36), `${cn.missed ? "MISSED " : ""}${cn.role} · ${cn.F} ${String(cn.surface).toLowerCase()}`, col, 10.5); }
  // THE PROTECTION DIAGNOSTIC (not a tackle probability): a defender's straight reach at the ball from five directions — green: leg / hips / torso blocks it
  if (V.show.prot && pose && pose.exp) { const b = [pose.ball[0], pose.ball[1]]; for (const [k, dg] of Object.entries(DIRS)) { const a = pose.h0 + dg * DEG, e = [b[0] + Math.cos(a) * 0.9, b[1] + Math.sin(a) * 0.9], who = pose.exp.named[k];
      line([[e[0], 0.85, -e[1]], [b[0], 0.11, -b[1]]], who ? "rgba(120,255,140,0.9)" : "rgba(255,80,70,0.95)", who ? 2.0 : 2.6, who ? [5, 3] : null);
      const parts = who ? [...new Set(who.split("").map((x) => (x === "B" ? "hips/torso" : "leg " + x)))].join(" + ") : "direct line"; text([e[0], 0.9, -e[1]], `${k} · ${parts}`, who ? "#9dffae" : "#ff8a80", 9.5); } }
  // BODY DEBUG: COM, pelvis, support / swing feet, the feet's and the ball's trajectories, desired / actual movement, the ball's lane
  if (V.show.body) { const st = h.st, Pc = st.P;
    ring(G(Pc, 0.01), 0.10, "rgba(77,232,255,0.95)", 2); line([G(Pc, 0.01), G(Pc, 0.95)], "rgba(77,232,255,0.6)", 1.2); text(G(Pc, 1.0), "COM", "#7fe9ff", 9.5);
    if (pose) { const pj = pose.J.pelvis.j; ring([pj[0], pj[2], -pj[1]], 0.08, "rgba(200,160,255,0.95)", 2); text([pj[0], pj[2] + 0.12, -pj[1]], "pelvis", "#d6b8ff", 9.5);
      for (const X of ["R", "L"]) { const f = pose.feet[X], a = f.ank; ring(G(a, 0.01), 0.09, f.planted ? "rgba(110,255,150,0.95)" : "rgba(255,170,80,0.95)", 2.2); text(G(a, 0.22), `${X} ${f.planted ? "support" : f.contact ? "CONTACT" : "swing"}`, f.planted ? "#9dffae" : "#ffc28a", 9); } }
    for (const X of ["R", "L"]) { const pts = []; for (let x = t - 0.8; x <= t + 1e-9; x += 1 / 60) { if (x < 0) continue; const f = V.body.footAt(X, Math.round(x / DT) * DT); pts.push([f.ank[0], f.ank[2], -f.ank[1]]); } line(pts, X === "R" ? "rgba(110,255,150,0.7)" : "rgba(255,110,200,0.7)", 1.4); }
    { const pts = []; for (let x = max(0, t - 2); x <= t + 1e-9; x += 1 / 30) { const b = S.ballTrack(x).p; pts.push(G(b)); } line(pts, "rgba(255,255,255,0.85)", 1.6); }
    if (h.reqH != null) arrow(Pc, h.reqH, 2.4, "rgba(255,212,94,1)", 2.6); if (st.s > 0.2) arrow(Pc, st.h, 0.5 + st.s * 0.35, "rgba(77,232,255,1)", 2.6);
    { const th = h.travel, Bq = h.ball.p, d = [Math.cos(th), Math.sin(th)], n = [-d[1], d[0]], lat = (Bq[0] - Pc[0]) * n[0] + (Bq[1] - Pc[1]) * n[1]; line([G([Pc[0] - d[0] * 1, Pc[1] - d[1] * 1]), G([Pc[0] + d[0] * 4, Pc[1] + d[1] * 4])], "rgba(77,232,255,0.35)", 1, [4, 4]);
      const L0 = [Pc[0] + n[0] * lat, Pc[1] + n[1] * lat]; line([G([L0[0] - d[0] * 1, L0[1] - d[1] * 1]), G([L0[0] + d[0] * 4, L0[1] + d[1] * 4])], "rgba(255,255,255,0.55)", 1.2, [8, 4]); text(G([L0[0] + d[0] * 4, L0[1] + d[1] * 4], 0.05), `ball lane ${lat >= 0 ? "R" : "L"} ${(abs(lat) * 100).toFixed(0)} cm`, "#e8f5ee", 9); } }
  if (!pose) { const st = h.st; ring(G(st.P, 0.02), 0.25, "rgba(77,232,255,0.95)", 3); arrow(st.P, st.psi, 0.6, "rgba(77,232,255,1)", 3); text(G(st.P, 0.4), "body hidden (simulation only)", "#7fe9ff", 10); }
}
// ── HUD / PANELS (DOM, ≈ 10 Hz) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ── THE BODY WARNINGS (§17) — from the pose drawn (live: every frame; a replay: the instant shown), for visual review only ───────────────────────
//   pelvis ↔ root: the rendered pelvis's ground point against the authoritative centre of mass (warn > 0.15 m) · pulled: the pose had to move the
//   pelvis after a planted foot out of reach (> 3 cm) · contact foot: the boot's gap to the ball at a contact (> 4 cm) · support slide: a planted
//   foot's ball moving (> 4 mm / frame tick, pivots excluded) · unsupported: no foot down for > 0.15 s · legs: the leg capsules interpenetrating
//   (> 20 mm) · foot jump: a foot moving > 0.12 m in one tick
const DG = { off: 0.15, pull: 0.03, gap: 0.04, slide: 0.004, air: 0.15, legs: -0.02, jump: 0.12 };
function diagOf(pose, h) { if (!pose || V.engine === "baseline" && !pose.feet) return null; const D = V.diag, st = h.st, now = { t: h.t, off: hyp(pose.P[0] - st.P[0], pose.P[1] - st.P[1]), pull: pose.reach || 0, legs: min(...Object.values(pose.clr || { x: 1 })), feet: {} };
  for (const X of ["R", "L"]) { const f = pose.feet[X]; now.feet[X] = { ank: f.ank.slice(), planted: f.planted, sid: f.stance && f.stance.id, pivot: !!(f.stance && f.stance.pivot), ballPt: f.ballPt && f.ballPt.slice() }; }
  // (a contact made this tick: the contacting boot's gap to the ball)
  const c = V.sim.contacts.find((x) => !x.missed && abs(x.t - h.t) < DT / 2 + 1e-9); if (c && pose.gap && pose.gap[c.F]) now.gap = max(0, pose.gap[c.F].gap);
  const P = D.prev && abs(h.t - D.prev.t - DT) < DT / 2 ? D.prev : null; now.slide = 0; now.jump = 0;
  if (P) for (const X of ["R", "L"]) { const f = now.feet[X], q = P.feet[X], d = hyp(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1], f.ank[2] - q.ank[2]); now.jump = max(now.jump, d);
    if (f.planted && q.planted && f.sid === q.sid && !f.pivot && f.ballPt && q.ballPt) now.slide = max(now.slide, hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1])); }
  D.air = !now.feet.R.planted && !now.feet.L.planted ? (P ? D.air + DT : 0) : 0; now.air = D.air; D.prev = now;
  if (!V.replay) { D.hist.push(now); while (D.hist.length && D.hist[0].t < h.t - 10) D.hist.shift(); } return now; }
function diagPanel(now) { const d = V.dom.diag; if (!V.show.diag || !now) { d.classList.add("hidden"); return; } d.classList.remove("hidden");
  const H = V.diag.hist, cnt = (f) => { let n = 0, on = false; for (const x of H) { const b = f(x); if (b && !on) n++; on = b; } return n; }, mx = (k) => H.reduce((m, x) => max(m, x[k] || 0), 0), cls = (b, bad) => (bad ? "b" : b ? "w" : "ok");
  const row = (name, cur, lim, n, worst, unit = "m") => `<span class="${cls(cur > lim, cur > 2 * lim)}">${name.padEnd(15)} ${(cur || 0).toFixed(3).padStart(6)} ${unit}</span>  warnings ${String(n).padStart(3)} · worst ${worst.toFixed(3)}`;
  const gaps = H.filter((x) => x.gap != null), lastGap = gaps.length ? gaps[gaps.length - 1].gap : 0;
  d.innerHTML = `<b>BODY WARNINGS</b> (live · last 10 s · for review, never acted on)\n` + [row("pelvis ↔ root", now.off, DG.off, cnt((x) => x.off > DG.off), mx("off")), row("pulled after foot", now.pull, DG.pull, cnt((x) => x.pull > DG.pull), mx("pull")),
    row("contact foot gap", lastGap, DG.gap, gaps.filter((x) => x.gap > DG.gap).length, gaps.reduce((m, x) => max(m, x.gap), 0)), row("support slide", now.slide, DG.slide, cnt((x) => x.slide > DG.slide), mx("slide")),
    row("unsupported", now.air, DG.air, cnt((x) => x.air > DG.air), mx("air"), "s"), row("foot jump", now.jump, DG.jump, cnt((x) => x.jump > DG.jump), mx("jump")),
    `<span class="${now.legs < DG.legs ? "w" : "ok"}">${"legs clearance".padEnd(15)} ${now.legs.toFixed(3).padStart(6)} m</span>  warnings ${String(cnt((x) => x.legs < DG.legs)).padStart(3)} · worst ${H.reduce((m, x) => min(m, x.legs), 1).toFixed(3)}`].join("\n"); }
// THE SELECTED SOLUTION (owner: "put the current selected solution prominently in the HUD … why it won, nearest alternative, predicted contact
// time, predicted exit direction, predicted exit speed") — the decision of the plan shown (made at its re-plan, B4's predicted outcome)
function solutionHtml(h) { const P = h.plan, a = P.action, id = actionId(a) + (a.m ? (a.m > 0 ? " · R" : " · L") : a.F ? " · " + a.F : ""), W = P.why || [], DV = P.decisionView, t0 = P.t0, sg = (x) => (x >= 0 ? "+" : "") + x.toFixed(0) + "°";
  let L = `<div style="font:800 22px/1.15 -apple-system,Helvetica,sans-serif;color:${a.kind === "GENERIC" ? "#7fe9ff" : a.tech ? "#ffd45e" : "#e6efe9"};letter-spacing:.02em">${id}</div>`;
  L += `<span style="color:#cfe">why it won${W[0] ? ` (cost ${W[0].J})` : ""}: ${(W[0] && W[0].note || "—").slice(0, 92)}</span>\n`;
  const alt = DV && DV.alt ? DV.alt : W.find((w, i) => i > 0 && w.id !== (W[0] && W[0].id)); if (alt) L += `<span style="color:#8fa49a">nearest alternative: ${alt.id || alt.label} (+${(alt.dJ != null ? alt.dJ : alt.J - W[0].J).toFixed(2)}) ${(alt.note || "").slice(0, 70)}</span>\n`;
  if (DV && DV.outcome) { const o = DV.outcome, rq = P.req && P.req.h != null ? P.req.h : null, rel = (x) => (x == null || rq == null ? "—" : sg(wrap(x - rq) / DEG));
    L += `<span style="color:#9ad7ff">predicted: contact ${o.tRel != null ? "+" + (o.tRel - t0).toFixed(2) + " s" : "none onto the line"} · exit ball ${o.ballSpeed.toFixed(1)} m/s ${rel(o.ballDir)} · body ${o.bodySpeed.toFixed(1)} m/s ${rel(o.bodyDir)} · next touch +${(o.tNext - t0).toFixed(2)} s</span>\n`; }
  else { const nc = P.contacts.find((c) => !c.done && c.t > h.t - 1e-9); L += `<span style="color:#9ad7ff">predicted: next contact ${nc ? "+" + (nc.t - h.t).toFixed(2) + " s (" + nc.role + ")" : "—"} · exit: B4 off — no outcome prediction</span>\n`; }
  // (the last technical action — a generic one owns the plan only until its touch: it stays named here)
  const A = V.sim.log.acts ? Object.values(V.sim.log.acts).filter((x) => x.tSel <= h.t + 1e-9).sort((x, y) => x.tSel - y.tSel).pop() : null;
  if (A && h.t - A.tSel < 6) { const c = V.sim.contacts.find((x) => x.actionId === A.id && !x.missed && (x.decisive || x.src === "generic")), mrk = A.m ? (A.m > 0 ? " R" : " L") : A.F ? " " + A.F : "";
    L += `<span style="color:#ffe2a8">last action: ${actionId(A)}${mrk} · selected ${(h.t - A.tSel).toFixed(2)} s ago${c ? ` · contact ${(c.t - A.tSel).toFixed(2)} s after it${A.kind === "GENERIC" ? " · control back at the touch" : A.tRelease ? ` · control back ${((V.sim.L && V.sim.L.exits ? A.tRelease : Math.max(A.tRelease, A.exitT != null ? A.exitT + 0.02 : 0)) - c.t).toFixed(2)} s later` : ""}` : ""}</span>\n`; }
  return L; }
function updateHud(h) {
  const S = V.sim, d = V.dom, top = h.why.slice(0, 4).map((w) => `${(w.label + (w.m ? (w.m > 0 ? " R" : " L") : "")).padEnd(17)} ${String((+w.J).toFixed(2)).padStart(5)}  ${(w.note || "").slice(0, 58)}`).join("\n");
  const lastC = h.last, prov = S.P.provisional;
  const cfg = configName(V.engine, V.layers), acts = V.engine === "layered" ? LAYERS.filter((x) => V.layers[x.id]).map((x) => x.id).join(" · ") || "no layer (= 88573ef0)" : "the locked engine";
  // (the clean page: without ⚙ diagnostics the HUD is the action, its phase and the speeds — everything else behind the toggle)
  if (!document.body.classList.contains("diagOn")) { d.hud.innerHTML = `<span style="color:#ff9b8d;font-weight:700">${cfg}</span>${V.ballOn || V.engine !== "layered" ? "" : "  <span style=\"color:#9ad7ff\">BALL OFF</span>"}\n<div class="act">${h.action}</div><div class="phase">${h.phase}${V.replay ? "  ·  REPLAY " + (h.t - V.sim.t).toFixed(2) + " s" : ""}</div>` +
      (V.ballOn || V.engine !== "layered" ? `${h.mode.toLowerCase()} · player ${h.speed.toFixed(1)} m/s · ball ${h.ballSpeed.toFixed(1)} m/s · separation ${h.sep.toFixed(2)} m` : `${h.mode.toLowerCase()} · player ${h.speed.toFixed(2)} m/s`) + possLine(false); d.prov.textContent = ""; return; }
  d.hud.innerHTML = `<span style="color:${V.engine === "layered" ? "#ffd45e" : "#8dffa6"};font-weight:700">${cfg}</span>  <span style="color:#8fa49a">${acts}</span>\n` + solutionHtml(h) + `<div class="act" style="font-size:12px">${h.action}</div><div class="phase">${h.phase}${V.replay ? "  ·  REPLAY " + (h.t - V.sim.t).toFixed(2) + " s" : ""}${V.paused && !V.replay ? "  ·  PAUSED" : ""}</div>` +
    `mode ${h.mode.padEnd(6)} requested ${h.reqSpeed.toFixed(1)} m/s\nplayer ${h.speed.toFixed(2)} m/s   ball ${h.ballSpeed.toFixed(2)} m/s\n` +
    `requested ${deg(h.reqH)}   facing ${deg(h.facing)}\nturn angle ${deg(h.reqH != null ? h.turn : null)}   travel ${deg(h.travel)}\n` + inputLine(h) + "\n" + possLine(true) + "\n" +
    `foot ${lastC ? lastC.F : "—"} · ${lastC ? String(lastC.surface).toLowerCase() : "—"} (${lastC ? (LABEL[lastC.tech] || lastC.tech) + " · " + lastC.role : "no contact yet"})\n` +
    `ball separation ${h.sep.toFixed(2)} m   contacts/s ${h.cps.toFixed(1)}\n` + `<span style="color:#8fa49a">why (cost, lower = chosen):\n${top}</span>` +
    (prov ? `\n<span id="provH" style="color:#ffb36b">attributes below 99: PROVISIONAL linear scaling — not a calibration</span>` : "");
  d.prov.textContent = prov ? " provisional" : "";
  if (V.show.side) { drawGraph(h); stats(h); contactsTable(h); }
}
// THE POSSESSION LINE (TC-CONTROLLED-1): compact — the model and the state; diagnostics — the whole controlled-ball view (possInfo)
function possLine(full) { const S = V.sim; if (!S.possInfo || V.engine !== "layered" || !V.ballOn) return ""; const p = S.possInfo(), col = p.state === "CONTROLLED" ? "#8dffa6" : "#ffb36b", ex = p.lastExit;
  if (!full) return `\n<span style="color:#9ad7ff">${p.model}</span> · <span style="color:${col};font-weight:700">${p.state === "CONTROLLED" ? "CONTROLLED BALL" : "FREE BALL"}</span>${ex && p.state !== "CONTROLLED" ? `  <span style="color:#8fa49a">(${ex.why})</span>` : ""}`;
  return `<span style="color:#9ad7ff">BALL CONTROL MODEL ${p.model}</span> · possession <span style="color:${col};font-weight:700">${p.state}</span> for ${p.since.toFixed(1)} s\n` +
    `controlled action ${p.action} · phase ${p.phase}\nnext planned ${p.next} · committed ${p.committed ? "yes" : "no"}\nsupport foot ${p.support} · technical foot ${p.technical} · stick activity ${p.volatility.toFixed(2)}\n` +
    `control threat ${p.threat.toFixed(2)} (separation / envelope)${p.fallback ? ` · fallback: ${p.fallback}` : ""}\ncontinuation ${p.cont}\nlast exit ${ex ? `${ex.why} at ${ex.t.toFixed(2)} s — ${ex.detail}` : "none"}`; }
// the input line: which source authored the request; for the stick its exact direction (from the camera forward it latched, + = right), its
// analog magnitude beyond the deadzone, its zone and the deadzone itself
function inputLine(h) {
  const k = h.keys, btn = (k & BITS.SPRINT_BTN ? " +SPRINT btn" : "") + (k & BITS.WALK_BTN ? " +WALK btn" : "") + (k & BITS.SHIFT ? " +Shift" : "") + (k & BITS.ALT ? " +Alt" : "");
  if (k & BITS.STICK && h.stick) { const v = { x: h.stick.v[0], y: h.stick.v[1], m: hyp(h.stick.v[0], h.stick.v[1]) }, r = hyp(h.stick.raw[0], h.stick.raw[1]), a = stickAngleDeg(v);
    return `<span style="color:#9ad7ff">input STICK ${a == null ? "  centre" : (a >= 0 ? "+" : "") + a.toFixed(1) + "°"} · |v| ${v.m.toFixed(2)} · ${v.m > 0 ? stickMode(r, V.stick.cfg) + " zone" : "deadzone"}${btn} · dz ${V.stick.cfg.deadzone.toFixed(2)}</span>`; }
  const keys = ["W", "A", "S", "D"].filter((x) => k & BITS[x]).join(""); return `<span style="color:#9ad7ff">input WASD ${keys || "—"}${btn}</span>`;
}
function drawGraph(h) {
  const cv = V.dom.graph, dpr = min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, ht = cv.clientHeight; if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(ht * dpr); }
  const g = cv.getContext("2d"), S = V.sim, T = 8, t1 = h.t, t0 = t1 - T, yMax = 3.0, X = (t) => (t - t0) / T * cv.width, Y = (v) => cv.height - clamp(v / yMax, 0, 1) * (cv.height - 4 * dpr) - 2 * dpr;
  g.clearRect(0, 0, cv.width, cv.height); g.font = `${9 * dpr}px Menlo`; for (const v of [0.5, 1, 2]) { g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = dpr; g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(cv.width, Y(v)); g.stroke(); g.fillStyle = "rgba(200,220,210,0.5)"; g.fillText(v + " m", 2 * dpr, Y(v) - 2 * dpr); }
  g.strokeStyle = "rgba(77,232,255,0.95)"; g.lineWidth = 1.5 * dpr; g.beginPath(); let f = true;
  for (let t = max(0, t0, S.t - 11.9); t <= t1 + 1e-9; t += 1 / 30) { const st = S.stateAt(t), b = S.ballTrack(t).p, v = hyp(b[0] - st.P[0], b[1] - st.P[1]); if (f) { g.moveTo(X(t), Y(v)); f = false; } else g.lineTo(X(t), Y(v)); } g.stroke();
  for (const c of S.contacts) { if (c.t < t0 || c.t > t1) continue; g.fillStyle = c.missed ? "#ff6b5e" : c.tech && c.tech !== "CARRY" ? "#ffd45e" : "#7df0ff"; g.fillRect(X(c.t) - dpr, cv.height - 7 * dpr, 2 * dpr, 6 * dpr); }
}
function stats(h) {
  const S = V.sim, C = S.contacts.filter((c) => !c.missed && c.t <= h.t + 1e-9), n = C.length || 1, pc = (f) => ((C.filter(f).length / n) * 100).toFixed(0).padStart(3) + " %";
  const tech = (id) => pc((c) => c.tech === id), execs = (id) => C.filter((c) => c.tech === id && c.decisive).length;
  V.dom.stats.textContent = `contacts ${C.length}   contacts/s ${h.cps.toFixed(1)} (last 3 s)   missed ${S.contacts.filter((c) => c.missed).length}\n` +
    `outside ${pc((c) => c.surface === "OUTSIDE")}  inside ${pc((c) => c.surface === "INSIDE")}  instep ${pc((c) => c.surface === "LACES")}  sole ${pc((c) => c.surface === "SOLE")}\n` +
    `left ${pc((c) => c.F === "L")}  right ${pc((c) => c.F === "R")}\n` +
    `carry ${tech("CARRY")}  outside cut ${tech("OUTCUT")} (${execs("OUTCUT")}×)  Ronaldo chop ${tech("CHOP")} (${execs("CHOP")}×)\nCruyff ${tech("CRUYFF")} (${execs("CRUYFF")}×)  hook ${tech("HOOK")} (${execs("HOOK")}×)  drag-back ${tech("DRAGBACK")} (${execs("DRAGBACK")}×)   [share of contacts · executions]` +
    `\ngeneric (B4) ${tech("GENERIC")}` + (C.some((c) => c.tech === "GENERIC") ? "  " + Object.entries(C.filter((c) => c.tech === "GENERIC").reduce((m, c) => ((m[c.role] = (m[c.role] || 0) + 1), m), {})).map(([k, v]) => `${k} ${v}×`).join(" · ") : "");
}
function contactsTable(h) {
  const S = V.sim, C = S.contacts.filter((c) => c.t <= h.t + 1e-9).slice(-20).reverse(), sp = (v) => hyp(v[0], v[1]).toFixed(1), dg = (r) => (r == null ? "—" : (wrap(r) / DEG).toFixed(0) + "°"), dirOf = (v) => (hyp(v[0], v[1]) > 0.05 ? hdg(v) : null);
  const key = C.length + ":" + (C[0] ? C[0].n : 0) + ":" + Math.round(h.t * 2); if (key === V.ctKey) return; V.ctKey = key;
  V.dom.ctab.innerHTML = `<tr><th class="l">t s</th><th class="l">technique · role</th><th>foot</th><th class="l">surface</th><th>in m/s @</th><th>out m/s @</th><th>intended</th><th>actual</th></tr>` +
    C.map((c) => `<tr${c.missed ? ' style="color:#ff8a80"' : ""}><td class="l">${c.t.toFixed(2)}</td><td class="l${c.tech !== "CARRY" ? " tech" : ""}">${(LABEL[c.tech] || c.tech)} · ${c.missed ? "MISSED" : c.role}</td><td>${c.F}</td><td class="l">${String(c.surface).toLowerCase()}</td><td>${sp(c.vIn)} ${dg(dirOf(c.vIn))}</td><td>${sp(c.vOut)} ${dg(dirOf(c.vOut))}</td><td>${dg(c.intendedH)}</td><td>${dg(c.actualH)}</td></tr>`).join("");
}
function showKeys(h) { const k = h.keys, el = V.dom.keys; if (!V.replay) { el.style.display = "none"; return; } el.style.display = "block";
  const K = (s, b, w) => `<span class="k${b ? " on" : ""}${w ? " w" : ""}">${s}</span>`;
  const st = k & BITS.STICK && h.stick ? h.stick : null, sv = stickSVG(st ? st.raw : [0, 0], st ? st.v : [0, 0], 104, !!st);
  el.innerHTML = `<div style="font:600 11px -apple-system;color:#8fa49a;margin-bottom:3px">INPUT PRESSED (replay) · mode ${h.mode}</div><div style="display:flex;gap:12px;align-items:center"><div>${K("", 0)}${K("W", k & 1)}${K("", 0)}<br>${K("A", k & 2)}${K("S", k & 4)}${K("D", k & 8)}<br>${K("Shift", k & 16, 1)}${K("Alt", k & 32, 1)}<br>${K("SPRINT", k & BITS.SPRINT_BTN, 1)}${K("WALK", k & BITS.WALK_BTN, 1)}</div><div>${sv}<div style="font:600 11px Menlo;color:#9ad7ff">${st ? inputLine(h).replace(/<[^>]+>/g, "").replace("input ", "") : "stick not used"}</div></div></div>`; }
// the stick drawn (the live one and the replay's): the movement area, the deadzone and zone rings, the camera-forward tick, the direction line, the thumb
function stickSVG(raw, v, size, on) {
  const c = size / 2, R = size * 0.40, cfg = V.stick.cfg, tx = c + raw[0] * R, ty = c - raw[1] * R, m = hyp(v[0], v[1]);
  const ring = (f, col, dash) => `<circle cx="${c}" cy="${c}" r="${(f * R).toFixed(1)}" fill="none" stroke="${col}" stroke-width="1" ${dash ? 'stroke-dasharray="3 3"' : ""}/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block"><circle cx="${c}" cy="${c}" r="${(R + size * 0.08).toFixed(1)}" fill="rgba(20,28,24,0.55)" stroke="rgba(200,230,215,0.35)" stroke-width="1.5"/>` +
    ring(cfg.deadzone, "rgba(255,255,255,0.35)") + ring(cfg.walkTo, "rgba(160,220,255,0.25)", 1) + ring(cfg.jogTo, "rgba(160,220,255,0.25)", 1) + ring(1, "rgba(160,220,255,0.35)") +
    `<line x1="${c}" y1="${(c - R - size * 0.06).toFixed(1)}" x2="${c}" y2="${(c - R - size * 0.015).toFixed(1)}" stroke="rgba(255,212,94,0.8)" stroke-width="2"/>` +
    (on && m > 0 ? `<line x1="${c}" y1="${c}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#ffd45e" stroke-width="2.5"/>` : "") +
    `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="${(size * 0.13).toFixed(1)}" fill="${on ? "rgba(255,212,94,0.88)" : "rgba(220,235,228,0.55)"}" stroke="rgba(0,0,0,0.35)" stroke-width="1"/></svg>`;
}
function drawStick() { const S = V.stick; if (!V.dom.stickPad) return; const on = S.pid != null && V.src === "stick", v = S.v, a = stickAngleDeg(v);
  V.dom.stickPad.innerHTML = stickSVG([S.raw.x, S.raw.y], [v.x, v.y], 210, on);
  const spr = sprintSrc(); V.dom.stickInfo.textContent = on ? (v.m > 0 ? `${a >= 0 ? "+" : ""}${a.toFixed(1)}° · ${v.m.toFixed(2)} · ${spr ? "SPRINT" : stickMode(v.r, S.cfg)}` : "deadzone") : "drag to move"; }
function perfText() { const q = (A, x) => { if (!A.length) return 0; const s = A.slice().sort((a, b) => a - b); return s[min(s.length - 1, Math.floor(x * s.length))]; }, avg = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), P = V.perf;
  return `frame  avg ${avg(P.frame).toFixed(1)}  p95 ${q(P.frame, 0.95).toFixed(1)}  p99 ${q(P.frame, 0.99).toFixed(1)}  worst ${max(0, ...P.frame).toFixed(1)} ms\n` +
    `work   avg ${avg(P.work).toFixed(2)}  p95 ${q(P.work, 0.95).toFixed(2)}  p99 ${q(P.work, 0.99).toFixed(2)}  worst ${max(0, ...P.work).toFixed(2)} ms  (sim ${avg(P.sim).toFixed(2)} / pose ${avg(P.pose).toFixed(2)} / render ${avg(P.render).toFixed(2)})` +
    (V.verify ? `\n${V.verify}` : "\nV: verify determinism (re-simulate this session from its input)"); }
// ── REPLAY ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function bufStart() { return max(0, V.sim.t - 10); }
function startReplay(kind) {
  const S = V.sim, now = S.t, b0 = bufStart(); if (now < 0.3) return; let t0 = b0, t1 = now;
  if (kind === "last") { const A = S.log.actions.filter((a) => a.t >= b0 && a.kind !== "CARRY"), a = A[A.length - 1]; if (a) { t0 = max(b0, a.t - 0.9); t1 = min(now, a.t + 2.8); } else { t0 = max(b0, now - 3.5); } }
  V.replay = { t0, t1, t: t0, rate: kind === "last" ? 0.25 : 0.5, playing: true, wasPaused: V.paused, kind }; V.paused = true; showReplayUI(true); setRateButtons(); V.lastShown = null;
}
function stopReplay() { if (!V.replay) return; V.paused = V.replay.wasPaused; V.replay = null; showReplayUI(false); V.lastShown = null; V.cam = null; setRateButtons(); }
function showReplayUI(on) { if (!V.dom.replay) return; V.dom.replay.style.display = on ? "block" : "none"; if (!on) V.dom.keys.style.display = "none"; V.dom.help.classList.toggle("hidden", on); V.dom.perf.classList.toggle("hidden", on); }
// ── DETERMINISM: re-simulate this session from its recorded input (and live changes) on a fresh simulation; compare everything ─────────────────────
function verifyDeterminism() {
  const S = V.sim, K = S.k, t0 = performance.now(), R = new ENG[V.engine].Sim(V.env, JSON.parse(JSON.stringify(V.o0))), I = S.log.input, E = S.log.events; let ei = 0;
  for (let k = 0; k < K; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") R.setAttrs(e.v); else if (e.kind === "foot") R.setFoot(e.v); else if (R.applyEvent) R.applyEvent(e); }
    const h = I[3 * k]; R.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); }
  R.log.events.length = 0; const same = R.hash === S.hash, cs = JSON.stringify(R.contacts.map((c) => [c.k, c.F, c.surface, c.vOut])) === JSON.stringify(S.contacts.map((c) => [c.k, c.F, c.surface, c.vOut])),
    as = JSON.stringify(R.log.actions.map((a) => [a.t, a.label, a.m])) === JSON.stringify(S.log.actions.map((a) => [a.t, a.label, a.m])), bp = R.ball.p, sp = S.ball.p, bd = hyp(bp[0] - sp[0], bp[1] - sp[1], bp[2] - sp[2]);
  const ok = same && cs && as && bd === 0; V.verify = `determinism ${ok ? "IDENTICAL" : "DIFFERENT"} · ${K} ticks re-simulated in ${(performance.now() - t0).toFixed(0)} ms · hash ${S.hash.toString(16)} / ${R.hash.toString(16)} · contacts ${cs ? "=" : "≠"} · actions ${as ? "=" : "≠"} · ball Δ ${bd.toExponential(1)} m`;
  return { ok, ticks: K, hash: S.hash, hash2: R.hash, contacts: cs, actions: as, ballDelta: bd };
}
// ── THE LOOP ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let hudClock = 0;
function frame(now) {
  if (V.lastNow == null) V.lastNow = now; const dtReal = min(0.1, (now - V.lastNow) / 1000); V.lastNow = now; const w0 = performance.now(); let nSteps = 0;
  if (V.replay) { const R = V.replay; if (R.playing) { R.t = R.t + dtReal * R.rate; if (R.t >= R.t1) { if (R.loop) { R.t = R.t0; V.lastShown = null; V.cam = null; } else { R.t = R.t1; R.playing = false; } } } }
  // (a playtest case is fed every 240 Hz tick from its own trace — exactly the node traces; live input is read once per frame)
  else if (!V.paused) { V.acc += dtReal * V.rate; const wasTest = !!V.test, req = request(); while (V.acc >= DT - 1e-12 && nSteps < 60) { stepSim(V.test || wasTest ? request() : req); V.acc -= DT; nSteps++; } if (nSteps >= 60) V.acc = 0; }   // (SPEED-99-V1: a test ending mid-frame no longer leaves its last request for the rest of the frame)
  else if (V.stepReq) { const req = request(); for (let i = 0; i < V.stepReq; i++) stepSim(req); V.stepReq = 0; }
  const w1 = performance.now(), tShow = V.replay ? Math.round(V.replay.t / DT) * DT : V.sim.t, h = hudAt(tShow);
  const pose = V.show.anim ? V.body.pose(tShow) : null; const w2 = performance.now(); const dg = V.show.diag ? diagOf(pose, h) : null;
  const dtc = V.lastShown == null || abs(tShow - V.lastShown) > 0.25 ? -1 : abs(tShow - V.lastShown); V.lastShown = tShow;
  render(pose, h, dtc); const w3 = performance.now();
  const P = V.perf; P.frame.push(dtReal * 1000); P.sim.push(w1 - w0); P.pose.push(w2 - w1); P.render.push(w3 - w2); P.work.push(w3 - w0); for (const k of Object.keys(P)) if (P[k].length > 1200) P[k].shift();
  if (now - hudClock > 100) { hudClock = now; paceBox(h); if (V.show.hud) updateHud(h); else if (V.show.side) { drawGraph(h); stats(h); contactsTable(h); } showKeys(h); V.dom.perf.textContent = perfText(); diagPanel(dg);
    if (V.replay && V.replay.kind === "case") { const R = V.replay; V.dom.rScrub.value = String(Math.round((R.t - R.t0) / max(1e-6, R.t1 - R.t0) * 1000)); V.dom.rLabel.textContent = `${R.title} · t ${(R.t - R.tz).toFixed(2)} s · ${R.rate}×${R.loop ? " · LOOP" : ""}${R.playing ? "" : " · paused"}`; labTimeline(); }
    else if (V.replay) { const R = V.replay, b0 = bufStart(); V.dom.rScrub.value = String(Math.round((R.t - b0) / max(1e-6, V.sim.t - b0) * 1000)); V.dom.rLabel.textContent = `REPLAY ${R.kind === "last" ? "LAST ACTION" : "BUFFER"} · ${(R.t - V.sim.t).toFixed(2)} s · ${R.rate}×${R.playing ? "" : " (end — Esc: live)"}`; }
    if (SANDBOX) sandboxInfo(); }
  if (!V.external) requestAnimationFrame(frame);
}
// ── UI ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function setRateButtons() { document.querySelectorAll("[data-rate]").forEach((b) => b.classList.toggle("on", +b.dataset.rate === V.rate)); V.dom.bPause.textContent = V.paused && !V.replay ? "▶" : "❚❚"; V.dom.bPause.classList.toggle("on", V.paused && !V.replay); }
// (SPEED-99-V1 playtest blocker: the stick's zones stop at RUN and the top-bar Mode SPRINT was ignored while the stick was in use — the player
// capped at 5.3 m/s. Mode SPRINT (and key 4) IS the sprint lock now; WALK / JOG / RUN release it. One lock state, shown everywhere)
function setMode(m) { if (m === "SPRINT") { setLock(true); return; } V.baseMode = m; setLock(false); }
function setLock(on) { V.btn.lock = !!on; const d = V.dom; if (d.bLock) { d.bLock.classList.toggle("on", V.btn.lock); d.bLock.textContent = V.btn.lock ? "SPRINT LOCK · ON" : "sprint lock (off)"; }
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", V.btn.lock ? b.dataset.mode === "SPRINT" : b.dataset.mode === V.baseMode)); }
// (the sprint actually requested this tick, and by what: the lock, the SPRINT button held, Shift, a preset)
function sprintSrc() { const K = V.keys, sh = K.has("ShiftLeft") || K.has("ShiftRight"); return V.btn.tSprint ? "preset" : V.btn.lock ? "SPRINT LOCK" : V.btn.sprint ? "SPRINT held" : sh ? "Shift held" : null; }
function bindUI() {
  const $ = (id) => document.getElementById(id), d = V.dom; for (const id of ["pacebox", "selRef", "bNextPace", "paceBtns", "bTop", "bBoom", "sprintBanner", "bar", "stage", "hud", "side", "graph", "stats", "ctab", "keys", "replay", "rScrub", "rLabel", "perf", "prov", "bPause", "aBC", "aDRI", "aAGI", "vBC", "vDRI", "vAGI", "selFoot", "selStyle", "selCam", "selCourse", "help", "stickBox", "stickPad", "stickInfo", "dz", "bSprint", "bLock", "bWalk", "ver", "selEng", "layBox", "selSame", "bSame", "bNext", "selTest", "bTest", "diag", "cBall", "bDiag", "bPoke", "bRelease", "bOther"]) d[id] = $(id);
  // THE PACE (SPEED-99-V1): the candidates, the reference runner, same input → the next pace; the ball model / probes behind ⚙
  d.paceBtns.innerHTML = PACE_SW.map((id) => `<button data-pace="${id}" title="${PACE[id].label}">${PRIMARY ? PACE_NAME(id) : id === "CURRENT" ? "CURRENT" : id}</button>`).join("") + (PRIMARY ? "" : `<select id="selEarlier" title="the earlier candidates (V1: A 10.0 m/s, B 10.35, C 10.35)"><option value="">earlier…</option>${PACE_IDS.filter((x) => !PACE_MAIN.includes(x)).map((x) => `<option value="${x}">${x}</option>`).join("")}</select>`);
  { const se = document.getElementById("selEarlier"); if (se) se.onchange = (e) => { if (se.value) { V.pace = se.value; stopTest(); newSim(); } se.value = ""; e.target.blur(); }; }
  document.querySelectorAll("[data-pace]").forEach((b) => (b.onclick = (e) => { V.pace = b.dataset.pace; stopTest(); newSim(); e.target.blur(); }));
  d.selRef.innerHTML = [["off", "off"], ...PACE_MAIN.concat(PACE_IDS.filter((x) => !PACE_MAIN.includes(x))).map((id) => [id, id === "CURRENT" ? "CURRENT pace" : "candidate " + id])].map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  d.selRef.onchange = (e) => { V.refPace = d.selRef.value; stopTest(); newSim(); e.target.blur(); }; d.bNextPace.onclick = (e) => { nextPace(); e.target.blur(); };
  // (S99 MISSION: TECHNIQUES — CORE ⇄ EXPANDED, the same input through the other; the review-only forced family behind ⚙)
  document.querySelectorAll("[data-vocab]").forEach((b) => (b.onclick = (e) => { V.vocab = b.dataset.vocab; stopTest(); newSim(); e.target.blur(); }));
  document.querySelectorAll("[data-carry]").forEach((b) => (b.onclick = (e) => { setCarry(b.dataset.carry); e.target.blur(); }));
  { const bn = document.getElementById("bNextCarry"); if (bn) bn.onclick = (e) => { nextCarry(); e.target.blur(); }; d.cRefOff = document.getElementById("cRefOff"); if (d.cRefOff) d.cRefOff.onchange = (e) => { V.refBallOff = e.target.checked; stopTest(); newSim(); e.target.blur(); }; }
  document.querySelectorAll("[data-phys]").forEach((b) => (b.onclick = (e) => { setPhys(b.dataset.phys); e.target.blur(); }));
  { const bn = document.getElementById("bNextPhys"); if (bn) bn.onclick = (e) => { nextPhys(); e.target.blur(); }; d.cRefPhys = document.getElementById("cRefPhys"); if (d.cRefPhys) d.cRefPhys.onchange = (e) => { V.refPhys = e.target.checked; stopTest(); newSim(); e.target.blur(); };
    const bc = document.getElementById("bCust"); if (bc) bc.onclick = (e) => { const n = (id) => Math.max(1, Math.min(99, Math.round(+document.getElementById(id).value || 99))); V.phys = { id: "CUSTOM", sprint: n("cuS"), accel: n("cuA"), agility: n("cuG"), agiScale: document.getElementById("cuSc").value }; stopTest(); newSim(); e.target.blur(); }; }
  { const bo = document.getElementById("bOtherVocab"); if (bo) bo.onclick = (e) => { otherVocab(); e.target.blur(); }; }
  d.selForce = document.getElementById("selForce"); if (d.selForce) d.selForce.onchange = (e) => { V.forceFam = d.selForce.value || null; if (V.forceFam) V.vocab = "EXPANDED"; stopTest(); newSim(); e.target.blur(); };
  { const bo = $("ballOpts"); if (bo) { bo.append($("model"), $("pokeGrp")); $("model").style.display = ""; $("pokeGrp").style.display = ""; } }
  document.querySelectorAll("[data-model]").forEach((b) => (b.onclick = (e) => { V.engine = "layered"; V.control = b.dataset.model; stopTest(); newSim(); e.target.blur(); }));
  if (d.bOther) d.bOther.onclick = (e) => { otherModel(); e.target.blur(); };
  if (d.bPoke) d.bPoke.onclick = (e) => { poke(); e.target.blur(); };
  if (d.bRelease) d.bRelease.onclick = (e) => { if (V.sim.requestRelease) V.sim.requestRelease(); e.target.blur(); };
  // THE LAYERS: a checkbox each (its B-step and the owner's items in the tooltip), the presets, the engine, same input, the tests
  // (the candidate stack first, then B2 — optional, not developed — then the rejected layers, off)
  const grp = (ids, cap) => `<span class="lab" style="margin-left:6px">${cap}</span>` + ids.map((id) => LAYERS.find((x) => x.id === id)).map((x) => `<label class="lay${REJECTED.includes(x.id) ? " rej" : ""}" title="${x.label} — layer ${x.b}, owner ${x.items}"><input type="checkbox" id="L_${x.id}"><b>${x.b}</b>${x.label}</label>`).join("");
  d.layBox.innerHTML = grp(["c", "support"], "unified") + grp(["generic", "exits", "windups"], "B4 / B5") + grp(["early", "prefFoot", "approach"], "optional B2") + grp(REJECTED, "rejected (off)");
  d.cBall.onchange = (e) => { V.ballOn = e.target.checked; stopTest(); newSim(); e.target.blur(); };
  const setDiag = (on) => { document.body.classList.toggle("diagOn", on); d.bDiag.classList.toggle("on", on); V.show.side = on && $("cSide").checked; d.side.classList.toggle("hidden", !V.show.side); layout(); };
  d.bDiag.onclick = (e) => { setDiag(!document.body.classList.contains("diagOn")); blur(e); }; V.setDiag = setDiag;
  for (const x of LAYERS) $("L_" + x.id).onchange = (e) => { V.layers[x.id] = e.target.checked; stopTest(); newSim(); e.target.blur(); };
  document.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = (e) => { V.engine = "layered"; V.layers = presetLayers(b.dataset.preset); stopTest(); newSim(); blur(e); }));
  d.selEng.onchange = (e) => { V.engine = d.selEng.value; stopTest(); newSim(); blur(e); };
  d.selSame.innerHTML = [["baseline", "locked 88573ef0 (engine)"], ...CHAIN.map((n) => [n, PRESET_LABEL[n]])].map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  d.bSame.onclick = (e) => { sameInput(d.selSame.value); blur(e); }; d.bNext.onclick = (e) => { nextInChain(); blur(e); };
  { const grpT = (fam, cap) => `<optgroup label="${cap}">` + TESTS.filter((x) => (fam === "*" ? !["morning", "favourable", "pace", "s99", "ballon", "phys"].includes(x.fam) : x.fam === fam)).map((x) => `<option value="${x.name}">${x.name}</option>`).join("") + "</optgroup>";
    d.selTest.innerHTML = (PHYS ? grpT("phys", "PHYSICAL RATINGS V1 — the owner's tests (BALL OFF · the reference runner beside: 99 ⇄ 80)") : "") + grpT("ballon", "BALL-ON PACE V1 — races, steering, cuts, tight control (the BALL-OFF twin beside)") + grpT("s99", "S99 mission — sprint carry, cuts, the EXPANDED families (review)") + grpT("pace", "SPEED-99 pace presets (BALL OFF)") + grpT("morning", "the morning playtest cases") + grpT("favourable", "favourable examples (where FULL chooses them)") + grpT("*", "TC-LAYERED-2's report-card traces"); } d.bTest.onclick = (e) => { if (V.test) stopTest(); else startTest(d.selTest.value); blur(e); }; d.selTest.onchange = (e) => e.target.blur();
  const blur = (e) => { if (e && e.target && e.target.blur && e.target.tagName !== "INPUT") e.target.blur(); };
  $("bReset").onclick = (e) => { newSim(); blur(e); };
  document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = (e) => { setMode(b.dataset.mode); blur(e); }));
  document.querySelectorAll("[data-rate]").forEach((b) => (b.onclick = (e) => { V.rate = +b.dataset.rate; if (V.paused && !V.replay) V.paused = false; setRateButtons(); blur(e); }));
  d.bPause.onclick = (e) => { if (V.replay) V.replay.playing = !V.replay.playing; else V.paused = !V.paused; setRateButtons(); blur(e); };
  $("bStep").onclick = (e) => { if (V.replay) { V.replay.playing = false; V.replay.t = min(V.replay.t1, V.replay.t + 4 * DT); } else { V.paused = true; V.stepReq = 4; } setRateButtons(); blur(e); };
  $("bReplay").onclick = (e) => { startReplay("last"); blur(e); }; $("bBuffer").onclick = (e) => { startReplay("buffer"); blur(e); };
  $("rSlow").onclick = () => { if (V.replay) V.replay.rate = 0.25; }; $("rHalf").onclick = () => { if (V.replay) V.replay.rate = 0.5; }; $("rOne").onclick = () => { if (V.replay) V.replay.rate = 1; };
  $("rPlay").onclick = () => { if (V.replay) { if (!V.replay.playing && V.replay.t >= V.replay.t1 - 1e-6) V.replay.t = V.replay.t0; V.replay.playing = !V.replay.playing; } };
  $("rLive").onclick = (e) => { stopReplay(); blur(e); };
  d.rScrub.oninput = () => { if (!V.replay) return; if (V.replay.kind === "case") { const R = V.replay; R.t = R.t0 + (+d.rScrub.value / 1000) * (R.t1 - R.t0); R.playing = false; return; } const b0 = bufStart(); V.replay.t = b0 + (+d.rScrub.value / 1000) * (V.sim.t - b0); V.replay.t0 = b0; V.replay.t1 = V.sim.t; V.replay.playing = false; };
  d.selCam.onchange = (e) => { V.camId = e.target.value; V.cam = null; V.lastShown = null; blur(e); };
  d.selCourse.onchange = (e) => { V.course = makeCourse(e.target.value); blur(e); };
  d.selFoot.onchange = (e) => { V.sim.setFoot(e.target.value); blur(e); };
  d.selStyle.onchange = (e) => blur(e);
  for (const [k, id] of [["bc", "aBC"], ["dri", "aDRI"], ["agi", "aAGI"]]) d[id].oninput = () => { d["v" + id.slice(1)].textContent = d[id].value; V.sim.setAttrs({ [k]: +d[id].value }); };
  for (const [id, key] of [["cHud", "hud"], ["cSide", "side"], ["cProt", "prot"], ["cBody", "body"], ["cAnim", "anim"], ["cDiag", "diag"]]) $(id).onchange = (e) => { V.show[key] = e.target.checked; d.hud.classList.toggle("hidden", !V.show.hud); d.side.classList.toggle("hidden", !V.show.side); };
  // THE STICK (pointer events: mouse, trackpad, pen, touch): the pointer is captured while it drags — leaving the circle never releases it; the
  // release returns the thumb to the centre (movement = zero). The thumb's travel is the circle's 40 % radius in the drawing (stickSVG)
  const S = V.stick, pad = d.stickPad;
  const stickAt = (e) => { const b = pad.getBoundingClientRect(), R = b.width * 0.40; let x = (e.clientX - (b.left + b.width / 2)) / R, y = -(e.clientY - (b.top + b.height / 2)) / R; const r = hyp(x, y); if (r > 1) { x /= r; y /= r; }
    S.raw = { x, y }; S.v = stickVector(x, y, S.cfg.deadzone); drawStick(); };
  pad.addEventListener("pointerdown", (e) => { if (V.test) stopTest(); if (S.pid != null) return; e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (_) {} S.pid = e.pointerId; V.src = "stick"; if (V.replay) stopReplay(); stickAt(e); });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId !== S.pid) return; e.preventDefault(); V.src = "stick"; stickAt(e); });
  const stickEnd = (e) => { if (e.pointerId !== S.pid) return; S.pid = null; S.raw = { x: 0, y: 0 }; S.v = stickVector(0, 0, S.cfg.deadzone); drawStick(); };
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(ev, stickEnd);
  // SPRINT / WALK: held (each its own pointer — touch can hold SPRINT while the other finger steers); the sprint lock keeps sprint without a hand
  const hold = (el, key) => { let pid = null; el.addEventListener("pointerdown", (e) => { e.preventDefault(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (_) {} V.btn[key] = true; el.classList.add("on"); });
    const up = (e) => { if (e.pointerId !== pid) return; pid = null; V.btn[key] = false; el.classList.remove("on"); }; for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, up); };
  hold(d.bSprint, "sprint"); hold(d.bWalk, "walk");
  d.bLock.addEventListener("click", (e) => { setLock(!V.btn.lock); d.bLock.blur(); }); setLock(false);
  if (d.bTop) d.bTop.onclick = (e) => { startTest(TOP_NAME); if (V.ref) { V.camId = "pair"; d.selCam.value = "pair"; V.cam = null; V.lastShown = null; } blur(e); };
  if (d.bBoom) d.bBoom.onclick = (e) => { startTest(BOOM_NAME); V.camId = "explosion"; d.selCam.value = "explosion"; V.cam = null; V.lastShown = null; blur(e); };
  d.dz.onchange = d.dz.oninput = () => { const x = clamp(+d.dz.value || 0, 0, 0.3); S.cfg.deadzone = x; S.v = stickVector(S.raw.x, S.raw.y, x); drawStick(); };
  const code = (e) => e.code;
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" && e.target.type === "text")) return; const c = code(e);
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight"].includes(c)) { V.keys.add(c); e.preventDefault(); if (/^Key[WASD]$/.test(c)) { if (!e.repeat) { V.src = "keys"; stopTest(); } if (V.replay) stopReplay(); } return; }
    if (e.repeat) return;
    if (c === "Space") { if (V.replay) V.replay.playing = !V.replay.playing; else V.paused = !V.paused; setRateButtons(); e.preventDefault(); }
    else if (c === "Period") { if (V.replay) { V.replay.playing = false; V.replay.t = min(V.replay.t1, V.replay.t + (e.shiftKey ? DT : 4 * DT)); } else { V.paused = true; V.stepReq = e.shiftKey ? 1 : 4; } setRateButtons(); }
    else if (c === "Comma") { if (V.replay) { V.replay.playing = false; V.replay.t = max(V.replay.t0, V.replay.t - (e.shiftKey ? DT : 4 * DT)); } }
    else if (c === "KeyR") newSim();
    else if (c === "KeyE" && (LAB || SANDBOX)) { if (LAB) labRequestLive(); else { const it = intentOf(V.skillSel || "CRUYFF"); if (it) V.sim.requestSkill(it); } }
    else if (c === "KeyQ") { if (V.replay) stopReplay(); else startReplay("last"); }
    else if (c === "KeyB") { if (V.replay) stopReplay(); else startReplay("buffer"); }
    else if (c === "Escape") stopReplay();
    else if (c === "KeyH") { V.show.hud = !V.show.hud; $("cHud").checked = V.show.hud; d.hud.classList.toggle("hidden", !V.show.hud); }
    else if (c === "KeyC") { const o = ["follow", "pair", "explosion", "touchline", "top", "side"], i = (o.indexOf(V.camId) + 1) % o.length; V.camId = o[i]; d.selCam.value = V.camId; V.cam = null; V.lastShown = null; }
    else if (c === "KeyV") verifyDeterminism();
    else if (c === "KeyX") nextInChain();
    else if (c === "KeyM") otherModel();
    else if (c === "KeyN") { if (PHYS) nextPhys(); else if (BALLON) nextCarry(); else nextPace(); }
    else if (c === "KeyT") otherVocab();   // (S99 MISSION: the same input → the other techniques)
    else if (c === "KeyP") poke();
    else if (c === "KeyK") { if (V.sim.requestRelease) V.sim.requestRelease(); }
    else if (/^Digit[1-4]$/.test(c)) setMode(MODES[+c.slice(5) - 1]);
  });
  window.addEventListener("keyup", (e) => { V.keys.delete(code(e)); if (code(e).startsWith("Alt")) e.preventDefault(); });
  window.addEventListener("blur", () => { V.keys.clear(); V.btn.sprint = V.btn.walk = false; d.bSprint.classList.remove("on"); d.bWalk.classList.remove("on"); if (S.pid != null) { S.pid = null; S.raw = { x: 0, y: 0 }; S.v = stickVector(0, 0, S.cfg.deadzone); drawStick(); } });
  drawStick();
}
// ═══ THE DRIBBLING LAB ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const ALL_CASES = CASES.concat(CHAINS);
function labInit(q) { const L = document.getElementById("labList"); if (!L) return; V.labLoop = true; V.labRate = 1; V.labDiag = false;
  const badge = (x, k) => `<span class="b ${k}">${esc(x)}</span>`, byTech = {}; for (const c of CASES) (byTech[c.tech] = byTech[c.tech] || []).push(c);
  let html = ""; for (const fam of FAMILIES) { const items = META.filter((m) => m.family === fam); if (!items.length) continue; html += `<h3>${esc(fam)}</h3>`;
    for (const m of items) { const cs = byTech[m.id] || [];
      html += `<div class="card" data-tech="${m.id}"><div class="nm">${esc(m.name)} ${badge(m.status, m.status.toLowerCase())} ${badge(m.mode, "mode")}</div><div class="pp">${esc(m.purpose)}</div><div class="en">entry: ${esc(m.entry)} · exit: ${esc(m.exit)}${m.blocker ? `<br><span class="blk">BLOCKER: ${esc(m.blocker)}</span>` : ""}</div>`;
      html += `<div class="vs">${cs.length ? cs.map((c) => `<button class="${c.variant === "NORMAL" ? "play" : ""}" data-case="${ALL_CASES.indexOf(c)}" title="${esc(c.title)}">${c.variant === "NORMAL" ? "▶ PLAY" : esc(c.variant)}</button>`).join("") : `<i>no curated replay (${esc(m.status)})</i>`}${cs.some((c) => c.variant === "NORMAL") ? `<button data-pair="${ALL_CASES.indexOf(cs.find((c) => c.variant === "NORMAL"))}" title="left and right versions side by side, synchronised">L | R</button>` : ""}${m.kind !== "carry" && cs.length ? `<button data-try="${m.id}" title="play it yourself: the stick and REQUEST (E)">TRY</button>` : ""}</div></div>`; } }
  html += `<h3>CHAINS</h3>` + CHAINS.map((c) => `<div class="card chain"><div class="nm">${esc(c.name)}</div><div class="vs"><button class="play" data-case="${ALL_CASES.indexOf(c)}">▶ PLAY</button><button data-mir="${ALL_CASES.indexOf(c)}">MIRROR</button></div></div>`).join("");
  L.innerHTML = html;
  L.querySelectorAll("[data-case]").forEach((b) => (b.onclick = (e) => { labPlay(ALL_CASES[+b.dataset.case], "single"); e.target.blur(); }));
  L.querySelectorAll("[data-mir]").forEach((b) => (b.onclick = (e) => { labPlay(ALL_CASES[+b.dataset.mir], "mirror"); e.target.blur(); }));
  L.querySelectorAll("[data-pair]").forEach((b) => (b.onclick = (e) => { labPlay(ALL_CASES[+b.dataset.pair], "pair"); e.target.blur(); }));
  L.querySelectorAll("[data-try]").forEach((b) => (b.onclick = (e) => { labTry(b.dataset.try); e.target.blur(); }));
  const $ = (id) => document.getElementById(id);
  const tg = (id, key, after) => { const el = $(id); if (!el) return; el.onclick = (e) => { V[key] = !V[key]; el.classList.toggle("on", !!V[key]); if (after) after(); e.target.blur(); }; el.classList.toggle("on", !!V[key]); };
  tg("bLoop", "labLoop", () => { if (V.replay) V.replay.loop = V.labLoop; }); tg("bLabDiag", "labDiag");
  for (const r of [1, 0.5, 0.25]) { const el = $("bRate" + String(r).replace(".", "")); if (el) el.onclick = (e) => { V.labRate = r; if (V.replay) { V.replay.rate = r; V.replay.playing = true; } document.querySelectorAll("[id^=bRate]").forEach((x) => x.classList.toggle("on", x === el)); e.target.blur(); }; }
  if ($("bRestart")) $("bRestart").onclick = (e) => { if (V.replay && V.replay.kind === "case") { V.replay.t = V.replay.t0; V.replay.playing = true; V.lastShown = null; V.cam = null; } e.target.blur(); };
  if ($("bMirror")) $("bMirror").onclick = (e) => { if (V.labCase) labPlay(V.labCase, V.labMode === "mirror" ? "single" : "mirror"); e.target.blur(); };
  if ($("bPairNow")) $("bPairNow").onclick = (e) => { if (V.labCase) labPlay(V.labCase, V.labMode === "pair" ? "single" : "pair"); e.target.blur(); };
  if ($("bAutoForce")) $("bAutoForce").onclick = (e) => { const c = V.labCase; if (!c) return; if (c.intents && c.intents.length) labPlay(Object.assign({}, c, { intents: [], variant: "AUTO", title: "AUTO — the same state, no request: " + c.title }), "single"); else { const f = CASES.find((x) => x.tech === c.tech && x.variant === "NORMAL"); if (f) labPlay(f, "single"); } e.target.blur(); };
  if ($("bReqLive")) $("bReqLive").onclick = (e) => { labRequestLive(); e.target.blur(); };
  // (CHAIN MODE: at the replay's current moment, request another technique toward an exit — the case re-simulated from its exact start with
  // that intent added at that tick: a technique → technique transition, never a queued clip)
  if ($("selBranch")) { $("selBranch").innerHTML = META.filter((m) => m.kind !== "carry" && m.kind !== "none").map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join(""); $("selBranch").value = "OUTSIDE_CUT"; }
  if ($("bBranch")) $("bBranch").onclick = (e) => { labBranch(); e.target.blur(); };
  const first = +(q.get("case") || 0); labPlay(ALL_CASES[Math.max(0, Math.min(ALL_CASES.length - 1, first))] || CASES[0], q.get("mode") || "single"); }
// one curated case: simulated at once from its exact initial conditions (the same runner as node), then the deterministic replay of its clip
function labPlay(c, mode) { stopTest(); V.labCase = c; V.labMode = mode; V.live = null; const mirror = mode === "mirror", o0 = caseOpts(c, mirror); V.engine = "layered";
  newSim(o0); const r = runCaseOn(V.sim, c, mirror); V.stickLog = new Array(V.sim.k * 4).fill(0); V.labSum = summarize(V.sim, r.t0); V.labT0 = r.t0;
  V.ref = null; V.refBody = null; V.refBall = false;
  if (mode === "pair") { const o1 = caseOpts(c, true); o1.start = { P: [o0.start.P[0], o0.start.P[1] + 4.0], h: 0 }; o1.layers = Object.assign({}, V.layers); V.ref = new ENG.layered.Sim(V.env, o1); runCaseOn(V.ref, c, true); V.refBody = new ENG.layered.Body(V.env, V.ref); V.refBall = true; V.refSum = summarize(V.ref, r.t0); }
  // (the defender marker where the move's purpose is: [ahead, right] from the player at t = 0 — visual only)
  const st = V.sim.stateAt(r.t0), m = mirror ? -1 : 1, cones = []; if (c.def) { const a = c.def[0], l = m * c.def[1]; cones.push([st.P[0] + a * Math.cos(st.h) - l * Math.sin(st.h), st.P[1] + a * Math.sin(st.h) + l * Math.cos(st.h)]); }
  if (mode === "pair" && c.def) { const rs = V.ref.stateAt(r.t0), a = c.def[0], l = -c.def[1]; cones.push([rs.P[0] + a * Math.cos(rs.h) - l * Math.sin(rs.h), rs.P[1] + a * Math.sin(rs.h) + l * Math.cos(rs.h)]); }
  V.course = cones.length ? { id: "lab", cones, lines: [], labels: [] } : null;
  V.camId = mode === "pair" ? "pair" : V.labCam || "follow"; if (V.dom.selCam) V.dom.selCam.value = V.camId; V.cam = null; V.lastShown = null;
  V.replay = { t0: r.clip[0], t1: r.clip[1], t: r.clip[0], tz: r.t0, rate: V.labRate || 1, playing: true, wasPaused: false, kind: "case", loop: V.labLoop !== false, title: (mirror ? "MIRROR · " : mode === "pair" ? "L | R · " : "") + (c.title || c.name) };
  V.paused = true; showReplayUI(true); setRateButtons(); labInfoBox(); }
function labBranch() { const c = V.labCase, R = V.replay; if (!c || !R) return; const tRel = Math.round((R.t - V.labT0) / DT) * DT, id = document.getElementById("selBranch").value, ang = +document.getElementById("brAng").value || 0, mode = document.getElementById("brMode").value || c.mode;
  const base = c.stick ? c.stick.filter((x) => x[0] < tRel) : [[0, c.ang, c.mode]], d = Object.assign({}, c, { variant: "CHAIN", title: `BRANCH: ${c.title || c.name} → ${META_BY_ID[id] ? META_BY_ID[id].name : id} at ${tRel.toFixed(2)} s`,
    intents: (c.intents || []).filter((x) => x.t < tRel).concat([{ t: tRel, id }]), stick: base.concat([[tRel, ang, mode]]), dur: Math.max(c.dur, tRel + 2.2) });
  labPlay(d, V.labMode === "pair" ? "single" : V.labMode || "single"); }
// the info box: the technique, the request → result, the phases, the contacts
function labInfoBox() { const el = document.getElementById("labInfo"); if (!el || !V.labCase) return; const c = V.labCase, m = META_BY_ID[c.tech], S = V.labSum;
  const sk = S.skills.map((x) => `<div class="req">REQUESTED <b>${esc(x.intent)}</b> → <b class="${x.result === "PLAYED" ? "ok" : "bad"}">${esc(x.result)}</b>${x.result !== "PLAYED" ? ` · ALTERNATIVE <b>${esc(x.alt)}</b><br>REASON: ${esc(Object.entries(x.rej || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k).join(" · ") || "—")}` : x.tPlayed != null ? ` · decisive at ${x.tPlayed.toFixed(2)} s` : ""}</div>`).join("") || `<div class="req">AUTO — no request: B4 chose from the same state</div>`;
  const ph = S.phases.map((p) => `<tr><td class="l">${esc(p.label)}</td><td>${p.tPrep != null ? p.tPrep.toFixed(2) : "—"}</td><td>${p.tCommit != null ? p.tCommit.toFixed(2) : "—"}</td><td>${p.tDecisive != null ? p.tDecisive.toFixed(2) : "—"}</td><td>${p.tControl != null ? p.tControl.toFixed(2) : "—"}</td><td>${p.tNext != null ? p.tNext.toFixed(2) : "—"}</td></tr>`).join("");
  el.innerHTML = `<div class="tt">${esc(c.title || c.name)}</div>${m ? `<div class="mt">${esc(m.family)} · ${esc(m.status)} · ${esc(m.mode)} · primitives ${esc(m.prim)}</div>` : ""}${sk}
    <table><tr><th class="l">action</th><th>prep</th><th>commit</th><th>decisive</th><th>control</th><th>next</th></tr>${ph || `<tr><td class="l" colspan="6">the carry only</td></tr>`}</table>
    <div class="ct">${S.contacts.filter((x) => x.t >= -0.05).slice(0, 7).map((x) => `${x.t.toFixed(2)} ${x.F} ${x.surface} <i>${esc(x.role)}</i>`).join("<br>")}</div>
    <div class="mt">possession: ${S.exits.length ? "EXITS " + esc(S.exits.join(", ")) : "kept (CONTROLLED)"} · ball ≤ ${S.sepMax.toFixed(2)} m from the body${m && m.diff ? ` · difficulty: tech ${m.diff.tech} · max useful entry ${m.diff.vmax} m/s · support ${m.diff.support} · weak foot ${m.diff.weak} · prep ${m.diff.prep} · chain ${m.diff.chain} · deceive ${m.diff.deceive}` : ""}</div>
    <canvas id="labTL" width="560" height="34"></canvas>`; }
// the phase timeline under the info box: preparation · commitment · decisive · control returned · next action, and the replay's cursor
function labTimeline() { const cv = document.getElementById("labTL"); if (!cv || !V.replay || !V.labSum) return; const g = cv.getContext("2d"), R = V.replay, W = cv.width, H = cv.height, X = (t) => ((t - R.t0) / (R.t1 - R.t0)) * W;
  g.clearRect(0, 0, W, H); g.fillStyle = "#26302b"; g.fillRect(0, 12, W, 8);
  for (const p of V.labSum.phases) { const z = V.labT0; const seg = (a, b, col) => { if (a == null || b == null) return; g.fillStyle = col; g.fillRect(X(z + a), 12, Math.max(2, X(z + b) - X(z + a)), 8); };
    seg(p.tPrep != null ? p.tPrep : p.tSel, p.tCommit, "#5b7a9a"); seg(p.tCommit, p.tDecisive, "#ffb36b"); seg(p.tDecisive, p.tControl, "#ff8a80");
    for (const [tt, col, lab] of [[p.tDecisive, "#ff8a80", "D"], [p.tControl, "#8dffa6", "C"], [p.tNext, "#9ad7ff", "N"]]) if (tt != null) { g.fillStyle = col; g.fillRect(X(z + tt) - 1, 4, 2, 24); g.font = "9px Menlo"; g.fillText(lab, X(z + tt) + 2, 10); } }
  g.fillStyle = "#ffd45e"; g.fillRect(X(R.t) - 1, 0, 2, H); }
// diagnostics (off by default): the ball's and the body's paths over the clip, every contact with its surface and foot
function labOverlay(c, vw, dpr, h) { const ctx = V.ov2d, P = (q) => proj3(c, vw, dpr, q), R = V.replay; if (!R) return; const S = V.sim;
  const path = (f, col) => { ctx.beginPath(); let first = true; for (let t = R.t0; t <= R.t1; t += 0.02) { const p = P(f(t)); if (!p) { first = true; continue; } if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = 1.5 * dpr; ctx.stroke(); };
  path((t) => { const b = S.ballTrack(t).p; return [b[0], 0.03, -b[1]]; }, "rgba(255,255,255,0.75)"); path((t) => { const p = S.stateAt(t).P; return [p[0], 0.02, -p[1]]; }, "rgba(154,215,255,0.7)");
  for (const k of S.contacts) { if (k.t < R.t0 || k.t > R.t1) continue; const p = P([k.ball[0], 0.12, -k.ball[1]]); if (!p) continue; ctx.fillStyle = k.missed ? "#ff6b5e" : k.decisive ? "#ffd45e" : "#7df0ff"; ctx.beginPath(); ctx.arc(p[0], p[1], 4 * dpr, 0, 6.283); ctx.fill(); ctx.font = `${10 * dpr}px Menlo`; ctx.fillText(`${k.F} ${k.surface}${k.decisive ? " ★" : ""}`, p[0] + 6 * dpr, p[1] - 4 * dpr); } }
// TRY IT LIVE: the case's entry, then the joystick is yours — REQUEST (E) sends this technique's intent (its exit = the stick)
function labTry(id) { V.labCase = null; stopReplay(); V.live = { id }; V.course = null; const c = CASES.find((x) => x.tech === id) || CASES[0]; newSim(caseOpts(c)); V.paused = false; setRateButtons(); const el = document.getElementById("labInfo"); const m = META_BY_ID[id];
  if (el) el.innerHTML = `<div class="tt">TRY IT LIVE · ${esc(m ? m.name : id)}</div><div class="mt">drag the stick (or WASD + Shift), then press <b>E</b> / REQUEST — the technique's exit is the stick's direction. The resolver decides foot, entry and timing from the live state, or REJECTS it with the reason.</div><div id="liveRes" class="req"></div>`; }
function labRequestLive() { const id = V.live && V.live.id; if (!id) return; const it = intentOf(id); if (it) V.sim.requestSkill(it); }
// ═══ THE JOYSTICK SANDBOX: the manual skill palette (each a TECHNICAL INTENT; the stick is its exit) and the last request's outcome ═════════════
function sandboxInit() { const box = document.getElementById("skillBox"); if (!box) return; const pal = META.filter((m) => m.mode !== "AUTO" && m.kind !== "carry" && m.kind !== "none" && m.status !== "EXPERIMENTAL" || m.id === "ROULETTE");
  box.innerHTML = `<span class="lab">MANUAL SKILLS (exit = the stick)</span>` + pal.map((m, i) => `<button data-skill="${m.id}" title="${esc(m.purpose)} · ${esc(m.status)} · ${esc(m.mode)}">${esc(m.name.replace(/ \(.*\)/, ""))}</button>`).join("") + `<label title="the analog feint: established line → a brief fake → back the other way"><input id="cFeint" type="checkbox" checked>analog feints</label>`;
  box.querySelectorAll("[data-skill]").forEach((b) => (b.onclick = (e) => { V.skillSel = b.dataset.skill; const it = intentOf(b.dataset.skill); if (it) V.sim.requestSkill(it); box.querySelectorAll("[data-skill]").forEach((x) => x.classList.toggle("on", x === b)); e.target.blur(); }));
  const cf = document.getElementById("cFeint"); if (cf) cf.onchange = (e) => { V.noFeint = !e.target.checked; newSim(); e.target.blur(); }; V.skillSel = "CRUYFF"; }
function sandboxInfo() { const el = document.getElementById("skillRes"); if (!el || !V.sim.log) return; const L = V.sim.log.skill, S = V.sim.skill, f = V.sim.log.feints.filter((x) => x.confirmed).slice(-1)[0];
  const last = S && !S.done ? `${S.intent}: ${S.state || "PENDING"}…` : L.length ? (() => { const x = L[L.length - 1]; return `${x.intent} → ${x.result}${x.result !== "PLAYED" ? ` (${Object.keys(x.rej || {}).slice(0, 1).join("")}) → ${x.alt}` : ""}`; })() : "—";
  el.textContent = `last request: ${last}${f ? ` · last analog feint ${(V.sim.t - f.t).toFixed(1)} s ago (${f.dev}° for ${f.dur} s)` : ""}`; }
async function boot() {
  const q = new URLSearchParams(location.search); if (PRIMARY) { V.pace = "D38"; V.ballOn = true; V.control = "CONTROLLED"; V.refPace = "off"; V.layers = presetLayers("FULL"); V.vocab = window.S99_VOCAB || "EXPANDED"; } if (BALLON) { V.carry = "B"; V.refBallOff = true; if (q.get("carry") && CARRY_SW.includes(q.get("carry"))) { V.carry = q.get("carry"); V.ballOn = V.carry !== "OFF"; } if (q.get("ref") === "0") V.refBallOff = false; } if (q.get("vocab") === "CORE" || q.get("vocab") === "EXPANDED") V.vocab = q.get("vocab");
  if (LAB || SANDBOX) { V.refBallOff = false; V.carry = "B"; V.ballOn = true; V.control = "CONTROLLED"; V.vocab = "EXPANDED"; V.pace = "D38"; V.layers = presetLayers("FULL"); }
  if (PHYS) { V.ballOn = false; V.lastScale = "B"; V.refPhys = q.get("ref") !== "0"; V.phys = physOf(PHYS_IDS.includes(q.get("phys")) ? q.get("phys") : "PHYSICAL-80-B"); if (V.phys.id !== "PHYSICAL-99") V.lastScale = V.phys.agiScale; } bindUI(); V.cv = document.getElementById("gl"); V.ovc = document.getElementById("ov"); V.ov2d = V.ovc.getContext("2d");
  const gl = V.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.getElementById("loading").textContent = "WebGL2 unavailable"; return; }
  V.gl = gl; V.R = { gl }; V.ground = groundProg(gl); V.ballProg = ballProg(gl); V.cone = coneProg(gl);
  const [colliders, baked, ent] = await Promise.all([fetch("dribble1/d1_colliders.json").then((r) => r.json()), fetch("tc_baseline_88573ef0/pt_baked.json").then((r) => r.json()), W.ofCharLoad(q.get("char") || "vinicius")]);
  V.ent = ent; const E = W.RUN1_V13; V.env = { E, M4, skel: ent.skel, colliders, baked, body: E.r1Body(ent.skel) };
  if (q.get("dz") != null) { V.dom.dz.value = q.get("dz"); V.dom.dz.oninput(); }
  if (q.get("foot")) V.dom.selFoot.value = q.get("foot"); if (q.get("cam")) { V.camId = q.get("cam"); V.dom.selCam.value = V.camId; }
  for (const [k, id] of [["bc", "aBC"], ["dri", "aDRI"], ["agi", "aAGI"]]) if (q.get(k)) { V.dom[id].value = q.get(k); V.dom["v" + id.slice(1)].textContent = q.get(k); }
  if (q.get("engine") === "baseline") V.engine = "baseline"; if (q.get("preset") && PRESETS[q.get("preset")]) V.layers = presetLayers(q.get("preset")); if (q.get("ball") === "0") V.ballOn = false; if (q.get("ball") === "1" && !PHYS) V.ballOn = true; if (q.get("pace") && PACE[q.get("pace")]) V.pace = q.get("pace"); if (q.get("ref") && (q.get("ref") === "off" || PACE[q.get("ref")])) V.refPace = q.get("ref"); if (q.get("model") === "FREE" || q.get("model") === "CONTROLLED") V.control = q.get("model");
  if (q.get("diag") === "1") V.setDiag(true);
  if (q.get("layers")) for (const k of q.get("layers").split(",")) if (k in V.layers) V.layers[k] = true;
  newSim(); document.getElementById("loading").remove(); V.ready = true;
  if (LAB) labInit(q); if (SANDBOX) sandboxInit();
  if (q.get("external") === "1") V.external = true; else requestAnimationFrame(frame);
}
// the automation / test surface (puppeteer: performance, determinism, scripted input, captures)
W.PT = { ready: () => V.ready, V,
  perf: () => { const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s[min(s.length - 1, Math.floor(x * s.length))] || 0; }, avg = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), o = {};
    for (const [k, A] of Object.entries(V.perf)) o[k] = { n: A.length, avg: avg(A), p95: q(A, 0.95), p99: q(A, 0.99), worst: max(0, ...A) }; o.replanCpu = { n: V.sim.cpu.replan.length, avg: avg(V.sim.cpu.replan), worst: max(0, ...V.sim.cpu.replan) }; return o; },
  resetPerf: () => { for (const k of Object.keys(V.perf)) V.perf[k].length = 0; },
  verify: () => verifyDeterminism(), reset: () => newSim(), keys: (down, up) => { for (const k of up || []) V.keys.delete(k); for (const k of down || []) V.keys.add(k); },
  set: (o) => { if (o.cam) { V.camId = o.cam; V.dom.selCam.value = o.cam; V.cam = null; } if (o.course != null) { V.course = makeCourse(o.course); V.dom.selCourse.value = o.course; } if (o.show) { Object.assign(V.show, o.show); for (const [id, key] of [["cHud", "hud"], ["cSide", "side"], ["cProt", "prot"], ["cBody", "body"], ["cAnim", "anim"]]) document.getElementById(id).checked = !!V.show[key]; V.dom.hud.classList.toggle("hidden", !V.show.hud); V.dom.side.classList.toggle("hidden", !V.show.side); } if (o.mode) setMode(o.mode); if (o.rate) V.rate = o.rate; if (o.paused != null) V.paused = o.paused; return true; },
  record: () => ({ o0: V.o0, engine: V.engine, layers: V.engine === "layered" ? Object.assign({}, V.layers) : null, input: Array.from(V.sim.log.input), events: V.sim.log.events, hash: V.sim.hash, k: V.sim.k, stick: Array.from(V.stickLog), deadzone: V.stick.cfg.deadzone }),
  engine: (e) => { if (e && ENG[e] && e !== V.engine) { V.engine = e; newSim(); } return V.engine; }, preset: (n) => { if (n) { V.engine = "layered"; V.layers = presetLayers(n); newSim(); } return configName(V.engine, V.layers); },
  layers: (o) => { if (o) { V.engine = "layered"; V.layers = Object.assign({}, TL.LAYERS_OFF, o); newSim(); } return Object.assign({}, V.layers); }, same: (target) => sameInput(target), next: () => nextInChain(), load: (rec, eng, layers) => loadRec(rec, eng, layers),
  ball: (on) => { if (on != null) { V.ballOn = !!on; newSim(); } return V.ballOn; }, model: (m) => { if (m) { V.engine = "layered"; V.control = m; newSim(); } return V.control; }, other: () => otherModel(),
  pace: (id) => { if (id && PACE[id]) { V.engine = "layered"; V.pace = id; newSim(); } return V.pace; }, vocab: (v) => { if (v) { V.vocab = v; newSim(); } return V.vocab || "CORE"; }, carry: (c) => { if (c) setCarry(c); return V.ballOn ? V.carry : "OFF"; }, phys: (id) => { if (id) setPhys(id); return V.phys ? Object.assign({}, V.phys) : null; }, nextPhys: () => nextPhys(), redir: () => (V.redir ? Object.assign({}, V.redir) : null), demand: () => V.demandNow, refPhys: () => (V.ref && V.ref.o.phys ? Object.assign({}, V.ref.o.phys) : null), nextCarry: () => nextCarry(), ctl: () => (V.sim.ctl ? Object.assign({}, V.sim.ctl) : null), otherVocab: () => otherVocab(), force: (f) => { if (f !== undefined) { V.forceFam = f || null; if (f) V.vocab = "EXPANDED"; newSim(); } return V.forceFam; }, refPace: (id) => { if (id) { V.refPace = id; newSim(); } return V.refPace; }, nextPace: () => nextPace(),
  run: () => (V.run ? JSON.parse(JSON.stringify(V.run)) : null),
  // (the authoritative movement from the first tick the request had a direction: per tick the request (h, mode), the speed, the distance)
  traceFromPress: (dur = 10) => { const S = V.sim, I = S.log.input; let k0 = -1; for (let k = 0; k < I.length / 3; k++) if (I[3 * k] !== -99) { k0 = k; break; } if (k0 < 0) return null;
    const P0 = S.stateAt(k0 * DT).P, out = { k0, h: [], mode: [], s: [], d: [] }, n = Math.min(Math.round(dur / DT), I.length / 3 - k0); for (let i = 0; i < n; i++) { const k = k0 + i, st = S.stateAt((k + 1) * DT); out.h.push(I[3 * k]); out.mode.push(MODES[I[3 * k + 1]]); out.s.push(st.s); out.d.push(hyp(st.P[0] - P0[0], st.P[1] - P0[1])); } return out; }, refState: () => (V.ref ? { t: V.ref.t, hash: V.ref.hash, P: V.ref.stateAt(V.ref.t).P, s: V.ref.stateAt(V.ref.t).s } : null),
  poke: () => poke(), release: () => (V.sim.requestRelease ? V.sim.requestRelease() : false), poss: () => (V.sim.possInfo ? V.sim.possInfo() : null), possLog: () => (V.sim.poss ? V.sim.poss.log : []), diagnostics: (on) => { if (on != null) V.setDiag(!!on); return document.body.classList.contains("diagOn"); },
  test: (name) => { if (name) startTest(name); else stopTest(); return !!V.test; }, diag: () => ({ now: V.diag.prev, n: V.diag.hist.length }),
  // the stick as a test would hold it: raw (x right, y up) in −1 … 1, null = released
  stick: (x, y) => { const S = V.stick; if (x == null) { S.pid = null; S.raw = { x: 0, y: 0 }; } else { S.pid = -1; V.src = "stick"; S.raw = { x, y }; } S.v = stickVector(S.raw.x, S.raw.y, S.cfg.deadzone); drawStick(); return S.v; },
  request: () => { const r = request(); return { h: r.h, mode: r.mode, keys: r.keys, frameH: V.src === "stick" ? V.stick.latch : V.latch.h, src: V.src }; },
  replay: (kind) => startReplay(kind || "last"), live: () => stopReplay(), seek: (t) => { if (V.replay) { V.replay.t = t; V.replay.playing = false; } },
  // drive one external frame (external=1): advance the simulation dt seconds with the given keys, then draw
  tick: (dt, keys) => { if (keys) { V.keys = new Set(keys); } const now = (V.lastNow || 0) + dt * 1000; frame(now); return { t: V.sim.t, hash: V.sim.hash }; },
  hud: () => { const h = hudAt(V.replay ? V.replay.t : V.sim.t); return { t: h.t, config: configName(V.engine, V.layers), action: h.action, phase: h.phase, speed: h.speed, sep: h.sep, reqH: h.reqH, mode: h.mode, contacts: V.sim.contacts.length }; },
  state: () => ({ t: V.sim.t, hash: V.sim.hash, contacts: V.sim.contacts.map((c) => ({ t: c.t, F: c.F, surface: c.surface, role: c.role, tech: c.tech, missed: !!c.missed })), actions: V.sim.log.actions.map((a) => ({ t: a.t, label: a.label, m: a.m })) }) };
boot().catch((err) => { const l = document.getElementById("loading"); if (l) l.textContent = "CONTROLLED page failed: " + (err && err.stack || err); console.error(err); });
