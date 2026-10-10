// PCS-1 run harness (PCS1_PREREG.md, frozen 8585adc): one case × one variant × one mode per process (Jolt wasm leaks per sim).
//   variant: contact (the record's stand-in) | free (the no-tackler counterpart: every stand-in primitive +500 m in z)
//   mode:    carrier (PI1CarrierSim, carrier on, probes) | off (PI1CarrierSim, carrier off, probes) | rev2 (PI1Sim, REV2 plant, probes off)
// Handoff, stand-in, contact rows: scan_lc.mjs (LC-1 copy of scan_rev2.mjs with HG-A v2) code, unchanged; promotion frame by the D-5 rule (re-derived).
// usage (worktree root): V13_WT=<v1.3 wt> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../pcs1_run.mjs <case> <variant> <mode> <out.json.gz> [steps]
import fs from "fs"; import path from "path"; import zlib from "zlib"; import crypto from "crypto"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/", ROOT = path.resolve(here, "../../..");
const M = await import(path.join(ROOT, "pi1/rev1/scripts/pcg_rev1.mjs")), M0 = await import(path.join(ROOT, "pi1/trackB/scripts/pcg_f0.mjs"));
const SIM = await import(path.join(ROOT, "pi1/rev2/scripts/pi1_rev2_sim.mjs")), CS = await import(path.join(here, "pi1_carrier_sim.mjs")), LP = await import(path.join(here, "law_provider.mjs")), SE = await import(path.join(here, "stand_in_e.mjs"));
const TACKLER = process.env.TACKLER || "ast1";   // AST1E_PREREG.md (7b77dc5): "ast1e" = the extending slide-leg stand-in; HG-T evaluated for the stand-in in use
const { loadJolt } = await import(P2 + "core/v2_jolt.js"), { pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js"), { bootSole } = await import(P2 + "sim/v2_geom.js");
const { L, makeMapper, geomRowsRev1, rigGeom, angVel, SEGMAP, ADJ, AXES, relRot } = M; const { V, Q, B, NB, bi, loadAir, bodySep, bodyLowest, capsulePen, SELF_PAIRS, Z0 } = L;
const [CASE, VARIANT, MODE, OUT, STEPS] = process.argv.slice(2), J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js"), RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 };
const PREREG_KP = { rx_miss: 47, rx_free_leg: 39, rx_planted_leg: 38 }, RECS = path.join(ROOT, "promotion_carrier/evidence/records/on_rx");
if (!(CASE in PREREG_KP) || !["contact", "free"].includes(VARIANT) || !["carrier", "off", "rev2"].includes(MODE)) { console.error("bad args"); process.exit(9); }
const segR = (g, t) => (g.ra != null ? g.ra + (g.rb - g.ra) * Math.max(0, Math.min(1, t)) : g.r), sim2r = (p) => [p[0], p[2], -p[1]];
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), hl = (v) => Math.hypot(v[0], v[2]), D2R = Math.PI / 180, R2D = 180 / Math.PI;
const Mtot = B.reduce((s, b) => s + b.mass, 0), comVel = (v) => V.sc(v.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mtot), comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mtot);
const r7 = (x) => (x == null ? null : +(+x).toPrecision(7)), rv = (v) => v.map(r7);
const deepFreeze = (o) => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
// ── scan_lc.mjs: PI-1 §6.2 velocities and the handoff gate HG (HG-A v2), unchanged ──
function initVel(mapper, k) { const S2 = mapper.poseAt(k).S, S1 = mapper.poseAt(k - 1).S, S0 = mapper.poseAt(k - 2).S, w = [], v = [];
  for (let i = 0; i < NB; i++) w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5));
  v[0] = V.sub(V.sc(V.sub(comW(S2, 0), comW(S1, 0)), 1.5 * 60), V.sc(V.sub(comW(S1, 0), comW(S0, 0)), 0.5 * 60));
  for (const j of L.spec.joints) { const p = j.parentIndex, c = j.childIndex, jp = S2[c].pos, vj = V.add(v[p], V.cross(w[p], V.sub(jp, comW(S2, p)))); v[c] = V.add(vj, V.cross(w[c], V.sub(comW(S2, c), jp))); }
  return { v, w, S: S2 }; }
function handoff(R, k, mapper, G) { const g = geomRowsRev1(R, k, k - 6, mapper, G), fails = g.fails.slice();
  const p5 = Math.max(g.foot.L.physVsPresDeg, g.foot.R.physVsPresDeg); if (p5 > 5) fails.push("P5_footDeg");
  const kin = M0.kinRows(R, k, mapper.poseAt); fails.push(...kin.fails);
  const iv = initVel(mapper, k), vc = comVel(iv.v), row = R.rows[k], va = [row[10], 0, -row[11]], dA = Math.hypot(vc[0] - va[0], vc[2] - va[2]); if (dA > 0.180) fails.push("HGAv2_shift");
  const d = R.def[k], hgtAST1 = !!(d && d.kind === "SLIDE" && d.launchT >= R.slide.extT - 1e-9), hgtAST1E = !!(d && d.kind === "SLIDE" && d.launchT != null && d.launchT > 0);
  if (TACKLER === "ast1e") { if (!hgtAST1E) fails.push("HGT_AST1E"); } else if (!hgtAST1) fails.push("HGT_extension");
  return { k, pass: !fails.length, fails, hgtAST1, hgtAST1E, P5: +p5.toFixed(2), HGA: +dA.toFixed(4), P14: kin.P14_bodyVelMs, P15: kin.P15_angVelRadS, P16: kin.P16_comVelMs, P17: kin.P17_dL, iv, vc }; }
