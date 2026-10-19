// receive_control2/tools/rc2_capture.cjs — frame-exact capture of the RECEIVE-CONTROL-2 lab: for frame j the page time is SET (D1V.set: seconds
// from the strike), the viewport is written as JPEG and ffmpeg encodes at a constant fps (no retiming). Stills mode writes the listed times.
//   PUPPETEER_NODE_MODULES=<dir> FFMPEG=<bin> node rc2_capture.cjs --q "case=D_BC70&seed=1&single=A&A=rear34" --out <file.mp4 | dir>
//     [--from 0.5 --to 4.0] [--rate 0.5] [--fps 30] [--stills "1.2,1.5,2.0"] [--w 1280 --h 720] [--profile <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg("w", 1280), H = +arg("h", 720), FF = process.env.FFMPEG || "ffmpeg";
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 }); const logs = []; p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
    await p.goto(`http://127.0.0.1:8361/sandbox/visual/receive_control2.html?external=1&paused=1&${arg("q", "")}`, { waitUntil: "load" });
    await p.waitForFunction("window.D1V && window.D1V.ready && window.D1V.ready() === true", { timeout: 180000 });
    const shot = async (t) => { await p.evaluate((x) => window.D1V.set(x), t); return p.screenshot({ type: "jpeg", quality: 88 }); };
    const out = arg("out"), st = arg("stills");
    if (st) { fs.mkdirSync(out, { recursive: true }); for (const t of st.split(",").map(Number)) fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.jpg`), await shot(t)); }
    else { const from = +arg("from", 0.5), to = +arg("to", 4.0), rate = +arg("rate", 0.5), fps = +arg("fps", 30), n = Math.round((to - from) / (rate / fps)) + 1, FR = out + ".frames";
      fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
      for (let k = 0; k < n; k++) fs.writeFileSync(path.join(FR, `f${String(k).padStart(5, "0")}.jpg`), await shot(from + k * rate / fps));
      cp.execFileSync(FF, ["-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(FR, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out], { stdio: ["ignore", "inherit", "inherit"] });
      fs.rmSync(FR, { recursive: true, force: true }); }
    const info = await p.evaluate(() => ({ hash: window.D1V.state.hash, sum: window.D1V.summary() }));
    if (logs.length) console.log(logs.slice(0, 3).join("\n")); console.log("ok", out, "fingerprint", info.hash, info.sum && info.sum.cls ? info.sum.cls.action : "");
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
