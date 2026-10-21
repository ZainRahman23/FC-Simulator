// speed99/tools/s_manual_vs_scripted.cjs — MANUAL = SCRIPTED (owner, playtest blocker: "we must not have a benchmark claiming 37.3 km/h while the
// actual playable controller is only capable of ~19 km/h"). Per pace, in Chrome, from a fresh page each time:
//   SCRIPTED  the TOP SPEED RUN preset (the page's own stick, fed per tick)
//   MANUAL    REAL input events — the on-screen stick dragged straight up to full magnitude with the mouse and held, sprint asked for by
//             (a) SPRINT LOCK clicked first, (b) Shift held, (c) the top-bar Mode SPRINT clicked first; and (d) the stick alone (= RUN, the tier)
// compared tick by tick from the first tick the request had a direction: the request (heading, mode), the authoritative speed, the distance —
// max differences, the peak, the 5 … 80 m splits, the time to 90 / 95 / 99 % of the candidate's top speed. Also node's own straight sprint from
// rest (tools/s_matrix.mjs's request) on the same pace, for the same comparison
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node s_manual_vs_scripted.cjs [--paces CURRENT,A,B,C] [--out <dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOP = "TOP SPEED RUN · standing → straight full sprint (80 m)", DUR = 10, MARKS = [5, 10, 20, 30, 40, 60, 80];
function summary(tr, vmax) { const DT = 1 / 240, o = { peak: Math.max(...tr.s), splits: {}, pct: {} }; for (let i = 0; i < tr.s.length; i++) { for (const m of MARKS) if (o.splits[m] == null && tr.d[i] >= m) o.splits[m] = +((i + 1) * DT).toFixed(3); for (const f of [90, 95, 99]) if (o.pct[f] == null && tr.s[i] >= f / 100 * vmax - 1e-9) o.pct[f] = +((i + 1) * DT).toFixed(3); } o.peak = +o.peak.toFixed(4); return o; }
function diff(a, b) { const n = Math.min(a.s.length, b.s.length); let ds = 0, dd = 0, reqSame = true; for (let i = 0; i < n; i++) { ds = Math.max(ds, Math.abs(a.s[i] - b.s[i])); dd = Math.max(dd, Math.abs(a.d[i] - b.d[i])); if (a.h && b.h && (a.h[i] !== b.h[i] || a.mode[i] !== b.mode[i])) reqSame = false; } return { ticks: n, maxSpeedDiff: ds, maxDistDiff: dd, requestIdentical: reqSame }; }
(async () => { const paces = arg("paces", "CURRENT,C38,D38,E38").split(","), OUT = arg("out", null), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "mvs-")), res = {}; if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,920"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1500, height: 920 }); const logs = []; p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
    for (const pace of paces) { const URL = `http://127.0.0.1:8361/sandbox/visual/speed99.html?pace=${pace}&ref=CURRENT`, R = (res[pace] = {});
      const fresh = async () => { await p.goto(URL, { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(300); };
      const vmax = async () => p.evaluate(() => window.PT.V.sim.P.speed.SPRINT);
      const drag = async () => { const c = await p.$eval("#stickPad", (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x, c.y - c.w * 0.45, { steps: 1 }); };
      // scripted
      await fresh(); await p.evaluate((n) => window.PT.test(n), TOP); await sleep((DUR + 1.6) * 1000); const V0 = await vmax(); R.scripted = await p.evaluate((d) => window.PT.traceFromPress(d), DUR);
      if (OUT) await p.screenshot({ path: path.join(OUT, `top_speed_run_${pace}.jpg`), type: "jpeg", quality: 80 });
      // manual cases
      for (const [name, pre, release] of [["manual · SPRINT LOCK + stick", async () => { await p.click("#bLock"); await sleep(80); }, async () => {}], ["manual · Shift + stick", async () => { await p.keyboard.down("Shift"); }, async () => { await p.keyboard.up("Shift"); }], ["manual · top-bar Mode SPRINT + stick", async () => { await p.click('[data-mode="SPRINT"]'); await sleep(80); }, async () => {}], ["manual · stick alone (RUN tier)", async () => {}, async () => {}]]) {
        await fresh(); await pre(); await drag(); await sleep((DUR + 0.6) * 1000); if (OUT && name.includes("LOCK")) await p.screenshot({ path: path.join(OUT, `manual_lock_${pace}.jpg`), type: "jpeg", quality: 80 });
        R[name] = await p.evaluate((d) => window.PT.traceFromPress(d), DUR); await p.mouse.up(); await release(); }
      // node: the same pace, a straight sprint from rest with the page's own heading (the camera's latch)
      const h0 = R.scripted.h[0], nodeOut = execFileSync("node", [path.join(__dirname, "s_node_top.mjs"), pace, String(h0), String(DUR)], { encoding: "utf8", maxBuffer: 64 << 20 }); R.node = JSON.parse(nodeOut);
      R.vmax = V0; R.summary = Object.fromEntries(Object.entries(R).filter(([k, v]) => v && v.s).map(([k, v]) => [k, summary(v, V0)])); R.diff = Object.fromEntries(Object.entries(R).filter(([k, v]) => v && v.s && k !== "scripted").map(([k, v]) => [k, diff(R.scripted, v)])); }
    res.logs = logs;
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); }
  for (const pace of paces) { const R = res[pace]; console.log(`■ ${pace} · candidate top speed ${R.vmax} m/s (${(R.vmax * 3.6).toFixed(1)} km/h)`);
    for (const [k, s] of Object.entries(R.summary)) { const d = R.diff[k]; console.log(`   ${k.padEnd(38)} peak ${s.peak.toFixed(3)} m/s (${(s.peak * 3.6).toFixed(1)} km/h) · ${MARKS.map((m) => `${m} m ${s.splits[m] ?? "—"}`).join(" · ")} · 90/95/99 % ${s.pct[90] ?? "—"} / ${s.pct[95] ?? "—"} / ${s.pct[99] ?? "—"} s` + (d ? ` · vs scripted: request ${d.requestIdentical ? "IDENTICAL" : "DIFFERENT"}, max |Δspeed| ${d.maxSpeedDiff.toExponential(2)} m/s, max |Δdistance| ${d.maxDistDiff.toExponential(2)} m over ${d.ticks} ticks` : "")); } }
  if (res.logs && res.logs.length) console.log("page errors:", res.logs);
  if (OUT) fs.writeFileSync(path.join(OUT, "manual_vs_scripted.json"), JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v && v.summary ? { vmax: v.vmax, summary: v.summary, diff: v.diff } : v])), null, 1)); })().catch((e) => { console.error(e.message); process.exit(1); });
