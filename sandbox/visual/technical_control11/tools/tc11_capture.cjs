// technical_control11/tools/tc11_capture.cjs — frame-exact capture of the TECHNICAL-CONTROL-1.1 feet lab (TECHNICAL-CONTROL-1's capture + --contacts:
// stills at the given offsets around EVERY contact, one row per contact, tiled into --strip). ── TECHNICAL-CONTROL-1's header:
// technical_control1/tools/tc_capture.cjs — frame-exact capture of the TECHNICAL-CONTROL-1 lab (RECEIVE-ELITE-1’s capture) (RECEIVE-CONTROL-2's capture): for frame j the page time is SET
// (D1V.set: seconds from the strike), the viewport is written as JPEG, ffmpeg encodes at a constant fps (no retiming). Stills: --stills (absolute s) or
// --rel (s from the first contact); --strip <file.jpg> tiles the stills into one frame strip.
//   PUPPETEER_NODE_MODULES=<dir> FFMPEG=<bin> node re1_capture.cjs --q "case=ST_180_V12&compare=1" --out <file.mp4 | dir> [--from/--to s | --rel0 −0.4 --rel1 1.6]
//     [--rate 0.5] [--fps 30] [--stills …] [--rel "-0.2,0,0.1"] [--strip f.jpg --cols 6] [--w 1280 --h 720] [--profile <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg("w", 1280), H = +arg("h", 720), FF = process.env.FFMPEG || "ffmpeg";
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 }); const logs = []; p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push("CONSOLE " + m.text()); });
    await p.goto(`http://127.0.0.1:8361/sandbox/visual/technical_control11.html?external=1&paused=1&${arg("q", "")}`, { waitUntil: "load" });
    await p.waitForFunction("window.D1V && window.D1V.ready && window.D1V.ready() === true", { timeout: 240000 });
    const tc = await p.evaluate(() => window.D1V.firstContact()), shot = async (t) => { await p.evaluate((x) => window.D1V.set(x), t); return p.screenshot({ type: "jpeg", quality: 88 }); };
    const out = arg("out"), st = arg("stills"), rel = arg("rel"), con = arg("contacts");
    if (con) { fs.mkdirSync(out, { recursive: true }); const offs = con.split(",").map(Number), cf = +arg("cfrom", -1), ct = +arg("cto", 99), C = (await p.evaluate(() => window.D1V.contacts())).filter((c) => c.t >= cf && c.t <= ct), files = [], maxC = +arg("maxc", 12);
      for (const [ci, c] of C.slice(0, maxC).entries()) for (const [j, o] of offs.entries()) { const f = path.join(out, `c${String(ci).padStart(2, "0")}_${j}.jpg`); fs.writeFileSync(f, await shot(c.t + o)); files.push(f); }
      fs.writeFileSync(path.join(out, "contacts.json"), JSON.stringify({ offsets: offs, contacts: C.slice(0, maxC) }));
      const strip = arg("strip"); if (strip) { const cols = offs.length, sc = +arg("scale", 0.5);
        cp.execFileSync(FF, ["-loglevel", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", files.map((_, j) => `[${j}:v]scale=iw*${sc}:ih*${sc}[s${j}]`).join(";") + ";" + files.map((_, j) => `[s${j}]`).join("") + `xstack=inputs=${files.length}:layout=${files.map((_, j) => `${(j % cols) === 0 ? "0" : Array.from({ length: j % cols }, () => "w0").join("+")}_${Math.floor(j / cols) === 0 ? "0" : Array.from({ length: Math.floor(j / cols) }, () => "h0").join("+")}`).join("|")}:fill=black`, "-frames:v", "1", "-q:v", "3", strip], { stdio: ["ignore", "inherit", "inherit"] }); }
      console.log(JSON.stringify({ contacts: C.length, shots: files.length, logs })); return; }
    if (st || rel) { fs.mkdirSync(out, { recursive: true }); const ts = st ? st.split(",").map(Number) : rel.split(",").map((x) => tc + +x), files = [];
      for (const [j, t] of ts.entries()) { const f = path.join(out, `s${String(j).padStart(2, "0")}_${rel ? "r" + (+rel.split(",")[j]).toFixed(2) : "t" + t.toFixed(2)}.jpg`); fs.writeFileSync(f, await shot(t)); files.push(f); }
      const strip = arg("strip"); if (strip) { const cols = +arg("cols", Math.min(6, files.length)), rows = Math.ceil(files.length / cols), sc = +arg("scale", 0.5);
        cp.execFileSync(FF, ["-loglevel", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", files.map((_, j) => `[${j}:v]scale=iw*${sc}:ih*${sc}[s${j}]`).join(";") + ";" + files.map((_, j) => `[s${j}]`).join("") + `xstack=inputs=${files.length}:layout=${files.map((_, j) => `${(j % cols) === 0 ? "0" : Array.from({ length: j % cols }, () => "w0").join("+")}_${Math.floor(j / cols) === 0 ? "0" : Array.from({ length: Math.floor(j / cols) }, () => "h0").join("+")}`).join("|")}:fill=black`, "-q:v", "3", strip], { stdio: ["ignore", "inherit", "inherit"] }); } }
    else { const from = arg("rel0") != null ? tc + +arg("rel0") : +arg("from", 0.5), to = arg("rel1") != null ? tc + +arg("rel1") : +arg("to", 4.0), rate = +arg("rate", 0.5), fps = +arg("fps", 30), n = Math.round((to - from) / (rate / fps)) + 1, FR = out + ".frames";
      fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
      for (let k = 0; k < n; k++) fs.writeFileSync(path.join(FR, `f${String(k).padStart(5, "0")}.jpg`), await shot(from + k * rate / fps));
      cp.execFileSync(FF, ["-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(FR, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out], { stdio: ["ignore", "inherit", "inherit"] });
      fs.rmSync(FR, { recursive: true, force: true }); }
    const info = await p.evaluate(() => window.D1V.summary().map((s) => ({ pipe: s.pipe, hash: s.hash, sepMax: s.sepMax })));
    if (logs.length) console.log(logs.slice(0, 5).join("\n")); console.log("ok", out, "first contact", tc != null ? tc.toFixed(3) : null, JSON.stringify(info));
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
