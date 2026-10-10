// run1/tools/ref/run1_strobe.cjs — CHRONOPHOTOGRAPH (Marey-style): side-view stick figures every 1/40 s over ~1.5 strides at TRUE world scale,
// with the continuous hip-centre and head paths and the ground contacts. Shows rhythm in a still: how far the body sinks into each stance,
// how it is launched into flight, how the limbs accelerate and brake (the figure spacing is constant — the root speed is constant — so any
// change in limb spacing is the limb's own motion). Rows: real strides (CMU) and RUN-1.0 / RUN-1.1.
// usage: node run1_strobe.cjs --cmu <dir> --out strobe.png --rows ref:16_46:r:18,orig:5.5,new:5.5 [--dt 0.025] [--dur 1.0]
const { trial } = require("./cmu_trial.cjs"), { parseASF, parseAMC, fk } = require("./cmu_amc.cjs"), { loadRun1 } = require("../run1_load.cjs");
const path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg("cmu", process.env.RUN1_CMU_DIR), out = arg("out", "strobe.png"), DT = +arg("dt", 0.025), DUR = +arg("dur", 0.95);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
// frames: [{ t, J: {hip, head, neck, S:{hip,knee,ankle,mtp,tip,sh,el,wr}, O:{…}}, stS, stO }] in (forward, up) metres
function refRow(spec) {
  const [, id, sd, a] = spec.split(":"), [subj, tr] = id.split("_"), T = trial(dir, subj, tr), S = parseASF(path.join(dir, subj + ".asf")), AM = parseAMC(path.join(dir, `${subj}_${tr}.amc`));
  const s = sd, o = s === "r" ? "l" : "r", fwd = T.fwd, up = [0, 1, 0], sc = 0.834 / T.legLen, i0 = +a, P0 = fk(S, AM[i0]), x0 = dot(mid(P0.lfemur.start, P0.rfemur.start), fwd);
  const fr = []; for (let t = 0; t <= DUR + 1e-9; t += DT) { const i = Math.min(T.n - 1, Math.round(i0 + t * T.hz)), P = fk(S, AM[i]);
    const q = (p) => [(dot(p, fwd) - x0) * sc, (dot(p, up) - T.g) * sc], L = (c) => ({ hip: q(P[c + "femur"].start), knee: q(P[c + "tibia"].start), ankle: q(P[c + "foot"].start), mtp: q(P[c + "toes"].start), tip: q(P[c + "toes"].p), sh: q(P[c + "clavicle"].p), el: q(P[c + "humerus"].p), wr: q(P[c + "radius"].p) });
    const Sd = L(s), Od = L(o); fr.push({ t, J: { hip: [(Sd.hip[0] + Od.hip[0]) / 2, (Sd.hip[1] + Od.hip[1]) / 2], neck: q(P.lowerneck.start), head: q(P.head.p), spine: [q(P.lowerback.p), q(P.thorax.p)], S: Sd, O: Od }, stS: T.rows[i][s].st, stO: T.rows[i][o].st }); }
  const v = T.rows.slice(i0, Math.min(T.n - 1, i0 + Math.round(DUR * T.hz))).reduce((q, r) => q + r.v, 0) / Math.round(DUR * T.hz);
  return { title: `REAL · CMU ${id} · ${v.toFixed(1)} m/s`, col: "#ffd45e", fr };
}
let X = null;
function run1Row(which, v) {
  X = X || loadRun1(); const E = which === "orig" ? X.RUN1_ORIG : which === "v11" ? X.RUN1_V11 : X, sk = Object.assign({}, X.charSkel("vinicius")); delete sk._r1body; const B = sk.byName, A = E.r1Make(sk), t0 = 2.0, fr = [];
  for (let t = 0; t <= DUR + 1e-9; t += DT) { const tt = t0 + t, rs = E.r1Replay(A, () => v, null, tt), ev = E.r1Evaluate(A, { x: v * tt, y: 0, heading: 0, v }); const legs = A.pose.legs; rs();
    const f = ev.fk, q = (p) => [p[0] - v * t0, p[1]], P = (n) => q(f.joint[B[n].idx]), tip = (n) => q(f.tip[B[n].idx]);
    const L = (sd) => ({ hip: P("thigh_" + sd), knee: P("shin_" + sd), ankle: P("foot_" + sd), mtp: P("toe_" + sd), tip: tip("toe_" + sd), sh: P("upperArm_" + sd), el: P("foreArm_" + sd), wr: P("hand_" + sd) });
    const Sd = L("R"), Od = L("L"); fr.push({ t, J: { hip: [(Sd.hip[0] + Od.hip[0]) / 2, (Sd.hip[1] + Od.hip[1]) / 2], neck: P("neck"), head: tip("head"), spine: [P("spine"), P("chest")], S: Sd, O: Od }, stS: legs.R.st, stO: legs.L.st }); }
  return { title: `${which === "orig" ? "RUN-1.0 original" : which === "v11" ? "RUN-1.1" : "RUN-1.2 new"} · ${v} m/s`, col: which === "orig" ? "#c79bff" : which === "v11" ? "#8fe388" : "#5ee0ff", fr };
}
const rows = arg("rows", "").split(",").filter(Boolean).map(r => r.startsWith("ref:") ? refRow(r) : run1Row(r.split(":")[0], +r.split(":")[1]));
const S = 230, RH = 2.15 * S * 0.9, left = 30;
const maxX = Math.max(...rows.map(r => Math.max(...r.fr.map(f => Math.max(f.J.S.tip[0], f.J.O.tip[0], f.J.head[0])))));
const minX = Math.min(...rows.map(r => Math.min(...r.fr.map(f => Math.min(f.J.S.tip[0], f.J.O.tip[0], f.J.S.wr[0], f.J.O.wr[0])))));
const W = Math.round((maxX - minX) * S + 2 * left), H = Math.round(rows.length * RH + 30);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#101412"/>`;
rows.forEach((r, j) => {
  const gy = j * RH + RH - 16, X0 = left - minX * S, P = (p) => [X0 + p[0] * S, gy - p[1] * S], pl = (pts, col, w, op) => { svg += `<polyline points="${pts.map(P).map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  svg += `<text x="${left}" y="${j * RH + 22}" fill="${r.col}" font-size="15" font-weight="600" font-family="Helvetica">${r.title}</text><line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="#3a5a3f" stroke-width="1.5"/>`;
  r.fr.forEach((f, i) => { const J = f.J, op = 0.55;
    pl([J.O.hip, J.O.knee, J.O.ankle, J.O.mtp, J.O.tip], "#ff78c8", 1.3, op * 0.8); pl([J.O.sh, J.O.el, J.O.wr], "#ff78c8", 1.1, op * 0.7);
    pl([J.hip, J.spine[0], J.spine[1], J.neck, J.head], "#e6efe9", 1.6, op); pl([J.S.hip, J.S.knee, J.S.ankle, J.S.mtp, J.S.tip], "#78ffa0", 1.5, op); pl([J.S.sh, J.S.el, J.S.wr], "#78ffa0", 1.2, op * 0.8);
    for (const [st, L, c] of [[f.stS, J.S, "#78ffa0"], [f.stO, J.O, "#ff78c8"]]) if (st) { const a = P(L.mtp); svg += `<rect x="${(a[0] - 3).toFixed(1)}" y="${(gy + 3).toFixed(1)}" width="6" height="5" fill="${c}"/>`; } });
  pl(r.fr.map(f => f.J.hip), "#ffd45e", 2.4, 0.95); pl(r.fr.map(f => f.J.head), "#ffffff", 2.0, 0.9);
});
svg += `<text x="${left}" y="${H - 8}" fill="#8fa49a" font-size="11" font-family="Helvetica">figures every ${(DT * 1000).toFixed(0)} ms at true scale; yellow = hip-centre path, white = head path; squares under the turf line = foot on the ground (green right, pink left). Real: CMU mocap (mocap.cs.cmu.edu), scaled to a 0.834 m leg.</text></svg>`;
(async () => { if (process.env.PUPPETEER_NODE_MODULES) module.paths.unshift(process.env.PUPPETEER_NODE_MODULES); const puppeteer = require("puppeteer-core");
  const b = await puppeteer.launch({ userDataDir: process.env.RUN1_PROFILE || undefined, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const pg = await b.newPage(); await pg.setViewport({ width: W, height: H, deviceScaleFactor: 1.25 });
  await pg.setContent(`<html><body style="margin:0;background:#101412">${svg}</body></html>`); await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } }); await b.close(); console.log("wrote", out, W, H); })();
