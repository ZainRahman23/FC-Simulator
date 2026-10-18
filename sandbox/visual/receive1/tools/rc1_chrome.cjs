// receive1/tools/rc1_chrome.cjs — CHROME vs NODE for RECEIVE-CONTROL-1 (as dribble15/tools/d15_chrome.cjs): the receive lab page simulates each case in
// headless Chrome; Node runs the identical simulation. DECISIONS (every deliberate touch, the turn timeline, control changes, the first touch) and
// STATE (ball position / velocity, COM, heading at every tick) are compared separately.
// usage: PUPPETEER_NODE_MODULES=<dir> node rc1_chrome.cjs "ID1,ID2,…" out.json [--seed 1] [--port 8361] [--profile dir]
const path = require("path"), fs = require("fs"), cp = require("child_process");
const puppeteer = require(path.join(process.env.PUPPETEER_NODE_MODULES, "puppeteer-core"));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const [idsArg, outFile] = process.argv.slice(2), port = arg("port", "8361"), seed = arg("seed", "1");
(async () => {
  const nodeRun = (id) => JSON.parse(cp.execFileSync(process.execPath, [path.join(__dirname, "rc1_chrome_node.mjs"), id, seed], { maxBuffer: 1 << 28 }).toString());
  const ids = idsArg.split(","), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: arg("profile", undefined), args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const chromeVer = await b.version(), out = { node: process.version, chrome: chromeVer, seed, results: {} }; let dSame = 0, sSame = 0;
  for (const id of ids) {
    const p = await b.newPage(); await p.setViewport({ width: 800, height: 500 });
    await p.goto(`http://127.0.0.1:${port}/sandbox/visual/receive1.html?external=1&paused=1&case=${id}&seed=${seed}`, { waitUntil: "load" });
    await p.waitForFunction("window.D1V && D1V.state.ready", { timeout: 300000 });
    const C = await p.evaluate(() => { const S = D1V.state.S, r = S.rec; return { dec: { touches: S.touches.map((t) => [t.k, t.F, t.reg, !!t.launched, t.cancelled || null]), turn: (S.turnLog || []).map((e) => [e.k, e.kind, e.by || null]), ctrl: S.ctrl.changes.map((c) => [c.k, c.to]), first: S.rc.first ? [S.rc.first.k, S.rc.first.F, S.rc.first.reg] : null },
      state: r.map((q) => [q.ball.p[0], q.ball.p[1], q.ball.p[2], q.ball.v[0], q.ball.v[1], q.ball.v[2], q.P[0], q.P[1], q.psi]) }; });
    await p.close(); const N = nodeRun(id);
    const decSame = JSON.stringify(C.dec) === JSON.stringify(N.dec); let first = null, maxD = 0; const n = Math.min(C.state.length, N.state.length);
    for (let i = 0; i < n; i++) for (let q = 0; q < 9; q++) { const d = Math.abs(C.state[i][q] - N.state[i][q]); if (d > 0 && !first) first = { tick: i, q, diff: d }; maxD = Math.max(maxD, d); }
    if (decSame) dSame++; if (!first && C.state.length === N.state.length) sSame++;
    out.results[id] = { decisionsIdentical: decSame, stateIdentical: !first && C.state.length === N.state.length, firstStateDiff: first, maxStateDiff: maxD, touches: N.dec.touches.length, first: N.dec.first };
    console.log(id.padEnd(18), decSame ? "DECISIONS SAME" : "DECISIONS DIFFER", "|", first ? `state differs from tick ${first.tick} (q${first.q} ${first.diff.toExponential(1)}), max ${maxD.toExponential(1)}` : "state bit-identical");
  }
  out.summary = { decisionsIdentical: dSame, stateIdentical: sSame, total: ids.length }; console.log(`${chromeVer} vs Node ${process.version}: decisions ${dSame}/${ids.length} identical, state ${sSame}/${ids.length} bit-identical`);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
