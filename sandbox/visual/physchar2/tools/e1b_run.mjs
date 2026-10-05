// ═══ physchar2/tools/e1b_run.mjs — E1b: ONE run of the PREREGISTERED protocol (final_pre_e1a/E1_PREREGISTRATION.md §4: "as E1a with lift 20 mm (min-jerk 0.6 s), hover 1.5 s,
// replace 0.6 s"; perturbation runs at the hover mid-point). Built from tools/e1a_run.mjs: ONLY the protocol values and the event-timed perturbation differ (operational
// definitions: e1a/E1B_HARNESS.md, committed before any E1b run). E1b runs only after a genuine E1a pass (preswing/PRESWING_VALIDATION_PREREG.md §5).
//   perturbations (--pert, at t_lift + 0.6 + 0.75 s, through the scenario's own push / torque mechanism, ledgered): PF / PB / PL / PR = thorax 5 N·s, 100 ms, anterior /
//   posterior / character-left / character-right; YAW = pelvis yaw impulse 0.5 N·m·s (+y, 100 ms); P15 = thorax 15 N·s toward the lifted side (the beyond-capacity case).
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/e1b_run.mjs --human=V2-REF --side=L [--config=V2|PSTAR|PSTARY|PSTAR2|PSTAR3|PSTAR4] [--pert=none|PF|PB|PL|PR|YAW|P15|YAWN] [--hz=240] [--yawk=<axial share>] --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { ankleNeutralKPerDeg, decompose } from "../spec/v2_joints.js"; import { polyDist } from "../ctrl/v2_stand.js";
import { V, Q } from "../core/v2_math.js"; import { kneeEnvelopeV2K } from "../spec/v2_knee.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), LIFT = +arg("lift", 0.02), PERT = arg("pert", "none"), LT = 0.6, HOV = 1.5, RT = 0.6, GRACE = 0.3, OUT = arg("out", ""), D = 180 / Math.PI, AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// CONFIGURATION VERSION (preswing/PRESWING_VALIDATION_PREREG.md §5; knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md): "V2" (default) = the configuration of the frozen
// E1a run (E1_PREREGISTRATION_V2_CONFIG.md; must reproduce the official runs hash-identically); "PSTAR" = + the adopted pre-swing fixes. Protocol and criteria are unchanged.
// "PSTAR2" (e1b_fix/E1B_FIX_DESIGN.md) = PSTAR + the active foot-yaw path (footYaw: the evidence-based capacity) + the quintic abort put-down (lcPutDown).
// Validation-battery options only (e1b_fix/ prereg; the official E1b protocol uses neither): --hz (default 240 = the protocol rate), --yawk (capacity sensitivity:
// the subtalar axial share k instead of the nominal), --pert=YAWN (the yaw impulse reversed)
const CONFIG = arg("config", "V2"), PSTAR = { ffLockedAxis: true, touchRest: true, lcVff: "lin", lcTouch: { reseed: true } }, HZ = +arg("hz", 240), YAWK = arg("yawk", "") || null;
const PSTAR2 = { ...PSTAR, footYaw: YAWK == null ? true : +YAWK, lcPutDown: true }, PSTAR3 = { ...PSTAR2, abortCapture: true }, PSTAR4 = { ...PSTAR2, abortCapture: 2 }, PSTARY = { ...PSTAR, footYaw: YAWK == null ? true : +YAWK }; if (!["V2", "PSTAR", "PSTARY", "PSTAR2", "PSTAR3", "PSTAR4"].includes(CONFIG)) throw new Error("config");   // PSTAR4 / PSTARY: e1b_close/E1B_CLOSE_PREREG.md   // PSTAR3 (e1b_ta/E1B_TA_DESIGN.md) = PSTAR2 + the T-A capture-timed abort (abortCapture)
const P2UP = ["PSTAR2", "PSTAR3", "PSTAR4", "PSTARY"].includes(CONFIG), EXP = { footYaw: P2UP, lcPutDown: ["PSTAR2", "PSTAR3", "PSTAR4"].includes(CONFIG), abortCapture: { PSTAR3: true, PSTAR4: 2 }[CONFIG] ?? false }; if (!["none", "PF", "PB", "PL", "PR", "YAW", "P15", "YAWN"].includes(PERT)) throw new Error("pert");
if (YAWK != null && !P2UP) throw new Error("--yawk needs --config=PSTARY|PSTAR2|PSTAR3|PSTAR4");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration: V2_KNEE_MODEL=v2k and V2_ANKLE_NEUTRAL_K=0.13 are required");
if (!["L", "R"].includes(SIDE)) throw new Error("side");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL;   // lifted / stance foot (0 = left, 1 = right)
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * u * u * u * (10 - 15 * u + 6 * u * u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
// ── harness event state (decided causally at the start of each controller tick from the previous tick's lifecycle state) ──
const H = { tL: null, tR: null, tA: null, tEnd: null, unloadTimeout: false, touchT0: null, anchor: null, cleared: null, clearReason: null, abortT: null, abortBeforeLift: false, airborneSeen: false };
const setTimeline = (tR) => { H.tR = tR; H.tA = tR + 4.2; H.tEnd = H.tA + 7; };
// stance-foot share σ(t) with analytic rates (the G3 request convention); λ_R = σ (right stance) or 1 − σ (left stance)
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg(t, 3, 4, 0.5, 1.0); if (H.tR == null || t < H.tR + 0.2) return [1.0, 0, 0]; return seg(t, H.tR + 0.2, 4, 1.0, 0.5); };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), base = g3Def(nS === 1 ? "U:R" : "U:L"), pd = { t0: 1, dur: 2, dz: 0.025 };
const def = { ...base, key: `E1b:${SIDE}:${PERT}`, title: `E1b: ${SIDE} foot lifted ${(LIFT * 1000).toFixed(1)} mm, perturbation ${PERT} (preregistered protocol)`, lam: lamFn, supervise: {}, holds: [], seconds: 34, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...(CONFIG === "PSTAR" ? PSTAR : CONFIG === "PSTAR2" ? PSTAR2 : CONFIG === "PSTAR3" ? PSTAR3 : CONFIG === "PSTAR4" ? PSTAR4 : CONFIG === "PSTARY" ? PSTARY : {}) }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const cfg = { kneeV2K: s.P.kneeIsV2K, ankleK: ankleNeutralKPerDeg(), lifecycle: !!s.ctrl.lc, ikRefTwist: !!s.ctrl.o.ikRefTwist, contactSupport: !!s.ctrl.o.contactSupport, holdUnloaded: !!s.ctrl.o.holdUnloaded, ikFeasible: !!s.ctrl.o.ikFeasible, hz: 1 / s.dt, pelvisDrop: s.ctrl.o.pelvisDrop === pd, config: CONFIG, ffLockedAxis: !!s.ctrl.o.ffLockedAxis, touchRest: !!s.ctrl.o.touchRest, lcVff: s.ctrl.o.lcVff || null, reseed: !!(s.ctrl.o.lcTouch && s.ctrl.o.lcTouch.reseed) };
const fyAx = s.act.ax.flat().filter(x => x && x.footYaw);   // the actuator layer's active foot-yaw axes (PSTAR2: one per ankle)
if (P2UP) Object.assign(cfg, { footYaw: s.ctrl.o.footYaw, lcPutDown: !!s.ctrl.o.lcPutDown, abortCapture: s.ctrl.o.abortCapture === 2 ? 2 : !!s.ctrl.o.abortCapture, footYawAxes: fyAx.length, footYawTiso: fyAx.length ? [fyAx[0].plus.cap.Tiso, fyAx[0].minus.cap.Tiso] : null });
if (CONFIG !== "V2" ? !(cfg.ffLockedAxis && cfg.touchRest && cfg.lcVff === "lin" && cfg.reseed) : (cfg.ffLockedAxis || cfg.touchRest || cfg.lcVff || cfg.reseed)) throw new Error("E1a configuration version mismatch " + JSON.stringify(cfg));
if (P2UP ? !(cfg.lcPutDown === EXP.lcPutDown && cfg.footYawAxes === 2 && cfg.abortCapture === EXP.abortCapture) : (s.ctrl.o.lcPutDown || s.ctrl.o.footYaw || s.ctrl.o.abortCapture || fyAx.length)) throw new Error("E1b configuration version mismatch (PSTARY/2/3/4 flags) " + JSON.stringify(cfg));
if (!cfg.kneeV2K || cfg.ankleK !== 0.13 || !cfg.lifecycle || !cfg.ikRefTwist || !cfg.contactSupport || !cfg.holdUnloaded || !cfg.ikFeasible || Math.abs(s.dt - 1 / HZ) > 1e-12 || !cfg.pelvisDrop) throw new Error("E1a configuration mismatch " + JSON.stringify(cfg));
const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), FT = ["foot_L", "foot_R"].map(bi), sd = ["L", "R"], JI = (n) => spec.joints.findIndex(j => j.name === n);
const LEGJ = ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"].map(JI), KN = [JI("knee_L"), JI("knee_R")], ANK = [JI("ankle_L"), JI("ankle_R")], HIP = [JI("hip_L"), JI("hip_R")];
const SEG = ["foot_" + sd[nS], "shank_" + sd[nS], "thigh_" + sd[nS], "pelvis", "thorax"].map(bi), PEL = bi("pelvis");
const solePts = FT.map(f => B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const heading = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; }, wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const tilt = (q) => { const u = Q.rot(q, [0, 1, 0]); return Math.acos(Math.min(1, u[1])) * D; };
const clear = (n, st) => Math.min(...solePts[n].map(p => V.add(st[FT[n]].pos, Q.rot(st[FT[n]].rot, p))[1])) * 1000;   // lowest boot point above the turf plane y = 0 (mm)
const qsOf = (st) => s.P.jd.map(d => s.P.qcs(d, st.map(b => b.rot)));
const anat = (k, qs, key) => s.P.anat(s.P.jd[k], qs[k], key);
// smallest margin (°) of joint k to its hard limits (v2k knee axial: the calibrated-range bound at the current flexion); negative = beyond
const hardMargin = (k, qs) => { const d = s.P.jd[k], v = decompose(qs[k]), th = [v.tw, v.sy, v.sz]; let m = Infinity, who = -1;
  d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(anat(k, qs, "flex")), r = anat(k, qs, "rot"); x = Math.min(r - e.hard[0], e.hard[1] - r); }
    else { const h = s.P.hardOf(k, i, qs); x = Math.min(th[i] - h[0], h[1] - th[i]) * D; } if (x < m) { m = x; who = i; } }); return [m, who]; };
