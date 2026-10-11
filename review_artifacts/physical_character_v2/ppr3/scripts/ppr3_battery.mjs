// PPR-3 qualification battery (frozen with the PPR-3 preregistrations). The runner ALONE (SOLO; PVP sealed) from the PPR-3 standing entry.
// Conditions: "A" CURRENT V2 (reference) · "S2" substrate alone (constant excitation) · "S2P2" substrate + continuous delayed control ·
// "S2R" substrate with the commands its S2P2 twin issued without the disturbance (deafferented replay: isolates the mechanical response).
// Every response quantity of a disturbed run is read against its UNDISTURBED twin (same condition, same entry, deterministic).
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const { runOne } = await import(new URL("./ppr3_run.mjs", import.meta.url).href), CT = await import(new URL("./ppr3_ctrl.mjs", import.meta.url).href), MS = await import(new URL("./ppr3_measure.mjs", import.meta.url).href);
const H = 1 / 240, R2D = 180 / Math.PI, spec = PL.SPEC_R(), PELVIS_COM = spec.bodies[0].comLocal;
export function makeJob(cond, CFG, extra = {}) { const j = { ...extra };
  if (cond === "A") return { law: "A", ...j };
  if (cond === "S2") return { law: "S2", params: CFG.body, ...j };
  if (cond === "S2P2") return { law: "S2", params: CFG.body, ctrl: () => new CT.P2Controller(CFG.ctrl), ...j };
  if (cond === "S2R") return { law: "S2", params: CFG.body, ctrl: () => new CT.ReplayController(extra.replayLog), ...j };
  throw new Error("condition " + cond); }
const run = (cond, CFG, extra) => runOne(makeJob(cond, CFG, extra));
// ── base of support: sole contact points within 5 mm of the turf over the steps [a, b) ──
export function bos(R, a, b) { const pts = []; for (let q = Math.max(0, a); q < b && q < R.length; q++) for (const m of R[q].contacts || []) if (m.kind === "turf-runner") for (const p of m.points) if (p.lam > 0 || p.depth >= -0.005) pts.push(p.p);
  return { fwd: Math.max(...pts.map(p => p[0])), back: Math.min(...pts.map(p => p[0])), left: Math.max(...pts.map(p => p[2])), right: Math.min(...pts.map(p => p[2])) }; }
// ── E: entry audit (first 250 ms of undisturbed standing) ──
export function entryAudit(o, steps = 60) { const R = o.recs.slice(0, steps), y0 = o.recs[0].S[0].pos[1] - 0, feet = R.map(r => (r.chars.runner.feet.L + r.chars.runner.feet.R) * 240);
  const c0 = R[0].chars.runner.com, F = R.map((r, q) => MS.frame(r, q ? R[q - 1] : null)), th0 = F[0].th;
  const copOff = F.filter(f => f.cop).map(f => Math.hypot(f.cop[0] - f.com[0], f.cop[1] - f.com[2]) * 1000);
  return { feetN: { first4: feet.slice(0, 4), min: Math.min(...feet), max: Math.max(...feet), after4: { min: Math.min(...feet.slice(4)), max: Math.max(...feet.slice(4)) } }, bodyWeightN: 73.91 * 9.81,
    turfPenMaxMm: Math.max(...R.map(r => r.chars.runner.integrity.turfPenMm)), sepMaxMm: Math.max(...R.map(r => r.chars.runner.integrity.sepMaxMm)), pelvisDropMm: (R[0].S[0].pos[1] - R[R.length - 1].S[0].pos[1]) * 1000,
    comHorizMm: Math.hypot(R[R.length - 1].chars.runner.com[0] - c0[0], R[R.length - 1].chars.runner.com[2] - c0[2]) * 1000, maxJointDriftDeg: Math.max(...MS.KEY_AXES.map(([n]) => Math.abs(F[F.length - 1].th[n] - th0[n]))),
    copComOffsetMm: { first: copOff[0], max: Math.max(...copOff), last: copOff[copOff.length - 1] } }; }
