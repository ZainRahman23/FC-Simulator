// ═══ tc_responsive/rs_viewer.js — THE A/B PLAYTEST PAGE: the RESPONSIVENESS EXPERIMENT beside the locked BASELINE-88573ef0 — LOCAL ONLY (a real
// player's model) ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The baseline's page (88573ef0's pt_viewer.js — WASD, the analog stick, sprint / walk, replay, slow motion, determinism) with the A/B additions:
//   · ENGINE: the experiment (rs_sim.js + rs_body.js) or the baseline (tc_baseline_88573ef0's own pt_sim.js + pt_body.js, imported read-only,
//     never modified) — the same page, the same camera, the same stick
//   · ⇄ SAME INPUT: this session's recorded input (every tick's request, the stick's raw position) re-simulated on the other engine and replayed —
//     the identical stick trace on both; flip back and forth
//   · the experiment's HUD: the next contact's status (provisional / committed), its family, the foot proxies, the clocks since the last stick
//     change (the root's response, the next contact, the new line)
//   · the rapid-input torture preset (the test infrastructure): a deterministic stick sequence played through the page's own stick
import * as RXS from "./rs_sim.js";
import * as RXB from "./rs_body.js";
import * as BS from "../tc_baseline_88573ef0/pt_sim.js";
import * as BB from "../tc_baseline_88573ef0/pt_body.js";
import { DT, MODES, LABEL, wrap, dir, hdg, FAM } from "./rs_sim.js";
import { DIRS } from "../technical_control15/tc15_ref.js";
import { STICK, stickVector, stickMode, headingFrom, stickAngleDeg, BITS } from "./pt_input.js";
import { SEQ as TORTURE, MODES as TMODES } from "./pt_torture_seq.js";
const ENG = { experiment: { Sim: RXS.PlaySim, Body: RXB.PlayBody, label: "RESPONSIVENESS EXPERIMENT", col: "#ffd45e" }, baseline: { Sim: BS.PlaySim, Body: BB.PlayBody, label: "BASELINE-88573ef0", col: "#8dffa6" } };
const W = window, hyp = Math.hypot, DEG = Math.PI / 180, max = Math.max, min = Math.min, abs = Math.abs;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const START = { P: [52.5, 34], h: 0 };
const V = { engine: "experiment", torture: null, ab: null, ready: false, paused: false, rate: 1, acc: 0, baseMode: "RUN", keys: new Set(), latch: { combo: "", h: 0 }, camId: "follow", cam: null, camH: 0,
  // the on-screen stick (input only): the source that last became active authors the movement — "keys" (a WASD key went down) or "stick"
  src: "keys", stick: { pid: null, raw: { x: 0, y: 0 }, v: { x: 0, y: 0, m: 0, r: 0 }, latch: 0, moving: false, cfg: Object.assign({}, STICK) }, btn: { sprint: false, walk: false, lock: false, tSprint: false }, inStick: null, stickLog: [],
  show: { hud: true, side: true, prot: false, body: false, anim: true }, course: null, replay: null, perf: { frame: [], sim: [], pose: [], render: [], work: [] }, lastNow: null, lastShown: null, dom: {}, verify: null };
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
function newSim(o0) { const o = o0 ? JSON.parse(JSON.stringify(o0)) : { attrs: { bc: +V.dom.aBC.value, dri: +V.dom.aDRI.value, agi: +V.dom.aAGI.value }, foot: V.dom.selFoot.value, style: V.dom.selStyle.value, seed: 1, start: START, sprintLong: !!(V.dom.cLong && V.dom.cLong.checked) };
  V.sim = new ENG[V.engine].Sim(V.env, o); V.body = new ENG[V.engine].Body(V.env, V.sim); showEngine(); V.o0 = JSON.parse(JSON.stringify(o)); V.stickLog = []; V.acc = 0; V.trail = []; V.cam = null; V.lastShown = null; V.replay = null; V.verify = null; showReplayUI(false); }
