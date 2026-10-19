# receive_turn11/tools/rt11_report_build.py — writes review_artifacts/receive_turn11/RECEIVE_TURN11_REPORT.md and RECEIVE_TURN11_STATUS.json from the evidence
#   python3 rt11_report_build.py
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); RA = os.path.normpath(os.path.join(HERE, "../../../../review_artifacts/receive_turn11")); EV = lambda f: json.load(open(os.path.join(RA, "evidence", f)))
M, MIR, NEU, CHR, REG = EV("human_metrics.json"), EV("mirror.json"), EV("animation_neutrality.json"), EV("rt11_chrome_node.json"), EV("regression.json")
FROZ = open(os.path.join(RA, "evidence/frozen_sha256_end_check.txt")).read().strip().split("\n")[-1].replace("# ", "")
C = M["cases"]; mm = lambda x: "—" if x is None else (f"{x*1000:.1f}" if x * 1000 < 10 else f"{x*1000:.0f}"); f = lambda x, n=2: "—" if x is None else f"{x:.{n}f}"; sg = lambda x, n=2: "—" if x is None else f"{x:+.{n}f}"
FAM = {"DIRECTIONAL": "directional", "HALF_TURN": "half-turn", "OUTSIDE_TURN": "outside-of-foot", "THROUGH_TURN": "through-stance"}
cs = [c for c in C.values() if not c.get("none")]; mx = lambda g: max(g(c) for c in cs); mn = lambda g: min(g(c) for c in cs)
def rowc(k):
  c = C[k]; r = c["rotation"]; e = c["events"]; t = c["continuity"]["humanTurn"]; tot = 180 * (1 if c["cond"]["theta"] > 0 else -1) if abs(c["cond"]["theta"]) == 180 else r["total"]
  return f"| {k} | {FAM[c['family']]} | {c['foot']} {c['surface'].lower()} | {tot:.0f}° | {r['beforeContact']:.0f}° / {r['afterContact']:.0f}° | {r['shoulderBeforeContact']:.0f}° | {r['maxHipShoulderSeparation']:.0f}° | {r['maxHipRate']:.0f}°/s | {sg(e['supportPlant'])} | {sg(e['aligned'])} | {sg(e['weightTransfer'])} | {sg(e['rejoin'])} | {mm(c['slip']['max'])} | {mm(t['snap'])} | {mm(c['continuity']['v1Turn']['snap'])} | {f(c['contactReach']['comToBall'])} · {f(c['contactReach']['legExtension'])} | {f(c['com']['prep'])} |"
ORDER = ["d30", "d60", "h90", "h120", "h135", "x135", "t150", "t180", "o90", "m30", "m60", "m90", "m120", "m135", "m150", "m180", "mo90", "pl90", "pl135", "tf180", "tf180L"]
BC = M["bc"]; BCS = ["50", "70", "80", "90", "99"]
def bcrow(k, lbl):
  B = BC[k]; return "\n".join([f"**{lbl}** (matched draw)", "", "| | " + " | ".join("BC " + b for b in BCS) + " |", "|---|" + "---|" * 5,
    "| class | " + " | ".join(B[b]["cls"] for b in BCS) + " |", "| touch direction error | " + " | ".join(f"{B[b]['touch']['dirErrDeg']:+.1f}°" for b in BCS) + " |",
    "| extra correction | " + " | ".join(f"{B[b]['touch']['extraAdj']:.2f} m" for b in BCS) + " |", "| rejoins | " + " | ".join(f"{B[b]['events']['rejoin']:+.2f} s" for b in BCS) + " |",
    "| rejoined by | " + " | ".join((B[b]["rejoin"]["foot"] or "—") + (" (follow-through)" if B[b]["events"]["rejoin"] is not None and B[b]["events"]["rejoin"] < B[b]["events"]["contactLand"] else "") for b in BCS) + " |",
    "| hips aligned | " + " | ".join(f"{B[b]['events']['aligned']:+.2f} s" for b in BCS) + " |", "| snap (turn) | " + " | ".join(mm(B[b]["continuity"]["humanTurn"]["snap"]) + " mm" for b in BCS) + " |", ""])
