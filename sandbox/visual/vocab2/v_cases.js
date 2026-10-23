// ═══ vocab1/v_cases.js — DRIBBLING VOCAB-1: THE CURATED REPLAYS (the Dribbling Lab's gallery; the same cases run in node: tools/v_cases_run.mjs) ═══
// Each case is EXACT INITIAL CONDITIONS + an input timeline, simulated deterministically (never a video): the player (the sandbox's: S99 · D38 ·
// A99-C · D99 · BC99 · CARRY-B · CONTROLLED · EXPANDED, right-footed unless `pref`), a straight run-up at `mode` for `runup` s, then from t = 0
// the stick toward `ang`° (+ right of the run-up line; a timeline in `stick`), the manual intents in `intents` (none: the AUTO case — B4 decides),
// a DEFENDER MARKER where the move's purpose is (visual only: `def` [ahead, right] metres from the player at t = 0; `threat` the side of it).
// variant: NORMAL · HIGH-SPEED · MIRROR (the left-foot / left-side version) · AUTO (the same state, no request) · REJECTED (a deliberately
// invalid setup) · CHAIN. The clip shown: from `pre` s before t = 0 to `dur` s after it (approach → preparation → decisive → exit → continuation)
// (MIRROR: the mirrored player — LEFT-footed, the ball in the left lane, the left foot playing the move — not a right-footer reaching across)
const C = (tech, variant, mode, ang, o = {}) => Object.assign({ tech, variant, mode, ang, runup: 2.2, dur: 2.6, pre: 1.1, def: [3.2, 0], intents: o.auto ? [] : [{ t: 0, id: o.req || tech, foot: o.foot || null, sprint: !!o.sprint }] }, variant === "MIRROR" && o.foot === "L" ? { pref: "L" } : {}, o);
export const CASES = [
  // ── CARRY / PACE ──
  C("CARRY", "NORMAL", "RUN", 0, { auto: true, dur: 2.4, def: null, title: "Run with the ball: the ordinary carry, no skill when none is needed" }),
  C("CLOSE_CARRY", "NORMAL", "JOG", 0, { auto: true, stick: [[0, 0, "JOG"], [0.5, 25, "JOG"], [1.0, -20, "JOG"], [1.5, 15, "JOG"], [2.0, 0, "JOG"]], dur: 2.6, def: [3.0, 0], title: "Close control past a defender: small changes, the ball within a step" }),
  C("SPRINT_CARRY", "NORMAL", "SPRINT", 0, { auto: true, runup: 1.0, dur: 4.0, def: null, title: "Open grass: the sprint carry, a push every few strides" }),
  C("KNOCK_ON", "NORMAL", "SPRINT", 35, { runup: 2.6, def: [2.6, -0.6], title: "Exploit the space: knock it past the defender, run onto it" }),
  C("KNOCK_ON", "AUTO", "SPRINT", 35, { runup: 2.6, def: [2.6, -0.6], auto: true, title: "Would B4 knock it on here? (same state, no request)" }),
  // ── CUT / REDIRECT ──
  C("INSIDE_CUT", "NORMAL", "RUN", -60, { auto: true, title: "Cut inside across the defender (B4's compact inside redirect)" }),
  C("OUTSIDE_REDIRECT", "NORMAL", "RUN", 50, { auto: true, title: "Redirect outside with the outside of the foot (B4)" }),
  C("OUTSIDE_CUT", "NORMAL", "RUN", 45, { title: "Drive at the defender, break outside off the planted foot" }),
  C("OUTSIDE_CUT", "MIRROR", "RUN", -45, { foot: "L", title: "Outside cut, left foot" }),
  C("OUTSIDE_CUT", "AUTO", "RUN", 45, { auto: true, title: "Would B4 cut outside here?" }),
  C("INSIDE_HOOK", "NORMAL", "JOG", -150, { title: "Spin off a defender pressing from in front: the inside hook" }),
  C("INSIDE_HOOK", "MIRROR", "JOG", 150, { foot: "L", title: "Inside hook, left foot" }),
  C("INSIDE_HOOK", "WALK", "WALK", -120, { title: "The accessible reversal at a walk: brake → hook → exit" }),
  C("INSIDE_HOOK", "RUN", "RUN", -120, { runup: 2.6, title: "The hook from a run: it brakes to a stop first" }),
  C("INSIDE_HOOK", "SPRINT", "SPRINT", -120, { runup: 4.5, title: "Requested at a sprint: the necessary preparation (braking with the ball) → hook" }),
  C("OUTSIDE_HOOK", "NORMAL", "JOG", 150, { title: "The outside hook: reverse away to the hooking foot's side" }),
  C("OUTSIDE_HOOK", "MIRROR", "JOG", -150, { foot: "L", title: "Outside hook, left foot" }),
  C("OUTSIDE_HOOK", "SPRINT", "SPRINT", 120, { runup: 4.5, title: "Requested at a sprint: braking with the ball → the outside hook" }),
  C("BRAKING_TOUCH", "NORMAL", "SPRINT", 180, { auto: true, runup: 3.0, dur: 3.0, title: "Reverse from a sprint: the hard brake with the ball (B4)" }),
  // ── CHOP ──
  C("RONALDO_CHOP", "NORMAL", "RUN", -90, { title: "A sharp protected redirect at speed: the chop behind the shielding leg" }),
  C("RONALDO_CHOP", "LOW-SPEED", "RUN", -90, { runup: 0.95, title: "The lower-speed chop (≈ 4 m/s, early in the run)" }),
  C("RONALDO_CHOP", "JOG · NO HOP", "JOG", -90, { runup: 2.4, title: "From a jog: the same chop entered at its plant, without the hop (the shortest valid entry)" }),
  C("RONALDO_CHOP", "REJECTED", "WALK", -90, { title: "REJECTED: the chop asked at a walk (it needs ≥ 3 m/s even without its hop)" }),
  C("RONALDO_CHOP", "HIGH-SPEED", "SPRINT", -80, { runup: 3.0, title: "The sprint chop" }),
  C("RONALDO_CHOP", "MIRROR", "RUN", 90, { foot: "L", title: "Ronaldo chop, left foot" }),
  C("RONALDO_CHOP", "AUTO", "RUN", -90, { auto: true, title: "Would B4 chop here?" }),
  // ── CRUYFF / BEHIND-BODY ──
  C("CRUYFF", "SLOW · AT THE PLANT", "WALK", -125, { title: "Already slow: the same Cruyff entered at its plant when that is the shortest valid entry (no separate technique)" }),
  C("CRUYFF", "NORMAL", "JOG", -125, { title: "Sell the pass, drag it behind the standing leg, go back" }),
  C("CRUYFF", "HIGH-SPEED", "RUN", -120, { title: "The running Cruyff" }),
  C("CRUYFF", "MIRROR", "RUN", 120, { foot: "L", title: "Cruyff, left foot" }),
  C("CRUYFF", "SPRINT", "SPRINT", -120, { runup: 4.5, title: "Requested at a sprint: the necessary preparation (braking with the ball) → plant → Cruyff" }),
  C("CRUYFF", "AUTO", "JOG", -125, { auto: true, title: "Would B4 Cruyff here?" }),
  // ── SOLE / DRAG ──
  C("DRAG_BACK", "NORMAL", "JOG", 180, { title: "Back to the pressure: kill it with the sole, pull it back, go" }),
  C("DRAG_BACK", "MIRROR", "JOG", -180, { foot: "L", title: "Drag-back, left foot" }),
  C("DRAG_BACK", "REJECTED", "SPRINT", 180, { runup: 3.0, title: "REJECTED: a drag-back requested at full sprint" }),
  C("SOLE_ROLL", "NORMAL", "WALK", 100, { title: "Nearly stopped: roll it sideways with the sole and turn" }),
  // ── LATERAL TRANSFER ──
  C("CROQUETA", "NORMAL", "RUN", -40, { runup: 2.6, def: [2.4, -0.1], title: "The ball on the wrong side: the right inside plays it across, the left inside receives and carries on" }),
  C("CROQUETA", "MIRROR", "RUN", 40, { foot: "L", runup: 2.6, def: [2.4, 0.1], title: "Croqueta, left-footed (to the right)" }),
  C("CROQUETA", "JOG", "JOG", -40, { runup: 2.4, def: [2.2, -0.1], title: "The jogging croqueta (40° left)" }),
  C("CROQUETA", "CURRENT (before)", "RUN", -40, { runup: 2.6, def: [2.4, -0.1], simOpts: { croq: "CURRENT" }, title: "CURRENT — the croqueta before its body upgrade: ball across, the body following afterward" }),
  C("CROQUETA", "REJECTED", "SPRINT", -40, { runup: 4.5, title: "REJECTED: the croqueta at a sprint (its useful entry ends at 6.2 m/s) — B4's ordinary solution instead" }),
  C("CROQUETA", "PRESSURE", "JOG", 35, { def: [1.6, -0.3], threat: -1, title: "Pressure escape: a defender closing on the ball's side — transfer it away across the body" }),
  C("CROQUETA", "AUTO", "RUN", 35, { auto: true, def: [2.4, 0.1], title: "Would B4 play the croqueta here?" }),
  // ── LA CROQUETA — VIDEO-GUIDED (owner, 23 Oct: the reference recording): the reference side — the LEFT inside plays the ball across to the
  // right foot, the exit to the right — at a walk and a jog, and the mirror ──
  C("CROQUETA", "REF · WALK L → R", "WALK", 40, { foot: "L", pref: "L", runup: 2.2, def: [1.8, 0.35], dur: 2.6, title: "LA CROQUETA (the reference side): the left inside across to the right foot, the body with it — from a walk" }),
  C("CROQUETA", "REF · JOG L → R", "JOG", 40, { foot: "L", pref: "L", runup: 2.4, def: [2.2, 0.35], dur: 2.6, title: "LA CROQUETA (the reference side): the left inside across to the right foot, the body with it — from a jog" }),
  C("CROQUETA", "REF · WALK R → L", "WALK", -40, { foot: "R", runup: 2.2, def: [1.8, -0.35], dur: 2.6, title: "LA CROQUETA, the mirror: the right inside across to the left foot — from a walk" }),
  C("CROQUETA", "REF · JOG R → L", "JOG", -40, { foot: "R", runup: 2.4, def: [4.6, -1.2], dur: 2.6, title: "LA CROQUETA, the mirror: the right inside across to the left foot — from a jog" }),
  C("CROQUETA", "REF · RUN L → R", "RUN", 40, { foot: "L", pref: "L", runup: 2.6, def: [2.4, 0.35], dur: 2.6, title: "LA CROQUETA (the reference side) at a run" }),
  C("CROQUETA", "REF · RUN R → L", "RUN", -40, { foot: "R", runup: 2.6, def: [2.4, -0.35], dur: 2.6, title: "LA CROQUETA, the mirror, at a run" }),
  // ── FEINT ──
  C("BODY_FEINT", "NORMAL", "RUN", 0, { stick: [[0, 0, "RUN"], [0.45, -40, "RUN"]], title: "Sell one way with the body (no touch), then go the other" }),
  C("SHOULDER_DROP", "NORMAL", "JOG", 0, { stick: [[0, 0, "JOG"], [0.40, -45, "JOG"]], title: "The shoulder drop: freeze the defender, then go" }),
  C("HIP_FAKE", "NORMAL", "RUN", 0, { stick: [[0, 0, "RUN"], [0.30, 30, "RUN"]], title: "The hip fake: the subtlest sell" }),
  C("FEINT_OUTSIDE_CUT", "NORMAL", "RUN", -45, { title: "Sell inside, cut outside" }),
  C("FEINT_INSIDE_CUT", "NORMAL", "JOG", -40, { title: "Sell outside, cut inside" }),
  C("MATTHEWS", "NORMAL", "JOG", 50, { runup: 2.4, title: "The compact Matthews: the inside cue, round the ball, the same foot's outside takes it out" }),
  C("MATTHEWS", "MIRROR", "JOG", -50, { foot: "L", runup: 2.4, title: "Matthews, left foot" }),
  C("MATTHEWS", "RUN", "RUN", 60, { runup: 2.6, title: "The running Matthews (60° right)" }),
  C("MATTHEWS", "REJECTED", "WALK", 50, { runup: 2.2, title: "REJECTED at a walk (its exit stride floated — an open body defect): the outside redirect instead" }),
  // ── BODY FEINT V2 (23 Oct): the whole body sells one way, the loaded leg drives out the other — the playing foot's outside takes the ball out ──
  C("BODY_FEINT_V2", "FAKE LEFT → RIGHT", "JOG", 45, { runup: 2.4, def: [4.3, 0], dur: 2.4, title: "FAKE LEFT → EXIT RIGHT: the false step wide left, the load, hips / trunk / shoulder / head / arms sell left — the left leg drives out right" }),
  C("BODY_FEINT_V2", "FAKE RIGHT → LEFT", "JOG", -45, { pref: "L", runup: 2.4, def: [4.3, 0], dur: 2.4, title: "FAKE RIGHT → EXIT LEFT: the exact mirror (the left-footed twin, the same entry)" }),
  C("BODY_FEINT_V2", "R → L · RIGHT-FOOTED", "JOG", -45, { runup: 2.4, def: [3.4, 0], dur: 2.4, title: "FAKE RIGHT → EXIT LEFT by the right-footed player: the left foot plays it out" }),
  C("BODY_FEINT_V2", "LOW-SPEED L → R", "WALK", 45, { runup: 2.2, def: [2.3, 0], dur: 2.6, title: "LOW-SPEED: fake left → exit right from a walk" }),
  C("BODY_FEINT_V2", "LOW-SPEED R → L", "WALK", -45, { pref: "L", runup: 2.2, def: [2.3, 0], dur: 2.6, title: "LOW-SPEED: fake right → exit left from a walk (the mirror)" }),
  C("BODY_FEINT_V2", "RUNNING L → R", "RUN", 40, { runup: 2.6, def: [6.4, 0], dur: 2.4, title: "RUNNING: fake left → exit right at a run" }),
  C("BODY_FEINT_V2", "RUNNING R → L", "RUN", -40, { pref: "L", runup: 2.6, def: [6.4, 0], dur: 2.4, title: "RUNNING: fake right → exit left at a run (the mirror)" }),
  C("BODY_FEINT_V2", "SHALLOW L → R", "JOG", 45, { req: "BODY_FEINT_V2_SHALLOW", runup: 2.4, def: [4.2, 0], dur: 2.4, title: "SHALLOW: the same feint, a smaller and quicker sell" }),
  C("BODY_FEINT_V2", "STRONG L → R", "JOG", 45, { req: "BODY_FEINT_V2_STRONG", runup: 2.4, def: [4.3, 0], dur: 2.4, title: "STRONG: the same feint, a deeper sell (more cost)" }),
  // (DRIBBLING VOCABULARY INTEGRATION: the old overlay feint is SUPERSEDED — requested by its own id it is REJECTED, not eligible)
  C("BODY_FEINT_V2", "OLD (VOCAB-1)", "JOG", 45, { req: "BODY_FEINT_OVERLAY", runup: 2.4, def: [2.6, 0], dur: 2.4, title: "OLD: the VOCAB-1 body feint — the same entry and input (a shoulder / trunk overlay on the ordinary carry, then the cut)" }),
  // ── STEPOVER / SCISSORS ──
  C("SCISSORS", "NORMAL", "RUN", -45, { title: "Loop round the front of the ball, sell it, take it the other way" }),
  C("SCISSORS", "MIRROR", "RUN", 45, { foot: "L", title: "Scissors, left leg" }),
  C("SCISSORS", "HIGH-SPEED", "SPRINT", -40, { runup: 3.0, title: "Scissors from a full sprint: the body brakes into it (its useful entry is ≤ 8 m/s)" }),
  C("SCISSORS", "REJECTED", "RUN", -140, { title: "REJECTED: scissors asked for a 140° exit (its range ends at 92°)" }),
  C("STEPOVER", "AUTO", "RUN", 45, { auto: true, title: "The same state, no request: B4 does not stepover by itself (MANUAL)" }),
  C("SCISSORS_GO", "NORMAL", "RUN", 0, { foot: "R", title: "Sell the cut with the loop, then go straight on past the defender" }),
  C("SCISSORS_GO", "MIRROR", "RUN", 0, { foot: "L", title: "Scissors → continue, left leg" }),
  C("STEPOVER", "NORMAL", "RUN", 45, { title: "Over the front of the ball toward the midline, then back out with the same foot" }),
  C("STEPOVER", "MIRROR", "RUN", -45, { foot: "L", title: "Stepover, left foot" }),
  C("DOUBLE_SCISSORS", "NORMAL", "JOG", 45, { dur: 3.0, title: "Sell one side, then the other, then go" }),
  // ── HEEL CHOP (EXPERIMENTAL, new 22 Oct) ──
  C("HEEL_CHOP", "NORMAL", "JOG", -135, { title: "EXPERIMENTAL — past the ball, the heel drives it back behind the standing leg" }),
  C("HEEL_CHOP", "MIRROR", "JOG", 135, { foot: "L", title: "EXPERIMENTAL — heel chop, left foot" }),
  C("HEEL_CHOP", "REJECTED", "SPRINT", -135, { runup: 3.0, title: "REJECTED: a heel chop requested at full sprint" }),
  // ── ELASTICO ──
  C("ELASTICO", "NORMAL", "JOG", -45, { title: "Outside cue, inside snap: the elastico" }),
  C("ELASTICO", "HIGH-SPEED", "RUN", -45, { title: "The elastico at a run" }),
  C("ELASTICO", "MIRROR", "JOG", 45, { foot: "L", title: "Elastico, left foot" }),
  C("ELASTICO", "REJECTED", "JOG", 45, { foot: "R", title: "REJECTED: a right-foot elastico asked to exit to the right (the wrong side)" }),
  C("REVERSE_ELASTICO", "NORMAL", "JOG", 45, { title: "Inside cue, outside snap: the reverse elastico" }),
  C("REVERSE_ELASTICO", "MIRROR", "JOG", -45, { foot: "L", title: "Reverse elastico, left foot" }),
  // ── V-TURN (ADV-4: one parameterized family, 40 – 120°) ──
  C("V_TURN", "NORMAL", "JOG", -90, { runup: 2.4, title: "Reset under pressure: the sole rolls it back, the same inside pushes it out across, away" }),
  C("V_TURN", "MIRROR", "JOG", 90, { foot: "L", runup: 2.4, title: "V-turn, left foot" }),
  C("V_TURN", "WIDE", "JOG", -120, { runup: 2.4, title: "The V-turn at the top of its range (120°)" }),
  C("V_TURN", "RUN", "RUN", -110, { runup: 2.6, title: "The running V-turn (110°): the pull made moving at ≈ 1.2 m/s" }),
  C("V_TURN", "REJECTED", "JOG", -150, { runup: 2.4, title: "REJECTED: a V-turn asked for 150° (past ≈ 120° the reversal is the Cruyff's / hook's) — B4's solution instead" }),
  // ── SPIN ──
  C("ROULETTE", "NORMAL", "JOG", -90, { title: "EXPERIMENTAL — drag back, spin with the back to the tackle, drag on" }),
  C("ROULETTE", "REJECTED", "SPRINT", -90, { runup: 3.0, title: "REJECTED: a roulette requested at full sprint" }),
  // ── STOP-AND-GO (ADV-4: the deaden-and-push; with the sprint key held, the hesitation) ──
  C("STOP_AND_GO", "NORMAL", "RUN", 0, { runup: 2.6, stick: [[0, 0, "RUN"], [0.25, 0, "SPRINT"]], dur: 2.8, title: "Run → stop it dead under the sole → push → the D38 relaunch" }),
  C("STOP_AND_GO", "SPRINT", "SPRINT", 0, { runup: 4.5, stick: [[0, 0, "RUN"], [0.25, 0, "SPRINT"]], dur: 3.0, title: "From a sprint: the A99-C stop's braking into the deaden, then the push" }),
  C("STOP_AND_GO", "HESITATION", "SPRINT", 0, { runup: 4.5, sprint: true, stick: [[0, 0, "SPRINT"]], dur: 2.6, title: "The sprint key held: the hesitation — a checked stride, a stall, the burst" }),
  C("STOP_AND_GO", "MIRROR", "RUN", 0, { pref: "L", runup: 2.6, stick: [[0, 0, "RUN"], [0.25, 0, "SPRINT"]], dur: 2.8, title: "Stop-and-go, left-footed" }),
  C("STOP", "NORMAL", "RUN", 0, { auto: true, stick: [[0, null, "RUN"]], dur: 2.0, title: "Stick released: the sole stop" }),
  // ── PROTECTION / SHIELD TURN ──
  C("SHIELD_ROLL", "NORMAL", "WALK", 75, { def: [0.6, -1.0], threat: -1, title: "A threat on the left: roll it away with the far foot, hip between" }),
  C("SHIELD_ROLL", "MIRROR", "WALK", -75, { foot: "L", def: [0.6, 1.0], threat: 1, title: "Shield roll, threat on the right" }),
  C("SHIELD_HOOK", "NORMAL", "JOG", -150, { req: "INSIDE_HOOK", def: [1.2, 0.8], threat: 1, title: "Turn away from a threat coming from the right (the inside hook)" }),
  C("SHIELD_HOOK", "AUTO", "JOG", 160, { auto: true, def: [1.0, 0.8], threat: 1, title: "AUTO, a threat close on the right: B4's reversal with the threat in mind (the harness's threat)" }),
  C("SHIELD_HOOK", "AUTO-2", "JOG", 160, { auto: true, def: null, title: "AUTO, the same request with no threat: compare" }),
  C("SHIELD_OUTHOOK", "NORMAL", "JOG", 150, { req: "OUTSIDE_HOOK", def: [1.2, -0.8], threat: -1, title: "Turn away from a threat on the left (the outside hook)" }),
];
// ── THE CHAINS: techniques genuinely branched one into the next (the decisive contact, the branch, the next action's start are measured) ─────
const K = (name, mode, steps, o = {}) => Object.assign({ tech: "CHAIN", variant: "CHAIN", name, title: name, mode, ang: steps[0].ang, runup: 2.2, pre: 1.0, def: [3.0, 0], stick: steps.map((s) => [s.t, s.ang, s.mode || mode]), intents: steps.filter((s) => s.id).map((s) => ({ t: s.t, id: s.id, foot: s.foot || null })), dur: steps[steps.length - 1].t + 2.0 }, o);
export const CHAINS = [
  K("Body feint → outside cut", "RUN", [{ t: 0, ang: 0, id: "BODY_FEINT" }, { t: 0.30, ang: 45, id: "OUTSIDE_CUT" }]),
  K("Scissors → outside exit → sprint", "RUN", [{ t: 0, ang: -45, id: "SCISSORS" }, { t: 1.0, ang: -45, mode: "SPRINT" }]),
  K("Stepover → inside exit", "RUN", [{ t: 0, ang: 45, id: "STEPOVER" }, { t: 0.95, ang: -10 }]),
  K("Drag-back → croqueta", "JOG", [{ t: 0, ang: 180, id: "DRAG_BACK" }, { t: 1.05, ang: 145, id: "CROQUETA" }]),
  K("V-turn → accelerate", "JOG", [{ t: 0, ang: -90, id: "V_TURN" }, { t: 1.0, ang: -90, mode: "SPRINT" }], { runup: 2.4 }),
  K("V-turn → croqueta", "JOG", [{ t: 0, ang: -90, id: "V_TURN" }, { t: 1.25, ang: -130, id: "CROQUETA" }], { runup: 2.4 }),
  K("Croqueta → accelerate", "RUN", [{ t: 0, ang: -40, id: "CROQUETA" }, { t: 0.6, ang: -40, mode: "SPRINT" }], { runup: 2.6 }),
  K("Croqueta → outside cut", "RUN", [{ t: 0, ang: -40, id: "CROQUETA" }, { t: 0.9, ang: 10, id: "OUTSIDE_CUT" }], { runup: 2.6 }),
  K("Stop-and-go → D38 sprint", "RUN", [{ t: 0, ang: 0, id: "STOP_AND_GO" }, { t: 0.25, ang: 0, mode: "SPRINT" }], { runup: 2.6 }),
  K("Stop-and-go → 45° exit", "RUN", [{ t: 0, ang: 0, id: "STOP_AND_GO" }, { t: 0.62, ang: 45, mode: "SPRINT" }], { runup: 2.6 }),
  K("Ronaldo chop → accelerate", "RUN", [{ t: 0, ang: -90, id: "RONALDO_CHOP" }, { t: 0.9, ang: -90, mode: "SPRINT" }]),
  K("Cruyff → accelerate", "JOG", [{ t: 0, ang: -125, id: "CRUYFF" }, { t: 0.85, ang: -125, mode: "SPRINT" }]),
  K("Elastico → sprint", "JOG", [{ t: 0, ang: -45, id: "ELASTICO" }, { t: 0.95, ang: -45, mode: "SPRINT" }]),
  K("Knock-on → sprint → chop", "SPRINT", [{ t: 0, ang: 30, id: "KNOCK_ON" }, { t: 1.6, ang: -60, id: "RONALDO_CHOP", mode: "RUN" }], { runup: 2.6 }),
  K("Stop → feint → explode", "RUN", [{ t: 0, ang: 0, id: "STOP_AND_GO" }, { t: 0.55, ang: 0, id: "BODY_FEINT" }, { t: 0.85, ang: 35, mode: "SPRINT" }]),
  K("Croqueta → accelerate → outside cut", "RUN", [{ t: 0, ang: 35, id: "CROQUETA" }, { t: 0.7, ang: 35, mode: "SPRINT" }, { t: 1.6, ang: 75, id: "OUTSIDE_CUT", mode: "SPRINT" }]),
  K("Matthews → outside exit → accelerate", "JOG", [{ t: 0, ang: 50, id: "MATTHEWS" }, { t: 0.95, ang: 50, mode: "SPRINT" }], { runup: 2.4 }),
];
// ── DRIBBLING VOCABULARY INTEGRATION: THE CHAINS OF THE TWO INTEGRATED MOVES — each request separate (no canned combo), from an ordinary jog by
// the right-footed player, no defender; the follow-up placed where tools/lib_chain_probe.mjs found its natural opportunity (its probe table: every
// timing). Angles are the stick's, from the entry line: the feint's exit 45° right, the croqueta's 42° left
const VK = (name, steps, o = {}) => K(name, "JOG", steps, Object.assign({ runup: 2.4, def: null, vi: true }, o));
export const VI_CHAINS = [
  VK("CARRY → BODY FEINT → CARRY", [{ t: 0, ang: 45, id: "BODY_FEINT" }, { t: 1.2, ang: 45 }]),
  VK("CARRY → CROQUETA → CARRY", [{ t: 0, ang: -42, id: "CROQUETA" }, { t: 1.2, ang: -42 }]),
  VK("BODY FEINT → ordinary cut", [{ t: 0, ang: 45, id: "BODY_FEINT" }, { t: 1.2, ang: -5 }]),
  VK("BODY FEINT → CROQUETA", [{ t: 0, ang: 45, id: "BODY_FEINT" }, { t: 2.2, ang: 3, id: "CROQUETA" }]),
  VK("CROQUETA → ordinary cut", [{ t: 0, ang: -42, id: "CROQUETA" }, { t: 1.2, ang: 8 }]),
  VK("CROQUETA → CRUYFF", [{ t: 0, ang: -42, id: "CROQUETA" }, { t: 1.5, ang: -167, id: "CRUYFF" }]),
  VK("CROQUETA → carry (back to the first line)", [{ t: 0, ang: -42, id: "CROQUETA" }, { t: 1.0, ang: 0 }]),
];
// ── BODY FEINT V2: RAPID INPUT — the owner's list (fake → exit → the immediate opposite · fake → cancel · feint → straight · feint → hard cut ·
// repeated alternating feints) + request spam. At a jog the curated feint touches at ≈ 1.02 s (0.70 – 1.02 by stride phase) and its authored
// exit runs 0.58 s past it; the follow-ups are placed just after the touch and, harder, inside the lie (before it); the alternating feints at
// the feint's own cycle (≈ 1.9 s) and, as a stress case, faster than it. Each runs as written and mirrored (tools/feint_rapid.mjs, the Lab's cards)
const BFV = "BODY_FEINT_V2";
export const BF_RAPID = [
  K("Fake L → exit R → at once LEFT", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.10, ang: -60 }], { runup: 2.4, def: [4.3, 0] }),
  K("Fake L → exit R → at once FAKE R → exit L", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.10, ang: -45, id: BFV }], { runup: 2.4, def: [4.3, 0] }),
  K("Fake L → LEFT inside the lie (before the touch)", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 0.85, ang: -60 }], { runup: 2.4, def: [4.3, 0] }),
  K("Fake R → cancel: straight on during the lie", "JOG", [{ t: 0, ang: -45, id: BFV }, { t: 0.80, ang: 0 }], { runup: 2.4, def: [4.3, 0] }),
  K("Fake R → cancel: stick released during the lie", "JOG", [{ t: 0, ang: -45, id: BFV }, { t: 0.80, ang: null }], { runup: 2.4, def: [4.3, 0] }),
  K("Fake R → cancel before the window", "JOG", [{ t: 0, ang: -45, id: BFV }, { t: 0.30, ang: 0 }], { runup: 2.4, def: [4.3, 0] }),
  K("Feint → straight", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.10, ang: 0 }], { runup: 2.4, def: [4.3, 0] }),
  K("Feint → hard cut RIGHT (outside cut 90°)", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.15, ang: 90, id: "OUTSIDE_CUT" }], { runup: 2.4, def: [4.3, 0] }),
  K("Feint → hard cut LEFT (stick −90°)", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.15, ang: -90 }], { runup: 2.4, def: [4.3, 0] }),
  K("Alternating feints × 4 (at the feint's own cycle)", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.9, ang: -45, id: BFV }, { t: 3.8, ang: 45, id: BFV }, { t: 5.7, ang: -45, id: BFV }], { runup: 2.4, def: null }),
  K("Alternating feints × 3 · RUN", "RUN", [{ t: 0, ang: 40, id: BFV }, { t: 1.8, ang: -40, id: BFV }, { t: 3.6, ang: 40, id: BFV }], { runup: 2.6, def: null }),
  K("Alternating feints × 3 · WALK", "WALK", [{ t: 0, ang: 45, id: BFV }, { t: 2.0, ang: -45, id: BFV }, { t: 4.0, ang: 45, id: BFV }], { runup: 2.2, def: null }),
  K("Alternating requests faster than a feint (every 1.25 s)", "JOG", [{ t: 0, ang: 45, id: BFV }, { t: 1.25, ang: -45, id: BFV }, { t: 2.5, ang: 45, id: BFV }, { t: 3.75, ang: -45, id: BFV }], { runup: 2.4, def: null }),
  K("Request spam: feint every 0.25 s, alternating", "JOG", Array.from({ length: 9 }, (_, i) => ({ t: i * 0.25, ang: i % 2 ? -45 : 45, id: BFV })), { runup: 2.4, def: null, dur: 4.6 }),
];
// the stick heading (deg, relative to the run-up line) and mode at t (after the run-up); null = released
// ═══ CRUYFF-CHOP-1: COMPARE — the simple solution and the elite one from the IDENTICAL entry, side by side in the Lab (the same run-ups as
// tools/cc_measure.mjs phase 0: its numbers are these replays'). A right-footed player turning 120° to the left — a problem all four techniques
// can solve — and the player without the elite solutions (Dribbling below their gate) against the same B4 with them ═════════════════════════
const RUNUP = { WALK: 2.2, JOG: 2.4, RUN: 2.6, SPRINT: 4.5 };
const P2 = (mode, a, b, note, o = {}) => { const mk = (x) => C(x.tech, "COMPARE", mode, o.ang || -120, Object.assign({ runup: RUNUP[mode], dur: 3.2, pre: 0.9, def: null, title: `${x.label} · ${mode} · ${Math.abs(o.ang || -120)}° ${(o.ang || -120) < 0 ? "left" : "right"}` }, x.auto ? { auto: true } : {}, x.noElite ? { noElite: true } : {}));
  return { name: `${a.label} | ${b.label} · ${mode}`, mode, note, a: mk(a), b: mk(b) }; };
