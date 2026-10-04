// ═══ physchar2/tools/g3_mirror_v3.mjs — G3 criteria v3 (post-investigation correction of row J2): J2a controller mirror-equivariance and J2b
// mirrored physical-outcome symmetry, for all 81 mirrored pairs (user decision 2026-10-03, sources/2026-10-03_user_decision_j2_split_ankle_reinvestigation.md)
// J2a (controller alone): at EVERY tick of each trial up to its fall declaration, the controller's exact input is captured at the entry of
// StandController.compute / ActuatorLayer.compute (body states; controller + supervisor state incl. sensed foot loads / contacts, holds and the
// previous tick's info; actuator activations) and its exact MIRROR IMAGE (sagittal reflection x → −x; L ↔ R bodies, joints, feet; λ → 1 − λ) is fed
// to a fresh, never-stepped instance of the PARTNER trial's controller + actuator layer. Both directions (A → B and B → A). Compared: requested λ,
// commanded CoP (raw / clamped / ξ target), load share, per-foot CoP and force, every joint command (τ0, feed-forward, K, D), every actuator row
// (τ0, request, bounds lo / hi, capacities, K, D, activations), support-state decisions (in-support, unloaded flags, holds and their poses),
// the supervisor's continue / abort state, leg-IK residuals. Joint-axis quantities are compared through each axis's mirror correspondence
// σ = (−M·a_A)·a_B (torques are pseudovectors), never as magnitudes. No two independently evolved trajectories are compared in J2a.
// Self-check: the same captured input fed UNMIRRORED to a fresh instance of the SAME trial must reproduce the original output bit-exactly
// (proves the captured state is complete).
// --floor: the deterministic numerical floor (pre-registration input): the same captured inputs (every 8th tick of trial A of all 81 pairs, before
// the fall) perturbed by up to 4 ulps per floating-point value (relative 2^-50 × U[−1, 1], seeded), unmirrored; per-category max output change.
// J2b (paired physical runs, the D4 interpretation): non-sliding Δpos ≤ 0.1 mm; sliding but controlled recovery continues: same class, Δpos and
// |Δslip| ≤ 2.0 mm; physically failing: same class, compatible failure timing, positional comparison only through the common abort / failure
// declaration. Raw measurements only here; the pass / fail rules live in gates/v2_g3_checks_v3.js.
// usage: node tools/g3_mirror_v3.mjs [--floor] [--only=<a>,...]   → g3/json/g3_mirror_v3.json  (--floor → g3/json/g3_mirror_floor.json)
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js"; import { usableRegion, STAND } from "../ctrl/v2_stand.js"; import { bootSole } from "../sim/v2_geom.js"; import { cls } from "../gates/v2_g3_checks.js"; import { Q } from "../core/v2_math.js";

const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
// DIAGNOSTIC ONLY (never a gate configuration): run under `node --import ./tools/b_sym_patch.mjs` with B_SYM=<fixes>; the output is then
// g3_mirror_v3_sym-<fixes>.json so the gate result is never overwritten
const SYMTAG = (process.env.B_SYM || "").split(",").filter(Boolean).join("+");
// DIAGNOSTIC ONLY (overnight Phase B, J2a sensitivity): G3M_INJECT=strengthR95 | footMassR105 | regionR2mm runs the pairs on a body with the SAME
// deliberately injected L/R asymmetry as tools/j2b_floor.mjs --set=inject (identical edits, applied to a diagnostic copy of the spec) → output
// g3_mirror_v3_inject-<name>.json. Question: does the controller-level check J2a detect the asymmetries that J2b could not?
const INJECT = process.env.G3M_INJECT || "";
function injected(spec, inj) { if (!inj) return { spec, opts: {} };   // = tools/j2b_floor.mjs injected()
  const S = JSON.parse(JSON.stringify(spec));
  if (inj === "strengthR95") for (const j of S.joints) if (j.side === "R") for (const k of ["x", "y", "z"]) { const c = j.capacity[k]; if (!c) continue; for (const dir of ["plus", "minus"]) { c[dir].Nm *= 0.95; c[dir].cap.Tiso *= 0.95; if (c[dir].cap.Tdyn) c[dir].cap.Tdyn *= 0.95; } }
  if (inj === "footMassR105") { const f = S.bodies.find(b => b.name === "foot_R"); f.mass *= 1.05; f.inertia = f.inertia.map(r => r.map(v => v * 1.05)); }
  if (inj === "regionR2mm") { const fR = S.bodies.findIndex(b => b.name === "foot_R"); return { spec: S, opts: { footRegion: (f) => { const r = usableRegion(bootSole(S.bodies[f]).pts, STAND.footInset); return f === fR ? r.map(([x, z]) => [x + 0.002, z]) : r; } } }; }
  if (!["strengthR95", "footMassR105"].includes(inj)) throw new Error("unknown G3M_INJECT " + inj);
  return { spec: S, opts: {} }; }
