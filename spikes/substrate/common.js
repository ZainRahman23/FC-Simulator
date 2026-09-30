// ═══ spikes/substrate/common.js — DISPOSABLE physics-substrate spike (not Gate A, not production) ═══════════════════════════════════
// One identical scene for every engine: a 2-body "attacker leg" (thigh + shank capsules) hanging from a fixed hip by a spherical joint
// with limits, a hinge knee with limits, held by OUR OWN PD torques; and a fast dynamic capsule hitting the shank:
//   case ROT_09 / ROT_15 — a dynamic "tackler shin" capsule on a motor-driven hinge, sweeping horizontally at 9 / 15 m/s (at the contact
//                          radius) into the shank — the fast ROTATING dynamic-vs-dynamic limb case;
//   case LIN_13          — a free dynamic capsule flying at 13 m/s into the shank (linear case).
// The METRICS are computed here from body transforms only (exact capsule–capsule distance), identically for every engine.
"use strict";
const path = require("path");
const DEPS = process.env.PHYS_SPIKE_DEPS || "/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4/scratchpad/physspike/node_modules";
const dep = (name) => require(path.join(DEPS, name));

const FPS = 60, DT = 1 / FPS, FRAMES = 40;
// scene (metres, y up). Shapes are capsules along their body's local +y axis (half = half segment length, r = radius).
const S = {
  hip: [0, 1.05, 0],
  thigh: { c: [0, 0.81, 0], half: 0.24, r: 0.085, m: 11.0, I: [0.274, 0.0562, 0.274] },   // de Leva-style inertia (kg m²), principal, local
  shank: { c: [0, 0.35, 0], half: 0.22, r: 0.055, m: 3.4, I: [0.0428, 0.00698, 0.0428] },
  knee: [0, 0.57, 0],
  pivot: [0, 0.30, -0.55],                                         // sweeper hinge (vertical axis); sweeper segment spans 0.15..0.70 m from it
  sweep: { from: 0.15, to: 0.70, r: 0.06, m: 3.4, I: [0.0669, 0.0109, 0.0669], theta0: -60 * Math.PI / 180, rHit: 0.55 },
  lin: { c0: [0, 0.30, -0.80], half: 0.20, r: 0.06, m: 3.4, I: [0.0459, 0.00491, 0.0459], v: 13 },   // capsule axis along world x, flying +z
  pd: { hipHz: 4, kneeHz: 4, zeta: 1.0 },
};
S.sweep.half = (S.sweep.to - S.sweep.from) / 2; S.sweep.mid = (S.sweep.to + S.sweep.from) / 2;
const CASES = {
  ROT_09: { kind: "rot", vHit: 9 }, ROT_15: { kind: "rot", vHit: 15 }, LIN_13: { kind: "lin", vHit: 13 },
};
const PHASES = [0, 0.2, 0.4, 0.6, 0.8];
// the case at a phase: theta0 / start position advanced by phase × one frame of travel (the adapter reads cs.theta0 / cs.c0)
const caseAt = (name, ph) => { const C = Object.assign({}, CASES[name], { phase: ph });
  if (C.kind === "rot") { const om = C.vHit / S.sweep.rHit; C.theta0 = S.sweep.theta0 + ph * om * DT; }
  else C.c0 = [S.lin.c0[0], S.lin.c0[1], S.lin.c0[2] + ph * C.vHit * DT];
  return C; };
// ── small math (Float64) ──
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len: (a) => Math.hypot(a[0], a[1], a[2]) };
const q = {   // [x, y, z, w]
  mul: (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  conj: (a) => [-a[0], -a[1], -a[2], a[3]],
  axis: (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; },
  rot: (a, v) => { const u = [a[0], a[1], a[2]], s = a[3], t = v3.sc(v3.cross(u, v), 2); return v3.add(v3.add(v, v3.sc(t, s)), v3.cross(u, t)); },
  // rotation vector (axis * angle) of a quaternion, shortest path
  log: (a) => { let x = a[0], y = a[1], z = a[2], w = a[3]; if (w < 0) { x = -x; y = -y; z = -z; w = -w; } const s = Math.hypot(x, y, z); if (s < 1e-12) return [2 * x, 2 * y, 2 * z]; const ang = 2 * Math.atan2(s, w); return [x / s * ang, y / s * ang, z / s * ang]; },
};
// sweeper orientation at angle th: capsule local +y → world (sin th, 0, cos th)   (Ry(th) · Rx(+90°))
const sweepRot = (th) => q.mul(q.axis([0, 1, 0], th), q.axis([1, 0, 0], Math.PI / 2));
const linRot = q.axis([0, 0, 1], -Math.PI / 2);                   // capsule local +y → world +x
// closest distance between segments (Ericson)
function segDist(p1, q1, p2, q2) {
  const d1 = v3.sub(q1, p1), d2 = v3.sub(q2, p2), r = v3.sub(p1, p2), a = v3.dot(d1, d1), e = v3.dot(d2, d2), f = v3.dot(d2, r), cl = (x) => Math.max(0, Math.min(1, x));
  let s, t; const c = v3.dot(d1, r), b = v3.dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e;
  if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); }
  return v3.len(v3.sub(v3.add(p1, v3.sc(d1, s)), v3.add(p2, v3.sc(d2, t))));
}
const seg = (pose, half) => { const ax = q.rot(pose.q, [0, half, 0]); return [v3.sub(pose.p, ax), v3.add(pose.p, ax)]; };

