// OUTFIELD BALL-INTERACTION AUDIT (read-only). Drives the live ?ofPlay=1 harness into the playtest's own ball and records, per 60 Hz tick,
// the AUTHORITATIVE ball and player state next to the PRESENTATION foot geometry, so the two can be compared:
//   ball x,y,z,vx,vy,ctrl,exclT · player x,y,vx,vy,facing,touchT · t.touchN / t.touchInfo / t.ctrlState / t.last
//   both 3D feet: ankle + toe world position (pitch frame), per-tick foot velocity, lock mode, contact flag, distance to the ball
// It changes NOTHING: it only places the ball and presses keys, exactly as a player would.
//   node of_ball_probe.js --out <json> [--gear run|walk|jog|sprint] [--ticks 260] [--turn 0] [--body AVG_ATHLETIC] [--ballx 66]
//   --ballx 3 parks the ball out of play: the SAME key script with no ball, for the animation/steering neutrality comparison.
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const OUT = opt("--out", "of_ball.json"), BALLX = +opt("--ballx", 66), STOPAT = +opt("--stopat", 0), REVAT = +opt("--revat", 0), GEAR = opt("--gear", "run"), TICKS = +opt("--ticks", 260), TURN = +opt("--turn", 0), BODY = opt("--body", "AVG_ATHLETIC");
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), SHOTS = opt("--shots", ""), ZOOM = +opt("--zoom", 0);
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-ofball"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 220)));
  await p.goto(URL + `?ofPlay=1&fps=60&body=${BODY}&r=` + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 600; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  // fixture: player at rest, a STATIONARY LOOSE ball 6 m ahead on the running line. Nothing else touched.
  await p.evaluate((BODY, BALLX) => {
    S.pt.paused = true; OFPLAY.mixed = false;
    const t = S.pt; t.p.x = 60; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0;
    t.b.x = BALLX; t.b.y = 34; t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.ctrl = false; t.b.exclT = 0; t.b.held = null;
    t.touchN = 0; t.lastTouchT = undefined; t.touchInfo = null; t.ctrlState = null; t.gk.x = 104.5; t.gk.y = 34;
  }, BODY, BALLX);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.evaluate((Z) => { OFPLAY.mixed = true; OFPLAY.dbg.feet = true; OFPLAY.dbg.roots = true; OFPLAY.dbg.hud = false; if (OFPLAY.panel) OFPLAY.panel.style.display = "none"; if (Z) { RIG.zoom = Z; RIG.zoomTarget = Z; } }, ZOOM); }
  const rows = await p.evaluate((TICKS, GEAR, TURN, STOPAT, REVAT) => {
    const out = []; const t = S.pt;
    const K = { walk: { walk: true }, jog: { jog: true }, run: {}, sprint: { sprint: true } }[GEAR] || {};
    const pitch = (j) => [j[0], -j[2], j[1]];                       // 3D world [x, height, z] -> pitch [x, y, height]
    let prev = null;
    for (let k = 0; k < TICKS; k++) {
      const keys = Object.assign({ up: false, down: false, left: false, right: true }, K);
      if (TURN && k > TURN) keys.down = true;                        // optional 90-degree turn partway through
      if (STOPAT && k > STOPAT) { keys.right = false; keys.down = false; }        // release everything: decelerate, settle, idle
      if (REVAT && k > REVAT) { keys.right = false; keys.left = true; }           // full reversal: run away from the ball
      S.pt.keys = keys;
      const b0 = { x: t.b.x, y: t.b.y, vx: t.b.vx, vy: t.b.vy, ctrl: t.b.ctrl };   // BEFORE the tick
      const n0 = t.touchN;
      ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
      const d = OFPLAY.actor.sol.diag, fk = OFPLAY.actor.sol.fk, sk = OFPLAY.actor.skel;
      const foot = (sd) => {
        const A = pitch(fk.joint[sk.byName["foot_" + sd].idx]), T = pitch(fk.tip[sk.byName["toe_" + sd].idx]);
        const f = d.feet[sd];
        const rc = d.reach && d.reach[sd];
        return { ankle: A.map(v => +v.toFixed(4)), toe: T.map(v => +v.toFixed(4)), mode: f.mode, contact: !!f.contact, slide: f.slide,
                 dBall: +Math.hypot(A[0] - t.b.x, A[1] - t.b.y).toFixed(4), dToeBall: +Math.hypot(T[0] - t.b.x, T[1] - t.b.y).toFixed(4),
                 surf: +(Math.hypot(T[0] - t.b.x, T[1] - t.b.y) - 0.11).toFixed(4), reach: rc || null };
      };
      const R = foot("R"), L = foot("L");
      if (prev) { for (const [cur, pr] of [[R, prev.R], [L, prev.L]]) cur.vel = +(Math.hypot(cur.ankle[0] - pr.ankle[0], cur.ankle[1] - pr.ankle[1], cur.ankle[2] - pr.ankle[2]) * 60).toFixed(3); }
      const row = { tick: k, t: +t.now.toFixed(4),
        ball0: b0, ball: { x: +t.b.x.toFixed(4), y: +t.b.y.toFixed(4), z: +t.b.z.toFixed(4), vx: +t.b.vx.toFixed(4), vy: +t.b.vy.toFixed(4), ctrl: t.b.ctrl, excl: +(t.b.exclT || 0).toFixed(2) },
        player: { x: +t.p.x.toFixed(4), y: +t.p.y.toFixed(4), vx: +t.p.vx.toFixed(4), vy: +t.p.vy.toFixed(4), v: +Math.hypot(t.p.vx, t.p.vy).toFixed(3), facing: +t.p.facing.toFixed(4), touchT: +(t.p.touchT || 0).toFixed(4) },
        loco: { gait: OFPLAY.actor.loco.diag.gait, phase: OFPLAY.actor.loco.diag.phase, cadence: OFPLAY.actor.loco.diag.cadence },
        R, L, touchN: t.touchN, newTouch: t.touchN > n0, touchInfo: t.touchN > n0 ? t.touchInfo : null,
        ctrlState: t.ctrlState, last: t.last, dPB: +Math.hypot(t.p.x - t.b.x, t.p.y - t.b.y).toFixed(4) };
      out.push(row); prev = { R, L };
    }
    return out;
  }, SHOTS ? 0 : TICKS, GEAR, TURN, STOPAT, REVAT);
  if (SHOTS) {                                                                                   // stepped from node so a frame can be grabbed on any tick
    for (let k = 0; k < TICKS; k++) {
      const row = await p.evaluate((k, GEAR, TURN, STOPAT, REVAT) => {
        const t = S.pt; const K = { walk: { walk: true }, jog: { jog: true }, run: {}, sprint: { sprint: true } }[GEAR] || {};
        const keys = Object.assign({ up: false, down: false, left: false, right: true }, K); if (TURN && k > TURN) keys.down = true;
        if (STOPAT && k > STOPAT) { keys.right = false; keys.down = false; keys.up = false; keys.left = false; }
        if (REVAT && k > REVAT) { keys.right = false; keys.left = true; }
        S.pt.keys = keys; const b0 = { x: t.b.x, y: t.b.y, vx: t.b.vx, vy: t.b.vy, ctrl: t.b.ctrl }; const n0 = t.touchN;
        ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
        const d = OFPLAY.actor.sol.diag, fk = OFPLAY.actor.sol.fk, sk = OFPLAY.actor.skel;
        const pitch = (j) => [j[0], -j[2], j[1]];
        const foot = (sd) => { const A = pitch(fk.joint[sk.byName["foot_" + sd].idx]), T2 = pitch(fk.tip[sk.byName["toe_" + sd].idx]); const f = d.feet[sd];
          return { ankle: A.map(v => +v.toFixed(4)), toe: T2.map(v => +v.toFixed(4)), mode: f.mode, contact: !!f.contact, slide: f.slide,
                   dBall: +Math.hypot(A[0] - t.b.x, A[1] - t.b.y).toFixed(4), dToeBall: +Math.hypot(T2[0] - t.b.x, T2[1] - t.b.y).toFixed(4),
                   surf: +(Math.hypot(T2[0] - t.b.x, T2[1] - t.b.y) - 0.11).toFixed(4), reach: (d.reach && d.reach[sd]) || null }; };
        return { tick: k, t: +t.now.toFixed(4), ball: { x: +t.b.x.toFixed(4), y: +t.b.y.toFixed(4), vx: +t.b.vx.toFixed(4), vy: +t.b.vy.toFixed(4), ctrl: t.b.ctrl },
          player: { x: +t.p.x.toFixed(4), y: +t.p.y.toFixed(4), v: +Math.hypot(t.p.vx, t.p.vy).toFixed(3), touchT: +(t.p.touchT || 0).toFixed(4) },
          loco: { gait: OFPLAY.actor.loco.diag.gait, phase: OFPLAY.actor.loco.diag.phase, cadence: OFPLAY.actor.loco.diag.cadence },
          R: foot("R"), L: foot("L"), touchN: t.touchN, newTouch: t.touchN > n0, touchInfo: t.touchN > n0 ? t.touchInfo : null,
          ball0: b0, ctrlState: t.ctrlState, last: t.last, dPB: +Math.hypot(t.p.x - t.b.x, t.p.y - t.b.y).toFixed(4) };
      }, k, GEAR, TURN, STOPAT, REVAT);
      rows.push(row);
      const want = row.newTouch || (row.tick % (+opt("--every", 6)) === 0);
      if (want) { const el = await p.$("#ofplay-out"); await el.screenshot({ path: require("path").join(SHOTS, `t${String(k).padStart(3, "0")}${row.newTouch ? "_TOUCH" : ""}.png`) }); }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify({ gear: GEAR, body: BODY, turn: TURN, rows, errors: errs }, null, 1));
  const touches = rows.filter(r => r.newTouch);
  console.log(`gear ${GEAR}  ticks ${rows.length}  touches ${touches.length}  page errors ${errs.length}`);
  console.log("tick    t     kind        foot(sprite)  dPlayerBall  R:dist mode   L:dist mode   nearest  ballV before -> after");
  for (const r of touches) {
    const ti = r.touchInfo || {};
    const near = r.R.dBall < r.L.dBall ? "R" : "L";
    const v0 = Math.hypot(r.ball0.vx, r.ball0.vy), v1 = Math.hypot(r.ball.vx, r.ball.vy);
    console.log(String(r.tick).padStart(4), String(r.t.toFixed(2)).padStart(6), (ti.kind || "-").padEnd(11),
      String(ti.foot || "-").padEnd(13), String(r.dPB.toFixed(2)).padStart(11),
      String(r.R.dBall.toFixed(2)).padStart(8), r.R.mode.padEnd(7), String(r.L.dBall.toFixed(2)).padStart(6), r.L.mode.padEnd(7),
      near.padStart(7), String(v0.toFixed(2)).padStart(8), "->", v1.toFixed(2));
  }
  await b.close();
})();
