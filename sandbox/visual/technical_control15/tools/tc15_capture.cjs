// technical_control15/tools/tc15_capture.cjs — frame-exact capture of the TECHNICAL-CONTROL-1.5 references lab (TECHNICAL-CONTROL-1.4's capture, the page
// changed): for frame j the page time is SET (TC15.set: seconds of the reference), the viewport written as JPEG, ffmpeg encodes at a constant fps (no
// retiming). Stills: --rel (s from the decisive contact) → --strip <file.jpg> --cols n tiles them.
//   PUPPETEER_NODE_MODULES=<dir> FFMPEG=<bin> node tc15_capture.cjs --q "tech=CHOP90&single=quad" --out <file.mp4 | dir> [--rel0 -1.0 --rel1 1.2] [--rate 0.5]
//     [--fps 30] [--rel "-0.2,0,0.1"] [--strip f.jpg --cols 6 --scale 0.5] [--w 1280 --h 720] [--profile <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg("w", 1280), H = +arg("h", 720), FF = process.env.FFMPEG || "ffmpeg";
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 }); const logs = []; p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push("CONSOLE " + m.text()); });
    await p.goto(`http://127.0.0.1:8361/sandbox/visual/technical_control15.html?external=1&paused=1&bare=1&${arg("q", "")}`, { waitUntil: "load" });
    await p.waitForFunction("window.TC15 && window.TC15.ready && window.TC15.ready() === true", { timeout: 240000 }).catch(async (e) => { console.error((await p.evaluate(() => document.getElementById("hud") && document.getElementById("hud").textContent)) || e.message); throw e; });
    const tc = await p.evaluate(() => window.TC15.tC()), dur = await p.evaluate(() => window.TC15.dur()), shot = async (t) => { await p.evaluate((x) => window.TC15.set(x), t); return p.screenshot({ type: "jpeg", quality: 88 }); };
    const out = arg("out"), rel = arg("rel");
    if (rel) { fs.mkdirSync(out, { recursive: true }); const rs = rel.split(",").map(Number), files = [];
      for (const [j, x] of rs.entries()) { const f = path.join(out, `s${String(j).padStart(2, "0")}_r${x.toFixed(3)}.jpg`); fs.writeFileSync(f, await shot(Math.max(0, Math.min(dur, tc + x)))); files.push(f); }
      const strip = arg("strip"); if (strip) { const cols = +arg("cols", Math.min(6, files.length)), sc = +arg("scale", 0.5);
        cp.execFileSync(FF, ["-loglevel", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", files.map((_, j) => `[${j}:v]scale=iw*${sc}:ih*${sc}[s${j}]`).join(";") + ";" + files.map((_, j) => `[s${j}]`).join("") + `xstack=inputs=${files.length}:layout=${files.map((_, j) => `${(j % cols) === 0 ? "0" : Array.from({ length: j % cols }, () => "w0").join("+")}_${Math.floor(j / cols) === 0 ? "0" : Array.from({ length: Math.floor(j / cols) }, () => "h0").join("+")}`).join("|")}:fill=black`, strip]); } }
    else { const from = tc + +arg("rel0", -1.0), to = tc + +arg("rel1", 1.2), rate = +arg("rate", 1), fps = +arg("fps", 30), n = Math.round((to - from) / (rate / fps)) + 1, FR = out + ".frames";
      fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
      for (let k = 0; k < n; k++) fs.writeFileSync(path.join(FR, `f${String(k).padStart(5, "0")}.jpg`), await shot(Math.max(0, Math.min(dur, from + k * rate / fps))));
      cp.execFileSync(FF, ["-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(FR, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out], { stdio: ["ignore", "inherit", "inherit"] });
      fs.rmSync(FR, { recursive: true, force: true }); }
    if (logs.length) console.log(logs.slice(0, 5).join("\n")); console.log("ok", out, JSON.stringify(await p.evaluate(() => window.TC15.summary())));
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
