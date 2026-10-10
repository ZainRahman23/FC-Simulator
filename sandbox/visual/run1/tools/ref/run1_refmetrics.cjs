// run1/tools/ref/run1_refmetrics.cjs — whole-body COORDINATION metrics, identical definitions on real running (CMU mocap strides) and on
// RUN-1.0 / RUN-1.1: stance loading (knee, hip height), propulsion (heel rise, knee extension, take-off height), flight (apex), swing
// timing, trunk pitch, arm carriage, pelvis / thorax rotation and obliquity. All angles from JOINT POSITIONS (robust to skeleton
// calibration); trunk / foot / ankle relative to each skeleton's neutral pose. Not a target list: it shows where RUN-1's coordination differs.
// usage: node run1_refmetrics.cjs --cmu <dir> --cols ref:16_46:r:18:100,ref:09_06:r:30:118,orig:3.8,new:3.8,orig:5.5,new:5.5 [--json out.json]
const { trial } = require("./cmu_trial.cjs"), { parseASF, parseAMC, fk } = require("./cmu_amc.cjs"), { loadRun1 } = require("../run1_load.cjs");
const path = require("path"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg("cmu", process.env.RUN1_CMU_DIR);
const D = 180 / Math.PI, sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const nrm = (a) => { const l = Math.hypot(...a); return a.map(x => x / l); }, ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(nrm(a), nrm(b))))) * D;
const N = 200;
// per-frame features from a joint dict J {pel, neck, head, R:{hip,knee,ankle,mtp,tip,sh,el,wr}, L:{…}} in axes fwd / up / right
function feats(J, ax) {
  const { fwd, up, right } = ax, sag = (v) => Math.atan2(dot(v, fwd), -dot(v, up)) * D, o = {};
  for (const s of ["R", "L"]) { const j = J[s];
    o["thigh" + s] = sag(sub(j.knee, j.hip)); o["shank" + s] = sag(sub(j.ankle, j.knee)); o["knee" + s] = ang(sub(j.knee, j.hip), sub(j.ankle, j.knee));
    o["foot" + s] = Math.atan2(dot(sub(j.mtp, j.ankle), up), dot(sub(j.mtp, j.ankle), fwd)) * D;        // + = toes up
    o["ankle" + s] = ang(sub(j.knee, j.ankle), sub(j.mtp, j.ankle));                                  // included shank–foot angle (smaller = more DF)
    o["uarm" + s] = sag(sub(j.el, j.sh)); o["elbow" + s] = ang(sub(j.el, j.sh), sub(j.wr, j.el));
    o["wristLat" + s] = (s === "R" ? 1 : -1) * dot(sub(j.wr, J.pel), right); o["wristF" + s] = dot(sub(j.wr, J.pel), fwd); o["wristU" + s] = dot(sub(j.wr, J.pel), up);
  }
  const tv = sub(J.neck, J.pel); o.trunk = Math.atan2(dot(tv, fwd), dot(tv, up)) * D;
  const hl = sub(J.R.hip, J.L.hip), sl = sub(J.R.sh, J.L.sh);
  o.pelYaw = Math.atan2(-dot(hl, fwd), dot(hl, right)) * D; o.shYaw = Math.atan2(-dot(sl, fwd), dot(sl, right)) * D;        // + = the right side BACK
  o.pelRoll = Math.atan2(dot(hl, up), dot(hl, right)) * D;                                                                // + = the right hip UP
  o.hipH = dot(J.pel, up) - J.ground; o.headH = dot(J.head, up) - J.ground;
  return o;
}
function resample(rows, i0, i1, n) { const out = []; for (let k = 0; k <= n; k++) { const x = i0 + (i1 - i0) * k / n, a = Math.min(rows.length - 2, Math.floor(x)), f = x - a, A = rows[a], B = rows[a + 1], o = {}; for (const key in A) o[key] = A[key] + (B[key] - A[key]) * f; out.push(o); } return out; }
function refStride(spec) {
  const [, id, sd, a, b] = spec.split(":"), [subj, tr] = id.split("_"), T = trial(dir, subj, tr), S = parseASF(path.join(dir, subj + ".asf")), AM = parseAMC(path.join(dir, `${subj}_${tr}.amc`));
  const s = sd, o = s === "r" ? "l" : "r", up = [0, 1, 0], fwd = T.fwd, rgt = [fwd[1] * up[2] - fwd[2] * up[1], fwd[2] * up[0] - fwd[0] * up[2], fwd[0] * up[1] - fwd[1] * up[0]];
  const right = s === "l" ? sub([0, 0, 0], rgt) : rgt, sc = 0.834 / T.legLen;          // a LEFT stride is mirrored into the right-stride convention
  const J = (P, g) => { const L = (c) => ({ hip: P[c + "femur"].start, knee: P[c + "tibia"].start, ankle: P[c + "foot"].start, mtp: P[c + "toes"].start, tip: P[c + "toes"].p, sh: P[c + "clavicle"].p, el: P[c + "humerus"].p, wr: P[c + "radius"].p });
    const R = L(s), Lf = L(o); return { pel: mid(R.hip, Lf.hip), neck: P.lowerneck.start, head: P.head.p, R, L: Lf, ground: g }; };
  const rows = AM.map(fr => { const f = feats(J(fk(S, fr), T.g), { fwd, up, right }); for (const k of ["hipH", "headH", "wristLatR", "wristLatL", "wristFR", "wristFL", "wristUR", "wristUL"]) f[k] *= sc; return f; });
  const neutral = feats(J(fk(S, { root: [0, 0, 0, 0, 0, 0] }), 0), { fwd: [0, 0, 1], up, right: [-1, 0, 0] });
  const st = T.rows.map(r => r[s].st), sto = T.rows.map(r => r[o].st); let to = +a; while (to + 1 < +b && st[to + 1]) to++;
  let otd = +a + 1; while (otd < +b && !sto[otd]) otd++;
  const n = +b - +a, v = T.rows.slice(+a, +b).reduce((q, r) => q + r.v, 0) / n;
  return { id: `${id}${sd}`, ref: true, v, T: n / T.hz, D: (to - +a) / n, oTD: (otd - +a) / n, C: resample(rows, +a, +b, N), neutral };
}
let X = null;
function run1Stride(which, v) {
  X = X || loadRun1(); const E = which === "orig" ? X.RUN1_ORIG : X, skel = Object.assign({}, X.charSkel("vinicius")); delete skel._r1body;
  const B = skel.byName, A = E.r1Make(skel), G = E.r1Prepare(A, v), p = G.p;
  const J = (f) => { const P = (n) => f.P[B[n].idx], L = (sd) => ({ hip: P("thigh_" + sd), knee: P("shin_" + sd), ankle: P("foot_" + sd), mtp: P("toe_" + sd), tip: P("toe_" + sd), sh: P("upperArm_" + sd), el: P("foreArm_" + sd), wr: P("hand_" + sd) });
    const R = L("R"), Lf = L("L"); return { pel: mid(R.hip, Lf.hip), neck: P("neck"), head: X.RV.add(P("head"), X.R3.v(f.R[B.head.idx], X.RV.sc(B.head.dir, B.head.len))), R, L: Lf, ground: 0 }; };
  const ax = { fwd: [0, 0, 1], up: [0, 1, 0], right: [1, 0, 0] }, C = [];
  for (let k = 0; k <= N; k++) C.push(feats(J(E.r1FK(G, E.r1Pose(G, (k / N) % 1), null)), ax));
  const neutral = feats(J(E.r1FK(G, { rot: {}, pelvisPos: [0, G.body.pelvisY, 0] }, null)), ax);
  return { id: `${which === "orig" ? "RUN-1.0" : "RUN-1.1"}@${v}`, ref: false, v, T: p.T, D: p.D, oTD: 0.5, C, neutral };
}
// ── metrics of one stride
function metrics(S) {
  const C = S.C, iTO = Math.round(S.D * N), iOTD = Math.round(S.oTD * N), nz = S.neutral, m = {};
  const at = (k, i) => C[Math.max(0, Math.min(N, i))][k], argmax = (k, i0, i1, sgn = 1) => { let b = i0; for (let i = i0; i <= i1; i++) if (sgn * C[i][k] > sgn * C[b][k]) b = i; return b; };
  const pc = (i, i0, i1) => (i - i0) / Math.max(1, i1 - i0) * 100;
  m.speed = S.v; m.stride_s = S.T; m.duty_pct = S.D * 100;
  m.kneeTD = at("kneeR", 0); const iK = argmax("kneeR", 0, iTO); m.kneePeak = at("kneeR", iK); m.kneePeak_atStance_pct = pc(iK, 0, iTO); m.kneeTO = at("kneeR", iTO);
  const iKmin = argmax("kneeR", iK, Math.min(N, iTO + Math.round(0.03 * N)), -1); m.kneeMin_atStance_pct = pc(iKmin, 0, iTO);
  m.kneeLoadFlex = m.kneePeak - m.kneeTD;
  const iLow = argmax("hipH", 0, iTO, -1); m.hipDrop_cm = (at("hipH", 0) - at("hipH", iLow)) * 100; m.hipLow_atStance_pct = pc(iLow, 0, iTO);
  m.hipTOminusTD_cm = (at("hipH", iTO) - at("hipH", 0)) * 100;
  const iApex = argmax("hipH", iTO, iOTD); m.hipApexAboveTO_cm = (at("hipH", iApex) - at("hipH", iTO)) * 100; m.hipApex_atFlight_pct = pc(iApex, iTO, iOTD);
  let lo = 1e9, hi = -1e9; for (const r of C) { lo = Math.min(lo, r.hipH); hi = Math.max(hi, r.hipH); } m.hipRange_cm = (hi - lo) * 100;
  m.footStrike_toesUp = at("footR", 0) - nz.footR;
  let iHR = 0; for (let i = 0; i <= iTO; i++) if (at("footR", i) - nz.footR > -4) iHR = i; m.heelRise4deg_atStance_pct = pc(iHR, 0, iTO);      // last stance frame with the heel < 4° up
  m.footTO_heelUp = -(at("footR", iTO) - nz.footR);
  const iDF = argmax("ankleR", 0, iTO, -1); m.ankleDFpeak = nz.ankleR - at("ankleR", iDF); m.ankleDF_atStance_pct = pc(iDF, 0, iTO); m.anklePF_TO = nz.ankleR - at("ankleR", iTO);
  m.thighTD = at("thighR", 0); m.thighTO = at("thighR", iTO);
  const iTh = argmax("thighR", iTO, N); m.thighMax = at("thighR", iTh); m.thighMax_atStride_pct = iTh / N * 100; m.thighRetract = m.thighMax - at("thighR", N);
  const iKs = argmax("kneeR", iTO, N); m.kneeSwingMax = at("kneeR", iKs); m.kneeSwingMax_atStride_pct = iKs / N * 100;
  // contralateral (left) thigh at the right toe-off: how far the drive knee is through
  m.otherThigh_atTO = at("thighL", iTO);
  let tsum = 0, tmin = 1e9, tmax = -1e9, iTmax = 0; for (let i = 0; i <= N; i++) { const t = C[i].trunk - nz.trunk; tsum += t; if (t < tmin) tmin = t; if (t > tmax) { tmax = t; iTmax = i; } }
  m.trunkLean = tsum / (N + 1); m.trunkPitchRange = tmax - tmin; m.trunkMax_atStride_pct = (iTmax / N * 100) % 50;   // twice per stride
  // arm relative to the trunk (shoulder flexion ≈ upper-arm sagittal angle + trunk lean)
  let af = -1e9, ab = 1e9, iAf = 0, emin = 1e9, emax = -1e9, iEmax = 0, wl = 1e9;
  for (let i = 0; i <= N; i++) { const r = C[i], a = r.uarmR + (r.trunk); if (a > af) { af = a; iAf = i; } if (a < ab) ab = a; if (r.elbowR < emin) emin = r.elbowR; if (r.elbowR > emax) { emax = r.elbowR; iEmax = i; } wl = Math.min(wl, r.wristLatR); }
  m.armFwd = af; m.armBack = -ab; m.armFwd_atStride_pct = iAf / N * 100; m.elbowMin = emin; m.elbowMax = emax; m.elbowMaxLag_pct = (((iEmax - iAf) / N * 100) + 150) % 100 - 50; m.wristLatMin_cm = wl * 100;
  let wfmax = -1e9; for (const r of C) wfmax = Math.max(wfmax, r.wristFR); m.wristFwdMax_cm = wfmax * 100;
  const amp = (k) => { let a = 1e9, b = -1e9, ib = 0; for (let i = 0; i <= N; i++) { if (C[i][k] < a) a = C[i][k]; if (C[i][k] > b) { b = C[i][k]; ib = i; } } return [(b - a) / 2, ib / N * 100]; };
  [m.pelYawAmp, m.pelYawRbackMax_pct] = amp("pelYaw");   // (yaw / roll extreme phases are circular: 0 % = 100 %) [m.shYawAmp, m.shYawRbackMax_pct] = amp("shYaw"); [m.pelRollAmp, m.pelRollRupMax_pct] = amp("pelRoll");
  return m;
}
const cols = arg("cols", "").split(",").filter(Boolean).map(c => c.startsWith("ref:") ? refStride(c) : run1Stride(c.split(":")[0], +c.split(":")[1]));
const M = cols.map(metrics), keys = Object.keys(M[0]);
const refIdx = cols.map((c, i) => c.ref ? i : -1).filter(i => i >= 0);
console.log("metric".padEnd(26) + cols.map(c => c.id.padStart(13)).join("") + (refIdx.length > 1 ? "     REAL mean".padStart(14) : ""));
const CIRC = new Set(["pelYawRbackMax_pct", "shYawRbackMax_pct", "pelRollRupMax_pct"]);        // stride phases: circular mean
const cmean = (xs) => { const s = xs.reduce((q, x) => q + Math.sin(x / 50 * Math.PI), 0), c = xs.reduce((q, x) => q + Math.cos(x / 50 * Math.PI), 0); return ((Math.atan2(s, c) / Math.PI * 50) + 100) % 100; };
for (const k of keys) { const mean = refIdx.length ? (CIRC.has(k) ? cmean(refIdx.map(i => M[i][k])) : refIdx.reduce((q, i) => q + M[i][k], 0) / refIdx.length) : null;
  console.log(k.padEnd(26) + M.map(m => m[k].toFixed(1).padStart(13)).join("") + (refIdx.length > 1 ? mean.toFixed(1).padStart(14) : "")); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ cols: cols.map(c => c.id), metrics: M }, null, 1));
