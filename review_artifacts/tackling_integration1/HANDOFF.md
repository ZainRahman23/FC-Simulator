# HANDOFF — TACKLING INTEGRATION V1 · STANDING TACKLE V1 (24 Oct 2026)

**Status: PROVISIONAL.** Not frozen, not merged, awaiting the owner's visual review. Read `TACKLING_REPORT.md` for the results and `TACKLING_AUDIT.md` for the lineage. The slide tackle is audited only: `SLIDE_TACKLE_AUDIT.md`.

## Source of truth

| what | value |
|---|---|
| branch | `prototype/tackling-integration-v1` (local; see `STATUS.json` for the head) |
| worktree | `~/Downloads/FC Simulator worktrees/tackling-integration-v1` (sparse: `/review_artifacts/tackling_integration1/` added) |
| base milestone | `milestone/feint-croqueta-vocab-v1` = tag `checkpoint/touchline-feint-croqueta-vocab-v1-2026-10-24` = `f775daac` (the current published gameplay: vocab2) |
| canonical files changed | **none**. The work adds `sandbox/visual/tackle1/`, `sandbox/visual/tackle1_lab.html` and this folder |
| the owner's instruction | `sources/2026-10-24_user_instruction_tackling_integration_v1.md` (verbatim) |

## Source files (`sandbox/visual/tackle1/`)