// OUR OWN PD (the "Touchline controller" path): world-space hip PD on the thigh (target: hanging straight down, identity) and a
// relative knee PD (target 5° flexion about x). Torques are applied by the adapter each (sub)step. Gains from ω and the body inertia.
function pdTorques(th, sh, h) {
  const out = {};
  const w1 = 2 * Math.PI * S.pd.hipHz, kp1 = S.thigh.I[0] * w1 * w1 * 2.5, kd1 = 2 * S.pd.zeta * S.thigh.I[0] * w1 * 1.6;   // chain inertia ≈ thigh + shank
  const e1 = q.log(q.mul([0, 0, 0, 1], q.conj(th.q)));                       // world rotation taking the thigh to its target
  out.thigh = v3.sub(v3.sc(e1, kp1), v3.sc(th.w, kd1));
  const w2 = 2 * Math.PI * S.pd.kneeHz, kp2 = S.shank.I[0] * w2 * w2, kd2 = 2 * S.pd.zeta * S.shank.I[0] * w2;
  const qTarget = q.mul(th.q, q.axis([1, 0, 0], -5 * Math.PI / 180));        // shank target orientation (world)
  const e2 = q.log(q.mul(qTarget, q.conj(sh.q)));
  const tk = v3.sub(v3.sc(e2, kp2), v3.sc(v3.sub(sh.w, th.w), kd2));
  out.shank = tk; out.thigh = v3.sub(out.thigh, tk);                         // equal and opposite at the knee
  return out;
}