h = C["h90"]; t18 = C["t180"]; h135 = C["h135"]; o = C["o90"]; d = C["d30"]
md = f"""# RECEIVE-TURN-1.1 — human body motion around the authoritative receive-and-turn

**Status: presented for review — NOT frozen, NOT integrated.** The football action (technique, contact foot and surface, contact timing, ideal first-touch vector, Ball Control
error, ball state, exit direction, preferred-foot logic, feasibility, mirroring, curve B, bounded variance) is RECEIVE-TURN-1's, imported unchanged (`receive_turn1/rt_sim.js`).
The owner's instruction is saved verbatim in `sources/2026-10-19_user_instruction_receive_turn_1_1_human_motion.md`.

I cannot play video in real time: visual judgements here come from stills (the event strips and frames from the clips). The clips are for the owner.

Review page (local only): `review/RECEIVE_TURN11_REVIEW.html` · lab: `sandbox/visual/receive_turn11_lab.html` (served at :8361).

## 1. Architecture
"Simulation decides what happens. Animation visually explains what happened." The body (`receive_turn11/rt11_body.js`, `HumanTurnBody`) is built from a finished episode and
never writes back:
**RECEIVE-TURN-1 facts** (family, foot, surface, contact tick, ball at contact, impulse direction, exit line, planned root path, meeting / follow-up) →
**authored reference** `REF[family](angle)` (lead time, plant time, swing start, support-toe angle, shoulder lead, counter-rotation, exit lead, hip pre-turn, crouch, lean,
landing share, pivot range) → **footstep plan** (support step, contact foot open on its forefoot, contact swing through the CONTACT pose, landing = first exit step, support-foot
forefoot pivot with heel up, run steps on the path with toe-off, touches as exact via-points) → **rotation channels** (gaze → shoulders → hips → feet) → **procedural root**
(the simulation's path pulled toward the loaded foot) → **IK + grounding** (leg IK to each foot target, pivots exact about the rig's MTP joint, ground clearance) → FK → skin.

## 2. Preparation
Preparation starts {-h['events']['prepStart']:.2f} s before the contact on the 90° half-turn ({-d['events']['prepStart']:.2f} s directional, {-t18['events']['prepStart']:.2f} s through-stance): a head check toward the exit
(~{h['events']['prepStart']+0.18:+.2f} s), the shoulders open first, the hips follow ({h['rotation']['beforeContact']:.0f}° of the 90° turn is done before the contact; shoulders {h['rotation']['shoulderBeforeContact']:.0f}°), knees flex
(crouch up to {h['com']['minHeightDrop']*100:.1f} cm), the centre of mass shifts {h['com']['prep']:.2f} m toward the support side.

## 3. Support / plant logic
The support foot steps to the simulation's stance point with its toe already turned into the turn (+{6:.0f}…+{25+0.12*180:.0f}° by family and angle) and plants
{-h['events']['supportPlant']:.2f} s before the contact (90°), {-t18['events']['supportPlant']:.2f} s (180°). After the contact it pivots on the ball of the foot (heel up), exact about the rig's MTP joint, then
lifts and steps through. Flat plants never move; pivots never move the ball of the foot (slip below).

## 4. Weight transfer
Each planted foot loads over {0.08:.2f} s after touchdown and unloads over {0.09:.2f} s before lift-off; the shares are continuous through flight phases (they pass from the foot that
unloaded to the next one to land). The weight is on the exit foot at {h['events']['weightTransfer']:+.2f} s (90°), {h135['events']['weightTransfer']:+.2f} s (135°), {t18['events']['weightTransfer']:+.2f} s (180°). The top-down
diagnostic and the 3D overlay fill the loaded foot by its share — it is always clear which leg bears the weight.

## 5. Hip / shoulder sequencing
Lead order head → shoulders → torso → hips → legs: the shoulders lead the hips before the contact (90°: shoulders {h['rotation']['shoulderBeforeContact']:.0f}° vs hips {h['rotation']['beforeContact']:.0f}°; 135°: {h135['rotation']['shoulderBeforeContact']:.0f}° vs
{h135['rotation']['beforeContact']:.0f}°), a counter-rotation at the contact on large turns, and the hips drive through after it. Maximum hip–shoulder separation {mn(lambda c: c['rotation']['maxHipShoulderSeparation']):.0f}–{mx(lambda c: c['rotation']['maxHipShoulderSeparation']):.0f}°;
fastest hip rotation {mn(lambda c: c['rotation']['maxHipRate']):.0f}–{mx(lambda c: c['rotation']['maxHipRate']):.0f}°/s, always just after the contact.

## 6. Root motion
The root is the simulation's own planned path (`A.path.rootAt`) plus its meeting correction, pulled 38 % toward the loaded foot so the pelvis rides over the stance. If a planted
leg would over-reach, the PELVIS moves (and lowers ≤ 5 cm) — never the foot; both feet's corrections are computed from the same state (no left / right order) and fade over the
first / last 60 ms of a swing (no pelvis jump at lift-off / touchdown).

## 7. Foot-lock / IK
Planted feet are IK targets that do not move; forefoot pivots are exact rotations about the MTP joint; run steps rise onto the forefoot before toe-off. Planted legs reach
≤ {mx(lambda c: c['maxLegExtension']):.3f} of leg length. Measured on the POSED skeleton only (`tools/rt11_contin.mjs`, the same code for both bodies): forefoot sliding on the turf ≤ {mm(mx(lambda c: c['continuity']['humanTurn']['forefootSkate']))} mm,
heel ≤ {mm(mx(lambda c: c['continuity']['humanTurn']['heelSkate']))} mm in the turn phase.

## 8. Contact sync
The contact foot reaches the CONTACT pose (the surface on the ball) at the authoritative contact tick: posed ankle error {mm(mx(lambda c: c['contactPoseError']))} mm in every case. It meets the ball 6 cm ahead
of the contact pose at −0.06 s, draws back with it (give 9 cm, through-stance 4.5 cm), follows through along the ball's actual new direction. The rejoin (the authoritative carry
launch) is an exact via-point of the swing: posed ankle vs the planned touch pose {mm(mn(lambda c: c['rejoin']['poseErr'] or 0))}–{mm(mx(lambda c: c['rejoin']['poseErr'] or 0))} mm (0 on every half-turn and through-stance turn; 6–7 mm
directional, 14 mm outside-of-foot where the leg is near full reach). The ball never follows the animation.

## 9. Directional motion
Subtle: hips {d['rotation']['beforeContact']:.0f}° before / {d['rotation']['afterContact']:.0f}° after the contact at 30°, shoulders {d['rotation']['shoulderBeforeContact']:.0f}°, separation {d['rotation']['maxHipShoulderSeparation']:.0f}°; the receiving foot opens on its forefoot,
the touch goes across the body, the first exit step lands at {d['events']['contactLand']:+.2f} s.

## 10. Half-turn motion (the primary reference: 90°)
Open before the contact ({h['rotation']['beforeContact']:.0f}° of 90°), back-foot receive ({h['foot']} {h['surface'].lower()}), the support foot plants toe-in at {h['events']['supportPlant']:+.2f} s, the hips are aligned with the exit at
{h['events']['aligned']:+.2f} s, the exit foot plants at {h['events']['contactLand']:+.2f} s, the weight is on it at {h['events']['weightTransfer']:+.2f} s, the ball is rejoined at {h['events']['rejoin']:+.2f} s. At 120–135° the pre-rotation grows
({C['h120']['rotation']['beforeContact']:.0f}°, {h135['rotation']['beforeContact']:.0f}°), the support toe turns further in and a counter-rotation appears.

## 11. Outside-of-foot motion
Only where the simulation deems it feasible (slow passes, the review uses 4 m/s): the body steps off the ball line to make room ({o['com']['prep']:.2f} m of COM shift — the largest
of all families), the contact foot turns in (toe down 6°, raised so the toe clears the turf by ≥ 8 mm), {o['rotation']['beforeContact']:.0f}° before / {o['rotation']['afterContact']:.0f}° after the contact.

## 12. Through-stance motion (150° / 180°)
A sequence of foot plants, not a root spin: the support foot plants ({t18['events']['supportPlant']:+.2f} s), the contact leg swings across (or behind) the standing leg on a routed
path, contact, the hips drive through ({t18['rotation']['maxHipRate']:.0f}°/s peak) while the support foot pivots on its forefoot (~{70+0.25*180:.0f}°), the contact foot lands as the step-through
({t18['events']['contactLand']:+.2f} s), the weight transfers ({t18['events']['weightTransfer']:+.2f} s), the support foot lifts and steps out. The ball vector (the touch) and the body vector differ by design.
180°: {t18['rotation']['beforeContact']:.0f}° before / {t18['rotation']['afterContact']:.0f}° after the contact.

## 13. 30 → 180° adaptations
| case | family | contact | turn | hips before / after | shoulders before | max separation | max hip rate | support plants | hips aligned | weight on exit foot | rejoin | plant slip mm | snap mm | v1 snap mm | contact reach: COM→ball m · leg ext. | COM prep m |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(rowc(k) for k in ORDER if k in C) + f"""

