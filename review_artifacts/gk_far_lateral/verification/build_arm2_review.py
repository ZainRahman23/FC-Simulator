#!/usr/bin/env python3
"""Arm pass 2 media: recovery brace fix (15), low dive (4) and collapse (34) before/after, the catch-hold limitation (39)."""
import json, os, glob, re, sys
sys.path.insert(0, "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad")
src = open("/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad/build_arm_review.py").read(); exec(src[:src.index("made = {}")])   # helpers only (the generation block is not re-run)
UB = (30, 20, 190, 180)
LG = layers(S + "/layers_armG_courtois.json"); made = {}
def kt(rec, phases):
    ks = {}; last = None; lastS = None
    for r in rec["rows"]:
        ph = r.get("sub") or r.get("phase")
        if r.get("mode") in ("pre", "collapse") and ph != last: ks.setdefault(ph, r["k"]); last = ph
        st = r.get("landing"); stg = st if isinstance(st, str) else (st.get("L", {}).get("stage") if isinstance(st, dict) else None)
        if stg and stg != lastS: ks.setdefault(stg, r["k"]); lastS = stg
    sel = sorted((ks[n], n) for n in phases if n in ks); return [t for t, _ in sel], {t: n for t, n in sel}
REC = ["FULL_EXTENSION", "DESCENT", "IMPACT", "ABSORB", "SETTLE", "BRACE", "PUSH_UP", "HALF_KNEEL", "CROUCH"]
# 15 recovery: before (87ccbfe capture lt_15_arm_cl) vs after (lt_15_arm2_cl)
t15, l15 = kt(LG["15"], REC); t15 = sorted(set(t15 + [t + 6 for t in t15 if l15.get(t) in ("SETTLE", "BRACE", "PUSH_UP")]))
rows = [("BEFORE (87ccbfe)\nbrace hand under\nthe body", frames(D("15_arm_cl"))), ("AFTER\nbrace in front of\nthe chest", frames(D("15_arm2_cl")))]; rows = [r for r in rows if r[1]]
if rows: sheet(f"{M}/15_recovery_3way.png", rows, t15, "fixture 15 — landing / recovery: the top-hand brace target moved from under the lying body to in front of the chest (close rig)", 2, l15); made["15"] = {"rec": "media/15_recovery_3way.png"}
if have(D("15_arm2_ov")): sheet(f"{M}/15_recovery_overlay.png", [("AFTER overlay", frames(D("15_arm2_ov")))], t15, "fixture 15 — recovery self-collision volumes AFTER", 2, l15); made["15"]["ov"] = "media/15_recovery_overlay.png"; gif(f"{M}/15_recovery_x4.gif", frames(D("15_arm2_cl")), 15, "15 recovery ¼", 2, t15[0] - 5, t15[-1] + 10); made["15"]["gif"] = "media/15_recovery_x4.gif"
# 4 low dive
if LG.get("4"):
    t4, l4 = kt(LG["4"], ["LOAD", "PLANT", "PUSH_MID", "PUSH_END", "TOE_OFF", "EARLY_FLIGHT_LOW", "MID_FLIGHT_LOW", "FULL_EXTENSION_LOW", "ABSORB", "SETTLE", "BRACE", "PUSH_UP"])
    rows = [("BEFORE (87ccbfe)", frames(D("4_armbroken_cl"))), ("AFTER", frames(D("4_arm2_cl")))]; rows = [r for r in rows if r[1]]
    if rows: sheet(f"{M}/4_low_3way.png", rows, t4, "fixture 4 far post — LOW DIVE: trailing-arm clearance + brace target extended to the low dives (close rig, upper body ×2)", 2, l4, UB); made["4"] = {"sheet": "media/4_low_3way.png"}
    if have(D("4_arm2_ov")): sheet(f"{M}/4_low_overlay.png", [("AFTER overlay", frames(D("4_arm2_ov")))], t4, "fixture 4 — self-collision volumes AFTER", 2, l4); made["4"]["ov"] = "media/4_low_overlay.png"
    if have(D("4_arm2_cl")): gif(f"{M}/4_low_x4.gif", frames(D("4_arm2_cl")), 15, "4 low dive ¼", 2, t4[0] - 5, t4[-1] + 10); made["4"]["gif"] = "media/4_low_x4.gif"; gif(f"{M}/4_low_before_x4.gif", frames(D("4_armbroken_cl")), 15, "4 BEFORE ¼", 2, t4[0] - 5, t4[-1] + 10); made["4"]["gif_before"] = "media/4_low_before_x4.gif"
# 34 collapse
if LG.get("34"):
    t34, l34 = kt(LG["34"], ["LOAD", "DROP", "KNEE_DOWN", "GROUND", "SETTLE", "BRACE", "PUSH_UP", "HALF_KNEEL"])
    rows = [("BEFORE (87ccbfe)", frames(D("34_armbroken_cl"))), ("AFTER", frames(D("34_arm2_cl")))]; rows = [r for r in rows if r[1]]
    if rows: sheet(f"{M}/34_collapse_3way.png", rows, t34, "fixture 34 — LOW COLLAPSE (controlled parry): brace target in front of the chest; the trailing-arm yaw rule is inactive here (its keys stay below the ramp)", 2, l34); made["34"] = {"sheet": "media/34_collapse_3way.png"}
# 39 catch hold limitation
if have(D("39_arm2_cl")) and LG.get("39"):
    t39, l39 = kt(LG["39"], REC)
    if len(t39) < 4: k0 = t39[0] if t39 else 34; t39 = [k0, k0 + 4, k0 + 10, k0 + 18, k0 + 28, k0 + 45, k0 + 70, k0 + 100]; l39 = {k0: "FULL_EXTENSION"}
    sheet(f"{M}/39_catch_hold.png", [("dive CATCH, held", frames(D("39_arm2_cl")))], t39, "fixture 39 (a CATCH at this band) — known limitation: the simulation keeps the held ball at the catch point (1.26 m) while the body lands; the two-hand hold blends onto the authored hand midpoint of the lying keys, above the head", 2, l39); made["39"] = {"sheet": "media/39_catch_hold.png"}; gif(f"{M}/39_catch_x4.gif", frames(D("39_arm2_cl")), 15, "39 catch ¼", 2, t39[0] - 20, t39[-1] + 10); made["39"]["gif"] = "media/39_catch_x4.gif"
# fixture 2 identity
if have(D("2_arm2_cl")) and have(D("2_cl")):
    from PIL import Image
    a, b = dict(frames(D("2_arm2_cl"))), dict(frames(D("2_cl"))); same = sum(1 for t in a if t in b and list(Image.open(a[t]).convert("RGB").getdata()) == list(Image.open(b[t]).convert("RGB").getdata())); made["2"] = {"identical": same, "n": len(a)}
if have(D("15_TEST_arm2_cl")): sheet(f"{M}/15_TEST_recovery.png", [("test rig AFTER", frames(D("15_TEST_arm2_cl")))], t15, "fixture 15 — shared test rig recovery AFTER", 2, l15); made["15"]["test"] = "media/15_TEST_recovery.png"
json.dump(made, open(S + "/arm2_made.json", "w"), indent=1); print(made)
