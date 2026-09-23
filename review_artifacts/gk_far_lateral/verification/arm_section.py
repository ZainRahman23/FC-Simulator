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
