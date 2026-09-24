// ══ CHARACTER SIMULATION-NEUTRALITY GATE ═════════════════════════════════════════════════════════════════════════════════════════
// Character choice is presentation. With identical authoritative inputs, the authoritative trace must be identical whoever is selected
// — and identical again with the whole skeletal layer switched off. This runs the SAME scripted sequence (run onto a loose ball, carry,
// turn, then a Power shot) on the generic test body, on each real character, and with animation off, and compares tick by tick:
//   player x/y/vx/vy/facing · ball x/y/z/vx/vy/vz · possession flag and state · touch count and chosen foot · stride phase
//   the kick record itself: contact tick, launch speed, launch vz, technique, striking foot, charge
//   node of_char_regress.js [--ids cucurella,gabriel] [--ticks 320]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const IDS = opt("--ids", "cucurella,gabriel").split(",").filter(Boolean), TICKS = +opt("--ticks", 320);
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), OUT = opt("--out", "");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-charreg"), args: ["--no-sandbox", "--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  const run = (charId, animOff) => p.evaluate(async (charId, animOff, TICKS) => {
    if (charId) { await ofCharLoad(charId); ofPlaySetCharacter(charId); await new Promise(r => setTimeout(r, 150)); }
    else ofPlaySetCharacter(null);
    S.pt.paused = true; OFPLAY.mixed = false; OFPLAY.animOff = animOff;
    ptReset(); const t = S.pt; t.pfoot = "R";
    t.p.x = 60; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0; t.p.gaitPhase = 0.08; t.p.gaitSettled = true;
    t.p.legLen = PT.LEG_REF;                                                   // the simulation's own attribute, identical in every run
    t.b.x = 66; t.b.y = 34; t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.ctrl = false; t.b.exclT = 0; t.b.held = null;
    t.gk.x = 104.5; t.gk.y = 34;
    const tr = [];
    for (let k = 0; k < TICKS; k++) {
      const keys = { up: false, down: false, left: false, right: true, sprint: false, walk: false, jog: false };
      if (k > 180) keys.down = true;                                           // a turn while carrying
      S.pt.keys = keys;
      if (k === 250) { const sp = OFPLAY_SHOTS["3"]; ptChargeBegin(t, "3", { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam, force: { tech: sp.tech, foot: "R" } }); }
      if (k === 274) ptChargeRelease(t, "3");
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      const kk = t.kick;
      tr.push([t.p.x, t.p.y, t.p.vx, t.p.vy, t.p.facing, t.b.x, t.b.y, t.b.z, t.b.vx, t.b.vy, t.b.vz, t.b.ctrl ? 1 : 0,
               t.touchN, ({ R: 1, L: 2 })[t.lastTouchFoot] || 0, t.p.gaitPhase,
               ({ SECURE: 1, EXPOSED: 2, ESCAPING: 3 })[t.ctrlState] || 0,
               kk ? kk.kickAt : -1, kk ? kk.v0 : -1, kk ? kk.vz : -1, kk ? (kk.kicked ? 1 : 0) : -1,
               kk ? ({ INSIDE: 1, LACES: 3, LACES_POWER: 4, OUTSIDE: 5, CHIP: 6 })[kk.tech] || 0 : -1,
               kk && kk.charge != null ? kk.charge : -1]);
    }
    OFPLAY.animOff = false;
    return tr;
  }, charId, animOff, TICKS);
  const F = ["p.x", "p.y", "p.vx", "p.vy", "facing", "b.x", "b.y", "b.z", "b.vx", "b.vy", "b.vz", "b.ctrl", "touchN", "lastFoot", "gaitPhase", "ctrlState", "kickAt", "v0", "vz", "kicked", "tech", "charge"];
  const base = await run(null, false);                                         // generic test body, animation ON = the reference
  const rows = [{ label: "generic body (reference)", delta: 0, at: -1, field: null }];
  const cmp = (tr, label) => { let w = 0, wi = -1, wf = -1;
    for (let k = 0; k < base.length; k++) for (let i = 0; i < base[k].length; i++) { const d = Math.abs(base[k][i] - tr[k][i]); if (d > w) { w = d; wi = k; wf = i; } }
    rows.push({ label, delta: w, at: wi, field: wf >= 0 ? F[wf] : null }); };
  for (const id of IDS) cmp(await run(id, false), "character: " + id);
  cmp(await run(null, true), "animation OFF");
  for (const id of IDS) cmp(await run(id, true), "animation OFF + " + id);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ rows, errors: errs, ticks: TICKS }, null, 1));
  console.log("CHARACTER SIMULATION-NEUTRALITY — identical authoritative inputs, " + TICKS + " ticks (run onto a loose ball, carry, turn, POWER shot)");
  console.log("case                              max |delta|   verdict");
  for (const r of rows) console.log(`${r.label.padEnd(34)}${String(r.delta).padStart(11)}   ${r.delta === 0 ? "IDENTICAL" : "*** DIFFERS at tick " + r.at + " field " + r.field + " ***"}`);
  console.log("page errors", errs.length, errs.slice(0, 2));
  const fail = rows.some(r => r.delta !== 0);
  console.log(fail ? "\nGATE FAIL" : "\nGATE PASS — the character is presentation: it explains the event, it never changes it");
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();