const IH = { tech: "INSIDE_HOOK", label: "INSIDE HOOK" }, OH = { tech: "OUTSIDE_HOOK", label: "OUTSIDE HOOK" }, CR = { tech: "CRUYFF", label: "CRUYFF" }, CH = { tech: "RONALDO_CHOP", label: "RONALDO CHOP" };
const NOE = { tech: "AUTO", label: "NO ELITE ACCESS (B4)", auto: true, noElite: true }, B4 = { tech: "AUTO", label: "B4 WITH THE ELITE", auto: true };
export const COMPARES = [
  P2("WALK", IH, CR, "the hook stops dead before it turns; the Cruyff drags it at a walking pace and is away"),
  P2("JOG", IH, CR, "the same ball, the same stride: the Cruyff's quicker last steps, a moving drag and a ≈ 9 m/s² restart"),
  P2("RUN", IH, CR, "from a run the hook brakes to 0.6 m/s; the Cruyff drags at ≈ 2.4 m/s behind the plant leg"),
  P2("RUN", IH, CH, "the chop keeps running into the new lane behind the shielding leg"),
  P2("SPRINT", IH, CH, "at a sprint the hook needs braking with the ball first; the chop is made at speed"),
  P2("SPRINT", IH, CR, "both prepared by braking with the ball: the Cruyff still drags it moving"),
  P2("JOG", OH, CR, "honest: the left-foot outside hook can be the quicker reversal at a jog — its ball may stay ahead of the body"),
  P2("RUN", NOE, B4, "a player without the elite solutions still turns safely (hook / drag), only less efficiently"),
  P2("SPRINT", NOE, B4, "without the chop the sprint turn is a wide controlled arc; with it, a sharp protected redirect"),
];
// ═══ ADV-4: THE FOUR ADVANCED FAMILIES AGAINST THE BASIC SOLUTION — the same entry, side by side (tools/adv_measure.mjs phase 0: its numbers
// are these replays'). A lane is a requested technique, B4 alone (auto), or B4 with families withheld (noFam: the player without them); the
// STOP-AND-GO pairs (stop) are measured to the RELAUNCH, their basic lanes the stick released and pressed again at adv_measure's moments ════
const L4 = (mode, ang, x, extra = {}) => C(x.tech, "COMPARE", mode, ang, Object.assign({ runup: RUNUP[mode], dur: x.dur || 3.2, pre: 0.9, def: null, title: `${x.label} · ${mode} · ${ang === 0 ? "straight on" : Math.abs(ang) + "° " + (ang < 0 ? "left" : "right")}` },
  x.auto ? { auto: true } : {}, x.noFam ? { noFam: x.noFam } : {}, x.stick ? { stick: x.stick } : {}, x.sprint ? { sprint: true } : {}, x.req ? { req: x.req } : {}, extra));