const softMarginQ = (k, q, qs) => { const d = s.P.jd[k], v = decompose(q), th = [v.tw, v.sy, v.sz]; let m = Infinity;
  d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(s.P.anat(d, q, "flex")), r = s.P.anat(d, q, "rot"); x = Math.min(r - e.soft[0], e.soft[1] - r); }
    else { const so = s.P.softOf(k, i, qs); x = Math.min(th[i] - so[0], so[1] - th[i]) * D; } m = Math.min(m, x); }); return m; };
// ── controller wrappers: the protocol commands (before the original compute) and read-only captures ──
const oc = s.ctrl.compute.bind(s.ctrl), ob = s.ctrl.legIKBounded.bind(s.ctrl), IKcap = [null, null];
s.ctrl.legIKBounded = (...a) => { const r = ob(...a); IKcap[a[2]] = r; return r; };   // a[2] = the leg index (erratum E1-3: a[3] made the E1a-10 soft-limit sub-check vacuous; fixed before the PSTAR2 runs)
const CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"];
// the perturbation at the hover mid-point, through the scenario's own push / torque mechanism (G2Sim._disturb applies and ledgers base.push / base.torque); +x = the
// character's right, +z anterior (spec §7.2); "toward the lifted side" = toward the lifted foot (left foot lifted → character-left)
function schedulePert(t0) { H.pertT = PERT === "none" ? null : t0; const lift = nL === 0 ? -1 : 1, dirs = { PF: [0, 0, 5], PB: [0, 0, -5], PL: [-5, 0, 0], PR: [5, 0, 0], P15: [15 * lift, 0, 0] };
  if (dirs[PERT]) s.base.push = { t0, dur: 0.1, J: dirs[PERT], body: "thorax" }; else if (PERT === "YAW" || PERT === "YAWN") s.base.torque = { t0, dur: 0.1, H: [0, PERT === "YAW" ? 0.5 : -0.5, 0], body: "pelvis" }; }
