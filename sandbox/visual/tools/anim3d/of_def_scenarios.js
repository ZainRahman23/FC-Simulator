// DEFENDING V1 — deterministic review / validation fixtures. The attacker (A, team 0) carries the ball under a timed list of dribble
// directions (ai.dirs; null = standing on the ball); the defender (D, team 1) is the player you control: held keys (incl. `jockey`) by
// tick range and commands (`stand` / `slide`) at a tick — exactly the requests the live keys make. Nothing here scripts an outcome.
const E = Math.PI;
const A = (x, y, facing, dirs, char, extra) => Object.assign({ name: "A", team: 0, x, y, facing, char: char || "vinicius", ai: { mode: "DRIBBLE", dirs: dirs || [{ t: 0, dir: null }] } }, extra || {});
const D = (x, y, facing, char, extra) => Object.assign({ name: "D", team: 1, x, y, facing, char: char || "gabriel", ai: { mode: "HOLD" } }, extra || {});
const drill = (a, d) => ({ defending: true, center: [62, 34], owner: 0, active: 1, autoSwitch: false, players: [a, d] });
// the ball starts 0.45 m ahead of A (60, 34) → (60.45, 34). The defender stands `dx` beyond it, facing A.
const st = (dx, dy, char, dirs, extra) => drill(A(60, 34, 0, dirs), D(60.45 + dx, 34 + dy, E, char, extra));
const SCEN = {
  // ── STANDING TACKLE: reachability (attacker still) ──────────────────────────────────────────────────────────────────────────
  st_comfort:     { ticks: 110, drill: st(0.70, 0.10), cmds: [{ at: 30, do: "stand" }] },
  st_marginal:    { ticks: 110, drill: st(1.02, 0.10), cmds: [{ at: 30, do: "stand" }] },
  st_just_out:    { ticks: 110, drill: st(1.22, 0.10), cmds: [{ at: 30, do: "stand" }] },
  st_far:         { ticks: 110, drill: st(1.80, 0.10), cmds: [{ at: 30, do: "stand" }] },
  st_left_foot:   { ticks: 110, drill: st(0.72, 0.32, "cucurella"), cmds: [{ at: 30, do: "stand" }] },
  st_right_foot:  { ticks: 110, drill: st(0.72, -0.32, "cucurella"), cmds: [{ at: 30, do: "stand" }] },
  // attacker moving: toward the defender, across him, away from him (defender from behind), defender from the side
  st_toward:      { ticks: 150, drill: drill(A(58, 34, 0, [{ t: 0, dir: 0, gear: "walk" }]), D(62.2, 34.1, E, "osimhen")), cmds: [{ at: 10, do: "standWhen", d: 1.15 }] },
  st_across:      { ticks: 150, drill: drill(A(60, 32, E / 2, [{ t: 0, dir: E / 2, gear: "walk" }]), D(61.4, 34.6, E, "vinicius")), cmds: [{ at: 10, do: "standWhen", d: 1.15 }] },
  st_from_behind: { ticks: 150, drill: drill(A(60, 34, 0, [{ t: 0, dir: 0, gear: "walk" }]), D(59.0, 34.2, 0, "gabriel")), keys: [{ from: 0, to: 60, keys: { right: true, jog: true } }], cmds: [{ at: 10, do: "standWhen", d: 1.0 }] },
  st_from_side:   { ticks: 130, drill: drill(A(60, 34, 0, [{ t: 0, dir: 0, gear: "walk" }]), D(61.2, 35.1, -E / 2, "cucurella")), cmds: [{ at: 10, do: "standWhen", d: 1.15 }] },
  st_tight_ball:  { ticks: 130, drill: drill(A(60, 34, 0, [{ t: 0, dir: null }], "vinicius", { attrs: { strength: 90, balance: 90 } }), D(60.25, 34.64, -E / 2, "vinicius")), cmds: [{ at: 30, do: "stand" }] },
  // ── SLIDE TACKLE ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  // the carrier jogs across (+y); the defender runs in from the side and slides on the ball's line: in time, early (short), late
  sl_win:         { ticks: 260, drill: drill(A(62, 26, E / 2, [{ t: 0, dir: E / 2, gear: "jog" }]), D(67.5, 31, E, "gabriel")), keys: [{ from: 0, to: 200, keys: { left: true, sprint: true } }], cmds: [{ at: 5, do: "slideWhen", d: 3.2 }] },
  sl_early:       { ticks: 260, drill: drill(A(62, 26, E / 2, [{ t: 0, dir: E / 2, gear: "jog" }]), D(70.5, 31, E, "osimhen")), keys: [{ from: 0, to: 18, keys: { left: true, sprint: true } }], cmds: [{ at: 18, do: "slide", dir: E }] },
  sl_late:        { ticks: 260, drill: drill(A(62, 26, E / 2, [{ t: 0, dir: E / 2, gear: "jog" }]), D(67.5, 33.5, E, "cucurella")), keys: [{ from: 0, to: 40, keys: { left: true, sprint: true } }], cmds: [{ at: 40, do: "slide", dir: E }] },
  sl_from_behind: { ticks: 260, drill: drill(A(60, 34, 0, [{ t: 0, dir: 0, gear: "jog" }]), D(55, 34.4, 0, "vinicius")), keys: [{ from: 0, to: 200, keys: { right: true, sprint: true } }], cmds: [{ at: 5, do: "slideWhen", d: 2.6 }] },
  sl_left:        { ticks: 260, drill: drill(A(62, 42, -E / 2, [{ t: 0, dir: -E / 2, gear: "jog" }]), D(67.5, 37, E, "gabriel")), keys: [{ from: 0, to: 200, keys: { left: true, sprint: true } }], cmds: [{ at: 5, do: "slideWhen", d: 3.2 }] },
  sl_loose:       { ticks: 240, drill: { defending: true, center: [62, 34], owner: null, active: 1, autoSwitch: false, ball: { x: 62, y: 30, vx: 0, vy: 3.0 },
                    players: [A(56, 40, 0, [{ t: 0, dir: null }]), D(68, 34, E, "osimhen")] }, keys: [{ from: 0, to: 200, keys: { left: true, sprint: true } }], cmds: [{ at: 5, do: "slideWhen", d: 3.0 }] },
  // ── JOCKEY ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  jk_stationary:  { ticks: 150, drill: st(2.2, 0.2, "gabriel"), keys: [{ from: 0, to: 150, keys: { jockey: true } }] },
  jk_walk:        { ticks: 220, drill: drill(A(56, 34, 0, [{ t: 0, dir: 0, gear: "walk" }]), D(62, 34.3, E, "gabriel")), keys: [{ from: 0, to: 220, keys: { jockey: true, right: true } }] },
  jk_dribble:     { ticks: 240, drill: drill(A(54, 34, 0, [{ t: 0, dir: 0, gear: "jog" }]), D(62, 34.3, E, "cucurella")), keys: [{ from: 0, to: 240, keys: { jockey: true, right: true } }] },
  jk_lateral:     { ticks: 240, drill: drill(A(58, 34, 0, [{ t: 0, dir: 0, gear: "walk" }, { t: 1.0, dir: E / 2, gear: "walk" }, { t: 2.4, dir: -E / 2, gear: "walk" }]), D(61.5, 34, E, "vinicius")),
                    keys: [{ from: 0, to: 60, keys: { jockey: true } }, { from: 60, to: 144, keys: { jockey: true, down: true } }, { from: 144, to: 240, keys: { jockey: true, up: true } }] },
  jk_accel:       { ticks: 240, drill: drill(A(56, 34, 0, [{ t: 0, dir: 0, gear: "walk" }, { t: 1.4, dir: 0.35, gear: "sprint" }]), D(61.5, 34, E, "osimhen")), keys: [{ from: 0, to: 240, keys: { jockey: true, right: true } }] },
  jk_to_tackle:   { ticks: 220, drill: drill(A(56, 34, 0, [{ t: 0, dir: 0, gear: "walk" }]), D(61, 34.2, E, "gabriel")), keys: [{ from: 0, to: 220, keys: { jockey: true } }], cmds: [{ at: 60, do: "standWhen", d: 1.05 }] },
  jk_to_sprint:   { ticks: 240, drill: drill(A(56, 34, 0, [{ t: 0, dir: 0, gear: "walk" }, { t: 1.2, dir: 0, gear: "sprint" }]), D(61, 34.6, E, "cucurella")), keys: [{ from: 0, to: 90, keys: { jockey: true } }, { from: 90, to: 240, keys: { right: true, sprint: true } }] },
};
// small-sided media clips (the AI plays everyone, including the player you would control) — not part of the gate list
const SSG = {
  ssg_2v2: { ticks: 660, drill: { defending: true, box: [44, 86, 16, 52], center: [65, 34], owner: 0, active: 2, autoSwitch: false, players: [
    { name: "A1", team: 0, x: 52, y: 30, facing: 0, char: "vinicius", ai: { mode: "SSG", gear: "jog" } }, { name: "A2", team: 0, x: 54, y: 42, facing: 0, char: "szoboszlai", ai: { mode: "SSG", gear: "jog" } },
    { name: "D1", team: 1, x: 70, y: 31, facing: E, char: "gabriel", ai: { mode: "SSG", gear: "jog" } }, { name: "D2", team: 1, x: 71, y: 40, facing: E, char: "cucurella", ai: { mode: "SSG", gear: "jog" } }] }, cmds: [{ at: 0, do: "humanAi" }] },
  ssg_3v3: { ticks: 660, drill: { defending: true, box: [40, 90, 12, 56], center: [65, 34], owner: 0, active: 3, autoSwitch: false, players: [
    { name: "A1", team: 0, x: 50, y: 34, facing: 0, char: "vinicius", ai: { mode: "SSG", gear: "jog" } }, { name: "A2", team: 0, x: 53, y: 24, facing: 0, char: "szoboszlai", ai: { mode: "SSG", gear: "jog" } },
    { name: "A3", team: 0, x: 53, y: 44, facing: 0, char: "james", ai: { mode: "SSG", gear: "jog" } }, { name: "D1", team: 1, x: 72, y: 34, facing: E, char: "gabriel", ai: { mode: "SSG", gear: "jog" } },
    { name: "D2", team: 1, x: 74, y: 25, facing: E, char: "cucurella", ai: { mode: "SSG", gear: "jog" } }, { name: "D3", team: 1, x: 74, y: 43, facing: E, char: "osimhen", ai: { mode: "SSG", gear: "jog" } }] }, cmds: [{ at: 0, do: "humanAi" }] },
};
function keysAt(S0, k) { let out = {}; for (const r of S0.keys || []) if (k >= r.from && k < r.to) out = Object.assign({}, r.keys); return out; }
module.exports = { SCEN: Object.assign({}, SCEN, process.env.DEF_MEDIA ? SSG : {}), keysAt };
