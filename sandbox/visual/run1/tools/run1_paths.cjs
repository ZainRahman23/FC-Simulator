// run1/tools/run1_paths.cjs — motion-path diagnostic: one stride of key points (ankle, toe tip, knee, wrist, head) RELATIVE TO THE PELVIS,
// side view (z forward / y up) and front view (x right / y up), RUN-1 vs Locomotion V1 (V1.3), written as an SVG (render with any browser).
// The shapes are what reads as "human" vs "pendulum" at a glance: the swing ankle's egg-shaped loop, the knee drive, the hand ellipse.
// usage: node run1_paths.cjs --v 5.5 --out paths.svg
const { loadRun1 } = require("./run1_load.cjs"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), skel = X.charSkel("vinicius"), B = skel.byName, v = +arg("v", 5.5);
const PTS = { ankle_R: ["joint", "foot_R"], toe_R: ["tip", "toe_R"], knee_R: ["joint", "shin_R"], wrist_R: ["joint", "hand_R"], head: ["tip", "head"] };
const COL = { ankle_R: "#3fb950", toe_R: "#a5d6a7", knee_R: "#58a6ff", wrist_R: "#f778ba", head: "#e3b341" };
// a pelvis-relative frame from a world fk: subtract the pelvis joint; world → character axes for heading 0 (x = pitch x forward, GL z = −pitch y)
function rel(fk, kind, name) { const p = fk[kind][B[name].idx], o = fk.joint[B.pelvis.idx]; return { fwd: p[0] - o[0], up: p[1] - o[1], right: -(p[2] - o[2]) }; }
function run1Series() {
  const A = X.r1Make(skel), G = X.r1Prepare(A, v), T = G.p.T, out = []; const vOf = () => v;
  for (let i = 0; i <= 120; i++) { const t = 2 + i / 120 * T, restore = X.r1Replay(A, vOf, null, t), ev = X.r1Evaluate(A, { x: 20 + v * t, y: 34, heading: 0, v }); restore();
    const row = {}; for (const k in PTS) row[k] = rel(ev.fk, PTS[k][0], PTS[k][1]); out.push(row); }
  return { rows: out, T };
}
function v1Series(T) {
  X.setCont(false); const a = X.ofActorMake(skel, 0, 0, 0); a.motion = "LOCO"; a.loco = X.ofLocoMake(); a.state = { feet: {} }; const out = [];
  for (let k = -60; k <= 240; k++) { const t = k / 60; a.x = 20 + v * t; a.y = 34; a.facing = 0; a.speed = v; a.sim = { x: a.x, y: a.y, vx: v, vy: 0, facing: 0 }; X.ofActorTick(a, 1 / 60, t + 10);
    if (t >= 2 && t <= 2 + Math.max(T, 0.7)) { const fk = { joint: a.sol.fk.joint.map(p => Array.from(p)), tip: a.sol.fk.tip.map(p => Array.from(p)) }; const row = {}; for (const kk in PTS) row[kk] = rel(fk, PTS[kk][0], PTS[kk][1]); out.push(row); } }
  return out;
}
const R1 = run1Series(), V1 = v1Series(R1.T);
const W = 1100, H = 520, S = 200;                          // px per metre
function panel(rows, ox, oy, axisX, title) {
  let g = `<text x="${ox - 120}" y="${oy - 205}" fill="#ddd" font-size="15" font-family="Helvetica">${title}</text>`;
  g += `<line x1="${ox - 160}" y1="${oy}" x2="${ox + 160}" y2="${oy}" stroke="#333"/><line x1="${ox}" y1="${oy - 200}" x2="${ox}" y2="${oy + 290}" stroke="#333"/><circle cx="${ox}" cy="${oy}" r="4" fill="#fff"/>`;
  for (const k in PTS) { const pts = rows.map(r => `${(ox + r[k][axisX] * S).toFixed(1)},${(oy - r[k].up * S).toFixed(1)}`).join(" "); g += `<polyline points="${pts}" fill="none" stroke="${COL[k]}" stroke-width="2" stroke-opacity="0.9"/>`; }
  return g;
}
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 80}" style="background:#111"><rect width="100%" height="100%" fill="#111"/>`;
svg += panel(R1.rows, 170, 230, "fwd", "RUN-1 · side (forward →)") + panel(V1, 450, 230, "fwd", "V1 · side (forward →)") + panel(R1.rows, 730, 230, "right", "RUN-1 · front (right →)") + panel(V1, 960, 230, "right", "V1 · front (right →)");
let lx = 30; for (const k in PTS) { svg += `<rect x="${lx}" y="${H + 40}" width="14" height="14" fill="${COL[k]}"/><text x="${lx + 20}" y="${H + 52}" fill="#ccc" font-size="13" font-family="Helvetica">${k}</text>`; lx += 120; }
svg += `<text x="${lx + 20}" y="${H + 52}" fill="#888" font-size="12" font-family="Helvetica">relative to the pelvis joint, one stride at ${v} m/s; white dot = pelvis; 1 m = ${S} px</text></svg>`;
fs.writeFileSync(arg("out", "paths.svg"), svg); console.log("wrote", arg("out", "paths.svg"), R1.rows.length, V1.length);
