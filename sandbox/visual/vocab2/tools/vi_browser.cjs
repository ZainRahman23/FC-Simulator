// vocab2/tools/vi_browser.cjs — DRIBBLING VOCABULARY INTEGRATION in Chrome: (1) THE DRIBBLING LAB (vocab2_lab.html) — no console error, no
// HTTP error; the first section (THE DRIBBLING VOCABULARY — INTEGRATED): both move cards and their badges; every card's ▶ PLAY / MIRROR /
// A · REVIEW BUILD / A | B / rate buttons clicked — the outcome the page simulated ≡ node's (lib_vi_cases.mjs --json), and in A | B the two lanes
// identical tick by tick (the lane offset removed); the chains; TRY; screenshots at 1× mid-move. (2) THE JOYSTICK SANDBOX (vocab2_sandbox.html) —
// the palette without the ineligible entries and without the analog-feint switch; the four explicit requests from ordinary dribbling (W held, then
// CRUISE) and their outcomes with reasons. Deletes its Chrome profile.
//   PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node vi_browser.cjs --out <dir> --node <lib_vi_cases.json>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => { const OUT = arg("out"), BASE = arg("base", "http://127.0.0.1:8361/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"))) : [], prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "vib-")); fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1600,940"] });
  const res = { lab: {}, sandbox: {} };
  try { const p = await b.newPage(); await p.setViewport({ width: 1600, height: 940 }); const logs = [], http = [];
    p.on("pageerror", (e) => logs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); }); p.on("response", (r) => { if (r.status() >= 400) http.push(r.status() + " " + r.url()); });
    await p.goto(BASE + "vocab2_lab.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 90000 }); await sleep(900);
    const L = res.lab; L.title = await p.title(); L.banner = await p.evaluate(() => document.getElementById("ver").textContent);
    L.first = await p.evaluate(() => document.querySelector("#labPanel h3").textContent);
    L.cards = await p.evaluate(() => [...document.querySelectorAll("#labPanel .card.adv.vi:not(.chain)")].map((c) => ({ name: c.querySelector(".nm").textContent, badges: [...c.querySelectorAll(".b")].map((x) => x.textContent), rows: c.querySelectorAll(".virow").length })));
    L.chains = await p.evaluate(() => document.querySelectorAll("#labPanel .card.adv.vi.chain").length);
    L.classRows = await p.evaluate(() => document.querySelectorAll("#labPanel .vitab tr").length - 1);
    L.oldSections = await p.evaluate(() => [...document.querySelectorAll("#labPanel h3")].map((h) => h.textContent).filter((t) => /LEG-WAVE V4 REVIEW|X-SWEEP V3 REVIEW|VIDEO-GUIDED V1 REVIEW|EXIT-FOOT REVIEW|CURRENT \| UPGRADED/.test(t)));
    L.defaultCase = await p.evaluate(() => window.PT.V.replay && window.PT.V.replay.title);
    await p.screenshot({ path: path.join(OUT, "lab_open.jpg"), type: "jpeg", quality: 72 });
    // (every PLAY / MIRROR: the page's own outcome against node's)
    const rows = await p.evaluate(() => [...document.querySelectorAll("#labPanel [data-vic]")].map((b) => ({ k: +b.dataset.vic, nm: b.closest(".virow").querySelector(".vin").textContent })));
    L.plays = [];
    for (const r of rows) for (const sel of ["data-vic", "data-vim"]) { await p.evaluate((k, sel) => document.querySelector(`#labPanel [${sel}="${k}"]`).click(), r.k, sel); await sleep(250);
      const o = await p.evaluate(() => { const V = window.PT.V, S = V.labSum, s0 = S.skills[0]; return { mode: V.labMode, title: V.replay.title, rate: V.replay.rate, playing: V.replay.playing, variant: V.labCase.variant, result: s0 ? s0.result : null, played: s0 ? s0.played || null : null, exits: S.exits.length, missed: S.missed, info: (document.getElementById("labInfo").innerText.match(/REASON: [^\n]*/) || [""])[0] }; });
      const mir = sel === "data-vim", n = NODE.find((x) => x.variant === (mir ? "MIRROR · " : "") + o.variant); o.node = n ? `${n.result} ${n.played || ""}`.trim() : null; o.same = !n || (n.result === o.result && (n.played || null) === (o.played || null)); L.plays.push(Object.assign({ nm: r.nm, mirror: mir }, o)); }
    // (A · REVIEW BUILD and A | B: the lanes' identity, tick by tick)
    const nCmp = await p.evaluate(() => document.querySelectorAll("#labPanel [data-vit]").length); L.ab = [];
    for (let j = 0; j < nCmp; j++) { await p.evaluate((j) => document.querySelector(`#labPanel [data-via="${j}"]`).click(), j); await sleep(200);
      const a = await p.evaluate(() => { const V = window.PT.V, s0 = V.labSum.skills[0]; return { title: V.replay.title, engine: V.engine, result: s0 ? s0.result + " " + (s0.played || "") : null }; });
      await p.evaluate((j) => document.querySelector(`#labPanel [data-vit]` + `[data-vit="${j}"]`).click(), j); await sleep(300);
      const t = await p.evaluate(() => { const V = window.PT.V, A = V.ref, B = V.sim, dy = V.labCmp.dy; let mx = 0, mb = 0; const T1 = Math.min(A.t, B.t);
        for (let t = V.replay.t0; t <= T1; t += 1 / 240) { const pa = A.stateAt(t).P, pb = B.stateAt(t).P; mx = Math.max(mx, Math.hypot(pa[0] - pb[0], pa[1] - dy - pb[1])); const ba = A.ballTrack(t).p, bb = B.ballTrack(t).p; mb = Math.max(mb, Math.hypot(ba[0] - bb[0], ba[1] - dy - bb[1])); }
        const cs = (S) => S.contacts.filter((c) => !c.missed).map((c) => `${c.t.toFixed(4)} ${c.F} ${c.surface}`).join("|"); return { title: V.replay.title, mode: V.labMode, rootMaxMm: +(mx * 1000).toFixed(3), ballMaxMm: +(mb * 1000).toFixed(3), contactsSame: cs(A) === cs(B), labels: V.labCmp.labels }; });
      L.ab.push(Object.assign({ aAlone: a }, t));
      if (j === 0 || j === nCmp - 2) { await p.evaluate(() => { const V = window.PT.V; V.replay.playing = false; V.replay.t = V.labT0 + 0.85; V.lastShown = null; }); await sleep(500); await p.screenshot({ path: path.join(OUT, `lab_ab_${j}.jpg`), type: "jpeg", quality: 72 }); } }
    // (the rates: 0.5× and 0.25× from the start of the card's case)
    L.rates = []; for (const r of [0.5, 0.25, 1]) { await p.evaluate((r) => document.querySelector(`#labPanel [data-vir="0"][data-rate="${r}"]`).click(), r); await sleep(200); L.rates.push(await p.evaluate(() => ({ rate: window.PT.V.replay.rate, playing: window.PT.V.replay.playing, title: window.PT.V.replay.title }))); }
    // (a mid-move frame of each move at 1×, gameplay camera)
    for (const [k, nm] of [[0, "lab_bf_play"], [rows.find((r) => /REFERENCE · JOG R → L/.test(r.nm)).k, "lab_croq_play"]]) { await p.evaluate((k) => document.querySelector(`#labPanel [data-vic="${k}"]`).click(), k); await sleep(250);
      await p.evaluate(() => { const V = window.PT.V; V.replay.playing = false; V.replay.t = V.labT0 + 0.75; V.lastShown = null; }); await sleep(500); await p.screenshot({ path: path.join(OUT, nm + ".jpg"), type: "jpeg", quality: 72 }); }
    await p.evaluate(() => document.querySelector('#labPanel [data-try="CROQUETA"]').click()); await sleep(500); L.tryInfo = await p.evaluate(() => document.getElementById("labInfo").innerText.split("\n")[0]);
    L.logs = logs.slice(); L.http = http.slice(); logs.length = 0; http.length = 0;
    // ── THE SANDBOX ──
    await p.goto(BASE + "vocab2_sandbox.html", { waitUntil: "load" }); await p.waitForFunction("window.PT && window.PT.ready()", { timeout: 90000 }); await sleep(900);
    const S = res.sandbox; S.banner = await p.evaluate(() => document.getElementById("ver").textContent);
    S.palette = await p.evaluate(() => [...document.querySelectorAll("#skillBox [data-skill]")].map((b) => b.dataset.skill)); S.analogSwitch = await p.evaluate(() => !!document.getElementById("cFeint"));
    S.viButtons = await p.evaluate(() => [...document.querySelectorAll("#viBox button")].map((b) => b.textContent));
    const drive = async (mode) => { await p.evaluate((m) => { window.PT.reset(); document.querySelector(`#bar [data-mode="${m}"]`).click(); window.PT.keys(["KeyW"]); }, mode); await sleep(2600);
      await p.evaluate(() => { document.getElementById("bCruise").classList.contains("on") || document.getElementById("bCruise").click(); window.PT.keys([], ["KeyW"]); }); await sleep(900); };
    const ask = async (i) => { await p.evaluate((i) => document.querySelectorAll("#viBox [data-vi]")[i].click(), i); await sleep(2600);
      return p.evaluate(() => { const V = window.PT.V, L = V.sim.log.skill, x = L[L.length - 1], st = V.sim.stateAt(V.sim.t); return { result: x ? x.result : null, played: x ? x.played || null : null, line: document.getElementById("skillRes").textContent, vNow: +st.s.toFixed(2), poss: (V.sim.poss && V.sim.poss.log || []).filter((e) => e.from === "CONTROLLED" && e.to === "FREE").length }; }); };
    S.requests = [];
    for (const [mode, i, nm] of [["JOG", 0, "JOG · BODY FEINT fake L → exit R"], ["JOG", 1, "JOG · BODY FEINT fake R → exit L"], ["JOG", 2, "JOG · CROQUETA → LEFT"], ["JOG", 3, "JOG · CROQUETA → RIGHT"], ["RUN", 2, "RUN · CROQUETA → LEFT"], ["WALK", 0, "WALK · BODY FEINT fake L → exit R"], ["RUN", 0, "RUN · BODY FEINT fake L → exit R"]]) {
      await drive(mode); const o = await ask(i); S.requests.push(Object.assign({ nm }, o)); if (nm === "JOG · BODY FEINT fake L → exit R") await p.screenshot({ path: path.join(OUT, "sandbox_bf.jpg"), type: "jpeg", quality: 72 }); }
    S.logs = logs.slice(); S.http = http.slice();
  } finally { await b.close(); fs.rmSync(prof, { recursive: true, force: true }); }
  fs.writeFileSync(path.join(OUT, "vi_browser.json"), JSON.stringify(res, null, 1));
  const L = res.lab, S = res.sandbox;
  console.log(`LAB "${L.title}" · ${L.banner} · first section "${L.first}" · default ${L.defaultCase}`);
  for (const c of L.cards) console.log(`  card ${c.name} · ${c.rows} rows`); console.log(`  chains ${L.chains} · class table ${L.classRows} rows · old review sections left: ${L.oldSections.length}`);
  console.log(`  PLAY / MIRROR: ${L.plays.length} clicked · page ≡ node ${L.plays.filter((x) => x.same).length}/${L.plays.length} · all at 1× ${L.plays.every((x) => x.rate === 1)} · possession exits ${L.plays.reduce((a, x) => a + x.exits, 0)}`);
  for (const x of L.plays.filter((x) => !x.same || x.result !== "PLAYED")) console.log(`    ${x.mirror ? "MIRROR " : ""}${x.nm}: page ${x.result} ${x.played || ""} · node ${x.node} ${x.info}`);
  for (const x of L.ab) console.log(`  A | B ${x.title}: root max ${x.rootMaxMm} mm · ball max ${x.ballMaxMm} mm · contacts ${x.contactsSame ? "identical" : "DIFFER"} · A alone: ${x.aAlone.engine} ${x.aAlone.result}`);
  console.log(`  rates ${L.rates.map((r) => r.rate).join(" / ")} · TRY: ${L.tryInfo} · console errors ${L.logs.length} · HTTP errors ${L.http.length}`); if (L.logs.length) console.log("   ", L.logs.slice(0, 5)); if (L.http.length) console.log("   ", L.http.slice(0, 5));
  console.log(`SANDBOX ${S.banner} · palette ${S.palette.length} (ineligible present: ${S.palette.filter((x) => /OVERLAY|FEINT_OUTSIDE|FEINT_INSIDE|_SHALLOW|_STRONG/.test(x)).length}) · analog-feint switch ${S.analogSwitch ? "PRESENT" : "gone"} · ${S.viButtons.length} explicit buttons`);
  for (const r of S.requests) console.log(`  ${r.nm.padEnd(36)} ${r.result} ${r.played || ""} · ${r.line} · ${r.vNow} m/s now · possession exits ${r.poss}`);
  console.log(`  console errors ${S.logs.length} · HTTP errors ${S.http.length}`); if (S.logs.length) console.log("   ", S.logs.slice(0, 5)); })();
