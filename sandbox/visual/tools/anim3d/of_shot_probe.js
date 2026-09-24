// SHOOTING V1 — deterministic probe of a scheduled shot on the live harness.
// Drives the real page: gives the player the ball, optionally runs him first, charges one of the five families and releases, then records
// per 60 Hz tick the AUTHORITATIVE shot facts beside the PRESENTATION geometry, and reports the authoritative contact tick in full.
//   node of_shot_probe.js --out <json> [--shot 1..5] [--foot R|L] [--approach stand|walk|jog|run|dribble] [--body AVG_ATHLETIC]
//                        [--hold 400] [--ticks 160] [--shots <dir> --every 3]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "of_shot.json"), SHOT = opt("--shot", "2"), FOOT = opt("--foot", "R"), APP = opt("--approach", "stand");
const BODY = opt("--body", "AVG_ATHLETIC"), HOLD = +opt("--hold", 400), TICKS = +opt("--ticks", 170);
const SHOTS = opt("--shots", ""), EVERY = +opt("--every", 3), ZOOM = +opt("--zoom", 3);
const CHAR = opt("--character", "");
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html");
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-ofshot"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 220)));
  await p.goto(URL + `?ofPlay=1&fps=60&body=${BODY}&r=` + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  if (CHAR) { const ok = await p.evaluate(async (id) => { try { await ofCharLoad(id); ofPlaySetCharacter(id); await new Promise(r => setTimeout(r, 200)); return OFPLAY.charId === id; } catch (e) { return String(e); } }, CHAR);
    if (ok !== true) { console.error("character load failed:", ok); process.exit(3); } }
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.evaluate((Z) => { OFPLAY.mixed = true; OFPLAY.dbg.feet = true; OFPLAY.dbg.hud = false; if (OFPLAY.panel) OFPLAY.panel.style.display = "none"; if (Z) { RIG.zoom = Z; RIG.zoomTarget = Z; } }, ZOOM); }
  await p.evaluate((FOOT, APP) => {
    S.pt.paused = true; ptReset();
    const t = S.pt; t.pfoot = FOOT;
    t.p.x = 78; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0; t.p.gaitPhase = 0.08; t.p.gaitSettled = true;
    t.p.legLen = (OFPLAY.actor && OFPLAY.actor.skel.legLen) || PT.LEG_REF;
    t.b.x = 78.48; t.b.y = 34 + (FOOT === "R" ? 0.16 : -0.16); t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.ctrl = true; t.b.exclT = 0; t.b.held = null;
    t.gk.x = 104.5; t.gk.y = 34;
  }, FOOT, APP);
  const rows = []; const K = { stand: {}, walk: { walk: true, right: true }, jog: { jog: true, right: true }, run: { right: true }, dribble: { right: true } }[APP] || {};
  const approachTicks = APP === "stand" ? 10 : 90, holdTicks = Math.round(HOLD / 1000 * 60);
  for (let k = 0; k < TICKS; k++) {
    const phase = k < approachTicks ? "approach" : k < approachTicks + holdTicks ? "charge" : "fire";
    const row = await p.evaluate((k, keys, phase, SHOT, first, rel) => {
      const t = S.pt, a = OFPLAY.actor;
      S.pt.keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, keys);
      if (first) { const sp = OFPLAY_SHOTS[SHOT]; ptChargeBegin(t, SHOT, { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam, force: { tech: sp.tech, foot: t.pfoot || "R" } }); }
      if (rel) ptChargeRelease(t, SHOT);
      const b0 = { x: t.b.x, y: t.b.y, z: t.b.z, vx: t.b.vx, vy: t.b.vy, vz: t.b.vz, ctrl: t.b.ctrl };
      const kb = t.kick ? { kicked: !!t.kick.kicked } : null;
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      const d = a.sol.diag, fk = a.sol.fk, sk = a.skel, pitch = (j) => [j[0], -j[2], j[1]];
      const kk = t.kick, foot = kk ? (kk.foot === "L" ? "L" : "R") : null, pf = foot === "R" ? "L" : "R";
      const F = (sd) => { const A = pitch(fk.joint[sk.byName["foot_" + sd].idx]), T = pitch(fk.tip[sk.byName["toe_" + sd].idx]); const f = d.feet[sd];
        const bx = b0.x, by = b0.y;                                                                // the ball as it was BEFORE this tick's impulse
        return { ankle: A.map(v => +v.toFixed(4)), toe: T.map(v => +v.toFixed(4)), mode: f.mode, contact: !!f.contact, slide: f.slide,
                 soleY: f.soleY, dBall: +Math.hypot(T[0] - bx, T[1] - by).toFixed(4), surf: +(Math.hypot(T[0] - bx, T[1] - by) - 0.11).toFixed(4),
                 vel: 0, reach: (d.reach && d.reach[sd]) || null }; };
      const pel = fk.joint[sk.byName.pelvis.idx];
      return { tick: k, t: +t.now.toFixed(4), phase, ball0: b0,
        ball: { x: +t.b.x.toFixed(4), y: +t.b.y.toFixed(4), z: +t.b.z.toFixed(4), vx: +t.b.vx.toFixed(4), vy: +t.b.vy.toFixed(4), vz: +t.b.vz.toFixed(4), ctrl: t.b.ctrl },
        player: { x: +t.p.x.toFixed(4), y: +t.p.y.toFixed(4), v: +Math.hypot(t.p.vx, t.p.vy).toFixed(3), facing: +t.p.facing.toFixed(4) },
        pelvis: [+pel[0].toFixed(4), +(-pel[2]).toFixed(4)],
        kick: kk ? { tech: kk.tech, fam: kk.fam, foot: kk.foot, t0: +kk.t0.toFixed(4), kickAt: +kk.kickAt.toFixed(4), end: +kk.end.toFixed(4), kicked: !!kk.kicked, v0: kk.v0, vz: kk.vz, charge: kk.charge } : null,
        fired: !!(kk && kk.kicked && kb && !kb.kicked), kickDiag: (a.kickS && a.kickS.diag) || null, kickW: +(a.kickW || 0).toFixed(3),
        R: F("R"), L: F("L"), strike: foot, plantF: pf, knee: d.knee, elbow: d.elbow, jerk: d.jerk, ground: d.ground, drop: d.pelvisDrop || 0,
        gait: a.loco.diag.gait, phaseU: a.loco.diag.phase, last: t.last };
    }, k, K, phase, SHOT, phase === "charge" && k === approachTicks, phase === "fire" && k === approachTicks + holdTicks);
    rows.push(row);
    if (SHOTS && (row.fired || k % EVERY === 0)) { const el = await p.$("#ofplay-out"); await el.screenshot({ path: path.join(SHOTS, `t${String(k).padStart(3, "0")}${row.fired ? "_KICK" : ""}.png`) }); }
  }
  fs.writeFileSync(OUT, JSON.stringify({ shot: SHOT, foot: FOOT, approach: APP, body: BODY, rows, errors: errs }, null, 1));
  const fire = rows.find(r => r.fired);
  const nm = { "1": "INSIDE/CURL", "2": "NORMAL", "3": "POWER", "4": "CHIP", "5": "TRIVELA" }[SHOT];
  console.log(`shot ${SHOT} ${nm}  foot ${FOOT}  approach ${APP}  body ${BODY}  errors ${errs.length}`);
  if (!fire) { console.log("  *** no authoritative contact in window ***", (rows[rows.length-1].last || "").slice(0, 60)); }
  else {
    const sf = fire.strike, st = fire[sf], pl = fire[fire.plantF], kd = fire.kickDiag || {};
    const v1 = Math.hypot(fire.ball.vx, fire.ball.vy, fire.ball.vz);
    console.log(`  CONTACT tick ${fire.tick} t ${fire.t}  tech ${fire.kick.tech} fam ${fire.kick.fam} charge ${fire.kick.charge}`);
    console.log(`  striking ${sf} (${kd.surf})  boot-to-ball-surface ${(st.surf*100).toFixed(1)} cm   reach ${st.reach ? (st.reach.applied*100).toFixed(1)+"cm"+(st.reach.capped?"*":"") : "-"}`);
    console.log(`  plant ${fire.plantF}  mode ${pl.mode}  slide ${pl.slide != null ? (pl.slide*100).toFixed(2)+" cm" : "-"}  sole ${(pl.soleY*100).toFixed(1)} cm`);
    console.log(`  ball v ${Math.hypot(fire.ball0.vx,fire.ball0.vy).toFixed(2)} -> ${v1.toFixed(2)} m/s  vz ${fire.ball.vz.toFixed(2)}   anim u ${kd.u} (contact ${kd.contactU})  warp in ${kd.warpIn} out ${kd.warpOut}${kd.warped?" CLAMPED":""}`);
    console.log(`  knees R ${fire.knee.R} L ${fire.knee.L}   pop ${(fire.jerk*100).toFixed(1)} cm`);
  }
  await b.close();
})();