// ── setup ──
const t0all = Date.now(), R = deepFreeze(loadAir(RECS, `${CASE}_LOCO.json.gz`)), G = rigGeom(R), mapper = makeMapper(R, { knee: "RK", rf1: true }), spec = pi1RunnerSpec();
const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), cl = (e) => e.react || e.cls, fin = ev.reduce((m, e) => (RANK[cl(e)] > RANK[m] ? cl(e) : m), "NEGLIGIBLE"), dec = ev.find(e => cl(e) === fin) || null, first = ev[0] || null;
const cat = !ev.length ? "NEAR MISS" : (fin === "CORRECTION" || fin === "STUMBLE") ? "RECOVERABLE" : (fin === "FALL" && dec.segPlanted) ? "PLANTED-LEG FALL" : "other";
const kt = R.pred.findIndex(x => x != null && x <= 0.25); let kend = null, tRef = null;
if (first) { kend = first.tick - 2; tRef = first.tick - 1 + first.sub / 4; } else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } kend = kc - 1; tRef = kc + 0.5; }
const res = { prereg: "PCS1_PREREG.md 8585adc" + (TACKLER === "ast1e" ? " + AST1E_PREREG.md 7b77dc5" : ""), tackler: TACKLER, case: CASE, variant: VARIANT, mode: MODE, cat, finalClass: ev.length ? fin : "NO_CONTACT", trigger: kt, tRef, reasons: [] };
// D-5: the latest HG-valid frame with lead >= 6 ticks (re-derived; must equal the preregistered frame)
let kp = null; const kLim = Math.floor(tRef - 7 + 1e-9), hgScan = []; for (let k = kLim; k >= 2; k--) { const h = handoff(R, k, mapper, G); hgScan.push({ k, pass: h.pass, fails: h.fails }); if (h.pass) { kp = k; break; } }
res.kpRule = { kLim, scanned: hgScan, kp, preregistered: PREREG_KP[CASE], match: kp === PREREG_KP[CASE] };
if (kp !== PREREG_KP[CASE]) { res.reasons.push("k_p re-check mismatch"); fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(res))); console.log(CASE, "STOP: k_p re-check", kp, "vs", PREREG_KP[CASE]); process.exit(2); }
res.kp = kp; res.tauP = kp + 1; res.leadTicks = +(tRef - (kp + 1)).toFixed(2); res.leadS = +(res.leadTicks / 60).toFixed(4);
{ const m2 = makeMapper(R, { knee: "RK", rf1: true }), a = JSON.stringify(initVel(mapper, kp)), b = JSON.stringify(initVel(m2, kp)); res.HGD = a === b; }
const H = handoff(R, kp, mapper, G), row = R.rows[kp], va = [row[10], 0, -row[11]], shift = [va[0] - H.vc[0], 0, va[2] - H.vc[2]], off = [Math.round(H.iv.S[0].pos[0]), 0, Math.round(H.iv.S[0].pos[2])];
const hS = H.iv.S.map(s => ({ pos: V.sub(s.pos, off), rot: s.rot.slice() })), hV = H.iv.v.map((v, i) => ({ v: V.add(v, shift), w: H.iv.w[i] }));
res.handoff = { pass: H.pass, fails: H.fails, HGA: H.HGA, P5: H.P5, P14: H.P14, P15: H.P15, P16: H.P16, P17: H.P17, shiftMs: +V.len(shift).toFixed(4), off };
const rootAt = (tau) => { const k = Math.max(1, Math.ceil(tau - 1e-9) - 1), w = tau - k, a = R.rows[k - 1], b = R.rows[Math.min(R.rows.length - 1, k)], lp = (i) => a[i] + (b[i] - a[i]) * w;
  return { pos: V.sub([lp(8), 0, -lp(9)], off), vel: [lp(10), 0, -lp(11)], facing: lp(12) }; };
const FAR = VARIANT === "free" ? [0, 0, 500] : [0, 0, 0];
const samples = (tau) => { const k = Math.min(R.prims.length - 1, Math.max(0, Math.ceil(tau - 1e-9) - 1)), n = Math.max(1, Math.min(4, Math.round((tau - k) * 4))), o = {};
  for (const p of R.prims[k][n - 1]) o[p.prim] = { a: V.add(V.sub(sim2r(p.a), off), FAR), b: V.add(V.sub(sim2r(p.b), off), FAR), r: p.r }; return o; };
const kF = R.react.findIndex(r => r && r.kind === "FALL"), fallTau = kF >= 0 ? kF + 1 : null, rC = first ? first.tick - 1 : Infinity, tRecSim = kF >= 0 ? R.react[kF].tRec * 60 : null;
const Ipel = (() => { const c0 = comW(Z0, 0); let I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < NB; i++) { const r = V.sub(comW(Z0, i), c0), m = B[i].mass, Ii = B[i].inertia; for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) I[a][b2] += Ii[a][b2] + m * ((a === b2 ? V.dot(r, r) : 0) - r[a] * r[b2]); }
  const f = rootAt(kp + 1).facing, c = Math.cos(f), s = Math.sin(f); return [c * c * I[2][2] + s * s * I[0][0], I[1][1], c * c * I[0][0] + s * s * I[2][2]]; })();
// slide end: first row whose primitive set lacks the stand-in's primitives (horizon cap)
const prim0 = Object.keys(samples(kp + 1)); let slideEnd = R.prims.length - 1; for (let k = kp; k < R.prims.length; k++) { const names = (R.prims[k][3] || []).map(p => p.prim); if (!prim0.every(n => names.includes(n))) { slideEnd = k - 1; break; } }
const tauCap = Math.min(slideEnd, kp + 1 + 150), scanEnd = dec ? dec.tick - 1 + dec.sub / 4 + 6 : kend + 12;
const law = MODE === "carrier" ? LP.makeLaw(R) : null;
const auth = { tauP: kp + 1, rootAt, fallTau, samples, mT: R.mass[1] || 75, legFrac: 0.0145 + 0.061 + 0.161, isLeg: (n) => n === "LEG" || n === "THIGH" };
const maxSteps = STEPS ? +STEPS : Math.ceil((tauCap - (kp + 1)) * 4), simOpts = { seconds: maxSteps / 240 + 0.05, Ipel };
const sim = MODE === "rev2" ? new SIM.PI1Sim(J, spec, { S: hS, vel: hV }, auth, simOpts)
  : new CS.PI1CarrierSim(J, spec, { S: hS, vel: hV }, auth, { ...simOpts, probes: true, carrier: { on: MODE === "carrier", law, rows: R.rows, react: R.react, rC, off } });