const P4 = (mode, ang, a, b, note, o = {}) => ({ name: `${a.label} | ${b.label} · ${mode}`, mode, note, stop: !!o.stop, a: Object.assign(L4(mode, ang, a), o.stop ? { stopGo: true } : {}), b: Object.assign(L4(mode, ang, b), o.stop ? { stopGo: true } : {}) });
const CRO = { tech: "CROQUETA", label: "CROQUETA" }, ICUT = { tech: "INSIDE_CUT", label: "INSIDE CUT" }, OCUT = { tech: "OUTSIDE_REDIRECT", label: "OUTSIDE REDIRECT" };
const VT = { tech: "V_TURN", label: "V-TURN" }, MT = { tech: "MATTHEWS", label: "MATTHEWS" };
const FAM = { CROQUETA: ["LAT"], V_TURN: ["VTURN", "VTURN_B", "VPULL", "LDRAG", "PULLPUSH"], MATTHEWS: ["MATTHEWS", "MATTHEWS_C"], STOP_AND_GO: ["DEADEN", "HESITATE", "FAKESTOP"] };
const BASIC = (fam, label) => ({ tech: "AUTO", label: label || "B4 WITHOUT IT", auto: true, noFam: FAM[fam] });
const SG = (mode, ang) => ({ tech: "STOP_AND_GO", label: "STOP-AND-GO", stick: [[0, ang, "RUN"], [0.25, ang, "SPRINT"]] });
const REL = (mode, ang, tP, label) => ({ tech: "AUTO", label, auto: true, noFam: FAM.STOP_AND_GO, stick: [[0, null, "SPRINT"], [tP, ang, "SPRINT"]] });
// (the croqueta refinement, owner 22 Oct: CURRENT → UPGRADED → BASIC REDIRECT from the identical entry, three lanes side by side)
const TRIO = (mode, ang, note) => { const L = (x, o = {}) => C(x.tech, "TRIO", mode, ang, Object.assign({ runup: RUNUP[mode], dur: 3.0, pre: 0.9, def: null, title: `${x.label} · ${mode} · ${Math.abs(ang)}° ${ang < 0 ? "left" : "right"}` }, o));
  return { name: `CURRENT | UPGRADED | BASIC REDIRECT · croqueta · ${mode} ${Math.abs(ang)}° ${ang < 0 ? "left" : "right"}`, mode, note, trio: true, lanes: [L({ tech: "CROQUETA", label: "CURRENT croqueta" }, { simOpts: { croq: "CURRENT" } }), L({ tech: "CROQUETA", label: "UPGRADED croqueta" }), L({ tech: "INSIDE_CUT", label: "BASIC inside cut" }, { noFam: ["LAT"] })] }; };