## 14. Left / right mirroring
{MIR['exact']}/{MIR['pairs']} pairs mirror exactly, joint for joint: a right-footed receiver's +θ turn vs a left-footed receiver's −θ turn, and a two-footed receiver's ±θ (15–180°,
6 / 12 / 18 m/s, BC 50 / 99, outside-of-foot at 6 m/s): the same family, the opposite foot, every posed joint mirrored within {MIR['maxJointDev']*1e6:.1f} µm (one float32 ulp of the rig's FK)
over {MIR['posesCompared']} poses. Two right-foot biases were found and removed on the way: the ready stance had the right foot 2 cm ahead for everyone (now the turn-side foot is
2 cm back), and the pelvis reach correction processed the right foot first (now order-free). The left-preferred receiver at +90 / +135° uses the same back foot (R) as the
right-footer — that is RECEIVE-TURN-1's selection (the half-turn's back foot); its preference shifts the LEFT turns.

## 15. BC 99 reference
All the cases above are BC 99, typical draw: the touch is almost exactly the ideal one, the body's path to the rejoin needs ≤ {mx(lambda c: c['touch']['extraAdj'] or 0):.2f} m of correction.

## 16. BC 90 / 80 / 70 / 50 adaptations
The technique, contact foot, contact timing and the rotation are the plan's at every rating; the touch is the same keyed draw scaled by curve B; the body follows the ACTUAL ball.

