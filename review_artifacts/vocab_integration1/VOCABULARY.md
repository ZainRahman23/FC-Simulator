# The dribbling vocabulary after integration (24 Oct 2026)

The build is **`sandbox/visual/vocab2/`**. The catalogue is `vocab2/v_meta.js` `META`; the templates are `vocab2/v_tech.js` `TEMPLATES`; B4's one-contact families are `vocab2/u_tc.js` `GENERIC`. `META.lib` holds each entry's class, and `libOf()` reads it. `eligible: false` means a request for that entry is rejected at once, with the reason (`intentOf()` → `retired`).

## The two answers a session needs first

| | **The current Body Feint** | **The current Croqueta** |
|---|---|---|
| Name | BODY FEINT — video-guided + exit foot | LA CROQUETA — leg-wave V4 |
| Class | **AUTHORITATIVE**. PROVISIONALLY APPROVED MOTION FOUNDATION (owner, 23 Oct); not frozen. | **AUTHORITATIVE**. PROVISIONALLY APPROVED MOTION FOUNDATION (owner, 23 Oct); not frozen. |
| Request | `BODY_FEINT` (MANUAL). `BODY_FEINT_V2` is an alias, so older cases reach it. | `CROQUETA` (MANUAL) |
| Templates | `BFEINT_L` (walk), `BFEINT_J` (jog), `BFEINT_R` (run): `vocab2/v_tech.js` `bodyFeintOf()` | `CROQ_LW`: `vocab2/v_tech.js` `croqLWOf()` |
| Motion source | `feint2vg/` (7853a88f) → `feint2ef/` (f8a0e374), unchanged | `croqlw/` (b489e4fd), unchanged |
| Reproduction | the six approved cases + mirror ≡ feint2ef: 0.000 mm, every joint and the ball, every tick | REF R → L, REF L → R and the mirror ≡ croqlw: 0.000 mm |
| Validated from ordinary play | **walk** 45–55°, **jog** 35–60°, **run** 35–40°, in a settled carry. The exit is to the carrying foot's side and the fake to the other.<br>Every stride phase plays; 0 played-and-failed in 560 entries per player. | **settled jog** 2.6–3.6 m/s, **40–45°** toward the receiving side, the ball on the carrying foot.<br>Every stride phase plays; 0 played-and-failed. |
| Mirror | the left-footed twin: fake RIGHT → exit LEFT. Identical counts in every sweep. | the left-footed twin: the left foot's ball → RIGHT. Identical counts. |
| Not generalized | the fake toward the carrying foot (a right-footed fake RIGHT → exit LEFT); sprint; exits outside the bands; feinting while accelerating, braking or turning; defenders; Dribbling < 99 | walk / run / sprint; angles outside 40–45°; the ball on the other foot; bringing the ball to it with a set touch; defenders; Dribbling < 99 |
| Declined entry | REJECTED with its reason; the controlled carry, or B4's ordinary answer to the stick, continues | **"CROQUETA V4 NOT CURRENTLY FEASIBLE"** with the reason. There is no ADV-4 fallback for a CROQUETA request: the carry, or B4's ordinary answer, continues. |
| AUTO | never (not in `AUTO_TECH`) | never |

## Every catalogue entry

| Class | Entries | Notes |
|---|---|---|
| **AUTHORITATIVE** (provisionally approved) | `BODY_FEINT`, `CROQUETA` | the two integrated moves |
| **PRODUCTION** (the vocabulary as it was; unchanged) | `CARRY` `CLOSE_CARRY` `SPRINT_CARRY` `STOP` · B4 one-contact actions `KNOCK_ON` (KNK) `INSIDE_CUT` (CIR) `OUTSIDE_REDIRECT` (COR) `GATHER` (ABG) `URGENT_REACH` (URG) `BRAKING_TOUCH` (BRT) `BRAKING_PIVOT` (BPV) `SOLE_ROLL` (SOL) · `OUTSIDE_CUT` `INSIDE_HOOK` `OUTSIDE_HOOK` `RONALDO_CHOP` `CRUYFF` `DRAG_BACK` `MATTHEWS` `V_TURN` `STOP_AND_GO` `SHIELD_ROLL` `SHIELD_HOOK` `SHIELD_OUTHOOK` · the overlay feints `SHOULDER_DROP` `HIP_FAKE` · `SCISSORS` `SCISSORS_GO` `STEPOVER` `DOUBLE_SCISSORS` `ELASTICO` `REVERSE_ELASTICO` | Their engineering STATUS tags (INTEGRATED / REVIEW) are unchanged. AUTO = `AUTO_TECH` (CHOP, OUTCUT, CRUYFF, HOOK, DRAGBACK, OUTHOOK, MATTHEWS_C, VTURN, DEADEN), unchanged. |
| **EXPERIMENTAL** (eligible, as before) | `ROULETTE`, `HEEL_CHOP` | unchanged |
| **SUPERSEDED · not eligible** | `BODY_FEINT_OVERLAY` (88573ef0's overlay feint; VOCAB-1's `BODY_FEINT` before integration) · `FEINT_OUTSIDE_CUT`, `FEINT_INSIDE_CUT` (the overlay feint fused to a cut) | a request is rejected: "SUPERSEDED — superseded by BODY_FEINT[ → an ordinary cut (a chain)]: not eligible" |
| **EXPERIMENTAL · not eligible** | `BODY_FEINT_V2_SHALLOW` (`BFEINT_JS`), `BODY_FEINT_V2_STRONG` (`BFEINT_JX`) | the authoritative feint at depths never reviewed |

## Templates no entry reaches (HISTORICAL)

| Templates | What they were | Where reviewed |
|---|---|---|
| `CROQ_W`, `CROQ_J`, `CROQ_R` | LA CROQUETA — VIDEO-GUIDED V1 | `croqvg/` (4a549b8f) |
| `CROQ_HS` | HOP/SWEEP V2 | `croqhs/` (753d0cc6) |
| `CROQ_XS` | X-SWEEP V3 | `croqxs/` (f7645d10) |
| ADV-4's croqueta (the `CROQUETA` entry's generic `LAT` instance and its refinement, c11579a3) | the croqueta before the video-guided work | `adv4/`, and `feint2ef/` as "CURRENT ADV-4" |

These templates stay in `TEMPLATES` for the record. `META` lists none of them and `AUTO_TECH` contains none, so the resolver never instantiates them.

## B4's LATERAL TRANSFER (`GENERIC.LAT`) — preserved, documented, not the Croqueta

`LAT` is B4's one-contact lateral transfer, built on ADV-4's mechanics. It is an **automatic** redirect of the EXPANDED vocabulary (`EXPANDED = ["LAT", "KNK"]`), chosen by outcome cost in ordinary steering. Its contact roles still read "croqueta · the inside plays it across / the other foot receives". It is unchanged, so ordinary play is unchanged.

- **It does not conflict with the Croqueta.** A CROQUETA request never plays it. While a CROQUETA request is pending, its line is held, so B4 sees no turn and cannot choose LAT.
- **After a declined request**, a stick still held at the angle is answered by ordinary B4, which may be LAT. This is ordinary play, the same as with no request.

## The old analog feint (VOCAB-1 `feintTick`) — removed from ordinary play

VOCAB-1 played the old overlay Body Feint **automatically** from the stick (`u_sim.js` `feintTick`). That was an AUTO old Body Feint, so it is off in vocab2. It returns only with `o.analogFeint` (no page sets it) or with `ABL=analogfeint` (a tools-only ablation). With it restored, ordinary play is identical to croqlw (`INTEGRATION_REPORT.md` §6). The sandbox's "analog feints" switch is gone.