export const CROQ_TRIOS = [
  TRIO("RUN", -55, "the ball on the right foot, the exit 55° left: CURRENT (ball across, the body after it) · UPGRADED (ball and hips across together, the support underneath) · the ordinary inside cut"),
  TRIO("RUN", -40, "running, 40° left — level with the inside cut on time; no pelvis overshoot"),
  TRIO("JOG", -55, "jogging, 55° left"),
  TRIO("WALK", -40, "honest: at a walk the inside cut / B4's arc is the quicker answer"),
];
// (BODY FEINT V2: OLD (VOCAB-1's overlay feint) | V2 from the identical entry and input — the request at t = 0, the stick to the exit)
const BF = (mode, ang, note, req = "BODY_FEINT_V2") => ({ name: `OLD body feint | BODY FEINT V2 · ${mode} · fake ${ang > 0 ? "LEFT → exit RIGHT" : "RIGHT → exit LEFT"}`, mode, note,
  a: C("BODY_FEINT", "COMPARE", mode, ang, { req: "BODY_FEINT_OVERLAY", runup: RUNUP[mode], dur: 2.6, pre: 0.9, def: null, title: `OLD (VOCAB-1) · ${mode}` }), b: C("BODY_FEINT_V2", "COMPARE", mode, ang, { req, runup: RUNUP[mode], dur: 2.6, pre: 0.9, def: null, title: `BODY FEINT V2 · ${mode}` }) });
