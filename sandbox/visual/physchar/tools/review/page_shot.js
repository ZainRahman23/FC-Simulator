const puppeteer = require(process.env.PUPPETEER_NODE_MODULES + "/puppeteer");
(async () => { const b = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1600, height: 1000 }); const errs = []; p.on("pageerror", e => errs.push(String(e)));
    await p.goto(process.argv[2], { waitUntil: "networkidle0" }); for (let i = 0; i < 600; i++) { const s = await p.evaluate(() => window.GATEA_READY ? 1 : window.GATEA_ERROR ? 2 : 0); if (s) break; await new Promise(r => setTimeout(r, 100)); }
    await p.evaluate((t) => window.GATEA_SET({ t: +t }), process.argv[4] || "0.25"); await new Promise(r => setTimeout(r, 400));
    await p.screenshot({ path: process.argv[3], fullPage: false }); console.log("ok", errs.length ? errs : "no page errors"); } finally { await b.close(); } })();
