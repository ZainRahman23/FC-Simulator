"""HTML section for the arm-transition pass (imported by build_lat_html.py)."""
import json, os, html, math
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
esc = html.escape
def layers(path):
    try: return {str(r["idx"]): r for r in json.load(open(path))}
    except Exception: return {}
ORDER = ["LOAD", "PLANT", "PUSH_MID", "PUSH_END", "TOE_OFF", "EARLY_FLIGHT", "MID_FLIGHT", "FULL_EXTENSION", "FOLLOW", "DESCENT", "IMPACT", "ABSORB", "SETTLE", "BRACE", "PUSH_UP"]
def phase_min(rec):
    L, R, RL = {}, {}, {}
    for r in rec["rows"]:
        sc = r.get("selfCol"); p = r.get("sub") or r.get("phase")
        if sc: L[p] = min(L.get(p, 9), sc["L"]["c"]); R[p] = min(R.get(p, 9), sc["R"]["c"]); RL[p] = min(RL.get(p, 9), sc["RL"]["c"])
    return L, R, RL
def cell(v, flag=-0.02):
    if v is None: return "<td>—</td>"
    cls = "bad" if v < flag else ("warn" if v < 0 else "ok"); return f'<td class={cls}>{v * 100:+.1f}</td>'
def table(rows):
    h = "<table><tr><th>case</th><th>arm</th>" + "".join(f"<th>{p[:8]}</th>" for p in ORDER) + "</tr>"
    for lab, rec, trail in rows:
        if not rec: continue
        L, R, RL = phase_min(rec)
        for nm, dct in (("L" + (" (trailing)" if trail == "L" else " (reach)"), L), ("R" + (" (trailing)" if trail == "R" else " (reach)"), R), ("R↔L arms", RL)):
            h += f"<tr><td>{esc(lab)}</td><td>{nm}</td>" + "".join(cell(dct.get(p)) for p in ORDER) + "</tr>"
    return h + "</table>"
