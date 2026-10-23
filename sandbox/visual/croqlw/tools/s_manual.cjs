// speed99/tools/s_manual.cjs — THE MANUAL-PLAY PATH, with REAL input events (owner's playtest blocker, 21 Oct): Chrome, the playground, the
// pointer / keyboard exactly as a person uses them — the on-screen stick dragged to full magnitude straight up and held, combined with each way
// of asking for sprint — and per case the request the page actually built (mode, heading, keys), the authoritative speed reached, the run's top
//   cases: stick alone · top-bar Mode SPRINT + stick · sprint lock + stick · Shift + stick · on-screen SPRINT held by a 2nd touch + stick ·
//          W + Shift · W + top-bar Mode SPRINT
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node s_manual.cjs [--pace C] [--hold 7] [--url …] [--out <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const pace = arg("pace", "C"), hold = +arg("hold", 7), URL = arg("url", `http://127.0.0.1:8361/sandbox/visual/speed99.html?pace=${pace}`), OUT = arg("out", null), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "man-"));
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920", "--touch-events=enabled"] });
  const out = { url: URL, pace, cases: [] };
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = []; p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
    const fresh = async () => { await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(400); };
    const centre = async (sel) => { const r = await p.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; }); return r; };
    const sample = async () => p.evaluate(() => { const V = window.PT.V, st = V.sim.stateAt(V.sim.t), r = window.PT.request(), run = window.PT.run(); return { mode: r.mode, h: r.h, keys: r.keys, src: r.src, speed: +st.s.toFixed(3), requested: V.sim.P.speed[r.mode] ?? null, vmax: run ? +run.vmax.toFixed(3) : null, btn: { sprint: V.btn.sprint, lock: V.btn.lock }, baseMode: V.baseMode }; });
    const drag = async () => { const c = await centre("#stickPad"); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x, c.y - c.w * 0.45, { steps: 6 }); return c; };
    const CASES = [
      ["stick alone (full magnitude, straight up)", async () => { await drag(); }],
      ["top-bar Mode SPRINT, then the stick", async () => { await p.click('[data-mode="SPRINT"]'); await sleep(100); await drag(); }],
      ["sprint lock, then the stick", async () => { await p.click("#bLock"); await sleep(100); await drag(); }],
      ["Shift held + the stick", async () => { await p.keyboard.down("Shift"); await drag(); }],
      ["on-screen SPRINT held (a 2nd touch) + the stick", async () => { const s = await centre("#bSprint"); await p.touchscreen.touchStart(s.x, s.y); await sleep(80); await drag(); }],
      ["keyboard W + Shift", async () => { await p.keyboard.down("Shift"); await p.keyboard.down("KeyW"); }],
      ["keyboard W + top-bar Mode SPRINT", async () => { await p.click('[data-mode="SPRINT"]'); await sleep(100); await p.keyboard.down("KeyW"); }],
    ];
    for (const [name, act] of CASES) { await fresh(); let err = null; try { await act(); } catch (e) { err = e.message; }
      const trace = []; for (let i = 0; i < hold * 2; i++) { await sleep(500); trace.push(await sample()); }
      if (OUT) await p.screenshot({ path: path.join(OUT, "manual_" + name.replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".jpg"), type: "jpeg", quality: 78 });
      const last = trace[trace.length - 1]; out.cases.push({ name, err, mode: last.mode, src: last.src, requested: last.requested, speed: last.speed, runTop: last.vmax, btn: last.btn, baseMode: last.baseMode, speeds: trace.map((x) => x.speed) });
      try { await p.mouse.up(); } catch (_) {} try { await p.keyboard.up("Shift"); await p.keyboard.up("KeyW"); } catch (_) {} try { await p.touchscreen.touchEnd(); } catch (_) {} }
    out.logs = logs;
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); }
  for (const c of out.cases) console.log(`${c.name.padEnd(48)} mode ${String(c.mode).padEnd(7)} requested ${c.requested} m/s · speed after ${hold} s ${c.speed} m/s (${(c.speed * 3.6).toFixed(1)} km/h) · run top ${c.runTop} · src ${c.src} · base ${c.baseMode} · btn ${JSON.stringify(c.btn)}${c.err ? " · ERROR " + c.err : ""}`);
  if (OUT) fs.writeFileSync(path.join(OUT, "s_manual.json"), JSON.stringify(out, null, 1)); })().catch((e) => { console.error(e.message); process.exit(1); });