function protocol(tc) { const lc = s.ctrl.lc, f = lc.feet[nL], g = s.ctrl.g3, aborted = !!(g && g.aborted != null);
  if (aborted && H.abortT == null) H.abortT = g.aborted;
  if (f.state === "AIRBORNE") H.airborneSeen = true;
  if (H.tA != null) { const tb = H.tA + 3; pd.dz = tc < tb ? 0.025 : 0.025 * (1 - mj((tc - tb) / 2)); }   // pelvis back (the controller's own pelvisDrop target)
  if (H.tL == null && H.tR == null) {   // unload: TOUCHING (s = 0) continuously ≥ 0.5 s, from t ≥ 7 s; time-out at 9 s; an abort before the lift ends the protocol
    if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
    if (aborted) { H.abortBeforeLift = true; setTimeline(tc); }
    else if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9) { H.tL = tc; const a = lc.target(nL); H.anchor = { pos: a.pos.slice(), rot: a.rot.slice() }; schedulePert(tc + LT + HOV / 2); }
    else if (tc >= 9 - 1e-9) { H.unloadTimeout = true; setTimeline(9); } }
  if (H.tL != null && H.cleared == null) { const u = tc - H.tL;
    if (aborted) { H.cleared = tc; H.clearReason = EXP.lcPutDown ? (EXP.abortCapture ? "abort (supervisor put-down: capture-timed quintic to the anchor)" : "abort (supervisor put-down: quintic to the anchor)") : "abort (supervisor clears the swing target)"; if (H.tR == null) setTimeline(tc); return; }
    const UR = LT + HOV + RT; if (u >= UR - 1e-9 && H.tR == null) setTimeline(H.tL + UR);
    if (u >= UR - 1e-9 && (CONTACT.includes(f.state) || u >= UR + GRACE - 1e-9)) { lc.setSwingTarget(nL, null); H.cleared = tc; H.clearReason = CONTACT.includes(f.state) ? `contact state ${f.state}` : "grace 0.3 s expired"; return; }
    const h = u < LT ? LIFT * mj(u / LT) : u < LT + HOV ? LIFT : u < UR ? LIFT * (1 - mj((u - LT - HOV) / RT)) : 0, A = H.anchor;
    lc.setSwingTarget(nL, { pos: [A.pos[0], A.pos[1] + h, A.pos[2]], rot: A.rot }); H.cmd = { tc, h }; } }
