// dribble15/tools/d15_chrome.cjs — CHROME vs NODE: the lab page (DRIBBLE-1.2, or with --page dribble1.html the frozen DRIBBLE-1) simulates each scenario
// in headless Chrome; Node runs the identical simulation. Compared separately:
//   DECISIONS — every deliberate touch (tick, foot, region, launched / cancelled), the cut timeline (holds, stages, releases), control changes;
//   STATE — ball position / velocity and COM position at every tick: the first tick and quantity that differ, and the largest difference.
// usage: PUPPETEER_NODE_MODULES=<dir> node d15_chrome.cjs "IDs|all" out.json [--page dribble15.html] [--ver d15] [--port 8361] [--profile dir]
const path = require("path"), fs = require("fs"), cp = require("child_process");
const puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const [idsArg = "all", outFile] = process.argv.slice(2), page0 = arg("page", "dribble15.html"), ver = arg("ver", page0 === "dribble1.html" ? "d1" : "d15"), port = arg("port", "8361");
(async () => {
  // Node side: a helper module run per scenario (ESM) prints the same compact record as the page returns
  const nodeRun = (id) => JSON.parse(cp.execFileSync(process.execPath, [path.join(__dirname, "d15_chrome_node.mjs"), id, ver], { maxBuffer: 1 << 28 }).toString());
  const ids = idsArg === "all" ? JSON.parse(cp.execFileSync(process.execPath, ["-e", 'import("../../dribble1/d1_scenarios.js").then(m=>console.log(JSON.stringify(m.list().map(s=>s.id))))'], { cwd: __dirname }).toString()) : idsArg.split(",");
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const chromeVer = await b.version(), out = { node: process.version, chrome: chromeVer, page: page0, results: {} }; let dSame = 0, sSame = 0;
  for (const id of ids) {
    const p = await b.newPage(); await p.setViewport({ width: 800, height: 500 });
    await p.goto(`http://127.0.0.1:${port}/sandbox/visual/${page0}?external=1&paused=1&scn=${id}`, { waitUntil: "load" });
    await p.waitForFunction("window.D1V && D1V.state.ready", { timeout: 300000 });
    const C = await p.evaluate(() => { const S = D1V.state.S, r = S.rec; return { dec: { touches: S.touches.map((t) => [t.k, t.F, t.reg, !!t.launched, t.cancelled || null]), turn: (S.turnLog || []).map((e) => [e.k, e.kind, e.by || null]), ctrl: S.ctrl.changes.map((c) => [c.k, c.to]) },
      state: r.map((q) => [q.ball.p[0], q.ball.p[1], q.ball.p[2], q.ball.v[0], q.ball.v[1], q.ball.v[2], q.P[0], q.P[1], q.psi]), fault: S.fault || null }; });
    await p.close(); const N = nodeRun(id);
    const decSame = JSON.stringify(C.dec) === JSON.stringify(N.dec); let first = null, maxD = 0; const n = Math.min(C.state.length, N.state.length);
    for (let i = 0; i < n; i++) for (let q = 0; q < 9; q++) { const d = Math.abs(C.state[i][q] - N.state[i][q]); if (d > 0 && !first) first = { tick: i, quantity: ["ballX", "ballH", "ballY", "ballVx", "ballVh", "ballVy", "comX", "comY", "psi"][q], diff: d }; if (d > maxD) maxD = d; }
    const firstDec = decSame ? null : (() => { for (const k of ["touches", "turn", "ctrl"]) { const a = C.dec[k], bb = N.dec[k]; for (let i = 0; i < Math.max(a.length, bb.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(bb[i])) return { what: k, i, chrome: a[i] || null, node: bb[i] || null }; } return null; })();
    if (decSame) dSame++; if (!first && C.state.length === N.state.length) sSame++;
    out.results[id] = { decisionsIdentical: decSame, stateIdentical: !first && C.state.length === N.state.length, firstStateDiff: first, maxStateDiff: maxD, firstDecisionDiff: firstDec, touches: N.dec.touches.length };
    console.log(id.padEnd(18), decSame ? "DECISIONS SAME" : "DECISIONS DIFFER " + JSON.stringify(firstDec), "|", first ? `state differs from tick ${first.tick} (${first.quantity} ${first.diff.toExponential(1)}), max ${maxD.toExponential(1)}` : "state bit-identical");
  }
  out.summary = { decisionsIdentical: dSame, stateIdentical: sSame, total: ids.length }; console.log(`${chromeVer} vs Node ${process.version}: decisions ${dSame}/${ids.length} identical, state ${sSame}/${ids.length} bit-identical`);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