// ── isolated displacement responses (substrate) ──
// semi-isolated: the child chain kinematic about the joint centre, the parent free (stiffness on the measured angle; total torque and the
// elastic part = total − law damping × relative rate); HELD: both sides kinematic — the law's own torque terms are read (no motor acts between
// two kinematic bodies); used for the eccentric-hold (persistence) test where the angle must be exactly held
export const JOINTS = { ankle: { joint: "ankle_R", axis: "df", k: 12, i: 1, move: ["foot_R"], parent: ["shank_R"] }, knee: { joint: "knee_R", axis: "flex", k: 10, i: 1, move: ["shank_R", "foot_R"], parent: ["thigh_R"] },
  hip: { joint: "hip_R", axis: "flex", k: 8, i: 1, move: ["thigh_R", "shank_R", "foot_R"], parent: ["pelvis"] }, lumbarFlex: { joint: "lumbar", axis: "flex", k: 0, i: 1, move: ["abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R"], parent: ["pelvis"] },
  lumbarLat: { joint: "lumbar", axis: "lat", k: 0, i: 2, move: ["abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R"], parent: ["pelvis"] } };
const torq = (r, k, i) => { const a = r.act.find(x => x[0] === k && x[1] === i); return a[2] + r.passive[k][i]; };
const lawRow = (r, k, i) => (r.law || []).find(x => x[0] === k && x[1] === i);
export async function isolated(cond, CFG, B) { const out = {};
  for (const [name, J] of Object.entries(JOINTS)) { const drv = (amp, sign) => ({ joint: J.joint, axis: J.axis, sign, from: B.from, ramp: B.ramp, amp, hold: [], move: J.move });
    const base = await run(cond, CFG, { steps: B.from + B.steps, drive: drv(0, 1) }), Rb = base.recs, rows = [];
    for (const amp of B.amps) for (const sign of [1, -1]) { const o = await run(cond, CFG, { steps: B.from + B.steps, drive: drv(amp, sign) }), R = o.recs;
      const at = (ms) => { const m = Math.round(ms * 0.24), q = B.from + m - 1, th = (r) => r.chars.runner.th[J.k][J.i], dth = th(R[q]) - th(Rb[q]), dw = (dth - (th(R[q - 1]) - th(Rb[q - 1]))) * 240, dT = torq(R[q], J.k, J.i) - torq(Rb[q], J.k, J.i);
        const L = lawRow(R[q], J.k, J.i), D = cond === "A" ? (CFG.toneD && CFG.toneD[name]) || 0 : (L ? L[8] : 0); return { ms: +(m * 1000 / 240).toFixed(1), jointDeg: dth * R2D, dT, K: -dT / dth, Kel: -(dT + D * dw) / dth }; };
      rows.push({ ampRad: amp, sign, at: Object.fromEntries(B.readMs.map(ms => [ms, at(ms)])), stop: o.stop || null }); }
    out[name] = { joint: J.joint, axis: J.axis, rows }; }
  return out; }
// ankle platform (I1, Vlutters 2015 / Sakanaka 2021 protocol): both feet kinematic, toes-up about the ankles, the body above free
export async function anklePlatform(cond, CFG, B) { const run1 = (amp) => run(cond, CFG, { steps: B.from + B.steps, platform: { from: B.from, ramp: B.ramp, amp } }), base = await run1(0), rows = [];
  const T = (r, k) => { const a = r.act.find(x => x[0] === k && x[1] === 1); return a[2] + r.passive[k][1]; };
  for (const amp of B.amps) { const o = await run1(amp), at = (m) => { const q = B.from + m - 1, dT = [11, 12].reduce((s, k) => s + (T(o.recs[q], k) - T(base.recs[q], k)), 0), dth = [11, 12].reduce((s, k) => s + (o.recs[q].chars.runner.th[k][1] - base.recs[q].chars.runner.th[k][1]), 0) / 2;
      return { ms: +(m * 1000 / 240).toFixed(1), ankleDeg: Math.abs(dth) * R2D, Kmgh: Math.abs(dT) / Math.abs(dth) / B.mgh, followFrac: 1 - Math.abs(dth) / (amp * Math.min(1, m / B.ramp)) }; };
    rows.push({ ampRad: amp, ampDeg: amp * R2D, endRamp: at(B.ramp), at71: at(17), stop: o.stop || null }); }
  return rows; }
