// ═══ physchar2/tools/e2_run.mjs — E2: ONE run (e2/E2_PREREGISTRATION_v2.md §1) with the per-tick telemetry needed to reconstruct the physical step (user instruction
// 2026-10-06): measured COM / DCM vs references (ξ_ref, ξ̇_ref, VRP, COM reference); implied CoP p*, requested (commanded achievable) CoP, realised CoP (probes);
// planned vs measured liftoff / touchdown / support times (sequencer events + lifecycle transitions); planned foothold, first-contact and settled poses; whole-foot
// clearance and per-piece contact history; stance-foot translation / rotation; swing-foot reference p / v / a vs the actual foot; loads and shares; actuator torques
// and saturation; contact force, penetration (lowest boot point below the turf) and rebound; planner calls (verdicts, certificates, predictions for the DCM
// prediction error); energy ledger; support-state transitions. Built from tools/e1b_run.mjs (identical row fields where they overlap). Scenario: gates/v2_e2.js.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/e2_run.mjs --protocol=step|p15 --human=V2-REF --side=L [--kind=forward|lateral] [--hz=240]
//        [--variant=low|late] [--pert=lat:s50 | fwd:contact | … (step) | none|P15 (p15)] [--config=PSTAR5|PSTAR4] --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Sim, e2Spec, CFG, E2P } from "../gates/v2_e2.js"; import { ankleNeutralKPerDeg, decompose } from "../spec/v2_joints.js"; import { polyDist } from "../ctrl/v2_stand.js";
import { V, Q } from "../core/v2_math.js"; import { kneeEnvelopeV2K } from "../spec/v2_knee.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const PROTO = arg("protocol", "step"), HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), KIND = arg("kind", "forward"), HZ = +arg("hz", 240), VAR = arg("variant", "") || null, PERT = arg("pert", "none"), CONFIG = arg("config", "PSTAR5"), OUT = arg("out", ""), D = 180 / Math.PI, AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
if (!["step", "p15"].includes(PROTO) || !["L", "R"].includes(SIDE) || !["forward", "lateral"].includes(KIND) || !["PSTAR5", "PSTAR4"].includes(CONFIG) || ![null, "low", "late"].includes(VAR)) throw new Error("arguments");
const pert = PROTO === "p15" ? PERT : PERT === "none" ? null : (() => { const [dir, when] = PERT.split(":"); if (!["lat", "fwd"].includes(dir) || !["pre", "s50", "s80", "contact", "la50"].includes(when)) throw new Error("pert"); return { dir, when }; })();
if (PROTO === "p15" && !["none", "P15", "PF", "PB", "PL", "PR", "YAW", "YAWN"].includes(PERT)) throw new Error("p15 pert");
const NOM = arg("nominal", "") || null, run = { protocol: PROTO, human: HUMAN, side: SIDE, kind: PROTO === "step" ? KIND : null, hz: HZ, variant: VAR, pert, config: CONFIG, ...(NOM ? { nominal: { dx: +NOM.split(",")[0], dy: +NOM.split(",")[1] }, smoke: true } : {}), ...(arg("diag", "") === "noclear" ? { diag: { noClearance: true } } : {}) };
if (run.diag && !run.smoke) throw new Error("--diag only with a smoke (--nominal) run");   // --nominal=dx,dy: smoke / development (non-test) steps only
const spec = e2Spec(HUMAN), { s, H, nL, nS, seq } = e2Sim(J, spec, run);
const cfg = { kneeV2K: s.P.kneeIsV2K, ankleK: ankleNeutralKPerDeg(), lifecycle: !!s.ctrl.lc, ikRefTwist: !!s.ctrl.o.ikRefTwist, contactSupport: !!s.ctrl.o.contactSupport, holdUnloaded: !!s.ctrl.o.holdUnloaded, ikFeasible: !!s.ctrl.o.ikFeasible, hz: 1 / s.dt, pelvisDrop: !!s.ctrl.o.pelvisDrop, config: CONFIG,
  ffLockedAxis: !!s.ctrl.o.ffLockedAxis, touchRest: !!s.ctrl.o.touchRest, lcVff: s.ctrl.o.lcVff || null, reseed: !!(s.ctrl.o.lcTouch && s.ctrl.o.lcTouch.reseed), footYaw: s.ctrl.o.footYaw, lcPutDown: !!s.ctrl.o.lcPutDown, abortCapture: s.ctrl.o.abortCapture, e2: !!s.ctrl.o.e2,
  footYawAxes: s.act.ax.flat().filter(x => x && x.footYaw).length };
