// ═══ receive_turn11/rt11_lab.js — RECEIVE-TURN-1.1: the HUMAN-MOTION LAB (RECEIVE-TURN-1's lab with the human body, support / COM / phase overlays,
// gameplay and close 3/4 cameras; &body=v1 shows RECEIVE-TURN-1's procedural body for comparison). The football action is RECEIVE-TURN-1's, unchanged.
// ═══ (RECEIVE-TURN-1's lab header follows) ═════════════════════════════════════════════════════════════════════════════════════════════════════
// One stationary receive-and-turn at a time, every input on a control: the desired turn angle (− left, + right), the pass's arrival speed, the
// ball's lateral line, Ball Control, the execution draw (typical / perfect / keyed seed), the family / foot / contact variant (AUTO or forced), the
// preparation time (clean = he read the pass early) and the preferred foot. Views: 3D (the real character on the placeholder body, the ball, the
// ideal ball as a green ghost, the vectors) and the TOP view (initial facing, incoming ball, desired exit, planned rotation, ideal vs actual
// first-touch vector, ideal vs actual ball path, the reconnection point, the meeting, the receiver's path), plus the BC ladder (the same draws at
// BC 30 … 99: each rating's meeting point). The page runs the same chain as the Node evidence (rt_sim.js).
// URL: ?theta=135&v=12&lat=0&bc=70&draw=TYPICAL|seed3&family=AUTO&foot=AUTO&variant=AUTO&prep=clean&pref=R&cam=high&t=…&rate=0.5&paused=1&external=1&compare=1
import { prepareTurn, runTurn, FAMILIES, FAMILY_ORDER, TEX_EXAMPLES, DEG } from "../receive_turn1/rt_sim.js";
import { DT } from "../receive_turn1/rk_sim.js";
import { relErr, gBC } from "../receive_turn1/rk_model.js";
import { TurnBody } from "../receive_turn1/rt_body.js";
import { HumanTurnBody } from "./rt11_body.js";
import { turnTop, turnData, turnExtents, TCOL } from "../receive_turn1/rt_draw.js";
import { groundProg, ballProg, camLocal, proj3 } from "../receive_turn1/rt_gl.js";
import { toW } from "../receive_turn1/rk_sim.js";
const W = window, M4G = typeof M4 !== "undefined" ? M4 : W.M4, Q = new URLSearchParams(location.search), $ = (s) => document.querySelector(s), fmt = (x, n = 2) => (x == null || !isFinite(x) ? "–" : x.toFixed(n));
const L = { cond: { theta: +(Q.get("theta") || 135), v: +(Q.get("v") || 12), lat: +(Q.get("lat") || 0), family: Q.get("family") || "AUTO", foot: Q.get("foot") || "AUTO", variant: Q.get("variant") || "AUTO", prep: Q.get("prep") || "clean", pref: Q.get("pref") || "R" },
  bc: +(Q.get("bc") || 70), draw: Q.get("draw") || "TYPICAL", t: 0, rate: +(Q.get("rate") || 0.5), playing: Q.get("paused") !== "1", cam: Q.get("cam") || "close34", ladder: Q.get("ladder") === "1", bodyKind: Q.get("body") || "human", top: Q.get("top") || "body", overlay: Q.get("overlay") !== "0", ready: false };
const LADDER = [30, 50, 60, 70, 80, 90, 99], ladderCol = (bc) => { const t = (bc - 30) / 69; return `hsl(${(t * 130).toFixed(0)}, 80%, ${(55 + 10 * t).toFixed(0)}%)`; };
function condFor(c) { return { theta: c.theta, v: c.v, lat: c.lat, family: c.family === "AUTO" ? undefined : c.family, foot: c.foot === "AUTO" ? undefined : c.foot, variant: c.variant === "AUTO" ? undefined : c.variant, prep: c.prep === "clean" ? undefined : +c.prep, pref: c.pref === "both" ? null : c.pref }; }
const drawSpec = () => (L.draw.startsWith("seed") ? { seed: +L.draw.slice(4) } : { example: L.draw });
// cameras (local). "auto": elevated, looking across the EXIT line (heading θ − 90° · σ) at the action's centre — the ball arrives from one side, the
// receiver turns and leaves across the picture; a left turn's camera is the mirror image of the right turn's
function cam(w, h) {
  const th = L.cond.theta * DEG, sg = L.cond.theta < 0 ? -1 : 1, ch = th - sg * Math.PI / 2, u = [Math.cos(th), Math.sin(th)], ctr = [u[0] * 0.45 + 0.2, u[1] * 0.45], d = 4.4;
  const c34 = th - sg * 55 * DEG, ctr2 = [u[0] * 0.30 + 0.15, u[1] * 0.30];
  const C = { close34: [[ctr2[0] + Math.cos(c34) * 3.3, ctr2[1] + Math.sin(c34) * 3.3, 1.55], [ctr2[0], ctr2[1], 0.75], 40], gameplay: [[ctr[0] - 9.0, ctr[1] - 13.5 * sg, 10.5], [ctr[0], ctr[1], 0.4], 22],
    auto: [[ctr[0] + Math.cos(ch) * d, ctr[1] + Math.sin(ch) * d, 2.6], [ctr[0], ctr[1], 0.6], 36], overhead: [[ctr[0] + 0.2, ctr[1] + 0.01, 10.5], [ctr[0], ctr[1], 0], 38],
    side: [[-0.2, 6.4 * sg, 1.5], [-0.2, 0, 0.8], 34], passer: [[6.2, 1.2 * sg, 2.3], [-0.2, 0, 0.6], 34], behind: [[-5.6, -1.4 * sg, 2.4], [0.4, 0, 0.6], 34] }[L.cam] || null;
  const c = C || [[ctr[0] + Math.cos(ch) * d, ctr[1] + Math.sin(ch) * d, 2.6], [ctr[0], ctr[1], 0.6], 36]; return camLocal(c[0], c[1], c[2], w, h); }