// quasi-static intrinsic stiffness: joint HELD (both sides kinematic) after a ramp; the substrate's own torque change read from its terms
// (Δdrive [force–length] + Δelastic [strain arms] + ΔB [passive]) at `readMs` after ramp start; the matched protocol for low-frequency intrinsic
// estimates (Kiemel 2008)
export async function quasiStatic(CFG, B) { const out = {};
  for (const name of B.joints) { const J = JOINTS[name], drv = (amp, sign) => ({ joint: J.joint, axis: J.axis, sign, from: B.from, ramp: B.ramp, amp, hold: J.parent, move: J.move });
    const base = await run("S2", CFG, { steps: B.from + B.steps, drive: drv(0, 1) }), rows = [];
    for (const sign of [1, -1]) { const o = await run("S2", CFG, { steps: B.from + B.steps, drive: drv(B.amp, sign) }), th = (r) => r.chars.runner.th[J.k][J.i], tq = (r) => { const L = lawRow(r, J.k, J.i); return L[11] + L[9] + L[10]; };
      const rd = (ms) => { const q = B.from + Math.round(ms * 0.24) - 1, dth = th(o.recs[q]) - th(base.recs[q]); return { ms, jointDeg: dth * R2D, K: -(tq(o.recs[q]) - tq(base.recs[q])) / dth }; };
      rows.push({ sign, read: B.readMs.map(rd) }); }
    out[name] = { joint: J.joint, axis: J.axis, ampDeg: B.amp * R2D, rows }; }
  return out; }
export async function eccentricHold(CFG, B) { const out = {};
  for (const name of B.joints) { const J = JOINTS[name], drv = (amp) => ({ joint: J.joint, axis: J.axis, sign: B.sign[name] ?? 1, from: B.from, ramp: B.ramp, amp, hold: J.parent, move: J.move });
    const base = await run("S2", CFG, { steps: B.from + B.ramp + B.holdSteps, drive: drv(0) }), o = await run("S2", CFG, { steps: B.from + B.ramp + B.holdSteps, drive: drv(B.amp) });
    const el = (r) => lawRow(r, J.k, J.i)[9], q0 = B.from + B.ramp - 1, e0 = el(o.recs[q0]) - el(base.recs[q0]), R0 = lawRow(o.recs[q0], J.k, J.i);
    out[name] = { ampDeg: B.amp * R2D, endOfStretchNm: e0, reserve: [R0[13], R0[14]], fraction: Object.fromEntries(B.readMs.map(ms => { const q = q0 + Math.round(ms * 0.24); return [ms, (el(o.recs[q]) - el(base.recs[q])) / e0]; })) }; }
  return out; }
// ── held displacement / release (torque pair across a joint, held, released) ──
export async function holdRelease(cond, CFG, B) { const base = await run(cond, CFG, { steps: B.from + B.hold + B.after }), Rb = base.recs, E = JSON.parse(fs.readFileSync(new URL("../fixture/PPR3_STANDING_ENTRY.json", import.meta.url))).write.runner.poses, out = [];
  for (const P of B.probes) for (const sgn of [1, -1]) { const k = spec.joints.findIndex(j => j.name === P.joint), j = spec.joints[k], key = ["x", "y", "z"].find(q => j.def.axes[q] && j.def.axes[q].key === P.axis), i = ["x", "y", "z"].indexOf(key);
    const axW = Q.rot(Q.mul(E[j.childIndex].rot, j.F2), [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]), o = await run(cond, CFG, { steps: B.from + B.hold + B.after, perturb: [{ from: B.from, to: B.from + B.hold, pair: [P.parent, P.child], T: V.sc(axW, sgn * P.T) }] }), R = o.recs;
    const d = R.map((r, q) => (r.chars.runner.th[k][i] - Rb[q].chars.runner.th[k][i]) * R2D), hold = d[B.from + B.hold - 1], free = d.slice(B.from + B.hold), fin = free[free.length - 1];
    const ext = []; for (let q = 1; q < free.length - 1; q++) if ((free[q] - free[q - 1]) * (free[q + 1] - free[q]) < 0) ext.push(free[q] - fin);
    const osc = []; for (const x of ext) { if (!osc.length || Math.sign(x) !== Math.sign(osc[osc.length - 1])) osc.push(x); else if (Math.abs(x) > Math.abs(osc[osc.length - 1])) osc[osc.length - 1] = x; }
    let zeta = null; if (osc.length >= 2 && Math.abs(osc[1]) > 1e-9) { const dl = Math.log(Math.abs(osc[0]) / Math.abs(osc[1])); zeta = dl / Math.sqrt(Math.PI * Math.PI + dl * dl); }
    const recoil = B.recoilMs.map(ms => ({ ms, deg: d[B.from + B.hold - 1 + Math.round(ms * 0.24)] }));
    out.push({ probe: `${P.joint}.${P.axis} ${sgn > 0 ? "+" : "−"}${P.T}`, holdDeg: hold, recoil, finalDeg: fin, residualFrac: Math.abs(fin) / Math.max(1e-12, Math.abs(hold)), oscDeg: osc.slice(0, 6), zeta, growing: osc.length >= 3 && osc.some((x, q) => q > 0 && Math.abs(x) > 1.05 * Math.abs(osc[q - 1])), stop: o.stop || null }); }
  return out; }