if (TACKLER === "ast1e") SE.replaceStandIn(sim, J, samples, kp + 1, auth.mT, auth.legFrac, auth.isLeg, { rC, ext0: Math.min(1, R.def[kp].launchT / R.slide.extT) });
res.promotionWrites = sim.promotionWrites; const writes0 = sim.ledger.authorityWrites;
// ── per-step measurement ──
const SOLE = { L: bootSole(B[bi("foot_L")]), R: bootSole(B[bi("foot_R")]) }, soleC = (sd) => V.sc(SOLE[sd].pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / SOLE[sd].pts.length);
const SEGB = { thigh: "thigh", shin: "shank", foot: "foot" }, FOOT = { L: bi("foot_L"), R: bi("foot_R") };
const legVsSim = (S, sb) => { let mx = 0, who = null; for (const g of sb.segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd || g.name.startsWith("toe")) continue; const i = bi(bn + "_" + g.sd), a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))), d = hl(V.sub(p, V.add(a2, V.sc(ab, t)))); if (d > mx) { mx = d; who = B[i].name; } } return { d: mx, who }; };
const JPTS = [0].concat(L.spec.joints.map(j => j.childIndex)), JN = ["pelvis"].concat(L.spec.joints.map(j => j.name));
const up = (S, i) => Q.rot(relRot(S, i), [0, 1, 0]), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(a, b) / (V.len(a) * V.len(b) || 1)))) * R2D;
const CAP = { h: 274.95, up: 1161.2, down: 193.5, T: 81.80 }, dt = sim.dt;
const stateDigest = () => { const st = sim.st, f = new Float64Array(st.length * 13); st.forEach((b, i) => { f.set([...b.pos, ...b.rot, ...b.v, ...b.w], i * 13); }); return crypto.createHash("sha1").update(Buffer.from(f.buffer)).digest("hex").slice(0, 16); };
const steps = [], ticks = [], snaps = [], digests = [], A2 = []; let minSep = Infinity, sepPair = null, slipOld = { L: 0, R: 0 };
const slipSt = { L: { on: false, gap: 0, acc: 0, max: 0, n: 0 }, R: { on: false, gap: 0, acc: 0, max: 0, n: 0 } }, stances = { L: [], R: [] };
let state = "PRE", firstManifoldTau = null, firstA2 = null, lastA2 = null, recEntry = null, dgTau = null, dgFail = false, handoffTau = null, kes = [], fallLow = null;
const smEvents = [{ tau: kp + 1, state: "PRE" }], cpuS = []; let cpuPrev = null, Eprev = null;
const cpuNow = () => { const c = sim.cpu || {}, c2 = sim.cpu2 || {}, cc = sim.carCpu || {}; return { step: c.step || 0, passive: c.passive || 0, measure: c.measure || 0, act2: c2.act || 0, probe: c2.probe || 0, law: cc.law || 0, ref: cc.ref || 0, id: cc.id || 0, carrier: cc.carrier || 0, Bset: cc.Bset || 0, standIn: cc.standIn || 0, disturb: cc.disturb || 0, pd: cc.pd || 0, act: cc.act || 0 }; };
cpuPrev = cpuNow(); Eprev = sim.last ? sim.last.E : null; let stPrev = sim.st.map(b => ({ ...b, v: b.v.slice(), w: b.w.slice(), com: b.com.slice() }));
for (let s = 0; s < maxSteps; s++) {
  const tq0 = performance.now(); if (MODE !== "rev2") sim.appliedPlan = sim.aplan;
  if (!sim.tick()) break; const tq1 = performance.now(); const tau = sim.tauP + sim.n / 4, Sp = sim.st, S = Sp.map(b => ({ pos: V.add(b.pos, off), rot: b.rot.slice(), com: V.add(b.com, off), v: b.v.slice(), w: b.w.slice() }));
  const tm0 = performance.now(); snaps.push({ tau, S }); if (sim.n % 2 === 0) for (const [i, j] of SELF_PAIRS) { const d = bodySep(i, j, S).d; if (d < minSep) { minSep = d; sepPair = B[i].name + "↔" + B[j].name; } }
  const dg = MODE === "rev2" ? { state: stateDigest(), cmd: null, carrier: null } : sim.digests(); digests.push(dg);
  // stand-in contact (A2) and manifolds
  const ph = sim.phys[sim.phys.length - 1], manif = ph.contacts; if (manif.length && firstManifoldTau == null) firstManifoldTau = tau;
  let Jr = [0, 0, 0], Hr = [0, 0, 0], a2 = null; const c0 = comOf(S);
  for (const im of ph.impulses) { const Jn = V.len(im.J); if (Jn < 1e-3 && Math.abs(im.Jy) < 1e-3) continue; const ms = manif.filter(c => c.seg === im.name).sort((a, b) => b.depth - a.depth), m = ms[0];
    const Jon = V.sc(im.J, -1); Jr = V.add(Jr, Jon); if (m) { const pc = V.add(m.pts.reduce((s2, p) => V.add(s2, p), [0, 0, 0]).map(x => x / m.pts.length), off); Hr = V.add(Hr, V.cross(V.sub(pc, c0), Jon)); }
    a2 = a2 || []; a2.push({ seg: im.name, body: m ? m.body : null, J: rv(im.J), Jy: r7(im.Jy), depth: m ? r7(m.depth) : null, pts: m ? m.pts.map(rv) : null, normal: m ? rv(m.normal) : null }); }
  if (a2) { A2.push({ tau, n: sim.n, contacts: a2 }); if (firstA2 == null) firstA2 = tau; lastA2 = tau; }
  // B, A, momentum, energy
  const lB = sim.sup.lambdas(), Bf = lB.lin, Bt = lB.rot;   // B impulses over the step (N·s, N·m·s); zero once released
  const A = sim.Alast || null, Af = A && A.F ? A.F : null; let P = [0, 0, 0], Lc = [0, 0, 0]; const c = comOf(S);
  S.forEach((b, i) => { const wl = Q.rot(Q.conj(b.rot), b.w), I = B[i].inertia, Il = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]); P = V.add(P, V.sc(b.v, B[i].mass)); Lc = V.add(Lc, V.add(V.cross(V.sub(b.com, c), V.sc(b.v, B[i].mass)), Q.rot(b.rot, Il))); });
  const pel = bi("pelvis"), vPm = V.sc(V.add(stPrev[pel].v, Sp[pel].v), 0.5), wPm = V.sc(V.add(stPrev[pel].w, Sp[pel].w), 0.5), WB = V.dot(Bf, vPm) + V.dot(Bt, wPm);
  let WA = 0; if (Af) Af.forEach((F, i) => { WA += V.dot(F, V.sc(V.add(stPrev[i].v, Sp[i].v), 0.5)) * dt; });
  let Wc = 0; for (const x of (a2 || [])) { if (!x.body || !x.pts) continue; const i = bi(x.body), pc = V.sc(x.pts.reduce((s2, p) => V.add(s2, p), [0, 0, 0]), 1 / x.pts.length), vm = V.sc(V.add(V.add(stPrev[i].v, V.cross(stPrev[i].w, V.sub(pc, stPrev[i].com))), V.add(Sp[i].v, V.cross(Sp[i].w, V.sub(pc, Sp[i].com)))), 0.5); Wc += V.dot(V.sc(x.J, -1), vm); }
  const Wact = (sim.actRes || []).reduce((s2, r) => s2 + r.W, 0), Dst = sim.A.Dstep[sim.A.Dstep.length - 1] || 0, E = sim.last.E, resid = Eprev != null ? (E - Eprev) - (Wact + WB + WA + Wc - Dst) : 0; Eprev = E;
  // feet: turf manifolds, contact-point slip (prereg §4.1), sole-centroid slip (lead_drift), probes
  const feet = {}; for (const [n, sd] of [[0, "L"], [1, "R"]]) { const fi = FOOT[sd], b = Sp[fi], pts = [];
    for (const m of (sim.lastContacts || [])) { if (!((m.a === -1 && m.b === fi) || (m.b === -1 && m.a === fi)) || !(m.depth > -0.0005)) continue; for (const p of (m.a === fi ? m.pts : m.pts2)) pts.push(p); }
    const inC = pts.length > 0; let sv = 0; if (inC) { for (const p of pts) sv += hl(V.add(b.v, V.cross(b.w, V.sub(p, b.com)))); sv /= pts.length; }
    const st = slipSt[sd]; if (inC) { if (!st.on) { st.on = true; st.acc = 0; st.n = 0; st.t0 = tau; } st.gap = 0; st.acc += sv * dt; st.n++; st.max = Math.max(st.max, st.acc); } else if (st.on) { st.gap++; if (st.gap > 2) { stances[sd].push({ t0: st.t0, t1: tau - st.gap / 4, slipMm: +(st.acc * 1000).toFixed(2), steps: st.n }); st.on = false; } }
    const pc = V.add(b.pos, Q.rot(b.rot, soleC(sd))), vp = V.add(b.v, V.cross(b.w, V.sub(pc, b.com))); if (sim.contactFlags[n]) slipOld[sd] += hl(vp) * dt;
    const pr = sim.probeRows ? sim.probeRows[n] : null; feet[sd] = { c: inC ? 1 : 0, sv: r7(sv), Jc: pr ? rv(pr.Jc) : null, Fy: pr ? r7(pr.JyN) : null, other: pr ? pr.otherContacts : null }; }
  // actuator axes: [k, i, ff(statics), vff, id, servo, req, applied τ, capP, capM, K, D, e, ω]
  const ax = []; if (MODE !== "rev2" && sim.applied && sim.applied.cmd && sim.appliedPlan) { const cmd = sim.applied.cmd, tauOf = {}; for (const r of (sim.actRes || [])) tauOf[r.k * 3 + r.i] = r;
    for (const p of sim.appliedPlan.joints) p.rows.forEach((r, i) => { if (!r || r.off) return; const c = cmd[p.k][i], ar = tauOf[p.k * 3 + i]; const servo = c.K * (c.e != null ? c.e : 0) - (r.D + dt * r.K) * r.w;
      ax.push([p.k, i, r7(c.ff), r7(c.vff || 0), r7(c.id || 0), r7(c.e != null ? servo : null), r7(r.req), ar ? r7(ar.tau) : null, r7(r.capP), r7(r.capM), r7(r.K), r7(r.D), r7(c.e != null ? c.e : null), r7(r.w), ar && ar.sat ? 1 : 0]); }); }
  const car = sim.applied && sim.applied.car ? sim.applied.car : null;
  steps.push({ tau, n: sim.n, state, bodies: S.map(b => [...rv(b.pos), ...rv(b.rot), ...rv(b.com), ...rv(b.v), ...rv(b.w)]), P: rv(P), L: rv(Lc), com: rv(c), Jr: rv(Jr), Hr: rv(Hr), B: { J: rv(Bf), H: rv(Bt) },
    A: A ? { r: A.r, alpha: A.alphaA, aT: rv(A.aT), on: !!Af } : null, Wact: r7(Wact), WB: r7(WB), WA: r7(WA), Wc: r7(Wc), D: r7(Dst), E: r7(E), resid: r7(resid), feet, ax,
    car: car ? { wb: r7(car.wb), wID: rv(car.wID), q: car.q.map(rv), wStar: car.wStar.map(rv), tauID: car.tauID.map(rv) } : null, Bt: sim.Blast ? { dp: rv(sim.Blast.dp), vel: rv(sim.Blast.vel), q: rv(sim.Blast.q), om: rv(sim.Blast.om) } : null,
    si: ph.standIn.map((x, j) => { const g = sim.standIn.segs[j], d = g && g.lastDrive; return { n: x.name, pts: x.pts.map(rv), rel: g && g.released ? 1 : 0, drv: d ? { F: d.F.slice(), T: d.T, lt: d.lt.slice(), lr: d.lr } : null }; }),   // released / drive read from the stand-in itself (REV2's phys record drops them)
    fallen: !!sim.fallen || sim.fallAt != null, trackErr: r7(ph.trackErr), manifolds: manif.length, Bon: !!sim.Bon, wSt: sim.pd && sim.pd.wSt ? rv(sim.pd.wSt) : null, contactFlags: sim.contactFlags.slice() });
  // state machine (evaluation only; PCS-1 §2.7)
  if (sim.fallAt != null && state !== "FALL") { state = "FALL"; smEvents.push({ tau: sim.fallAt, state }); }
  if (state !== "FALL") { if (a2) { if (state !== "IMPACT") { state = "IMPACT"; smEvents.push({ tau, state }); } }
    else if (state === "IMPACT" && tau - lastA2 >= 6 - 1e-9) { state = "RECONCILE"; recEntry = tau; smEvents.push({ tau, state }); } }
  // FALL handoff (PI-1 §9.2)
  if (state === "FALL") { let ke = 0; S.forEach((b, i) => { const wl = Q.rot(Q.conj(b.rot), b.w), I = B[i].inertia; ke += 0.5 * B[i].mass * V.dot(b.v, b.v) + 0.5 * (wl[0] * (I[0][0] * wl[0] + I[0][1] * wl[1] + I[0][2] * wl[2]) + wl[1] * (I[1][0] * wl[0] + I[1][1] * wl[1] + I[1][2] * wl[2]) + wl[2] * (I[2][0] * wl[0] + I[2][1] * wl[1] + I[2][2] * wl[2])); });
    const vc = hl(V.sc(P, 1 / Mtot)) + 0 * 0, vcom = V.len(V.sc(P, 1 / Mtot)); kes.push(ke <= 5 && vcom <= 0.10 ? 1 : 0); const pelY = S[pel].com[1]; if (pelY <= 0.35 && fallLow == null) fallLow = tau;
    const nonBoot = new Set(); for (const m of (sim.lastContacts || [])) { if (!(m.depth > -0.0005)) continue; const bb = m.a === -1 ? m.b : m.b === -1 ? m.a : null; if (bb == null || bb < 0) continue; if (!/^foot_/.test(B[bb].name)) nonBoot.add(bb); }
    const quiet = kes.length >= 60 && kes.slice(-60).every(x => x), noC = lastA2 == null || tau - lastA2 >= 12 - 1e-9;
    if (handoffTau == null && quiet && noC && pelY <= 0.35 && nonBoot.size >= 3) handoffTau = tau; }
  // whole ticks: coherence rows, DG, near-miss envelope
  if (sim.n % 4 === 0) { const r = Math.round(tau) - 1; if (r < R.rows.length) { const Pp = mapper.poseAt(r).S, sb = R.simBody[r] && R.simBody[r][3];
    const pelH = S[0].pos[1], pelHP = Pp[0].pos[1], tilt = ang(up(S, 0), up(Pp, 0)), lvs = sb ? legVsSim(S, sb) : null, lvp = sb ? legVsSim(Pp, sb) : null;
    let mMin = Infinity, mWho = null; spec.joints.forEach((jj, k) => { const per = sim.up.ev.per[k]; if (!per) return; for (let i = 0; i < 3; i++) { if (!sim.A.axis[k] || !sim.A.axis[k][i]) continue; const th = per.th[i], hT = per.T[i] && per.T[i].hard, lo = hT ? hT[0] : jj.limits.hard.lo[i], hi = hT ? hT[1] : jj.limits.hard.hi[i], m = Math.min(th - lo, hi - th); if (m < mMin) { mMin = m; mWho = jj.name + "." + i; } } });
    const fs2 = {}; for (const [n, sd] of [[0, "L"], [1, "R"]]) { const lo = bodyLowest(B[FOOT[sd]], S[FOOT[sd]]).y, phys = lo <= 0.005 ? "planted" : lo >= 0.015 ? "air" : "trans", simPl = sb ? sb.legs[sd].planted : null; fs2[sd] = { lowMm: r7(lo * 1000), phys, sim: simPl, pres: R.pres[r].feet[n].contact, cg2: phys === "trans" || (phys === "planted") === !!simPl }; }
    const Bfr = (() => { if (!sim.Bon) return null; const F = V.sc(Bf, 1 / dt), T = V.sc(Bt, 1 / dt); return { h: Math.max(Math.abs(F[0]), Math.abs(F[2])) / CAP.h, v: F[1] >= 0 ? F[1] / CAP.up : -F[1] / CAP.down, T: Math.max(...T.map(Math.abs)) / CAP.T }; })();
    const slipNew = Math.max(slipSt.L.on ? slipSt.L.acc : 0, slipSt.R.on ? slipSt.R.acc : 0, ...stances.L.map(x => x.slipMm / 1000), ...stances.R.map(x => x.slipMm / 1000));
    // DG (REV2 §7) in RECONCILE
    let dgRow = null; if (state === "RECONCILE" || (CASE === "rx_miss" && state === "RECONCILE")) { const Pm = mapper.poseAt(r - 1).S, vComPres = V.sc(V.sub(comOf(Pp), comOf(Pm)), 60), vPelPres = V.sc(V.sub(comW(Pp, 0), comW(Pm, 0)), 60), vCom = V.sc(P, 1 / Mtot);
      const a = lastA2 == null || tau - lastA2 >= 2 - 1e-9, bPos = V.dist(comW(S, 0), comW(Pp, 0)), bRot = 2 * Math.acos(Math.min(1, Math.abs(V.dot(S[0].rot.slice(0, 3), Pp[0].rot.slice(0, 3)) + S[0].rot[3] * Pp[0].rot[3]))) * R2D, cV = V.dist(vCom, vComPres), cP = V.dist(S[0].v, vPelPres);
      const dOK = [0, 1].every(n => !R.pres[r].feet[n].contact || (sim.probeRows && sim.probeRows[n].JyN >= 20)); let jMax = 0; for (const i of JPTS) jMax = Math.max(jMax, V.dist(S[i].pos, Pp[i].pos));
      dgRow = { a, bPosMm: r7(bPos * 1000), bRotDeg: r7(bRot), cComMs: r7(cV), cPelMs: r7(cP), d: dOK, pass: a && bPos <= 0.010 && bRot <= 2 && cV <= 0.05 && cP <= 0.25 && dOK, jointMaxMm: r7(jMax * 1000) };
      if (dgRow.pass && dgTau == null) { dgTau = tau; res.DG = { tau, row: dgRow, blendNeeded: jMax > 0.010 }; } if (dgTau == null && recEntry != null && tau - recEntry >= 30 - 1e-9) dgFail = true; }
    ticks.push({ tau, r, state, pelHratio: r7(pelH / pelHP), tiltDeg: r7(tilt), legSimMm: lvs ? r7(lvs.d * 1000) : null, legSimWho: lvs ? lvs.who : null, presLegSimMm: lvp ? r7(lvp.d * 1000) : null, marginDeg: r7(mMin * R2D), marginWho: mWho,
      feet: fs2, slipMm: r7(slipNew * 1000), slipOldMm: r7(Math.max(slipOld.L, slipOld.R) * 1000), B: Bfr ? { h: r7(Bfr.h), v: r7(Bfr.v), T: r7(Bfr.T) } : null, pelDyMm: r7((pelH - pelHP) * 1000), DG: dgRow });
    // near-miss envelope passed → RECONCILE (no contact so far)
    if (state === "PRE" && firstA2 == null && !first && r >= 1 && R.pred[r] != null && R.pred[r] > 0.25 && R.dnow[r] != null && R.dnow[r - 1] != null && R.dnow[r] > R.dnow[r - 1] && r >= kt) { state = "RECONCILE"; recEntry = tau; smEvents.push({ tau, state }); } } }
  const tm1 = performance.now(); const cn = cpuNow(); const d = {}; for (const k in cn) d[k] = cn[k] - cpuPrev[k]; d.harnessMeasure = tm1 - tm0; d.tick = tq1 - tq0; cpuS.push(d); cpuPrev = cn;
  stPrev = Sp.map(b => ({ ...b, v: b.v.slice(), w: b.w.slice(), com: b.com.slice() }));
  // horizon (contact / carrier runs decide; counterparts and controls get STEPS)
  if (!STEPS) { const endSM = state === "FALL" ? (handoffTau != null || (firstA2 != null && tau >= firstA2 + 90 - 1e-9) || (firstA2 == null && tau >= fallTau + 90)) : (dgTau != null || dgFail);
    if (endSM && (lastA2 == null || tau >= lastA2 + 18 - 1e-9)) break; }
}
for (const sd of ["L", "R"]) if (slipSt[sd].on) stances[sd].push({ t0: slipSt[sd].t0, t1: null, slipMm: +(slipSt[sd].acc * 1000).toFixed(2), steps: slipSt[sd].n, open: true });
res.standInInfo = sim.standIn.kind === "AST-1E" ? { kind: "AST-1E", release: sim.standIn.release, consts: sim.standIn.consts, Lext: sim.standIn.segs.find(g => g.leg).ext.Lext, L0: sim.standIn.segs.find(g => g.leg).ext.L0, masses: sim.standIn.segs.map(g => ({ name: g.name, m: g.m, Iyy: g.Iyy })) } : { kind: "AST-1" };
res.steps = steps.length; res.tauEnd = steps.length ? steps[steps.length - 1].tau : null; res.horizon = { tauCap, slideEnd, scanEnd, maxSteps };
res.smEvents = smEvents; res.firstManifoldTau = firstManifoldTau; res.firstA2 = firstA2; res.lastA2 = lastA2; res.recEntry = recEntry; res.dgTau = dgTau; res.dgFail = dgFail && dgTau == null; res.handoffTau = handoffTau; res.fallLowTau = fallLow; res.tRecSim = tRecSim;
res.fallAt = sim.fallAt != null ? sim.fallAt : null; res.writesAfter = sim.ledger.authorityWrites - writes0; res.stances = stances; res.CG8 = { minSepMm: +(minSep * 1000).toFixed(1), pair: sepPair, pass: minSep >= -0.010 };
res.actOverCap = sim.act.led.flat().filter(Boolean).reduce((s2, l) => s2 + l.overCap, 0); res.actSat = sim.act.led.flat().filter(Boolean).reduce((s2, l) => s2 + l.satTicks, 0);
// ── REV2 §4 contact rows (scan_lc.mjs code, unchanged; AST-C1 over the REV2 scan window) ──
{ const phys = sim.phys, contactsAll = []; for (const p of phys) for (const im of p.impulses) { const Jn = V.len(im.J); if (Jn < 1e-3 && Math.abs(im.Jy) < 1e-3) continue;
    const ms = p.contacts.filter(c => c.seg === im.name).sort((a, b) => b.depth - a.depth); const m = ms[0]; contactsAll.push(m ? { ...m, tau: p.tau, J: +Jn.toFixed(4), Jy: +im.Jy.toFixed(4) } : { tau: p.tau, seg: im.name, body: null, depth: null, pts: null, normal: null, J: +Jn.toFixed(4), Jy: +im.Jy.toFixed(4) }); }
  const firstPhys = contactsAll[0] || null, snapAt = (tau) => snaps.reduce((b, s) => (Math.abs(s.tau - tau) < Math.abs(b.tau - tau) ? s : b), snaps[0]);
  const preTrack = phys.filter(p => (!firstPhys || p.tau < firstPhys.tau) && p.tau <= scanEnd + 1e-9).reduce((m, p) => Math.max(m, p.trackErr), 0);
  res.standIn = { trackErrBeforeContactMm: +(preTrack * 1000).toFixed(2), ASTC1: preTrack <= 0.010, window: [kp + 1, scanEnd] };
  { const seq = []; const kLast = dec ? dec.tick + 1 : kend + 2; for (let k = Math.max(1, kp); k <= kLast; k++) for (let n = 1; n <= 4; n++) seq.push(R.prims[k][n - 1]); let jump = 0;
    for (let q = 2; q < seq.length; q++) for (const p of seq[q]) { const p1 = seq[q - 1].find(x => x.prim === p.prim), p0 = seq[q - 2].find(x => x.prim === p.prim); if (!p1 || !p0) continue;
      for (const e of ["a", "b"]) { const d1 = [0, 1, 2].map(i => p[e][i] - p1[e][i]), d0 = [0, 1, 2].map(i => p1[e][i] - p0[e][i]); jump = Math.max(jump, Math.hypot(d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2])); } }
    res.standIn.discontinuityMm = +(jump * 1000).toFixed(1); res.standIn.discontinuityPass = jump <= 0.010; }
  res.physical = { firstContact: firstPhys ? { tau: firstPhys.tau, body: firstPhys.body, seg: firstPhys.seg } : null, gameplayFirst: first ? { tau: first.tick - 1 + first.sub / 4, seg: first.seg, prim: first.prim } : null, fallTau };
  const crit = {};
  if (!dec) crit.NM = { physicalContacts: contactsAll.length, simContact: false, predictorFires: kt >= 0, pass: contactsAll.length === 0 && kt >= 0 };
  else if (VARIANT === "contact") {
    const tDec = dec.tick - 1 + dec.sub / 4, cp = contactsAll.find(c => c.tau >= tDec - 1 - 1e-9 && c.body) || null, mapped = SEGMAP[dec.seg], mi = bi(mapped), simB = R.simBody[dec.tick - 1][dec.sub - 1], simSeg = simB.segs.find(g => g.name === dec.seg);
    res.decisive = { tSim: tDec, seg: dec.seg, prim: dec.prim, mapped, segPlanted: dec.segPlanted, J: dec.J, physical: cp ? { tau: cp.tau, body: cp.body, seg: cp.seg, depthMm: +(cp.depth * 1000).toFixed(1), impulseNs: cp.J } : null, physicalImpulseTotalNs: +contactsAll.filter(c => c.tau >= tDec - 1 - 1e-9).reduce((s, c) => s + c.J, 0).toFixed(3) };
    const sn = cp ? snapAt(cp.tau) : snapAt(tDec), S = sn.S, pPhys = cp ? cp.pts.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / cp.pts.length) : null, pPhysR = pPhys ? V.add(pPhys, off) : null;
    let adj = null; if (cp && cp.body !== mapped) for (const [b2, jn] of ADJ[mapped] || []) if (b2 === cp.body) { const jp = jn === "ankle" ? S[bi("foot_" + mapped.slice(-1))].pos : S[bi("shank_" + mapped.slice(-1))].pos; adj = { body: b2, joint: jn, distMm: +(V.dist(pPhysR, jp) * 1000).toFixed(1) }; }
    crit["CG-1"] = { mapped, physical: cp ? cp.body : null, adjacency: adj, pass: !!cp && (cp.body === mapped || (!!adj && adj.distMm <= 30)) };
    crit["CG-3"] = { tSim: tDec, tPhys: cp ? cp.tau : null, dTicks: cp ? +(cp.tau - tDec).toFixed(2) : null, pass: !!cp && Math.abs(cp.tau - tDec) <= 1 + 1e-9 };
    { const simP = sim2r(dec.point); let pass = false, dist = null, sSim = null, sPh = null;
      if (cp) { dist = Math.hypot(pPhysR[0] - simP[0], pPhysR[2] - simP[2]); const sa = sim2r(simSeg.a), sb2 = sim2r(simSeg.b), proj = (p, a, b) => V.dot(V.sub(p, a), V.sub(b, a)) / V.dot(V.sub(b, a), V.sub(b, a)); sSim = proj(simP, sa, sb2);
        const kind = dec.seg.replace(/_[LR]$/, ""), on = (l) => V.add(S[mi].pos, Q.rot(relRot(S, mi), l)); let A_, Bp;
        if (kind === "foot" || kind === "toe") { A_ = on(AXES[kind][0]); Bp = on(AXES[kind][1]); } else if (mapped.startsWith("shank")) { A_ = S[mi].pos; Bp = S[bi(mapped.replace("shank", "foot"))].pos; } else if (mapped.startsWith("thigh")) { A_ = S[mi].pos; Bp = S[bi(mapped.replace("thigh", "shank"))].pos; } else { A_ = S[mi].pos; Bp = V.add(S[mi].pos, [0, 0.2, 0]); }
        sPh = proj(pPhysR, A_, Bp); pass = dist <= 0.10 && Math.abs(sPh - sSim) <= 0.25; }
      crit["CG-4"] = { horizDistM: dist != null ? +dist.toFixed(3) : null, sSim: sSim != null ? +sSim.toFixed(3) : null, sPhys: sPh != null ? +sPh.toFixed(3) : null, pass }; }
    { const pre = R.rows[dec.tick - 2], cPre = { char: "vinicius", p: { x: pre[8], y: pre[9], vx: pre[10], vy: pre[11], facing: pre[12], gaitPhase: pre[13], legLen: R.legLen[0] } }, tPre = dec.tick - 1;
      const region = [mapped].concat(crit["CG-1"].adjacency && crit["CG-1"].adjacency.distMm <= 30 ? [crit["CG-1"].adjacency.body] : []); let sMax = -1e9, dMax = -1e9;
      for (let k = dec.tick - 1; k <= Math.min(R.prims.length - 1, dec.tick + 5); k++) for (let n = 1; n <= 4; n++) { const t = k + n / 4; if (t < tDec - 1e-9 || t > tDec + 6 + 1e-9) continue; const pr = R.prims[k][n - 1].find(p => p.prim === dec.prim); if (!pr) continue;
        const sb2 = M0.SIMV.segs(M0.SIMV.body(cPre, (t - tPre) / 60, M0.SIMV.footLenV12)), sg = sb2.find(g => g.name === dec.seg); if (sg) { const cc = M0.SIMV.segseg(pr.a, pr.b, sg.a, sg.b); sMax = Math.max(sMax, (pr.r + segR(sg, cc.t) - cc.d) * 1000); }
        const a = sim2r(pr.a), b = sim2r(pr.b); for (const nm of region) dMax = Math.max(dMax, capsulePen(a, b, pr.r, bi(nm), S, 160).pen * 1000); }
      const ratio = sMax > 0 ? dMax / sMax : null; crit["CG-5"] = { region, simMaxMm: +sMax.toFixed(1), physMaxMm: +dMax.toFixed(1), ratio: ratio != null ? +ratio.toFixed(3) : null, pass: ratio != null && ratio >= 1 / 3 && ratio <= 3 }; }
    { const angd = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI, n = dec.normal, simN = [n[0], n[1]], tng = [-n[1], n[0]], simRel = [dec.vn * n[0] + (dec.vt || 0) * tng[0], dec.vn * n[1] + (dec.vt || 0) * tng[1]];
      let aN = null, aV = null; if (cp) { const pN = [cp.normal[0], -cp.normal[2]], i0 = phys.findIndex(p => Math.abs(p.tau - cp.tau) < 1e-9), phPre = i0 > 0 ? phys[i0 - 1] : null, snPre = snaps.find(s2 => Math.abs(s2.tau - (cp.tau - 0.25)) < 1e-9);   // E1: approach velocity = state BEFORE the contact step
        if (phPre && snPre) { const sg = phPre.standIn.find(x => x.name === cp.seg), sv = V.add(sg.v, V.cross(sg.w, V.sub(pPhys, sg.com))), rb = snPre.S[bi(cp.body)], vR = V.add(rb.v, V.cross(rb.w, V.sub(pPhysR, rb.com))), rel = V.sub(sv, vR); aN = angd(simN, pN); aV = angd(simRel, [rel[0], -rel[2]]); } }
      crit["CG-6"] = { normalAngleDeg: aN != null ? +aN.toFixed(1) : null, relVelAngleDeg: aV != null ? +aV.toFixed(1) : null, approachReading: "E1", pass: aN != null && aN <= 45 && aV != null && aV <= 45 }; }
    { const Sd = snapAt(tDec).S, agree = {}; let ok = true; const row0 = dec.tick - 2, row1 = dec.tick - 1;
      for (const [n, sd] of [[0, "L"], [1, "R"]]) { const simPl = simB.legs[sd].planted, pres = [R.pres[row0].feet[n].contact, R.pres[row1].feet[n].contact], lo = bodyLowest(B[bi("foot_" + sd)], Sd[bi("foot_" + sd)]).y, d1 = lo <= 0.005 ? true : lo >= 0.015 ? false : "transitional", a = pres.includes(simPl) && d1 === simPl;
        agree[sd] = { sim: simPl, presentation: pres, physLowestMm: +(lo * 1000).toFixed(1), phys: d1, agree: a }; ok = ok && a; } crit["CG-2"] = { ...agree, pass: ok }; }
  }
  crit["CG-8"] = res.CG8; res.criteria = crit; }
// ── outputs ──
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
res.cpu = {}; for (const k of Object.keys(cpuS[0] || {})) res.cpu[k] = { medianMs: med(cpuS.map(c => c[k])), totalMs: cpuS.reduce((s2, c) => s2 + c[k], 0) };
res.digests = digests; res.ticks = ticks; res.A2 = A2; res.wallMs = Date.now() - t0all; res.stepsLog = steps;
fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(res)));
console.log(CASE.padEnd(15), VARIANT.padEnd(8), MODE.padEnd(8), "kp", kp, "lead", res.leadTicks, "steps", steps.length, "τ", res.tauEnd, "firstA2", firstA2, "fallAt", res.fallAt, "DG", dgTau, dgFail ? "FAIL" : "", "handoff", handoffTau, "wall", res.wallMs, "ms");
