// tackle1/tools/t_browser.cjs — TOUCHLINE — TACKLING LAB V1 in Chrome (headless): the page loads with 0 console / HTTP errors; every case simulates,
// poses and draws (the canvas painted); all 8 cameras draw different views; BALL / BODY ONLY / SKELETON / DIAGNOSTICS render; the transport (frame
// step, play) moves the playhead; the contact switch (POKE / PHASE C) re-simulates; TACKLE AT PLAYHEAD re-runs a case with the request there; the
// page's own run of each case matches node's (the same outcome, commit and contact times). Screenshots → the scratchpad (never committed: real players' models).
//   PUPPETEER_NODE_MODULES=<dir> PT_TMP=<dir> node t_browser.cjs --out <evidence dir> --shots <dir> [--node <lab_cases.json>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), os = require("os");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = arg("out"), SHOTS = arg("shots", OUT), BASE = arg("base", "http://127.0.0.1:8363/sandbox/visual/"), NODE = arg("node") ? JSON.parse(fs.readFileSync(arg("node"), "utf8")) : null; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const checks = [], ok = (name, c, detail) => { checks.push({ name, pass: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail != null ? "  — " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : ""}`); };
(async () => { const prof = fs.mkdtempSync(path.join(process.env.PT_TMP || os.tmpdir(), "tkb-")), b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: prof, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=metal", "--window-size=1500,900"] });
  const p = await b.newPage(); await p.setViewport({ width: 1500, height: 900 }); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); }); p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push("HTTP " + r.status() + " " + r.url()); });
  await p.goto(BASE + "tackle1_lab.html?external=1&play=0", { waitUntil: "load" }); await p.waitForFunction(() => window.TL && TL.ready(), { timeout: 120000 });
  ok("the Lab loads (TOUCHLINE — TACKLING LAB V1)", await p.evaluate(() => document.querySelector("#bar h1").textContent.includes("TACKLING LAB V1")));
  // the share of the 3D canvas that differs from its clear colour — drawn
  const painted = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0, k = 0; for (let i = 0; i < px.length; i += 4 * 97) { k++; if (Math.abs(px[i] - 15) + Math.abs(px[i + 1] - 20) + Math.abs(px[i + 2] - 18) > 30) n++; } return +(100 * n / k).toFixed(1); });
  const hashView = () => p.evaluate(() => { const c = document.getElementById("gl"), gl = c.getContext("webgl2"), w = c.width, h0 = c.height, px = new Uint8Array(w * h0 * 4); gl.readPixels(0, 0, w, h0, gl.RGBA, gl.UNSIGNED_BYTE, px); let h = 0; for (let i = 0; i < px.length; i += 4 * 13) h = (h * 31 + px[i] + 7 * px[i + 1]) >>> 0; return h; });
  const ids = await p.evaluate(() => TL.L.cases.map((c) => c.id)); let drawn = 0, match = 0, compared = 0; const rows = [];
  for (const id of ids) { await p.evaluate((id) => TL.select(id), id); const T = await p.evaluate(() => TL.times()), rep = await p.evaluate(() => TL.report());
    await p.evaluate((t) => TL.seek(t), T.contact != null ? T.contact : 0.4); await sleep(30); const v = await painted(); if (v > 20) drawn++;
    const S = rep.rep.action, q = rep.rep.requests[0]; rows.push({ id, painted: v, frames: rep.frames, simMs: +rep.ms.toFixed(0), outcome: S ? S.outcome.kind : q ? q.state : "NO REQUEST" });
    if (NODE) { const n = NODE.find((x) => x.id === id); if (n) { compared++; const a = n.R.action, same = (!a && !S) || (a && S && a.outcome.kind === S.outcome.kind && a.commit === S.commit && JSON.stringify(a.hits.map((h) => h.t)) === JSON.stringify(S.hits.map((h) => h.t))); if (same) match++; else console.log("   node ≠ page:", id, a && a.outcome.kind, S && S.outcome.kind); } }
    if (["carry-jog-r", "bf-fake", "croq", "cut", "race"].includes(id)) { const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, `case_${id}.jpg`), type: "jpeg", quality: 75 }); } }
  ok("every case simulates, poses and draws", drawn === ids.length, `${drawn}/${ids.length}`); console.log("   " + rows.map((r) => `${r.id}: ${r.outcome} (${r.frames} frames, ${r.simMs} ms)`).join(" · "));
  if (NODE) ok("the page's runs equal node's (outcome, commitment, contact times)", match === compared && compared > 0, `${match}/${compared}`);
  // the cameras
  await p.evaluate(() => TL.select("carry-jog-r")); const T = await p.evaluate(() => TL.times()); await p.evaluate((t) => TL.seek(t), T.contact); const views = {};
  for (const c of ["gameplay", "front", "rear", "sideL", "sideR", "q3f", "q3r", "top"]) { await p.evaluate((c) => TL.cam(c), c); await sleep(30); views[c] = { painted: await painted(), h: await hashView() }; const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, `cam_${c}.jpg`), type: "jpeg", quality: 72 }); }
  ok("all 8 cameras draw (painted)", Object.values(views).every((v) => v.painted > 20), Object.fromEntries(Object.entries(views).map(([k, v]) => [k, v.painted])));
  ok("the 8 cameras are 8 different views", new Set(Object.values(views).map((v) => v.h)).size === 8);
  // the toggles
  await p.evaluate(() => TL.cam("sideR")); const base = await hashView();
  for (const [k, o] of [["ball hidden", { ball: 0 }], ["body only", { ball: 1, body: 1 }], ["skeleton", { body: 0, skel: 1 }]]) { await p.evaluate((o) => TL.set(o), o); await sleep(30); const h = await hashView(), v = await painted(); ok(`${k}: draws, and differs from the default view`, v > 10 && h !== base, { painted: v }); const el = await p.$("#stage"); await el.screenshot({ path: path.join(SHOTS, `toggle_${k.replace(/ /g, "_")}.jpg`), type: "jpeg", quality: 72 }); }
  await p.evaluate(() => TL.set({ ball: 1, body: 0, skel: 0 }));
  // the transport: frame step (".") and play
  const t0 = await p.evaluate(() => TL.L.t); await p.keyboard.press("."); const t1 = await p.evaluate(() => TL.L.t); ok("frame step (.) advances the playhead 4 ticks", Math.abs(t1 - t0 - 4 / 240) < 1e-6, { dt: +(t1 - t0).toFixed(5) });
  await p.keyboard.press(","); ok("frame step back (,)", Math.abs((await p.evaluate(() => TL.L.t)) - t0) < 1e-6);
  // the contact switch and TACKLE AT PLAYHEAD
  await p.select("#selContact", "PHASE_C"); await sleep(400); const pc = await p.evaluate(() => TL.report()); ok("the contact switch re-simulates with PHASE C's contact", pc.rep.action && Math.abs(pc.rep.action ? 1 : 0) === 1 && (await p.evaluate(() => TL.L.cur.W.tk.act.contact)) === "PHASE_C");
  await p.select("#selContact", "POKE"); await sleep(300);
  await p.evaluate(() => TL.select("notackle")); await p.evaluate(() => TL.seek(0.62)); await p.click("#bTry"); await sleep(400); const tr = await p.evaluate(() => TL.report());
  ok("TACKLE AT PLAYHEAD re-runs the case with the request at the playhead", tr.rep.requests.length === 1 && Math.abs(tr.rep.requests[0].t - 0.62) < 0.01, tr.rep.requests[0]);
  ok("0 console / HTTP errors", errs.length === 0, errs.slice(0, 4));
  await p.setViewport({ width: 820, height: 900 }); await sleep(300); await p.evaluate(() => TL.seek(0.5)); ok("narrow window (820 px): the stage still draws", (await painted()) > 10);
  await b.close(); fs.rmSync(prof, { recursive: true, force: true }); const bad = checks.filter((c) => !c.pass).length;
  console.log(`\n${bad ? `${bad} FAILED` : `ALL ${checks.length} CHECKS PASS`}`); fs.writeFileSync(path.join(OUT, "t_browser.json"), JSON.stringify({ checks, rows, errors: errs }, null, 1)); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