// the request (pt_input.js): from the keys held — a direction in the camera frame latched when the combination changed, the base mode — or from
// the stick when it is the active source — its continuous direction in the camera frame latched when it left its deadzone, its zone's mode; Shift
// or the SPRINT button = sprint, Alt or the WALK button = walk, for both. One source at a time — never the two added
function request() {
  // the torture preset: the stick held by the sequence (the same request the hand would author — recorded as stick input)
  if (V.torture) { const T = V.torture, tt = V.sim.t - T.t0, M = TMODES[T.mode]; if (tt > T.seq.dur - 0.2 || V.src !== "stick") stopTorture(); else { const a = T.seq.f(tt + 0.2) * DEG; V.stick.pid = -2; V.stick.raw = { x: Math.sin(a) * M.r, y: Math.cos(a) * M.r }; V.stick.v = stickVector(V.stick.raw.x, V.stick.raw.y, V.stick.cfg.deadzone); V.btn.tSprint = !!M.sprint; drawStick(); } }
  const K = V.keys, w = K.has("KeyW"), a = K.has("KeyA"), s = K.has("KeyS"), d = K.has("KeyD"), shK = K.has("ShiftLeft") || K.has("ShiftRight"), altK = K.has("AltLeft") || K.has("AltRight");
  const sh = shK || V.btn.sprint || V.btn.lock || V.btn.tSprint, alt = altK || V.btn.walk, S = V.stick, useStick = V.src === "stick";
  const combo = (w ? "W" : "") + (a ? "A" : "") + (s ? "S" : "") + (d ? "D" : ""); if (combo !== V.latch.combo) { V.latch.combo = combo; V.latch.h = V.camH; }
  const bits = (w ? BITS.W : 0) | (a ? BITS.A : 0) | (s ? BITS.S : 0) | (d ? BITS.D : 0) | (shK ? BITS.SHIFT : 0) | (altK ? BITS.ALT : 0) | (useStick ? BITS.STICK : 0) | (V.btn.sprint || V.btn.lock || V.btn.tSprint ? BITS.SPRINT_BTN : 0) | (V.btn.walk ? BITS.WALK_BTN : 0);
  if (useStick) { const v = S.v; if (v.m > 0 && !S.moving) S.latch = V.camH; S.moving = v.m > 0; V.inStick = v;
    return { h: v.m > 0 ? headingFrom(S.latch, v.x, v.y) : null, mode: sh ? "SPRINT" : alt ? "WALK" : v.m > 0 ? stickMode(v.r, S.cfg) : V.baseMode, keys: bits }; }
  V.inStick = null; S.moving = false;
  const f = (w ? 1 : 0) - (s ? 1 : 0), r = (d ? 1 : 0) - (a ? 1 : 0);
  return { h: headingFrom(V.latch.h, r, f), mode: sh ? "SPRINT" : alt ? "WALK" : V.baseMode, keys: bits };
}
// one simulation tick with the request, and the stick's record for it (raw displacement, the analog vector — the replay shows what was held)
function startTorture() { const name = V.dom.selTort.value; if (!TORTURE[name]) return; if (V.replay) stopReplay(); V.paused = false; setRateButtons();
  V.torture = { name, seq: TORTURE[name], mode: V.dom.selTortMode.value, t0: V.sim.t }; V.src = "stick"; V.stick.moving = false; V.dom.bTort.textContent = "■ stop"; }
function stopTorture() { if (!V.torture) return; V.torture = null; V.btn.tSprint = false; const S = V.stick; S.pid = null; S.raw = { x: 0, y: 0 }; S.v = stickVector(0, 0, S.cfg.deadzone); drawStick(); if (V.dom.bTort) V.dom.bTort.textContent = "▶ play"; }
// the engine shown (the strip, the selector, the same-input button)
function showEngine() { const E = ENG[V.engine], d = V.dom; if (d.engTag) { d.engTag.textContent = E.label; d.engTag.style.background = E.col; } if (d.selEng) d.selEng.value = V.engine;
  if (d.bSame) d.bSame.textContent = `⇄ same input on ${V.engine === "experiment" ? "BASELINE" : "EXPERIMENT"}`; }
// re-simulate a recorded session (its input every tick, its live changes, the stick's record) on an engine — the A/B on identical input
function loadRec(rec, engine) { if (engine) V.engine = engine; newSim(rec.o0); const S = V.sim, I = rec.input, E = rec.events || [], L = rec.stick || []; let ei = 0;
  for (let k = 0; k < I.length / 3; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") S.setAttrs(e.v); else if (e.kind === "foot") S.setFoot(e.v); }
    const h = I[3 * k]; S.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); V.stickLog.push(L[4 * k] || 0, L[4 * k + 1] || 0, L[4 * k + 2] || 0, L[4 * k + 3] || 0); }
  V.paused = true; setRateButtons(); return { t: S.t, hash: S.hash }; }
function sameInput() { if (V.sim.k < 10) return; stopTorture(); const rec = W.PT.record(), other = V.engine === "experiment" ? "baseline" : "experiment", tRep = V.replay ? V.replay.t : null, kind = V.replay ? V.replay.kind : "buffer";
  V.dom.bSame.textContent = "re-simulating…"; setTimeout(() => { loadRec(rec, other); startReplay(kind); if (tRep != null && V.replay) { V.replay.t = clamp(tRep, V.replay.t0, V.replay.t1); } showEngine(); }, 20); }
