// dribble13/tools/d13_capture.cjs — deterministic, frame-exact capture of the DRIBBLE-1.2 lab (or, with --page dribble1.html, the frozen DRIBBLE-1 lab): for frame k the page time is SET to t0 + k·dt·rate (D1V.set);
// the WebGL canvas and the diagnostic overlay are composited in the page, written as JPEG, and ffmpeg encodes at a constant 60 fps (no retiming).
// usage: PUPPETEER_NODE_MODULES=<dir> FFMPEG=<bin> node d13_capture.cjs --q "scn=CUT90_RUN&diag=1" --out <file.mp4 | dir with --stills> [--t0 0] [--t1 6]
//        [--rate 1|0.25] [--w 1600 --h 900] [--single game|nearC|…] [--stills "1.0,1.2"] [--port 8361] [--profile <chrome profile dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const port = arg("port", "8361"), W = +arg("w", 1600), H = +arg("h", 900), rate = +arg("rate", 1), FF = process.env.FFMPEG || "ffmpeg";
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined),
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try {
    const page = await browser.newPage(); await page.setCacheEnabled(false); await page.setViewport({ width: W, height: H + 120, deviceScaleFactor: 1 });
    const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text())); page.on("pageerror", e => logs.push("PAGEERROR " + e.message));
    await page.goto(`http://127.0.0.1:${port}/sandbox/visual/${arg("page", "dribble13.html")}?external=1&paused=1&${arg("q", "")}`, { waitUntil: "load" });
    await page.waitForFunction("window.D1V && D1V.state.ready", { timeout: 180000 }).catch(() => { console.log(logs.join("\n")); throw new Error("lab not ready"); });
    const single = arg("single", null);
    await page.evaluate((w, h, single) => { const st = D1V.state; st.dpr = 1; const gw = Math.round(w * 0.62), cw = w - gw - 4, ch = Math.floor((h - 4) / 2);
      st.fixedLayout = single ? { W: w, H: h, views: [{ id: single, x: 0, y: 0, w, h }] } : { W: w, H: h, views: [{ id: "game", x: 0, y: 0, w: gw, h }, { id: "A", x: gw + 4, y: 0, w: cw, h: ch }, { id: "B", x: gw + 4, y: ch + 4, w: cw, h: h - ch - 4 }] }; }, W, H, single);
    const grab = (t) => page.evaluate((tt) => { D1V.set(tt); const g = document.getElementById("gl"), o = document.getElementById("ov"), c = document.createElement("canvas"); c.width = g.width; c.height = g.height; const x = c.getContext("2d"); x.drawImage(g, 0, 0); x.drawImage(o, 0, 0); return c.toDataURL("image/jpeg", 0.92).split(",")[1]; }, t);
    const out = arg("out"), st = arg("stills"), info = await page.evaluate(() => ({ hash: D1V.state.hash, dur: D1V.state.dur, simMs: D1V.state.simMs }));
    if (st) { fs.mkdirSync(out, { recursive: true }); for (const t of st.split(",").map(Number)) fs.writeFileSync(path.join(out, `t${t.toFixed(3)}.jpg`), Buffer.from(await grab(t), "base64")); }
    else {
      const t0 = +arg("t0", 0), t1 = Math.min(+arg("t1", info.dur), info.dur), fps = 60, dtS = rate / fps, n = Math.round((t1 - t0) / dtS) + 1, FR = arg("frames", out + ".frames");
      fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
      for (let k = 0; k < n; k++) fs.writeFileSync(path.join(FR, `f${String(k).padStart(5, "0")}.jpg`), Buffer.from(await grab(t0 + k * dtS), "base64"));
      cp.execFileSync(FF, ["-loglevel", "error", "-y", "-framerate", "60", "-i", path.join(FR, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out]);
      fs.rmSync(FR, { recursive: true, force: true });
    }
    const errs = logs.filter(l => /PAGEERROR|error:(?!.*404)/i.test(l)); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
    console.log("ok", out, "fingerprint", info.hash, "sim", info.simMs.toFixed(0), "ms");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
