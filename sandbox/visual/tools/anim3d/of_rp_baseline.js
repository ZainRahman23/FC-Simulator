// RECEIVING + PASSING V1 — MATCHED REGRESSION AGAINST THE FROZEN BASELINE (baseline/outfield-runtime-v1).
// Runs the SAME deterministic single-player scenarios on two servers — the frozen baseline (a git worktree at the tag, served on its own
// port) and the working tree — and dumps, per tick, the AUTHORITATIVE state (player, ball, possession, touches, kick record) and a
// PRESENTATION fingerprint (every final joint position of the rig after the whole solve). Both must be identical: nothing outside squad
// play may change, neither what the simulation decides nor what the skeleton does.
//   node of_rp_baseline.js --url <match.html url> --out <json> [--chars generic,cucurella]
//   node of_rp_baseline.js --compare <baseline.json> <head.json>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
if (a.indexOf("--compare") > 0) {
  const i = a.indexOf("--compare"), A = JSON.parse(fs.readFileSync(a[i + 1])), B = JSON.parse(fs.readFileSync(a[i + 2]));
  let fail = false; console.log("scenario                         ticks   auth max|d|   pose max|d|   verdict");
  for (const k of Object.keys(A.runs)) {
    const x = A.runs[k], y = B.runs[k]; if (!y) { console.log(k.padEnd(32), "MISSING in head"); fail = true; continue; }
    let da = 0, dp = 0, at = -1;
    for (let t = 0; t < Math.max(x.auth.length, y.auth.length); t++) {
      const u = x.auth[t] || [], v = y.auth[t] || []; for (let j = 0; j < Math.max(u.length, v.length); j++) { const d = Math.abs((u[j] ?? NaN) - (v[j] ?? NaN)); if (!(d <= da)) { da = isNaN(d) ? Infinity : d; at = t; } }
      const P = x.pose[t] || [], Q = y.pose[t] || []; for (let j = 0; j < Math.max(P.length, Q.length); j++) { const d = Math.abs((P[j] ?? NaN) - (Q[j] ?? NaN)); if (!(d <= dp)) dp = isNaN(d) ? Infinity : d; }
    }
    const ok = da === 0 && dp === 0; if (!ok) fail = true;
    console.log(k.padEnd(32), String(x.auth.length).padStart(5), String(da).padStart(13), String(dp).padStart(13), "  ", ok ? "IDENTICAL" : "*** DIFFERS (first auth diff tick " + at + ") ***");
  }
  console.log("errors baseline", A.errors.length, " head", B.errors.length);
  console.log(fail ? "\nBASELINE GATE FAIL" : "\nBASELINE GATE PASS — every pre-existing scenario is authoritative- and pose-identical to baseline/outfield-runtime-v1");
  process.exit(fail ? 1 : 0);
}
const puppeteer = require("puppeteer-core");
const URL = opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html"), OUT = opt("--out", "rp_base.json");
const CHARS = opt("--chars", "generic,cucurella").split(",").filter(Boolean);
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-rpbase"), args: ["--no-sandbox", "--use-gl=angle", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage(); await p.setViewport({ width: 900, height: 600, deviceScaleFactor: 1 });
  const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(() => { OFPLAY.mixed = false; OFPLAY.dbg.hud = false; if (OFPLAY.panel) OFPLAY.panel.style.display = "none"; S.pt.paused = true; });
  const runs = {};
  for (const ch of CHARS) {
    const ok = await p.evaluate(async (ch) => {
      try { if (ch === "generic") { ofPlaySetCharacter(null); ofPlaySetBody("AVG_ATHLETIC"); } else { await ofCharLoad(ch); ofPlaySetCharacter(ch); await new Promise(r => setTimeout(r, 250)); }
            return ch === "generic" ? OFPLAY.charId === null : OFPLAY.charId === ch; } catch (e) { return String(e); } }, ch);
    if (ok !== true) { console.error("character select failed", ch, ok); continue; }
    const scen = [];
    for (const g of ["walk", "jog", "run", "sprint"]) for (const turn of [0, 150]) scen.push({ kind: "drib", gear: g, turn, ticks: 360 });
    for (const s of ["1", "2", "3", "4", "5"]) for (const f of ["R", "L"]) for (const app of ["stand", "run"]) scen.push({ kind: "shot", shot: s, foot: f, app, ticks: 200 });
    scen.push({ kind: "loose", ticks: 240 });
    scen.push({ kind: "loco", ticks: 720 });
    for (const sc of scen) {
      const key = ch + ":" + sc.kind + ":" + (sc.gear || sc.shot || "") + (sc.turn ? ":turn" : "") + (sc.foot ? ":" + sc.foot : "") + (sc.app ? ":" + sc.app : "");
      runs[key] = await p.evaluate((sc) => {
        ptReset(); const t = S.pt, a = OFPLAY.actor; a.state = { feet: {} }; a.loco = ofLocoMake(); a.kickS = null; a.kick = null; a.touch = null;
        t.p.x = 60; t.p.y = 34; t.p.vx = 0; t.p.vy = 0; t.p.facing = 0; t.p.touchT = 0; t.p.gaitPhase = 0.08; t.p.gaitSettled = true; t.p.legLen = PT.LEG_REF;
        t.b.z = 0; t.b.vx = 0; t.b.vy = 0; t.b.vz = 0; t.b.exclT = 0; t.b.held = null; t.gk.x = 104.5; t.gk.y = 34;
        if (sc.kind === "drib") { t.b.x = 66; t.b.y = 34; t.b.ctrl = false; }
        else if (sc.kind === "shot") { t.pfoot = sc.foot; t.p.x = 78; t.b.x = 78.48; t.b.y = 34 + (sc.foot === "R" ? 0.16 : -0.16); t.b.ctrl = true; }
        else if (sc.kind === "loose") { t.b.x = 64; t.b.y = 34.3; t.b.ctrl = false; }
        else { t.b.x = 3; t.b.y = 3; t.b.ctrl = false; }
        const auth = [], pose = [];
        for (let k = 0; k < sc.ticks; k++) {
          let keys = { up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false };
          if (sc.kind === "drib") { keys.right = true; Object.assign(keys, { walk: { walk: true }, jog: { jog: true }, run: {}, sprint: { sprint: true } }[sc.gear]); if (sc.turn && k > sc.turn) keys.down = true; }
          else if (sc.kind === "shot") { if (sc.app === "run") keys.right = true; const at = sc.app === "run" ? 90 : 10;
            if (k === at) { const sp = OFPLAY_SHOTS[sc.shot]; ptChargeBegin(t, sc.shot, { fam: sp.fam, label: sp.label, D: sp.D, chargeFam: sp.chargeFam, force: { tech: sp.tech, foot: t.pfoot || "R" } }); }
            if (k === at + 24) ptChargeRelease(t, sc.shot); }
          else if (sc.kind === "loose") { keys.right = true; keys.jog = k < 120; }
          else { const T = k / 60; keys = Object.assign(keys, T < 1 ? {} : T < 3 ? { right: true, walk: true } : T < 5 ? { right: true, jog: true } : T < 7 ? { right: true } : T < 8.5 ? { right: true, sprint: true } : T < 10 ? { right: true, down: true, sprint: true } : T < 11 ? { left: true } : {}); }
          t.keys = keys; ptStep();
          const kk = t.kick;
          auth.push([t.p.x, t.p.y, t.p.vx, t.p.vy, t.p.facing, t.p.gaitPhase, t.b.x, t.b.y, t.b.z, t.b.vx, t.b.vy, t.b.vz, t.b.ctrl ? 1 : 0, t.touchN || 0,
                     ({ R: 1, L: 2 })[t.lastTouchFoot] || 0, ({ SECURE: 1, EXPOSED: 2, ESCAPING: 3 })[t.ctrlState] || 0,
                     kk ? kk.kickAt : -1, kk ? kk.v0 : -1, kk ? kk.vz : -1, kk ? (kk.kicked ? 1 : 0) : -1, kk ? ({ R: 1, L: 2 })[kk.foot] || 0 : -1, kk && kk.charge != null ? kk.charge : -1]);
          const fk = a.sol.fk, row = []; for (const j of fk.joint) row.push(+j[0].toFixed(7), +j[1].toFixed(7), +j[2].toFixed(7)); pose.push(row);
        }
        return { auth, pose };
      }, sc);
      process.stdout.write(".");
    }
  }
  console.log("");
  fs.writeFileSync(OUT, JSON.stringify({ url: URL, chars: CHARS, runs, errors: errs }));
  console.log("wrote", OUT, Object.keys(runs).length, "runs  page errors", errs.length, errs.slice(0, 2));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {});
  process.exit(0);
})();
