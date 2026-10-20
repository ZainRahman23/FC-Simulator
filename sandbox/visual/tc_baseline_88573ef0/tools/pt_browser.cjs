// tc_playtest1/tools/pt_browser.cjs — drives the PLAYABLE page in Chrome with real key presses on its real-time loop (requestAnimationFrame, 240 Hz
// simulation), screenshots on the way, then reads the page's own performance record (frame time avg / p95 / p99 / worst; the work per frame: the
// simulation, the pose, the render) and its determinism check (the whole session re-simulated from the recorded input on a fresh simulation).
//   PUPPETEER_NODE_MODULES=<dir> node pt_browser.cjs --out <dir> [--seq <name>] [--q "cam=follow"] [--w 1440 --h 900] [--profile <dir>] [--shots "t1,t2"]
// sequences: keys held from t (s): [t, "KeyW+ShiftLeft"] … ("" = release all)
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg("w", 1440), H = +arg("h", 900), OUT = arg("out", "."), SEQ = arg("seq", "tour");
const SEQS = {
  // free play: start, run, the rapid changes the owner listed, sprint turns, a stop, a backward start — ≈ 34 s
  tour: [[0.6, "KeyW"], [3.0, "KeyW+KeyD"], [3.6, "KeyD"], [4.3, "KeyS+KeyD"], [5.0, "KeyS"], [6.4, ""], [7.4, "KeyW+ShiftLeft"], [10.4, "KeyA+ShiftLeft"], [12.4, "KeyW+ShiftLeft"],
    [14.6, "KeyS+ShiftLeft"], [16.6, "KeyW"], [18.0, "KeyD"], [18.8, "KeyW"], [19.6, "KeyA"], [21.0, ""], [22.0, "KeyS"], [24.0, "KeyW+AltLeft"], [26.0, "KeyA+AltLeft"], [27.5, "KeyW"],
    [29.0, "KeyW+KeyA"], [29.4, "KeyW+KeyD"], [29.8, "KeyW+KeyA"], [30.2, "KeyW+KeyD"], [30.6, "KeyW"], [32.0, ""], [34.0, null]],
  short: [[0.5, "KeyW"], [2.5, "KeyA"], [4.0, ""], [5.0, null]],
};
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", `--window-size=${W},${H}`] });
  try {
    const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 }); const logs = []; p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message)); p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.type() + " " + m.text()); });
    const t0 = Date.now(); await p.goto(`http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html?${arg("q", "")}`, { waitUntil: "load" });
    await p.waitForFunction("window.PT && window.PT.ready && window.PT.ready() === true", { timeout: 120000 }).catch(async () => { console.error("not ready", logs.join("\n")); });
    const loadMs = Date.now() - t0; fs.mkdirSync(OUT, { recursive: true }); await p.click("canvas#ov").catch(() => {});
    if (arg("set")) await p.evaluate((o) => window.PT.set(JSON.parse(o)), arg("set"));
    await new Promise((r) => setTimeout(r, 400)); await p.evaluate(() => window.PT.resetPerf()); await p.screenshot({ path: path.join(OUT, "pt_00_load.jpg"), type: "jpeg", quality: 86 });
    const shots = (arg("shots", "") || "").split(",").filter(Boolean).map(Number); let si = 0, held = new Set(); const seq = SEQS[SEQ], tS = Date.now();
    for (const [t, keys] of seq) { while ((Date.now() - tS) / 1000 < t) { if (si < shots.length && (Date.now() - tS) / 1000 >= shots[si]) { await p.screenshot({ path: path.join(OUT, `pt_${String(si + 1).padStart(2, "0")}_t${shots[si].toFixed(1)}.jpg`), type: "jpeg", quality: 86 }); si++; } await new Promise((r) => setTimeout(r, 15)); }
      if (keys === null) break; const want = new Set(keys ? keys.split("+") : []); for (const k of held) if (!want.has(k)) await p.keyboard.up(k); for (const k of want) if (!held.has(k)) await p.keyboard.down(k); held = want; }
    for (const k of held) await p.keyboard.up(k);
    fs.writeFileSync(path.join(OUT, `pt_session_${SEQ}.json`), JSON.stringify(await p.evaluate(() => window.PT.record())));
    const perf = await p.evaluate(() => window.PT.perf()), st = await p.evaluate(() => window.PT.state()), ver = await p.evaluate(() => window.PT.verify());
    // a replay of the last action at 0.25× (the page's own replay), two captures
    await p.evaluate(() => window.PT.replay("last")); await new Promise((r) => setTimeout(r, 1800)); await p.screenshot({ path: path.join(OUT, "pt_replay_a.jpg"), type: "jpeg", quality: 86 });
    await new Promise((r) => setTimeout(r, 2500)); await p.screenshot({ path: path.join(OUT, "pt_replay_b.jpg"), type: "jpeg", quality: 86 }); await p.evaluate(() => window.PT.live());
    const res = { seq: SEQ, loadMs, perf, determinism: ver, simT: st.t, contacts: st.contacts.length, missed: st.contacts.filter((c) => c.missed).length, actions: st.actions, contactList: st.contacts, logs };
    fs.writeFileSync(path.join(OUT, `pt_browser_${SEQ}.json`), JSON.stringify(res, null, 1));
    console.log(JSON.stringify({ loadMs, simT: st.t, contacts: res.contacts, missed: res.missed, actions: st.actions.filter((a) => a.label !== "CARRY").map((a) => `${a.t.toFixed(2)} ${a.label}${a.m ? (a.m > 0 ? " R" : " L") : ""}`), frame: perf.frame, work: perf.work, sim: perf.sim, pose: perf.pose, render: perf.render, replan: perf.replanCpu, determinism: ver, logs: logs.slice(0, 8) }, null, 1));
  } finally { await b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
