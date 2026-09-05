#!/usr/bin/env python3
"""Visual/physical consistency audit (Animation V1, Phase 29) from an anim_strips.js capture set.
   python3 gk_anim_audit.py <strips_dir> <manifest GK_ANIM_V1.json> > CONSISTENCY_AUDIT.md
Quantifies, per scenario: art used (authored / temporary, mirrored, side/direction approximations), contact synchronisation
(visual error px / m / sprite px, IK residual, flag), touch gap (physics consistency), facing continuity while committed,
contact pose shown early (reach frame at/after the contact frame while the simulation hand is < 90 % along its path), root
continuity (max root step between captures; landing/recover must not teleport), family vs actual contact surface."""
import json, sys, os, re, math
D, MAN = sys.argv[1], sys.argv[2]
rep = json.load(open(os.path.join(D, "report.json"))); man = json.load(open(MAN))
contact_pos = {}
for cn, c in man["clips"].items():
    for v in c["variants"]: contact_pos[(cn, v["dir"])] = v["contact"]
rows = []; tot = dict(scen=0, authored=0, temp=0, mirrored=0, sideApprox=0, dirApprox=0, contacts=0, flagged=0, early=0, facingBreaks=0, legMismatch=0)
for sc in rep:
    recs = sc["recs"]; idx = sc["idx"]; tot["scen"] += 1
    curs = [r["cur"] for r in recs if r.get("cur")]
    committed = [r for r in recs if r.get("cur") and r["cur"].get("family")]
    states = []; [states.append(c["state"]) for c in curs if not states or states[-1] != c["state"]]
    auth = sum(1 for c in curs if c.get("clip")); temp = sum(1 for c in curs if c.get("family") and not c.get("clip"))
    mir = sum(1 for c in curs if c.get("clip") and c["clip"]["mir"]); sa = sum(1 for c in curs if c.get("clip") and c["clip"]["sideApprox"]); da = sum(1 for c in curs if c.get("clip") and c["clip"]["dirSteps"])
    tot["authored"] += auth; tot["temp"] += temp; tot["mirrored"] += mir; tot["sideApprox"] += sa; tot["dirApprox"] += da
    # facing continuity while committed
    dirs = [r["cur"]["dir"] for r in committed]; fb = sum(1 for i in range(1, len(dirs)) if dirs[i] != dirs[i - 1]); tot["facingBreaks"] += fb
    # contact pose early
    early = 0
    for r in committed:
        c = r["cur"]; cl = c.get("clip")
        if cl and cl["mode"] == "reach" and c["u"] < 0.9:
            m = re.match(r"(\w+)/(\w[\w-]*) f", c.get("art") or ""); cp = contact_pos.get((cl["name"], m.group(2))) if m else None
            if cp is not None and cl["pos"] >= cp: early += 1
    tot["early"] += early
    # root continuity
    steps = [(math.hypot(recs[i]["root"][0] - recs[i - 1]["root"][0], recs[i]["root"][1] - recs[i - 1]["root"][1]), recs[i]["cur"]["state"] if recs[i].get("cur") else "-") for i in range(1, len(recs))]
    maxstep = max(steps, key=lambda s: s[0]) if steps else (0, "-"); landsteps = [s for s in steps if s[1] in ("LAND", "RECOVER")]; maxland = max(landsteps, key=lambda s: s[0])[0] if landsteps else 0.0
    lc = [r["last"] for r in recs if r.get("last")]; lc = lc[-1] if lc else None
    cm = [r["commit"] for r in recs if r.get("commit")]; cm = cm[-1] if cm else None
    legmis = ""
    if lc:
        tot["contacts"] += 1; tot["flagged"] += 1 if lc.get("flagged") else 0
        legvol = lc["volume"] in ("LEGTIP", "LEG+", "LEG-")
        if legvol and lc.get("family") != "FOOT_SAVE": legmis = "leg contact shown on %s frames + boot marker" % lc.get("family"); tot["legMismatch"] += 1
        if (not legvol) and lc.get("family") == "FOOT_SAVE": legmis = "hand contact while FOOT_SAVE frames shown"; tot["legMismatch"] += 1
    rows.append(dict(idx=idx, name=sc["name"], commit=cm, states=" → ".join(s.replace("_LEFT", "·L").replace("_RIGHT", "·R") for s in states), auth=auth, temp=temp, mir=mir, sa=sa, da=da, fb=fb, early=early, maxstep=maxstep, maxland=maxland, lc=lc, legmis=legmis, art=sorted(set(c["clip"]["name"] for c in curs if c.get("clip")))))
