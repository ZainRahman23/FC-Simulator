// SLIDE CONTACT GEOMETRY V1.2 — deterministic side-on / chase slide fixtures. The attacker (A, team 0) dribbles under a timed list of
// directions; the defender (D, team 1) is the player you control: held keys by tick range and a slide request at a tick or when the ball
// is within `d` — exactly the requests the live keys make (F with the stick held = a slide along the stick; slideWhen without `dir` = the
// AI's aiming aid). Nothing here scripts an outcome: only where the two players are and when the request is made.
//   SIDE convention (world, verified): the attacker runs +x; his RIGHT is +y (toward the camera / near touchline).
const E = Math.PI;
const A = (x, y, dirs, char, extra) => Object.assign({ name: "A", team: 0, x, y, facing: 0, char: char || "vinicius", ai: { mode: "DRIBBLE", dirs } }, extra || {});
const D = (x, y, facing, char, extra) => Object.assign({ name: "D", team: 1, x, y, facing, char: char || "gabriel", ai: { mode: "HOLD" } }, extra || {});
const drill = (a, d) => ({ defending: true, center: [58, 34], owner: 0, active: 1, autoSwitch: false, players: [a, d] });
// CHASE: A jogs +x from (50, 34); D starts `back` m behind and `lat` m to the side (+ = A's right), sprints along +x, and slides along the
// stick (+x, the human side-on slide) or on the aiming aid when the ball is `d` m away
const chase = (lat, o) => { o = o || {}; const gear = o.gear || "jog";
  return { ticks: o.ticks || 240, drill: drill(A(50, 34, [{ t: 0, dir: 0, gear }], o.achar, o.aextra), D(50 - (o.back != null ? o.back : 3.2), 34 + lat, 0, o.dchar, o.dextra)),
    keys: [{ from: 0, to: o.keysTo || 200, keys: Object.assign({ right: true, sprint: true }, o.stick ? { [o.stick]: true } : {}) }],
    cmds: [{ at: 5, do: "slideWhen", d: o.d != null ? o.d : 1.9, dir: o.aim ? undefined : (o.dir != null ? o.dir : 0) }] }; };
const SCEN = {
  // ── the SIDE-ON SWEEP, both sides (mirror pair): the defender alongside the carrier, slide along his run ───────────────────────
  sw_right:        chase(0.90),                       // D on A's RIGHT (+y): ball / A on D's left
  sw_left:         chase(-0.90),                      // D on A's LEFT (−y): ball / A on D's right
  // a wider chase (1.20 m) with the AI aiming aid: the direction chosen for the lower leg to reach the ball first, the body passing beside him
  sw_right_aim:    chase(1.20, { aim: true }),
  sw_left_aim:     chase(-1.20, { aim: true }),
  // tight: shoulder to shoulder (0.65 m) — the body must still pass beside him
  sw_right_tight:  chase(0.65),
  sw_left_tight:   chase(-0.65),
  // wide (1.30 m): beyond the sweep's reach from a parallel run — a clean miss
  sw_right_wide:   chase(1.30),
  sw_left_wide:    chase(-1.30),
  // sprinting carrier (the chase at pace)
  sw_right_sprint: chase(0.90, { gear: "sprint", back: 2.0, d: 2.2, ticks: 300 }),
  // late: the defender slides from level with / slightly behind the ball (man-first risk)
  sw_right_late:   chase(0.90, { d: 1.2 }),
  // early: too far back — the slide dies short (a clean miss, no phantom collision)
  sw_right_early:  chase(0.90, { d: 3.6 }),
  // the COUNTERFACTUAL pair (of_slide_cf_grid.js, real characters): 0.75 m to the side, the slide angled 20° in — a line that CONVERGES across the
  // carrier; the V1 near-leg and the V1.2 far-leg geometry reach the SAME outcome (POKE) on both sides; run with --pre 'PT_DEF.slide.rule="near"' for A
  cf_right:        Object.assign(chase(0.75, { dir: -20 * E / 180 }), { ticks: 200 }),
  cf_left:         Object.assign(chase(-0.75, { dir: 20 * E / 180 }), { ticks: 200 }),
  // GLANCING: the same side-on sweep, a weak slide tackler (sliding_tackle / reactions 30) against a strong, balanced carrier (95): the unchanged quality law gives a glancing touch — he rides it
  sw_glance:       chase(-0.90, { aextra: { attrs: { strength: 95, balance: 95 } }, dextra: { attrs: { sliding_tackle: 30, reactions: 30 } } }),
  // BLOCK: head-on, the ball on the slide line — the straight block slide (the same top leg, barely coming across): a poke along the line
  blk_front:       { ticks: 200, drill: drill(A(52, 34, [{ t: 0, dir: 0, gear: "jog" }]), D(60, 34.25, E)), keys: [{ from: 0, to: 200, keys: { left: true, jog: true } }], cmds: [{ at: 5, do: "slideWhen", d: 2.4, dir: E }] },
};
function keysAt(S0, k) { let out = {}; for (const r of S0.keys || []) if (k >= r.from && k < r.to) out = Object.assign({}, r.keys); return out; }
module.exports = { SCEN, keysAt };
