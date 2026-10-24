// possess1/tools/p_browser.cjs — TOUCHLINE — SHARED POSSESSION + REACTION V1 REVIEW in Chrome (headless): the page loads with 0 console / HTTP
// errors; every case simulates under all five modes and draws; the three views (SINGLE, OLD | MODE, ALL FIVE) draw their viewports; every mode
// selects; BALL off / DIAGNOSTICS off (the plain gameplay view) / BODY ONLY / SKELETON / BELIEFS render; the transport moves the playhead;
// TACKLE AT PLAYHEAD re-runs every mode; the page's outcomes equal node's (p_lab_cases.json). Screenshots → --shots (never committed: real
// players' models).   PUPPETEER_NODE_MODULES=<dir> node p_browser.cjs --out <evidence dir> --shots <dir> [--node <p_lab_cases.json>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8364/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"), "utf8")) : null; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const checks = [], ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "spb-")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 950 }); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
  const t0 = Date.now(); await p.goto(BASE + "possess1_lab.html?external=1&play=0", { waitUntil: "load" }); await p.waitForFunction(() => window.SP && SP.ready(), { timeout: 240000 });
  ok("the page loads (TOUCHLINE — SHARED POSSESSION + REACTION V1 REVIEW)", await p.evaluate(() => document.querySelector("#bar h1").textContent.includes("SHARED POSSESSION + REACTION V1 REVIEW")), `${((Date.now() - t0) / 1000).toFixed(1)} s to the first case`);
  // the share of each viewport that is not the clear colour
  const painted = (n) => p.evaluate((n) => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const cells = n === 1 ? [[0, 0, w, h]] : n === 2 ? [[0, 0, w / 2, h], [w / 2, 0, w / 2, h]] : [0, 1, 2, 3, 4].map((i) => [(i % 3) * w / 3, (1 - Math.floor(i / 3)) * h / 2, w / 3, h / 2]);
    return cells.map(([x0, y0, cw, ch]) => { let k = 0, m = 0; for (let y = Math.floor(y0) + 3; y < y0 + ch - 3; y += 9) for (let x = Math.floor(x0) + 3; x < x0 + cw - 3; x += 9) { const i = (y * w + x) * 4; k++; if (Math.abs(px[i] - 15) + Math.abs(px[i + 1] - 20) + Math.abs(px[i + 2] - 18) > 24) m++; } return Math.round(100 * m / Math.max(1, k)); }); }, n);
  const hashView = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h0 = c.height, px = new Uint8Array(w * h0 * 4); gl.readPixels(0, 0, w, h0, gl.RGBA, gl.UNSIGNED_BYTE, px); let h = 0; for (let i = 0; i < px.length; i += 4 * 13) h = (h * 31 + px[i] + 7 * px[i + 1] + 13 * px[i + 2]) >>> 0; return h; });
  const shot = async (name) => { const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, name + ".jpg"), type: "jpeg", quality: 72 }); };
  const ids = await p.evaluate(() => SP.L.cases.map((c) => c.id)); let drawn = 0, match = 0, compared = 0; const rows = [];
  for (const id of ids) { await p.evaluate((id) => SP.select(id), id); const T = await p.evaluate(() => SP.times()), rep = await p.evaluate(() => SP.report());
    await p.evaluate((t) => SP.seek(t), T.hits && T.hits.length ? T.hits[0] + 0.15 : 0.6); await sleep(20); const v = await painted(2); if (v.every((x) => x > 15)) drawn++;
    rows.push({ id, painted: v, outcomes: rep.outcomes, ms: rep.ms });
    if (NODE) { const n = NODE.find((x) => x.id === id); if (n) { compared++; if (JSON.stringify(n.outcomes) === JSON.stringify(rep.outcomes)) match++; else console.log("   ≠", id, JSON.stringify(n.outcomes), JSON.stringify(rep.outcomes)); } }
    if (["carry-jog-l", "race", "croq-win", "in-croq", "in-turn", "cut"].includes(id)) await shot(`case_${id}_old_vs_medium`); }
  ok("every case simulates all five modes and draws (OLD | MODE)", drawn === ids.length, `${drawn}/${ids.length}`);
  if (NODE) ok("the page's outcomes equal node's, every mode", match === compared && compared > 0, `${match}/${compared}`);
  // the views and the modes
  await p.evaluate(() => SP.select("race")); const T = await p.evaluate(() => SP.times()); await p.evaluate((t) => SP.seek(t), T.hits[0] + 1.2);
  for (const [lay, n] of [["1", 1], ["2", 2], ["5", 5]]) { await p.evaluate((l) => { SP.layout(l); SP.seek(SP.L.t - SP.L.cur.t0); }, lay); await sleep(30); const v = await painted(n); ok(`view ${lay === "1" ? "SINGLE" : lay === "2" ? "OLD | MODE" : "ALL FIVE"}: every viewport draws`, v.every((x) => x > 15), v); await shot(`view_${lay}_race`); }
  const hs = {}; await p.evaluate(() => SP.layout("1")); for (const m of ["OLD", "NONE", "SHORT", "MEDIUM", "LONG"]) { await p.evaluate((m) => { SP.mode(m); SP.seek(SP.L.t - SP.L.cur.t0); }, m); await sleep(20); hs[m] = await hashView(); }
  ok("the five modes draw different replays of the same case (race, 1.2 s after the contact)", new Set(Object.values(hs)).size >= 3, hs);
  // the toggles: the plain gameplay view (ball hidden, diagnostics off), body only, skeleton, beliefs
  await p.evaluate(() => { SP.layout("2"); SP.mode("MEDIUM"); }); const seen = {};
  for (const [nm, o] of [["plain (diagnostics off)", { diag: 0 }], ["ball hidden, diagnostics off", { ball: 0, diag: 0 }], ["body only", { body: 1, diag: 0 }], ["skeleton", { skel: 1, diag: 1 }], ["beliefs + diagnostics", { skel: 0, body: 0, ball: 1, diag: 1, beliefs: 1 }]]) {
    await p.evaluate((o) => SP.set(o), o); await p.evaluate(() => SP.select("carry-jog-l")); const T2 = await p.evaluate(() => SP.times()); await p.evaluate((t) => SP.seek(t), T2.hits[0] + 0.08); await sleep(20); seen[nm] = (await painted(2)).every((x) => x > 15); await shot("toggle_" + nm.replace(/[^a-z]+/g, "_")); }
  ok("the toggles render (plain gameplay view, ball hidden, body only, skeleton, beliefs)", Object.values(seen).every(Boolean), seen);
  const diagHidden = await p.evaluate(() => { SP.set({ diag: 0 }); return document.getElementById("diag").classList.contains("hidden"); }); ok("DIAGNOSTICS off hides the panel and the overlays", diagHidden); await p.evaluate(() => SP.set({ diag: 1 }));
  const diagText = await p.evaluate(() => { SP.mode("MEDIUM"); SP.seek(SP.times().hits[0] + 0.05); return document.getElementById("diag").textContent; });
  ok("the diagnostics show the authority, both players' knowledge, plans, next planned and actual touches, the record", ["BALL AUTHORITY", "knowledge:", "next planned touch", "actual next touch", "REACTING", "THE RECORD", "PERCEIVED"].every((s) => diagText.includes(s)));
  // the transport
  const ta = await p.evaluate(() => SP.L.t); await p.click("#bFwd"); const tb = await p.evaluate(() => SP.L.t); ok("frame step moves the playhead 4 ticks", Math.abs(tb - ta - 4 / 240) < 1e-6, (tb - ta) * 240);
  // TACKLE AT PLAYHEAD
  await p.evaluate(() => { SP.select("notackle"); SP.seek(0.62); }); await p.click("#bTry"); const r2 = await p.evaluate(() => SP.report()); ok("TACKLE AT PLAYHEAD re-runs every mode with the request there", Object.values(r2.outcomes).filter(Boolean).length === 5, r2.outcomes);
  ok("0 console / HTTP errors", errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(path.join(OUT, "browser.json"), JSON.stringify({ checks, rows, errs }, null, 1)); console.log(`\n${checks.filter((c) => c.pass).length} / ${checks.length} checks pass`); await b.close(); process.exit(checks.every((c) => c.pass) ? 0 : 1); })().catch((e) => { console.error(e); process.exit(2); });
