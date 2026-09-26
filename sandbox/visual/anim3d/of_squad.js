// ═══ anim3d/of_squad.js — RECEIVING + PASSING V1: the live multi-player harness (presentation + temporary test controls) ════════════
// Enable with  match.html?ofPlay=1&squad=7|8|9[&fps=60]  (or press 7 / 8 / 9 inside ?ofPlay=1).
// The simulation is pt_squad.js on the playtest (several outfield players, one authoritative ball, the ported world.py laws). This file
// gives every squad player his own skeletal actor — real Astra characters on their own binds — and drives each one from THAT player's
// authoritative context exactly as the single-player harness drives its one actor: locomotion from his root / velocity / facing / stride
// clock, kicks from his scheduled kick, dribble touches from his touch plan, receptions from his reception plan and contact record.
// It never writes the simulation; with OFPLAY.animOff the whole layer is skipped and the simulation runs on, bit-identical.
const OFSQ = { on: false, drill: null, actors: [], recvRecs: [], passRecs: [], names: true, perf: { plan: [], pres: [] }, lastRecvTick: -1, cam: null };
// drills: authoritative fixtures (positions, facings, who has the ball, off-ball intent). Characters are presentation only.
const OFSQ_DRILLS = {
  "7": { label: "TWO PLAYERS — A <-> B", center: [63, 34], owner: 0, active: 0, players: [
    { name: "A", x: 57, y: 34, facing: 0, char: "cucurella", ai: { mode: "SUPPORT" } },
    { name: "B", x: 70, y: 31.5, facing: Math.PI, char: "gabriel", ai: { mode: "SUPPORT" } }] },
  "8": { label: "THREE — passing triangle", center: [65, 34], owner: 0, active: 0, players: [
    { name: "A", x: 57, y: 36, facing: 0, char: "cucurella", ai: { mode: "SUPPORT" } },
    { name: "B", x: 69, y: 28, facing: Math.PI, char: "gabriel", ai: { mode: "SUPPORT" } },
    { name: "C", x: 71, y: 40, facing: Math.PI, char: "james", ai: { mode: "SUPPORT" } }] },
  "9": { label: "3 v 2 — passive lane shadows (no tackling: they only intercept what reaches their boots)", center: [65, 34], owner: 0, active: 0, players: [
    { name: "A", x: 57, y: 36, facing: 0, char: "cucurella", ai: { mode: "SUPPORT" } },
    { name: "B", x: 69, y: 28, facing: Math.PI, char: "gabriel", ai: { mode: "SUPPORT" } },
    { name: "C", x: 71, y: 40, facing: Math.PI, char: "james", ai: { mode: "SUPPORT" } },
    { name: "D1", team: 1, x: 64, y: 31, facing: Math.PI, char: null, body: "AVG_LEAN", ai: { mode: "SHADOW" }, mark: 1 },
    { name: "D2", team: 1, x: 65, y: 38, facing: Math.PI, char: null, body: "TALL_POWER", ai: { mode: "SHADOW" }, mark: 2 }] },
  // DEFENDING V1 (Shift+7 / Shift+8 / Shift+9, or ?squad=D7|D8|D9): the defensive drills — the attacker carries, you defend (Tab switches)
  "D7": { label: "1 v 1 — you defend (Z hold jockey · Space stand tackle · F slide)", defending: true, box: [44, 86, 16, 52], center: [65, 34], owner: 0, active: 1, autoSwitch: false, players: [
    { name: "A", team: 0, x: 56, y: 34, facing: 0, char: "vinicius", ai: { mode: "SSG", gear: "jog", weave: 3, weaveW: 0.8 } },
    { name: "D", team: 1, x: 70, y: 33, facing: Math.PI, char: "gabriel", ai: { mode: "SSG", gear: "jog" } }] },
  "D8": { label: "2 v 2 small-sided — possession contests flow (you: D1)", defending: true, box: [44, 86, 16, 52], center: [65, 34], owner: 0, active: 2, autoSwitch: false, players: [
    { name: "A1", team: 0, x: 52, y: 30, facing: 0, char: "vinicius", ai: { mode: "SSG", gear: "jog" } },
    { name: "A2", team: 0, x: 54, y: 42, facing: 0, char: "szoboszlai", ai: { mode: "SSG", gear: "jog" } },
    { name: "D1", team: 1, x: 70, y: 31, facing: Math.PI, char: "gabriel", ai: { mode: "SSG", gear: "jog" } },
    { name: "D2", team: 1, x: 71, y: 40, facing: Math.PI, char: "cucurella", ai: { mode: "SSG", gear: "jog" } }] },
  "D9": { label: "3 v 3 small-sided — pass, receive, dribble, jockey, tackle, intercept (you: D1)", defending: true, box: [40, 90, 12, 56], center: [65, 34], owner: 0, active: 3, autoSwitch: false, players: [
    { name: "A1", team: 0, x: 50, y: 34, facing: 0, char: "vinicius", ai: { mode: "SSG", gear: "jog" } },
    { name: "A2", team: 0, x: 53, y: 24, facing: 0, char: "szoboszlai", ai: { mode: "SSG", gear: "jog" } },
    { name: "A3", team: 0, x: 53, y: 44, facing: 0, char: "james", ai: { mode: "SSG", gear: "jog" } },
    { name: "D1", team: 1, x: 72, y: 34, facing: Math.PI, char: "gabriel", ai: { mode: "SSG", gear: "jog" } },
    { name: "D2", team: 1, x: 74, y: 25, facing: Math.PI, char: "cucurella", ai: { mode: "SSG", gear: "jog" } },
    { name: "D3", team: 1, x: 74, y: 43, facing: Math.PI, char: "osimhen", ai: { mode: "SSG", gear: "jog" } }] },
};
function ofSquadWanted() { return new URLSearchParams(location.search).get("squad"); }
function ofSquadStart(key, specOverride) {
  const D = specOverride || OFSQ_DRILLS[key]; if (!D) return;
  const spec = { players: D.players.map(p => Object.assign({}, p, { home: p.home || [p.x, p.y] })), owner: D.owner, active: D.active, autoSwitch: D.autoSwitch !== false, center: D.center || [60, 34], ball: D.ball, defending: !!D.defending, box: D.box || null };
  const Q = ptSquadSetup(spec); Q.spec.center = spec.center;
  OFSQ.on = true; OFSQ.drill = key; OFSQ.recvRecs = []; OFSQ.passRecs = []; OFSQ.defRecs = []; OFSQ.lastRecvTick = -1;
  OFSQ.actors = Q.ctx.map((c, i) => ofSquadMakeActor(D.players[i], c));
  for (let i = 0; i < D.players.length; i++) { const id = D.players[i].char; if (!id) continue;
    ofCharLoad(id).then((ent) => { if (OFSQ.drill !== key || !S.pt.squad || S.pt.squad !== Q) return; const c = Q.ctx[i]; const a = ofPlayMakeActor(ent.skel, c.p); a.char = ent; a.team = c.team; a.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; OFSQ.actors[i] = a; if (i === Q.active) OFPLAY.actor = a; }).catch(() => {}); }
  OFPLAY.actor = OFSQ.actors[Q.active];
  S.pt.last = "SQUAD DRILL " + key + " — " + D.label;
}
function ofSquadMakeActor(ps, c) {
  const a = ofPlayMakeActor(ps.body || "AVG_ATHLETIC", c.p); a.char = null; a.team = c.team; a.palette = c.team ? OFPLAY_KIT_B : SKEL_PARTS; return a;
}
// ── per simulation tick: every player's actor from his own authoritative context (the harness calls this instead of the single actor) ──
function ofSquadPresent(t) {
  const Q = t.squad; if (!Q || !OFSQ.on) return;
  const t0 = performance.now();
  ptSqOut(t, Q.ctx[Q.active]);
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i], a = OFSQ.actors[i]; if (!a) continue; ptSqIn(t, c);
    const p = c.p; a.x = p.x; a.y = p.y; a.facing = p.facing; a.speed = Math.hypot(p.vx, p.vy);
    a.sim = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing, gaitPhase: p.gaitPhase, gaitSettled: p.gaitSettled };
    ofPlayKickLink(t, a); ofPlayTouchLink(t, a); ofRecvLink(t, a, Q.tick);
    if (Q.spec.defending && typeof ofDefLink === "function") ofDefLink(t, a, c, Q.tick);          // DEFENDING V1 (defending drills only)
    ofActorTick(a, PT_DT, t.now);
    if (a.defMeasure) { const A = a.defMeasure; a.defMeasure = null; const m = ofDefMeasure(a, A);
      const rec = Object.assign({ tick: Q.tick, t: +t.now.toFixed(4), pid: i, name: c.name, char: a.char ? a.char.id : "generic", sim: A.res }, m);
      (OFSQ.defRecs || (OFSQ.defRecs = [])).push(rec); if (OFSQ.defRecs.length > 400) OFSQ.defRecs.shift(); OFSQ.lastDef = rec; }
    if (a.recvMeasure) { const R = a.recvMeasure; a.recvMeasure = null; const m = ofRecvMeasure(a, R);
      const rec = Object.assign({ tick: Q.tick, t: +t.now.toFixed(4), pid: i, name: c.name, char: a.char ? a.char.id : "generic", sim: R.rec }, m);
      OFSQ.recvRecs.push(rec); if (OFSQ.recvRecs.length > 400) OFSQ.recvRecs.shift(); OFSQ.lastRecv = rec; }
    const k = c.kick;
    if (k && k.kicked && a._kickMeasured !== k) {                                               // the contact tick of this player's kick: final-state boot vs the ball where it WAS
      a._kickMeasured = k; const ev = Q.events.slice().reverse().find(e => (e.kind === "PASS" || e.kind === "SHOT") && e.pid === i);
      if (ev && ev.ball) { const sd = k.foot === "L" ? "L" : "R", fk = a.sol.fk, sk = a.skel, ctr = [ev.ball[0], Math.max(0, ev.ball[2]) + 0.11, -ev.ball[1]];
        const surf = a.kickSurf ? ofBootSurfacePoint(sk, fk, sd, a.kickSurf) : fk.tip[sk.byName["toe_" + sd].idx];
        const d = a.sol.diag, pf = d.feet[sd === "R" ? "L" : "R"] || {}, rc = (d.reach && d.reach[sd]) || null;
        const rec = { tick: Q.tick, pid: i, name: c.name, char: a.char ? a.char.id : "generic", kind: ev.kind, fam: k.fam, tech: k.tech, foot: sd, surfName: a.kickSurf || "toe",
          surf: +(V3.dist(surf, ctr) - 0.11).toFixed(4), v0: ev.v0, reachApplied: rc ? rc.applied : null, reachCapped: rc ? !!rc.capped : null,
          plantMode: pf.mode || null, plantContact: !!pf.contact, plantSlide: pf.slide != null ? pf.slide : null, warp: a.kickS && a.kickS.diag ? { in: a.kickS.diag.warpIn, out: a.kickS.diag.warpOut, warped: a.kickS.diag.warped } : null,
          speed: +Math.hypot(p.vx, p.vy).toFixed(3) };
        OFSQ.passRecs.push(rec); if (OFSQ.passRecs.length > 400) OFSQ.passRecs.shift(); OFSQ.lastPass = rec; } }
    ptSqOut(t, c);
  }
  ptSqIn(t, Q.ctx[Q.active]);
  OFPLAY.actor = OFSQ.actors[Q.active] || OFPLAY.actor;
  OFSQ.perf.pres.push(performance.now() - t0); if (OFSQ.perf.pres.length > 600) OFSQ.perf.pres.shift();
}
// characters to draw: every squad actor (real characters share GPU buffers by reference)
function ofSquadChars() {
  const out = []; for (const a of OFSQ.actors) if (a && a.sol) out.push({ skel: a.skel, fk: a.sol.fk, skinMats: a.skinMats, palette: a.palette || SKEL_PARTS, char: a.char || null });
  return out;
}
function ofSquadFocus(t) {                                                                      // the view: between the player you control and the ball
  const b = t.b, p = t.p, fx = 0.5 * (p.x + b.x), fy = 0.5 * (p.y + b.y);
  if (!OFSQ.cam) OFSQ.cam = [fx, fy]; OFSQ.cam[0] += (fx - OFSQ.cam[0]) * 0.08; OFSQ.cam[1] += (fy - OFSQ.cam[1]) * 0.08; return OFSQ.cam;
}
// ── overlay: names, who you control, who has the ball, the pass target, each receiver's plan (boot + contact point) ──────────────
function ofSquadOverlay() {
  const t = S.pt, Q = t && t.squad; if (!Q || OFSQ.overlay === false) return;
  const P = (x, y, z) => sproj3(x, z || 0, y); ctx.save(); ctx.lineWidth = Math.max(1, PXQ); ctx.font = (uipx(10) | 0) + "px Menlo, monospace";
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i], p = c.p, q = P(p.x, p.y), a = OFSQ.actors[i];
    if (i === Q.active) { ctx.strokeStyle = "#ffe36a"; ctx.beginPath(); ctx.ellipse(q.x, q.y, uipx(14), uipx(5), 0, 0, Math.PI * 2); ctx.stroke(); }
    if (t.b.owner === i) { ctx.fillStyle = "#38ff9a"; ctx.beginPath(); ctx.arc(q.x, q.y + uipx(8), uipx(2.5), 0, Math.PI * 2); ctx.fill(); }
    if (OFSQ.names) { ctx.fillStyle = c.team ? "#ff8a80" : (i === Q.active ? "#ffe36a" : "#e8e6e0");
      ctx.fillText(c.name + (a && a.char ? " " + a.char.rig.identity.name.split(" ").pop() : "") + (c.assist ? " (receiving)" : ""), q.x + uipx(10), q.y + uipx(14)); }
    const pl = c.recvPlan;
    if (pl) { const cp = P(pl.ball[0], pl.ball[1]), bp = P(pl.boot[0], pl.boot[1]); ctx.strokeStyle = pl.stretch ? "#ff9a3c" : "#ffe36a";
      ctx.beginPath(); ctx.arc(cp.x, cp.y, uipx(4), 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.lineTo(cp.x, cp.y); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.fillText(pl.foot + " in " + ((pl.k * 1000 / 60) | 0) + "ms" + (pl.stretch ? " STRETCH" : ""), cp.x + uipx(6), cp.y - uipx(6)); }
  }
  const ps = Q.pass; if (ps && !ps.done) { const tp = P(ps.target[0], ps.target[1]); ctx.strokeStyle = "#8ab4f8"; ctx.setLineDash([uipx(3), uipx(3)]);
    ctx.beginPath(); ctx.moveTo(P(t.b.x, t.b.y).x, P(t.b.x, t.b.y).y); ctx.lineTo(tp.x, tp.y); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(tp.x, tp.y, uipx(5), 0, Math.PI * 2); ctx.stroke(); }
  if (Q.spec.defending) for (let i = 0; i < Q.ctx.length; i++) { const c = Q.ctx[i], d = c.def; if (!d) continue;   // DEFENDING V1: the action the simulation is running
    const q = P(c.p.x, c.p.y); ctx.strokeStyle = d.kind === "SLIDE" ? "#ff5a5a" : "#ffb03c";
    if (d.kind === "SLIDE") { const e = P(c.p.x + Math.cos(d.dir) * 1.5, c.p.y + Math.sin(d.dir) * 1.5); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(e.x, e.y); ctx.stroke(); }
    else if (!d.resolved) { const bq = P(t.b.x, t.b.y); ctx.setLineDash([uipx(2), uipx(2)]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(bq.x, bq.y); ctx.stroke(); ctx.setLineDash([]); } }
  const tkE = Q.events.slice().reverse().find(e => e.kind === "TACKLE" && e.point); if (tkE && Q.tick - tkE.tick < 50) { const c = P(tkE.point[0], tkE.point[1]); ctx.strokeStyle = tkE.out === "WON" ? "#38ff9a" : tkE.out === "POKE" ? "#ffe36a" : "#ff5a5a";
    ctx.beginPath(); ctx.arc(c.x, c.y, uipx(7), 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.fillText(tkE.type + " " + tkE.out, c.x + uipx(9), c.y - uipx(8)); }
  const lr = OFSQ.lastRecv; if (lr && Q.tick - lr.tick < 40) { const c = P(lr.sim.point[0], lr.sim.point[1]); ctx.strokeStyle = "#ff5ad0"; ctx.beginPath(); ctx.arc(c.x, c.y, uipx(6), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ff5ad0"; ctx.fillText(lr.foot + " " + lr.style + " " + (lr.surf * 100).toFixed(1) + "cm", c.x + uipx(8), c.y + uipx(12)); }
  ctx.restore();
}
function ofSquadHud() {
  const t = S.pt, Q = t && t.squad; if (!Q) return "";
  const b = t.b, ps = Q.pass, ev = Q.events.slice(-5).map(e => e.kind + (e.pid != null ? "·" + Q.ctx[e.pid].name : "") + (e.outcome ? "·" + e.outcome : "") + (e.foot ? "·" + e.foot : "")).join("  ");
  const lr = OFSQ.lastRecv, lp = OFSQ.lastPass, mean = (v) => v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
  const rows = Q.ctx.map((c, i) => `${i === Q.active ? ">" : " "} ${c.name.padEnd(3)} ${c.team ? "B" : "A"} ${(OFSQ.actors[i] && OFSQ.actors[i].char ? OFSQ.actors[i].char.id : "generic").padEnd(10)} v ${Math.hypot(c.p.vx, c.p.vy).toFixed(1)}  ${c.def ? (c.def.kind === "STAND" ? (c.def.resolved ? "TACKLE " + (c.def.result ? c.def.result.out : "") + " recovering" : "STAND TACKLE " + c.def.foot) : "SLIDE " + c.def.foot + (OFSQ.actors[i] && OFSQ.actors[i].defA && OFSQ.actors[i].defA.phase ? " " + OFSQ.actors[i].defA.phase : "")) : c.aiJockey || (i === Q.active && t.keys && t.keys.jockey && b.owner !== i) ? "JOCKEY" : ""}${b.owner === i ? "BALL " + (c.ctrlState || "") : c.kick ? "KICK " + c.kick.tech + " " + c.kick.foot : c.recvPlan ? "RECV " + c.recvPlan.foot + " " + ((c.recvPlan.k * 1000 / 60) | 0) + "ms" : c.assist ? "assist" : c.ai.mode}`).join("\n");
  return `SQUAD       drill ${OFSQ.drill}  tick ${Q.tick}  ball ${b.owner != null ? "owned by " + Q.ctx[b.owner].name : "FREE " + Math.hypot(b.vx, b.vy).toFixed(1) + " m/s"}  auto-switch ${Q.autoSwitch ? "ON" : "off"}
${rows}
pass        ${ps ? (ps.pending ? "winding up " : ps.done ? "done " : "in flight ") + ps.fam + " -> " + (ps.to != null ? Q.ctx[ps.to].name : "space") + (ps.tech ? "  " + ps.tech + " " + ps.foot + "  " + (ps.v0 || 0).toFixed(1) + " m/s" : "") : "-"}
last pass   ${lp ? lp.name + " " + lp.fam + " " + lp.tech + " " + lp.foot + "  boot(" + lp.surfName + ")-ball " + (lp.surf * 100).toFixed(1) + " cm  plant " + (lp.plantContact ? "LOCKED" : lp.plantMode) + (lp.warp && lp.warp.warped ? "  WARP-CLAMPED" : "") : "-"}
last recv   ${lr ? lr.name + " " + lr.foot + " " + lr.style + " " + lr.outcome + "  inside-ball " + (lr.surf * 100).toFixed(1) + " cm  reach " + ((lr.reachApplied || 0) * 100).toFixed(0) + "cm" + (lr.reachCapped ? " CAPPED" : "") + "  plant " + (lr.plantContact ? "LOCKED" : lr.plantMode) + "  rv " + lr.sim.rv.toFixed(1) : "-"}
events      ${ev}${Q.spec.defending ? "\n" + ofSquadDefHud(Q) : ""}
squad cost  receive plan ${mean(OFSQ.perf.plan).toFixed(3)} ms${Q.spec.defending && OFSQ.perf.def ? "  defending sim " + mean(OFSQ.perf.def).toFixed(3) + " ms" : ""}  presentation ${mean(OFSQ.perf.pres).toFixed(2)} ms (${Q.ctx.length} rigs)${typeof ofAutoHud === "function" && ofAutoHud() ? "\n" + ofAutoHud() : ""}`;
}
function ofSquadDefHud(Q) {
  const tk = Q.events.slice().reverse().find(e => e.kind === "TACKLE"), bc = Q.events.slice().reverse().find(e => e.kind === "TACKLE_BODY_CONTACT"), ld = OFSQ.lastDef;
  const nm = (i) => i == null ? "-" : Q.ctx[i].name;
  const l1 = tk ? `last tackle ${nm(tk.pid)} ${tk.type} ${tk.foot} ${tk.out}${tk.why ? " (" + tk.why + ")" : ""}${tk.q != null ? "  q " + tk.q : ""}${tk.expose != null ? "  exposure " + tk.expose : ""}${tk.behind ? "  FROM BEHIND" : ""}  tick ${tk.tick}${tk.relV != null ? "  rel.v " + tk.relV : ""}${tk.slideDist != null ? "  slide " + tk.slideDist + " m" : ""}` : "last tackle -";
  const l2 = ld ? `  rendered   ${ld.name} ${ld.kind} ${ld.foot}: inside-face–ball ${(ld.insideSurf * 100).toFixed(1)} cm  leg–ball ${(ld.legSurf * 100).toFixed(1)} cm  knee ${ld.knee}°${ld.reachCapped ? "  REACH CAPPED" : ""}` : "";
  const l3 = bc ? `  body contact ${nm(bc.pid)} on ${nm(bc.on)} tick ${bc.tick} — ${bc.ballFirst ? "ball first" : "MAN FIRST"} (facts for the foul model; no call in the playtest)` : "";
  const DEFK = typeof OFDEF !== "undefined" && typeof ofDefHud === "function" ? ofDefHud() : "";
  return [l1, l2, l3, "controls    Z hold jockey · Space stand tackle · F slide · Tab switch · R restart · Shift+Y auto defend", DEFK].filter(Boolean).join("\n");
}
// ── temporary controls (capture phase, only while a squad drill runs) ──────────────────────────────────────────────────────────
function ofSquadKeys() {
  window.addEventListener("keydown", (e) => {
    if (!OFPLAY.on || !S.pt || !S.pt.on) return; if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON")) return;
    const k = e.key.toLowerCase(), t = S.pt;
    const dk = e.shiftKey && /^Digit[789]$/.test(e.code) ? "D" + e.code.slice(5) : null;             // DEFENDING V1 drills: Shift+7/8/9
    if (dk) { ofSquadStart(dk); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (OFSQ_DRILLS[k]) { ofSquadStart(k); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!t.squad) return;
    if (t.squad.spec.defending && !t.b.ctrl && (k === "z" || k === " " || k === "f")) {             // DEFENDING V1 (only while you do NOT have the ball)
      const Q = t.squad;
      if (k === "z") t.keys.jockey = true;
      else if (k === " ") { if (!e.repeat) ptDefStand(t, Q.active); }
      else if (k === "f" && !e.repeat) { const K = t.keys, ix = (K.right ? 1 : 0) - (K.left ? 1 : 0), iy = (K.down ? 1 : 0) - (K.up ? 1 : 0); ptDefSlide(t, Q.active, ix || iy ? Math.atan2(iy, ix) : null); }
      e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (k === " ") ptSquadPass(t, "SHORT");
    else if (k === "o") ptSquadPass(t, "DRIVEN");
    else if (k === "i") ptSquadPass(t, "THROUGH");
    else if (k === "tab") ptSquadSwitch(t);
    else if (k === "t") { t.squad.autoSwitch = !t.squad.autoSwitch; t.last = "AUTO-SWITCH -> " + (t.squad.autoSwitch ? "ON (you take over the receiver)" : "OFF"); }
    else if (k === "r" || k === "0") ofSquadStart(OFSQ.drill);
    else if (k === "p") { t.pfoot = t.pfoot === "L" ? "R" : "L"; t.last = "PREFERRED FOOT (" + t.squad.ctx[t.squad.active].name + ") -> " + t.pfoot; }
    else if (k === "u") { OFSQ.names = !OFSQ.names; }
    else if (k === "j") {                                                                       // the ball to the player you control (carrying)
      const Q = t.squad, p = t.p, b = t.b; b.x = p.x + Math.cos(p.facing) * 0.5; b.y = p.y + Math.sin(p.facing) * 0.5; b.z = 0; b.vx = p.vx; b.vy = p.vy; b.vz = 0;
      b.owner = Q.active; b.ctrl = true; b.exclPid = null; b.curve = null; Q.pass = null; t.touchPlan = null; t.p.touchT = 0; t.last = "BALL -> " + Q.ctx[Q.active].name; }
    else if (k === "z" && t.squad.spec.defending) return;
    else if (k === "escape") { OFSQ.on = false; t.squad = null; ptReset(); OFPLAY.actor = ofPlayMakeActor(OFPLAY.body, t.p); t.last = "SQUAD OFF"; }
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener("keyup", (e) => { if (e.key.toLowerCase() === "z" && S.pt && S.pt.keys && S.pt.keys.jockey) { S.pt.keys.jockey = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}
// receive-plan cost (simulation side): timed from outside, never changes what it computes
function ofSquadInstrument() {
  if (ofSquadInstrument.done) return; ofSquadInstrument.done = true;
  const _r = ptSquadReceive; ptSquadReceive = function (t) { const t0 = performance.now(); _r(t); OFSQ.perf.plan.push(performance.now() - t0); if (OFSQ.perf.plan.length > 600) OFSQ.perf.plan.shift(); };
  if (typeof ptDefResolve === "function") { OFSQ.perf.def = [];                                   // DEFENDING V1 simulation cost (AI intents + occupancy + contacts), timed from outside
    const wrap = (fn) => function (t) { const t0 = performance.now(); fn(t); if (t.squad && t.squad.spec.defending) { OFSQ.perf.defAcc = (OFSQ.perf.defAcc || 0) + performance.now() - t0; } };
    const _i = ptDefIntents, _o = ptDefOccupancy, _c = ptDefResolve; ptDefIntents = wrap(_i); ptDefOccupancy = wrap(_o);
    ptDefResolve = function (t) { const t0 = performance.now(); _c(t); if (t.squad && t.squad.spec.defending) { OFSQ.perf.def.push((OFSQ.perf.defAcc || 0) + performance.now() - t0); OFSQ.perf.defAcc = 0; if (OFSQ.perf.def.length > 600) OFSQ.perf.def.shift(); } }; }
}