| file | what |
|---|---|
| `t_tackle.js` | **STANDING TACKLE V1**: the envelope (`TK`); `StandingTackle` (request / pending / opportunity / commitment / the action as a canonical plan / the boot's spheres / contacts / outcome / recovery / control return) |
| `t_world.js` | **The world**: the canonical attacker (vocab2 `ControlledSim`, unchanged); `DefenderSim` (the same class, ball off; it sees the authoritative ball; the tackle holds its re-planning; it plays a loose ball only through its own canonical receive); one fixed tick order; `runEncounter` (the curated case exactly as `v_run.js` runs it + the defender's stick + the requests) |
| `t_run.js` | One review case (the defender placed from the attacker's own deterministic path), its report: the same code in the Lab and in node |
| `t_cases.js` | The Lab's deterministic cases |
| `t_body.js` | The posed bodies' integrity measures (presentation only) |
| `t_lab.js` + `../tackle1_lab.html` | **TOUCHLINE — TACKLING LAB V1** |
| `tools/` | `t_identity.mjs`, `t_lab_cases.mjs`, `t_matrix.mjs`, `t_search.mjs`, `t_moves.mjs`, `t_envelope.mjs`, `t_torture.mjs`, `t_cpu.mjs`, `t_browser.cjs`, `t_stills.cjs` (and early probes `t_smoke*.mjs`, `t_sweep*.mjs`, `t_one.mjs`) |
| `review_artifacts/tackling_integration1/tools/milestone_regress.mjs` | The milestone's 10 regression suites, compared with its committed evidence |

## Entry points (code)

```js
import { TackleWorld, runEncounter, encounterOpts, playerOpts } from "./tackle1/t_world.js";
const W = new TackleWorld(env, { att: playerOpts("R"), def: playerOpts("R", { start: { P, h } }) });   // env: { E, M4, skel, colliders, baked, body }
W.request("button");                 // an explicit tackle request (never from the left-stick recognizer)
W.step(attackerReq, defenderReq);    // one world tick (240 Hz): { h, mode, keys } each
W.tk.act / W.tk.acts / W.tk.log / W.tk.summary()   // the action(s), the requests' fates, the review record
W.tk.cancel(W.t)                     // withdraw a pending request (before commitment)
```

## Serve and open (LOCAL ONLY: real players' models)

```sh
cd ~/"Downloads/FC Simulator worktrees/tackling-integration-v1" && python3 -m http.server 8363 --bind 127.0.0.1
open http://127.0.0.1:8363/sandbox/visual/tackle1_lab.html
```

Lab keys: Space play/pause · `,` `.` step 4 ticks (Shift: 1) · T tackle at the playhead · B ball · 1–8 cameras. URL parameters: `case`, `cam`, `t`, `ball`, `body`, `skel`, `diag`, `contact=PHASE_C`.

## The validated envelope (details and numbers in the report)

| | |
|---|---|
| approach speed | standing, walk (1.5 m/s), jog (≤ 3.4 m/s) |
| declined | run / sprint (`SPEED`) |
| support | the support foot planted at commitment (never in flight); the free foot reaches |
| reach | the forward sector ±75°, the ellipse 1.28 / 1.30 m (Phase C), ≥ 0.30 m from the body, the ball's centre ≤ 0.24 m high |
| side | either foot. The foot is the free one on the ball's side; it may reach ≤ 0.12 m across its midline, else the next stride is waited for |
| request | lives 0.35 s; a duplicate while pending is IGNORED; a request while the tackle owns the body (or recovers) is DECLINED |

## Decline policy

A request is DECLINED with the reason that held when its window closed. Possible reasons:
- `SPEED`, `BALL TOO HIGH`, `NO SUPPORT`, `OUTSIDE THE FORWARD SECTOR`, `OUT OF REACH`, `TOO CLOSE`, `WRONG SIDE`;
- `COMMITTED` / `RECOVERING` (the tackle owns the body).

The Lab lists every tick's reasons while pending.

## The contact model

- **The boot:** the reaching ankle's authoritative path (`act.boot(τ)`), with 4 spheres (r 0.045 m: toe, two inside, outside forefoot). These are presented every tick of the contact window to the **canonical** opponent law, `vocab2/c_sim.js opponentStep` (unchanged).
- **The law:** the relative velocity is reflected along the contact normal with restitution 0.55, and the ball is relaunched by the kernel from where it is.
- **Contact pose and speed** (integration's addition; switch `TK.contact` / the Lab's contact menu):
  - **POKE (default):** the toe 1 cm into the ball, along the foot's own line of reach, at 3.0 − 1.8 c m/s (never below Phase C's 0.7 + 0.55 c);
  - **PHASE_C:** Phase C's contact pose and speed exactly.
- **Contact episodes:** impulses on consecutive ticks are one sustained contact.

## Possession outcomes (never decided by the tackle)

- **The carrier's state:** the carrier's canonical possession model decides it (CONTROLLED → FREE as OPPONENT_TACKLE, or the control survives a minor deflection: Δv < 2 m/s and the next touch within 0.6 s).
- **The defender plays a loose ball only through his own canonical receive.** After his tackle has touched the ball and returned control, and while the carrier does not control the ball, the defender is the ball-on footballer on the shared ball (FREE → COLLECTED → CONTROLLED).
- **The labels**, for review, judged on the race after the contact:
  - MISS;
  - OPPONENT RETAINS;
  - ATTACKER RECOVERS: the carrier's touch within 0.6 s;
  - POKED LOOSE · CARRIER RE-COLLECTS;
  - CONTROLLED WIN: the defender's possession CONTROLLED and no carrier touch for 1 s;
  - WON · CONTESTED / DEFENDER TOUCH;
  - LOOSE BALL.

## Known limitations

See the report §11. In brief:
- **No player–player collision:** the bodies can overlap.
- **The 99 CONTROLLED carrier** re-plans in the contact tick and plays any ball within 1.05 m. Most contacts end ATTACKER RECOVERS.
- **Two single-player possession models share one ball:** there is no challenge / foul layer.
- **Moving commitments show more body events than standing ones.**
- **The POKE contact speed is provisional.**
- **Recovery is the same for a hit and a miss.**

## Tests (regenerate from `sandbox/visual/tackle1/tools/`; evidence in `evidence/`)

```sh
node t_identity.mjs                      # the attacker ≡ the canonical player (244 runs)
node ../../../../review_artifacts/tackling_integration1/tools/milestone_regress.mjs --out <dir>   # the milestone's 10 suites (≈ 8 min)
node t_lab_cases.mjs                      # every Lab case: the action, the outcome, the body
node t_search.mjs --n 100 [--contact PHASE_C]   # outcomes over 1500 runs
node t_moves.mjs                          # Body Feint / Croqueta against the tackle
node t_envelope.mjs                       # speeds × sides × facings
node t_torture.mjs --n 60 --seed 3        # torture (≈ 5 min)
node t_cpu.mjs                            # performance
PUPPETEER_NODE_MODULES=<dir> node t_browser.cjs --out <dir> --shots <dir> --node <lab_cases.json>   # the Lab in Chrome (server on :8363)
```

## Not done (by instruction)

- defender AI, auto tackle, auto positioning, defensive ratings, anticipation, reaction attributes;
- the left-stick recognizer;
- the slide tackle integration (audited only);
- player-collision physics;
- any change to Body Feint, Croqueta, locomotion, ball physics, possession or the vocabulary.