// close-decisions stage (defaults unchanged): --stand=<json> extra controller options for every trial (the adopted E1a configuration), --out=<file>
const XSTAND = JSON.parse((process.argv.find(a => a.startsWith("--stand=")) || "--stand={}").slice(8)), OUTARG = (process.argv.find(a => a.startsWith("--out=")) || "").slice(6);
const FLOOR = process.argv.includes("--floor"), OUT = OUTARG ? path.resolve(OUTARG) : path.join(ROOT, "review_artifacts/physical_character_v2/g3/json", FLOOR ? "g3_mirror_floor.json" : INJECT ? `g3_mirror_v3_inject-${INJECT}.json` : SYMTAG ? `g3_mirror_v3_sym-${SYMTAG}.json` : "g3_mirror_v3.json");
const DIR8 = ["F", "B", "L", "R", "FL", "FR", "BL", "BR"], SLIDE = 1.0e-3, FLOOR_EVERY = 8, FLOOR_DRAWS = 2;
function pairs() { const P = [["T1", "T2"], ["T5", "T6"], ["U:R", "U:L"], ...[4, 2, 1, 0.75, 0.5, 0.25].map(T => [`T7:R:${T}`, `T7:L:${T}`])];
  for (const w of ["hold", "ramp"]) for (const d of DIR8) for (const m of [5, 10, 15, 20]) P.push([`T8:${w}:R:${d}:${m}`, `T8:${w}:L:${mirrorDir(d)}:${m}`]);
  const J = P.map(([a, b]) => ({ a, b, human: "V2-REF" })); for (const h of VARIATION_SET) J.push({ a: "U:R", b: "U:L", human: h.id }); return J; }