if (!(cfg.kneeV2K && cfg.ankleK === 0.13 && cfg.lifecycle && cfg.ikRefTwist && cfg.contactSupport && cfg.holdUnloaded && cfg.ikFeasible && Math.abs(s.dt - 1 / HZ) < 1e-12 && cfg.pelvisDrop && cfg.ffLockedAxis && cfg.touchRest && cfg.lcVff === "lin" && cfg.reseed && cfg.footYaw === true && cfg.lcPutDown && cfg.abortCapture === 2 && cfg.footYawAxes === 2 && cfg.e2 === (CONFIG === "PSTAR5"))) throw new Error("E2 configuration mismatch " + JSON.stringify(cfg));
const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), FT = ["foot_L", "foot_R"].map(bi), sd = ["L", "R"], JI = (n) => spec.joints.findIndex(j => j.name === n);
const LEGJ = ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"].map(JI), KN = [JI("knee_L"), JI("knee_R")], ANK = [JI("ankle_L"), JI("ankle_R")], HIP = [JI("hip_L"), JI("hip_R")];
const SEG = ["foot_" + sd[nS], "shank_" + sd[nS], "thigh_" + sd[nS], "pelvis", "thorax"].map(bi), PEL = bi("pelvis");
const solePts = FT.map(f => B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const heading = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; }, wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const tilt = (q) => { const u = Q.rot(q, [0, 1, 0]); return Math.acos(Math.min(1, u[1])) * D; };
const clear = (n, st) => Math.min(...solePts[n].map(p => V.add(st[FT[n]].pos, Q.rot(st[FT[n]].rot, p))[1])) * 1000;   // lowest boot point above the turf plane y = 0 (mm); negative = penetration
const qsOf = (st) => s.P.jd.map(d => s.P.qcs(d, st.map(b => b.rot))), anat = (k, qs, key) => s.P.anat(s.P.jd[k], qs[k], key);
const hardMargin = (k, qs) => { const d = s.P.jd[k], v = decompose(qs[k]), th = [v.tw, v.sy, v.sz]; let m = Infinity, who = -1;
  d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(anat(k, qs, "flex")), r = anat(k, qs, "rot"); x = Math.min(r - e.hard[0], e.hard[1] - r); }
    else { const h = s.P.hardOf(k, i, qs); x = Math.min(th[i] - h[0], h[1] - th[i]) * D; } if (x < m) { m = x; who = i; } }); return [m, who]; };
const softMarginQ = (k, q, qs) => { const d = s.P.jd[k], v = decompose(q), th = [v.tw, v.sy, v.sz]; let m = Infinity;
  d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(s.P.anat(d, q, "flex")), r = s.P.anat(d, q, "rot"); x = Math.min(r - e.soft[0], e.soft[1] - r); }
    else { const so = s.P.softOf(k, i, qs); x = Math.min(th[i] - so[0], so[1] - th[i]) * D; } m = Math.min(m, x); }); return m; };
// read-only captures: the controller's own bounded-IK calls (planner queries skipped) and the command rows
const oc = s.ctrl.compute.bind(s.ctrl), ob = s.ctrl.legIKBounded.bind(s.ctrl), IKcap = [null, null];
s.ctrl.legIKBounded = (...a) => { const r = ob(...a); if (!s.ctrl._e2plan) IKcap[a[2]] = r; return r; };
s.ctrl.compute = (st, ev, dt) => { IKcap[0] = IKcap[1] = null; const c = oc(st, ev, dt); s._cmd = c; return c; };
const r6 = (x) => (x == null ? null : Array.isArray(x) ? x.map(r6) : typeof x === "number" ? +x.toFixed(6) : x);
const rows = [], poses = [], hashes = {}, ref = {}; let prevTau = null, prevCmd = null, prevE = null, prevW = null, prevTouch = null, foot0 = null, prevFootV = null;
const phase = (t) => { if (PROTO === "p15") return H.abortT != null && t >= H.abortT ? "abort" : H.tL == null ? (t < 1 ? "settle" : t < 3 ? "drop" : t < 7 ? "transfer" : "unload") : t < H.tL + E2P.LT ? "lift" : t < H.tL + E2P.LT + E2P.HOV ? "hover" : "replace/return";
  return H.tL == null ? (t < 1 ? "settle" : t < 3 ? "drop" : t < 7 ? "transfer" : "release") : H.tA == null || t < H.tA ? "step:" + (seq ? seq.ph : "—") : t < H.tA + 3 ? "recover" : t < H.tA + 5 ? "pelvisBack" : "quiet"; };
