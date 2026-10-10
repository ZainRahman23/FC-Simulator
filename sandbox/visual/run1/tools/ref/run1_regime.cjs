// run1/tools/ref/run1_regime.cjs — SPEED-REGIME metrics: the gait variables that change with speed (timing, COM, touchdown, stance stiffness,
// drive, recovery, upper body), measured the SAME way from world joint positions on real strides (CMU mocap) and on any RUN-1 version at any
// speed. One stride, right leg, right touchdown → next right touchdown.
// usage: node run1_regime.cjs --cmu <dir> --cols ref:16_46:r:18:100,v11:3.0,v11:5.5,v11:7.8,new:5.5 [--json out.json]
//   engines: orig (RUN-1.0), v11 (RUN-1.1, frozen), new (run1_gait.js)
const { trial } = require("./cmu_trial.cjs"), { parseASF, parseAMC, fk } = require("./cmu_amc.cjs"), { loadRun1 } = require("../run1_load.cjs");
const path = require("path"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg("cmu", process.env.RUN1_CMU_DIR);
const D = 180 / Math.PI, sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mid = (a, b) => sc(add(a, b), 0.5), len = (a) => Math.hypot(...a), lerp = (a, b, t) => add(a, sc(sub(b, a), t));
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b))))) * D;
// segment COM model (Dempster/de Leva fractions, as tools/ref com check): positions from the joint dict
function com(J) {
  const seg = [[0.497, lerp(J.pel, mid(J.R.sh, J.L.sh), 0.45)], [0.081, lerp(J.neck, J.head, 0.6)]];
  for (const s of ["R", "L"]) { const j = J[s]; seg.push([0.1, lerp(j.hip, j.knee, 0.41)], [0.0465, lerp(j.knee, j.ankle, 0.44)], [0.0145, lerp(j.ankle, j.mtp, 0.5)], [0.028, lerp(j.sh, j.el, 0.58)], [0.016, lerp(j.el, j.wr, 0.43)], [0.006, j.wr]); }
  let m = 0, c = [0, 0, 0]; for (const [w, p] of seg) { m += w; c = add(c, sc(p, w)); } return sc(c, 1 / m);
}
// a source = { frames: [{ t, J (world, metres; J.R/J.L legs+arms), stR, stL }], fwd, up, right, legLen, title }
function refSource(spec) {
  const [, id, sd, a, b] = spec.split(":"), [subj, tr] = id.split("_"), T = trial(dir, subj, tr), S = parseASF(path.join(dir, subj + ".asf")), AM = parseAMC(path.join(dir, `${subj}_${tr}.amc`));
  const s = sd, o = s === "r" ? "l" : "r", up = [0, 1, 0], fwd = T.fwd, rgt = [fwd[1] * up[2] - fwd[2] * up[1], fwd[2] * up[0] - fwd[0] * up[2], fwd[0] * up[1] - fwd[1] * up[0]];
  const scale = 0.834 / T.legLen, frames = [];
  for (let i = +a; i <= +b + 1 && i < T.n; i++) { const P = fk(S, AM[i]), g = [0, T.g, 0];
    const q = (p) => sc(sub(p, g), scale), L = (c) => ({ hip: q(P[c + "femur"].start), knee: q(P[c + "tibia"].start), ankle: q(P[c + "foot"].start), mtp: q(P[c + "toes"].start), tip: q(P[c + "toes"].p), sh: q(P[c + "clavicle"].p), el: q(P[c + "humerus"].p), wr: q(P[c + "radius"].p) });
    const R = L(s), Lf = L(o); frames.push({ t: (i - +a) / T.hz, J: { pel: mid(R.hip, Lf.hip), neck: q(P.lowerneck.start), head: q(P.head.p), R, L: Lf }, stR: T.rows[i][s].st, stL: T.rows[i][o].st }); }
  const v = T.rows.slice(+a, +b).reduce((qq, r) => qq + r.v, 0) / (+b - +a);
  return { title: `REAL ${id}${sd} ${v.toFixed(1)}`, frames, fwd, up, right: s === "l" ? sc(rgt, -1) : rgt, hz: T.hz, v: v * scale, ref: true };
}
let X = null;
function run1Source(eng, v) {
  X = X || loadRun1(); const E = eng === "orig" ? X.RUN1_ORIG : eng === "v11" ? X.RUN1_V11 : X, sk = Object.assign({}, X.charSkel("vinicius")); delete sk._r1body;
  const B = sk.byName, A = E.r1Make(sk), hz = 240, frames = []; let t0 = null;
  for (let k = 0; k <= 3 * hz; k++) { const t = 1.5 + k / hz, rs = E.r1Replay(A, () => v, null, t), ev = E.r1Evaluate(A, { x: v * t, y: 0, heading: 0, v }), lg = A.pose.legs; rs();
    const f = ev.fk, P = (n) => Array.from(f.joint[B[n].idx]), tip = (n) => Array.from(f.tip[B[n].idx]);
    const L = (sd) => ({ hip: P("thigh_" + sd), knee: P("shin_" + sd), ankle: P("foot_" + sd), mtp: P("toe_" + sd), tip: tip("toe_" + sd), sh: P("upperArm_" + sd), el: P("foreArm_" + sd), wr: P("hand_" + sd) });
    const R = L("R"), Lf = L("L"), fr = { t, J: { pel: mid(R.hip, Lf.hip), neck: P("neck"), head: tip("head"), R, L: Lf }, stR: lg.R.st, stL: lg.L.st };
    if (t0 == null) { if (frames.length && !frames[frames.length - 1].stR && fr.stR) t0 = frames.length; }
    frames.push(fr); }
  // trim to the first right touchdown … the next one (+1 frame)
  let i1 = t0 + 1; while (i1 < frames.length && !( !frames[i1 - 1].stR && frames[i1].stR)) i1++;
  const fr = frames.slice(t0, i1 + 1); const tb = fr[0].t; fr.forEach(f => f.t -= tb);
  const names = { orig: "RUN-1.0", v11: "RUN-1.1", new: "RUN-1.2" };
  return { title: `${names[eng]} ${v}`, frames: fr, fwd: [1, 0, 0], up: [0, 1, 0], right: [0, 0, -1], hz, v, ref: false };   // world: x = forward, z = −right (GL)
}
function metrics(S) {
  const F = S.frames, n = F.length - 1, hz = S.hz, dt = 1 / hz, m = {}, fx = (p) => dot(p, S.fwd), uy = (p) => dot(p, S.up), rx = (p) => dot(p, S.right);
  const sag = (v) => Math.atan2(dot(v, S.fwd), -dot(v, S.up)) * D;
  // events
  let iTO = 0; while (iTO + 1 < n && F[iTO + 1].stR) iTO++;
  let iLTD = iTO; while (iLTD < n && !F[iLTD].stL) iLTD++; let iLTO = iLTD; while (iLTO + 1 < n && F[iLTO + 1].stL) iLTO++;
  const T = n * dt, tc = (iTO + 1) * dt;
  m.speed = S.v; m.stride_s = T; m.contact_ms = tc * 1000; m.flight_ms = ((iLTD - iTO - 1) * dt) * 1000; m.cadence_sps = 2 / T; m.step_m = S.v * T / 2; m.duty_pct = tc / T * 100;
  // COM + pelvis vertical
  const C = F.map(f => com(f.J)), cy = C.map(uy), py = F.map(f => uy(f.J.pel));
  m.comRange_cm = (Math.max(...cy) - Math.min(...cy)) * 100; m.pelRange_cm = (Math.max(...py) - Math.min(...py)) * 100;
  m.vertOverStep_pct = m.comRange_cm / 100 / m.step_m * 100;
  const vy = (i) => (cy[Math.min(n, i + 1)] - cy[Math.max(0, i - 1)]) / ((Math.min(n, i + 1) - Math.max(0, i - 1)) * dt);
  m.comVyTO_ms = vy(iTO); m.comVyTD_ms = vy(1);
  let iLow = 0; for (let i = 0; i <= iTO; i++) if (cy[i] < cy[iLow]) iLow = i; m.comDropStance_cm = (cy[0] - cy[iLow]) * 100;
  // touchdown geometry: contact point = the lower of ankle-projection and MTP at touchdown; COM and hip ahead/behind (+ = foot ahead)
  const J0 = F[0].J, cpt = J0.R.mtp; m.tdFootAheadOfCOM_m = fx(J0.R.ankle) - fx(C[0]); m.tdFootAheadOfHip_m = fx(J0.R.ankle) - fx(J0.R.hip);
  m.tdShank_deg = sag(sub(J0.R.ankle, J0.R.knee)); m.tdThigh_deg = sag(sub(J0.R.knee, J0.R.hip)); m.tdKnee_deg = ang(sub(J0.R.knee, J0.R.hip), sub(J0.R.ankle, J0.R.knee));
  m.tdLegAngle_deg = Math.atan2(fx(J0.R.ankle) - fx(J0.R.hip), uy(J0.R.hip) - uy(J0.R.ankle)) * D;
  const JT = F[iTO].J; m.toLegAngle_deg = Math.atan2(fx(JT.R.mtp) - fx(JT.R.hip), uy(JT.R.hip) - uy(JT.R.mtp)) * D;
  // stance compression: hip → ankle distance shortening (and knee flexion excursion)
  const legL = F.slice(0, iTO + 1).map(f => len(sub(f.J.R.hip, f.J.R.ankle))); m.legShorten_cm = (legL[0] - Math.min(...legL)) * 100;
  const kneeS = F.slice(0, iTO + 1).map(f => ang(sub(f.J.R.knee, f.J.R.hip), sub(f.J.R.ankle, f.J.R.knee))); m.stanceKneePeak = Math.max(...kneeS); m.stanceKneeFlex = m.stanceKneePeak - kneeS[0];
  // drive: thigh at toe-off, peak thigh extension velocity in stance (deg/s, backward)
  const thR = F.map(f => sag(sub(f.J.R.knee, f.J.R.hip))), thL = F.map(f => sag(sub(f.J.L.knee, f.J.L.hip)));
  m.toThigh_deg = thR[iTO]; let wb = 0; for (let i = 1; i < iTO; i++) wb = Math.min(wb, (thR[i + 1] - thR[i - 1]) / (2 * dt)); m.stanceThighRate_degs = wb;
  // recovery: peak swing knee, its timing, knee at the opposite touchdown; heel (ankle) height peak in swing relative to the ground and to the hip
  const kR = F.map(f => ang(sub(f.J.R.knee, f.J.R.hip), sub(f.J.R.ankle, f.J.R.knee)));
  let iK = iTO; for (let i = iTO; i <= n; i++) if (kR[i] > kR[iK]) iK = i; m.swingKneePeak = kR[iK]; m.swingKneePeak_pct = iK / n * 100; m.kneeAtOppTD = kR[iLTD];
  let ah = -1; for (let i = iTO; i <= n; i++) ah = Math.max(ah, uy(F[i].J.R.ankle)); m.swingAnkleHeightMax_cm = ah * 100;
  let hb = 1e9; for (let i = iTO; i <= n; i++) hb = Math.min(hb, uy(F[i].J.R.hip) - uy(F[i].J.R.ankle)); m.ankleBelowHipMin_cm = hb * 100;
  // knee drive: peak thigh angle, timing relative to the opposite toe-off (ms, + = after)
  let iTh = iTO; for (let i = iTO; i <= n; i++) if (thR[i] > thR[iTh]) iTh = i; m.thighPeak_deg = thR[iTh]; m.thighPeakAfterOppTO_ms = (iTh - iLTO) * dt * 1000;
  // thigh separation (front minus rear thigh angle) at right touchdown, right toe-off, maximum
  m.sepAtTD_deg = thR[0] - thL[0]; m.sepAtTO_deg = thL[iTO] - thR[iTO]; let sx = 0; for (let i = 0; i <= n; i++) sx = Math.max(sx, Math.abs(thR[i] - thL[i])); m.sepMax_deg = sx;
  // unfolding: knee at 90 % of swing, peak knee extension rate in late swing, thigh retraction rate before touchdown
  const i90 = Math.round(iTO + 0.9 * (n - iTO)); m.knee90swing = kR[i90];
  let ke = 0, tr = 0; for (let i = Math.round(iTO + 0.5 * (n - iTO)); i < n; i++) { ke = Math.min(ke, (kR[i + 1] - kR[i - 1]) / (2 * dt)); tr = Math.min(tr, (thR[i + 1] - thR[i - 1]) / (2 * dt)); }
  m.lateSwingKneeExtRate_degs = ke; m.lateSwingThighRetractRate_degs = tr;
  // foot velocity relative to the ground just before touchdown (ankle, world forward, m/s; + = still moving forward), 10 and 25 ms before; and relative to the hip
  const fv = (i) => (fx(F[i + 1].J.R.ankle) - fx(F[i - 1].J.R.ankle)) / (2 * dt), lastFrame = n;     // the stride ends AT the next right touchdown
  const back = (ms) => Math.max(1, lastFrame - Math.round(ms / 1000 * hz));
  m.footVel10msBeforeTD_ms = fv(back(10)); m.footVel25msBeforeTD_ms = fv(back(25)); m.footVel50msBeforeTD_ms = fv(back(50));
  // upper body
  const tr2 = F.map(f => Math.atan2(dot(sub(f.J.neck, f.J.pel), S.fwd), dot(sub(f.J.neck, f.J.pel), S.up)) * D);
  m.trunkLean_deg = tr2.reduce((a, b) => a + b, 0) / tr2.length; m.trunkRange_deg = Math.max(...tr2) - Math.min(...tr2);
  const yaw = (a, b) => Math.atan2(-dot(sub(a, b), S.fwd), dot(sub(a, b), S.right)) * D;
  const pY = F.map(f => yaw(f.J.R.hip, f.J.L.hip)), sY = F.map(f => yaw(f.J.R.sh, f.J.L.sh)); m.pelvisYawRange_deg = Math.max(...pY) - Math.min(...pY); m.shoulderYawRange_deg = Math.max(...sY) - Math.min(...sY);
  const ua = F.map((f, i) => sag(sub(f.J.R.el, f.J.R.sh)) + tr2[i]); m.armFwd_deg = Math.max(...ua); m.armBack_deg = -Math.min(...ua); m.armRange_deg = m.armFwd_deg + m.armBack_deg;
  const el = F.map(f => ang(sub(f.J.R.el, f.J.R.sh), sub(f.J.R.wr, f.J.R.el))); m.elbowMin = Math.min(...el); m.elbowMax = Math.max(...el);
  const wH = F.map(f => uy(f.J.R.wr) - uy(f.J.pel)), wF = F.map(f => fx(f.J.R.wr) - fx(f.J.pel)); m.handHighAboveHip_cm = Math.max(...wH) * 100; m.handFwd_cm = Math.max(...wF) * 100; m.handBack_cm = -Math.min(...wF) * 100;
  const hd = F.map(f => uy(f.J.head)); m.headRange_cm = (Math.max(...hd) - Math.min(...hd)) * 100;
  return m;
}
const cols = arg("cols", "").split(",").filter(Boolean).map(c => c.startsWith("ref:") ? refSource(c) : run1Source(c.split(":")[0], +c.split(":")[1]));
const M = cols.map(metrics), keys = Object.keys(M[0]);
const refIdx = cols.map((c, i) => c.ref ? i : -1).filter(i => i >= 0);
console.log("metric".padEnd(30) + cols.map(c => c.title.padStart(12)).join("") + (refIdx.length > 1 ? "  REAL mean".padStart(12) : ""));
for (const k of keys) { const mean = refIdx.length > 1 ? refIdx.reduce((q, i) => q + M[i][k], 0) / refIdx.length : null;
  console.log(k.padEnd(30) + M.map(m => (Math.abs(m[k]) >= 100 ? m[k].toFixed(0) : m[k].toFixed(2)).padStart(12)).join("") + (mean != null ? (Math.abs(mean) >= 100 ? mean.toFixed(0) : mean.toFixed(2)).padStart(12) : "")); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ cols: cols.map(c => c.title), metrics: M }, null, 1));
