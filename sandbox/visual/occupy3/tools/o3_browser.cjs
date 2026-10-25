// occupy3/tools/o3_browser.cjs — TOUCHLINE — PLAYER IMPACT + BALANCE V1 REVIEW in Chrome (headless; Stage 2's o2_browser.cjs adapted): the page loads
// with 0 console / HTTP errors; every case simulates STAGE 2 and STAGE 3 and both viewports draw; the page's numbers (deepest penetration, torso,
// legs, ticks > 5 cm, the tackle outcome, Stage 3's impacts and each player's severity / balance / action / steps) equal node's (lab_cases.json);
// the layouts draw; the two stages draw different replays of the same inputs; SKIN / SKELETON / SKIN + SKELETON; the overlays toggle (BALL, CONTACT
// VOLUMES, SUPPORT, CENTRE OF MASS · BALANCE, CONTACT NORMAL, IMPACT VECTOR, RECOVERY STEP, TRAILS, STAGE 2 GHOST, FRAME DATA, DIAGNOSTICS); the
// diagnostics carry every live quantity the owner listed; the eight cameras draw; 1× / 0.5× / 0.25× play; frame step; loop.
// Screenshots → --shots (never committed: real players' models).
//   PUPPETEER_NODE_MODULES=<dir> node o3_browser.cjs --out <evidence dir> --shots <dir> [--node <lab_cases.json>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8365/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"), "utf8")) : null; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const checks = [], ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "o3b-")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, protocolTimeout: 900000, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 950 }); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
  const t0 = Date.now(); await p.goto(BASE + "occupy3_lab.html?external=1&play=0", { waitUntil: "load" }); await p.waitForFunction(() => window.IL && IL.ready(), { timeout: 240000 });
  ok("the page loads (TOUCHLINE — PLAYER IMPACT + BALANCE V1 REVIEW)", await p.evaluate(() => document.querySelector("#bar h1").textContent.includes("PLAYER IMPACT + BALANCE V1 REVIEW")), `${((Date.now() - t0) / 1000).toFixed(1)} s to the first case`);
  const painted = (n) => p.evaluate((n) => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return Array.from({ length: n }, (_, i) => [i * w / n, 0, w / n, h]).map(([x0, y0, cw, ch]) => { let k = 0, m = 0; for (let y = Math.floor(y0) + 3; y < y0 + ch - 3; y += 9) for (let x = Math.floor(x0) + 3; x < x0 + cw - 3; x += 9) { const i = (y * w + x) * 4; k++; if (Math.abs(px[i] - 15) + Math.abs(px[i + 1] - 20) + Math.abs(px[i + 2] - 18) > 30) m++; } return Math.round(100 * m / Math.max(1, k)); }); }, n);
  const overlayInk = () => p.evaluate(() => { const c = document.getElementById("ov"), x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 20) n++; return n; });
  const hashView = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h0 = c.height, px = new Uint8Array(w * h0 * 4); gl.readPixels(0, 0, w, h0, gl.RGBA, gl.UNSIGNED_BYTE, px); let h = 0; for (let i = 0; i < px.length; i += 97) h = (h * 31 + px[i]) >>> 0; return h; });
  const shot = async (name) => { const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, name + ".jpg"), type: "jpeg", quality: 72 }); };
  const ids = await p.evaluate(() => IL.L.cases.map((c) => c.id)); let drawn = 0, match = 0, compared = 0; const rows = [], mism = [];
  for (const id of ids) { await p.evaluate((id) => IL.select(id), id); const rep = await p.evaluate(() => IL.report()), ep = rep.runs.S3.eps[0], tb = ep ? ep.t0 + 0.15 : 0.6;
    await p.evaluate((t) => IL.seek(t), tb); await sleep(15); const v = await painted(2); if (v.every((x) => x > 15)) drawn++; rows.push({ id, painted: v, runs: rep.runs });
    if (NODE) { const n = NODE.find((x) => x.id === id); if (n) { compared++; const same = ["S2D", "S3"].every((m) => { const a = n.runs[m], q = rep.runs[m]; return Math.abs(Math.max(0, a.best) - Math.max(0, q.best)) < 1e-4 && Math.abs(Math.max(0, a.trunk) - Math.max(0, q.trunk)) < 1e-4 && Math.abs(Math.max(0, a.legs) - Math.max(0, q.legs)) < 1e-4 && a.over5 === q.over5 && a.out === q.out && a.impacts === q.impacts && JSON.stringify(a.eps.map((e) => e.players)) === JSON.stringify(q.eps.map((e) => e.players)); }); if (same) match++; else mism.push(id); } }
    if (["static-jog", "headon-jog", "oblique", "bf-shoulder", "bf-fake", "in-bf", "croq-hip", "croq-leg", "croq-before", "croq-after", "carry-walk", "both-committed"].includes(id)) await shot(`case_${id}_impact`); }
  ok("every case simulates STAGE 2 and STAGE 3 and both viewports draw", drawn === ids.length, `${drawn}/${ids.length}`);
  if (NODE) ok("the page's numbers equal node's (deepest, torso, legs, ticks > 5 cm, outcome, impacts, each player's severity / balance / action / steps), both stages", match === compared && compared > 0, `${match}/${compared}${mism.length ? " — differ: " + mism.slice(0, 6).join(", ") : ""}`);
  // the views
  await p.evaluate(() => IL.select("bf-fake")); const R0 = await p.evaluate(() => IL.report()); const tImp = R0.runs.S3.eps[0].t0 + 0.3; await p.evaluate((t) => IL.seek(t), tImp);
  for (const [lay, n, nm] of [["2", 2, "STAGE 2 | STAGE 3"], ["S2D", 1, "STAGE 2"], ["S3", 1, "STAGE 3"]]) { await p.evaluate((l) => { IL.layout(l); IL.seek(IL.L.t - IL.L.cur.t0); }, lay); await sleep(25); const v = await painted(n); ok(`view ${nm} draws`, v.every((x) => x > 15), v); await shot(`layout_${lay}`); }
  const hv = {}; for (const m of ["S2D", "S3"]) { await p.evaluate((m) => { IL.layout(m); IL.seek(IL.L.t - IL.L.cur.t0); }, m); hv[m] = await hashView(); }
  ok("STAGE 2 and STAGE 3 draw different replays of the same inputs (the feint into the recovering tackle, 0.3 s after the impact)", hv.S2D !== hv.S3, hv);
  await p.evaluate(() => IL.layout("2")); const bh = {}; for (const s of ["skin", "skel", "both"]) { await p.evaluate((s) => { IL.show(s); IL.seek(IL.L.t - IL.L.cur.t0); }, s); await sleep(20); bh[s] = await hashView(); await shot(`body_${s}`); }
  ok("SKIN / SKELETON / SKIN + SKELETON draw (skeleton-only differs from skin)", bh.skin !== bh.skel, bh); await p.evaluate(() => IL.show("skin"));
  // overlays (the diagnostics panel stays on while compared: hiding it widens the canvas, and the ink with it)
  // (the frame: just after the first recovery step is planned — every overlay then has something to draw, the step's target included)
  const tOv = await p.evaluate(() => { const C = IL.L.cur, e = C.runs.S3.W.imp.events.find((x) => x.kind === "RECOVERY STEP"); return e ? e.t - C.t0 + 0.05 : null; });
  await p.evaluate((t) => { IL.layout("S3"); IL.seek(t); }, tOv != null ? tOv : R0.runs.S3.eps[0].t0 + 0.12); const all = { ball: 1, vol: 1, sup: 1, bal: 1, nrm: 1, imp: 1, stp: 1, trl: 1, ghost: 1, hud: 1, diag: 1 };
  await p.evaluate((o) => IL.set(o), all); await sleep(20); const inkAll = await overlayInk(); await shot("overlay_all"); const off = {};
  for (const k of ["vol", "sup", "bal", "nrm", "imp", "stp", "trl", "ghost", "hud"]) { await p.evaluate((o) => IL.set(o), Object.assign({}, all, { [k]: 0 })); await sleep(15); off[k] = inkAll - (await overlayInk()); }
  ok("each overlay draws something when on (CONTACT VOLUMES, SUPPORT, CENTRE OF MASS · BALANCE, CONTACT NORMAL, IMPACT VECTOR, RECOVERY STEP, TRAILS, STAGE 2 GHOST, FRAME DATA)", Object.values(off).every((v) => v > 0), off);
  await p.evaluate(() => IL.set({ diag: 0 })); await sleep(15); ok("DIAGNOSTICS off hides the panel", await p.evaluate(() => document.getElementById("diag").classList.contains("hidden"))); await p.evaluate((o) => IL.set(o), all);
  const bt = {}; for (const v of [1, 0]) { await p.evaluate((v) => { IL.set({ ball: v }); }, v); bt[v] = await hashView(); } ok("BALL shown / hidden", bt[1] !== bt[0]);
  const diagText = await p.evaluate(() => document.getElementById("diag").textContent), frameTxt = await p.evaluate(() => { const L = IL.L; return L.hud; });
  const need = ["IMPACT #", "CONTACT REGIONS", "RELATIVE VELOCITY", "POSSESSION", "STAGE 3 AT THIS TICK", "perturbation u", "capture point", "slack", "drawn pelvis", "posture lean", "STAGE 3 EVENTS", "THE REFEREE FACTS", "balance loss", "action disruption", "deepest", "tackle outcome"];
  ok("the diagnostics carry the live quantities (contact regions, relative velocity, impact / severity, support, balance, action, interruption, possession, penetration, the referee facts)", need.every((s) => diagText.includes(s)) && frameTxt, need.filter((s) => !diagText.includes(s)));
  // cameras
  const cams = ["gameplay", "front", "rear", "sideL", "sideR", "q3f", "q3r", "top"], ch = {}; let camOk = true; await p.evaluate(() => IL.layout("2"));
  for (const c of cams) { await p.evaluate((c) => IL.cam(c), c); await sleep(20); const v = await painted(2); if (!v.every((x) => x > 15)) camOk = false; ch[c] = await hashView(); await shot(`cam_${c}`); }
  ok("the eight cameras draw, each a different view", camOk && new Set(Object.values(ch)).size === cams.length, Object.keys(ch).length); await p.evaluate(() => IL.cam("gameplay"));
  // transport
  const ta = await p.evaluate(() => IL.L.t); await p.click("#bFwd"); const tb2 = await p.evaluate(() => IL.L.t); ok("frame step moves the playhead 4 ticks", Math.abs(tb2 - ta - 4 / 240) < 1e-6, (tb2 - ta) * 240);
  await p.keyboard.down("Shift"); await p.click("#bFwd"); await p.keyboard.up("Shift"); const tc2 = await p.evaluate(() => IL.L.t); ok("shift + frame step moves one tick", Math.abs(tc2 - tb2 - 1 / 240) < 1e-6, (tc2 - tb2) * 240);
  const rates = {}; for (const r of [1, 0.5, 0.25]) { await p.evaluate((r) => { IL.live(); IL.seek(0); IL.play(r); }, r); await sleep(600); rates[r] = await p.evaluate(() => { IL.L.playing = false; return IL.L.t - IL.L.cur.t0; }); }
  ok("1× / 0.5× / 0.25× play at their rates (the playhead after 0.6 s of wall clock)", rates[1] > rates[0.5] && rates[0.5] > rates[0.25] && rates[0.25] > 0, rates);
  await p.click("#bLoop"); const looped = await p.evaluate(async () => { const C = IL.L.cur; IL.L.t = C.clip[1] - 0.01; IL.play(1); await new Promise((r) => setTimeout(r, 300)); const t = IL.L.t; IL.L.playing = false; return t < C.clip[1] - 0.05; }); ok("LOOP returns to the start", looped);
  await p.evaluate(() => { IL.L.t = IL.L.cur.clip[1] - 0.2; }); await p.click("#bReplay"); const rp = await p.evaluate(() => IL.L.t - IL.L.cur.clip[0]); ok("REPLAY restarts the case", rp < 0.2, rp);
  ok("0 console / HTTP errors", errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(path.join(OUT, "browser.json"), JSON.stringify({ checks, rows, errs }, null, 1)); console.log(`\n${checks.filter((c) => c.pass).length} / ${checks.length} checks pass`); await b.close(); process.exit(checks.every((c) => c.pass) ? 0 : 1); })().catch((e) => { console.error(e); process.exit(2); });