export const BF_COMPARES = [BF("JOG", 45, "the same jog, the same request: the old overlay feint vs the whole-body feint"), BF("JOG", -45, "the mirror"), BF("WALK", 45, "from a walk"), BF("RUN", 40, "at a run")];
export const ADV_COMPARES = [
  P4("RUN", -40, CRO, ICUT, "the ball on the right foot, the exit 40° left: across the body to the other foot, or the ordinary inside cut — the same entry"),
  P4("JOG", -40, CRO, BASIC("CROQUETA"), "the croqueta requested against B4 without it (B4's own choice waits 0.15 s for the analog feint)"),
  P4("JOG", -120, VT, { tech: "INSIDE_HOOK", label: "INSIDE HOOK" }, "the V-turn's moving pull against the accessible brake → hook → exit"),
  P4("JOG", -120, VT, BASIC("V_TURN", "B4 WITHOUT IT (braking redirect)"), "the V-turn against what B4 does without it from the same 120° problem"),
  P4("JOG", -90, VT, ICUT, "honest: at 90° the ordinary inside cut is the quicker redirect — the V-turn's value (the ball pulled away, protected) is not scored yet"),
  P4("JOG", 50, MT, OCUT, "honest: without a defender the outside redirect is quicker — the Matthews' inside cue is for a defender's reaction"),
  P4("RUN", 0, SG("RUN", 0), REL("RUN", 0, 0.63, "STOP → SETTLE → GO"), "a run, stopped and relaunched: the deaden-and-push against the full stop, settle, restart", { stop: true }),
  P4("RUN", 0, SG("RUN", 0), REL("RUN", 0, 0.44, "STOP (released → pressed)"), "against the ordinary stop — the A99-C stop is itself very quick", { stop: true }),
  P4("SPRINT", 0, SG("SPRINT", 0), REL("SPRINT", 0, 0.69, "STOP (released → pressed)"), "from a sprint: the deaden braked as the A99-C stop brakes, against the ordinary stop", { stop: true }),
  P4("SPRINT", 0, SG("SPRINT", 0), REL("SPRINT", 0, 0.88, "STOP → SETTLE → GO"), "from a sprint, against the full stop, settle, restart", { stop: true }),
  P4("SPRINT", 0, { tech: "STOP_AND_GO", label: "HESITATION (sprint held)", sprint: true, stick: [[0, 0, "SPRINT"]] }, REL("SPRINT", 0, 0.30, "RELEASED 0.3 s → PRESSED"), "the sprint key held: the hesitation against a plain release and press", { stop: true }),
];
// ═══ ADV-4: THE ADVANCED AUTO SOLUTIONS — the Lab's six prominent cards: PLAY (the advanced solution), COMPARE (against the basic one, the
// same entry), MIRROR, AUTO (the same state, no request), TRY (the joystick), 1× / 0.5× / 0.25×; `why`: why it is (or is not) better than the
// basic solution in THIS replay — the numbers are tools/adv_compare.mjs's on these exact replays ══════════════════════════════════════════
const find = (tech, variant) => CASES.find((c) => c.tech === tech && c.variant === variant);
export const ADVANCED = [
  { id: "CROQUETA", name: "LA CROQUETA", play: find("CROQUETA", "NORMAL"), cmp: ADV_COMPARES[0], trio: CROQ_TRIOS[0], cls: "AUTO + MANUAL", why: "In the COMPARE replay (run, 55° left) the ball and the hips go across together: the body is 0.5 m into the new lane 0.22 s sooner than with the ordinary inside cut (0.59 vs 0.81 s) and 0.95 m further across 0.8 s after the request (1.41 vs 0.46 m), the useful exit 0.20 s sooner (0.50 vs 0.70 s), with no pelvis overshoot (the inside cut's 10°); at 40° it is level with the inside cut, at a walk the inside cut is quicker." },
  { id: "V_TURN", name: "V-TURN", play: find("V_TURN", "NORMAL"), cmp: ADV_COMPARES[2], cls: "AUTO + MANUAL · recommend MANUAL", why: "Against the hook, yes: 0.07 s sooner (1.12 vs 1.19 s) — the pull is made moving (1.2 m/s at the contact, the hook's 0.6), the body never below 0.6 m/s (the hook 0.2), the ball within 0.66 m (0.88); but B4's braking pivot is 0.31 s quicker still, so AUTO does not choose it." },
  { id: "MATTHEWS", name: "MATTHEWS", play: find("MATTHEWS", "NORMAL"), cmp: ADV_COMPARES[5], cls: "AUTO + MANUAL · recommend MANUAL", why: "It is not: the outside redirect is 0.43 s quicker (0.43 vs 0.86 s) — the inside cue costs a stride that pays only against a defender's reaction, which nothing models yet; kept honest, not buffed (B4 never chooses it)." },
  { id: "STOP_AND_GO", name: "STOP-AND-GO", play: find("STOP_AND_GO", "NORMAL"), cmp: ADV_COMPARES[6], cls: "AUTO + MANUAL · recommend MANUAL", why: "Against stop → settle → go, yes: the relaunch 0.31 s sooner (1.01 vs 1.32 s), 7.3 m/s one second after the lowest speed (5.5) — the ball dead under the sole, the push already the first step; the ordinary A99-C stop (released → pressed) is 0.21 s quicker still, and a stick cannot say 'stop, then go' to B4." },
  { id: "CRUYFF", name: "CRUYFF", play: find("CRUYFF", "NORMAL"), cmp: null, cmpIdx: 1, cls: "AUTO + MANUAL", why: "0.14 s sooner than the inside hook (1.05 vs 1.19 s): the drag is made moving at 1.3 m/s (the hook stops to 0.6), the lowest speed 0.7 m/s (0.2), the ball within 0.66 m (0.88) — B4 chooses it by itself in its PLAY state." },
  { id: "RONALDO_CHOP", name: "RONALDO CHOP", play: find("RONALDO_CHOP", "NORMAL"), cmp: null, cmpIdx: 3, cls: "AUTO + MANUAL", why: "0.17 s sooner than the inside hook from a run (1.27 vs 1.44 s): the chop is made at 3.5 m/s and never drops below 2.2 (the hook brakes to 0.2) — at 90° B4's own compact inside redirect is quicker still (0.41 s), so AUTO keeps the chop for the sharper, protected turns." },
];
export function stickAt(c, t) { if (t < 0) return { ang: 0, mode: c.mode }; if (c.stick) { let s = c.stick[0]; for (const x of c.stick) if (t >= x[0]) s = x; return { ang: s[1], mode: s[2] || c.mode }; } return { ang: c.ang, mode: c.mode }; }
export const caseKey = (c) => `${c.tech}·${c.variant}·${c.name || c.title}`;
// ═══ BODY FEINT V2 — VIDEO-GUIDED (owner, 23 Oct: the reference recording): the owner's six cases, each also as THREE LANES from the identical
// entry and input — A · PREVIOUS V2 (the committed feint2/ build, 0c65eac3, run untouched: eng "prev") | B · VIDEO-GUIDED V2 (this build) |
// C · OLD (VOCAB-1's overlay feint) — 2.6 m apart, synchronised ════════════════════════════════════════════════════════════════════════════
const VGC = [["JOG — FAKE LEFT → RIGHT", "FAKE LEFT → RIGHT"], ["JOG — FAKE RIGHT → LEFT", "FAKE RIGHT → LEFT"], ["LOW SPEED — FAKE LEFT → RIGHT", "LOW-SPEED L → R"],
  ["LOW SPEED — FAKE RIGHT → LEFT", "LOW-SPEED R → L"], ["RUN — FAKE LEFT → RIGHT", "RUNNING L → R"], ["RUN — FAKE RIGHT → LEFT", "RUNNING R → L"]];
