// run1/tools/ref/cmu_trial.cjs — one CMU run trial → per-frame sagittal / whole-body kinematics and contact events (per-foot ground,
// stance = lowest foot point within 3 cm of it AND the ankle or MTP nearly still; gaps <= 3 frames merged, runs < 6 frames dropped).
const { parseASF, parseAMC, fk } = require("./cmu_amc.cjs"), path = require("path"), fs = require("fs");
const D = 180 / Math.PI;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(nrm(a), nrm(b))))) * D;
function trial(dir, subj, tr) {
  const S = parseASF(path.join(dir, subj + ".asf")), F = parseAMC(path.join(dir, `${subj}_${tr}.amc`)), hz = 120;
  const P = F.map(f => fk(S, f)), n = P.length;
  const r0 = P[0].root.p, r1 = P[n - 1].root.p, fwd = nrm([r1[0] - r0[0], 0, r1[2] - r0[2]]), up = [0, 1, 0], right = cross(fwd, up);   // right = fwd × up
  const pt = (i, b) => P[i][b].p;
  const side = (s) => ({ hip: s + "femur", knee: s + "tibia", ankle: s + "foot", mtp: s + "toes" });
  // joint points: start of femur = hip, start of tibia = knee, start of foot = ankle, start of toes = MTP, end of toes = tip
  const J = (i, nm) => P[i][nm].start;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const r = {};
    r.t = i / hz; r.root = pt(i, "root");
    for (const s of ["l", "r"]) {
      const hip = J(i, s + "femur"), knee = J(i, s + "tibia"), ankle = J(i, s + "foot"), mtp = J(i, s + "toes"), tip = P[i][s + "toes"].p;
      const th = sub(knee, hip), sh = sub(ankle, knee), ft = sub(mtp, ankle);
      const sag = (v) => Math.atan2(dot(v, fwd), -dot(v, up)) * D;       // + = distal end forward of vertical
      r[s] = { hip, knee, ankle, mtp, tip, thighG: sag(th), shankG: sag(sh), footG: Math.atan2(dot(ft, up), dot(ft, fwd)) * D, knee3: ang(th, sh), low: Math.min(ankle[1], mtp[1], tip[1]), mtpY: mtp[1], tipY: tip[1], ankY: ankle[1] };
    }
    // pelvis: root rotation axes (calibration pose = neutral). tilt = forward pitch of root up axis; obliquity; yaw
    const R = P[i].root.R, ax = (c) => [R[c], R[3 + c], R[6 + c]], pu = ax(1), pf = ax(2), pr = ax(0);
    r.pTilt = Math.atan2(dot(pu, fwd), dot(pu, up)) * D;                     // + = anterior (top forward)
    r.pObl = Math.atan2(dot(pr, up), dot(pr, right)) * D;                    // root x axis: + toward ... (sign checked below)
    r.pYaw = Math.atan2(dot(pf, right), dot(pf, fwd)) * D;
    // hip line yaw from the joints (sign-free check)
    const hl = sub(J(i, "rfemur"), J(i, "lfemur")), sl = sub(P[i].rclavicle.p, P[i].lclavicle.p);
    r.hipLineYaw = Math.atan2(-dot(hl, fwd), dot(hl, right)) * D;            // + = right hip back / left hip forward → turned... (rotation of line)
    r.shLineYaw = Math.atan2(-dot(sl, fwd), dot(sl, right)) * D;
    r.hipLineRoll = Math.atan2(dot(hl, up), dot(hl, right)) * D;             // + = right hip higher
    r.shLineRoll = Math.atan2(dot(sl, up), dot(sl, right)) * D;
    const neck = P[i].lowerneck.start, pel = P[i].root.p, head = P[i].head.p;
    const tv = sub(neck, pel); r.trunk = Math.atan2(dot(tv, fwd), dot(tv, up)) * D;   // + = forward lean
    const hv = sub(head, P[i].upperneck.start); r.headP = Math.atan2(dot(hv, fwd), dot(hv, up)) * D;
    r.headY = head[1]; r.neckY = neck[1];
    for (const s of ["l", "r"]) { const sh = P[i][s + "clavicle"].p, el = P[i][s + "humerus"].p, wr = P[i][s + "radius"].p;
      const ua = sub(el, sh), fa = sub(wr, el);
      r[s].shoulder = Math.atan2(dot(ua, fwd), -dot(ua, up)) * D;           // upper arm global sagittal (+ = elbow forward)
      r[s].elbow = ang(ua, fa); r[s].wristF = dot(sub(wr, pel), fwd); r[s].wristU = dot(sub(wr, pel), up); r[s].wristR = dot(sub(wr, pel), right);
      r[s].foreG = Math.atan2(dot(fa, fwd), -dot(fa, up)) * D; }
    rows.push(r);
  }
  // ground + contacts: per-foot lowest point; ground = 2nd percentile of all lows; stance when low < g + 2.5 cm AND the MTP moves < 1.2 m/s horizontally
  const gq = (s) => { const L = rows.map(r => r[s].low).sort((a, b) => a - b); return L[Math.floor(L.length * 0.03)]; }, gS = { l: gq("l"), r: gq("r") }, g = Math.min(gS.l, gS.r);
  for (const s of ["l", "r"]) for (let i = 0; i < n; i++) {
    const a = rows[Math.max(0, i - 1)][s], b = rows[Math.min(n - 1, i + 1)][s], dtt = (Math.min(n - 1, i + 1) - Math.max(0, i - 1)) / hz;
    const vA = Math.hypot(dot(sub(b.ankle, a.ankle), fwd), dot(sub(b.ankle, a.ankle), right)) / dtt, vM = Math.hypot(dot(sub(b.mtp, a.mtp), fwd), dot(sub(b.mtp, a.mtp), right)) / dtt;
    const c = rows[i][s]; c.vA = vA; c.vM = vM;
    c.st = (c.low < gS[s] + 0.03) && (Math.min(vA, vM) < 1.5);
  }
  for (const s of ["l", "r"]) {                                     // merge gaps of <= 3 frames; drop runs shorter than 6 frames
    const st = rows.map(r => r[s].st);
    for (let i = 1; i < n; i++) if (!st[i] && st[i - 1]) { let j = i; while (j < n && !st[j]) j++; if (j < n && j - i <= 3) for (let k = i; k < j; k++) st[k] = true; i = j; }
    for (let i = 0; i < n; i++) if (st[i]) { let j = i; while (j + 1 < n && st[j + 1]) j++; if (j - i + 1 < 6) for (let k = i; k <= j; k++) st[k] = false; i = j; }
    rows.forEach((r, i) => r[s].st = st[i]);
  }
  const speed = [], hzs = hz; for (let i = 0; i < n; i++) { const a = rows[Math.max(0, i - 6)].root, b = rows[Math.min(n - 1, i + 6)].root; speed.push(dot(sub(b, a), fwd) / ((Math.min(n - 1, i + 6) - Math.max(0, i - 6)) / hzs)); }
  rows.forEach((r, i) => r.v = speed[i]);
  return { S, rows, n, hz, g, fwd, subj, tr, legLen: (S.bones.lfemur.len + S.bones.ltibia.len) };
}
// events: touchdown = first stance frame of a run of >= 4; toe-off = last
function events(T, s) {
  const st = T.rows.map(r => r[s].st), ev = [];
  let i = 0; while (i < T.n) { if (st[i]) { let j = i; while (j + 1 < T.n && st[j + 1]) j++; if (j - i >= 5) ev.push({ td: i, to: j }); i = j + 1; } else i++; }
  return ev;
}
module.exports = { trial, events };
if (require.main === module) {
  const dir = process.argv[2];
  for (const id of process.argv.slice(3)) { const [subj, tr] = id.split("_"); const T = trial(dir, subj, tr);
    console.log(`${id}: legLen ${T.legLen.toFixed(3)} m, ground ${T.g.toFixed(3)}`);
    for (const s of ["l", "r"]) console.log("  " + s + ": " + events(T, s).map(e => `TD ${e.td} TO ${e.to} (${((e.to - e.td + 1) / T.hz * 1000).toFixed(0)} ms, v ${T.rows[e.td].v.toFixed(2)})`).join(" · "));
  }
}