def build(made):
    LB = layers(S + "/layers_armF_broken.json"); LF = layers(S + "/layers_armF_courtois.json"); LT = layers(S + "/layers_armF_test.json"); LA = layers(S + "/layers_armF_adhoc.json"); LP = layers(S + "/layers_lat_courtois.json")
    def media(tag, key, w=None, cap=""):
        p = made.get(tag, {}).get(key)
        return f'<figure><img src="{p}"{" style=\"max-width:%dpx\"" % w if w else ""}><figcaption>{esc(cap)}</figcaption></figure>' if p else f"<p class=note>[{tag} {key}: not captured]</p>"
    c2 = made.get("2", {})
    ident = f"<p>Fixture 2 (control, below the regime): <b class={'ok' if c2.get('diff') == [] else 'bad'}>{c2.get('identical', 0)} of {c2.get('n', 0)} close-rig frames pixel-identical</b> to the previous pass{(' — differing ticks ' + str(c2.get('diff'))) if c2.get('diff') else ''}.</p>" if c2 else ""
    return f"""
<h2 id=arm>9. Second pass — the arm-through-abdomen collapse at load / take-off (fixtures 13, 15)</h2>
<div class=verdict><b>Diagnosis.</b> Measured per layer with approximate self-collision volumes (torso: abdomen / chest capsules, neck capsule, head sphere; upper arms from 35 % down the bone, forearms, hands — <code>gkSelfCollision</code> in gk_graph.js, mirrored offline by <code>verification/arm_gate.py</code>; the JS and Python gates agree to the millimetre). The penetration is in the <b>authored layer itself</b>: identical in the raw, redirected, planned and final layers, on both rigs and for both dive sides. The V6 keys swing the TRAILING (top) arm from abducted (upperArm z −30° at PLANT) to across the body (z +14 / +44 / +76 at PUSH_END / TOE_OFF / EARLY_FLIGHT, on to +140 at the reach) with an x flexion of −60°. The rig's euler order is Ry·Rx·Rz: a vector that is already lateral after Rz is invariant under Rx, so the authored flexion cannot lift a crossing arm in front of the chest — the upper arm sweeps through the chest from PUSH_MID (−2.6 cm) to TOE_OFF (−11.4 cm against the refined torso model, −18.7 cm against a plain chest capsule) and EARLY_FLIGHT, and the elbow then passes over the neck / behind the head to the authored reach pose (trailing arm up-across-behind the head). Not retargeting (the shared test rig shows the same numbers), not the shoulder / clavicle keys (0), not the bend plane, not the reach IK, not the SET → LOAD interpolation (LOAD / PLANT are +6 to +10 cm clear). The same authored path is in the approved fixture 2 / V6 42 dives (−11 cm at their toe-off) — those are below the regime and untouched.
<br><b>Correction (far-lateral regime only, trailing arm only, ~12 lines)</b>: <code>gkLateralArmClear</code> — a bone yaw (Ry, the horizontal adduction the rig applies last) set from the authored frontal-plane adduction z alone: smooth rise 25° → 85° of z to 55°, easing to 50° above z 100°; the authored adduction is soft-capped at z 85° (slope 0.2) so the trailing hand stays on ITS side of the reach hand (a side-by-side two-hand reach, never crossed over the reach arm). Elevation / elbow bend / hand keys are untouched, so the authored shoulder–elbow character is kept; the arm simply crosses in front of the chest and reaches up-forward beside the head instead of through the chest and behind the head. Phase-aware (a pure function of the authored key value: zero at READY / LOAD, zero again as the keys close), bounded (≤ 55°), deterministic, mirrored by the pose mirror for left dives, applied in the pre branch and the landing branch. Plus one pole hint for the REACH arm's glove IK in the regime (elbow folds forward and toward the pitch while the simulation hand target is still inside the reach) — the reach forearm no longer sweeps through the trailing forearm as the hands converge. Nothing else: no torso / root change, no assist, no reach change, no stretching; the far-lateral body correction, the zero torso assist, the landing tempo and the IK release by IMPACT are exactly as committed (fixture 2 and V6 42 byte-identical, below).</div>
<h3>Arm-to-torso clearance by phase [cm] — CURRENT (committed far-lateral pass, arm uncorrected) vs AFTER, both rigs, both sides</h3>
<p class=note>Minimum over the phase of the arm segment (upper arm / forearm / hand) to torso (abdomen / chest / neck / head) clearance = distance − radii; negative = penetration; <span class=bad>red</span> beyond the −2 cm model tolerance, <span class=warn>amber</span> −2..0. "R↔L arms" = forearm / hand of one arm vs the other. The recovery stages (SETTLE → PUSH_UP) show the pre-existing brace-arm placement of the authored V6 landing keys and the brace IK bend plane — present on every dive including fixtures 2 and 42, outside this pass (a brace-IK pole hint was tried and made the bottom arm worse, so it was not kept); reported, not hidden.</p>
{table([("15 CURRENT (Courtois)", LB.get("15"), "L"), ("15 AFTER (Courtois)", LF.get("15"), "L"), ("15 AFTER (test rig)", LT.get("15"), "L"), ("13 CURRENT (Courtois)", LB.get("13"), "L"), ("13 AFTER (Courtois)", LF.get("13"), "L"), ("13 AFTER (test rig)", LT.get("13"), "L"), ("fixture-15 mirror LEFT AFTER (Courtois)", LA.get("adhoc6"), "R"), ("2 control (unchanged)", LF.get("2"), "L")])}
<h3>Fixture 15 — BEFORE previous fix → CURRENT (body fixed, arm broken) → AFTER arm correction</h3>
{media("15", "3way")}
<div class=row>{media("15", "gif_before", 440, "BEFORE — normal speed")}{media("15", "gif_current", 440, "CURRENT — normal speed")}{media("15", "gif_after", 440, "AFTER — normal speed")}</div>
<div class=row>{media("15", "gif_before_slow", 440, "BEFORE — ¼ speed")}{media("15", "gif_current_slow", 440, "CURRENT — ¼ speed")}{media("15", "gif_after_slow", 440, "AFTER — ¼ speed")}</div>
{media("15", "front3way")}
<div class=row>{media("15", "front_before", 440, "front three-quarter — BEFORE ¼ speed")}{media("15", "front_current", 440, "front — CURRENT ¼ speed")}{media("15", "front_after", 440, "front — AFTER ¼ speed")}</div>
{media("15", "overlay")}
<div class=row>{media("15", "overlay_gif_current", 440, "collision volumes — CURRENT ¼ speed (red = penetration)")}{media("15", "overlay_gif", 440, "collision volumes — AFTER ¼ speed")}{media("15", "game", 500, "AFTER — gameplay camera 1:1")}</div>
{media("15", "test")}
<h3>Fixture 13 — BEFORE → CURRENT → AFTER</h3>
{media("13", "3way")}
<div class=row>{media("13", "gif_before", 440, "BEFORE — normal speed")}{media("13", "gif_current", 440, "CURRENT — normal speed")}{media("13", "gif_after", 440, "AFTER — normal speed")}</div>
<div class=row>{media("13", "gif_before_slow", 440, "BEFORE — ¼ speed")}{media("13", "gif_current_slow", 440, "CURRENT — ¼ speed")}{media("13", "gif_after_slow", 440, "AFTER — ¼ speed")}</div>
{media("13", "front3way")}{media("13", "overlay")}
<div class=row>{media("13", "overlay_gif", 440, "collision volumes — AFTER ¼ speed")}{media("13", "game", 500, "AFTER — gameplay camera 1:1")}</div>
{media("13", "test")}
<h3>Left dive (mirror) and the control</h3>
{media("a1_6", "strip")}{media("a1_6", "overlay")}<div class=row>{media("a1_6", "gif", 440, "mirror LEFT — ¼ speed")}</div>
{ident}{media("2", "sheet")}{media("2", "overlay")}
"""