export const BF_VG = VGC.map(([name, v]) => { const c = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === v);
  // (BODY FEINT V2 — EXIT FOOT: the comparison is PREVIOUS VIDEO-GUIDED V2 (the committed feint2vg build, 7853a88f, run untouched: eng "vg") | the
  // EXIT-FOOT version, two lanes from the identical entry and input)
  return { name, c, mode: c.mode, note: c.title, trio: true, bf: true, dy: 2.6, labels: ["A · VIDEO-GUIDED V2 (previous)", "B · EXIT-FOOT V2"], aNote: "A runs the committed VIDEO-GUIDED V2 build (feint2vg · 7853a88f) untouched.",
    lanes: [Object.assign({}, c, { eng: "vg", variant: "VIDEO-GUIDED V2", title: `VIDEO-GUIDED V2 (previous · feint2vg) · ${name}` }), c, null] }; });
// ═══ LA CROQUETA — VIDEO-GUIDED (owner, 23 Oct: the reference recording): the six REF cases, the reference's side first (the left inside
// across to the right foot) and its mirror, each also as TWO LANES from the identical entry and input — A · CURRENT ADV-4 (the committed
// feint2ef build, f8a0e374, run untouched: eng "cur" — its croqueta is ADV-4's) | B · VIDEO-GUIDED (this build) — 2.6 m apart, synchronised ═══
const CQV = [["WALK — LEFT INSIDE → RIGHT (the reference's side and pace)", "REF · WALK L → R"], ["JOG — LEFT INSIDE → RIGHT", "REF · JOG L → R"], ["RUN — LEFT INSIDE → RIGHT", "REF · RUN L → R"],
  ["WALK — RIGHT INSIDE → LEFT (the mirror)", "REF · WALK R → L"], ["JOG — RIGHT INSIDE → LEFT (the mirror)", "REF · JOG R → L"], ["RUN — RIGHT INSIDE → LEFT (the mirror)", "REF · RUN R → L"]];
