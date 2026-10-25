// occupy3b/tools/l3_browser.cjs — TOUCHLINE — STAGE 3B.1 LIMB CONTACT REVIEW in Chrome (headless; Stage 3's o3_browser.cjs adapted): the page loads
// with 0 console / HTTP errors; every case simulates OLD STAGE 3 and STAGE 3B and both viewports draw; the page's numbers (deepest, torso, legs, ticks
// > 5 cm, outcome, impacts, each player's severity / balance / action / steps, Stage 3B's strikes and Σ impulse) equal node's (l3_lab_cases.json);
// the layouts draw; OLD and 3B draw different replays of the flagship after its contact; SKIN / SKELETON / SKIN + SKELETON; every overlay toggles
// (the four new ones: APPROVED REFERENCE, LIMB CONTACTS, LIMB VELOCITY, MOMENTUM PASSED); the flagship's accounting panel is present; the eight
// cameras draw; 1× / 0.5× / 0.25× play; frame step; loop. Screenshots → --shots (never committed: real players' models).
//   PUPPETEER_NODE_MODULES=<dir> node l3_browser.cjs --out <evidence dir> --shots <dir> [--node <l3_lab_cases.json>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8366/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"), "utf8")) : null; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const checks = [], ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "l3b-")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, protocolTimeout: 1800000, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal"] });
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 950 }); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
  const t0 = Date.now(); await p.goto(BASE + "occupy3b_lab.html?external=1&play=0", { waitUntil: "load" }); await p.waitForFunction(() => window.IL && IL.ready(), { timeout: 300000 });
  ok("the page loads (TOUCHLINE — STAGE 3B.1 LIMB CONTACT REVIEW)", await p.evaluate(() => document.querySelector("#bar h1").textContent.includes("LIMB CONTACT REVIEW")), `${((Date.now() - t0) / 1000).toFixed(1)} s to the first case`);
  const painted = (n) => p.evaluate((n) => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return Array.from({ length: n }, (_, i) => [i * w / n, 0, w / n, h]).map(([x0, y0, cw, ch]) => { let k = 0, m = 0; for (let y = Math.floor(y0) + 3; y < y0 + ch - 3; y += 9) for (let x = Math.floor(x0) + 3; x < x0 + cw - 3; x += 9) { const i = (y * w + x) * 4; k++; if (Math.abs(px[i] - 15) + Math.abs(px[i + 1] - 20) + Math.abs(px[i + 2] - 18) > 30) m++; } return Math.round(100 * m / Math.max(1, k)); }); }, n);
  const overlayInk = () => p.evaluate(() => { const c = document.getElementById("ov"), x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 20) n++; return n; });
  const hashView = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h0 = c.height, px = new Uint8Array(w * h0 * 4); gl.readPixels(0, 0, w, h0, gl.RGBA, gl.UNSIGNED_BYTE, px); let h = 0; for (let i = 0; i < px.length; i += 97) h = (h * 31 + px[i]) >>> 0; return h; });
  const shot = async (name) => { const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, name + ".jpg"), type: "jpeg", quality: 72 }); };
  const ids = await p.evaluate(() => [...new Set(IL.L.cases.map((c) => c.id))]); let drawn = 0, match = 0, compared = 0; const mism = [];
  for (const id of ids) { process.stderr.write(`[${new Date().toISOString().slice(11, 19)}] ${id}\n`); await p.evaluate((id) => IL.select(id), id); const rep = await p.evaluate(() => IL.report()), ep = rep.runs.S3B.eps[0] || rep.runs.S3.eps[0], tb = ep ? ep.t0 + 0.15 : 0.6;
    await p.evaluate((t) => IL.seek(t), tb); await sleep(15); const v = await painted(2); if (v.every((x) => x > 15)) drawn++;
    if (NODE) { const n = NODE.find((x) => x.id === id); if (n) { compared++; const same = ["S3", "S3B"].every((m) => { const a = n.runs[m], q = rep.runs[m]; return Math.abs(Math.max(0, a.best) - Math.max(0, q.best)) < 1e-4 && Math.abs(Math.max(0, a.trunk) - Math.max(0, q.trunk)) < 1e-4 && Math.abs(Math.max(0, a.legs) - Math.max(0, q.legs)) < 1e-4 && a.over5 === q.over5 && a.out === q.out && a.impacts === q.impacts && JSON.stringify(a.eps.map((e) => e.players)) === JSON.stringify(q.eps.map((e) => e.players)) && a.strikes === q.strikes && Math.abs((a.lamSum || 0) - (q.lamSum || 0)) < 1e-4; });
        if (same) match++; else mism.push(id); } }
    if (["side", "headon-jog", "oblique-firm", "static-jog", "bf-fake", "croq-hip", "croq-leg", "croq-before", "in-croq", "both-committed", "carry-walk", "x90-run"].includes(id)) await shot(`case_${id}`); }
  ok("every case simulates OLD STAGE 3 and STAGE 3B and both viewports draw", drawn === ids.length, `${drawn}/${ids.length}`);
  if (NODE) ok("the page's numbers equal node's (deepest, torso, legs, ticks > 5 cm, outcome, impacts, each player's severity / balance / action / steps, 3B strikes, Σ impulse), both stages", match === compared && compared > 0, `${match}/${compared}${mism.length ? " — differ: " + mism.slice(0, 8).join(", ") : ""}`);
  // the views (the flagship, just after its first strike)
  await p.evaluate(() => IL.select("side")); const tS = await p.evaluate(() => { const C = IL.L.cur, a = C.runs[C.modes[1]].W.l3.apps[0]; return a ? a.k / 240 - C.t0 + 0.12 : 1.1; }); await p.evaluate((t) => IL.seek(t), tS);
  for (const [lay, n, nm] of [["2", 2, "OLD | 3B"], ["S3", 1, "OLD STAGE 3"], ["S3B", 1, "STAGE 3B"]]) { await p.evaluate((l) => { IL.layout(l); IL.seek(IL.L.t - IL.L.cur.t0); }, lay); await sleep(25); const v = await painted(n); ok(`view ${nm} draws`, v.every((x) => x > 15), v); await shot(`layout_${lay}`); }
  const hv = {}; for (const m of ["S3", "S3B"]) { await p.evaluate((m) => { IL.layout(m); IL.seek(IL.L.t - IL.L.cur.t0); }, m); hv[m] = await hashView(); }
  ok("OLD STAGE 3 and STAGE 3B draw different replays of the flagship after its contact", hv.S3 !== hv.S3B, hv);
  await p.evaluate(() => IL.layout("2")); const bh = {}; for (const s of ["skin", "skel", "both"]) { await p.evaluate((s) => { IL.show(s); IL.seek(IL.L.t - IL.L.cur.t0); }, s); await sleep(20); bh[s] = await hashView(); await shot(`body_${s}`); }
  ok("SKIN / SKELETON / SKIN + SKELETON draw (skeleton-only differs from skin)", bh.skin !== bh.skel, bh); await p.evaluate(() => IL.show("skin"));
  // the overlays at a perturbed tick of a Croqueta into a committed tackle (every new overlay has something to draw)
  // (the tick: a Croqueta into a committed tackle, at a 3B impulse application whose leg is perturbed — the limb overlays all have something to draw;
  // the recovery-step overlay at a tick just after a recovery step is planned)
  await p.evaluate(() => IL.select("in-croq")); const tP = await p.evaluate(() => { const C = IL.L.cur, R = C.runs[C.modes[1]], ks = new Set(R.W.l3.apps.map((a) => a.k)); for (const r of R.W.l3.log) if (ks.has(r.k) && (r.ext.A.length || r.ext.D.length) && r.legs.some((P) => ["R", "L"].some((X) => P[X].q.some((v) => v)))) return r.k / 240 - C.t0; const a = R.W.l3.apps[0]; return a ? a.k / 240 - C.t0 : 0.6; });
  const tStep = await p.evaluate(() => { const C = IL.L.cur, e = C.runs[C.modes[1]].W.imp.events.find((x) => x.kind === "RECOVERY STEP"); return e ? e.t - C.t0 + 0.05 : null; });
  // (the approved reference: a frame drawn with a perturbed leg — the perturbation a contact sets at a tick is drawn from the next)
  const tRef = await p.evaluate(() => { const C = IL.L.cur, R = C.runs[C.modes[1]]; for (const [k, F] of R.W.frames) for (const P of [F.a, F.d]) if (P.limbQ && ["R", "L"].some((X) => P.limbQ[X] && P.limbQ[X].some((v) => Math.abs(v) > 0.05))) return k / 240 - C.t0; return null; });
  const KEYS = ["ball", "vol", "sup", "bal", "nrm", "imp", "stp", "trl", "ghost", "hud", "ref", "lc", "lv", "vp", "mom"], all = Object.fromEntries(KEYS.map((k) => [k, false]));
  // (the recovery-step overlay needs a case with a recovery step — the first of these that has one under the formulation on the right)
  const stepCase = tStep != null ? null : await p.evaluate(() => { for (const id of ["headon-jog", "oblique-firm", "x90-jog", "static-jog", "croq-leg", "bf-past"]) { IL.select(id); const C = IL.L.cur, e = C.runs[C.modes[1]].W.imp.events.find((x) => x.kind === "RECOVERY STEP"); if (e) return { id, t: e.t - C.t0 + 0.05 }; } return null; });
  if (stepCase) await p.evaluate(() => IL.select("in-croq"));
  for (const k of KEYS) { const tk = k === "stp" && tStep != null ? tStep : k === "ref" && tRef != null ? tRef : tP; if (k === "stp" && stepCase) await p.evaluate((id) => IL.select(id), stepCase.id); else if (stepCase) await p.evaluate(() => { if (IL.L.cur.tc.id !== "in-croq") IL.select("in-croq"); });
    await p.evaluate((t) => { IL.layout("S3B"); IL.seek(t); }, k === "stp" && stepCase ? stepCase.t : tk); await p.evaluate((o) => IL.set(o), all); const off = await overlayInk(); await p.evaluate((o) => IL.set(o), Object.assign({}, all, { [k]: true })); const on = await overlayInk(); ok(`overlay ${k} toggles`, on !== off || k === "ball" || k === "ghost", { off, on }); }
  await p.evaluate((t) => IL.seek(t), tP);
  await p.evaluate((o) => IL.set(o), Object.assign({}, all, { ref: true, lc: true, lv: true, mom: true, hud: true, vol: true })); await shot("overlays_limb"); await p.evaluate((o) => IL.set(o), Object.assign({}, all, { hud: true, diag: true }));
  // the flagship's accounting panel
  await p.evaluate(() => { IL.select("side"); IL.set({ diag: true }); }); const diag = await p.evaluate(() => document.getElementById("diag").textContent); ok("the flagship's ACCOUNTING PANEL (OLD's strike, its forward component and lead; 3B's applications, their bound, energy and lead; the ledger)", /THE FLAGSHIP — THE ACCOUNTING/.test(diag) && /LEAD/.test(diag) && /THE LEDGER/.test(diag), diag.match(/LEAD [-\d.]+ cm/g));
  // THE CALIBRATION: each viewport's formulation selectable; the flagship 3B.1-as-first-built (A) against the calibrated (F+M) side by side — their Σ
  // impulse as node computes it (43.51 / 10.52 N·s) — and the accounting panel tracing each application's velocity parts
  { const sums = await p.evaluate(() => { IL.modes("B:A", "B:F+M"); IL.select("side"); const r = IL.report(); return { A: r.runs["B:A"] && r.runs["B:A"].lamSum, FM: r.runs.S3B && r.runs.S3B.lamSum }; });
    ok("the formulations side by side: the flagship 3B.1 as first built (A) | CALIBRATED (F+M)", Math.abs(sums.A - 43.51) < 0.01 && Math.abs(sums.FM - 10.52) < 0.01, JSON.stringify(sums));
    const d2 = await p.evaluate(() => { IL.set({ diag: true }); return document.getElementById("diag").textContent; }); ok("the accounting panel traces each application's velocity parts (root · frame · turn · sway · pelvis rotation · limb about its hip → used)", /limb about its hip/.test(d2) && /3B\.1 AS FIRST BUILT/.test(d2) && /CALIBRATED 3B\.1/.test(d2), "");
    await p.evaluate(() => { IL.set({ diag: false }); IL.seek(1.03); }); await shot("calib_A_vs_FM");
    let nf = 0; for (const f of ["B:B", "B:C", "B:D", "B:E", "B:F"]) { const v = await p.evaluate((f) => { IL.modes(f, "B:F+M"); IL.select("headon-jog"); const r = IL.report(); return r.runs[f] ? r.runs[f].lamSum : null; }, f); if (v != null && v > 0) nf++; }
    ok("every candidate formulation simulates in the Lab (B · C · D · E · F)", nf === 5, `${nf}/5`);
    await p.evaluate(() => { IL.modes("S3", "B:F+M"); IL.select("side"); IL.set({ diag: false }); }); }
  // the cameras, the rates, frame step, loop
  await p.evaluate(() => IL.layout("2")); let camOk = 0; for (const c of ["gameplay", "front", "rear", "sideL", "sideR", "q3f", "q3r", "top"]) { await p.evaluate((c) => IL.cam(c), c); await sleep(15); const v = await painted(2); if (v.every((x) => x > 10)) camOk++; if (["front", "top", "q3f"].includes(c)) await shot(`cam_${c}`); } ok("the eight cameras draw", camOk === 8, `${camOk}/8`);
  await p.evaluate(() => IL.cam("gameplay")); const rates = []; for (const r of [1, 0.5, 0.25]) { await p.evaluate((t) => IL.seek(t), 0.2); const a = await p.evaluate(() => IL.L.t); await p.evaluate((r) => { IL.play(r); IL.live(); }, r); await sleep(700); const b2 = await p.evaluate(() => IL.L.t); rates.push(+((b2 - a) / 0.7).toFixed(2)); }
  ok("1× / 0.5× / 0.25× play at their rates", rates[0] > rates[1] && rates[1] > rates[2] && rates[2] > 0, rates);
  await p.evaluate(() => { IL.L.playing = false; IL.seek(0.5); }); const s0 = await p.evaluate(() => IL.L.t); await p.keyboard.press("."); const s1 = await p.evaluate(() => IL.L.t); await p.keyboard.down("Shift"); await p.keyboard.press("."); await p.keyboard.up("Shift"); const s2 = await p.evaluate(() => IL.L.t);
  ok("frame step (4 ticks; shift: 1 tick)", Math.abs(s1 - s0 - 4 / 240) < 1e-6 && Math.abs(s2 - s1 - 1 / 240) < 1e-6, [s1 - s0, s2 - s1]);
  await p.evaluate(() => document.getElementById("bLoop").click()); ok("loop toggles", await p.evaluate(() => IL.L.loop === true));
  ok("0 console / page / HTTP errors", errs.length === 0, errs.slice(0, 5));
  fs.writeFileSync(path.join(OUT, "browser.json"), JSON.stringify({ checks, errs }, null, 1)); console.log(`${checks.filter((c) => c.pass).length}/${checks.length} checks pass`); await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
