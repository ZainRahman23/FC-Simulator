// lsi1/tools/oa_browser.cjs — OWNER INPUT ANALYSIS V1 in Chrome (headless): the analysis page and the lab's one change.
//   A  the analysis page: loads its JSON, renders every section with 0 console / HTTP errors; every family tab, the mirror toggle, the three
//      alignment anchors and every attempt's detail view drawn (each canvas painted); screenshots (NOT committed: the scratchpad)
//   B  the lab, default: the pad where it was (12 px from the left), padPos "left" recorded with an attempt
//   C  the lab, ?pad=centre: the pad centred in the view; a real pointer drag (CDP mouse events) far to the left records raw x well beyond the
//      old edge (1.38 radii) — the clipping the analysis found is gone; padPos "centre" recorded; 0 errors
//   PUPPETEER_NODE_MODULES=<dir> PT_TMP=<dir> node oa_browser.cjs --out <evidence dir> --shots <dir, not committed> [--base http://127.0.0.1:8362/sandbox/visual/]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8362/sandbox/visual/"), TMP = process.env.PT_TMP || os.tmpdir(); fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", checks = [], errors = {};
const ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
async function page(b, url, key, vp = { width: 1600, height: 940 }) { const p = await b.newPage(); await p.setViewport(vp); const L = (errors[key] = []);
  p.on("pageerror", (e) => L.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") L.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) L.push("HTTP " + r.status() + " " + r.url()); });
  await p.goto(BASE + url, { waitUntil: "load" }); return p; }
// the share of a canvas's pixels that differ from its panel surface (#141b18) — a drawn chart, not a blank panel
const painted = (p, id) => p.evaluate((id) => { const c = document.getElementById(id); if (!c || !c.width || c.style.display === "none") return null; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0, k = 0;
  for (let i = 0; i < d.length; i += 4 * 5) { k++; if (Math.abs(d[i] - 20) + Math.abs(d[i + 1] - 27) + Math.abs(d[i + 2] - 24) > 40) n++; } return +(100 * n / k).toFixed(2); }, id);
(async () => {
  const prof = fs.mkdtempSync(path.join(TMP, "oa-")), b = await puppeteer.launch({ executablePath: CHROME, headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1600,940"] });
  // ═══ A — the analysis page ═══
  let p = await page(b, "lsi1_owner_analysis.html", "analysis"); await p.waitForFunction(() => /real owner attempts/.test(document.getElementById("status").textContent), { timeout: 30000 });
  const st = await p.evaluate(() => document.getElementById("status").textContent); ok("the analysis page loads its JSON", /21 real owner attempts/.test(st), st);
  ok("the dataset table lists every label", await p.evaluate(() => document.querySelectorAll("#dsTable tr").length) >= 10);
  for (const id of ["cvOv1", "cvOv2"]) { const v = await painted(p, id); ok(`overview canvas ${id} drawn (% of pixels off the surface)`, v > 0.5, v); }
  ok("the opportunity table has rows", await p.evaluate(() => document.querySelectorAll("#oppTable tr").length) > 10);
  await p.screenshot({ path: path.join(SHOTS, "A0_top.jpg"), type: "jpeg", quality: 72, fullPage: false });
  const fams = await p.evaluate(() => [...document.querySelectorAll("#famTabs button")].map((b) => b.dataset.f));
  for (const F of fams) { await p.evaluate((F) => document.querySelector(`#famTabs button[data-f="${F}"]`).click(), F); await sleep(150);
    const neutral = await p.evaluate(() => document.getElementById("famNeutral").style.display !== "none");
    if (neutral) { ok(`family ${F}: the neutral description shown`, await p.evaluate(() => /RELEASED/.test(document.getElementById("famNeutral").textContent))); continue; }
    const P = [await painted(p, "cvPaths"), await painted(p, "cvAlign"), await painted(p, "cvAlignR"), await painted(p, "cvProbe")];
    ok(`family ${F}: paths · series · radius · probes drawn (% of pixels off the surface)`, P[0] > 0.5 && P[1] > 0.5 && P[2] > 0.5 && (P[3] == null || P[3] > 0.5), P);
    for (const an of ["onset", "peak", "side2"]) { await p.select("#anchorSel", an); await sleep(60); }
    await p.click("#bMirror"); await sleep(60); await p.click("#bMirror"); await sleep(60);
    const el = await p.$("#famShapeBox"); await el.screenshot({ path: path.join(SHOTS, `A1_family_${F.replace(/[^A-Z]+/g, "_")}.jpg`), type: "jpeg", quality: 72 }); }
  const opts = await p.evaluate(() => [...document.querySelectorAll("#detSel option")].map((o) => o.value)); let drawn = 0;
  for (const v of opts) { await p.select("#detSel", v); await sleep(40); const n = await painted(p, "cvDetail"); if (n == null ? await p.evaluate(() => /RELEASED/.test(document.getElementById("detInfo").textContent)) : n > 0.5) drawn++; }
  ok("every attempt's detail view drawn", drawn === opts.length, `${drawn}/${opts.length}`);
  await p.select("#detSel", "1"); await sleep(80); const det = await p.$("#cvDetail"); await det.screenshot({ path: path.join(SHOTS, "A2_detail_1.jpg"), type: "jpeg", quality: 72 });
  // hover: a tooltip over the first scatter's first point (drawn without error)
  const bb = await (await p.$("#cvOv1")).boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(60);
  ok("analysis page: 0 console / HTTP errors", errors.analysis.length === 0, errors.analysis.slice(0, 3));
  await p.setViewport({ width: 390, height: 844 }); await sleep(300); ok("phone width: no horizontal page scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await p.screenshot({ path: path.join(SHOTS, "A3_phone.jpg"), type: "jpeg", quality: 72 }); await p.close();
  // ═══ B / C — the lab's pad placement ═══
  async function labRun(q, key) { const lp = await page(b, "lsi1_lab.html" + q, key); await lp.waitForFunction(() => window.LSR && LSR.state && LSR.state() === "LIVE", { timeout: 120000 }); await sleep(800);
    const pad = await (await lp.$("#pad")).boundingBox(), sim = await (await lp.$("#simWrap")).boundingBox(), cx = pad.x + pad.width / 2, cy = pad.y + pad.height / 2;
    await lp.keyboard.press("Enter"); await sleep(400); await lp.mouse.move(cx, cy); await lp.mouse.down(); for (let i = 1; i <= 12; i++) { await lp.mouse.move(cx, cy - i * 8); await sleep(16); }
    for (let i = 1; i <= 40; i++) { await lp.mouse.move(Math.max(1, cx - i * 14), cy - 96); await sleep(16); } await sleep(300); await lp.mouse.up(); await sleep(300); await lp.keyboard.press("Enter");
    await lp.waitForFunction(() => LSR.state() === "REVIEW", { timeout: 30000 }); const info = await lp.evaluate(() => { const a = LSR.current(); return { padPos: a.input.padPos, minX: Math.min(...a.raw.data.x), padR: a.input.padRadiusPx }; });
    await lp.screenshot({ path: path.join(SHOTS, `B_${key}.jpg`), type: "jpeg", quality: 72 }); const r = { pad, sim, info, errs: errors[key] }; await lp.close(); return r; }
  const L0 = await labRun("", "lab_default");
  ok("lab default: the pad where it was (12 px from the view's left edge)", Math.abs(L0.pad.x - L0.sim.x - 12) < 3, { padX: L0.pad.x - L0.sim.x });
  ok("lab default: padPos 'left' recorded with the attempt", L0.info.padPos === "left", L0.info);
  ok("lab default: 0 console / HTTP errors", L0.errs.length === 0, L0.errs.slice(0, 3));
  const L1 = await labRun("?pad=centre", "lab_centre");
  ok("lab ?pad=centre: the pad centred in the view", Math.abs(L1.pad.x + L1.pad.width / 2 - (L1.sim.x + L1.sim.width / 2)) < 60, { padCentre: L1.pad.x + L1.pad.width / 2, viewCentre: L1.sim.x + L1.sim.width / 2 });
  ok("lab ?pad=centre: a leftward drag passes the old edge (raw x < −1.38 radii)", L1.info.minX < -2.5, L1.info);
  ok("lab ?pad=centre: padPos 'centre' recorded", L1.info.padPos === "centre");
  ok("lab ?pad=centre: 0 console / HTTP errors", L1.errs.length === 0, L1.errs.slice(0, 3));
  await b.close(); fs.rmSync(prof, { recursive: true, force: true });
  const bad = checks.filter((c) => !c.pass).length; console.log(`\n${bad ? `${bad} FAILED` : `ALL ${checks.length} CHECKS PASS`}`); fs.writeFileSync(path.join(OUT, "oa_browser.json"), JSON.stringify({ checks, errors }, null, 1)); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