s.ctrl.compute = (st, ev, dt) => { protocol(s.ctrl.n * dt); IKcap[0] = IKcap[1] = null; const c = oc(st, ev, dt); s._cmd = c; return c; };
// ── run ──
const rows = [], poses = [], hashes = {}, ref = {}, passW = LEGJ.map(() => 0);
let prevTau = null, prevCmd = null, prevE = null, prevW = null, prevTouch = null, foot0 = null;
const phase = (t) => H.abortT != null && t >= H.abortT ? "abort" : H.tL == null ? (t < 1 ? "settle" : t < 3 ? "drop" : t < 7 ? "transfer" : H.unloadTimeout ? "accept" : "unload") : t < H.tL ? "unload" : t < H.tL + LT ? "lift" : t < H.tL + LT + HOV ? "hover" : t < H.tL + LT + HOV + RT ? "replace" : t < H.tR + 0.2 ? "hold" : t < H.tA ? "accept" : t < H.tA + 3 ? "recover" : t < H.tA + 5 ? "pelvisBack" : "quiet";
while (true) { const up0 = s.up, st0 = s.st; if (!s.tick()) break; const t = s.n * s.dt, st = s.st, I = s.ctrl.info, lcF = s.ctrl.lc.feet, pr = s.probeRows, se = s.ctrl.sense, qs = qsOf(st);
  if (!foot0) foot0 = FT.map(f => ({ pos: st[f].pos.slice(), yaw: heading(st[f].rot) }));
  if (ref.t == null && t >= 1.0 - 1e-9) { ref.t = t; ref.pelvisYaw = heading(st[PEL].rot); ref.ankleFabd = ANK.map(k => anat(k, qs, "fabd")); ref.kneeDev = KN.map(k => { const e = kneeEnvelopeV2K(anat(k, qs, "flex")); return anat(k, qs, "rot") - e.theta0; }); ref.seg = SEG.map(b => heading(st[b].rot)); }
  // actuators
  const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; const c = s._cmd;
  let dT = 0, dWho = null; if (prevTau) for (const key in tau) { const d = Math.abs(tau[key] - (prevTau[key] ?? tau[key])); if (d > dT) { dT = d; dWho = spec.joints[Math.floor(key / 3)].name + "." + "xyz"[key % 3]; } }
  let dC = 0, cWho = null; if (prevCmd && c) c.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p && Math.abs(r.tau0 - p.tau0) > dC) { dC = Math.abs(r.tau0 - p.tau0); cWho = spec.joints[k].name + "." + "xyz"[i]; } }));
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dClos = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W; prevTau = tau; prevCmd = c;
  // per-leg-joint passive work (motor impulse / dt + explicit remainder) · relative ω about each constraint axis
  LEGJ.forEach((k, m) => { const j = spec.joints[k], R = Q.mul(st0[j.childIndex].rot, j.F2), wm = (b) => V.sc(V.add(st0[b].w, st[b].w), 0.5), wr = V.sub(wm(j.childIndex), wm(j.parentIndex)), lm = s.w.lambdaMotor(k), Tx = up0 && up0.joints[k] ? up0.joints[k].Texp : [0, 0, 0];
    for (let i = 0; i < 3; i++) passW[m] += (lm[i] / s.dt + (Tx[i] || 0)) * V.dot(wr, Q.rot(R, AX[i])) * s.dt; });
  // contact onsets (turf touching pieces 0 → > 0)
  const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice();
  const tg = s.ctrl.lc.target(nL), swing = lcF[nL].swing, fp = st[FT[nL]], err = swing ? V.len(V.sub(fp.pos, swing.pos)) * 1000 : null, yawErr = swing ? wrap(heading(fp.rot) - heading(swing.rot)) : null;
  const hm = spec.joints.map((j, k) => hardMargin(k, qs)), ik = IKcap[nL] ? Math.min(...IKcap[nL].targets.map(([k, q]) => softMarginQ(k, q, qs))) : null;
  const segH = SEG.map(b => heading(st[b].rot)), dY = ref.seg ? segH.map((x, i) => wrap(x - ref.seg[i])) : null;
  rows.push({ t: +t.toFixed(6), ph: phase(t), st: lcF.map(f => f.state), s: lcF.map(f => f.s), a: lcF.map(f => f.a), Fz: se.Fz.slice(), touch: se.touch.slice(), other: se.other ? se.other.slice() : null,
    Jy: pr.map(r => (r ? r.JyN : 0)), cop: pr.map(r => (r && r.cop ? [r.cop[0], r.cop[2]] : null)), onset,
    foot: FT.map((f, n) => ({ p: st[f].pos.slice(), yaw: heading(st[f].rot), tilt: tilt(st[f].rot), clear: clear(n, st) })),
    tgt: tg ? { p: tg.pos.slice(), yaw: heading(tg.rot) } : null, swing: swing ? { p: swing.pos.slice(), yaw: heading(swing.rot) } : null, errMm: err, yawErr,
    lam: I.lam, share: I.share ? I.share.slice() : null, xi: I.xi.slice(), xiRef: I.xiRef ? I.xiRef.slice() : null, xiM: polyDist(I.polys[nS], I.xi), xiMsup: polyDist(I.support, I.xi), nSup: I.inSup.filter(Boolean).length,
    com: I.c.slice(), pel: { p: st[PEL].pos.slice(), yaw: heading(st[PEL].rot) },
    jnt: { hip: HIP.map(k => ["flex", "abd", "rot"].map(x => anat(k, qs, x))), knee: KN.map(k => { const fl = anat(k, qs, "flex"), r = anat(k, qs, "rot"); return [fl, r, r - kneeEnvelopeV2K(fl).theta0]; }), ankle: ANK.map(k => ["df", "fabd", "inv"].map(x => anat(k, qs, x))) },
    hard: hm.map(x => x[0]), hardWho: hm.map(x => x[1]), ikSoft: ik,
    tau, sat: (s.actRes || []).filter(r => r.sat).map(r => r.k * 3 + r.i), dTau: dT, dTauWho: dWho, dTau0: dC, dTau0Who: cWho,
    E: { E, ke: s.last.ke, pe: s.last.pe, U: s.last.U, Wact: L.Wact, Wext: L.Wext, damp: L.damping, dClos }, passW: passW.slice(),
    yaw: dY ? { ground: dY[0], ankle: wrap(dY[1] - dY[0]), knee: wrap(dY[2] - dY[1]), hip: wrap(dY[3] - dY[2]), upper: wrap(dY[4] - dY[3]), pelvis: dY[3] } : null,
    abort: s.ctrl.g3 ? s.ctrl.g3.aborted : null, cmdH: H.cmd && H.cmd.tc > t - s.dt - 1e-9 ? H.cmd.h : null,
    ...(P2UP && s.act.plan ? { fy: s.act.plan.joints.flatMap(p => p.rows.map((r, i) => (r && r.share != null ? { k: p.k, i, share: r.share, req: r.req, hi: r.hi, lo: r.lo } : null)).filter(Boolean)) } : {}) });
  if (s.n % 2 === 0) poses.push([+t.toFixed(5), ...st.flatMap(b => [...b.pos, ...b.rot].map(x => +x.toFixed(6)))]);
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, W: x.W, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const out = { generated: "tools/e1b_run.mjs", prereg: ["final_pre_e1a/E1_PREREGISTRATION.md §4–§6", "e1a/E1B_HARNESS.md", "knee_correction/E1_PREREGISTRATION_V2.md", "knee_correction/E1_PREREGISTRATION_V2_CONFIG.md", ...(CONFIG === "PSTAR" ? ["knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md"] : CONFIG === "PSTAR2" ? ["knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md", "e1b_fix/E1B_FIX_DESIGN.md", "e1b_fix/E1B_FIX_VALIDATION_PREREG.md"] : CONFIG === "PSTAR3" ? ["knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md", "e1b_fix/E1B_FIX_DESIGN.md", "e1b_ta/E1B_TA_DESIGN.md", "e1b_ta/E1B_TA_PREREG.md"] : ["PSTAR4", "PSTARY"].includes(CONFIG) ? ["knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md", "e1b_fix/E1B_FIX_DESIGN.md", "e1b_ta/E1B_TA_DESIGN.md", "e1b_close/E1B_CLOSE_PREREG.md"] : []), "e1a/E1A_HARNESS.md"], date: new Date().toISOString().slice(0, 10),
  human: HUMAN, side: SIDE, lifted: nL, stance: nS, liftM: LIFT, isE1b: LIFT === 0.02, pert: PERT, protocol: { LT, HOV, RT, GRACE }, cfg, events: { ...H, cmd: undefined }, ...(P2UP ? { putDown: s.ctrl.g3 && s.ctrl.g3.putDownLog ? s.ctrl.g3.putDownLog : [] } : {}), ref, foot0, hashes, mass: s.ctrl.M, W: s.ctrl.M * 9.81,
  summary: { outcome: g.outcome, fell: g.fell, abortT: g.abortT, ledger: g.ledger, feet: g.feet }, actAxes, legJoints: LEGJ.map(k => spec.joints[k].name), joints: spec.joints.map(j => j.name),
  axisNames: Object.fromEntries((s.actRes || []).map(r => [r.k * 3 + r.i, spec.joints[r.k].name + "." + "xyz"[r.i]])), lcLog: s.ctrl.lc.feet.map(f => f.log), bodies: B.map(b => b.name), rows, poses };
s.destroy();
const txt = JSON.stringify(out); if (OUT) fs.writeFileSync(OUT, OUT.endsWith(".gz") ? zlib.gzipSync(txt) : txt);
console.log(`E1b run (${PERT}) ${HUMAN} ${SIDE}-lift ${(LIFT * 1000).toFixed(1)} mm: outcome ${g.outcome}; lift ${H.tL != null ? H.tL.toFixed(3) + " s" : "—"}${H.unloadTimeout ? " (UNLOAD TIME-OUT)" : ""}${H.abortT != null ? `; ABORT at ${H.abortT.toFixed(3)} s` : ""}; clear ${H.cleared != null ? H.cleared.toFixed(3) + " s (" + H.clearReason + ")" : "—"}; end ${rows.length ? rows[rows.length - 1].t.toFixed(2) : "—"} s; ${rows.length} ticks; hash ${hashes.end}`);