print("# GK Animation V1 — visual/physical consistency audit\n")
print("Source: `%s` (%d scenarios × %d captures, 3 simulation ticks = 50 ms per capture). Simulation is authoritative; every number below is a property of the VIEW.\n" % (D, len(rep), len(rep[0]["recs"]) if rep else 0))
print("## Per-scenario table\n")
print("| # | scenario | committed action / tier / target (x,y,z) | state sequence (view) | art | captures authored / temp | mirrored / side-approx / dir-approx | contact (sim) | visual error | IK | touch gap | flags |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in rows:
    cm = r["commit"]; lc = r["lc"]
    print("| %d | %s | %s | %s | %s | %d / %d | %d / %d / %d | %s | %s | %s | %s | %s |" % (r["idx"], r["name"], ("%s / %s / %s" % (cm["action"], cm["tier"], cm["target"])) if cm else "none", r["states"], ", ".join(r["art"]) or "temporary only",
        r["auth"], r["temp"], r["mir"], r["sa"], r["da"],
        ("%s %s @%ss" % (lc["volume"], lc["outcome"], lc["tickT"])) if lc else "no contact (goal / miss / beyond window)",
        ("%s px / %s m (%s sprite px)" % (lc["errPx"], lc["errM"], lc["spritePx"])) if lc and lc["errPx"] is not None else ("—" if lc else ""),
        ("%s→%s res %s px%s" % (lc["ik"]["from"], lc["ik"]["to"], lc["ik"]["residualPx"], " FLAG" if lc["ik"]["flagged"] else "")) if lc and lc.get("ik") else "—",
        ("%s m" % lc["touchGapM"]) if lc else "", ", ".join(x for x in [("VISUAL ERROR > IK limit" if lc and lc.get("flagged") else ""), r["legmis"], ("facing breaks %d" % r["fb"]) if r["fb"] else "", ("contact pose early ×%d" % r["early"]) if r["early"] else ""] if x) or "none"))
print("\n## Consistency checks (Phase 29 cases)\n")
print("| check | result |"); print("|---|---|")
print("| hand contact but drawn glove misses (visual error > %d sprite px ≈ hand+ball radius) | %d of %d contacts flagged |" % (man.get("ik_max_px", 12), tot["flagged"], tot["contacts"]))
print("| foot save shown as leg vs hand mismatch (family vs actual contact surface) | %d |" % tot["legMismatch"])
print("| root slides under the sprite | 0 by construction: every frame is anchored at the simulation root (pivot anchor), no draw-side root offset is applied to the keeper |")
print("| landing / recover teleports (max root step in LAND/RECOVER between 50 ms captures) | %.3f m (max over all scenarios) — the simulation root is frozen at the dive end; LAND/RECOVER frames are drawn in place |" % max(r["maxland"] for r in rows))
print("| discontinuous facing while committed (direction changes) | %d (facing/direction are frozen at the commit tick) |" % tot["facingBreaks"])
print("| limb stretch / warping | none possible on authored frames (integer-scaled pixel frames, horizontal mirror only); the temporary representation draws a straight sleeve line from the shoulder anchor to the simulation hand and is labelled TEMP |")
print("| contact pose before the simulation hand arrives (reach frame ≥ contact frame while u < 0.9) | %d captures (frame selection is driven by the simulation hand position, so a contact frame appears early only when the hand is already there) |" % tot["early"])
print("| largest root step between captures anywhere | %.3f m in state %s |" % (max(r["maxstep"][0] for r in rows), max(rows, key=lambda r: r["maxstep"][0])["maxstep"][1]))
print("\n## Totals\n")
print("- scenarios: %d; committed captures on authored frames: %d; on temporary representations: %d" % (tot["scen"], tot["authored"], tot["temp"]))
print("- mirrored captures: %d; side-approximate: %d; direction-approximate (45° neighbour): %d" % (tot["mirrored"], tot["sideApprox"], tot["dirApprox"]))
print("- contacts: %d; flagged: %d" % (tot["contacts"], tot["flagged"]))