// ── mirror maps ──
const m3 = (p) => [-p[0], p[1], p[2]], m2 = (p) => [-p[0], p[1]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]], swap = (a) => [a[1], a[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// rotation angle between two orientations (rad), robust for the float32-derived (not exactly unit) Jolt quaternions: relative rotation conj(a)·b,
// angle 2·atan2(|xyz|, |w|) — exactly 0 for identical inputs (the first version, 2·acos|a·b|, read |q|² < 1 as ~5e-4 rad: found by the self-check, recorded)
const qd = (a, b) => { if (a.every((v, i) => v === b[i])) return 0; const r = Q.mul(Q.conj(a), b); return 2 * Math.atan2(Math.hypot(r[0], r[1], r[2]), Math.abs(r[3])); };
const lrName = (n) => (n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n);
const mirrorSt = (st, map) => map.map(i => ({ pos: m3(st[i].pos), rot: mq(st[i].rot), com: m3(st[i].com), v: m3(st[i].v), w: mw(st[i].w) }));
const mirrorPoly = (P) => P.map(m2).reverse();   // a reflection reverses the winding; keep the controller's (hull2) orientation
function mirrorInfo(I, jdS, jdQ, jmap) { if (!I) return I; const o = { ...I };
  for (const k of ["c", "v", "A"]) if (I[k]) o[k] = m3(I[k]); for (const k of ["xi", "xiRef", "pRaw", "p", "r", "mid", "heading"]) if (I[k]) o[k] = m2(I[k]);
  if (I.lam != null) o.lam = 1 - I.lam; if (I.t != null) o.t = 1 - I.t; if (I.share) o.share = swap(I.share); if (I.cop) o.cop = swap(I.cop).map(m2); if (I.F) o.F = swap(I.F).map(m3);
  if (I.polys) o.polys = swap(I.polys).map(mirrorPoly); if (I.support) o.support = I.support.map(p => (p.length === 3 ? m3(p) : m2(p))).reverse();
  if (I.Ldot) o.Ldot = mw(I.Ldot); if (I.ff) { o.ff = jdQ.map(dq => mw(I.ff[jdS.findIndex(ds => jmap[ds.k] === dq.k)])); }
  for (const k of ["inSup", "unl", "ikRes"]) if (I[k]) o[k] = swap(I[k]); return o; }
function mirrorCtrlState(S, jdS, jdQ, jmap) { const o = JSON.parse(JSON.stringify(S)); o.unl = swap(S.unl); o.hold = swap(S.hold).map(h => (h ? { pos: m3(h.pos), rot: mq(h.rot) } : null));
  o.sense = { Fz: swap(S.sense.Fz), touch: swap(S.sense.touch) }; if (S.g3) o.g3 = { ...S.g3, from: S.g3.from != null ? 1 - S.g3.from : S.g3.from }; o.info = mirrorInfo(S.info, jdS, jdQ, jmap);
  // close-decisions stage: the EXPERIMENTAL lifecycle's state (absent by default → unchanged): feet swapped; contact-anchor / previous-anchor / swing
  // poses reflected; phase scalars (phi, s, psi, a), timers, condition and log are side-free. The diagnostic drifting twist reference is not mirrored.
  if (S.lc) { const mp = (h) => (h ? { pos: m3(h.pos), rot: mq(h.rot) } : null); o.lc = { t: S.lc.t, feet: swap(S.lc.feet).map(f => ({ ...f, hold: mp(f.hold), prevHold: mp(f.prevHold), swing: mp(f.swing), log: f.log.slice() })) }; }
  if (S.twFilt !== undefined) throw new Error("J2a: the diagnostic drifting twist reference (twFilt) has no mirror mapping");
  return o; }
const axesOf = (d, st) => { const R = Q.mul(st[d.child].rot, d.F2); return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => Q.rot(R, e)); };
// ── the seeded perturbation for the floor experiment: every floating-point leaf × (1 + U[−1, 1] · 2^-50) (≤ 4 ulps); integers / booleans untouched ──
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function perturb(x, R) { if (typeof x === "number") return Number.isInteger(x) ? x : x * (1 + (2 * R() - 1) * Math.pow(2, -50)); if (Array.isArray(x)) return x.map(v => perturb(v, R)); if (x && typeof x === "object") { const o = {}; for (const [k, v] of Object.entries(x)) o[k] = k === "n" ? v : perturb(v, R); return o; } return x; }
// ── capture: wrap the controller and actuator compute of a stepping sim ──
function capture(s) { const io = { cur: null }, oc = s.ctrl.compute.bind(s.ctrl), oa = s.act.compute.bind(s.act);
  s.ctrl.compute = (st, ev, dt) => { const pre = s.ctrl.getState(), cmd = oc(st, ev, dt); io.cur = { pre, st, dt, cmd, info: s.ctrl.info, post: { unl: s.ctrl.unl.slice(), hold: JSON.parse(JSON.stringify(s.ctrl.hold)), g3: s.ctrl.g3 ? { ...s.ctrl.g3 } : null, ikRes: s.ctrl.ikRes ? s.ctrl.ikRes.slice() : null, posture: s.ctrl.postureInfo ? JSON.parse(JSON.stringify(s.ctrl.postureInfo)) : null } }; return cmd; };
  s.act.compute = (st, ev, cmd, dt, init) => { const actPre = JSON.parse(JSON.stringify(s.act.a)), plan = oa(st, ev, cmd, dt, init); if (io.cur) { io.cur.actPre = actPre; io.cur.init = init; io.cur.plan = plan; io.cur.actPost = JSON.parse(JSON.stringify(s.act.a)); } return plan; };
  return io; }
// ── evaluate a captured input on a probe instance (mirrored or not) and compare with the captured output ──
function probe(X, S, Qs, map, jmap, mode, R) {   // mode: "mirror" (Qs = partner trial) | "same" (Qs = same trial; R → perturbed input)
  const jdS = S.P.jd, jdQ = Qs.P.jd, mir = mode === "mirror";
  let pre = mir ? mirrorCtrlState(X.pre, jdS, jdQ, jmap) : JSON.parse(JSON.stringify(X.pre)), st = mir ? mirrorSt(X.st, map) : X.st.map(b => ({ pos: b.pos.slice(), rot: b.rot.slice(), com: b.com.slice(), v: b.v.slice(), w: b.w.slice() }));
  let act = JSON.parse(JSON.stringify(X.actPre));
  // perturb the PHYSICAL measurements only (body states, sensed loads, holds, the previous tick's measured info, activations); the supervisor's
  // bookkeeping (tick counter, event time stamps, dwell accumulator, λ at abort) is exact counting, not measurement (perturbing an abort time stamp
  // would flag an "abort mismatch" that no rounding can cause — found in the first floor smoke test, recorded)
  if (R) { const keep = { n: pre.n, g3: pre.g3, rng: pre.rng }; pre = { ...perturb(pre, R), ...keep }; st = perturb(st, R); act = perturb(act, R); }
  // σ per (S joint row n, axis i) ↔ (Q joint row n', axis i)
  const rowQ = jdS.map(ds => jdQ.findIndex(dq => dq.k === (mir ? jmap[ds.k] : ds.k))), sig = jdS.map((ds, n) => { if (!mir) return [1, 1, 1]; const aS = axesOf(ds, X.st), aQ = axesOf(jdQ[rowQ[n]], st); return aS.map((a, i) => dot(mw(a), aQ[i])); });
  if (mir) { const A = Qs.act.a.map(r => r.map(x => (x ? [0, 0] : null))); jdS.forEach((ds, n) => { const kq = jdQ[rowQ[n]].k; for (let i = 0; i < 3; i++) { const a = act[ds.k][i]; if (a && A[kq][i]) A[kq][i] = sig[n][i] > 0 ? [a[0], a[1]] : [a[1], a[0]]; } }); act = A; }
  Qs.ctrl.setState(pre); const ev = Qs.P.compute(st, X.dt).ev, cmd = Qs.ctrl.compute(st, ev, X.dt), IQ = Qs.ctrl.info;
  for (let k = 0; k < act.length; k++) for (let i = 0; i < 3; i++) if (act[k][i]) { Qs.act.a[k][i][0] = act[k][i][0]; Qs.act.a[k][i][1] = act[k][i][1]; }
  const plan = Qs.act.compute(st, ev, cmd, X.dt, X.init);
  // expected = the mirror image of S's output (identity in "same" mode)
  const IS = X.info, M2 = mir ? m2 : (p) => p, M3 = mir ? m3 : (p) => p, SW = mir ? swap : (a) => a, D = {}, bad = [], det = {};
  const up = (k, v) => { if (!(v <= (D[k] ?? -1))) D[k] = v; };
  up("lam", IS.lam == null && IQ.lam == null ? 0 : Math.abs(IQ.lam - (mir ? 1 - IS.lam : IS.lam)));
  up("copMm", d2(IQ.p, M2(IS.p)) * 1000); up("copMm", d2(IQ.pRaw, M2(IS.pRaw)) * 1000); up("copMm", d2(IQ.xiRef, M2(IS.xiRef)) * 1000);
  const sh = SW(IS.share), cp = SW(IS.cop), F = SW(IS.F); up("share", Math.max(Math.abs(IQ.share[0] - sh[0]), Math.abs(IQ.share[1] - sh[1])));
  up("footCopMm", Math.max(d2(IQ.cop[0], M2(cp[0])), d2(IQ.cop[1], M2(cp[1]))) * 1000); up("forceN", Math.max(d3(IQ.F[0], M3(F[0])), d3(IQ.F[1], M3(F[1]))));
  // discrete decisions
  const eqA = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!eqA(IQ.inSup, SW(IS.inSup))) bad.push("inSup"); if (!eqA(Qs.ctrl.unl, SW(X.post.unl))) bad.push("unl");
  const hS = SW(X.post.hold), hQ = Qs.ctrl.hold; if (hS.some((h, n) => (h == null) !== (hQ[n] == null))) bad.push("hold"); else hS.forEach((h, n) => { if (h) { up("holdMm", d3(hQ[n].pos, M3(h.pos)) * 1000); up("holdRad", qd(hQ[n].rot, mir ? mq(h.rot) : h.rot)); } });
  const gS = X.post.g3, gQ = Qs.ctrl.g3; if ((gS == null) !== (gQ == null)) bad.push("g3"); else if (gS) { if ((gS.aborted == null) !== (gQ.aborted == null) || (gS.aborted != null && gS.aborted !== gQ.aborted)) bad.push("abort"); if (gS.bilateralOk !== gQ.bilateralOk) bad.push("bilateralOk"); up("g3OutS", Math.abs(gS.out - gQ.out)); }
  if (X.post.ikRes || Qs.ctrl.ikRes) { const a = SW(X.post.ikRes || [0, 0]), b = Qs.ctrl.ikRes || [0, 0]; up("ikResM", Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))); }
  // joint commands (rows follow P.jd) and actuator rows, through σ
  jdS.forEach((ds, n) => { const nq = rowQ[n], cS = X.cmd[n], cQ = cmd[nq], pS = X.plan.joints[n].rows, pQ = plan.joints[nq].rows;
    for (let i = 0; i < 3; i++) { const s = sig[n][i] > 0 ? 1 : -1; up("sigmaErr", Math.abs(Math.abs(sig[n][i]) - 1));
      const a = cS && cS[i], b = cQ && cQ[i]; if (!a !== !b) bad.push("cmdStructure"); else if (a) { const dt0 = Math.abs(b.tau0 - s * a.tau0), dff = Math.abs(b.ff - s * a.ff); up("cmdTauNm", dt0); up("cmdTauNm", dff); up("cmdGain", Math.max(Math.abs(b.K - a.K), Math.abs(b.D - a.D)));
        const dfb = Math.abs((b.tau0 - b.ff) - s * (a.tau0 - a.ff)); if (!(Math.max(dt0, dff) <= (det.tau?.d ?? -1))) det.tau = { d: Math.max(dt0, dff), joint: S.spec.joints[ds.k].name, axis: i, sigma: sig[n][i], ffA: a.ff, ffB: b.ff, fbA: a.tau0 - a.ff, fbB: b.tau0 - b.ff, dff, dfb, K: a.K }; }
      const r = pS[i], q = pQ[i]; if (!r !== !q || (r && !!r.off !== !!q.off)) bad.push("actStructure"); else if (r && !r.off) {
        up("actTauNm", Math.max(Math.abs(q.tau0 - s * r.tau0), Math.abs(q.req - s * r.req))); up("actGain", Math.max(Math.abs(q.K - r.K), Math.abs(q.D - r.D)));
        const [hi, lo, cP, cM] = s > 0 ? [r.hi, r.lo, r.capP, r.capM] : [-r.lo, -r.hi, r.capM, r.capP]; up("actBoundNm", Math.max(Math.abs(q.hi - hi), Math.abs(q.lo - lo))); up("actCapNm", Math.max(Math.abs(q.capP - cP), Math.abs(q.capM - cM)));
        const aS = X.actPost[ds.k][i], aQ = Qs.act.a[jdQ[nq].k][i], ae = s > 0 ? aS : [aS[1], aS[0]]; up("activation", Math.max(Math.abs(aQ[0] - ae[0]), Math.abs(aQ[1] - ae[1]))); } } });
  if (process.env.B_DEBUG_T && mir && Math.abs(Qs.ctrl.n * X.dt - +process.env.B_DEBUG_T) < 1e-6) {   // DIAGNOSTIC dump at one tick (B_DEBUG_T = t in s); never set in gate runs
    const pS = X.post.posture, pQ = Qs.ctrl.postureInfo, ffd = jdS.map((ds, n) => { const a = IS.ff[n], b = IQ.ff[rowQ[n]]; return `${S.spec.joints[ds.k].name} ${d3(b, mw(a)).toExponential(2)}`; });
    console.error("DEBUG ff |T_B − mirror(T_A)| per joint:", ffd.join(", ")); for (const nm of ["ankle_R", "hip_R"]) { const n = jdS.findIndex(ds => S.spec.joints[ds.k].name === nm), nq = rowQ[n], aS = axesOf(jdS[n], X.st), aQ = axesOf(jdQ[nq], st), TA = IS.ff[n], TB = IQ.ff[nq];
      console.error(`DEBUG ${nm}: T_A ${JSON.stringify(TA)} T_B ${JSON.stringify(TB)} | a_A0 ${JSON.stringify(aS[0])} a_B0 ${JSON.stringify(aQ[0])} | T_A·a_A0 ${dot(TA, aS[0])} T_B·a_B0 ${dot(TB, aQ[0])} | cmd ff A ${X.cmd[n][0] && X.cmd[n][0].ff} B ${cmd[nq][0] && cmd[nq][0].ff} | child rot A ${JSON.stringify(X.st[jdS[n].child].rot)} B ${JSON.stringify(st[jdQ[nq].child].rot)}`); }
    console.error("DEBUG posture S", JSON.stringify(pS)); console.error("DEBUG posture Q", JSON.stringify(pQ)); console.error("DEBUG Ldot", JSON.stringify(IS.Ldot), JSON.stringify(IQ.Ldot), "xi", JSON.stringify(IS.xi), JSON.stringify(IQ.xi), "c", JSON.stringify(IS.c), JSON.stringify(IQ.c)); }
  return { D, bad, det }; }