function stepSim(req) { V.sim.step(req); const S = V.stick, on = !!(req.keys & BITS.STICK); V.stickLog.push(on ? S.raw.x : 0, on ? S.raw.y : 0, on ? S.v.x : 0, on ? S.v.y : 0); }
// ── what the page shows at time t (live: now; replay: a recent instant) — all from the recorded history ────────────────────────────────────────
function hudAt(t) {
  const S = V.sim, P = S.planAt(t), st = S.stateAt(t, P), B = S.ballTrack(t), k = Math.round(t / DT), I = S.log.input, a = P.action;
  const ik = min(k, I.length / 3 - 1), reqH = ik >= 0 && I[3 * ik] !== -99 ? I[3 * ik] : null, mode = ik >= 0 ? MODES[I[3 * ik + 1]] : "RUN", keys = ik >= 0 ? I[3 * ik + 2] : 0;
  let last = null, n3 = 0; for (let i = S.contacts.length - 1; i >= 0; i--) { const c = S.contacts[i]; if (c.t > t + 1e-9) continue; if (!last && !c.missed) last = c; if (c.t > t - 3 && !c.missed) n3++; else if (c.t <= t - 3) break; }
  let phase = a.label; if (a.tech) phase = t < a.tA ? "ENTRY · approach" : t < a.tC - 0.01 ? "ENTRY" : t < a.tC + 0.03 ? "CONTACT" : t < a.tRelease ? "PROTECTION" : "EXIT";
  const travel = st.s > 1.0 ? st.h : st.psi, L = V.stickLog, stick = ik >= 0 && keys & BITS.STICK && 4 * ik + 3 < L.length ? { raw: [L[4 * ik], L[4 * ik + 1]], v: [L[4 * ik + 2], L[4 * ik + 3]] } : null;
  // the clocks since the last change of the stick's intent (> 4°, start / stop): the root's response (its velocity ≥ 0.3 m/s off what it was), the
  // first contact after it (relevant: the ball within 30° of the intent), the new line (travel within 15° at ≥ 40 % of the requested speed)
  let clocks = null; { let kc = null; const kMin = max(1, ik - 720); for (let j = ik; j >= kMin; j--) { const a0 = I[3 * j], a1 = I[3 * (j - 1)]; if ((a0 === -99) !== (a1 === -99) || (a0 !== -99 && abs(wrap(a0 - a1)) > 4 * DEG)) { kc = j; break; } }
    if (kc != null && reqH != null) { const tc = kc * DT, s0 = S.stateAt(tc), cl = { since: t - tc, root: null, contact: null, relevant: false, line: null };
      for (let x = tc; x <= t + 1e-9; x += DT) { const s1 = S.stateAt(x); if (cl.root == null && hyp(s1.V[0] - s0.V[0], s1.V[1] - s0.V[1]) >= 0.3) cl.root = x - tc;
        if (cl.line == null && s1.s >= 0.4 * S.P.speed[mode] && abs(wrap(s1.h - reqH)) < 15 * DEG) cl.line = x - tc; if (cl.root != null && cl.line != null) break; }
      const c1 = S.contacts.find((c) => !c.missed && !c.interceptor && c.t >= tc && c.t <= t + 1e-9); if (c1) { cl.contact = c1.t - tc; cl.relevant = hyp(c1.vOut[0], c1.vOut[1]) > 0.3 && abs(wrap(Math.atan2(c1.vOut[1], c1.vOut[0]) - reqH)) < 30 * DEG; } clocks = cl; } }
  const nx = P.contacts.find((c) => !c.done && c.t > t - 1e-9) || P.contacts.find((c) => c.t > t - 1e-9), next = nx ? { F: nx.F, role: nx.role, fam: nx.fam || nx.tech, in: nx.t - t, status: nx.commitT != null && nx.commitT <= t + 1e-9 ? "COMMITTED" : "PROVISIONAL", tauC: nx.tauC } : null;
  const feet = {}; for (const X of ["R", "L"]) { const L2 = P.stances[X]; feet[X] = L2.some((q) => t >= q.t0 && t <= q.t1) ? "support" : nx && nx.F === X ? "→ ball" : "swing"; }
  return { t, k, plan: P, stick, clocks, next, feet, action: a.label + (a.m ? (a.m > 0 ? " (R)" : " (L)") : ""), kind: a.kind, phase, speed: st.s, ballSpeed: hyp(B.v[0], B.v[1]), reqH, mode, reqSpeed: reqH != null ? S.P.speed[mode] : 0, keys,
    facing: st.psi, travel, turn: reqH != null ? wrap(reqH - travel) : 0, sep: hyp(B.p[0] - st.P[0], B.p[1] - st.P[1]), cps: n3 / 3, last, why: P.why || [], st, ball: B };
}
const deg = (r) => (r == null ? "  —" : ((wrap(r) / DEG).toFixed(0) + "°").padStart(5));
// ── THE CAMERAS: each returns { view, proj, h (its forward heading on the pitch: the WASD frame), eye, tgt } ────────────────────────────────────────
function cameraFor(h, vw, vh, dtc) {
  const st = h.st, Bp = h.ball.p, P = st.P, C = V.cam || (V.cam = { yaw: h.travel, tgt: [P[0], P[1]], side: st.psi + Math.PI / 2, tx: P[0], ty: P[1] }), snap = dtc < 0;
  const k = (tc) => (snap ? 1 : 1 - Math.exp(-max(0, dtc) / tc));
  // the follow target: between the player and the ball, a little ahead along the travel
  const ahead = clamp(st.s * 0.18, 0, 1.4), want = [P[0] * 0.72 + Bp[0] * 0.28 + Math.cos(C.yaw) * ahead, P[1] * 0.72 + Bp[1] * 0.28 + Math.sin(C.yaw) * ahead];
  C.tgt = [C.tgt[0] + (want[0] - C.tgt[0]) * k(0.16), C.tgt[1] + (want[1] - C.tgt[1]) * k(0.16)];
  let eye, tgt, up = [0, 1, 0], fov = 46, camH;
  if (V.camId === "follow") {
    // the yaw follows the general movement: a slow spring toward the travel (only while moving), rate-limited — cuts never snap it
    if (st.s > 1.4 || snap) { const e = wrap(h.travel - C.yaw), rate = 110 * DEG * max(0, dtc); C.yaw += snap ? e : clamp(e * k(0.85), -rate, rate); }
    const D = 10.5, el = 27 * DEG, f = dir(C.yaw); tgt = [C.tgt[0], 0.55, -C.tgt[1]]; eye = [C.tgt[0] - f[0] * D * Math.cos(el), 0.55 + D * Math.sin(el), -(C.tgt[1] - f[1] * D * Math.cos(el))]; camH = C.yaw; fov = 50; }
  else if (V.camId === "touchline") { C.tx += (P[0] - C.tx) * k(0.5); C.ty += (P[1] - C.ty) * k(2.5); eye = [C.tx, 17, -(min(C.ty, 34) - 31)]; tgt = [C.tgt[0], 0.5, -C.tgt[1]]; fov = 26; camH = hdg([tgt[0] - eye[0], -(tgt[2] - eye[2])]); }
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
  if (id === "straight") { for (const a of [5, 10, 20, 30, 40]) { cones.push(at(a, -1.6), at(a, 1.6)); labels.push([at(a, 2.4), a + " m"]); } lines.push([at(0, 0), at(40, 0), "rgba(255,255,255,0.35)", [6, 6]], [at(40, -1.6), at(40, 1.6), "rgba(255,212,94,0.9)"]); }
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
  push(h.st.P[0], h.st.P[1], 0.42, 0.40); if (pose) for (const X of ["R", "L"]) { const a = pose.feet[X].ank, hg = max(0, a[2] - 0.09); push(a[0], a[1], 0.15 + hg * 0.3, 0.5 * Math.exp(-hg * 7)); }
  const bh = max(0, B[2] - 0.11); push(B[0], B[1], 0.12 + bh * 0.4, 0.65 * Math.exp(-bh * 5));
  const G = V.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, c.view); gl.uniformMatrix4fv(G.u.proj, false, c.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  if (V.course && V.course.cones.length) { const K = V.cone; gl.useProgram(K.p); gl.uniformMatrix4fv(K.u.view, false, c.view); gl.uniformMatrix4fv(K.u.proj, false, c.proj); gl.uniform3fv(K.u.col, [1.0, 0.45, 0.08]); gl.bindVertexArray(K.vao);
    for (const q of V.course.cones) { gl.uniform3fv(K.u.off, [q[0], 0, -q[1]]); gl.drawArrays(gl.TRIANGLES, 0, K.n); } gl.bindVertexArray(null); }
  if (pose) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(V.R, V.ent, pose.skin, c.view, c.proj); gl.disable(gl.CULL_FACE); }
  const Bp = V.ballProg; gl.useProgram(Bp.p); gl.uniformMatrix4fv(Bp.u.view, false, c.view); gl.uniformMatrix4fv(Bp.u.proj, false, c.proj); gl.uniform3fv(Bp.u.c, A3(B)); gl.uniform4fv(Bp.u.q, QA(h.ball.q)); gl.uniform1f(Bp.u.r, 0.11); gl.uniform3fv(Bp.u.tint, [1, 1, 1]);
  gl.bindVertexArray(Bp.vao); gl.drawElements(gl.TRIANGLES, Bp.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null);
  overlay(c, vw, dpr, pose, h);
}
function overlay(c, vw, dpr, pose, h) {
  const ctx = V.ov2d, S = V.sim, t = h.t, P = (q) => proj3(c, vw, dpr, q); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, V.ovc.width, V.ovc.height);
  const G = (p, ht) => [p[0], ht != null ? ht : 0.015, -p[1]];
  const line = (pts, col, wid, dash) => { ctx.beginPath(); let f = true; for (const q of pts) { const p = P(q); if (!p) { f = true; continue; } if (f) { ctx.moveTo(p[0], p[1]); f = false; } else ctx.lineTo(p[0], p[1]); } ctx.strokeStyle = col; ctx.lineWidth = wid * dpr; ctx.setLineDash(dash ? dash.map((d) => d * dpr) : []); ctx.stroke(); ctx.setLineDash([]); };
  const ring = (cc, rad, col, wid) => { const pts = []; for (let a = 0; a <= 28; a++) pts.push([cc[0] + rad * Math.cos(a / 28 * 6.283), cc[1], cc[2] + rad * Math.sin(a / 28 * 6.283)]); line(pts, col, wid); };
  const text = (q, s, col, size) => { const p = P(q); if (!p) return; ctx.font = `600 ${(size || 11) * dpr}px -apple-system, Helvetica`; const w = ctx.measureText(s).width; ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(p[0] - 3 * dpr, p[1] - 12 * dpr, w + 6 * dpr, 15 * dpr); ctx.fillStyle = col; ctx.fillText(s, p[0], p[1]); };
  const arrow = (from, hh, len, col, wid) => { const e = [from[0] + Math.cos(hh) * len, from[1] + Math.sin(hh) * len], l = 0.28; line([G(from, 0.03), G(e, 0.03)], col, wid); line([G([e[0] - Math.cos(hh - 0.45) * l, e[1] - Math.sin(hh - 0.45) * l], 0.03), G(e, 0.03), G([e[0] - Math.cos(hh + 0.45) * l, e[1] - Math.sin(hh + 0.45) * l], 0.03)], col, wid); };
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
function updateHud(h) {
  const S = V.sim, d = V.dom, top = h.why.slice(0, 4).map((w) => `${(w.label + (w.m ? (w.m > 0 ? " R" : " L") : "")).padEnd(17)} ${String((+w.J).toFixed(2)).padStart(5)}  ${(w.note || "").slice(0, 58)}`).join("\n");
  const lastC = h.last, prov = S.P.provisional;
  const E = ENG[V.engine], cl = h.clocks, f3 = (x) => (x == null ? "—" : (x * 1000).toFixed(0) + " ms"), nx = h.next;
  const rxl = `<span style="color:${E.col};font-weight:700">${E.label}</span>\n` + (nx ? `next contact ${nx.F} ${String(nx.fam || "").toLowerCase()} in ${f3(nx.in)} · <span style="color:${nx.status === "COMMITTED" ? "#7fe9ff" : "#cfe"}">${nx.status}</span>${nx.tauC ? ` (final ${f3(nx.tauC)})` : ""}\n` : "next contact —\n") +
    `feet R ${h.feet.R} · L ${h.feet.L}\n` + (cl ? `since the stick changed ${f3(cl.since)}: root ${f3(cl.root)} · contact ${f3(cl.contact)}${cl.contact != null ? (cl.relevant ? " (relevant)" : " (not on the line)") : ""} · line ${f3(cl.line)}\n` : "");
  d.hud.innerHTML = rxl + `<div class="act">${h.action}</div><div class="phase">${h.phase}${V.replay ? "  ·  REPLAY " + (h.t - V.sim.t).toFixed(2) + " s" : ""}${V.paused && !V.replay ? "  ·  PAUSED" : ""}</div>` +
    `mode ${h.mode.padEnd(6)} requested ${h.reqSpeed.toFixed(1)} m/s\nplayer ${h.speed.toFixed(2)} m/s   ball ${h.ballSpeed.toFixed(2)} m/s\n` +
    `requested ${deg(h.reqH)}   facing ${deg(h.facing)}\nturn angle ${deg(h.reqH != null ? h.turn : null)}   travel ${deg(h.travel)}\n` + inputLine(h) + "\n" +
    `foot ${lastC ? lastC.F : "—"} · ${lastC ? String(lastC.surface).toLowerCase() : "—"} (${lastC ? (LABEL[lastC.tech] || lastC.tech) + " · " + lastC.role : "no contact yet"})\n` +
    `ball separation ${h.sep.toFixed(2)} m   contacts/s ${h.cps.toFixed(1)}\n` + `<span style="color:#8fa49a">why (cost, lower = chosen):\n${top}</span>` +
    (prov ? `\n<span id="provH" style="color:#ffb36b">attributes below 99: PROVISIONAL linear scaling — not a calibration</span>` : "");
  d.prov.textContent = prov ? " provisional" : "";
  if (V.show.side) { drawGraph(h); stats(h); contactsTable(h); }
}
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
    `carry ${tech("CARRY")}  outside cut ${tech("OUTCUT")} (${execs("OUTCUT")}×)  Ronaldo chop ${tech("CHOP")} (${execs("CHOP")}×)\nCruyff ${tech("CRUYFF")} (${execs("CRUYFF")}×)  hook ${tech("HOOK")} (${execs("HOOK")}×)  drag-back ${tech("DRAGBACK")} (${execs("DRAGBACK")}×)   [share of contacts · executions]`;
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
  V.dom.stickInfo.textContent = on ? (v.m > 0 ? `${a >= 0 ? "+" : ""}${a.toFixed(1)}° · ${v.m.toFixed(2)} · ${stickMode(v.r, S.cfg)}` : "deadzone") : "drag to move"; }
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
  for (let k = 0; k < K; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") R.setAttrs(e.v); else if (e.kind === "foot") R.setFoot(e.v); }
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
  if (V.replay) { const R = V.replay; if (R.playing) { R.t = min(R.t1, R.t + dtReal * R.rate); if (R.t >= R.t1) R.playing = false; } }
  else if (!V.paused) { V.acc += dtReal * V.rate; const req = request(); while (V.acc >= DT - 1e-12 && nSteps < 60) { stepSim(req); V.acc -= DT; nSteps++; } if (nSteps >= 60) V.acc = 0; }
  else if (V.stepReq) { const req = request(); for (let i = 0; i < V.stepReq; i++) stepSim(req); V.stepReq = 0; }
  const w1 = performance.now(), tShow = V.replay ? Math.round(V.replay.t / DT) * DT : V.sim.t, h = hudAt(tShow);
  const pose = V.show.anim ? V.body.pose(tShow) : null; const w2 = performance.now();
  const dtc = V.lastShown == null || abs(tShow - V.lastShown) > 0.25 ? -1 : abs(tShow - V.lastShown); V.lastShown = tShow;
  render(pose, h, dtc); const w3 = performance.now();
  const P = V.perf; P.frame.push(dtReal * 1000); P.sim.push(w1 - w0); P.pose.push(w2 - w1); P.render.push(w3 - w2); P.work.push(w3 - w0); for (const k of Object.keys(P)) if (P[k].length > 1200) P[k].shift();
  if (now - hudClock > 100) { hudClock = now; if (V.show.hud) updateHud(h); else if (V.show.side) { drawGraph(h); stats(h); contactsTable(h); } showKeys(h); V.dom.perf.textContent = perfText();
    if (V.replay) { const R = V.replay, b0 = bufStart(); V.dom.rScrub.value = String(Math.round((R.t - b0) / max(1e-6, V.sim.t - b0) * 1000)); V.dom.rLabel.textContent = `REPLAY ${R.kind === "last" ? "LAST ACTION" : "BUFFER"} · ${(R.t - V.sim.t).toFixed(2)} s · ${R.rate}×${R.playing ? "" : " (end — Esc: live)"}`; } }
  if (!V.external) requestAnimationFrame(frame);
}
// ── UI ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function setRateButtons() { document.querySelectorAll("[data-rate]").forEach((b) => b.classList.toggle("on", +b.dataset.rate === V.rate)); V.dom.bPause.textContent = V.paused && !V.replay ? "▶" : "❚❚"; V.dom.bPause.classList.toggle("on", V.paused && !V.replay); }
function setMode(m) { V.baseMode = m; document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === m)); }
function bindUI() {
  const $ = (id) => document.getElementById(id), d = V.dom; for (const id of ["bar", "stage", "hud", "side", "graph", "stats", "ctab", "keys", "replay", "rScrub", "rLabel", "perf", "prov", "bPause", "aBC", "aDRI", "aAGI", "vBC", "vDRI", "vAGI", "selFoot", "selStyle", "selCam", "selCourse", "help", "stickBox", "stickPad", "stickInfo", "dz", "bSprint", "bLock", "bWalk", "engTag", "selEng", "bSame", "selTort", "selTortMode", "bTort", "cLong"]) d[id] = $(id);
  const blur = (e) => { if (e && e.target && e.target.blur && e.target.tagName !== "INPUT") e.target.blur(); };
  $("bReset").onclick = (e) => { newSim(); blur(e); };
  d.selEng.onchange = (e) => { stopTorture(); V.engine = d.selEng.value; newSim(); blur(e); }; d.bSame.onclick = (e) => { sameInput(); blur(e); }; d.cLong.onchange = (e) => { newSim(); blur(e); };
  d.selTort.innerHTML = Object.keys(TORTURE).map((n) => `<option value="${n}">${n}</option>`).join(""); d.selTortMode.value = "SPRINT";
  d.bTort.onclick = (e) => { if (V.torture) stopTorture(); else startTorture(); e.target.blur(); }; d.selTort.onchange = d.selTortMode.onchange = (e) => e.target.blur();
  document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = (e) => { setMode(b.dataset.mode); blur(e); }));
  document.querySelectorAll("[data-rate]").forEach((b) => (b.onclick = (e) => { V.rate = +b.dataset.rate; if (V.paused && !V.replay) V.paused = false; setRateButtons(); blur(e); }));
  d.bPause.onclick = (e) => { if (V.replay) V.replay.playing = !V.replay.playing; else V.paused = !V.paused; setRateButtons(); blur(e); };
  $("bStep").onclick = (e) => { if (V.replay) { V.replay.playing = false; V.replay.t = min(V.replay.t1, V.replay.t + 4 * DT); } else { V.paused = true; V.stepReq = 4; } setRateButtons(); blur(e); };
  $("bReplay").onclick = (e) => { startReplay("last"); blur(e); }; $("bBuffer").onclick = (e) => { startReplay("buffer"); blur(e); };
  $("rSlow").onclick = () => { if (V.replay) V.replay.rate = 0.25; }; $("rHalf").onclick = () => { if (V.replay) V.replay.rate = 0.5; }; $("rOne").onclick = () => { if (V.replay) V.replay.rate = 1; };
  $("rPlay").onclick = () => { if (V.replay) { if (!V.replay.playing && V.replay.t >= V.replay.t1 - 1e-6) V.replay.t = V.replay.t0; V.replay.playing = !V.replay.playing; } };
  $("rLive").onclick = (e) => { stopReplay(); blur(e); };
  d.rScrub.oninput = () => { if (!V.replay) return; const b0 = bufStart(); V.replay.t = b0 + (+d.rScrub.value / 1000) * (V.sim.t - b0); V.replay.t0 = b0; V.replay.t1 = V.sim.t; V.replay.playing = false; };
  d.selCam.onchange = (e) => { V.camId = e.target.value; V.cam = null; V.lastShown = null; blur(e); };
  d.selCourse.onchange = (e) => { V.course = makeCourse(e.target.value); blur(e); };
  d.selFoot.onchange = (e) => { V.sim.setFoot(e.target.value); blur(e); };
  d.selStyle.onchange = (e) => blur(e);
  for (const [k, id] of [["bc", "aBC"], ["dri", "aDRI"], ["agi", "aAGI"]]) d[id].oninput = () => { d["v" + id.slice(1)].textContent = d[id].value; V.sim.setAttrs({ [k]: +d[id].value }); };
  for (const [id, key] of [["cHud", "hud"], ["cSide", "side"], ["cProt", "prot"], ["cBody", "body"], ["cAnim", "anim"]]) $(id).onchange = (e) => { V.show[key] = e.target.checked; d.hud.classList.toggle("hidden", !V.show.hud); d.side.classList.toggle("hidden", !V.show.side); };
  // THE STICK (pointer events: mouse, trackpad, pen, touch): the pointer is captured while it drags — leaving the circle never releases it; the
  // release returns the thumb to the centre (movement = zero). The thumb's travel is the circle's 40 % radius in the drawing (stickSVG)
  const S = V.stick, pad = d.stickPad;
  const stickAt = (e) => { const b = pad.getBoundingClientRect(), R = b.width * 0.40; let x = (e.clientX - (b.left + b.width / 2)) / R, y = -(e.clientY - (b.top + b.height / 2)) / R; const r = hyp(x, y); if (r > 1) { x /= r; y /= r; }
    S.raw = { x, y }; S.v = stickVector(x, y, S.cfg.deadzone); drawStick(); };
  pad.addEventListener("pointerdown", (e) => { if (V.torture) stopTorture(); if (S.pid != null) return; e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (_) {} S.pid = e.pointerId; V.src = "stick"; if (V.replay) stopReplay(); stickAt(e); });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId !== S.pid) return; e.preventDefault(); V.src = "stick"; stickAt(e); });
  const stickEnd = (e) => { if (e.pointerId !== S.pid) return; S.pid = null; S.raw = { x: 0, y: 0 }; S.v = stickVector(0, 0, S.cfg.deadzone); drawStick(); };
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(ev, stickEnd);
  // SPRINT / WALK: held (each its own pointer — touch can hold SPRINT while the other finger steers); the sprint lock keeps sprint without a hand
  const hold = (el, key) => { let pid = null; el.addEventListener("pointerdown", (e) => { e.preventDefault(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (_) {} V.btn[key] = true; el.classList.add("on"); });
    const up = (e) => { if (e.pointerId !== pid) return; pid = null; V.btn[key] = false; el.classList.remove("on"); }; for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, up); };
  hold(d.bSprint, "sprint"); hold(d.bWalk, "walk");
  d.bLock.addEventListener("click", (e) => { V.btn.lock = !V.btn.lock; d.bLock.classList.toggle("on", V.btn.lock); d.bLock.blur(); });
  d.dz.onchange = d.dz.oninput = () => { const x = clamp(+d.dz.value || 0, 0, 0.3); S.cfg.deadzone = x; S.v = stickVector(S.raw.x, S.raw.y, x); drawStick(); };
  const code = (e) => e.code;
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" && e.target.type === "text")) return; const c = code(e);
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight"].includes(c)) { V.keys.add(c); e.preventDefault(); if (/^Key[WASD]$/.test(c)) { if (!e.repeat) { V.src = "keys"; stopTorture(); } if (V.replay) stopReplay(); } return; }
    if (e.repeat) return;
    if (c === "Space") { if (V.replay) V.replay.playing = !V.replay.playing; else V.paused = !V.paused; setRateButtons(); e.preventDefault(); }
    else if (c === "Period") { if (V.replay) { V.replay.playing = false; V.replay.t = min(V.replay.t1, V.replay.t + (e.shiftKey ? DT : 4 * DT)); } else { V.paused = true; V.stepReq = e.shiftKey ? 1 : 4; } setRateButtons(); }
    else if (c === "Comma") { if (V.replay) { V.replay.playing = false; V.replay.t = max(V.replay.t0, V.replay.t - (e.shiftKey ? DT : 4 * DT)); } }
    else if (c === "KeyR") newSim();
    else if (c === "KeyQ") { if (V.replay) stopReplay(); else startReplay("last"); }
    else if (c === "KeyB") { if (V.replay) stopReplay(); else startReplay("buffer"); }
    else if (c === "Escape") stopReplay();
    else if (c === "KeyH") { V.show.hud = !V.show.hud; $("cHud").checked = V.show.hud; d.hud.classList.toggle("hidden", !V.show.hud); }
    else if (c === "KeyC") { const o = ["follow", "touchline", "top", "side"], i = (o.indexOf(V.camId) + 1) % o.length; V.camId = o[i]; d.selCam.value = V.camId; V.cam = null; V.lastShown = null; }
    else if (c === "KeyV") verifyDeterminism();
    else if (c === "KeyX") sameInput();
    else if (/^Digit[1-4]$/.test(c)) setMode(MODES[+c.slice(5) - 1]);
  });
  window.addEventListener("keyup", (e) => { V.keys.delete(code(e)); if (code(e).startsWith("Alt")) e.preventDefault(); });
  window.addEventListener("blur", () => { V.keys.clear(); V.btn.sprint = V.btn.walk = false; d.bSprint.classList.remove("on"); d.bWalk.classList.remove("on"); if (S.pid != null) { S.pid = null; S.raw = { x: 0, y: 0 }; S.v = stickVector(0, 0, S.cfg.deadzone); drawStick(); } });
  drawStick();
}
async function boot() {
  const q = new URLSearchParams(location.search); bindUI(); V.cv = document.getElementById("gl"); V.ovc = document.getElementById("ov"); V.ov2d = V.ovc.getContext("2d");
  const gl = V.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) { document.getElementById("loading").textContent = "WebGL2 unavailable"; return; }
  V.gl = gl; V.R = { gl }; V.ground = groundProg(gl); V.ballProg = ballProg(gl); V.cone = coneProg(gl);
  const [colliders, baked, ent] = await Promise.all([fetch("dribble1/d1_colliders.json").then((r) => r.json()), fetch("tc_responsive/pt_baked.json").then((r) => r.json()), W.ofCharLoad(q.get("char") || "vinicius")]);
  V.ent = ent; const E = W.RUN1_V13; V.env = { E, M4, skel: ent.skel, colliders, baked, body: E.r1Body(ent.skel) };
  if (q.get("engine") === "baseline") V.engine = "baseline"; if (q.get("sprintLong") === "1" && V.dom.cLong) V.dom.cLong.checked = true;
  if (q.get("dz") != null) { V.dom.dz.value = q.get("dz"); V.dom.dz.oninput(); }
  if (q.get("foot")) V.dom.selFoot.value = q.get("foot"); if (q.get("cam")) { V.camId = q.get("cam"); V.dom.selCam.value = V.camId; }
  for (const [k, id] of [["bc", "aBC"], ["dri", "aDRI"], ["agi", "aAGI"]]) if (q.get(k)) { V.dom[id].value = q.get(k); V.dom["v" + id.slice(1)].textContent = q.get(k); }
  newSim(); document.getElementById("loading").remove(); V.ready = true;
  if (q.get("external") === "1") V.external = true; else requestAnimationFrame(frame);
}
// the automation / test surface (puppeteer: performance, determinism, scripted input, captures)
W.PT = { ready: () => V.ready, V,
  perf: () => { const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s[min(s.length - 1, Math.floor(x * s.length))] || 0; }, avg = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), o = {};
    for (const [k, A] of Object.entries(V.perf)) o[k] = { n: A.length, avg: avg(A), p95: q(A, 0.95), p99: q(A, 0.99), worst: max(0, ...A) }; o.replanCpu = { n: V.sim.cpu.replan.length, avg: avg(V.sim.cpu.replan), worst: max(0, ...V.sim.cpu.replan) }; return o; },
  resetPerf: () => { for (const k of Object.keys(V.perf)) V.perf[k].length = 0; },
  verify: () => verifyDeterminism(), reset: () => newSim(), keys: (down, up) => { for (const k of up || []) V.keys.delete(k); for (const k of down || []) V.keys.add(k); },
  set: (o) => { if (o.cam) { V.camId = o.cam; V.dom.selCam.value = o.cam; V.cam = null; } if (o.course != null) { V.course = makeCourse(o.course); V.dom.selCourse.value = o.course; } if (o.show) { Object.assign(V.show, o.show); for (const [id, key] of [["cHud", "hud"], ["cSide", "side"], ["cProt", "prot"], ["cBody", "body"], ["cAnim", "anim"]]) document.getElementById(id).checked = !!V.show[key]; V.dom.hud.classList.toggle("hidden", !V.show.hud); V.dom.side.classList.toggle("hidden", !V.show.side); } if (o.mode) setMode(o.mode); if (o.rate) V.rate = o.rate; if (o.paused != null) V.paused = o.paused; return true; },
  engine: (e) => { if (e && ENG[e] && e !== V.engine) { V.engine = e; newSim(); } return V.engine; }, load: (rec, engine) => loadRec(rec, engine), same: () => sameInput(),
  torture: (name, mode) => { if (name) { V.dom.selTort.value = name; if (mode) V.dom.selTortMode.value = mode; startTorture(); } else stopTorture(); return !!V.torture; },
  record: () => ({ o0: V.o0, engine: V.engine, input: Array.from(V.sim.log.input), events: V.sim.log.events, hash: V.sim.hash, k: V.sim.k, stick: Array.from(V.stickLog), deadzone: V.stick.cfg.deadzone }),
  // the stick as a test would hold it: raw (x right, y up) in −1 … 1, null = released
  stick: (x, y) => { const S = V.stick; if (x == null) { S.pid = null; S.raw = { x: 0, y: 0 }; } else { S.pid = -1; V.src = "stick"; S.raw = { x, y }; } S.v = stickVector(S.raw.x, S.raw.y, S.cfg.deadzone); drawStick(); return S.v; },
  request: () => { const r = request(); return { h: r.h, mode: r.mode, keys: r.keys, frameH: V.src === "stick" ? V.stick.latch : V.latch.h, src: V.src }; },
  replay: (kind) => startReplay(kind || "last"), live: () => stopReplay(), seek: (t) => { if (V.replay) { V.replay.t = t; V.replay.playing = false; } },
  // drive one external frame (external=1): advance the simulation dt seconds with the given keys, then draw
  tick: (dt, keys) => { if (keys) { V.keys = new Set(keys); } const now = (V.lastNow || 0) + dt * 1000; frame(now); return { t: V.sim.t, hash: V.sim.hash }; },
  hud: () => { const h = hudAt(V.replay ? V.replay.t : V.sim.t); return { t: h.t, engine: V.engine, action: h.action, phase: h.phase, speed: h.speed, sep: h.sep, reqH: h.reqH, mode: h.mode, contacts: V.sim.contacts.length, clocks: h.clocks, next: h.next }; },
  state: () => ({ t: V.sim.t, hash: V.sim.hash, contacts: V.sim.contacts.map((c) => ({ t: c.t, F: c.F, surface: c.surface, role: c.role, tech: c.tech, missed: !!c.missed })), actions: V.sim.log.actions.map((a) => ({ t: a.t, label: a.label, m: a.m })) }) };
boot().catch((err) => { const l = document.getElementById("loading"); if (l) l.textContent = "A/B page failed: " + (err && err.stack || err); console.error(err); });
