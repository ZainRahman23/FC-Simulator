// run1/tools/ref/run1_refpaths.cjs — MOTION PATHS, side view, relative to the hip centre: one stride of the event-side ankle, toe tip, knee and
// wrist for real running (CMU strides) and RUN-1.0 / RUN-1.1, with a time tick every 5 % of the stride (the spacing shows WHERE the limb is
// fast or slow: a driven recovery accelerates and brakes, a procedural loop travels at an even pace). Stance portion drawn thicker.
// usage: node run1_refpaths.cjs --cmu <dir> --out paths.png --cols ref:16_46:r:18:100,orig:5.5,new:5.5
const { trial } = require("./cmu_trial.cjs"), { parseASF, parseAMC, fk } = require("./cmu_amc.cjs"), { loadRun1 } = require("../run1_load.cjs");
const path = require("path"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg("cmu", process.env.RUN1_CMU_DIR), out = arg("out", "paths.png");
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const N = 100, PTS = { ankle: "#3fb950", tip: "#a5d6a7", knee: "#58a6ff", wrist: "#f778ba" };
function refCol(spec) {
  const [, id, sd, a, b] = spec.split(":"), [subj, tr] = id.split("_"), T = trial(dir, subj, tr), S = parseASF(path.join(dir, subj + ".asf")), AM = parseAMC(path.join(dir, `${subj}_${tr}.amc`));
  const s = sd, o = s === "r" ? "l" : "r", fwd = T.fwd, up = [0, 1, 0], sc = 0.834 / T.legLen, i0 = +a, i1 = +b;
  const st = T.rows.map(r => r[s].st); let to = i0; while (to + 1 < i1 && st[to + 1]) to++;
  const rows = []; for (let k = 0; k <= N; k++) { const x = i0 + (i1 - i0) * k / N, i = Math.min(i1, Math.round(x)), P = fk(S, AM[i]), hc = mid(P.lfemur.start, P.rfemur.start);
    const q = { ankle: P[s + "foot"].start, tip: P[s + "toes"].p, knee: P[s + "tibia"].start, wrist: P[s + "radius"].p }, r = {};
    for (const k2 in q) { const d = sub(q[k2], hc); r[k2] = [dot(d, fwd) * sc, dot(d, up) * sc]; } rows.push(r); }
  const v = T.rows.slice(i0, i1).reduce((q, r) => q + r.v, 0) / (i1 - i0);
  return { title: `REAL CMU ${id}${sd} ${v.toFixed(1)} m/s`, rows, D: (to - i0) / (i1 - i0), col: "#ffd45e" };
}
let X = null;
function run1Col(which, v) {
  X = X || loadRun1(); const E = which === "orig" ? X.RUN1_ORIG : which === "v11" ? X.RUN1_V11 : which === "v12" ? X.RUN1_V12 : X, sk = Object.assign({}, X.charSkel("vinicius")); delete sk._r1body;
  const B = sk.byName, A = E.r1Make(sk), G = E.r1Prepare(A, v), rows = [];
  for (let k = 0; k <= N; k++) { const f = E.r1FK(G, E.r1Pose(G, (k / N) % 1), null), P = (n) => f.P[B[n].idx], hc = mid(P("thigh_R"), P("thigh_L"));
    const tip = X.RV.add(f.P[B.toe_R.idx], X.R3.v(f.R[B.toe_R.idx], [0, -0.031, G.body.tipZ - G.body.mtp[2]]));
    const q = { ankle: P("foot_R"), tip, knee: P("shin_R"), wrist: P("hand_R") }, r = {}; for (const k2 in q) { const d = sub(q[k2], hc); r[k2] = [d[2], d[1]]; } rows.push(r); }
  return { title: `${which === "orig" ? "RUN-1.0" : which === "v11" ? "RUN-1.1" : which === "v12" ? "RUN-1.2" : X.RUN1.id} ${v} m/s`, rows, D: G.p.D, col: which === "orig" ? "#c79bff" : which === "v11" ? "#8fe388" : which === "v12" ? "#ffd45e" : "#5ee0ff" };
}
const cols = arg("cols", "").split(",").filter(Boolean).map(c => c.startsWith("ref:") ? refCol(c) : run1Col(c.split(":")[0], +c.split(":")[1]));
const CW = 330, H = 560, S = 260, oy = 150;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW * cols.length + 20}" height="${H + 40}"><rect width="100%" height="100%" fill="#101412"/>`;
cols.forEach((c, j) => { const ox = 20 + j * CW + CW * 0.5;
  svg += `<text x="${ox}" y="24" fill="${c.col}" font-size="13" font-weight="600" font-family="Helvetica" text-anchor="middle">${c.title}</text>`;
  svg += `<circle cx="${ox}" cy="${oy}" r="4" fill="#fff"/><line x1="${ox - 150}" y1="${oy}" x2="${ox + 150}" y2="${oy}" stroke="#2a3330"/><line x1="${ox}" y1="${oy - 120}" x2="${ox}" y2="${oy + 420}" stroke="#2a3330"/>`;
  for (const k in PTS) { const P = c.rows.map(r => [ox + r[k][0] * S, oy - r[k][1] * S]), iTO = Math.round(c.D * N);
    svg += `<polyline points="${P.slice(iTO).map(p => p.map(x => x.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${PTS[k]}" stroke-width="1.6"/>`;
    svg += `<polyline points="${P.slice(0, iTO + 1).map(p => p.map(x => x.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${PTS[k]}" stroke-width="4" stroke-opacity="0.8"/>`;
    for (let i = 0; i < N; i += 5) svg += `<circle cx="${P[i][0].toFixed(1)}" cy="${P[i][1].toFixed(1)}" r="${i === 0 ? 4.5 : 2.2}" fill="${i === 0 ? "#fff" : PTS[k]}"/>`; } });
let lx = 20; for (const k in PTS) { svg += `<rect x="${lx}" y="${H + 12}" width="12" height="12" fill="${PTS[k]}"/><text x="${lx + 18}" y="${H + 23}" fill="#ccc" font-size="12" font-family="Helvetica">${k}</text>`; lx += 90; }
svg += `<text x="${lx + 10}" y="${H + 23}" fill="#8fa49a" font-size="11" font-family="Helvetica">relative to the hip centre (white dot), forward →; thick = stance; dots every 5 % of the stride, white = touchdown; real scaled to a 0.834 m leg</text></svg>`;
(async () => { if (process.env.PUPPETEER_NODE_MODULES) module.paths.unshift(process.env.PUPPETEER_NODE_MODULES); const puppeteer = require("puppeteer-core");
  const b = await puppeteer.launch({ userDataDir: process.env.RUN1_PROFILE || undefined, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const pg = await b.newPage(); const W = CW * cols.length + 20; await pg.setViewport({ width: W, height: H + 40, deviceScaleFactor: 1.5 });
  await pg.setContent(`<html><body style="margin:0;background:#101412">${svg}</body></html>`); await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H + 40 } }); await b.close(); console.log("wrote", out); })();