const merge = (A, B) => { for (const [k, v] of Object.entries(B)) if (!(v <= (A[k] ?? -1))) A[k] = v; return A; };
// ── one pair ──
function runPair(Jolt, job) { const INJ = injected(generateSpec(VARIATION_SET.find(h => h.id === job.human)), INJECT), spec = INJ.spec, map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lrName(b.name))), jmap = spec.joints.map(j => spec.joints.findIndex(x => x.name === lrName(j.name)));
  const mk = (key) => new G3Sim(Jolt, spec, g3Def(key), Object.keys(XSTAND).length ? { ...INJ.opts, stand: { ...(INJ.opts.stand || {}), ...XSTAND } } : { ...INJ.opts }), A = mk(job.a), B = mk(job.b), PA = mk(job.a), PB = mk(job.b), ioA = capture(A), ioB = capture(B), ft = A.ctrl.feet;
  const tr = { A: [], B: [] }, j2a = { pre: {}, post: {}, bad: [], ticks: 0, postTicks: 0, selfMax: 0 }, floor = { D: {}, flips: [], samples: 0, selfMax: 0 };
  const step = (S, io, P_self, P_partner, side) => { if (!S.tick()) return false; const X = io.cur, t = S.n * S.dt, fallen = S.g2acc.fallT != null && t >= S.g2acc.fallT;
      if (FLOOR) { if (side === "A" && !fallen && S.n % FLOOR_EVERY === 0) { const ref = probe(X, S, P_self, map, jmap, "same", null); floor.selfMax = Math.max(floor.selfMax, ...Object.values(ref.D)); for (const [k, v] of Object.entries(ref.D)) if (v > 0 && (floor.selfNZ || (floor.selfNZ = [])).length < 8) floor.selfNZ.push({ t, k, v, hS: X.post.hold, hQ: P_self.ctrl.hold, unl: X.post.unl }); if (ref.bad.length) floor.flips.push({ t, self: ref.bad });
          for (let d = 0; d < FLOOR_DRAWS; d++) { const r = probe(X, S, P_self, map, jmap, "same", rng(1 + S.n * 7 + d * 1000003)); if (r.bad.length) floor.flips.push({ t, draw: d, bad: r.bad }); merge(floor.D, r.D); } floor.samples++; } }
      else { if (side === "A" && !fallen && S.n % 97 === 0) { const ref = probe(X, S, P_self, map, jmap, "same", null); j2a.selfMax = Math.max(j2a.selfMax, ...Object.values(ref.D)); if (ref.bad.length) j2a.bad.push({ t, self: true, bad: ref.bad }); }
        const r = probe(X, S, P_partner, map, jmap, "mirror", null); if (!fallen && r.det.tau && !(r.det.tau.d <= (j2a.tauWorst?.d ?? -1))) j2a.tauWorst = { ...r.det.tau, t, side }; if (fallen) { merge(j2a.post, r.D); j2a.postTicks++; } else { merge(j2a.pre, r.D); j2a.ticks++; if (r.bad.length && j2a.bad.length < 20) j2a.bad.push({ side, t, bad: r.bad }); } }
      const fp = ft.map(f => [S.st[f].pos[0], S.st[f].pos[2]]); tr[side].push({ t, fp }); return !(S.g2acc.fallT != null && t > S.g2acc.fallT + 0.5); };
  let goA = true, goB = !FLOOR; while (goA || goB) { if (goA) goA = step(A, ioA, PA, PB, "A"); if (goB) goB = step(B, ioB, PB, PA, "B"); }
  if (FLOOR) { for (const s of [A, B, PA, PB]) s.destroy(); return { ...job, floor }; }
  const sum = (S) => { const g = S.g3summary(); return { cls: cls(g), outcome: g.outcome, abortT: g.g3.abortT, fallT: S.g2acc.fallT, slip: g.g3.feet.map(f => f.slipMm), ticks: S.n }; }, sA = sum(A), sB = sum(B);
  for (const s of [A, B, PA, PB]) s.destroy();
  // J2b raw: per-tick mirrored foot displacement difference, sliding onset, windowed maxima
  const disp = (rows, mirror) => { const f0 = rows[0].fp; return rows.map(r => { const d = r.fp.map((p, n) => [(p[0] - f0[n][0]) * (mirror ? -1 : 1), p[1] - f0[n][1]]); return { t: r.t, d: mirror ? [d[1], d[0]] : d }; }); };
  const DA = disp(tr.A, false), DB = disp(tr.B, true), n = Math.min(DA.length, DB.length); let onset = null; const dpos = [];
  for (let i = 0; i < n; i++) { const dm = Math.max(...DA[i].d.map(x => Math.hypot(...x)), ...DB[i].d.map(x => Math.hypot(...x))); if (onset == null && dm > SLIDE) onset = DA[i].t; dpos.push([DA[i].t, Math.max(...[0, 1].map(k => Math.hypot(DA[i].d[k][0] - DB[i].d[k][0], DA[i].d[k][1] - DB[i].d[k][1])))]); }
  const upTo = (T) => dpos.filter(([t]) => t <= T + 1e-12).reduce((m, [, v]) => Math.max(m, v), 0) * 1000;
  const abortCommon = sA.abortT != null && sB.abortT != null ? Math.min(sA.abortT, sB.abortT) : null, fallFirst = sA.fallT != null || sB.fallT != null ? Math.min(sA.fallT ?? 1e9, sB.fallT ?? 1e9) : null;
  const j2b = { clsA: sA.cls, clsB: sB.cls, outcomeA: sA.outcome, outcomeB: sB.outcome, abortA: sA.abortT, abortB: sB.abortT, fallA: sA.fallT, fallB: sB.fallT, slipA: sA.slip, slipB: sB.slip, ticksA: sA.ticks, ticksB: sB.ticks,
    slidingOnsetS: onset, posDiffAllMm: upTo(1e9), posDiffToAbortMm: abortCommon != null ? upTo(abortCommon) : null, posDiffToFallMm: fallFirst != null ? upTo(fallFirst) : null, abortCommon, fallFirst };
  return { ...job, j2a, j2b }; }
