// DEFENDING V1 — slide-tackle review views: runs a defending fixture (of_def_scenarios.js, the same stepping as of_rp_probe.js) and, at the
// requested ticks, renders the real skinned characters from orbit cameras around the DEFENDER (side / front / three-quarter / gameplay),
// plus a pose DIAGNOSIS of the defender (all read-only: the simulation runs exactly as in the probe).
//   node of_def_views.js --scen sl_win --ticks 60,67,80 --out <dir> [--views side,front,tq,rear,top] [--slide v1|v2] [--size 520] [--dist 3.2]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const SC = require(opt("--scenfile", "./of_def_scenarios.js")), NAMES = opt("--scen", "sl_win").split(","), OUT = opt("--out", "def_views");
const TICKS = opt("--ticks", "").split(",").filter(Boolean).map(Number), VIEWS = opt("--views", "side,front,tq").split(","), SIZE = +opt("--size", 520), DIST = +opt("--dist", 3.2);
const PRE = opt("--pre", "");   // page expression evaluated after the drill is set up (e.g. a presentation variant switch)
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-defviews"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); await p.setViewport({ width: 1200, height: 800 }); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(opt("--url", "http://127.0.0.1:8124/sandbox/visual/match.html") + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} }
    // an orbit camera for review renders: glCamera is swapped only for the duration of one render call
    window.__viewRender = (eye, tgt, W, H, fovDeg, ball) => {
      const f = V3.norm(V3.sub(tgt, eye)), r = V3.norm(V3.cross(f, [0, 1, 0])), u = V3.cross(r, f), view = M4.ident();
      view[0] = r[0]; view[4] = r[1]; view[8] = r[2]; view[1] = u[0]; view[5] = u[1]; view[9] = u[2]; view[2] = -f[0]; view[6] = -f[1]; view[10] = -f[2];
      view[12] = -V3.dot(r, eye); view[13] = -V3.dot(u, eye); view[14] = V3.dot(f, eye);
      const t = 1 / Math.tan(fovDeg * Math.PI / 360), N = 0.05, F = 60, proj = new Float32Array(16); proj[0] = t * H / W; proj[5] = t; proj[10] = -(F + N) / (F - N); proj[11] = -1; proj[14] = -2 * F * N / (F - N);
      const _c = glCamera; glCamera = () => ({ view, proj }); const pg = GL3D.pixelScale, prev = GL3D.character; GL3D.pixelScale = 1; GL3D.character = "SKINNED";
      let out; try { const chars = ofSquadChars(); const res = glRenderCharacters(OFPLAY.R, chars, W, H, { ball: ball ? { p: ball, r: 0.11, color: [0.95, 0.95, 0.95] } : null });
        const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.fillStyle = "#3f7f32"; g.fillRect(0, 0, W, H);
        // a ground grid (1 m) for scale, drawn under the characters
        const P = (x, y, z) => { const e = M4.transformPoint(view, [x, y, z]); if (e[2] > -0.05) return null; return [W / 2 + (proj[0] * e[0] / -e[2]) * W / 2, H / 2 - (proj[5] * e[1] / -e[2]) * H / 2]; };
        g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 1; for (let k = -6; k <= 6; k++) { for (const [A, B] of [[[tgt[0] + k, 0, tgt[2] - 6], [tgt[0] + k, 0, tgt[2] + 6]], [[tgt[0] - 6, 0, tgt[2] + k], [tgt[0] + 6, 0, tgt[2] + k]]]) { const pa = P(Math.round(A[0]), 0, Math.round(A[2])), pb = P(Math.round(B[0]), 0, Math.round(B[2])); if (pa && pb) { g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.stroke(); } } }
        g.drawImage(res.canvas, 0, res.canvas.height - res.h, res.w, res.h, 0, 0, W, H); out = c.toDataURL("image/png"); }
      finally { glCamera = _c; GL3D.pixelScale = pg; GL3D.character = prev; }
      return out; };
    // pose diagnosis of one actor (world frame: x = pitch x, y = up, z = −pitch y)
    window.__poseDiag = (a, dir) => {
      const sk = a.skel, fk = a.sol.fk, J = (n) => fk.joint[sk.byName[n].idx], T = (n) => fk.tip[sk.byName[n].idx], W = (n) => fk.world[sk.byName[n].idx];
      const fwd = [Math.cos(dir), 0, -Math.sin(dir)], up = [0, 1, 0], lat = V3.cross(fwd, up);                       // lat = travel-right in world
      const deg = (v) => +(v * 180 / Math.PI).toFixed(1), ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, V3.dot(V3.norm(u), V3.norm(v)))));
      const hipAx = V3.sub(J("thigh_R"), J("thigh_L")), hipYaw = Math.atan2(V3.dot(hipAx, fwd), V3.dot(hipAx, lat));   // 0 = hips square to travel (R hip on travel-right)
      const hipRoll = Math.atan2(hipAx[1], Math.hypot(hipAx[0], hipAx[2]));                                           // + = right hip higher
      const trunk = V3.sub(J("neck"), J("spine")), trunkPitch = Math.atan2(V3.dot(trunk, fwd), trunk[1]);            // + = leaning forward over the legs
      const chestN = M4.transformDir(W("chest"), [0, 0, 1]), chestYaw = Math.atan2(V3.dot(chestN, lat), V3.dot(chestN, fwd));
      const sole = (sd) => { const m = W("foot_" + sd), n = V3.norm(M4.transformDir(m, [0, -1, 0])); return { fwd: +V3.dot(n, fwd).toFixed(2), up: +(-n[1]).toFixed(2), lat: +V3.dot(n, lat).toFixed(2) }; };   // the sole's outward normal (studs) in travel frame
      const rel = (P) => { const d = V3.sub(P, J("pelvis")); return [+V3.dot(d, fwd).toFixed(2), +V3.dot(d, lat).toFixed(2), +P[1].toFixed(2)]; };
      const kneeSep = V3.dist(J("shin_R"), J("shin_L")), footSep = V3.dist(J("foot_R"), J("foot_L"));
      const low = sk.bones.filter(b => b.part && b.name !== "root" && b.name !== "hair").map(b => [b.name, Math.min(J(b.name)[1], T(b.name)[1]) - b.rad]).sort((x, y) => x[1] - y[1]).slice(0, 5).map(x => x[0] + ":" + x[1].toFixed(2));
      const knee = (sd) => deg(ang(V3.sub(J("thigh_" + sd), J("shin_" + sd)), V3.sub(J("foot_" + sd), J("shin_" + sd))));
      return { hipYaw: deg(hipYaw), hipRoll: deg(hipRoll), trunkPitch: deg(trunkPitch), chestYaw: deg(chestYaw), pelvisH: +J("pelvis")[1].toFixed(2),
        kneeR: knee("R"), kneeL: knee("L"), kneeSep: +kneeSep.toFixed(2), footSep: +footSep.toFixed(2), soleR: sole("R"), soleL: sole("L"),
        ankleR: rel(J("foot_R")), ankleL: rel(J("foot_L")), toeR: rel(T("toe_R")), toeL: rel(T("toe_L")), kneeRp: rel(J("shin_R")), kneeLp: rel(J("shin_L")), handL: rel(J("hand_L")), handR: rel(J("hand_R")), head: rel(J("head")), lowest: low }; };
  });
  const all = {};
  for (const name of NAMES) {
    const S0 = SC.SCEN[name]; if (!S0) { console.error("unknown", name); continue; }
    await p.evaluate((D, PRE) => { ofSquadStart("probe", D); window.__watch = []; OFPLAY.animOff = false;
      for (let i = 0; i < D.players.length; i++) { const e = D.players[i].char && OF_CHAR.get(D.players[i].char); if (e && e.status === "ready") { const c = S.pt.squad.ctx[i]; const ac = ofPlayMakeActor(e.skel, c.p); ac.char = e; ac.team = c.team; ac.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; OFSQ.actors[i] = ac; } }
      if (PRE) eval(PRE); }, S0.drill, PRE);
    const last = Math.max(...TICKS, 0); all[name] = {};
    for (let k = 0; k <= last; k++) {
      const r = await p.evaluate((keys, cmd, k, want, VIEWS, SIZE, DIST) => {
        const t = S.pt; t.keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, keys);
        for (const c of (window.__watch || [])) if (!c.fired && k >= c.at) { const me = t.squad.ctx[t.squad.active].p, dB = Math.hypot(t.b.x - me.x, t.b.y - me.y); if (dB <= c.d) { c.fired = k; if (c.do === "standWhen") ptDefStand(t, t.squad.active); else ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : ptDefSlideAim(t, t.squad.ctx[t.squad.active])); } }
        for (const c of cmd) { if (c.do === "standWhen" || c.do === "slideWhen") window.__watch.push(Object.assign({}, c)); else if (c.do === "stand") ptDefStand(t, t.squad.active); else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir); else if (c.do === "humanAi") t.squad.humanAi = true; }
        ptStep();
        if (!want) return null;
        const Q = t.squad, i = Q.active, c = Q.ctx[i], a = OFSQ.actors[i], d = c.def || {}, dir = d.dir != null ? d.dir : c.p.facing;
        const C = [c.p.x, 0.45, -c.p.y], fwd = [Math.cos(dir), 0, -Math.sin(dir)], lat = V3.cross(fwd, [0, 1, 0]);
        const cams = { side: V3.add(C, V3.add(V3.scale(lat, -DIST), [0, 0.5, 0])), sideR: V3.add(C, V3.add(V3.scale(lat, DIST), [0, 0.5, 0])), front: V3.add(C, V3.add(V3.scale(fwd, DIST), [0, 0.7, 0])),
          tq: V3.add(C, V3.add(V3.add(V3.scale(fwd, DIST * 0.7), V3.scale(lat, -DIST * 0.7)), [0, 1.0, 0])), rear: V3.add(C, V3.add(V3.scale(fwd, -DIST), [0, 0.9, 0])), top: V3.add(C, [0.01, DIST * 1.3, 0]) };
        const tgt = V3.add(C, V3.scale(fwd, 0.35)), ball = [t.b.x, Math.max(0, t.b.z) + 0.11, -t.b.y], imgs = {};
        for (const v of VIEWS) imgs[v] = window.__viewRender(cams[v], v === "top" ? V3.add(tgt, [0, -0.45, 0]) : tgt, SIZE, SIZE, 38, ball);
        return { k, phase: a.defA ? a.defA.phase : null, foot: d.foot || null, v: +Math.hypot(c.p.vx, c.p.vy).toFixed(2), diag: window.__poseDiag(a, dir), imgs, events: Q.events.filter(e => e.tick === Q.tick && /TACKLE/.test(e.kind)).map(e => e.kind + ":" + (e.out || "")) };
      }, SC.keysAt(S0, k), (S0.cmds || []).filter(c => c.at === k), k, TICKS.includes(k), VIEWS, SIZE, DIST);
      if (r) { for (const v in r.imgs) fs.writeFileSync(path.join(OUT, `${name}_t${String(k).padStart(3, "0")}_${v}.png`), Buffer.from(r.imgs[v].split(",")[1], "base64")); delete r.imgs; all[name][k] = r; }
    }
  }
  fs.writeFileSync(path.join(OUT, "views.json"), JSON.stringify({ all, errors: errs }, null, 1));
  console.log(JSON.stringify(all, null, 0).slice(0, 200), "\nerrors", errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