// ── the run protocol ──
// adapter API: build(caseSpec, variant) → { step(h) (one physics step of length h, incl. our PD), pose(name) → {p,q,v,w},
//   contacts() → engine-reported contacts between sweeper and shank [{dist, impulse}] (whatever the engine exposes), free() }
async function runOne(adapter, caseName, variant, ph) {
  const C = caseAt(caseName, ph || 0), sim = await adapter.build(C, variant), rows = [];
  let hash = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { hash ^= s.charCodeAt(i); hash = Math.imul(hash, 16777619) >>> 0; } };
  const t0 = process.hrtime.bigint();
  let firstContactF = null, maxPen = 0, pen3 = 0, pen10 = 0, consec = 0, maxConsec = 0, tunnel = false, stepsTotal = 0, reported = [];
  const sh0 = sim.pose("shank").p;
  for (let f = 1; f <= FRAMES; f++) {
    // substep count: fixed by the variant, or ADAPTIVE (from current relative speed vs the smallest radius sum)
    let n = variant.sub || 1;
    if (variant.adaptive) { const sw = sim.pose("sweeper"), sh = sim.pose("shank"); const rel = v3.len(v3.sub(sw.v, sh.v)) + v3.len(sw.w) * (C.kind === "rot" ? S.sweep.half : S.lin.half);
      n = Math.max(1, Math.ceil(rel * DT / (0.5 * (S.shank.r + (C.kind === "rot" ? S.sweep.r : S.lin.r))))); }
    for (let k = 0; k < n; k++) sim.step(DT / n); stepsTotal += n;
    const sw = sim.pose("sweeper"), sh = sim.pose("shank"), th = sim.pose("thigh");
    const hs = C.kind === "rot" ? S.sweep.half : S.lin.half, rs = C.kind === "rot" ? S.sweep.r : S.lin.r;
    const [a1, b1] = seg(sw, hs), [a2, b2] = seg(sh, S.shank.half), pen = rs + S.shank.r - segDist(a1, b1, a2, b2);
    if (pen > 0 && firstContactF == null) firstContactF = f;
    maxPen = Math.max(maxPen, pen); if (pen > 0.003) pen3++; if (pen > 0.010) pen10++;
    consec = pen > 0.003 ? consec + 1 : 0; maxConsec = Math.max(maxConsec, consec);
    // tunnel: the fast body has got to the FAR side of the shank while the shank has hardly moved
    const shMoved = v3.len(v3.sub(sh.p, sh0));
    let far = false;
    if (C.kind === "rot") { const d = q.rot(sw.q, [0, 1, 0]); const th_ = Math.atan2(d[0], d[2]); far = th_ > Math.asin((rs + S.shank.r) / S.sweep.rHit) + 0.02 && Math.abs(d[1]) < 0.3; }
    else far = sw.p[2] > sh.p[2] + rs + S.shank.r + 0.01 && Math.abs(sw.p[0] - sh.p[0]) < 0.2 && Math.abs(sw.p[1] - 0.30) < 0.2;
    if (far && shMoved < 0.03) tunnel = true;
    const rep = sim.contacts ? sim.contacts() : null; if (rep && rep.length) reported.push({ f, n: rep.length, minDist: Math.min(...rep.map(c => c.dist)), impulse: rep.reduce((s, c) => s + (c.impulse || 0), 0) });
    for (const x of [...sw.p, ...sw.q, ...sh.p, ...sh.q, ...th.p, ...th.q]) mix(x);
    rows.push({ f, n, pen: +pen.toFixed(4), shV: +v3.len(sh.v).toFixed(3), swV: +v3.len(sw.v).toFixed(2), swW: +v3.len(sw.w).toFixed(2), shMoved: +shMoved.toFixed(3) });
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  // did the contact act IN the step where it first occurred? (the shank already moving at the end of that frame)
  const fc = firstContactF != null ? rows[firstContactF - 1] : null;
  const actedSameFrame = fc ? fc.shV > 0.05 : null;
  // TOUCH = first frame the capsules are within 1 mm; RESPONSE = first frame the shank moves > 0.5 m/s; latency ≤ 0 = responded no later than touch
  const touchF = (rows.find(r => r.pen > -0.001) || {}).f || null, respF = (rows.find(r => r.shV > 0.5) || {}).f || null;
  const penAtTouch = touchF ? rows[touchF - 1].pen : null, latency = touchF && respF ? respF - touchF : null;
  if (sim.free) sim.free();
  return { case: caseName, variant: variant.name, phase: ph || 0, touchF, respF, latency, penAtTouch, firstContactF, actedSameFrame, maxPen: +maxPen.toFixed(4), framesPen3mm: pen3, framesPen10mm: pen10, maxConsecPen3mm: maxConsec,
           tunnel, shankMaxV: Math.max(...rows.map(r => r.shV)), msTotal: +ms.toFixed(2), msPerFrame: +(ms / FRAMES).toFixed(3), stepsTotal, hash: hash.toString(16), reported: reported.slice(0, 4), rows };
}
async function runAll(adapter, variants, casesList) {
  const out = [];
  for (const cn of casesList || Object.keys(CASES)) for (const v of variants) {
    const runs = []; let det = true;
    for (const ph of PHASES) { const a = await runOne(adapter, cn, v, ph), b = await runOne(adapter, cn, v, ph); det = det && a.hash === b.hash; runs.push(a); }   // each phase twice: repeatability
    // WORST CASE over the contact phases
    const w = { case: cn, variant: v.name, deterministic: det, phases: runs.length,
      maxPen: Math.max(...runs.map(r => r.maxPen)), framesPen3mm: Math.max(...runs.map(r => r.framesPen3mm)), framesPen10mm: Math.max(...runs.map(r => r.framesPen10mm)),
      maxConsecPen3mm: Math.max(...runs.map(r => r.maxConsecPen3mm)), tunnel: runs.some(r => r.tunnel), tunnelN: runs.filter(r => r.tunnel).length,
      // latency: null touch but the shank moved = the contact acted BEFORE any visible touch (speculative) → "pre"
      latency: runs.some(r => r.touchF && !r.respF) ? "none" : runs.every(r => !r.touchF) ? "pre" : Math.max(...runs.filter(r => r.touchF).map(r => r.latency)), penAtTouch: Math.max(...runs.map(r => r.penAtTouch == null ? 0 : r.penAtTouch)),
      shankMaxV: Math.min(...runs.map(r => r.shankMaxV)), stepsTotal: Math.max(...runs.map(r => r.stepsTotal)), msPerFrame: +(runs.reduce((s, r) => s + r.msPerFrame, 0) / runs.length).toFixed(3), runs };
    out.push(w);
  }
  return out;
}
function printTable(engine, res) {
  console.log(`\n=== ${engine} ===`);
  console.log("WORST CASE over 5 contact phases per row.  pen@touch = depth when first visible; latency = frames from first touch to the shank moving (≤0 = same frame)");
  console.log("case    variant            maxPen(mm) pen@touch f>3mm f>10mm consec  tunnels latency minShankV steps ms/frame det");
  for (const r of res) console.log(`${r.case.padEnd(7)} ${r.variant.padEnd(18)} ${(r.maxPen * 1000).toFixed(1).padStart(10)} ${(r.penAtTouch * 1000).toFixed(1).padStart(9)} ${String(r.framesPen3mm).padStart(5)} ${String(r.framesPen10mm).padStart(6)} ${String(r.maxConsecPen3mm).padStart(6)} ${(r.tunnelN + "/" + r.phases).padStart(8)} ${String(r.latency).padStart(7)} ${String(r.shankMaxV).padStart(9)} ${String(r.stepsTotal).padStart(5)} ${String(r.msPerFrame).padStart(8)} ${r.deterministic}`);
}
module.exports = { dep, S, CASES, PHASES, caseAt, FPS, DT, FRAMES, v3, q, sweepRot, linRot, segDist, seg, pdTorques, runOne, runAll, printTable };
