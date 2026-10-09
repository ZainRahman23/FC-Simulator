// D-1A part B (read-only): independent trace of the simulation's and the presentation's support state around the authoritative contact, from the
// unchanged f5f6076 page (same set-up as air_export.cjs). Per AIR row (row k = state after squad tick k + 1): the squad tick and time; the runner's
// authoritative state; the simulation's own body model ptRxBody at the 4 contact sub-steps (planted / up / sw / ankle / toe / knee / hip, the leg length
// and gait parameters it uses); the presentation's plant state (a.state.feet: locked, weight, release, mode, lock point), its gait (a.gait), its
// diagnostic foot flags, the cycle's stance request (ofLocoCycle at the simulation phase) and the authored ankle before the contact solve. Pure reads;
// the gameplay hash is recomputed and must equal the AIR's.   node d1a_trace.cjs --wt <worktree> --out <file.json>
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const WT = opt("--wt"), URL = opt("--url", "http://127.0.0.1:8191/sandbox/visual/match.html"), { rxCase } = require(path.join(WT, "sandbox/visual/tools/anim3d/of_react_scenarios.js"));
const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} } window.__ofRxLink = ofRxLink; });
  const out = {};
  for (const [name, K0] of [["rx_planted_leg", { v: 3, ang: 90, ph: 0.25, off: 0 }], ["rx_free_leg", { v: 3, ang: 90, ph: 0.0, off: 0 }]]) for (const mode of ["FULL", "LOCO"]) {
    const K = rxCase(K0);
    out[name + "_" + mode] = await p.evaluate((S0, mode) => {
      const D = JSON.parse(JSON.stringify(S0.drill)); ofSquadStart("probe", D);
      for (let i = 0; i < D.players.length; i++) { const id = D.players[i].char, e = id && OF_CHAR.get(id); if (e && e.status === "ready") { const c = S.pt.squad.ctx[i]; const ac = ofPlayMakeActor(e.skel, c.p); ac.char = e; ac.team = c.team; ac.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; OFSQ.actors[i] = ac; } }
      OFPLAY.actor = OFSQ.actors[S.pt.squad.active]; OFPLAY.animOff = false; ofRxLink = mode === "LOCO" ? null : window.__ofRxLink;
      const rows = [], tr = [], cp = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
      for (let k = 0; k < 260; k++) { const t = S.pt; t.keys = { up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false };
        for (const c of (S0.cmds || []).filter(c => c.at === k)) { if (c.do === "humanAi") t.squad.humanAi = true; else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : null); }
        ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
        const Q = t.squad, bb = t.b, A = Q.ctx[0];
        rows.push([k, bb.x, bb.y, bb.z, bb.vx, bb.vy, bb.owner == null ? -1 : bb.owner, Q.active].concat(...Q.ctx.map(c => [c.p.x, c.p.y, c.p.vx, c.p.vy, c.p.facing, c.p.gaitPhase])));
        if (k < 42 || k > 56) continue;
        const v = Math.hypot(A.p.vx, A.p.vy), G = ofLocoParams(v), leg = A.p.legLen || PT.LEG_REF, ac = OFSQ.actors[0];
        const sim = [1, 2, 3, 4].map(n => { const dt = -PT_DT * (1 - n / 4), Bd = ptRxBody(A, dt); return { sub: n, dt, phase: Bd.phase, legs: Bd.legs }; });
        const cyc = ofLocoCycle(ac.skel, ofLocoParams(v), A.p.gaitPhase, {}), authored = skelFK(ac.skel, ac.pose, ac.rootM), fb = (sd) => ac.skel.byName["foot_" + sd].idx, hb = (sd) => ac.skel.byName["thigh_" + sd].idx;
        tr.push({ row: k, squadTick: Q.tick, now: t.now, runner: { x: A.p.x, y: A.p.y, vx: A.p.vx, vy: A.p.vy, gaitPhase: A.p.gaitPhase }, react: A.react ? A.react.kind : null,
          simModel: { leg, legSource: A.p.legLen ? "p.legLen" : "PT.LEG_REF", gait: { step: G.step, stance: G.stance, cadence: v / (G.step * leg), cycleS: 2 * G.step * leg / v }, hipH: PT_REACT.hipH * leg, thigh: PT_REACT.thighK * leg, shin: leg - PT_REACT.thighK * leg, lat: PT_REACT.lat * leg, hipW: PT_REACT.hipW * leg, ankleH: PT_REACT.ankleH, subs: sim },
          pres: { legLen: ac.skel.legLen, ankleH: ac.skel.ankleH, gait: cp(ac.gait), cycleStance: { R: cyc._legs.R.st, L: cyc._legs.L.st, sR: cyc._legs.R.s, sL: cyc._legs.L.s }, state: cp({ R: ac.state.feet.R, L: ac.state.feet.L }), diag: cp(ac.sol.diag.feet),
            authoredAnkle: { R: Array.from(authored.joint[fb("R")]), L: Array.from(authored.joint[fb("L")]) }, solvedAnkle: { R: Array.from(ac.sol.fk.joint[fb("R")]), L: Array.from(ac.sol.fk.joint[fb("L")]) }, hip: { R: Array.from(ac.sol.fk.joint[hb("R")]), L: Array.from(ac.sol.fk.joint[hb("L")]) } } }); }
      ofRxLink = window.__ofRxLink;
      return { rows, trace: tr, events: JSON.parse(JSON.stringify(S.pt.squad.events)), OF_GAIT: OF_GAIT };
    }, K, mode);
    const r = out[name + "_" + mode]; r.gameplayHash = fnv(JSON.stringify(r.rows) + "|" + JSON.stringify(r.events)); delete r.rows; console.log(name, mode, "gameplay hash", r.gameplayHash);
  }
  fs.writeFileSync(opt("--out"), JSON.stringify({ out, errors: errs }, null, 1)); console.log("page errors", errs.length);
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