// ── pushes: pelvis force pulse; response vs the undisturbed twin over a window ──
export function pushJob(dir, J, onset, pulse) { const u = { fwd: [1, 0, 0], back: [-1, 0, 0], left: [0, 0, 1], right: [0, 0, -1] }[dir]; return [{ from: onset, to: onset + pulse, body: "pelvis", F: V.sc(u, J / (pulse * H)), pLocal: PELVIS_COM }]; }
export function pushMetrics(base, pert, onset, W, dir, edges) { const A = base.recs, Bp = pert.recs, ax = dir === "fwd" || dir === "back" ? 0 : 2, sg = dir === "fwd" || dir === "left" ? 1 : -1, n = Math.min(A.length, Bp.length, onset + W);
  let dev = { deg: 0, axis: null }, drop = 0, comPk = 0, loss = null, minMargin = Infinity, feetMin = Infinity, satMax = 0;
  for (let q = onset; q < n; q++) { const a = A[q], b = Bp[q]; for (const [nm, k, i] of MS.KEY_AXES) { const d = Math.abs(a.chars.runner.th[k][i] - b.chars.runner.th[k][i]) * R2D; if (d > dev.deg) dev = { deg: d, axis: nm }; }
    drop = Math.max(drop, (a.S[0].pos[1] - b.S[0].pos[1]) * 1000); const c = b.chars.runner.com, v = q ? V.sc(V.sub(c, Bp[q - 1].chars.runner.com), 240) : [0, 0, 0], xc = c[ax] + v[ax] / Math.sqrt(9.81 / c[1]);
    const mg = sg > 0 ? edges[dir] - xc : xc - edges[dir]; minMargin = Math.min(minMargin, mg); comPk = Math.max(comPk, Math.abs(c[ax] - a.chars.runner.com[ax]) * 1000); satMax = Math.max(satMax, b.chars.runner.sat);
    const fL = b.chars.runner.feet.L * 240, fR = b.chars.runner.feet.R * 240; feetMin = Math.min(feetMin, fL, fR);
    if (!loss && mg < 0) loss = { t: (b.n - onset) * H, cause: "XcoM beyond the base of support" }; if (!loss && Math.min(fL, fR) < 5 && q > onset + 2) loss = { t: (b.n - onset) * H, cause: "a foot unloaded" }; }
  const qe = n - 1; return { dev, pelvisDropMm: drop, comRelPeakMm: comPk, comRelEndMm: Math.abs(Bp[qe].chars.runner.com[ax] - A[qe].chars.runner.com[ax]) * 1000, xcomMinMarginM: minMargin, loss, feetMinN: feetMin, satMax }; }