// the phase of the human motion at t (relative to the contact), from the body's own event times
function phaseOf(B, t) { const e = B.ev; if (t < e.prepStart) return "ready"; if (t < e.supportLift) return "preparation · head check · shoulders open"; if (t < e.supportPlant) return "support-foot step";
  if (t < e.swingStart) return "weight onto the support leg"; if (t < -0.005) return "contact leg swings"; if (t < 0.03) return "CONTACT"; if (t < (e.contactLand || 0.25)) return "hips through the turn · pivot on the standing foot";
  if (t < (e.weightTransfer || 0.35) + 0.02) return "weight transfer onto the exit foot"; if (e.aligned != null && t < e.aligned) return "body aligning with the exit"; if (e.rejoin != null && t < e.rejoin - 0.02) return "accelerating onto the exit line"; if (e.rejoin != null && t < e.rejoin + 0.08) return "rejoins the ball"; return "exit"; }
// the BODY top-down diagnostic (the passer is up, the receiver's initial right to the right): every foot plant of the posed body numbered in
// order (R blue, L orange; solid = planted now, faint = done, dashed = to come), forefoot pivots as arcs about the ball of the foot, the swing
// paths (the contact foot's in the surface colour, its contact pose ringed), the centre-of-mass trail, the posed hip line (orange) and
// shoulder line (cyan) with their facing ticks, the loaded foot filled by its share of the weight, the ball. All of it read back from the body.
function bodyTrack(B) {
  const T0 = B.T0 - 0.12, tEnd = Math.min(2.2, (B.ev.rejoin != null ? B.ev.rejoin : 0.9) + 0.45), prints = [], swings = { R: [], L: [] }, com = [];
  for (const X of ["R", "L"]) { let cur = null, sw = null;
    for (let t = T0; t <= tEnd + 1e-9; t += 1 / 240) { const f = B.footAt(X, t);
      if (f.planted) { if (sw) { sw.pts.push([f.ank[0], f.ank[1]]); swings[X].push(sw); sw = null; }
        const kind = f.pivot ? "pivot" : "flat";
        if (!cur || cur.kind !== kind || (kind === "flat" && Math.hypot(f.ank[0] - cur.ank1[0], f.ank[1] - cur.ank1[1]) > 0.02)) { if (cur) prints.push(cur); cur = { X, kind, t0: t, t1: t, ank0: f.ank.slice(), yaw0: f.yaw, ank1: f.ank.slice(), yaw1: f.yaw, ballPt: f.ballPt }; }
        else { cur.t1 = t; cur.ank1 = f.ank.slice(); cur.yaw1 = f.yaw; } }
      else { if (cur) { prints.push(cur); cur = null; } if (!sw) sw = { X, t0: t, contact: X === B.F && t < (B.ev.contactLand || 0.3) + 0.01 && t > B.ev.swingStart - 0.05, pts: [] }; sw.pts.push([f.ank[0], f.ank[1]]); } }
    if (cur) prints.push(cur); if (sw) swings[X].push(sw); }
  // merge a pivot with the flat plant it starts from (same foot, no lift between): one footprint that turns
  prints.sort((a, b) => a.t0 - b.t0); const plants = [];
  for (const q of prints) { const prev = plants.filter((r) => r.X === q.X).pop(); if (prev && Math.abs(prev.t1 - q.t0) < 2 / 240 + 1e-9) { prev.t1 = q.t1; prev.ank1 = q.ank1; prev.yaw1 = q.yaw1; if (q.kind === "pivot") { prev.pivot = (prev.pivot || 0) + Math.abs(wrapD(q.yaw1 - q.yaw0)); prev.ballPt = q.ballPt; } continue; }
    plants.push(Object.assign({}, q, { pivot: q.kind === "pivot" ? Math.abs(wrapD(q.yaw1 - q.yaw0)) : 0 })); }
  plants.forEach((q, i) => (q.n = i));
  for (let t = T0; t <= tEnd + 1e-9; t += 1 / 60) { const po = B.poseAt(B.tc + t, null); com.push({ t, p: po.S.slice() }); }
  let f0 = 0, f1 = 0, r0 = 0, r1 = 0; const add = (p) => { f0 = Math.min(f0, p[0]); f1 = Math.max(f1, p[0]); r0 = Math.min(r0, p[1]); r1 = Math.max(r1, p[1]); };
  // the frame fits the turn itself (up to the first exit steps); later run steps run off the edge
  const tFit = (B.ev.exitPlant != null ? B.ev.exitPlant : 0.5) + 0.02; for (const q of plants) if (q.t0 <= tFit) { add(q.ank0); add(q.ank1); } for (const c of com) if (c.t <= tFit) add(c.p); add(B.cPose.ank);
  const pad = 0.40, span = Math.max(1.9, f1 - f0 + 2 * pad, r1 - r0 + 2 * pad); return { plants, swings, com, tEnd, ext: { fc: (f0 + f1) / 2, rc: (r0 + r1) / 2, span } };
}
const wrapD = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function bodyTop(x, box, B, pose, t, D) {
  const K = B._track || (B._track = bodyTrack(B)), { w, h } = box, top = 56, bot = 34, s = Math.min(w, h - top - bot) / K.ext.span, cx = w / 2 - K.ext.rc * s, cy = top + (h - top - bot) / 2 + K.ext.fc * s;
  const P = (p) => [cx + p[1] * s, cy - p[0] * s], COLF = { R: "94,168,255", L: "255,159,94" };
  x.fillStyle = "#0f1513"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(255,255,255,0.06)"; x.lineWidth = 1; for (let g = Math.floor((K.ext.fc - K.ext.span) * 2) / 2; g <= K.ext.fc + K.ext.span; g += 0.5) { const a = P([g, K.ext.rc - K.ext.span]), b = P([g, K.ext.rc + K.ext.span]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
  for (let g = Math.floor((K.ext.rc - K.ext.span) * 2) / 2; g <= K.ext.rc + K.ext.span; g += 0.5) { const a = P([K.ext.fc - K.ext.span, g]), b = P([K.ext.fc + K.ext.span, g]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
  const line = (pts, col, wd, dash) => { if (!pts || pts.length < 2) return; x.beginPath(); pts.forEach((p, i) => { const q = P(p); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); x.strokeStyle = col; x.lineWidth = wd; x.setLineDash(dash || []); x.stroke(); x.setLineDash([]); };
  const txt = (p, str, col, dx = 0, dy = 0, f = 10) => { const q = P(p); x.fillStyle = col; x.font = `${f}px Menlo, monospace`; x.fillText(str, q[0] + dx, q[1] + dy); };
  // the football context: incoming ball, the exit line, the ball's actual path so far
  line(D.inc, "rgba(200,210,205,0.45)", 1.2, [4, 4]); line([D.exit.from, [D.exit.from[0] + D.exit.u[0] * 4, D.exit.from[1] + D.exit.u[1] * 4]], "rgba(255,212,94,0.8)", 1.6, [8, 5]);
  if (t > 0 && D.actual) line(D.actual.filter((p, j) => j * DT <= t), "rgba(255,154,61,0.9)", 1.8);
  // footprints
  const foot = (ank, yaw, fill, stroke, dash) => { const c = Math.cos(yaw), sn = Math.sin(yaw), pts = [[-0.07, 0.038], [0.05, 0.048], [0.17, 0.044], [0.24, 0.0], [0.17, -0.044], [0.05, -0.048], [-0.07, -0.038]].map(([a, b]) => P([ank[0] + c * a - sn * b, ank[1] + sn * a + c * b]));
    x.beginPath(); pts.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1.3; x.setLineDash(dash || []); x.stroke(); x.setLineDash([]); } };
  for (const q of K.plants) { const now = t >= q.t0 && t <= q.t1, done = t > q.t1, c = COLF[q.X];
    foot(q.ank0, q.yaw0, done ? `rgba(${c},0.16)` : now ? `rgba(${c},0.30)` : null, `rgba(${c},${done ? 0.45 : now ? 0.95 : 0.6})`, done || now ? [] : [3, 3]);
    if (q.pivot > 0.04) { foot(q.ank1, q.yaw1, null, `rgba(94,232,224,${done ? 0.5 : now ? 0.95 : 0.5})`, [2, 2]); const bp = q.ballPt || q.ank1, a0 = q.yaw0, a1 = q.yaw1, arc = []; for (let i = 0; i <= 16; i++) { const a = a0 + wrapD(a1 - a0) * i / 16; arc.push([bp[0] + Math.cos(a) * 0.20, bp[1] + Math.sin(a) * 0.20]); } line(arc, "rgba(94,232,224,0.85)", 1.4);
      txt([bp[0] + Math.cos(a1) * 0.23, bp[1] + Math.sin(a1) * 0.23], `pivot ${(q.pivot / DEG).toFixed(0)}°`, "rgba(94,232,224,0.95)", 3, 3, 10); }
    txt(q.ank0, `${q.n + 1}${q.X}`, `rgba(${c},1)`, -22, 4, 11); txt(q.ank0, `${q.t0 >= 0 ? "+" : ""}${q.t0.toFixed(2)}`, "rgba(230,239,233,0.6)", -22, 15, 9); }
  for (const X of ["R", "L"]) for (const sw of K.swings[X]) { if (sw.t0 > t + 1e-6) { line(sw.pts, `rgba(${COLF[X]},0.25)`, 1, [2, 3]); continue; } line(sw.pts.slice(0, Math.max(2, Math.round((t - sw.t0) * 240) + 1)), sw.contact ? TCOL.surf.FOOT : `rgba(${COLF[X]},0.7)`, sw.contact ? 2.2 : 1.2); }
  { const q = P([B.cPose.ank[0], B.cPose.ank[1]]); x.strokeStyle = TCOL.surf.FOOT; x.lineWidth = 1.6; x.beginPath(); x.arc(q[0], q[1], 6, 0, 2 * Math.PI); x.stroke(); txt([B.cPose.ank[0], B.cPose.ank[1]], "contact pose", TCOL.surf.FOOT, 8, 12, 10); }
  // the centre of mass
  line(K.com.filter((c) => c.t <= t).map((c) => c.p), "rgba(255,94,200,0.9)", 2);
  if (pose) {
    for (const X of ["R", "L"]) { const f = pose.feet[X], wv = pose.w[X]; foot(f.ank, f.yaw, f.planted ? `rgba(255,214,94,${(0.10 + 0.75 * wv).toFixed(2)})` : null, f.planted ? "#ffd45e" : `rgba(${COLF[X]},0.9)`); if (f.planted) txt(f.ank, `${Math.round(100 * wv)} %`, "#ffd45e", 10, -8, 11); }
    const J = pose.J, seg = (a, b, col, wd) => { if (!J[a] || !J[b]) return null; const A = P(J[a].j), Bq = P(J[b].j); x.strokeStyle = col; x.lineWidth = wd; x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(Bq[0], Bq[1]); x.stroke(); return [(J[a].j[0] + J[b].j[0]) / 2, (J[a].j[1] + J[b].j[1]) / 2]; };
    const tick = (m, yaw, col) => { if (!m) return; line([m, [m[0] + Math.cos(yaw) * 0.32, m[1] + Math.sin(yaw) * 0.32]], col, 2.2); };
    const hm = seg("thigh_R", "thigh_L", "#ff9a3d", 4), sm = seg("upperArm_R", "upperArm_L", "#5ee8e0", 4);
    const yh = J.thigh_R && J.thigh_L ? Math.atan2(J.thigh_L.j[1] - J.thigh_R.j[1], J.thigh_L.j[0] - J.thigh_R.j[0]) - Math.PI / 2 : pose.psi, ys = J.upperArm_R && J.upperArm_L ? Math.atan2(J.upperArm_L.j[1] - J.upperArm_R.j[1], J.upperArm_L.j[0] - J.upperArm_R.j[0]) - Math.PI / 2 : pose.psi;
    tick(hm, yh + Math.PI, "#ff9a3d"); tick(sm, ys + Math.PI, "#5ee8e0");
    { const q = P(pose.S); x.fillStyle = "#ff5ec8"; x.beginPath(); x.arc(q[0], q[1], 4.5, 0, 2 * Math.PI); x.fill(); }
    const hd = wrapD(yh + Math.PI) / DEG, sd = wrapD(ys + Math.PI) / DEG, sep = wrapD((ys - yh)) / DEG;
    x.fillStyle = "#e6efe9"; x.font = "11px Menlo, monospace"; const ld = sep * Math.sign(B.sig); x.fillText(`hips ${hd >= 0 ? "+" : ""}${hd.toFixed(0)}° · shoulders ${sd >= 0 ? "+" : ""}${sd.toFixed(0)}° (lead ${ld >= 0 ? "+" : ""}${ld.toFixed(0)}°)`, 10, 34); x.fillText(`load R ${Math.round(100 * pose.w.R)} % · L ${Math.round(100 * pose.w.L)} %`, 10, 48); }
  // the ball
  if (D.ball) { const q = P(D.ball); x.beginPath(); x.arc(q[0], q[1], Math.max(3, 0.11 * s), 0, 2 * Math.PI); x.fillStyle = "rgba(255,255,255,0.22)"; x.fill(); x.strokeStyle = "#ffffff"; x.lineWidth = 2; x.stroke(); }
  x.fillStyle = "#ffffff"; x.font = "bold 12px -apple-system, Helvetica, sans-serif"; x.fillText("TOP — the body (the passer is up) · 0.5 m grid", 10, 18);
  x.font = "10px Menlo, monospace"; const lg = [["#5ea8ff", "R plant"], ["#ff9f5e", "L plant"], ["#5ee8e0", "pivot · shoulders"], ["#ff9a3d", "hips"], ["#ff5ec8", "COM"], ["#ffd45e", "loaded foot"]]; let lx = 10, ly = h - 24;
  for (const [c, l] of lg) { const wl = 14 + x.measureText(l).width + 10; if (lx + wl > w) { lx = 10; ly += 13; } x.fillStyle = c; x.fillRect(lx, ly - 8, 9, 9); x.fillStyle = "#c9d4ce"; x.fillText(l, lx + 13, ly); lx += wl; }
}
function compute() {
  const t0 = performance.now(), P = prepareTurn(condFor(L.cond)); L.P = P;
  if (P.A.none) { L.ep = null; L.body = null; L.lad = []; L.dur = 2; L.t0 = 0; L.tc = 1; L.simMs = performance.now() - t0; return; }
  const spec = drawSpec(); L.ep = runTurn(P, L.bc, spec, { every: 1 }); L.IE = runTurn(P, 99, { example: "PERFECT" }, { every: 2 });
  L.lad = L.ladder ? LADDER.map((bc) => ({ bc, ep: runTurn(P, bc, spec, { every: 6, carry: false }) })) : [];
  L.body = W.RUN1_V13 && L.skel ? (L.bodyKind === "v1" ? new TurnBody(W.RUN1_V13, M4G, L.skel, P, L.ep) : new HumanTurnBody(W.RUN1_V13, M4G, L.skel, P, L.ep)) : null; L.tc = P.kc * DT; L.t0 = Math.max(0, L.tc - 1.0); L.dur = L.tc + 2.6;
  if (L.t < L.t0 || L.t > L.dur) L.t = L.t0; L.simMs = performance.now() - t0;
  // the fingerprint (Chrome = Node): the plan, the executed launch, the continuation, the ball at the end
  let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  mix(P.kc); for (const x of L.ep.ex.v) mix(x); mix(L.ep.m.tCont == null ? -1 : L.ep.m.tCont); for (const x of L.ep.rec[L.ep.rec.length - 1].p) mix(x); L.hash = h.toString(16);
}
function ballAt(t) { const P = L.P, k = Math.round(t / DT); if (!L.ep || k <= P.kc) { const s = P.inc.pred.P[Math.min(P.inc.pred.P.length - 1, Math.max(0, k))]; return { a: s.p, i: s.p }; } const i = k - P.kc, r = L.ep.rec, ri = L.IE.rec, pick = (rec, j) => rec[Math.min(rec.length - 1, Math.max(0, Math.round(j / (rec[1].i - rec[0].i))))].p; return { a: pick(r, i), i: pick(ri, i) }; }
function render() {
  if (!L.ready) return; const P = L.P, gl = L.gl, cv = L.cv, dpr = L.dpr || W.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); L.ov.width = cv.width; L.ov.height = cv.height; }
  const ctx = L.ov.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, L.ov.width, L.ov.height); ctx.scale(dpr, dpr);
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0.06, 0.08, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const C = cam(w, h), none = P.A.none, bs = none ? null : ballAt(L.t), pose = L.body && bs ? L.body.poseAt(L.t, bs.a) : null;
  const sh = new Float32Array(32); let ns = 0; const push = (p, s, wt) => { if (ns < 8) { sh.set([toW(p)[0], -toW(p)[2], s, wt], ns * 4); ns++; } };
  if (bs) push([bs.a[0], bs.a[1], 0], 0.12 + Math.max(0, bs.a[2] - 0.11) * 0.4, 0.6 * Math.exp(-Math.max(0, bs.a[2] - 0.11) * 4)); if (pose) push([pose.S[0], pose.S[1], 0], 0.42, 0.4);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
  const G = L.ground; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.view, false, C.view); gl.uniformMatrix4fv(G.u.proj, false, C.proj); gl.uniform4fv(G.u.sh, sh); gl.uniform1i(G.u.nsh, ns); gl.bindVertexArray(G.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  if (pose && L.ent) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); W.ofCharDraw(L.R, L.ent, pose.skin, C.view, C.proj); gl.disable(gl.CULL_FACE); }
  const B = L.ball, drawBall = (p, tint) => { gl.useProgram(B.p); gl.uniformMatrix4fv(B.u.view, false, C.view); gl.uniformMatrix4fv(B.u.proj, false, C.proj); gl.uniform3fv(B.u.c, toW(p)); gl.uniform4fv(B.u.q, [0, 0, 0, 1]); gl.uniform1f(B.u.r, 0.11); gl.uniform3fv(B.u.tint, tint); gl.bindVertexArray(B.vao); gl.drawElements(gl.TRIANGLES, B.n, gl.UNSIGNED_SHORT, 0); gl.bindVertexArray(null); };
  if (bs) { if (L.t > L.tc + 1e-6) drawBall(bs.i, [0.45, 1.0, 0.6]); drawBall(bs.a, [1, 1, 1]); }
  if (!none) {
    const D = turnData(P, L.ep, { body: L.body }), pr = (p) => proj3(C, w, h, toW([p[0], p[1], p[2] != null ? p[2] : 0.01])), z = 0.012;
    const line = (pts, col, wd, dash) => { if (!pts) return; ctx.beginPath(); let s = false; for (const p of pts) { const q = pr([p[0], p[1], p[2] != null ? p[2] : z]); if (!q) continue; if (!s) { ctx.moveTo(q[0], q[1]); s = true; } else ctx.lineTo(q[0], q[1]); } ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
    const arrow3 = (a, v, col, wd, lbl) => { const b = [a[0] + v[0], a[1] + v[1], z], A = pr([a[0], a[1], z]), Bq = pr(b); if (!A || !Bq) return; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bq[0], Bq[1]); ctx.stroke(); const an = Math.atan2(Bq[1] - A[1], Bq[0] - A[0]); ctx.beginPath(); ctx.moveTo(Bq[0], Bq[1]); ctx.lineTo(Bq[0] - 10 * Math.cos(an - 0.4), Bq[1] - 10 * Math.sin(an - 0.4)); ctx.lineTo(Bq[0] - 10 * Math.cos(an + 0.4), Bq[1] - 10 * Math.sin(an + 0.4)); ctx.closePath(); ctx.fill(); if (lbl) { ctx.font = "11px Menlo, monospace"; ctx.fillText(lbl, Bq[0] + 5, Bq[1] - 5); } };
    line(D.inc, TCOL.incoming, 1.5, [4, 4]); arrow3([0, 0], [0.9, 0], TCOL.facing, 2, "initial facing");
    line([D.exit.from, [D.exit.from[0] + D.exit.u[0] * 4, D.exit.from[1] + D.exit.u[1] * 4]], TCOL.exit, 2.4, [9, 5]); { const q = pr([D.exit.from[0] + D.exit.u[0] * 3.2, D.exit.from[1] + D.exit.u[1] * 3.2, z]); if (q) { ctx.fillStyle = TCOL.exit; ctx.font = "12px Menlo, monospace"; ctx.fillText(`exit ${L.cond.theta}°`, q[0] + 6, q[1] - 6); } }
    { const pts = []; for (let i = 0; i <= 24; i++) { const a = D.rot.a0 + (D.rot.a1 - D.rot.a0) * i / 24; pts.push([D.rot.c[0] + Math.cos(a) * 0.6, D.rot.c[1] + Math.sin(a) * 0.6]); } line(pts, TCOL.rot, 1.8, [3, 3]); }
    if (L.t > L.tc - 0.4) { line(D.ideal, TCOL.ideal, 1.8, [6, 4]); }
    if (L.t > L.tc) { line(D.actual && D.actual.filter((p, j) => j * 1 <= (L.t - L.tc) / DT), TCOL.actual, 2.2); arrow3(D.C, [D.vIdeal[0] * 0.35, D.vIdeal[1] * 0.35], TCOL.vIdeal, 3, "ideal touch"); arrow3(D.C, [D.vActual[0] * 0.35, D.vActual[1] * 0.35], TCOL.vActual, 3, "actual touch"); }
    const rq = pr([D.Prec[0], D.Prec[1], z]); if (rq) { ctx.strokeStyle = TCOL.ideal; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(rq[0], rq[1], 8, 0, 2 * Math.PI); ctx.stroke(); }
    if (D.meet && L.t > L.tc + L.ep.meet.t - 0.05) { const q = pr([D.meet[0], D.meet[1], z]); if (q) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0], q[1] - 8); ctx.lineTo(q[0] + 8, q[1]); ctx.lineTo(q[0], q[1] + 8); ctx.lineTo(q[0] - 8, q[1]); ctx.closePath(); ctx.stroke(); } }
    if (D.ctrl) { const q = pr([D.ctrl[0], D.ctrl[1], z]); if (q) { ctx.strokeStyle = TCOL.ctrl; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], 8, 0, 2 * Math.PI); ctx.stroke(); } }
    const cq = pr([D.C[0], D.C[1], 0.11]); if (cq && L.t < L.tc + 0.6) { ctx.beginPath(); ctx.arc(cq[0], cq[1], 7, 0, 2 * Math.PI); ctx.strokeStyle = TCOL.surf.FOOT; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = TCOL.surf.FOOT; ctx.font = "11px Menlo, monospace"; ctx.fillText(`CONTACT · ${P.A.F} ${P.A.surface.toLowerCase()}`, cq[0] + 10, cq[1] - 8); }
    if (L.lad && L.ladder) for (const rn of L.lad) { const m = rn.ep.m, p = m.meet ? m.meet.ball : rn.ep.follow ? rn.ep.follow.contact : null; if (!p) continue; const q = pr([p[0], p[1], z]); if (q) { ctx.fillStyle = ladderCol(rn.bc); ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, 2 * Math.PI); ctx.fill(); ctx.font = "10px Menlo, monospace"; ctx.fillText(rn.bc, q[0] + 4, q[1] - 3); } }
    // human-motion overlays: the loaded foot (filled, sized by its share of the weight), the centre of mass on the turf, the phase
    if (L.overlay && pose && pose.w) { for (const X of ["R", "L"]) { const f = pose.feet[X], q = pr([f.ank[0], f.ank[1], 0.01]); if (!q) continue; const wv = pose.w[X];
        ctx.beginPath(); ctx.arc(q[0], q[1], 4 + 9 * wv, 0, 2 * Math.PI); ctx.fillStyle = `rgba(255,214,94,${(0.15 + 0.6 * wv).toFixed(2)})`; ctx.fill(); if (f.pivot) { ctx.strokeStyle = "#5ee8e0"; ctx.lineWidth = 1.5; ctx.stroke(); } }
      const cq = pr([pose.S[0], pose.S[1], 0.01]); if (cq) { ctx.fillStyle = "#ff5ec8"; ctx.beginPath(); ctx.arc(cq[0], cq[1], 4, 0, 2 * Math.PI); ctx.fill(); } }
    const phase = L.body && L.body.ev ? phaseOf(L.body, L.t - L.tc) : "";
    const m = L.ep.m, fam = FAMILIES[P.A.fid].label;
    if (document.body.classList.contains("compare")) { const lbl = `${L.cond.theta > 0 ? "+" : ""}${L.cond.theta}° · BC ${L.bc}${L.draw.startsWith("seed") ? " · seed " + L.draw.slice(4) : ""}`, sub = `${m.cls} · ${P.A.fid.replace("_", " ").toLowerCase()} · ${P.A.F} ${P.A.surface.toLowerCase()} · step ${m.extraAdj == null ? "—" : fmt(m.extraAdj) + " m"} · go ${m.tCont == null ? "—" : fmt(m.tCont) + " s"}`;
      ctx.fillStyle = "rgba(10,14,12,0.72)"; ctx.fillRect(0, 0, w, 58); ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px -apple-system, Helvetica, sans-serif"; ctx.fillText(lbl, 12, 30); ctx.fillStyle = TCOL.cls[m.cls]; ctx.font = "bold 14px -apple-system, Helvetica, sans-serif"; ctx.fillText(sub, 12, 50);
      ctx.fillStyle = "#e6efe9"; ctx.font = "13px Menlo, monospace"; ctx.fillText(`t ${L.t - L.tc >= 0 ? "+" : ""}${fmt(L.t - L.tc, 2)} s`, w - 110, 30); if (phase || L.eventLabel) { ctx.fillStyle = "rgba(10,14,12,0.72)"; ctx.fillRect(0, h - 30, w, 30); ctx.fillStyle = L.eventLabel ? "#5ee8e0" : "#ffd45e"; ctx.font = "bold 15px -apple-system, Helvetica, sans-serif"; ctx.fillText(L.eventLabel ? "▶ " + L.eventLabel : phase, 12, h - 10); } }
    else { ctx.fillStyle = "#e6efe9"; ctx.font = "12px Menlo, monospace"; ctx.fillText(`t ${fmt(L.t - L.tc, 2)} s from the contact · ${L.cond.theta}° · ${fam} · ${P.A.F} ${P.A.surface.toLowerCase()} · BC ${L.bc} · ${m.cls}`, 10, 18); }
  }
  // TOP view
  const c = $("#top"), cw = c.clientWidth, chh = c.clientHeight; if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); }
  const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, cw, chh);
  if (none) { x.fillStyle = TCOL.dim; x.font = "12px Menlo, monospace"; x.fillText("no feasible receive-turn action for this ball and these constraints: " + JSON.stringify(P.A.rej), 12, 20); return; }
  const D = turnData(P, L.ep, { body: L.body }); D.J = pose ? pose.J : null; D.ball = bs ? bs.a : null; D.ballIdeal = bs && L.t > L.tc ? bs.i : null;
  if (L.lad && L.ladder) D.ghosts = L.lad.map((rn) => ({ path: rn.ep.rec.filter((r) => r.i <= 2.2 * 240).map((r) => r.p), col: ladderCol(rn.bc), end: rn.ep.m.meet ? rn.ep.m.meet.ball : null }));
  if (L.top === "body" && L.body && L.body.cPose && L.body.seg) { bodyTop(x, { x: 0, y: 0, w: cw, h: chh }, L.body, pose, L.t - L.tc, D); return; }
  const ext = L.extCache || (L.extCache = turnExtents(D)); turnTop(x, { x: 0, y: 0, w: cw, h: chh }, ext, D, { font: 11, title: "TOP — the passer is up", sub: `${FAMILIES[P.A.fid].label} · ${P.A.F} ${P.A.surface.toLowerCase()}${P.A.fid === "THROUGH_TURN" ? " (" + P.A.vid + " the standing leg)" : ""}` });
}
function hud() {
  const P = L.P, el = $("#hud"); if (!P) return; if (P.A.none) { el.innerHTML = `<b>No feasible receive-turn action</b>: <pre>${JSON.stringify(P.A.rej, null, 1)}</pre>`; return; }
  const A = P.A, ex = L.ep.ex, m = L.ep.m, I = L.IE.m, v = (a) => `(${a.map((q) => fmt(q)).join(", ")})`;
  const cands = A.cands.map((c) => `<tr${c.fid === A.fid ? ' style="color:#ffd45e"' : ""}><td>${c.fid}</td><td>${c.F} ${c.surface.toLowerCase()}${c.vid !== "front" && c.vid !== "back" && c.vid !== "side" ? " · " + c.vid : ""}</td><td>J ${fmt(c.J)}</td><td>D ${fmt(c.D)}</td><td>open ${c.psiC}°</td><td>contact ${fmt(c.t)} s</td><td>meet +${fmt(c.tRec)} s</td><td>touch ${fmt(c.s0)} m/s</td></tr>`).join("");
  el.innerHTML = `<div class="cols"><div><h3>The action (Ball Control never enters)</h3><b>${FAMILIES[A.fid].label}</b> · contact foot <b>${A.F}</b> · surface <b>${A.surface.toLowerCase()}</b>${A.fid === "THROUGH_TURN" ? " · " + A.vid + " the standing leg" : ""}<br>
    body open at the contact ${fmt(A.psiC / DEG, 0)}° · rotation after it ${fmt(A.dPsi / DEG, 0)}° (${fmt(A.path.Trot)} s) · stance shift ${fmt(Math.hypot(A.S[0], A.S[1]))} m · CONTACT ${fmt(P.kc * DT, 3)} s<br>
    D ${fmt(A.D, 3)} (the ball's ${fmt(A.Dk, 3)} × family ${fmt(FAMILIES[A.fid].m)} × (1 + rotation ${fmt(0.55 * A.rotIn, 3)} + glance ${fmt(0.008 * A.glance, 3)} + surface + pace)) · selection ${fmt(P.cpu.select, 1)} ms, ${A.nEval} evaluated, ${A.nFeasible} feasible
    <h3>Ideal first touch</h3>${v(A.vIdeal.slice(0, 2))} m/s (${fmt(A.s0)}) toward the reconnection point ${v(A.Prec)} at +${fmt(A.tRec)} s · the exit line from ${v(A.path.endRoot)} at ${L.cond.theta}° · the touch vector is ${fmt(Math.abs(((Math.atan2(A.dHat[1], A.dHat[0]) - A.theta) / DEG + 540) % 360 - 180), 0)}° off the exit vector
    <h3>Feasible action set (best per family)</h3><table class="lad">${cands}</table></div>
   <div><h3>Ball Control ${L.bc} (curve B: executes like current BC ${fmt(gBC(L.bc), 1)})</h3>E ${fmt(ex.E, 4)} · σ damping ${fmt(ex.sigma.damping)} · weight ${fmt(ex.sigma.weight)} · direction ${fmt(ex.sigma.direction)} · vertical ${fmt(ex.sigma.vertical)} m/s<br>
    draws (bounded) damping ${fmt(L.ep.N.damping)} · weight ${fmt(L.ep.N.weight)} · direction ${fmt(L.ep.N.direction)} · vertical ${fmt(L.ep.N.vertical)} <span class="dim">${L.ep.N.source}</span><br>
    actual touch ${v(ex.v)} m/s · speed error ${fmt(m.touchSpeedErr)} m/s · direction error ${fmt(m.dirErrDeg, 1)}° (+ = toward the turn side) · lift ${fmt(m.lift)} m/s${m.capped ? " · capped " + m.capped : ""}
    <h3>CONTINUATION</h3><b style="color:${TCOL.cls[m.cls]}">${m.cls}</b> · touches ${m.contacts} · continuing at ${m.tCont == null ? "—" : "+" + fmt(m.tCont) + " s"} (ideal +${fmt(I.tCont)}) · correction ${m.extraAdj == null ? "—" : fmt(m.extraAdj) + " m"} · later ${m.extraT == null ? "—" : fmt(m.extraT) + " s"} · ball ${m.offLine == null ? "—" : fmt(Math.abs(m.offLine)) + " m off the exit line"} · placement error at the planned meeting ${fmt(m.place)} m${m.notes.length ? "<br><span class='dim'>" + m.notes.join("; ") + "</span>" : ""}</div>
   <div><h3>BC ladder (the same draws)</h3>${L.lad.length ? `<table class="lad"><tr><td></td>${L.lad.map((r) => `<td style="color:${ladderCol(r.bc)}">${r.bc}</td>`).join("")}</tr><tr><td class="dim">class</td>${L.lad.map((r) => `<td style="color:${TCOL.cls[r.ep.m.cls]}">${r.ep.m.cls.slice(0, 3)}</td>`).join("")}</tr><tr><td class="dim">correction m</td>${L.lad.map((r) => `<td>${r.ep.m.extraAdj == null ? "—" : fmt(r.ep.m.extraAdj)}</td>`).join("")}</tr><tr><td class="dim">go s</td>${L.lad.map((r) => `<td>${r.ep.m.tCont == null ? "—" : fmt(r.ep.m.tCont)}</td>`).join("")}</tr><tr><td class="dim">touches</td>${L.lad.map((r) => `<td>${r.ep.m.contacts}</td>`).join("")}</tr></table>` : "off"}
   <span class="dim">computed in ${fmt(L.simMs, 0)} ms · fingerprint ${L.hash}</span></div></div>`;
}
const SL = [["theta", "turn °", -180, 180, 5], ["v", "pass m/s", 2, 24, 0.5], ["lat", "ball line m", -0.6, 0.6, 0.05], ["bc", "Ball Control", 1, 99, 1]];
function controls() {
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o) => `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
  $("#ctl").innerHTML = `<b class="t">Human-motion lab · RECEIVE-TURN-1.1</b><label>body <select id="bdy"><option value="human" ${L.bodyKind === "human" ? "selected" : ""}>human motion (1.1)</option><option value="v1" ${L.bodyKind === "v1" ? "selected" : ""}>RECEIVE-TURN-1 body</option></select></label><label>top view <select id="tpv"><option value="body" ${L.top === "body" ? "selected" : ""}>body (plants, pivots, COM)</option><option value="ball" ${L.top === "ball" ? "selected" : ""}>football (RECEIVE-TURN-1)</option></select></label><label><input type="checkbox" id="ovl" ${L.overlay ? "checked" : ""}> support / COM</label>` + SL.map(([k, l, a, b, s]) => `<label class="sl">${l} <input type="range" id="s_${k}" min="${a}" max="${b}" step="${s}" value="${k === "bc" ? L.bc : L.cond[k]}"><output id="o_${k}">${k === "bc" ? L.bc : L.cond[k]}</output></label>`).join("") +
    `<label>draw ${sel("drw", [["TYPICAL", "typical"], ["HEAVY", "heavy (p75)"], ["PERFECT", "perfect"]].concat(Array.from({ length: 40 }, (_, i) => ["seed" + (i + 1), "seed " + (i + 1)])), L.draw)}</label>
     <label>family ${sel("fam", [["AUTO", "AUTO"]].concat(FAMILY_ORDER.map((f) => [f, f.toLowerCase()])), L.cond.family)}</label><label>foot ${sel("ft", [["AUTO", "AUTO"], ["R", "right"], ["L", "left"]], L.cond.foot)}</label>
     <label>variant ${sel("vr", [["AUTO", "AUTO"], ["across", "across"], ["behind", "behind"]], L.cond.variant)}</label><label>preparation ${sel("prp", [["clean", "clean (early read)"], ["0.6", "0.6 s"], ["0.45", "0.45 s"], ["0.3", "0.3 s"]], L.cond.prep)}</label>
     <label>preferred ${sel("prf", [["R", "right"], ["L", "left"], ["both", "two-footed"]], L.cond.pref)}</label><label>camera ${sel("cam", [["close34", "close 3/4"], ["gameplay", "gameplay"], ["auto", "across the exit"], ["overhead", "overhead"], ["side", "side"], ["passer", "passer"], ["behind", "behind"]], L.cam)}</label>
     <button id="play">${L.playing ? "❚❚" : "▶"}</button>${[1, 0.5, 0.25, 0.1].map((r) => `<button class="rt ${r === L.rate ? "on" : ""}" data-r="${r}">${r}×</button>`).join("")}<button id="rst">⟲</button>
     <label><input type="checkbox" id="lad" ${L.ladder ? "checked" : ""}> BC ladder</label><input type="range" id="scrub" min="0" max="1000" value="0" style="width:200px"><a href="receive_turn1.html" target="_blank">turn matrix ↗</a>`;
  const upd = () => { const u = new URL(location.href); for (const [k] of SL) u.searchParams.set(k, k === "bc" ? L.bc : L.cond[k]); for (const k of ["family", "foot", "variant", "prep", "pref"]) u.searchParams.set(k, L.cond[k]); u.searchParams.set("draw", L.draw); u.searchParams.set("cam", L.cam); u.searchParams.set("top", L.top); history.replaceState(null, "", u.toString()); };
  let pend = null; const recompute = () => { if (pend) clearTimeout(pend); pend = setTimeout(() => { L.extCache = null; compute(); hud(); render(); upd(); }, 30); };
  for (const [k] of SL) $("#s_" + k).oninput = (e) => { const x = +e.target.value; $("#o_" + k).textContent = x; if (k === "bc") L.bc = x; else L.cond[k] = x; recompute(); };
  $("#drw").onchange = (e) => { L.draw = e.target.value; recompute(); }; $("#bdy").onchange = (e) => { L.bodyKind = e.target.value; recompute(); }; $("#ovl").onchange = (e) => { L.overlay = e.target.checked; render(); }; $("#tpv").onchange = (e) => { L.top = e.target.value; render(); };
  for (const [id, k] of [["fam", "family"], ["ft", "foot"], ["vr", "variant"], ["prp", "prep"], ["prf", "pref"]]) $("#" + id).onchange = (e) => { L.cond[k] = e.target.value; recompute(); };
  $("#cam").onchange = (e) => { L.cam = e.target.value; upd(); };
  $("#play").onclick = () => { L.playing = !L.playing; $("#play").textContent = L.playing ? "❚❚" : "▶"; }; $("#rst").onclick = () => { L.t = L.t0; };
  document.querySelectorAll(".rt").forEach((b) => (b.onclick = () => { L.rate = +b.dataset.r; document.querySelectorAll(".rt").forEach((q) => q.classList.toggle("on", q === b)); }));
  $("#lad").onchange = (e) => { L.ladder = e.target.checked; recompute(); };
  $("#scrub").oninput = (e) => { L.playing = false; $("#play").textContent = "▶"; L.t = L.t0 + (L.dur - L.t0) * (+e.target.value / 1000); };
  W.addEventListener("keydown", (e) => { if (e.target.tagName === "INPUT" && e.target.type !== "range") return; if (e.key === " ") { L.playing = !L.playing; e.preventDefault(); } if (e.key === ".") { L.playing = false; L.t += 1 / 60; } if (e.key === ",") { L.playing = false; L.t -= 1 / 60; } if (e.key === "r") L.t = L.t0; });
}
function frame(now) { if (L.last == null) L.last = now; const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now; if (L.playing) { L.t += dt * L.rate; if (L.t > L.dur) L.t = L.t0; } const sc = $("#scrub"); if (sc && L.dur > L.t0) sc.value = String(Math.round(1000 * (L.t - L.t0) / (L.dur - L.t0))); render(); requestAnimationFrame(frame); }
async function boot() {
  L.cv = $("#gl"); L.ov = $("#ov"); const gl = L.cv.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true, alpha: false }); if (!gl) throw new Error("WebGL2 unavailable");
  L.gl = gl; L.R = { gl }; L.ground = groundProg(gl); L.ball = ballProg(gl);
  try { L.ent = await W.ofCharLoad("vinicius"); L.skel = L.ent.skel; } catch (e) { console.warn("character", e); }
  controls(); compute(); hud(); L.ready = true; if (Q.get("t")) L.t = L.tc + +Q.get("t");
  if (Q.get("compare") === "1") document.body.classList.add("compare");
  W.RTL = { state: L, setRel(dt, label) { L.t = L.tc + dt; L.eventLabel = label || null; render(); return true; }, events() { return L.body && L.body.ev ? Object.assign({}, L.body.ev) : null; },
    // Chrome = Node for the BODY: the posed joints at the listed times (relative to the contact), hashed
    bodyProbe(ts) { if (!L.body) return null; let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(7); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
      for (const t of ts) { const po = L.body.poseAt(L.tc + t, ballAt(L.tc + t).a); for (const k of Object.keys(po.J).sort()) for (const v of po.J[k].j) mix(v); } return h.toString(16); },
    // Chrome = Node: one case through the page's own chain (no reload)
    evalCase(c, bc, draw) { L.cond = Object.assign({ theta: 0, v: 12, lat: 0, family: "AUTO", foot: "AUTO", variant: "AUTO", prep: "clean", pref: "R" }, c); L.bc = bc; L.draw = draw; L.extCache = null; L.ladder = false; compute(); const P = L.P; if (P.A.none) return { none: true };
      const e = L.ep; return { hash: L.hash, fid: P.A.fid, F: P.A.F, surface: P.A.surface, kc: P.kc, v: e.ex.v, cls: e.m.cls, tCont: e.m.tCont, extraAdj: e.m.extraAdj, contacts: e.m.contacts, end: e.rec[e.rec.length - 1].p, launched: e.launched }; } };
  W.RTL_READY = true;
  if (Q.get("external") === "1") { L.playing = false; render(); } else requestAnimationFrame(frame);
}
boot().catch((e) => { $("#hud").textContent = "lab failed: " + (e && e.stack || e); console.error(e); });
