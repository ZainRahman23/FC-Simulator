// RECEIVING + PASSING V1 — the deterministic review / validation fixtures (authoritative set-ups + scripted intents and commands).
// Each scenario: `drill` (players, who has the ball, who you control), `ticks`, `keys` (held intents of the player you control, by tick
// range — after a pass the control follows the ball to the receiver), and `cmds` (pass / passTo / shot / switch / pfoot / attrs at a tick).
// Characters are presentation only (the simulation's leg length stays the reference unless ?charSim=1).
const E = Math.PI;
const P = (name, x, y, facing, char, extra) => Object.assign({ name, x, y, facing, char, ai: { mode: "HOLD" } }, extra || {});
const two = (bx, by, bf, bChar, extra, aExtra) => ({ center: [63, 34], owner: 0, active: 0, players: [P("A", 57, 34, 0, "cucurella", aExtra), P("B", bx, by, bf, bChar || "gabriel", extra)] });
const SCEN = {
  // ── RECEIVING ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  recv_stand_R:   { ticks: 200, drill: two(70, 34, E, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1, rel: [0, -0.10] }] },
  recv_stand_L:   { ticks: 200, drill: two(70, 34, E, "gabriel", { pfoot: "L" }), cmds: [{ at: 20, do: "passTo", to: 1, rel: [0, 0.10] }] },
  recv_moving:    { ticks: 220, drill: two(70, 30, E, "szoboszlai", { ai: { mode: "SCRIPT", path: [{ t: 0, x: 70, y: 38, v: 2.2 }] } }), cmds: [{ at: 10, do: "passTo", to: 1, rel: [0, 2.2] }] },
  recv_meet:      { ticks: 220, drill: two(72, 35, E, "james", { ai: { mode: "SUPPORT" } }), cmds: [{ at: 20, do: "pass", fam: "SHORT", toward: 1 }] },
  recv_directional: { ticks: 260, drill: two(70, 34, E, "vinicius"), cmds: [{ at: 20, do: "passTo", to: 1 }], keys: [{ from: 60, to: 150, keys: { up: true } }, { from: 150, to: 260, keys: { up: true, jog: true } }] },
  recv_running:   { ticks: 260, drill: two(66, 30, 0, "vinicius", { ai: { mode: "SUPPORT" } }), cmds: [{ at: 20, do: "pass", fam: "THROUGH", dir: -0.25 }], keys: [{ from: 120, to: 260, keys: { right: true } }] },
  recv_stretch:   { ticks: 200, drill: two(70, 34, E, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1, rel: [0, 0.42] }] },
  recv_unreachable: { ticks: 200, drill: two(70, 34, E, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1, rel: [0, 1.25] }] },
  recv_behind:    { ticks: 220, drill: two(68, 34, 0, "szoboszlai", { ai: { mode: "SCRIPT", path: [{ t: 0, x: 90, y: 34, v: 5.5 }] } }), cmds: [{ at: 20, do: "passTo", to: 1, rel: [0, 0] }] },
  recv_too_fast:  { ticks: 180, drill: two(66, 34, E, "gabriel", { ai: { mode: "SCRIPT", path: [{ t: 0, x: 58, y: 34, v: 6.0 }] } }), cmds: [{ at: 20, do: "passTo", fam: "DRIVEN", to: 1 }] },
  recv_heavy:     { ticks: 200, drill: two(68, 34, E, "james"), cmds: [{ at: 0, do: "attrs", pid: 1, attrs: { ball_control: 25, technique: 30, composure: 30 } }, { at: 20, do: "passTo", fam: "DRIVEN", to: 1 }] },
  // ── PASSING ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  pass_short_R:   { ticks: 160, drill: two(71, 34, E, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1 }] },
  pass_short_L:   { ticks: 160, drill: two(71, 34, E, "gabriel", null, { pfoot: "L" }), cmds: [{ at: 20, do: "passTo", to: 1 }] },
  pass_driven:    { ticks: 180, drill: two(77, 30, E, "gabriel"), cmds: [{ at: 20, do: "passTo", fam: "DRIVEN", to: 1 }] },
  pass_through:   { ticks: 240, drill: two(68, 29, E, "vinicius", { ai: { mode: "SUPPORT" } }), cmds: [{ at: 20, do: "pass", fam: "THROUGH", dir: -0.2 }] },
  pass_diag_left: { ticks: 180, drill: two(67, 26, E, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1 }] },
  pass_diag_right:{ ticks: 180, drill: two(67, 42, E, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1 }] },
  pass_lateral:   { ticks: 180, drill: two(57, 45, -E / 2, "gabriel"), cmds: [{ at: 20, do: "passTo", to: 1 }] },
  pass_walking:   { ticks: 220, drill: two(76, 34, E, "gabriel"), keys: [{ from: 0, to: 70, keys: { right: true, walk: true } }], cmds: [{ at: 70, do: "passTo", to: 1 }] },
  pass_jogging:   { ticks: 220, drill: two(80, 34, E, "gabriel"), keys: [{ from: 0, to: 70, keys: { right: true, jog: true } }], cmds: [{ at: 70, do: "passTo", to: 1 }] },
  pass_running:   { ticks: 220, drill: two(86, 34, E, "gabriel"), keys: [{ from: 0, to: 70, keys: { right: true } }], cmds: [{ at: 70, do: "passTo", to: 1 }] },
  pass_after_dribble: { ticks: 260, drill: two(80, 26, E, "gabriel"), keys: [{ from: 0, to: 100, keys: { right: true, jog: true } }, { from: 100, to: 104, keys: {} }], cmds: [{ at: 104, do: "passTo", to: 1 }] },
  // ── CHAINS ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  chain_ab_ba:    { ticks: 330, drill: two(70, 31.5, E, "gabriel", { ai: { mode: "SUPPORT" } }, { ai: { mode: "SUPPORT" } }),
                    cmds: [{ at: 20, do: "pass", fam: "SHORT", toward: 1 }, { at: 170, do: "pass", fam: "SHORT", toward: 0 }] },
  chain_triangle: { ticks: 520, drill: { center: [65, 34], owner: 0, active: 0, players: [P("A", 57, 36, 0, "cucurella", { ai: { mode: "SUPPORT" } }), P("B", 69, 28, E, "gabriel", { ai: { mode: "SUPPORT" } }), P("C", 71, 40, E, "james", { ai: { mode: "SUPPORT" } })] },
                    cmds: [{ at: 20, do: "pass", fam: "SHORT", toward: 1 }, { at: 165, do: "pass", fam: "SHORT", toward: 2 }, { at: 320, do: "pass", fam: "SHORT", toward: 0 }] },
  chain_recv_pass:{ ticks: 260, drill: two(70, 34, E, "gabriel", { ai: { mode: "SUPPORT" } }, { ai: { mode: "SUPPORT" } }), cmds: [{ at: 20, do: "passTo", to: 1 }, { at: 116, do: "pass", fam: "SHORT", toward: 0 }] },
  chain_recv_dribble: { ticks: 300, drill: two(70, 34, E, "szoboszlai"), cmds: [{ at: 20, do: "passTo", to: 1 }], keys: [{ from: 70, to: 300, keys: { up: true, jog: true } }] },
  chain_recv_shoot: { ticks: 300, drill: { center: [82, 34], owner: 0, active: 0, players: [P("A", 76, 42, -0.3, "cucurella"), P("B", 88, 36, E, "osimhen")] },
                    cmds: [{ at: 20, do: "passTo", to: 1, rel: [0, 0] }, { at: 118, do: "shot", key: "2", hold: 16 }], keys: [{ from: 90, to: 140, keys: { right: true } }] },
};
function keysAt(S0, k) { let out = {}; for (const r of S0.keys || []) if (k >= r.from && k < r.to) out = Object.assign({}, r.keys); return out; }
module.exports = { SCEN, keysAt };