""" + "\n".join(bcrow(k, l) for k, l in [("h90", "90° half-turn, seed 12"), ("h135", "135° half-turn, seed 11"), ("t150", "150° through-stance, seed 30"), ("t180", "180° through-stance, seed 19")]) + f"""
On the large turns a short touch at BC 50–80 stays at the feet and is rejoined by the contact foot's own follow-through (+0.25…+0.35 s, before the hips align); at BC 90–99 the
exit stride rejoins it at ~+0.74 s.

## 17. Slip measurements
- Plant slip (the body's own plants, posed skeleton): **{mm(mx(lambda c: c['slip']['max']))} mm** (flat ankles and pivot MTP joints) in all {len(cs)} cases.
- Model-independent continuity (`rt11_contin.mjs`, posed joints only, the same for both bodies), turn phase: forefoot sliding on the turf ≤ {mm(mx(lambda c: c['continuity']['humanTurn']['forefootSkate']))} mm; foot snap
  (1-tick second difference) ≤ {mm(mx(lambda c: c['continuity']['humanTurn']['snap']))} mm, located at the ball touches (a strike). RECEIVE-TURN-1's body on the same episodes: snap {mm(mn(lambda c: c['continuity']['v1Turn']['snap']))}–{mm(mx(lambda c: c['continuity']['v1Turn']['snap']))} mm
  (its contact foot jumps ~0.16 s after the contact), forefoot sliding up to {mm(mx(lambda c: c['continuity']['v1Turn']['forefootSkate']))} mm (outside-of-foot).
- **Correction of an earlier claim.** Earlier in this milestone I reported "slip 0.0 mm" from a measure that only looked inside planted stretches. The posed-skeleton continuity
  measure then exposed real snaps at segment boundaries, all fixed: a pivot's end pose was not carried into the next segment (the foot jumped back up to 27 cm at lift-off);
  the rejoin-touch blend was already on at lift-off (23 cm jump); flight phases reset the weight share to 50/50 (pelvis jumped 10–17 cm); the reach correction switched off
  at lift-off; a 1 cm height step at the end of the give; the outside contact pose put the toe 7 mm into the turf.

## 18. Rotation before / after the contact
In the table (§13): directional 12–23° / 18–37°, half-turn 53–75° / 37–60°, outside-of-foot {o['rotation']['beforeContact']:.0f}° / {o['rotation']['afterContact']:.0f}°, through-stance 26–33° / 109–147°.

## 19. Frame strips
Every case: a strip at the body's own event times — preparation begins, support foot plants, contact leg begins swing, BALL CONTACT, maximum hip rotation, body aligned with
the exit, exit foot plants, weight transfer onto the exit foot, rejoins the ball (`clips/main/e_*.jpg`); BC 99 and BC 50 strips for 90 / 135 / 150 / 180° (`clips/bc/be_*.jpg`).

## 20. Slow-motion clips
Close 3/4, encoded at 0.25× (`clips/main/s_*.mp4`); RECEIVE-TURN-1's body on the same actions (`clips/main/v1_*.mp4`); the BC sets at 0.5× (`clips/bc/`); the technique × angle grid
at 0.5× (`clips/tech/`, 54 clips: every family at 30–180°, right and left).

## 21. Gameplay clips
The gameplay camera in real time for all 21 cases (`clips/main/g_*.mp4`); overhead 0.5× for 90 / 135 / 150 / 180° and the outside turn (`clips/main/o_*.mp4`). Every clip carries
the body top-down diagnostic (numbered plants, pivots, swing paths, COM trail, posed hip and shoulder lines, the loaded foot).

## 22. ON / OFF neutrality
{NEU['neutral']}/{NEU['cases']} cases identical with the human body posed every 2nd tick vs not at all (technique, foot, surface, contact tick, executed launch, every launch, follow-up,
continuation, ball path) — 13 angles × right / left × 6 / 12 / 18 m/s × BC 30 / 50 / 70 / 90 / 99 × 2 seeds.

## 23. Determinism
Body deterministic {NEU['bodyDeterministic']}/{NEU['cases']} ({NEU['posesChecked']:,} poses re-posed identically). Chrome = Node {CHR['simIdentical']}/{CHR['total']} simulation fingerprints and {CHR['bodyIdentical']}/{CHR['total']} posed-joint hashes
(1e-7 m) through the lab's own chain.

## 24. Protected-system regression
- Protected / frozen files {FROZ} (`evidence/frozen_sha256_start.txt` / `_end_check.txt`: DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL, tackle, RECEIVE-CONTROL-1.1, RECEIVE-KILL-1 / 1.1 / 1.2,
  and every committed RECEIVE-TURN-1 file).
- One process (`tools/rt11_regress.mjs`): DRIBBLE-V1 {REG['dribbleBeforeEqualsAfter']}/{REG['dribbleRuns']} before == after and {REG['dribbleEvidenceMatch']}/{REG['dribbleEvidenceCompared']} = its frozen evidence; RECEIVE-CONTROL-1.1
  {REG['receive11BeforeEqualsAfter']}/{REG['receive11Cases']}; RECEIVE-TURN-1 {REG['turnBeforeEqualsAfter']}/{REG['turnEpisodes']}; with {REG['turnsWithHumanBodyBetween']} turns and {REG['posesBetween']:,} human-body poses run between; D1 / RX / RXE unchanged: {REG['frozenParamsUnchanged']}.

## 25. Known limitations
- A procedural placeholder body on the real rig: the reference motion is authored as parameters per family and angle, not mocap.
- Shorts-mesh deformation where the legs cross (through-stance, ~+0.2 s) — a skinning artefact of the character mesh.
- The run-out after the rejoin is a generic stride: peak foot speed {mx(lambda c: c['continuity']['human']['maxFootSpeed']):.1f} m/s, IK reach kinks ≤ {mm(mx(lambda c: c['continuity']['human']['snap']))} mm near full extension; RUN-1 is the real locomotion.
- Rotation timing does not change with Ball Control (it is the technique's); only the touch and the body's path to the ball do.
- The rejoin at BC 50–80 on large turns is played by the contact foot's follow-through while the hips are still turning — plausible for a ball that stayed at the feet, worth a look.
- No Agility, no running receives, no physical body simulation (as instructed).

## 26. Review / lab links (local only — the character is a real player's model)
- Review: `http://127.0.0.1:8361/review_artifacts/receive_turn11/review/RECEIVE_TURN11_REVIEW.html`
- Lab: `http://127.0.0.1:8361/sandbox/visual/receive_turn11_lab.html` (`&body=v1` shows RECEIVE-TURN-1's body; `&top=ball` the football top view)
- Evidence: `review_artifacts/receive_turn11/evidence/` · tools: `sandbox/visual/receive_turn11/tools/`
"""
open(os.path.join(RA, "RECEIVE_TURN11_REPORT.md"), "w").write(md)
st = {"milestone": "RECEIVE-TURN-1.1", "status": "presented for review", "frozen": False, "integrated": False, "footballDecision": "RECEIVE-TURN-1, imported unchanged",
  "neutrality": f"{NEU['neutral']}/{NEU['cases']}", "bodyDeterministic": f"{NEU['bodyDeterministic']}/{NEU['cases']}", "chromeNode": {"simulation": f"{CHR['simIdentical']}/{CHR['total']}", "bodyPoses": f"{CHR['bodyIdentical']}/{CHR['total']}"},
  "mirror": f"{MIR['exact']}/{MIR['pairs']}", "plantSlipMaxMm": mx(lambda c: c['slip']['max']) * 1000, "turnSnapMaxMm": mx(lambda c: c['continuity']['humanTurn']['snap']) * 1000, "v1TurnSnapMm": [mn(lambda c: c['continuity']['v1Turn']['snap']) * 1000, mx(lambda c: c['continuity']['v1Turn']['snap']) * 1000],
  "contactPoseErrorMaxMm": mx(lambda c: c['contactPoseError']) * 1000, "protectedFiles": FROZ, "regression": {k: REG[k] for k in ["dribbleRuns", "dribbleBeforeEqualsAfter", "dribbleEvidenceMatch", "receive11BeforeEqualsAfter", "turnBeforeEqualsAfter", "frozenParamsUnchanged"]},
  "review": "review_artifacts/receive_turn11/review/RECEIVE_TURN11_REVIEW.html (local only)", "lab": "sandbox/visual/receive_turn11_lab.html", "next": "owner review; then QUEUE #1 (integrate RECEIVE-KILL + RECEIVE-TURN into RECEIVE-CONTROL)"}
json.dump(st, open(os.path.join(RA, "RECEIVE_TURN11_STATUS.json"), "w"), indent=1); print("report", len(md), "chars")