export const CROQ_VGR = CQV.map(([name, v]) => { const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === v);
  const cv = Object.assign({}, c, { eng: "vg1" });   // (X-SWEEP V3: B runs the committed croqvg build itself — V1 on every card)
  return { name, c: cv, mode: c.mode, note: c.title, trio: true, bf: true, cq: true, dy: 2.6, labels: ["A · CURRENT ADV-4", "B · VIDEO-GUIDED"], aNote: "A runs the committed build (feint2ef · f8a0e374) untouched: ADV-4's croqueta.",
    lanes: [Object.assign({}, c, { eng: "cur", variant: "CURRENT ADV-4", title: `CURRENT ADV-4 (feint2ef) · ${name}` }), cv, null] }; });
// ═══ LA CROQUETA — X-SWEEP V3 (owner, 23 Oct ≈ 20:51 EEST): THE ONE REFERENCE CASE — the right foot's ball across to the left foot at a jog —
// as THREE LANES from the identical entry and input: A · HOP/SWEEP V2 (the committed croqhs build, 753d0cc6: eng "hs2") | B · X-SWEEP V3 (this
// build) | C · VIDEO-GUIDED V1 (the committed croqvg build, 4a549b8f: eng "vg1"), 2.6 m apart; ADV-4 (feint2ef, f8a0e374: eng "cur") alone ═══
export const CROQ_XSR = [["JOG — THE RIGHT FOOT'S BALL ACROSS TO THE LEFT (the reference's side and pace)", "REF · JOG R → L"]].map(([name, v]) => { const c = Object.assign({}, CASES.find((x) => x.tech === "CROQUETA" && x.variant === v), { eng: "xs3" });   // (LEG-WAVE V4: B runs the committed croqxs build itself — this card is V3's)
  return { name, c, mode: c.mode, note: "One continuous elastic X-shaped sweep: the right leg swings out and forward beyond the ball with the right side of the body bowed around it, the left leg trailing; the leg, the ball, the pelvis and the trunk sweep across and slightly back, the bend passing through the centre; the left leg opens out and forward and receives on its inside with the left side bowed, the right leg trailing", trio: true, bf: true, cq: true, hs: true, xs: true, dy: 2.6,
    labels: ["A · HOP/SWEEP V2", "B · X-SWEEP V3", "C · VIDEO-GUIDED V1"], aNote: "A runs croqhs (753d0cc6) and C runs croqvg (4a549b8f), both untouched.",
    lanes: [Object.assign({}, c, { eng: "hs2", variant: "HOP/SWEEP V2", title: `HOP/SWEEP V2 (croqhs) · ${name}` }), c, Object.assign({}, c, { eng: "vg1", variant: "VIDEO-GUIDED V1", title: `VIDEO-GUIDED V1 (croqvg) · ${name}` })],
    adv: Object.assign({}, c, { eng: "cur", variant: "ADV-4", title: `ADV-4 (feint2ef) · ${name}` }) }; });