def build2(made2):
    LG = layers(S + "/layers_armG_courtois.json"); LGT = layers(S + "/layers_armG_test.json"); LGA = layers(S + "/layers_armG_adhoc.json"); LF = layers(S + "/layers_armF_courtois.json"); LI = layers(S + "/layers_brace_courtois.json")
    def media(tag, key, w=None, cap=""):
        p = made2.get(tag, {}).get(key)
        return f'<figure><img src="{p}"{" style=\"max-width:%dpx\"" % w if w else ""}><figcaption>{esc(cap)}</figcaption></figure>' if p else f"<p class=note>[{tag} {key}: not captured]</p>"
    c2 = made2.get("2", {})
    return f"""
<h2 id=arm2>11. Third pass — general arm self-collision / IK quality (recovery brace, low dives, collapses, catches)</h2>
<div class=verdict><b>What was found, per residual.</b>
<ol><li><b>Brace arm through the chest in the recovery (−10 … −19 cm, every dive)</b> — not the bend plane: the top hand's ground brace target was placed from the ROOT frame (0.18·hs toward the dive side, 0.36·hs "forward") which, for a body lying on its side, lands UNDER the body at the chest plane; the arm reached it through the ribcage (residual 5 cm). Fixed for the arm-clear regimes: the top-hand target is now a ground point in front of the CHEST NORMAL (0.38·hs) and toward the head along the body axis (0.30·hs); the bend plane is untouched. Fixture 15 SETTLE / BRACE / PUSH_UP: −10.3 / −18.9 / −16.6 → +4.6 / +6.1 / +2.0 cm; fixture 13, the low dive (4) and the collapse (34 / 51) likewise (table). The approved high-dive FAR_DIVE (fixtures 2 / 42) keeps its authored brace — frozen controls, reported.</li>
<li><b>Low-dive / collapse authored arms (−15 … −18 cm pre-branch on the survey)</b> — the LOW_DIVE shares the V6 pre keys (same trailing-arm sweep): the trailing-arm yaw rule now applies to LOW_DIVE and LOW_COLLAPSE too (fixture 4 TOE_OFF −17.6 → +1.1; 51 GROUND −5.7 → +5.5). The low-dive tail (FULL_EXTENSION_LOW / ABSORB) keeps −4.7 / −7.8 cm of trailing forearm at the head model: its tail keys fold the arm over the head at the reach — authored, reported.</li>
<li><b>Two-forearm overlap at the two-hand convergence (fixture 15, −4.2 cm for ~3 ticks)</b> — measured to be the REACH forearm crossing over the trailing one (hands 17 cm apart, elbows on opposite sides); a hand-separation feedback on the trailing yaw was tried and had no effect (removed). Reported.</li>
<li><b>"Reach arm through the head" on left dives (39, 14, the mirror)</b> — two different things: (a) on cross-body reaches the straight reach arm passes ~10 cm from the head centre (target-line geometry, −1 … −9 cm against the 10 cm head sphere, present identically before this work); (b) fixtures 39 and the fixture-15 mirror are dive CATCHES at this band: the simulation keeps the HELD ball at the catch point (1.26 m) while the body lands, and the two-hand hold blends both hands onto the authored hand midpoint of the lying keys — above the head — so the arms wrap over the head through the landing and recovery. A chest-hold cradle was tried (both hands onto a ball at the chest of the lying body) and made it worse (both upper arms through the chest with the world-frame elbow poles); reverted. A dive-catch cradle for a lying body is a separate design — <b>known limitation, reported</b>.</li></ol>
Symmetry check: the mirrored poses are exact (arm eulers of a right dive and its left mirror agree to 0.1°); every left / right difference above traces to the hold path or the target-line geometry, not to the resolver.</div>
<h3>Clearance by phase [cm] — final code (recovery included)</h3>
{table([("15 AFTER (Courtois)", LG.get("15"), "L"), ("13 AFTER (Courtois)", LG.get("13"), "L"), ("14 AFTER (Courtois, left dive)", LG.get("14"), "R"), ("4 far post — LOW DIVE (Courtois)", LG.get("4"), "R"), ("51 NW-facing low dive — COLLAPSE (Courtois)", LG.get("51"), "R"), ("34 controlled parry — COLLAPSE (Courtois)", LG.get("34"), "L"), ("39 fingertip / CATCH at this band (Courtois)", LG.get("39"), "R"), ("fixture-15 mirror LEFT (CATCH at this band)", LGA.get("adhoc6"), "R"), ("15 AFTER (test rig)", LGT.get("15"), "L"), ("4 LOW DIVE (test rig)", LGT.get("4"), "R"), ("34 COLLAPSE (test rig)", LGT.get("34"), "L"), ("42 V6 control (test rig, unchanged)", LGT.get("42"), "L"), ("2 control (Courtois, unchanged)", LG.get("2"), "L")])}
{media("15", "rec")}{media("15", "ov")}<div class=row>{media("15", "gif", 440, "fixture 15 recovery AFTER — ¼ speed")}</div>{media("15", "test")}
{media("4", "sheet")}{media("4", "ov")}<div class=row>{media("4", "gif_before", 440, "fixture 4 low dive BEFORE — ¼ speed")}{media("4", "gif", 440, "fixture 4 low dive AFTER — ¼ speed")}</div>
{media("34", "sheet")}
{media("39", "sheet")}<div class=row>{media("39", "gif", 440, "fixture 39 — dive catch, the held-ball hold on a lying body (known limitation) ¼ speed")}</div>
<p>Fixture 2 (control): <b class={'ok' if c2.get('identical') == c2.get('n') and c2 else 'bad'}>{c2.get('identical', '?')} of {c2.get('n', '?')} close-rig frames pixel-identical</b> to the previous pass.</p>
"""
