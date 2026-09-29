// SLIDE CONTACT GEOMETRY V1.2 — per-tick geometry of a challenge, measured on the FINAL rendered skeletons (after the slide pose solve,
// the body alignment, the reach IK and every procedural layer) and on the simulation's own contact primitives. Read-only: the fixture is
// stepped exactly as of_rp_probe.js steps it.
//   node of_slide_geo.js --scen sw_right,sw_left --out geo.json [--scenfile ./of_slide_scenarios.js] [--url …] [--pre "<page expr>"] [--anim off]
// Per tick: ball; both roots / velocities; the slide state; the simulation's tackler primitives (leg / body) and the attacker's
// stride-clock segments; the rendered joints (pitch frame x, y, h) of both bodies. Then, from the rendered joints: capsule-vs-capsule
// distances / penetration of every tackler part against every attacker part, the tackling-leg and tucked-leg paths, the leg-ball residual.
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"), fs = require("fs");
const a = process.argv, opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const SC = require(opt("--scenfile", "./of_slide_scenarios.js")), NAMES = opt("--scen", "sw_right").split(",").flatMap(n => n === "all" ? Object.keys(SC.SCEN) : [n]);
const OUT = opt("--out", "slide_geo.json"), URL = opt("--url", "http://127.0.0.1:8150/sandbox/visual/match.html"), PRE = opt("--pre", ""), ANIMOFF = opt("--anim", "on") === "off";
const JN = ["pelvis", "spine", "chest", "neck", "head", "thigh_R", "shin_R", "foot_R", "toe_R", "thigh_L", "shin_L", "foot_L", "toe_L", "upperArm_R", "foreArm_R", "hand_R", "upperArm_L", "foreArm_L", "hand_L"];
// rendered capsules from joints (pitch frame): [name, from, to, radius]; "tip:" = the bone's tip
const CAPS = [["torso", "pelvis", "neck", 0.15], ["head", "head", "tip:head", 0.10], ["thigh_R", "thigh_R", "shin_R", 0.075], ["shin_R", "shin_R", "foot_R", 0.055], ["foot_R", "foot_R", "tip:toe_R", 0.045],
  ["thigh_L", "thigh_L", "shin_L", 0.075], ["shin_L", "shin_L", "foot_L", 0.055], ["foot_L", "foot_L", "tip:toe_L", 0.045], ["uarm_R", "upperArm_R", "foreArm_R", 0.045], ["farm_R", "foreArm_R", "hand_R", 0.04],
  ["uarm_L", "upperArm_L", "foreArm_L", 0.045], ["farm_L", "foreArm_L", "hand_L", 0.04]];
