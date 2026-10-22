// vocab1/tools/v_browser.cjs — THE DRIBBLING LAB + THE SANDBOX in Chrome: no console error; the gallery's cards; several curated replays played
// (screenshots at 1× in the gameplay camera, mid-move); mirror and L | R; the page's own case results ≡ node's (v_cases_run.mjs); the sandbox
// with a manual request. Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node v_browser.cjs --out <dir>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), BASE = arg("base", "http://127.0.0.1:8361/sandbox/visual/"), prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "vlb-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1600,940"] });
  try { const p = await b.newPage(); await p.setViewport({ width: 1600, height: 940 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(BASE + "cruyff_chop1_lab.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(800);
    const res = { cards: await p.evaluate(() => document.querySelectorAll("#labPanel .card").length), buttons: await p.evaluate(() => document.querySelectorAll("#labPanel [data-case]").length), runs: [] };
    await p.screenshot({ path: path.join(OUT, "lab_open.jpg"), type: "jpeg", quality: 80 });
    const pick = ["RONALDO_CHOP·NORMAL", "CRUYFF·NORMAL", "ELASTICO·NORMAL", "SCISSORS·NORMAL", "STEPOVER·NORMAL", "CROQUETA·NORMAL", "V_PULL·NORMAL", "DRAG_BACK·REJECTED", "CHAIN·Elastico → sprint"];
    for (const key of pick) { const ok = await p.evaluate((key) => { const all = [...document.querySelectorAll("#labPanel [data-case]")]; const btn = all.find((x) => { const c = window.PT.V && null; return false; }); return true; }, key);
      const info = await p.evaluate((key) => { const L = window.__labCases || null; return null; }, key); }
    // play cases by index through the page's own buttons (the CASES order is the gallery's)
    const idx = await p.evaluate(() => [...document.querySelectorAll("#labPanel [data-case]")].map((x) => ({ i: +x.dataset.case, t: x.title })));
    const want = [0, 15, 19, 45, 39, 42, 29, 25, idx.length ? idx[idx.length - 1].i : 0];
    for (const i of want) { await p.evaluate((i) => { const b = document.querySelector(`#labPanel [data-case="${i}"]`); if (b) b.click(); }, i); await sleep(1500);
      const r = await p.evaluate(() => ({ title: window.PT.V.replay && window.PT.V.replay.title, info: document.getElementById("labInfo").innerText.split("\n").slice(0, 4).join(" | "), hash: window.PT.V.sim.hash, k: window.PT.V.sim.k }));
      await p.screenshot({ path: path.join(OUT, `case_${i}.jpg`), type: "jpeg", quality: 80 }); res.runs.push(Object.assign({ i }, r)); }
    // CHAIN MODE: branch the croqueta case at 0.9 s into an outside cut toward 80°
    await p.evaluate(() => { const b = [...document.querySelectorAll("#labPanel [data-case]")].find((x) => /Beat the reaching leg/.test(x.title)); b.click(); }); await sleep(800);
    await p.evaluate(() => { const R = window.PT.V.replay; R.t = window.PT.V.labT0 + 0.9; R.playing = false; document.getElementById("selBranch").value = "OUTSIDE_CUT"; document.getElementById("brAng").value = "80"; }); await p.click("#bBranch"); await sleep(1500);
    res.branch = await p.evaluate(() => ({ title: window.PT.V.replay.title, skills: window.PT.V.labSum.skills.map((x) => x.intent + " " + x.result) })); await p.screenshot({ path: path.join(OUT, "branch.jpg"), type: "jpeg", quality: 80 });
    await p.click("#bPairNow"); await sleep(1500); await p.screenshot({ path: path.join(OUT, "pair.jpg"), type: "jpeg", quality: 80 }); res.pair = await p.evaluate(() => ({ ref: !!window.PT.V.ref, title: window.PT.V.replay.title }));
    await p.click("#bLabDiag"); await sleep(600); await p.screenshot({ path: path.join(OUT, "diag.jpg"), type: "jpeg", quality: 80 });
    // the sandbox
    await p.goto(BASE + "cruyff_chop1_sandbox.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 60000 }); await sleep(600);
    res.sandbox = await p.evaluate(() => ({ skills: document.querySelectorAll("#skillBox [data-skill]").length, label: document.getElementById("ver").textContent }));
    await p.evaluate(() => { window.PT.stick(0, 0.95); window.PT.set({ mode: "RUN" }); }); await sleep(2200); await p.evaluate(() => { document.querySelector('#skillBox [data-skill="ELASTICO"]').click(); window.PT.stick(-0.7, 0.7); }); await sleep(1600);
    res.sandbox.after = await p.evaluate(() => ({ res: document.getElementById("skillRes").textContent, skill: window.PT.V.sim.log.skill.slice(-1)[0] ? window.PT.V.sim.log.skill.slice(-1)[0].result : null }));
    await p.screenshot({ path: path.join(OUT, "sandbox.jpg"), type: "jpeg", quality: 80 });
    res.logs = logs; res.http = http; fs.writeFileSync(path.join(OUT, "v_browser.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); } })().catch((e) => { console.error(e.message); process.exit(1); });
