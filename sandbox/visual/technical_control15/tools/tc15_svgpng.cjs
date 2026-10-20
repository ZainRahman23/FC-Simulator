// technical_control15/tools/tc15_svgpng.cjs — an SVG rendered to PNG in headless Chrome (the diagrams, for review strips).  node tc15_svgpng.cjs in.svg out.png [--profile dir]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => { const svg = fs.readFileSync(process.argv[2], "utf8"), m = /width="(\d+)" height="(\d+)"/.exec(svg), w = +m[1], h = +m[2];
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined) });
  try { const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 }); await p.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`); await p.screenshot({ path: process.argv[3], clip: { x: 0, y: 0, width: w, height: h } }); } finally { await b.close(); } console.log("ok", process.argv[3]); })().catch((e) => { console.error(e.message); process.exit(1); });
