// run1/tools/ref/run1_curves.cjs — WAVEFORMS over one stride (right touchdown → right touchdown, % of stride): thigh angle, knee flexion, ankle
// height, COM height, upper-arm angle, for real strides and RUN-1.x versions at several speeds. The question it answers: do the curves change
// SHAPE with speed (a regime change) or only scale (one gait stretched)? Contact phases drawn as bars under each panel.
// usage: node run1_curves.cjs --cmu <dir> --out curves.png --cols ref:16_46:r:18:100,v11:3.0,v11:5.5,v11:7.8
const path = require("path"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg("out", "curves.png");
// reuse the regime tool's sources (it exports nothing; re-require its internals by loading the file as a module with a tiny shim)
const src = fs.readFileSync(path.join(__dirname, "run1_regime.cjs"), "utf8").replace(/^const cols = arg\("cols"[\s\S]*$/m, "module.exports = { refSource, run1Source, com };");
const Mod = require("module"), m = new Mod(path.join(__dirname, "run1_regime_lib.cjs"), module); m.filename = path.join(__dirname, "run1_regime_lib.cjs"); m.paths = Mod._nodeModulePaths(__dirname); m._compile(src, m.filename);
const { refSource, run1Source, com } = m.exports;
const D = 180 / Math.PI, sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
const cols = arg("cols", "").split(",").filter(Boolean).map(c => c.startsWith("ref:") ? refSource(c) : run1Source(c.split(":")[0], +c.split(":")[1]));
const COLS = ["#ffd45e", "#8fe388", "#5ee0ff", "#ff8a5e", "#c79bff", "#ff78c8", "#ffffff"];
const series = cols.map((S, j) => { const F = S.frames, n = F.length - 1, sag = (v) => Math.atan2(dot(v, S.fwd), -dot(v, S.up)) * D, uy = (p) => dot(p, S.up);
  const cy = F.map(f => uy(com(f.J))), cmean = cy.reduce((a, b) => a + b, 0) / cy.length;
  let iTO = 0; while (iTO + 1 < n && F[iTO + 1].stR) iTO++;
  const tr = F.map(f => Math.atan2(dot(sub(f.J.neck, f.J.pel), S.fwd), dot(sub(f.J.neck, f.J.pel), S.up)) * D);
  return { title: S.title, col: COLS[j % COLS.length], to: iTO / n, x: F.map((f, i) => i / n),
    thigh: F.map(f => sag(sub(f.J.R.knee, f.J.R.hip))), knee: F.map(f => Math.acos(Math.max(-1, Math.min(1, dot(sub(f.J.R.knee, f.J.R.hip), sub(f.J.R.ankle, f.J.R.knee)) / (len(sub(f.J.R.knee, f.J.R.hip)) * len(sub(f.J.R.ankle, f.J.R.knee)))))) * D),
    ankH: F.map(f => uy(f.J.R.ankle) * 100), com: cy.map(y => (y - cmean) * 100), arm: F.map((f, i) => sag(sub(f.J.R.el, f.J.R.sh)) + tr[i]) }; });
const PAN = [["thigh", "thigh angle (° from vertical, + forward)", -40, 70], ["knee", "knee flexion (°)", 0, 140], ["ankH", "right ankle height (cm)", 0, 60], ["com", "COM height − mean (cm)", -6, 6], ["arm", "upper arm vs trunk (° + forward)", -65, 40]];
const PW = 560, PH = 230, L = 60, T = 40;
const W = L + PW + 240, H = T + PAN.length * (PH + 40) + 20;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#101412"/>`;
PAN.forEach(([k, title, lo, hi], pi) => { const y0 = T + pi * (PH + 40), X = (x) => L + x * PW, Y = (v) => y0 + PH - (v - lo) / (hi - lo) * PH;
  svg += `<text x="${L}" y="${y0 - 8}" fill="#ddd" font-size="13" font-family="Helvetica">${title}</text><rect x="${L}" y="${y0}" width="${PW}" height="${PH}" fill="#161c19" stroke="#2a3330"/>`;
  for (let g = 0; g <= 10; g++) svg += `<line x1="${X(g / 10)}" y1="${y0}" x2="${X(g / 10)}" y2="${y0 + PH}" stroke="#222b27"/>` + (pi === PAN.length - 1 ? `<text x="${X(g / 10)}" y="${y0 + PH + 14}" fill="#8fa49a" font-size="10" font-family="Menlo" text-anchor="middle">${g * 10}%</text>` : "");
  for (let v = Math.ceil(lo / 20) * 20; v <= hi; v += 20) svg += `<text x="${L - 6}" y="${Y(v) + 4}" fill="#8fa49a" font-size="10" font-family="Menlo" text-anchor="end">${v}</text>`;
  series.forEach((s, j) => { svg += `<polyline points="${s.x.map((x, i) => X(x).toFixed(1) + "," + Y(s[k][i]).toFixed(1)).join(" ")}" fill="none" stroke="${s.col}" stroke-width="${s.title.startsWith("REAL") ? 3 : 2}" stroke-opacity="0.9"/>`;
    svg += `<rect x="${X(0)}" y="${y0 + PH - 4 - j * 5}" width="${s.to * PW}" height="3" fill="${s.col}" opacity="0.8"/>`; }); });
series.forEach((s, j) => { svg += `<rect x="${L + PW + 20}" y="${T + j * 22}" width="14" height="14" fill="${s.col}"/><text x="${L + PW + 40}" y="${T + j * 22 + 12}" fill="#ccc" font-size="13" font-family="Helvetica">${s.title} m/s</text>`; });
svg += `<text x="${L + PW + 20}" y="${T + series.length * 22 + 20}" fill="#8fa49a" font-size="11" font-family="Helvetica">bars at each panel bottom = right-foot contact</text></svg>`;
(async () => { if (process.env.PUPPETEER_NODE_MODULES) module.paths.unshift(process.env.PUPPETEER_NODE_MODULES); const puppeteer = require("puppeteer-core");
  const b = await puppeteer.launch({ userDataDir: process.env.RUN1_PROFILE || undefined, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const pg = await b.newPage(); await pg.setViewport({ width: W, height: H, deviceScaleFactor: 1.4 });
  await pg.setContent(`<html><body style="margin:0;background:#101412">${svg}</body></html>`); await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } }); await b.close(); console.log("wrote", out); })();
