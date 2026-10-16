// turn1/tools/t1_capture.cjs — deterministic, frame-exact capture of the TURN-1 viewer: for frame k the viewer time is SET to t0 + k·dt/rate (TURN1V.set),
// the WebGL canvas and the diagnostic overlay are composited in the page and written as JPEG; ffmpeg encodes at a constant 60 fps (no retiming).
// usage: PUPPETEER_NODE_MODULES=<dir> FFMPEG=<bin> node t1_capture.cjs --q "scn=JOG_90R&diag=1" --out <file.mp4|dir for --stills> [--t0 0.6] [--t1 3.6]
//        [--rate 1|0.25] [--w 1600 --h 900] [--stills "1.0,1.2,…"] [--port 8360] [--frames <scratch dir>] [--sil]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const SIL = process.argv.includes("--sil"), port = arg("port", "8360"), W = +arg("w", 1600), H = +arg("h", 900), rate = +arg("rate", 1), FF = process.env.FFMPEG || "ffmpeg";
let browser;
async function open() {
  browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined),
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: W, height: H + 120, deviceScaleFactor: 1 });
  const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
  const url = `http://127.0.0.1:${port}/sandbox/visual/turn1.html?external=1&paused=1&${arg("q", "")}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction("window.TURN1V && TURN1V.state.ready", { timeout: 60000 }).catch(() => { console.log(logs.join("\n")); throw new Error("viewer not ready"); });
  await page.evaluate((w, h) => { TURN1V.state.fixedLayout = null; TURN1V.state.dpr = 1; const L = TURN1V.state.single ? { W: w, H: h, views: [{ id: TURN1V.state.single, x: 0, y: 0, w, h }] } : (() => { const gw = Math.round(w * 0.62), cw = w - gw - 4, ch = Math.floor((h - 4) / 2); return { W: w, H: h, views: [{ id: "game", x: 0, y: 0, w: gw, h }, { id: "A", x: gw + 4, y: 0, w: cw, h: ch }, { id: "B", x: gw + 4, y: ch + 4, w: cw, h: h - ch - 4 }] }; })(); TURN1V.state.fixedLayout = L; }, W, H);
  return { page, logs };
}
async function grab(page, t) {
  return page.evaluate((tt, sil) => { TURN1V.set(tt); const g = document.getElementById("gl"), o = document.getElementById("ov"), c = document.createElement("canvas"); c.width = g.width; c.height = g.height; const x = c.getContext("2d"); x.drawImage(g, 0, 0);
    if (sil) { const im = x.getImageData(0, 0, c.width, c.height), d = im.data; for (let i = 0; i < d.length; i += 4) { const e = Math.abs(d[i] - 255) + d[i + 1] + Math.abs(d[i + 2] - 255), k = e > 90 ? 1 : e > 40 ? (e - 40) / 50 : 0; d[i] = d[i + 1] = d[i + 2] = Math.round(228 - k * 205); } x.putImageData(im, 0, 0); }   // --sil: the figure as a flat silhouette
    x.drawImage(o, 0, 0); return c.toDataURL("image/jpeg", 0.93).split(",")[1]; }, t, SIL);
}
(async () => {
  const { page, logs } = await open();
  const out = arg("out"), st = arg("stills");
  if (st) { fs.mkdirSync(out, { recursive: true }); for (const t of st.split(",").map(Number)) { const b = await grab(page, t); fs.writeFileSync(path.join(out, `t${t.toFixed(3)}.jpg`), Buffer.from(b, "base64")); } }
  else {
    const t0 = +arg("t0", 0), t1 = +arg("t1", 4), fps = 60, dtS = rate / fps, n = Math.round((t1 - t0) / dtS) + 1, FR = arg("frames", out + ".frames");
    fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
    for (let k = 0; k < n; k++) { const b = await grab(page, t0 + k * dtS); fs.writeFileSync(path.join(FR, `f${String(k).padStart(5, "0")}.jpg`), Buffer.from(b, "base64")); }
    cp.execFileSync(FF, ["-loglevel", "error", "-y", "-framerate", "60", "-i", path.join(FR, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out]);
    fs.rmSync(FR, { recursive: true, force: true });
  }
  const errs = logs.filter(l => /error|PAGEERROR/i.test(l)); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await browser.close(); console.log("ok", out);
})().catch(async (e) => { console.error(e.message); if (browser) await browser.close(); process.exit(1); });
