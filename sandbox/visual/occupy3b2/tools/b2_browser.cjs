// occupy3b2/tools/b2_browser.cjs — TOUCHLINE — STAGE 3B.2 RECOVERY-STEP & LANDING GEOMETRY REVIEW in Chrome (headless; the 3B.1 harness adapted): the page
// loads with 0 console / HTTP errors; every case simulates STAGE 3B.1 and STAGE 3B.2 and both viewports draw; the page's numbers equal node's
// (b2_lab_cases.json: deepest, torso, legs, ticks > 5 cm, outcome, impacts, each player's severity / balance / action / steps, the strikes, Σ impulse, 3B.2's
// decisions and NO_FEASIBLE results); the layouts; 3B.1 and 3B.2 draw different replays where 3B.2 acts; SKIN / SKELETON; every overlay toggles (the four
// new ones: PLACEMENT, PREDICTED LEGS, ANCHORS, FOOT TRAILS); OLD STAGE 3 selectable; the eight cameras; 1× / 0.5× / 0.25×; frame step; loop.
// Stills → --shots (never committed: real players' models).
//   PUPPETEER_NODE_MODULES=<dir> PT_TMP=<dir> node b2_browser.cjs --out <evidence dir> --shots <dir> [--node <b2_lab_cases.json>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8367/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"), "utf8")) : null; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const checks = [], ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "b2b-")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 950 }); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400) errs.push("http " + r.status() + " " + r.url()); });
  const t0 = Date.now(); await p.goto(BASE + "occupy3b2_lab.html?external=1&play=0", { waitUntil: "load" }); await p.waitForFunction(() => window.IL && IL.ready(), { timeout: 300000 });
  ok("the page loads (TOUCHLINE — STAGE 3B.2 RECOVERY-STEP & LANDING GEOMETRY REVIEW)", await p.evaluate(() => document.querySelector("#bar h1").textContent.includes("LANDING GEOMETRY REVIEW")), `${((Date.now() - t0) / 1000).toFixed(1)} s to the first case`);
  const painted = (n) => p.evaluate((n) => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return Array.from({ length: n }, (_, i) => [i * w / n, 0, w / n, h]).map(([x0, y0, cw, ch]) => { let k = 0, m = 0; for (let y = Math.floor(y0) + 3; y < y0 + ch - 3; y += 9) for (let x = Math.floor(x0) + 3; x < x0 + cw - 3; x += 9) { const i = 4 * (y * w + x); m++; if (px[i] + px[i + 1] + px[i + 2] > 60) k++; } return Math.round(100 * k / Math.max(1, m)); }); }, n);
  const overlayInk = () => p.evaluate(() => { const c = document.getElementById("ov"), x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; });
  const hashView = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h0 = c.height, px = new Uint8Array(w * h0 * 4); gl.readPixels(0, 0, w, h0, gl.RGBA, gl.UNSIGNED_BYTE, px); let hsh = 0; for (let i = 0; i < px.length; i += 97) hsh = (hsh * 31 + px[i]) | 0; return hsh; });
  const shot = async (name) => { const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, name + ".jpg"), type: "jpeg", quality: 72 }); };
  const ids = await p.evaluate(() => [...new Set(IL.L.cases.map((c) => c.id))]); let drawn = 0, match = 0, compared = 0; const mism = [];
  const near = (a, q) => Math.abs(Math.max(0, a) - Math.max(0, q)) < 1e-9;
  for (const id of ids) { process.stderr.write(`[${new Date().toISOString().slice(11, 19)}] ${id}\n`); await p.evaluate((id) => IL.select(id), id); const rep = await p.evaluate(() => IL.report()), b2 = await p.evaluate(() => IL.b2());
    const tb = await p.evaluate(() => { const C = IL.L.cur, R = C.runs[C.modes[1]]; return R.bestK != null ? R.bestK / 240 - C.t0 : 0.5; }); await p.evaluate((t) => IL.seek(t), tb); await sleep(15); const v = await painted(2); if (v.every((x) => x > 15)) drawn++;
    if (NODE) { const n = NODE.find((x) => x.id === id); if (n) { compared++; const same = ["S3B", "S3B2"].every((m) => { const a = n.runs[m], q = rep.runs[m]; if (!a || !q) return false; const pe = (e) => JSON.stringify(e.map((x) => Object.fromEntries(Object.entries(x.players).map(([k, y]) => [k, [y.sev, y.cls, y.outcome, y.steps]]))));
        return near(a.best, q.best) && near(a.trunk, q.trunk) && near(a.legs, q.legs) && a.over5 === q.over5 && a.out === q.out && a.impacts === q.impacts && pe(a.eps) === pe(q.eps) && a.strikes === q.strikes && Math.abs(a.lamSum - q.lamSum) < 1e-6 && (m !== "S3B2" || (b2 && b2.S3B2 && b2.S3B2.decisions === a.decisions && JSON.stringify(b2.S3B2.results.map((r) => r.cons)) === JSON.stringify(a.results))); });
        if (same) match++; else mism.push(id); } }
    if (["both-committed", "bf-into", "face", "x120-run", "x30-jog", "croq-between", "carry-jog-l", "side", "in-croq"].includes(id)) await shot(`case_${id}`); }
  ok("every case simulates STAGE 3B.1 and STAGE 3B.2 and both viewports draw", drawn === ids.length, `${drawn}/${ids.length}`);
  if (NODE) ok("the page's numbers equal node's (deepest, torso, legs, ticks > 5 cm, outcome, impacts, each player's severity / balance / action / steps, strikes, Σ impulse, 3B.2's decisions and NO_FEASIBLE results), both stages", match === compared && compared > 0, `${match}/${compared}${mism.length ? " — differ: " + mism.slice(0, 8).join(", ") : ""}`);
  // the views (a case where 3B.2 acts: a Body Feint into a standing player — the recovery steps placed)
  await p.evaluate(() => IL.select("bf-into")); const tA = await p.evaluate(() => { const C = IL.L.cur, R = C.runs[C.modes[1]], d = R.W.b2.decisions.find((x) => x.kind === "RECOVERY"); return d ? d.t - C.t0 + 0.02 : 0.75; }); await p.evaluate((t) => IL.seek(t), tA);
  for (const [lay, n, nm] of [["2", 2, "3B.1 | 3B.2"], ["S3", 1, "LEFT (3B.1)"], ["S3B", 1, "RIGHT (3B.2)"]]) { await p.evaluate((l) => { IL.layout(l); IL.seek(IL.L.t - IL.L.cur.t0); }, lay); await sleep(25); const v = await painted(n); ok(`view ${nm} draws`, v.every((x) => x > 15), v); await shot(`layout_${lay}`); }
  const hv = {}; await p.evaluate((t) => IL.seek(t + 0.3), tA); for (const m of ["S3", "S3B"]) { await p.evaluate((m) => { IL.layout(m); IL.seek(IL.L.t - IL.L.cur.t0); }, m); hv[m] = await hashView(); }
  ok("STAGE 3B.1 and STAGE 3B.2 draw different replays where 3B.2 acts", hv.S3 !== hv.S3B, hv);
  await p.evaluate(() => IL.layout("2")); const bh = {}; for (const s of ["skin", "skel", "both"]) { await p.evaluate((s) => { IL.show(s); IL.seek(IL.L.t - IL.L.cur.t0); }, s); await sleep(20); bh[s] = await hashView(); }
  ok("SKIN / SKELETON / SKIN + SKELETON draw (skeleton-only differs from skin)", bh.skin !== bh.skel, bh); await p.evaluate(() => IL.show("skin"));
  // the overlays at a 3B.2 decision (every new overlay has something to draw there)
  await p.evaluate((t) => IL.seek(t), tA);
  const KEYS = ["plc", "fcv", "anc", "ftr", "ball", "vol", "sup", "bal", "nrm", "imp", "stp", "trl", "hud", "ref", "lc", "lv", "vp", "mom"], all = Object.fromEntries(KEYS.map((k) => [k, false]));
  for (const k of KEYS) { await p.evaluate((t) => { IL.layout("S3B"); IL.seek(t); }, tA); await p.evaluate((o) => IL.set(o), all); const off = await overlayInk(); await p.evaluate((o) => IL.set(o), Object.assign({}, all, { [k]: true })); const on = await overlayInk(); ok(`overlay ${k} toggles`, on !== off || ["ball", "ref", "lv", "mom", "vp", "lc", "stp", "imp"].includes(k), { off, on }); }
  await p.evaluate((o) => IL.set(o), Object.assign({}, all, { plc: true, fcv: true, anc: true, ftr: true, hud: true, sup: true })); await shot("overlays_3b2"); await p.evaluate((o) => IL.set(o), Object.assign({}, all, { plc: true, fcv: true, anc: true, ftr: true, hud: true }));
  // the diagnostics panel: 3B.2's record of the case
  const diag = await p.evaluate(() => { IL.set({ diag: true }); return document.getElementById("diag").textContent; }); ok("the diagnostics panel carries 3B.2's record (decisions, NO_FEASIBLE, deviations, released plants, boots)", /STAGE 3B\.2 · PLACEMENT/.test(diag) && /plants released/.test(diag), ""); await p.evaluate(() => IL.set({ diag: false }));
  // OLD STAGE 3 selectable
  const sel = await p.evaluate(() => { IL.modes("S3", "S3B2"); IL.select("headon-jog"); const r = IL.report(); return Object.keys(r.runs); }); ok("OLD STAGE 3 selectable beside 3B.2", sel.includes("S3") && sel.includes("S3B2"), sel); await p.evaluate(() => IL.modes("B:F+M", "S3B2"));
  // the cameras, the rates, frame step, loop
  await p.evaluate(() => { IL.layout("2"); IL.select("bf-into"); }); await p.evaluate((t) => IL.seek(t), tA); let camOk = 0; for (const c of ["gameplay", "front", "rear", "sideL", "sideR", "q3f", "q3r", "top"]) { await p.evaluate((c) => IL.cam(c), c); await sleep(15); const v = await painted(2); if (v.every((x) => x > 10)) camOk++; if (["front", "top", "q3f"].includes(c)) await shot(`cam_${c}`); } ok("the eight cameras draw", camOk === 8, `${camOk}/8`);
  await p.evaluate(() => IL.cam("gameplay")); const rates = []; for (const r of [1, 0.5, 0.25]) { await p.evaluate((t) => IL.seek(t), 0.2); const a = await p.evaluate(() => IL.L.t); await p.evaluate((r) => { IL.play(r); IL.live(); }, r); await sleep(700); const b2 = await p.evaluate(() => IL.L.t); rates.push(+((b2 - a) / 0.7).toFixed(2)); }
  ok("1× / 0.5× / 0.25× play at their rates", rates[0] > rates[1] && rates[1] > rates[2] && rates[2] > 0, rates);
  await p.evaluate(() => { IL.L.playing = false; IL.seek(0.5); }); const s0 = await p.evaluate(() => IL.L.t); await p.keyboard.press("."); const s1 = await p.evaluate(() => IL.L.t); await p.keyboard.down("Shift"); await p.keyboard.press("."); await p.keyboard.up("Shift"); const s2 = await p.evaluate(() => IL.L.t);
  ok("frame step (4 ticks; shift: 1 tick)", Math.abs(s1 - s0 - 4 / 240) < 1e-6 && Math.abs(s2 - s1 - 1 / 240) < 1e-6, [s1 - s0, s2 - s1]);
  await p.evaluate(() => document.getElementById("bLoop").click()); ok("loop toggles", await p.evaluate(() => IL.L.loop === true));
  ok("0 console / page / HTTP errors", errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(path.join(OUT, "browser.json"), JSON.stringify({ checks, errs }, null, 1)); console.log(`${checks.filter((c) => c.pass).length}/${checks.length} checks pass`); await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
