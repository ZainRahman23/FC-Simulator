// ══ SHOOTING MATRIX — every body x every family x both feet, in ONE page ══════════════════════════════════════════════════════════
// The per-shot probe reloads the whole match page for each strike, which costs far more than the measurement. This drives the same
// fixture and reads the same authoritative facts, but loads the page once and resets between strikes, so a full 7-body x 5-family x
// 2-foot matrix is one browser session. It measures GEOMETRY, so the character render is off (verified bit-identical to render-on).
//   node of_shot_matrix.js --out <json> [--bodies generic,cucurella,...] [--shots 1,2,3,4,5] [--feet R,L] [--ticks 150]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "of_shot_matrix.json"), TICKS = +opt("--ticks", 150);
const BODIES = opt("--bodies", "generic,cucurella,gabriel,osimhen,szoboszlai,vinicius,james").split(",").filter(Boolean);
const SHOTS = opt("--shots", "1,2,3,4,5").split(",").filter(Boolean), FEET = opt("--feet", "R,L").split(",").filter(Boolean);
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-shotmx"), args: ["--no-sandbox", "--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage(); await p.setViewport({ width: 900, height: 600, deviceScaleFactor: 1 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(() => { OFPLAY.mixed = false; OFPLAY.dbg.hud = false; if (OFPLAY.panel) OFPLAY.panel.style.display = "none"; S.pt.paused = true; });
  const results = {};
  for (const body of BODIES) {
    const ok = await p.evaluate(async (body) => {
      try { if (body === "generic") { ofPlaySetCharacter(null); ofPlaySetBody("AVG_ATHLETIC"); }
            else { await ofCharLoad(body); ofPlaySetCharacter(body); await new Promise(r => setTimeout(r, 250)); }
            return body === "generic" ? OFPLAY.charId === null : OFPLAY.charId === body; } catch (e) { return String(e); }
    }, body);
    if (ok !== true) { console.error("select failed", body, ok); continue; }
    results[body] = {};
    for (const foot of FEET) for (const shot of SHOTS) {
      const rec = await p.evaluate(async (shot, foot, TICKS, body) => {
        const t = S.pt; ptReset(); t.pfoot = foot;
        t.p.x = 78; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0; t.p.gaitPhase = 0.08; t.p.gaitSettled = true;
        t.p.legLen = PT.LEG_REF;                                                                  // a real character is PRESENTATION: the law keeps the reference leg
        t.b.x = 78.48; t.b.y = 34 + (foot === "R" ? 0.16 : -0.16); t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.ctrl = true; t.b.exclT = 0; t.b.held = null;
        t.gk.x = 104.5; t.gk.y = 34;
        const a = OFPLAY.actor, sk = a.skel, pitch = (j) => [j[0], -j[2], j[1]];
        let out = null;
        for (let k = 0; k < TICKS; k++) {
          t.keys = { up: false, down: false, left: false, right: true, sprint: false, walk: false, jog: false };
          if (k === 90) { const sp = OFPLAY_SHOTS[shot]; ptChargeBegin(t, shot, { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam, force: { tech: sp.tech, foot } }); }
          if (k === 114) ptChargeRelease(t, shot);
          const b0 = { x: t.b.x, y: t.b.y, z: t.b.z };
          ptStep();
          const kk = t.kick; if (!kk) continue;
          if (t.now >= kk.kickAt && !out) {
            const fk = a.sol.fk, d = a.sol.diag, sd = kk.foot === "L" ? "L" : "R";
            const T = pitch(fk.tip[sk.byName["toe_" + sd].idx]), A = pitch(fk.joint[sk.byName["foot_" + sd].idx]);
            const rc = (d.reach && d.reach[sd]) || null, ft = d.feet[sd] || {};
            const dB = Math.hypot(T[0] - b0.x, T[1] - b0.y);
            const pf = sd === "R" ? "L" : "R", pft = d.feet[pf] || {};
            out = { tech: kk.tech, fam: kk.fam, simFoot: kk.foot, kickAt: +kk.kickAt.toFixed(4), contactTick: k,
                    v0: +kk.v0.toFixed(6), vz: +kk.vz.toFixed(6), charge: +(kk.charge || 0).toFixed(6),
                    dBall: +dB.toFixed(4), surf: +(dB - 0.11).toFixed(4),
                    reachResidual: rc ? rc.residual : null, reachCapped: rc ? !!rc.capped : null,
                    ground: +(d.ground || 0).toFixed(4), legFloor: d.legFloor || null,
                    plantMode: pft.mode || null, plantContact: !!pft.contact, plantSlide: pft.slide != null ? +pft.slide.toFixed(4) : null,
                    toeY: +T[2].toFixed(4), ankleY: +A[2].toFixed(4) };
          }
        }
        return out;
      }, shot, foot, TICKS, body);
      results[body][shot + foot] = rec;
      process.stdout.write(".");
    }
  }
  console.log("");
  fs.writeFileSync(OUT, JSON.stringify({ bodies: BODIES, shots: SHOTS, feet: FEET, results, errors: errs }, null, 1));
  console.log("matrix done  bodies", BODIES.length, " cells", BODIES.length * SHOTS.length * FEET.length, " page errors", errs.length, errs.slice(0, 2));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {});
  process.exit(0);
})();
