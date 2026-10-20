// tc_playtest1/tools/pt_stick_browser.cjs — the on-screen stick driven in Chrome with REAL pointer input: a mouse drag held at an exact angle
// (the request's angle from the latched camera forward), the pointer leaving the circle (captured — control kept), the release (movement zero),
// WASD ↔ stick (the most recent source wins, never added), touch (a finger on the stick while the mouse holds SPRINT), the owner's sprint sweep
// 0 → 90° with Shift, REPLAY LAST ACTION showing the recorded stick, the page's determinism check and the session for node's re-simulation.
//   PUPPETEER_NODE_MODULES=<dir> node pt_stick_browser.cjs --out <dir> [--profile <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg("out", "."), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), DEG = Math.PI / 180;
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1440,900"] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, hasTouch: true }); const logs = []; p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
    await p.goto("http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()"); fs.mkdirSync(OUT, { recursive: true });
    const box = await p.$eval("#stickPad", (e) => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, R: r.width * 0.40 }; });
    const at = (deg, r) => [box.cx + Math.sin(deg * DEG) * r * box.R, box.cy - Math.cos(deg * DEG) * r * box.R];
    const req = () => p.evaluate(() => window.PT.request()), rel = (q) => (q.h == null ? null : (((q.h - q.frameH) / DEG + 540) % 360) - 180), R = { checks: {} };
    await p.screenshot({ path: path.join(OUT, "stick_00_load.jpg"), type: "jpeg", quality: 85 });
    // 1. a mouse drag to 37° at 95 % of the radius: the request is 37° from the camera forward the stick latched, the RUN zone
    await p.mouse.move(box.cx, box.cy); await p.mouse.down(); for (let i = 1; i <= 10; i++) { const [x, y] = at(37, 0.95 * i / 10); await p.mouse.move(x, y); await sleep(15); }
    await sleep(1600); let q = await req(); R.checks.drag37 = { relDeg: +rel(q).toFixed(2), mode: q.mode, src: q.src, pass: Math.abs(rel(q) - 37) < 0.6 && q.mode === "RUN" && q.src === "stick" };
    await p.screenshot({ path: path.join(OUT, "stick_01_drag37.jpg"), type: "jpeg", quality: 85 });
    // 2. the pointer far outside the circle: still captured, the thumb clamped to the rim
    await p.mouse.move(box.cx + 400, box.cy - 300); await sleep(250); const cap = await p.evaluate(() => ({ pid: window.PT.V.stick.pid, r: Math.hypot(window.PT.V.stick.raw.x, window.PT.V.stick.raw.y) })); q = await req();
    R.checks.capturedOutside = { captured: cap.pid != null, rawR: +cap.r.toFixed(3), relDeg: +rel(q).toFixed(1), pass: cap.pid != null && Math.abs(cap.r - 1) < 1e-6 && q.h != null };
    // 3. release: the thumb back to the centre, movement zero
    await p.mouse.up(); await sleep(150); q = await req(); const rw = await p.evaluate(() => window.PT.V.stick.raw); R.checks.release = { h: q.h, raw: rw, pass: q.h == null && rw.x === 0 && rw.y === 0 };
    await sleep(900);
    // 4. WASD ↔ stick: W takes over (the stick released), a new drag takes back — one source at a time
    await p.keyboard.down("KeyW"); await sleep(500); q = await req(); const kSrc = q.src, kRel = rel(q); await p.mouse.move(...at(-60, 0.9)); await p.mouse.down(); await sleep(40); await p.mouse.move(...at(-60, 0.92)); await sleep(500); q = await req();
    R.checks.sourceSwitch = { keys: kSrc, keysRelDeg: kRel, thenStick: q.src, stickRelDeg: +rel(q).toFixed(1), pass: kSrc === "keys" && Math.abs(kRel) < 1e-9 && q.src === "stick" && Math.abs(rel(q) + 60) < 0.8 };
    await p.mouse.up(); await p.keyboard.up("KeyW"); await sleep(800);
    // 5. touch on the stick + the mouse holding SPRINT (two pointers): stick direction + SPRINT
    const sb = await p.$eval("#bSprint", (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.touchscreen.touchStart(box.cx, box.cy); for (let i = 1; i <= 8; i++) { const [x, y] = at(0, 0.95 * i / 8); await p.touchscreen.touchMove(x, y); await sleep(15); }
    await p.mouse.move(...sb); await p.mouse.down(); await sleep(1200); q = await req(); R.checks.touchPlusSprint = { src: q.src, relDeg: +rel(q).toFixed(2), mode: q.mode, pass: q.src === "stick" && Math.abs(rel(q)) < 0.6 && q.mode === "SPRINT" };
    await p.screenshot({ path: path.join(OUT, "stick_02_touch_sprint.jpg"), type: "jpeg", quality: 85 });
    // 6. the owner's sweep while sprinting (Shift held — the mouse on the stick): forward → 30 → 45 → 60 → 75 → 90° over ≈ 2.5 s
    await p.mouse.up(); await p.touchscreen.touchEnd(); await sleep(400);
    await p.keyboard.down("ShiftLeft"); await p.mouse.move(box.cx, box.cy); await p.mouse.down(); for (let i = 1; i <= 8; i++) { const [x, y] = at(0, 0.95 * i / 8); await p.mouse.move(x, y); await sleep(15); }
    await sleep(2200); const t0 = await p.evaluate(() => window.PT.V.sim.t); const seen = [];
    for (let i = 0; i <= 50; i++) { const a = (i / 50) * 90; await p.mouse.move(...at(a, 0.95)); await sleep(48); if (i % 10 === 0) { q = await req(); seen.push(+rel(q).toFixed(1)); } if (i === 25) await p.screenshot({ path: path.join(OUT, "stick_03_sweep45.jpg"), type: "jpeg", quality: 85 }); }
    await sleep(1500); await p.screenshot({ path: path.join(OUT, "stick_04_sweep90.jpg"), type: "jpeg", quality: 85 });
    // snaps (each from a settled forward: release, re-grab forward — the stick re-latches the camera's forward — hold, then one jump)
    const regrab = async () => { await p.mouse.up(); await sleep(250); await p.mouse.move(box.cx, box.cy); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(...at(0, 0.95 * i / 6)); await sleep(12); } await sleep(2600); };
    await regrab(); await p.mouse.move(...at(90, 0.95)); await sleep(2000); await p.screenshot({ path: path.join(OUT, "stick_04b_snap90.jpg"), type: "jpeg", quality: 85 });
    await regrab(); await p.mouse.move(...at(150, 0.95)); await sleep(2200);
    await p.mouse.up(); await p.keyboard.up("ShiftLeft"); await sleep(600);
    const acts = await p.evaluate((t) => window.PT.state().actions.filter((a) => a.t >= t - 3 && a.label !== "CARRY").map((a) => `${a.t.toFixed(2)} ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""}`), t0);
    R.sweep = { anglesSeen: seen, actions: acts };
    // 7. REPLAY LAST ACTION: the recorded stick in the input box; then the page's determinism check; the session for node
    await p.keyboard.press("KeyQ"); await sleep(1500); await p.screenshot({ path: path.join(OUT, "stick_05_replay.jpg"), type: "jpeg", quality: 85 });
    R.replayShowsStick = await p.$eval("#keys", (e) => e.innerHTML.includes("<svg") && !e.innerHTML.includes("stick not used"));
    await p.keyboard.press("Escape"); await sleep(200); R.determinism = await p.evaluate(() => window.PT.verify());
    fs.writeFileSync(path.join(OUT, "stick_session.json"), JSON.stringify(await p.evaluate(() => window.PT.record())));
    R.perf = await p.evaluate(() => { const P = window.PT.perf(); return { frame: P.frame, work: P.work }; }); R.logs = logs;
    fs.writeFileSync(path.join(OUT, "stick_browser.json"), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