function segseg(p1, q1, p2, q2) {                                                                  // closest distance between 3D segments (Ericson)
  const d1 = q1.map((v, i) => v - p1[i]), d2 = q2.map((v, i) => v - p2[i]), r = p1.map((v, i) => v - p2[i]), dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const A = dot(d1, d1), E = dot(d2, d2), F = dot(d2, r), cl = x => Math.max(0, Math.min(1, x)); let s, t;
  if (A <= 1e-12 && E <= 1e-12) { s = t = 0; } else if (A <= 1e-12) { s = 0; t = cl(F / E); } else { const C = dot(d1, r); if (E <= 1e-12) { t = 0; s = cl(-C / A); } else { const B = dot(d1, d2), den = A * E - B * B; s = den > 1e-12 ? cl((B * F - C * E) / den) : 0; t = (B * s + F) / E; if (t < 0) { t = 0; s = cl(-C / A); } else if (t > 1) { t = 1; s = cl((B - C) / A); } } }
  const P = p1.map((v, i) => v + d1[i] * s), Q = p2.map((v, i) => v + d2[i] * t); return { d: Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]), P, Q };
}
function caps(J) { return CAPS.map(([n, f, t, r]) => ({ n, a: J[f], b: t.startsWith("tip:") ? J[t] : J[t], r })).filter(c => c.a && c.b); }
function analyse(res) {
  const rows = res.rows, ti = res.tackler, ai = res.attacker, out = [];
  for (const r of rows) {
    const T = r.J[ti], Aj = r.J[ai]; if (!T || !Aj) { out.push(null); continue; }
    const CT = caps(T), CA = caps(Aj); let worst = null; const pairs = [];
    for (const x of CT) for (const y of CA) { const s = segseg(x.a, x.b, y.a, y.b), pen = x.r + y.r - s.d; if (pen > 0) pairs.push([x.n, y.n, +pen.toFixed(3)]); if (!worst || pen > worst.pen) worst = { t: x.n, a: y.n, pen: +pen.toFixed(3), d: +s.d.toFixed(3) }; }
    // the ball against the tackler's rendered legs (sphere r 0.11 at height z + 0.11): visual leg-through-ball on ANY tick
    const bc = [r.ball[0], r.ball[1], r.ball[2] + 0.11]; let bw = null;
    for (const x of CT) { if (!/^(thigh|shin|foot)_/.test(x.n)) continue; const s = segseg(x.a, x.b, bc, bc), pen = x.r + 0.11 - s.d; if (!bw || pen > bw.pen) bw = { part: x.n, pen: +pen.toFixed(3) }; }
    out.push({ k: r.k, worst, pairs: pairs.sort((u, v) => v[2] - u[2]).slice(0, 6), ball: bw });
  }
  return out;
}
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: opt("--udd", "chrome-slidegeo"), args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setCacheEnabled(false); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 300)));
  await p.goto(URL + "?ofPlay=1&fps=60&r=" + Date.now(), { waitUntil: "load", timeout: 180000 });
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => typeof OFPLAY !== "undefined" && OFPLAY.on && OFPLAY.actor && OFPLAY.actor.sol)) break; await new Promise(r => setTimeout(r, 100)); }
  await p.evaluate(async () => { S.pt.paused = true; for (const id of OF_CHAR.order) { try { await ofCharLoad(id); } catch (e) {} } });
  const all = {};
  for (const name of NAMES) {
    const S0 = SC.SCEN[name]; if (!S0) { console.error("unknown", name); continue; }
    await p.evaluate((S0, PRE, ANIMOFF) => {
      const D = JSON.parse(JSON.stringify(S0.drill)); ofSquadStart("geo", D); window.__watch = []; if (PRE) eval(PRE); OFPLAY.animOff = ANIMOFF;
      for (let i = 0; i < D.players.length; i++) { const id = D.players[i].char, e = id && OF_CHAR.get(id);
        if (e && e.status === "ready") { const c = S.pt.squad.ctx[i]; const ac = ofPlayMakeActor(e.skel, c.p); ac.char = e; ac.team = c.team; ac.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; OFSQ.actors[i] = ac; } }
      OFPLAY.actor = OFSQ.actors[S.pt.squad.active]; OFSQ.cam = null;
    }, S0, PRE, ANIMOFF);
    const rows = [];
    for (let k = 0; k < S0.ticks; k++) {
      const cmd = (S0.cmds || []).filter(c => c.at === k), keys = SC.keysAt(S0, k);
      rows.push(await p.evaluate((keys, cmd, k, JN) => {
        const t = S.pt; t.keys = Object.assign({ up: false, down: false, left: false, right: false, sprint: false, walk: false, jog: false }, keys);
        for (const c of cmd) { if (c.do === "humanAi") t.squad.humanAi = true; else if (c.do === "slide") ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : null); else if (c.do === "stand") ptDefStand(t, t.squad.active); }
        for (const c of (window.__watch || [])) if (!c.fired && k >= c.at) { const me = t.squad.ctx[t.squad.active].p, dB = Math.hypot(t.b.x - me.x, t.b.y - me.y);
          if (dB <= c.d) { c.fired = k; if (c.do === "standWhen") ptDefStand(t, t.squad.active); else ptDefSlide(t, t.squad.active, c.dir != null ? c.dir : ptDefSlideAim(t, t.squad.ctx[t.squad.active])); } }
        for (const c of cmd) if (c.do === "standWhen" || c.do === "slideWhen") (window.__watch || (window.__watch = [])).push(Object.assign({}, c));
        ptStep(); updateRig(1 / 60, null); draw(null, 1 / 60);
        const Q = t.squad, bl = t.b, W = (v) => [+v[0].toFixed(4), +(-v[2]).toFixed(4), +v[1].toFixed(4)];   // rig (x, h, −y) → pitch (x, y, h)
        const P = Q.ctx.map(c => { const d = c.def, r = c.react; return { x: +c.p.x.toFixed(4), y: +c.p.y.toFixed(4), vx: +c.p.vx.toFixed(3), vy: +c.p.vy.toFixed(3), f: +c.p.facing.toFixed(4),
          def: d ? { kind: d.kind, foot: d.foot, tuck: d.tuck || null, tech: d.tech || null, dir: d.dir, vNow: d.vNow, launchAt: d.launchAt, stopAt: d.stopAt, sweep: d.sweepA != null ? +d.sweepA.toFixed(4) : null, vLat: d.vLat != null ? +d.vLat.toFixed(3) : null, contact: d.contact ? d.contact.out : null, manifold: d.manifold ? JSON.parse(JSON.stringify(d.manifold)) : null } : null,
          react: r ? { kind: r.kind, tGround: r.tGround, tFall: r.tFall, family: r.family, push: r.push ? r.push.map(v => +v.toFixed(3)) : null } : null }; });
        const J = OFSQ.actors.map(ac => { if (!ac || !ac.sol || OFPLAY.animOff) return null; const fk = ac.sol.fk, sk = ac.skel, o = {};
          for (const n of JN) { const bn = sk.byName[n]; if (bn) o[n] = W(fk.joint[bn.idx]); }
          for (const n of ["head", "toe_R", "toe_L", "hand_R", "hand_L"]) { const bn = sk.byName[n]; if (bn) o["tip:" + n] = W(fk.tip[bn.idx]); } return o; });
        let prims = null, segs = null; const ti = Q.ctx.findIndex(c => c.def && c.def.kind === "SLIDE");
        if (ti >= 0 && typeof ptRxTacklerPrims === "function") { const d = Q.ctx[ti].def; if (t.now >= d.launchAt) { const keep = d.launchT; d.launchT = t.now - d.launchAt; prims = ptRxTacklerPrims(Q.ctx[ti], 0).map(q => ({ prim: q.prim, a: q.a.map(v => +v.toFixed(3)), b: q.b.map(v => +v.toFixed(3)), r: q.r })); d.launchT = keep; } }
        const ai = Q.ctx.findIndex(c => c.team === 0); if (ai >= 0 && typeof ptRxBody === "function") segs = ptRxSegments(ptRxBody(Q.ctx[ai], 0)).map(s => ({ n: s.name, a: s.a.map(v => +v.toFixed(3)), b: s.b.map(v => +v.toFixed(3)), r: s.r, pl: s.planted }));
        const X = OFSQ.actors.map(ac => { const A = ac && ac.defA; if (!A || A.kind !== "SLIDE") return null; const dg = ac.sol && ac.sol.diag && ac.sol.diag.reach ? ac.sol.diag.reach : null;
          return { plan: A.plan ? { at: +A.plan.at.toFixed(4), ball: A.plan.ball.map(v => +v.toFixed(3)) } : null, hit: A.hit, sweepTh: A.sweepTh, reach: dg }; });
        return { X, k, now: +t.now.toFixed(4), ball: [bl.x, bl.y, bl.z, bl.vx, bl.vy].map(v => +v.toFixed(4)), owner: bl.owner == null ? -1 : bl.owner, P, J, prims, segs };
      }, keys, cmd, k, JN));
    }
    const ev = await p.evaluate(() => ({ events: S.pt.squad.events, def: OFSQ.defRecs || [], sweep: OFSQ.actors.map(a => a && a.skel ? a.skel._defSweep || null : null), align: OFSQ.actors.map(a => a && a.skel ? a.skel._defAlign || null : null) }));
    const res = { name, rows, events: ev.events, defRecs: ev.def, sweep: ev.sweep, align: ev.align, tackler: 1, attacker: 0 };
    res.pen = analyse(res); all[name] = res;
    const tk = ev.events.filter(e => /TACKLE|CONTACT|LOOSE/.test(e.kind)).map(e => `${e.kind}@${e.tick}${e.out ? ":" + e.out : ""}${e.foot ? ":" + e.foot : ""}${e.seg ? ":" + e.seg : ""}${e.react ? ":" + e.react : ""}`).join(" ");
    const pk = res.pen.filter(Boolean).reduce((m, q) => q.worst && q.worst.pen > m.pen ? { pen: q.worst.pen, k: q.k, t: q.worst.t, a: q.worst.a } : m, { pen: -1 });
    const nPen = res.pen.filter(q => q && q.worst && q.worst.pen > 0.03).length;
    console.log(name.padEnd(18), tk, `| worst rendered penetration ${(pk.pen * 100).toFixed(1)} cm @${pk.k} ${pk.t}×${pk.a} | ticks >3 cm: ${nPen}`);
  }
  fs.writeFileSync(OUT, JSON.stringify({ all, errors: errs })); console.log("page errors", errs.length, errs.slice(0, 3));
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]).catch(() => {}); process.exit(0);
})();