while (true) { const st0 = s.st; if (!s.tick()) break; const t = s.n * s.dt, st = s.st, I = s.ctrl.info, lcF = s.ctrl.lc.feet, pr = s.probeRows, se = s.ctrl.sense, qs = qsOf(st);
  if (!foot0) foot0 = FT.map(f => ({ pos: st[f].pos.slice(), yaw: heading(st[f].rot) }));
  if (ref.t == null && t >= 1.0 - 1e-9) { ref.t = t; ref.pelvisYaw = heading(st[PEL].rot); ref.ankleFabd = ANK.map(k => anat(k, qs, "fabd")); ref.kneeDev = KN.map(k => { const e = kneeEnvelopeV2K(anat(k, qs, "flex")); return anat(k, qs, "rot") - e.theta0; }); ref.seg = SEG.map(b => heading(st[b].rot)); }
  const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; const c = s._cmd;
  let dT = 0, dWho = null; if (prevTau) for (const key in tau) { const d = Math.abs(tau[key] - (prevTau[key] ?? tau[key])); if (d > dT) { dT = d; dWho = spec.joints[Math.floor(key / 3)].name + "." + "xyz"[key % 3]; } }
  let dC = 0, cWho = null; if (prevCmd && c) c.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p && Math.abs(r.tau0 - p.tau0) > dC) { dC = Math.abs(r.tau0 - p.tau0); cWho = spec.joints[k].name + "." + "xyz"[i]; } }));
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dClos = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W; prevTau = tau; prevCmd = c;
  const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice();
  const tg = s.ctrl.lc.target(nL), swing = lcF[nL].swing, fp = st[FT[nL]], err = swing ? V.len(V.sub(fp.pos, swing.pos)) * 1000 : null, yawErr = swing ? wrap(heading(fp.rot) - heading(swing.rot)) : null;
  const hm = spec.joints.map((j, k) => hardMargin(k, qs)), ik = IKcap[nL] ? Math.min(...IKcap[nL].targets.map(([k, q]) => softMarginQ(k, q, qs))) : null;
  const segH = SEG.map(b => heading(st[b].rot)), dY = ref.seg ? segH.map((x, i) => wrap(x - ref.seg[i])) : null;
  const fv = FT.map(f => st[f].v.slice()), fa = prevFootV ? fv.map((v, n) => v.map((x, i) => (x - prevFootV[n][i]) / s.dt)) : null; prevFootV = fv;
  const Jy = pr.map(r => (r ? r.JyN : 0)), cop = pr.map(r => (r && r.cop ? [r.cop[0], r.cop[2]] : null)), JT = Jy[0] + Jy[1], copAll = JT > 1e-6 ? [0, 1].reduce((a, n) => (cop[n] ? [a[0] + Jy[n] * cop[n][0] / JT, a[1] + Jy[n] * cop[n][1] / JT] : a), [0, 0]) : null;
  const e2 = seq && seq.last ? seq.last : null, vrp = e2 ? e2.vrp : null;
  rows.push({ t: +t.toFixed(6), ph: phase(t), st: lcF.map(f => f.state), s: lcF.map(f => f.s), a: lcF.map(f => f.a), Fz: se.Fz.slice(), touch: se.touch.slice(), other: se.other ? se.other.slice() : null,
    pieces: pr.map(r => (r ? r.pieces.reduce((m, p, i) => (p.touch ? m | (1 << i) : m), 0) : 0)), Jy, cop, copAll, onset,
    foot: FT.map((f, n) => ({ p: st[f].pos.slice(), v: fv[n], acc: fa ? fa[n] : null, yaw: heading(st[f].rot), tilt: tilt(st[f].rot), clear: clear(n, st) })),
    tgt: tg ? { p: tg.pos.slice(), yaw: heading(tg.rot) } : null, swing: swing ? { p: swing.pos.slice(), yaw: heading(swing.rot) } : null, errMm: err, yawErr,
    lam: I.lam, share: I.share ? I.share.slice() : null, xi: I.xi.slice(), xiRef: I.xiRef ? I.xiRef.slice() : null, xiRefDot: I.xiRefDot || null, pRaw: I.pRaw.slice(), p: I.p.slice(), qsRef: I.qsRef || null,
    supD: { pRaw: polyDist(I.support, I.pRaw), vrp: vrp ? polyDist(I.support, vrp) : null, xi: polyDist(I.support, I.xi) }, xiM: polyDist(I.polys[nS], I.xi), xiMsup: polyDist(I.support, I.xi), nSup: I.inSup.filter(Boolean).length,
    com: I.c.slice(), comV: I.v.slice(), w0: I.w0, h: I.h, pel: { p: st[PEL].pos.slice(), yaw: heading(st[PEL].rot) },
    jnt: { hip: HIP.map(k => ["flex", "abd", "rot"].map(x => anat(k, qs, x))), knee: KN.map(k => { const fl = anat(k, qs, "flex"), r = anat(k, qs, "rot"); return [fl, r, r - kneeEnvelopeV2K(fl).theta0]; }), ankle: ANK.map(k => ["df", "fabd", "inv"].map(x => anat(k, qs, x))) },
    hard: hm.map(x => x[0]), hardWho: hm.map(x => x[1]), ikSoft: ik,
    tau, sat: (s.actRes || []).filter(r => r.sat).map(r => r.k * 3 + r.i), dTau: dT, dTauWho: dWho, dTau0: dC, dTau0Who: cWho,
    E: { E, ke: s.last.ke, pe: s.last.pe, U: s.last.U, Wact: L.Wact, Wext: L.Wext, damp: L.damping, dClos },
    yaw: dY ? { ground: dY[0], ankle: wrap(dY[1] - dY[0]), knee: wrap(dY[2] - dY[1]), hip: wrap(dY[3] - dY[2]), upper: wrap(dY[4] - dY[3]), pelvis: dY[3] } : null,
    abort: s.ctrl.g3 ? s.ctrl.g3.aborted : null, cmdH: H.cmd && H.cmd.tc > t - s.dt - 1e-9 ? H.cmd.h : null, e2 });
  if (s.n % 2 === 0) poses.push([+t.toFixed(5), ...st.flatMap(b => [...b.pos, ...b.rot].map(x => +x.toFixed(6)))]);
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, W: x.W, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const g3 = s.ctrl.g3, out = { generated: "tools/e2_run.mjs", prereg: ["e2/E2_DESIGN_v2.md", "e2/E2_PREREGISTRATION_v2.md", "e2/E2_IMPLEMENTATION.md"], date: new Date().toISOString().slice(0, 10), run, human: HUMAN, side: SIDE, lifted: nL, stance: nS, cfg,
  events: { ...H, cmd: undefined }, e2: seq ? seq.summary() : null, e2dec: g3 && g3.e2dec ? g3.e2dec : null, putDown: g3 && g3.putDownLog ? g3.putDownLog : [], ref, foot0, hashes, mass: s.ctrl.M, W: s.ctrl.M * 9.81,
  summary: { outcome: g.outcome, fell: g.fell, abortT: g.abortT, ledger: g.ledger, feet: g.feet }, actAxes, legJoints: LEGJ.map(k => spec.joints[k].name), joints: spec.joints.map(j => j.name),
  axisNames: Object.fromEntries((s.actRes || []).map(r => [r.k * 3 + r.i, spec.joints[r.k].name + "." + "xyz"[r.i]])), lcLog: s.ctrl.lc.feet.map(f => f.log), bodies: B.map(b => b.name), rows, poses };
s.destroy(); const txt = JSON.stringify(out); if (OUT) fs.writeFileSync(OUT, OUT.endsWith(".gz") ? zlib.gzipSync(txt) : txt);
const WH = arg("whash", ""); if (WH) fs.writeFileSync(WH, JSON.stringify({ run, hashes }));   // W (browser = Node): the running state hashes of this run
const E2 = out.e2; console.log(`E2 run ${PROTO} ${HUMAN} ${SIDE} ${PROTO === "step" ? KIND : PERT} ${HZ} Hz ${VAR || ""}${pert && PROTO === "step" ? " pert " + PERT : ""} [${CONFIG}]: outcome ${g.outcome}; ${E2 ? `sequencer ${E2.ph}${E2.calls.length ? ", decision " + E2.calls[0].verdict : ""}${E2.T ? `, T ${E2.T} Tr ${E2.Tr}` : ""}` : "no sequencer"}${out.e2dec ? `; class decision ${out.e2dec.verdict} → ${out.e2dec.planner || "—"}` : ""}; end ${rows.length ? rows[rows.length - 1].t.toFixed(2) : "—"} s; hash ${hashes.end}`);
