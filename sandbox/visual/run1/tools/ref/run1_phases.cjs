// run1/tools/ref/run1_phases.cjs — PHASE SHEET: stick figures of real running (CMU mocap strides) beside RUN-1.0 (original, frozen) and
// RUN-1.1 (current) at the 8 stride events: touchdown, max loading (peak stance knee), mid-stance (50 % of stance), late stance (80 %),
// toe-off, early flight (midway to the other foot's touchdown), max recovery (peak swing knee), late swing (95 % of the stride).
// Reference skeletons are scaled to Vinícius's leg (0.834 m). The sheet compares RELATIONSHIPS between body parts at matched events.
// usage: node run1_phases.cjs --cmu <dir with the CMU .asf/.amc> --out sheet.png --cols ref:16_46:r:18:100,orig:4.0,new:4.0 [--view side|front]
// env: PUPPETEER_NODE_MODULES, RUN1_PROFILE (as run1_capture.cjs). CMU data: mocap.cs.cmu.edu (NSF EIA-0196217); never copied into the repo.
const { trial } = require("./cmu_trial.cjs"), { parseASF, parseAMC, fk } = require("./cmu_amc.cjs"), { loadRun1 } = require("../run1_load.cjs");
const path = require("path"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg("cmu", process.env.RUN1_CMU_DIR), out = arg("out", "phases.png"), view = arg("view", "side");
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const PH = ["touchdown", "max loading", "mid-stance", "late stance", "toe-off", "early flight", "max recovery", "late swing"];
function refColumn(spec) {
  const [, id, sd, a, b] = spec.split(":"), [subj, tr] = id.split("_"), T = trial(dir, subj, tr), S = parseASF(path.join(dir, subj + ".asf")), AM = parseAMC(path.join(dir, `${subj}_${tr}.amc`));
  const s = sd, o = s === "r" ? "l" : "r", i0 = +a, i1 = +b, n = i1 - i0;
  const st = T.rows.map(r => r[s].st); let to = i0; while (to + 1 < i1 && st[to + 1]) to++;
  const sto = T.rows.map(r => r[o].st); let otd = i0 + 1; while (otd < i1 && !sto[otd]) otd++;
  const knee = (i) => T.rows[i][s].knee3;
  let kL = i0; for (let i = i0; i <= to; i++) if (knee(i) > knee(kL)) kL = i;
  let kS = to; for (let i = to; i < i1; i++) if (knee(i) > knee(kS)) kS = i;
  const ev = [i0, kL, Math.round(i0 + (to - i0) * 0.5), Math.round(i0 + (to - i0) * 0.8), to, Math.round((to + otd) / 2), kS, Math.round(i1 - 0.05 * n)];
  const up = [0, 1, 0], fwd = T.fwd, right = [fwd[1] * up[2] - fwd[2] * up[1], fwd[2] * up[0] - fwd[0] * up[2], fwd[0] * up[1] - fwd[1] * up[0]];
  const J = (fr) => { const P = fk(S, fr), L = (c) => ({ hip: P[c + "femur"].start, knee: P[c + "tibia"].start, ankle: P[c + "foot"].start, mtp: P[c + "toes"].start, tip: P[c + "toes"].p, sh: P[c + "clavicle"].p, el: P[c + "humerus"].p, wr: P[c + "radius"].p, hd: P[c + "hand"].p });
    const Sd = L(s), Od = L(o);
    return { pel: mid(Sd.hip, Od.hip), spine: [mid(Sd.hip, Od.hip), P.lowerback.p, P.upperback.p, P.thorax.p, P.lowerneck.p, P.upperneck.p, P.head.p], clav: P.lowerneck.start, S: Sd, O: Od, ground: T.g }; };
  const v = T.rows.slice(i0, i1).reduce((q, r) => q + r.v, 0) / n;
  return { title: `REAL · CMU ${id} ${sd.toUpperCase()} · ${v.toFixed(1)} m/s`, ref: true, frames: ev.map(i => J(AM[i])), fwd, up, right: s === "l" ? sub([0, 0, 0], right) : right, scale: 0.834 / T.legLen, pct: ev.map(i => ((i - i0) / n * 100).toFixed(0) + "%") };
}
let X = null;
function run1Column(which, v) {
  X = X || loadRun1(); const E = which === "orig" ? X.RUN1_ORIG : which === "v11" ? X.RUN1_V11 : X, skel0 = X.charSkel("vinicius"), skel = Object.assign({}, skel0); delete skel._r1body;
  const B = skel.byName, A = E.r1Make(skel), G = E.r1Prepare(A, v), p = G.p;
  const kneeAt = (u) => E.r1Pose(G, u).legs.R.ch.k;
  let kL = 0; for (let i = 0; i <= 100; i++) { const u = p.D * i / 100; if (kneeAt(u) > kneeAt(kL)) kL = u; }
  let kS = p.D; for (let i = 0; i <= 200; i++) { const u = p.D + (1 - p.D) * i / 200; if (kneeAt(u) > kneeAt(kS)) kS = u; }
  const ev = [0, kL, p.D * 0.5, p.D * 0.8, p.D, (p.D + 0.5) / 2, kS, 0.95];
  const J = (u) => { const pose = E.r1Pose(G, u % 1), f = E.r1FK(G, pose, null), P = (n) => f.P[B[n].idx], tip = (n) => X.RV.add(f.P[B[n].idx], X.R3.v(f.R[B[n].idx], X.RV.sc(B[n].dir, B[n].len)));
    const ttip = (sd) => X.RV.add(f.P[B["toe_" + sd].idx], X.R3.v(f.R[B["toe_" + sd].idx], [0, -0.031, G.body.tipZ - G.body.mtp[2]]));
    const L = (sd) => ({ hip: P("thigh_" + sd), knee: P("shin_" + sd), ankle: P("foot_" + sd), mtp: P("toe_" + sd), tip: ttip(sd), sh: P("upperArm_" + sd), el: P("foreArm_" + sd), wr: P("hand_" + sd), hd: tip("hand_" + sd) });
    const R = L("R"), Lf = L("L");
    return { pel: mid(R.hip, Lf.hip), spine: [mid(R.hip, Lf.hip), P("spine"), P("chest"), P("neck"), P("head"), tip("head")], clav: P("neck"), S: R, O: Lf, ground: 0 }; };
  return { title: `${which === "orig" ? "RUN-1.0 original" : which === "v11" ? "RUN-1.1" : "RUN-1.2 new"} · ${v} m/s`, ref: false, orig: which === "orig", v11: which === "v11", frames: ev.map(J), fwd: [0, 0, 1], up: [0, 1, 0], right: [1, 0, 0], scale: 1, pct: ev.map(u => (u * 100).toFixed(0) + "%") };
}
const cols = arg("cols", "").split(",").filter(Boolean).map(c => c.startsWith("ref:") ? refColumn(c) : run1Column(c.split(":")[0], +c.split(":")[1]));
const CW = 200, CH = 222, S = 108, top = 46, left = 104;
const W = left + CW * cols.length + 10, H = top + CH * PH.length + 34;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#101412"/>`;
cols.forEach((c, j) => { svg += `<text x="${left + j * CW + CW / 2}" y="24" fill="${c.ref ? "#ffd45e" : c.orig ? "#c79bff" : c.v11 ? "#8fe388" : "#5ee0ff"}" font-size="12" font-weight="600" font-family="Helvetica" text-anchor="middle">${c.title}</text>`; });
PH.forEach((ph, i) => { svg += `<text x="8" y="${top + i * CH + CH / 2}" fill="#ddd" font-size="13" font-family="Helvetica">${i + 1}. ${ph}</text>`; });
cols.forEach((c, j) => c.frames.forEach((J, i) => {
  const ox = left + j * CW + CW / 2, gy = top + i * CH + CH - 18, k = c.scale * S;
  const P = (q) => { const d = sub(q, J.pel), hx = view === "front" ? dot(d, c.right) : dot(d, c.fwd), gU = dot(q, c.up) - J.ground; return [ox + hx * k, gy - gU * k]; };
  const line = (pts, col, w) => { svg += `<polyline points="${pts.map(P).map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  svg += `<rect x="${left + j * CW + 4}" y="${top + i * CH + 4}" width="${CW - 8}" height="${CH - 8}" fill="#161c19" rx="4"/><line x1="${left + j * CW + 10}" y1="${gy}" x2="${left + j * CW + CW - 10}" y2="${gy}" stroke="#3a5a3f" stroke-width="1.5"/>`;
  const pp = P(J.pel); svg += `<line x1="${pp[0]}" y1="${gy}" x2="${pp[0]}" y2="${top + i * CH + 10}" stroke="#2a3330" stroke-dasharray="3,3"/>`;
  const far = view === "front" ? null : null;
  line([J.O.hip, J.O.knee, J.O.ankle, J.O.mtp, J.O.tip], "#ff78c8", 3); line([J.O.sh, J.O.el, J.O.wr, J.O.hd], "#ff78c8", 2.4);
  line([J.O.hip, J.S.hip], "#aaa", 2); line(J.spine, "#e6efe9", 3.2); line([J.clav, J.S.sh], "#aaa", 2); line([J.clav, J.O.sh], "#aaa", 2);
  line([J.S.hip, J.S.knee, J.S.ankle, J.S.mtp, J.S.tip], "#78ffa0", 3.6); line([J.S.sh, J.S.el, J.S.wr, J.S.hd], "#78ffa0", 2.6);
  const hp = P(J.spine[J.spine.length - 1]); svg += `<circle cx="${hp[0]}" cy="${hp[1]}" r="${(0.1 * k).toFixed(1)}" fill="none" stroke="#e6efe9" stroke-width="2"/>`;
  svg += `<text x="${left + j * CW + 10}" y="${top + i * CH + 18}" fill="#8fa49a" font-size="10" font-family="Menlo">${c.pct[i]}  hip h ${((dot(J.pel, c.up) - J.ground) * c.scale).toFixed(3)} m</text>`;
}));
svg += `<text x="8" y="${H - 12}" fill="#8fa49a" font-size="11" font-family="Helvetica">${view === "front" ? "Front view (the runner's right →)" : "Side view, forward →"}. Green = the event (right) leg and right arm; pink = left. REAL = CMU Graphics Lab mocap (mocap.cs.cmu.edu, NSF EIA-0196217), scaled to Vinícius's 0.834 m leg; left strides mirrored. Hip-centred, ground at true height.</text></svg>`;
if (arg("svg")) fs.writeFileSync(arg("svg"), svg);
(async () => { if (process.env.PUPPETEER_NODE_MODULES) module.paths.unshift(process.env.PUPPETEER_NODE_MODULES); const puppeteer = require("puppeteer-core");
  const b = await puppeteer.launch({ userDataDir: process.env.RUN1_PROFILE || undefined, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const pg = await b.newPage(); await pg.setViewport({ width: W, height: H, deviceScaleFactor: +arg("dpr", 1.5) });
  await pg.setContent(`<html><body style="margin:0;background:#101412">${svg}</body></html>`); await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } }); await b.close(); console.log("wrote", out); })();