// ═══ LA CROQUETA — LEG-WAVE V4 (owner, 23 Oct ≈ 22:10 EEST): THE ONE REFERENCE CASE as TWO LANES from the identical entry and input:
// A · X-SWEEP V3 (the committed croqxs build, f7645d10: eng "xs3") | B · LEG-WAVE V4 (this build), 2.6 m apart ═══════════════════════════════
export const CROQ_LWR = [["JOG — THE RIGHT FOOT'S BALL ACROSS TO THE LEFT (the reference's side and pace)", "REF · JOG R → L"]].map(([name, v]) => { const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === v);
  return { name, c, mode: c.mode, note: "One wave through both legs, the hips and the trunk: | | → \\ \\ → / / → | |. From the right-side load (your screenshot, L1) the right leg sweeps inward and back with the ball while the left leg keeps opening out to the left; the ball arrives at the already-open left inside, which cushions it; then the body resolves forward", trio: true, bf: true, cq: true, hs: true, lw: true, dy: 2.6,
    labels: ["A · X-SWEEP V3", "B · LEG-WAVE V4"], aNote: "A runs croqxs (f7645d10), untouched.",
    lanes: [Object.assign({}, c, { eng: "xs3", variant: "X-SWEEP V3", title: `X-SWEEP V3 (croqxs) · ${name}` }), c, null] }; });
// ═══ DRIBBLING VOCABULARY INTEGRATION (owner, 23 Oct ≈ 23:31 EEST): THE MAIN LAB'S FIRST SECTION — the two integrated moves. Each card: its
// approved cases — B · INTEGRATED LIBRARY (this build) and A · its REVIEW BUILD (Body Feint: feint2ef, f8a0e374, eng "cur"; La Croqueta:
// croqlw, b489e4fd, eng "lw4"), run untouched from the identical entry and input — A | B side by side, the mirror (the left-footed twin), TRY,
// 1× / 0.5× / 0.25×; then the same move requested from ordinary play inside its validated envelope (the right-footed player, no foot hint, no
// defender) and the entries it declines, with their reasons ═══════════════════════════════════════════════════════════════════════════════════
const VIP = (tech, variant, mode, ang, o = {}) => Object.assign({ tech, variant, mode, ang, runup: 2.6, dur: 2.6, pre: 1.1, def: null, intents: [{ t: 0, id: tech, foot: null }] }, o);
const viLanes = (name, c, eng, aName, extra = {}) => Object.assign({ name, c, mode: c.mode, note: c.title, trio: true, bf: true, dy: 2.6, labels: [`A · ${aName}`, "B · INTEGRATED LIBRARY"], aNote: `A runs the review build untouched (${aName}).`,
  lanes: [Object.assign({}, c, { eng, variant: aName, title: `${aName} · ${name}` }), c, null] }, extra);
export const VI_MOVES = [
  { id: "BODY_FEINT", name: "BODY FEINT", version: "VIDEO-GUIDED + EXIT FOOT", aName: "REVIEW BUILD · feint2ef",
    approved: BF_VG.map((p) => viLanes(p.name, p.c, "cur", "REVIEW BUILD · feint2ef")),
    play: [VIP("BODY_FEINT", "ORDINARY · WALK 50°", "WALK", 50, { title: "from ordinary play: a settled walk, the exit 50° to the carrying foot's side (BFEINT_L)" }),
      VIP("BODY_FEINT", "ORDINARY · JOG 40°", "JOG", 40, { runup: 2.8, title: "from ordinary play: a settled jog at another stride phase, 40° (BFEINT_J)" }),
      VIP("BODY_FEINT", "ORDINARY · RUN 35°", "RUN", 35, { runup: 2.9, title: "from ordinary play: a settled run, 35° (BFEINT_R)" })],
    declined: [VIP("BODY_FEINT", "DECLINED · FAKE TOWARD THE CARRYING FOOT", "JOG", -45, { title: "declined: the right-footed carry asked to fake RIGHT → exit LEFT — the ball is on the right foot (the validated mirror is the left-footed twin's)" }),
      VIP("BODY_FEINT", "DECLINED · 75° FROM A JOG", "JOG", 75, { title: "declined: 75° is beyond the jog's validated 35 – 60°" })] },
  { id: "CROQUETA", name: "LA CROQUETA", version: "LEG-WAVE V4", aName: "REVIEW BUILD · croqlw",
    approved: ["REF · JOG R → L", "REF · JOG L → R"].map((v) => { const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === v); return viLanes(v.replace("REF · ", "REFERENCE · "), c, "lw4", "REVIEW BUILD · croqlw", { cq: true, lw: true }); }),
    play: [VIP("CROQUETA", "ORDINARY · JOG 42° (another stride phase)", "JOG", -42, { runup: 2.9, title: "from ordinary play: a settled jog, the right foot's ball to the LEFT, 42°, a stride phase other than the reference's" }),
      VIP("CROQUETA", "ORDINARY · JOG 45°", "JOG", -45, { runup: 2.45, title: "from ordinary play: a settled jog, 45° to the left" })],
    declined: [VIP("CROQUETA", "DECLINED · FROM A RUN", "RUN", -42, { title: "declined: CROQUETA V4 NOT CURRENTLY FEASIBLE — 5.3 m/s is outside its validated 2.6 – 3.6 m/s jog" }),
      VIP("CROQUETA", "DECLINED · TO THE RIGHT, BALL ON THE RIGHT FOOT", "JOG", 42, { title: "declined: the right-footed carry asked for the croqueta to the RIGHT — the ball is on the right foot (the validated mirror is the left-footed twin's)" })] },
];