// ── recovery classification for S2 + P2 over a long window: fall = COM horizontal leaves the base of support or the pelvis drops > dropFallMm or a
// foot unloads for > 50 ms; recovered = no fall and, over the last 1 s, COM within recTolMm of the undisturbed twin and pelvis drop < 10 mm ──
export function recovery(base, pert, onset, T, edges, crit) { const A = base.recs, Bp = pert.recs, n = Math.min(A.length, Bp.length, onset + T);
  let fall = null, unload = 0, comPk = 0, tPk = null, settle = null;
  for (let q = onset; q < n; q++) { const b = Bp[q], c = b.chars.runner.com, fL = b.chars.runner.feet.L * 240, fR = b.chars.runner.feet.R * 240; unload = Math.min(fL, fR) < 5 ? unload + 1 : 0;
    const outBos = c[0] > edges.fwd || c[0] < edges.back || c[2] > edges.left || c[2] < edges.right, drop = (A[q].S[0].pos[1] - b.S[0].pos[1]) * 1000;
    if (!fall && (outBos || drop > crit.dropFallMm || unload > 12)) fall = { t: (b.n - onset) * H, cause: outBos ? "COM beyond the base of support" : drop > crit.dropFallMm ? "pelvis drop" : "a foot unloaded > 50 ms" };
    const dc = Math.hypot(c[0] - A[q].chars.runner.com[0], c[2] - A[q].chars.runner.com[2]) * 1000; if (dc > comPk) { comPk = dc; tPk = (b.n - onset) * H; } }
  if (!fall) { for (let q = n - 1; q > onset; q--) { const dc = Math.hypot(Bp[q].chars.runner.com[0] - A[q].chars.runner.com[0], Bp[q].chars.runner.com[2] - A[q].chars.runner.com[2]) * 1000; if (dc > crit.recTolMm) { settle = (Bp[q].n - onset) * H; break; } } }
  const tail = Bp.slice(Math.max(onset, n - 240), n), tailA = A.slice(Math.max(onset, n - 240), n), tailCom = Math.max(...tail.map((b, j) => Math.hypot(b.chars.runner.com[0] - tailA[j].chars.runner.com[0], b.chars.runner.com[2] - tailA[j].chars.runner.com[2]) * 1000));
  const tailDrop = Math.max(...tail.map((b, j) => (tailA[j].S[0].pos[1] - b.S[0].pos[1]) * 1000));
  return { fall, recovered: !fall && tailCom <= crit.recTolMm && tailDrop < 10, comPeakMm: comPk, tPeakS: tPk, settleS: settle, tailComMm: tailCom, tailDropMm: tailDrop }; }
// ── standing sway (S2 + P2): COM and COP, AP / ML, over [a, b) steps ──
export function sway(o, a, b) { const F = o.recs.slice(a, b).map((r, q, arr) => MS.frame(r, q ? arr[q - 1] : null)), xs = (f) => F.map(f).filter(v => v != null);
  const stat = (v) => { const m = v.reduce((s, x) => s + x, 0) / v.length, rms = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length); return { mean: m, rms, range: Math.max(...v) - Math.min(...v) }; };
  const comAP = stat(xs(f => f.com[0] * 1000)), comML = stat(xs(f => f.com[2] * 1000)), copAP = stat(xs(f => (f.cop ? f.cop[0] * 1000 : null))), copML = stat(xs(f => (f.cop ? f.cop[1] * 1000 : null)));
  const cv = xs(f => f.cop); let path = 0; for (let q = 1; q < cv.length; q++) path += Math.hypot(cv[q][0] - cv[q - 1][0], cv[q][1] - cv[q - 1][1]) * 1000; const vel = path / (cv.length * H);
  const ap = xs(f => f.com[0]), m = ap.reduce((s, x) => s + x, 0) / ap.length; let zc = 0; for (let q = 1; q < ap.length; q++) if ((ap[q] - m) * (ap[q - 1] - m) < 0) zc++;
  const th = MS.KEY_AXES.map(([nm]) => [nm, stat(F.map(f => f.th[nm])).rms]);
  return { comAPmm: comAP, comMLmm: comML, copAPmm: copAP, copMLmm: copML, copMeanVelMmS: vel, comAPfreqHz: zc / 2 / (ap.length * H), jointRmsDeg: Object.fromEntries(th), pelvisYmm: stat(F.map(f => f.pelvisY * 1000)) }; }
