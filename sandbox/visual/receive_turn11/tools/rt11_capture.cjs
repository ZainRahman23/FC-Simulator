// receive_turn11/tools/rt11_capture.cjs — frame-exact capture of the human-motion lab (--page v1: RECEIVE-TURN-1 lab): for frame k the page time is SET ((window.RTL || window.RKL).setRel: seconds from the
// CONTACT marker), the viewport is written as JPEG and ffmpeg encodes at a constant fps (no retiming). Stills mode writes the listed times.
//   PUPPETEER_NODE_MODULES=<dir> FFMPEG=<bin> node rk_capture.cjs --q "v=22&bc=50&draw=TYPICAL&cam=near" --out <file.mp4 | dir> [--from -0.8 --to 2.2]
//     [--rate 0.5] [--fps 30] [--stills "-0.3,0,0.25,1"] [--w 1440 --h 980] [--profile <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), cp = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg("w", 1440), H = +arg("h", 980), FF = process.env.FFMPEG || "ffmpeg";
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 }); const logs = []; p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
    await p.goto(`http://127.0.0.1:8361/sandbox/visual/${arg("page", "human") === "v1" ? "receive_turn1_lab.html" : "receive_turn11_lab.html"}?external=1&paused=1&${arg("q", "")}`, { waitUntil: "load" });
    await p.waitForFunction("window.RTL_READY === true || window.RKL_READY === true", { timeout: 120000 });
    const shot = async (dt) => { await p.evaluate((x) => (window.RTL || window.RKL).setRel(x), dt); return p.screenshot({ type: "jpeg", quality: 88 }); };
    const out = arg("out"), st = arg("stills"), evs = arg("events");
    if (evs) { // a frame strip at the body's own event times (RTL.events()), each still named by its order, event and time
      fs.mkdirSync(out, { recursive: true }); const E = await p.evaluate(() => RTL.events()); const list = evs.split(",").filter((k) => E && E[k] != null).map((k) => [k, E[k]]).sort((x, y) => x[1] - y[1]);
      const NAMES = { prepStart: "preparation begins", supportPlant: "support foot plants", swingStart: "contact leg begins swing", contact: "BALL CONTACT", maxHipRotation: "maximum hip rotation (fastest)", weightTransfer: "weight transfer onto the exit foot", contactLand: "exit foot plants (step-through)", exitPlant: "next exit step plants", aligned: "body aligned with the exit", rejoin: "rejoins the ball" };
      let i = 0; for (const [k, t] of list) { i++; await p.evaluate((x, lb) => RTL.setRel(x, lb), t, `${NAMES[k] || k} · ${t >= 0 ? "+" : ""}${t.toFixed(2)} s`); fs.writeFileSync(path.join(out, `e${String(i).padStart(2, "0")}_${k}_t${t >= 0 ? "+" : ""}${t.toFixed(2)}.jpg`), await p.screenshot({ type: "jpeg", quality: 88 })); }
      fs.writeFileSync(path.join(out, "events.json"), JSON.stringify(E)); }
    if (evs) { /* done above */ }
    else if (st) { fs.mkdirSync(out, { recursive: true }); for (const t of st.split(",").map(Number)) fs.writeFileSync(path.join(out, `t${t >= 0 ? "+" : ""}${t.toFixed(2)}.jpg`), await shot(t)); }
    else { const from = +arg("from", -0.8), to = +arg("to", 2.2), rate = +arg("rate", 0.5), fps = +arg("fps", 30), n = Math.round((to - from) / (rate / fps)) + 1, FR = out + ".frames";
      fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
      for (let k = 0; k < n; k++) fs.writeFileSync(path.join(FR, `f${String(k).padStart(5, "0")}.jpg`), await shot(from + k * rate / fps));
      cp.execFileSync(FF, ["-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(FR, "f%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out]);
      fs.rmSync(FR, { recursive: true, force: true }); }
    const info = await p.evaluate(() => (window.RTL ? { hash: RTL.state.hash, surface: RTL.state.P.A.fid } : { hash: RKL.state.hash, surface: RKL.state.P.plan.sf ? RKL.state.P.plan.sf.key : null }));
    if (logs.length) console.log(logs.slice(0, 3).join("\n")); console.log("ok", out, info.surface, "fingerprint", info.hash);
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