if (process.argv.includes("--worker")) { const Jolt = await loadJolt(VEND); process.on("message", (m) => { if (m === "exit") process.exit(0); try { process.send({ ok: true, out: runPair(Jolt, m) }); } catch (e) { process.send({ ok: false, err: String(e.stack || e), job: m }); } }); process.send({ ready: true }); }
else { const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean), list = pairs().filter(p => !only.length || only.includes(p.a)), outs = [], W = Math.max(2, Math.min(10, os.cpus().length - 1)), t0 = Date.now();
  await new Promise((resolve) => { let next = 0, live = 0; const spawn = () => { if (next >= list.length) { if (live === 0) resolve(); return; } live++; const cp = fork(fileURLToPath(import.meta.url), ["--worker", ...(FLOOR ? ["--floor"] : [])], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); let done = 0;
      const feed = () => { if (next >= list.length || done >= 6) { cp.send("exit"); live--; if (next < list.length) spawn(); else if (live === 0) resolve(); return; } cp.send(list[next++]); };
      cp.on("message", (m) => { if (m.ready) return feed(); outs.push(m.ok ? m.out : { ...m.job, error: m.err }); done++; process.stdout.write(`  ${outs.length}/${list.length}\r`); feed(); }); };
    for (let i = 0; i < W; i++) spawn(); });
  fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/g3_mirror_v3.mjs" + (FLOOR ? " --floor" : ""), xstand: XSTAND, date: new Date().toISOString().slice(0, 10), slideThresholdMm: SLIDE * 1000, floorEvery: FLOOR ? FLOOR_EVERY : null, floorDraws: FLOOR ? FLOOR_DRAWS : null, wallS: (Date.now() - t0) / 1000, pairs: outs }, null, 1));
  console.log(`\n${outs.length} pairs → ${path.relative(ROOT, OUT)} (${outs.filter(o => o.error).length} errors)`); }
