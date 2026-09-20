// ═══ GOALKEEPER PRESENTATION BACKEND INTERFACE (prototype/3d-animation-pipeline) ═══════════════
// The simulation (ptGkUpdate / gkTryContact) and the animation semantics (gkAnimUpdate) are shared;
// a BACKEND only decides how the described action is drawn. Two backends can exist side by side:
//   SPRITE       — the approved sprite / baked-sequence renderer (gkAnimDraw), the default;
//   SKELETAL_3D  — the prototype skeletal renderer (registered by anim3d/gk3d_backend.js when loaded).
// Switching backends must never change the simulation: the same ActionDescription is consumed by both
// and the trace gate (tools/anim3d/gk3d_gate.js) proves byte-identical keeper/ball traces.
// Review-only controls: URL ?gkBackend=3d|sprite · debug-panel select #gk-backend · key 8 inside the playtest.
const GK_PRESENTATION = {
  backend: "SPRITE",
  backends: {},                          // name -> { draw(t, gk, dt) -> bool, reset?(), label }
  order: ["SPRITE", "SKELETAL_3D"],
  register(name, impl) { this.backends[name] = impl; },
  available(name) { return name === "SPRITE" || !!this.backends[name]; },
  set(name) {
    if (!this.available(name)) { console.warn("GK backend not available:", name); return false; }
    if (this.backend !== name) { const prev = this.backends[this.backend]; if (prev && prev.reset) prev.reset(); }
    this.backend = name;
    const sel = document.getElementById("gk-backend"); if (sel && sel.value !== name) sel.value = name;
    return true;
  },
  cycle() { const i = this.order.indexOf(this.backend); for (let k = 1; k <= this.order.length; k++) { const n = this.order[(i + k) % this.order.length]; if (this.available(n)) { this.set(n); return n; } } return this.backend; },
};
// ptDrawKeeper calls this instead of gkAnimDraw directly. Returns true when the keeper was drawn.
function gkPresentationDraw(t, gk, dt) {
  const b = GK_PRESENTATION.backends[GK_PRESENTATION.backend];
  if (b && b.draw) return b.draw(t, gk, dt);
  return gkAnimDraw(t, gk, dt);          // SPRITE (approved path, unchanged)
}
// ActionDescription (layer B) — the renderer-independent view of the keeper's action for this frame.
// For the prototype it is assembled from the sprite resolver's own semantic fields (gkAnimUpdate) plus the
// simulation records; nothing here writes gk/ball state. A later refactor can move the field derivation itself
// out of gkAnimUpdate so the sprite path consumes the same object.
function gkActionDescription(t, gk, cur) {
  const c = gk.committed || null, ct = gk.contact || null, A = S.gkAnim;
  const frozen = A.commit || null;
  return {
    state: cur.state, phase: cur.phase, family: cur.family || null, side: cur.side || null, u: cur.u || 0,
    cls: cur.cls || null,                                           // classification (goalSide, heightClass, expr, saveAngle, norm, …)
    dir: cur.dir, commitFacing: frozen ? frozen.facing : gk.facing, facing: gk.facing,
    simRoot: [gk.x, gk.y], vel: [gk.vx, gk.vy], height: gk.height, handZ: gk.handZ,
    legTip: gk.legTipNow ? gk.legTipNow.slice() : null,                           // the simulation's lead-leg tip during a low save (authoritative leg target)
    handTarget: gk.handNow ? gk.handNow.slice() : [gk.x, gk.y, gk.handZ],
    legTip: gk.legTipNow ? gk.legTipNow.slice() : null,
    commit: c ? { t0: c.t0, execTime: c.execTime, target: c.target.slice(), feet: c.feet.slice(), handOrigin: c.handOrigin.slice(), action: c.action, tier: c.tier, envNorm: c.envNorm, bestEffort: c.bestEffort, gather: !!c.gather, commitTick: c.commitTick,
      // where the simulation's own root move ends (its Stage-4 formula at u = 1: feet + footFrac·(target − feet)); read-only, lets the
      // presentation plan one continuous airborne arc that passes through the solved full-extension pelvis at execEnd
      rootEnd: (function () { const standing = c.tier === "STANDING REACHABLE" && !c.gather; const ffx = c.gather ? GK_GATHER.footFrac : standing ? 0 : GK_DIVE.footFrac; const ffy = c.gather ? GK_GATHER.footFrac : standing ? GK_DIVE.footFracStandingLat : GK_DIVE.footFrac; return [c.feet[0] + (c.target[0] - c.feet[0]) * ffx, c.feet[1] + (c.target[1] - c.feet[1]) * ffy]; })() } : null,
    contact: ct ? { tickT: ct.tickT, point: ct.point.slice(), volume: ct.volume, surface: ct.surface, outcome: ct.outcome } : null,
    endT: (function () { if (!c) return null; const execEnd = c.t0 + c.execTime; return ct && ct.tickT != null ? Math.max(execEnd, ct.tickT) : execEnd; })(),
    now: t.now, held: !!(t.b && t.b.held === "GK"), ball: t.b ? [t.b.x, t.b.y, t.b.z] : null,
    shotActive: !!gk.shotActive, gkPhase: gk.phase || null, gkState: gk.state,
    // pre-commit information the simulation already holds (read-only): shot instant, reaction latency, the evolving
    // predicted crossing (lateral sign in the keeper's own frame, + = his right) and the single PREPARE step
    shot: gk.shotActive && gk.shotT0 != null ? { t0: gk.shotT0, latency: gk.latency, tSince: t.now - gk.shotT0 } : null,
    predLat: (function () { if (!gk.shotActive || !gk.predict || !gk.predict.crossing) return null; const cr = gk.predict.crossing; const rx = -Math.sin(gk.facing), ry = Math.cos(gk.facing); return (GK_MOUTH.lineX - gk.x) * rx + (cr.y - gk.y) * ry; })(),
    prepared: !!gk.prepared, prepTarget: gk.prepTarget ? gk.prepTarget.slice() : null,
    // the shooter's visible wind-up: the playtest schedules the kick (t.kick.t0 → kickAt) before the impulse; a keeper drops into his
    // set crouch as the striker plants (production analogue: the KICK intent's wind-up). Read-only; 0..1 progress, null when no kick is pending
    windup: (t.kick && !t.kick.kicked && t.kick.kickAt > t.kick.t0) ? clamp01((t.now - t.kick.t0) / (t.kick.kickAt - t.kick.t0)) : null,
  };
}
document.addEventListener("DOMContentLoaded", () => {
  const q = new URLSearchParams(location.search).get("gkBackend");
  const want = q ? (q.toLowerCase() === "3d" || q.toUpperCase() === "SKELETAL_3D" ? "SKELETAL_3D" : "SPRITE") : null;
  const sel = document.getElementById("gk-backend");
  if (sel) sel.addEventListener("change", () => GK_PRESENTATION.set(sel.value));
  if (want) { const tryLater = () => { if (!GK_PRESENTATION.set(want)) setTimeout(tryLater, 200); }; tryLater(); }
  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    if (typeof S !== "undefined" && S.pt && S.pt.on && e.key === "8") { const n = GK_PRESENTATION.cycle(); S.pt.last = "GK PRESENTATION BACKEND -> " + n; }
  });
});
