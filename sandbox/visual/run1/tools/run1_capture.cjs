// run1/tools/run1_capture.cjs — deterministic captures of the RUN-1 viewer (headless Chrome via puppeteer-core; GPU path).
// usage: PUPPETEER_NODE_MODULES=<dir> node run1_capture.cjs --out <dir> [--port 8317] [--q "cmp=both&zoom=2.5"] [--times 0.5,0.6] [--strip t0:dt:n]
//        [--clip game|A|B|all] [--w 1500 --h 1100]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const out = arg("out", "."), port = arg("port", "8317"), q = arg("q", ""), W = +arg("w", 1500), H = +arg("h", 1150);
  fs.mkdirSync(out, { recursive: true });
  const browser = await puppeteer.launch({ userDataDir: process.env.RUN1_PROFILE || undefined, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new",
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--enable-unsafe-swiftshader", "--window-size=" + W + "," + H] });
  const page = await browser.newPage(); await page.setViewport({ width: W, height: H, deviceScaleFactor: +arg("dpr", 2) });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  await page.goto(`http://127.0.0.1:${port}/sandbox/visual/run1.html?external=1&paused=1&${q}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.RUN1V && window.RUN1V.state.ready, { timeout: 30000 }).catch(() => {});
  if (!arg("liveLayout")) await page.evaluate(() => { const W = Math.min(window.innerWidth - 8, 1500), topH = Math.round(W * 9 / 16 * 0.78), botH = Math.round(W / 2 * 0.62);   // the capture framing (stable across layout changes)
    window.RUN1V.state.fixedLayout = { W, H: topH + botH + 4, views: [{ id: "game", x: 0, y: 0, w: W, h: topH }, { id: "A", x: 0, y: topH + 4, w: Math.floor(W / 2) - 2, h: botH }, { id: "B", x: Math.floor(W / 2) + 2, y: topH + 4, w: W - Math.floor(W / 2) - 2, h: botH }] }; });
  const ready = await page.evaluate(() => !!(window.RUN1V && window.RUN1V.state.ready));
  if (!ready) { console.log("NOT READY", logs.join("\n")); await browser.close(); process.exit(1); }
  const clipOf = async (which) => page.evaluate((w) => { const c = document.getElementById("gl"), r = c.getBoundingClientRect(), L = window.RUN1V.layout(), v = L.views.find(x => x.id === w);
    return v ? { x: r.left + v.x, y: r.top + v.y, width: v.w, height: v.h } : { x: r.left, y: r.top, width: r.width, height: r.height }; }, which);
  const opts = JSON.parse(arg("opts", "{}"));
  const clipName = arg("clip", "all"), shots = [];
  const times = arg("times") ? arg("times").split(",").map(Number) : [];
  if (arg("strip")) { const [t0, dt, n] = arg("strip").split(":").map(Number); for (let i = 0; i < n; i++) times.push(+(t0 + i * dt).toFixed(6)); }
  let first = true;
  for (const t of times) {
    await page.evaluate((t, o, f) => window.RUN1V.set(t, f ? o : null), t, opts, first); first = false;
    const clip = await clipOf(clipName), f = path.join(out, `${arg("prefix", "f")}_${t.toFixed(4)}.png`);
    await page.screenshot({ path: f, clip }); shots.push(f);
  }
  // contact sheet: --sheet t0:dt:n --cols k --clip A|B|game  (frames composited in the page from the GL + overlay canvases)
  if (arg("sheet")) {
    const [t0, dt, n] = arg("sheet").split(":").map(Number), cols = +arg("cols", 6), scale = +arg("scale", 0.5);
    const data = await page.evaluate(async (t0, dt, n, cols, scale, which, o, crop) => {
      const g = document.getElementById("gl"), ov = document.getElementById("ov"), dpr = g.width / g.getBoundingClientRect().width, W = g.width / dpr;
      const L = window.RUN1V.layout(), vv = L.views.find(x => x.id === which);
      let r = vv ? [vv.x, vv.y, vv.w, vv.h] : [0, 0, W, g.height / dpr];
      if (crop) { const c = crop.split(",").map(Number); r = [r[0] + c[0] * r[2], r[1] + c[1] * r[3], c[2] * r[2], c[3] * r[3]]; }
      const fw = Math.round(r[2] * dpr * scale), fh = Math.round(r[3] * dpr * scale), rows = Math.ceil(n / cols);
      const S = document.createElement("canvas"); S.width = fw * cols; S.height = fh * rows; const c = S.getContext("2d"); c.fillStyle = "#000"; c.fillRect(0, 0, S.width, S.height);
      for (let i = 0; i < n; i++) { window.RUN1V.set(t0 + i * dt, i === 0 ? o : null); const x = (i % cols) * fw, y = Math.floor(i / cols) * fh;
        c.drawImage(g, r[0] * dpr, r[1] * dpr, r[2] * dpr, r[3] * dpr, x, y, fw, fh); c.drawImage(ov, r[0] * dpr, r[1] * dpr, r[2] * dpr, r[3] * dpr, x, y, fw, fh);
        c.fillStyle = "#ffd45e"; c.font = "bold 13px Menlo"; c.fillText((t0 + i * dt).toFixed(3) + "s  ph " + window.RUN1V.state.run1.A.phase.toFixed(2), x + 6, y + fh - 8); }
      return S.toDataURL("image/png");
    }, t0, dt, n, cols, scale, clipName, opts, arg("crop", null));
    const f = path.join(out, arg("prefix", "sheet") + ".png"); fs.writeFileSync(f, Buffer.from(data.split(",")[1], "base64")); console.log("sheet →", f);
  }
  const rep = await page.evaluate(() => window.RUN1V.report());
  fs.writeFileSync(path.join(out, "capture_log.json"), JSON.stringify({ q, times, opts, logs, report: rep }, null, 1));
  console.log(shots.length + " shots →", out); if (logs.length) console.log(logs.slice(0, 20).join("\n"));
  await browser.close();
})();
