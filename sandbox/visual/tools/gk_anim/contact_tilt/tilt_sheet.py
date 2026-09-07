#!/usr/bin/env python3
"""CONTACT-ORIENTATION TEST review sheet.

  python3 tilt_sheet.py <captures_root> <variants_dir> <out_dir>

Rows: (1) gameplay scale in the real goal (1x, same window for every variant), (2) 4x nearest-neighbour keeper crop, clean,
(3) the same 4x crop with the contact-geometry overlay, (4) numbers. Angles are measured on screen as elevation toward screen-left
(straight up = 90 deg, up-left diagonal = 45 deg, > 90 = leaning toward screen-right). Body axes come from the landmarks tracked through
the rotation and placed exactly where the runtime blitted the sprite (root, body scale, hand-led placement); the glove residual is given
both as the runtime's own readout and as an independent measurement of the white glove pixels in the screenshot.
"""
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont

CAP, VAR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
CASES = [("CURRENT_plain", "CURRENT (live, 50° CW)", 0), ("CW45_tilt5", "+5° tilt (45° CW)", 5), ("CW40_tilt10", "+10° tilt (40° CW)", 10), ("CW35_tilt15", "+15° tilt (35° CW)", 15)]
try: FONT = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 12); FONT_B = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 14)
except Exception: FONT = ImageFont.load_default(); FONT_B = FONT


def elev(dx, dy):
    """elevation toward screen-left in degrees: up = 90, up-left = 45, up-right = 135."""
    return math.degrees(math.atan2(-dy, -dx))


def load(case):
    d = os.path.join(CAP, case); j = json.load(open(os.path.join(d, "capture.json")))
    return j, Image.open(os.path.join(d, "full_CONTACT.png")).convert("RGB")


def sprite_in_screenshot(img, sprite_png, ps, origin, search=5):
    """independent placement measure: the variant sprite scaled to the runtime body scale (nearest) is matched against the screenshot
    around the runtime's blit origin; returns the best-matching origin, its offset from the runtime origin and the mean abs error."""
    sp = Image.open(sprite_png).convert("RGBA"); w, h = max(1, round(sp.width * ps)), max(1, round(sp.height * ps))
    sc = sp.resize((w, h), Image.NEAREST); spx = sc.load(); ipx = img.load(); best = None
    mask = [(x, y, spx[x, y][:3]) for y in range(h) for x in range(w) if spx[x, y][3] >= 128]
    for dy in range(-search, search + 1):
        for dx in range(-search, search + 1):
            ox, oy = int(round(origin[0])) + dx, int(round(origin[1])) + dy; err = 0; n = 0
            for x, y, c in mask:
                X, Y = ox + x, oy + y
                if 0 <= X < img.width and 0 <= Y < img.height:
                    q = ipx[X, Y]; err += abs(q[0] - c[0]) + abs(q[1] - c[1]) + abs(q[2] - c[2]); n += 1
            e = err / max(1, n)
            if best is None or e < best[2]: best = ((ox, oy), (dx, dy), e)
    return best


def main():
    data = []
    for case, label, tilt in CASES:
        j, full = load(case); c = j["contact"]; s = c["s"]; ps = c["ps"]
        sp = c["sp"]; hand = c["handSp"]; ball = c["ballSp"]; cpt = c["contactSp"] or hand
        dr = c["drawn"]; lead = dr["lead"]
        # landmarks tracked through the rotation (variants dir; the live asset carries none) placed at the runtime's blit origin and body scale
        lmj = json.load(open(os.path.join(VAR, "DIVE_NORTH_CW%d_landmarks.json" % c["pose"]["rotation"]))); bo = c["blitOrigin"]
        P = lambda k: (bo[0] + lmj[k][0] * ps, bo[1] + lmj[k][1] * ps)
        hip = P("hip"); head = P("head"); feet = P("feet"); gfar = P("glove_far")
        # reference directions at the keeper
        cm = j["commit"]; tgt = cm["target"]; ft = cm["feet"]
        # projected feet->target direction: use the trace's commit-tick screen projections (targetRel is in right_geometry; here recompute from the ball/hand geometry)
        # ground track commit->contact
        tr = j["trace"]; ct = j["contactTick"]; kt = j["committedTick"]
        track = (tr[ct]["sp"][0] - tr[kt]["sp"][0], tr[ct]["sp"][1] - tr[kt]["sp"][1])
        g = j["set"]["goal"]; gl = (g["postA"][0] - g["postB"][0], g["postA"][1] - g["postB"][1])          # postB (south) -> postA (north) = along the goal line, up-screen
        feet_sp = tr[kt]["sp"]                                                                               # the keeper's root at commit = take-off spot on screen
        target_dir = (hand[0] - feet_sp[0], hand[1] - feet_sp[1])                                            # take-off root -> contact hand = the projected dive line
        bm = sprite_in_screenshot(full, os.path.join(VAR, "DIVE_NORTH_CW%d.png" % c["pose"]["rotation"]), ps, c["blitOrigin"])
        lm_lead = c["pose"]["lead"]; sg = (bm[0][0] + lm_lead[0] * ps, bm[0][1] + lm_lead[1] * ps); n = bm[2]; match_off = bm[1]
        row = dict(case=case, label=label, tilt=tilt, sp=sp, hand=hand, ball=ball, contact=cpt, lead=lead, hip=hip, head=head, feet=feet, gfar=gfar, s=s, ps=ps,
                   torso_deg=elev(head[0] - hip[0], head[1] - hip[1]), body_deg=elev(head[0] - feet[0], head[1] - feet[1]), reach_deg=elev(lead[0] - feet[0], lead[1] - feet[1]),
                   target_deg=elev(*target_dir), track_deg=elev(*track), goal_deg=elev(*gl),
                   place=c["place"], art=c["art"], glove_shot=sg, glove_shot_n=n, match_off=match_off,
                   res_runtime_live=(c["place"]["res"] * s) if c["place"] and c["place"]["res"] is not None else None,
                   lead_vs_hand=math.hypot(lead[0] - hand[0], lead[1] - hand[1]),
                   shot_vs_hand=(math.hypot(sg[0] - hand[0], sg[1] - hand[1]) if sg else None),
                   pick=cm["pick"], contactTick=ct, commitTick=kt, rot=c["pose"]["rotation"], full=full, goal=g, track=track, target_dir=target_dir)
        data.append(row)
    base = data[0]
    # ── row 1: gameplay scale in the real goal (1x): window covering the goal mouth and the keeper, identical for every variant
    g = base["goal"]; xs = [g["postA"][0], g["postB"][0], g["barA"][0], g["barB"][0], base["sp"][0] - 60]; ys = [g["barA"][1], g["barB"][1], g["postA"][1], g["postB"][1], base["sp"][1] - 70, base["sp"][1] + 30]
    W1 = (int(min(xs)) - 20, int(min(ys)) - 20, int(max(xs)) + 30, int(max(ys)) + 20)
    # ── rows 2/3: 4x keeper crop: fixed window around the contact hand / root
    Z = 4; cx = (base["sp"][0] + base["hand"][0]) / 2; cy = (base["sp"][1] + base["hand"][1]) / 2
    W2 = (int(cx) - 62, int(cy) - 60, int(cx) + 62, int(cy) + 60)
    p1w, p1h = W1[2] - W1[0], W1[3] - W1[1]; p2w, p2h = (W2[2] - W2[0]) * Z, (W2[3] - W2[1]) * Z
    colw = max(p1w, p2w) + 16; margin = 10; rowh = [p1h + 30, p2h + 30, p2h + 30, 170]
    sheet = Image.new("RGB", (colw * 4 + margin * 2, sum(rowh) + 60), (22, 22, 22)); D = ImageDraw.Draw(sheet)
    D.text((margin, 8), "CONTACT-ORIENTATION TEST — approved NORTH far-dive contact sprite on the representative RIGHT save (same simulation, contact tick %d, root, ball, body scale 0.72, hand-led placement). Rigid NN rotation about the hip pivot, anchors re-measured, lead glove re-anchored to the identical contact point." % base["contactTick"], fill=(255, 255, 255), font=FONT_B)
    D.text((margin, 28), "Row 1 gameplay scale (1x) in the real goal · Row 2 4x crop · Row 3 4x crop + contact geometry (red + sim root · yellow ○ sim hand = contact point · white ○ ball · cyan hip→head torso axis · blue feet→head · magenta feet→glove · orange take-off root→contact hand (projected dive line) · grey goal line · green ground track commit→contact)", fill=(200, 200, 200), font=FONT)
    y0 = 64
    for i, r in enumerate(data):
        x0 = margin + i * colw
        # row 1
        p = r["full"].crop(W1); sheet.paste(p, (x0, y0 + 22)); D.text((x0, y0 + 4), r["label"], fill=(255, 230, 120), font=FONT_B)
        # row 2
        y1 = y0 + rowh[0]; crop = r["full"].crop(W2).resize((p2w, p2h), Image.NEAREST); sheet.paste(crop, (x0, y1 + 22)); D.text((x0, y1 + 4), "4x  " + r["label"], fill=(255, 230, 120), font=FONT)
        # row 3: overlay
        y2 = y1 + rowh[1]; ov = crop.copy(); od = ImageDraw.Draw(ov)
        T = lambda pt: ((pt[0] - W2[0]) * Z, (pt[1] - W2[1]) * Z)
        def line_dir(origin, ddir, length, col, width=2):
            n = math.hypot(*ddir) or 1; o = T(origin); od.line([o, (o[0] + ddir[0] / n * length * Z, o[1] + ddir[1] / n * length * Z)], fill=col, width=width)
        # goal line through the keeper's take-off spot? no — draw the actual goal line segment where it crosses the window
        gA, gB = r["goal"]["postA"], r["goal"]["postB"]; od.line([T(gA), T(gB)], fill=(150, 150, 150), width=2)
        take_off = (r["sp"][0] - r["track"][0], r["sp"][1] - r["track"][1])
        od.line([T(take_off), T(r["sp"])], fill=(90, 220, 90), width=3)             # ground track actually travelled commit→contact
        od.line([T(take_off), T(r["hand"])], fill=(255, 150, 40), width=2)          # projected dive line take-off root -> contact hand
        # body axes
        od.line([T(r["hip"]), T(r["head"])], fill=(0, 230, 255), width=3)
        od.line([T(r["feet"]), T(r["head"])], fill=(80, 120, 255), width=2)
        od.line([T(r["feet"]), T(r["lead"])], fill=(255, 80, 255), width=2)
        # markers
        def cross(pt, col, k=6):
            p = T(pt); od.line([(p[0] - k, p[1]), (p[0] + k, p[1])], fill=col, width=2); od.line([(p[0], p[1] - k), (p[0], p[1] + k)], fill=col, width=2)
        def circ(pt, col, k=7, w=2):
            p = T(pt); od.ellipse([p[0] - k, p[1] - k, p[0] + k, p[1] + k], outline=col, width=w)
        cross(r["sp"], (255, 60, 60)); circ(r["hand"], (255, 240, 0)); circ(r["ball"], (255, 255, 255), 9, 1)
        circ(r["hip"], (0, 230, 255), 5, 2); circ(r["feet"], (80, 120, 255), 5, 2); circ(r["head"], (0, 230, 255), 5, 2)
        cross(r["lead"], (255, 80, 255), 5)
        od.line([T(r["lead"]), T(r["hand"])], fill=(255, 255, 255), width=1)
        sheet.paste(ov, (x0, y2 + 22)); D.text((x0, y2 + 4), "4x + geometry  " + r["label"], fill=(255, 230, 120), font=FONT)
        # row 4: numbers
        y3 = y2 + rowh[2]; pl = r["place"]
        lines = [r["label"],
                 "%d° CW from source · tilt %+d°" % (r["rot"], r["tilt"]),
                 "torso hip→head   %5.1f°  Δdive %+5.1f  Δgoal %+5.1f" % (r["torso_deg"], r["torso_deg"] - r["target_deg"], r["torso_deg"] - r["goal_deg"]),
                 "body  feet→head  %5.1f°  Δdive %+5.1f" % (r["body_deg"], r["body_deg"] - r["target_deg"]),
                 "reach feet→glove %5.1f°  Δdive %+5.1f" % (r["reach_deg"], r["reach_deg"] - r["target_deg"]),
                 ("placement raw %.1f corr %.1f res %.1f spx (%d,%d) %s" % (pl["raw"], pl["corr"], pl["res"], pl["dx"], pl["dy"], "CAPPED" if pl["capped"] else "ok")) if pl else "placement: none",
                 "glove→sim hand %.2f live px · sprite match %s" % (r["lead_vs_hand"], str(r["match_off"])),
                 "hip Δ (%+.1f,%+.1f)  feet Δ (%+.1f,%+.1f) live px" % (r["hip"][0] - base["hip"][0], r["hip"][1] - base["hip"][1], r["feet"][0] - base["feet"][0], r["feet"][1] - base["feet"][1]),
                 "pick %s %.3f · contact tick %d" % (r["pick"]["id"], r["pick"]["score"], r["contactTick"])]
        for k, t in enumerate(lines): D.text((x0, y3 + 6 + k * 16), t, fill=(255, 255, 255) if k else (255, 230, 120), font=FONT)
    D.text((margin, 44), "angles = elevation toward screen-left (up = 90°) · refs: projected dive line (take-off root→contact hand) %.1f° · painted goal line %.1f° · ground track commit→contact %.1f° · body scale, root and placement unchanged" % (base["target_deg"], base["goal_deg"], base["track_deg"]), fill=(200, 200, 200), font=FONT)
    sheet.save(os.path.join(OUT, "CONTACT_ORIENTATION_TEST_SHEET.png"))
    # separate strips for the user: 1x in the goal, and 4x clean
    strip1 = Image.new("RGB", (p1w * 4 + 30, p1h + 30), (22, 22, 22)); d1 = ImageDraw.Draw(strip1)
    strip2 = Image.new("RGB", (p2w * 4 + 30, p2h + 30), (22, 22, 22)); d2 = ImageDraw.Draw(strip2)
    for i, r in enumerate(data):
        strip1.paste(r["full"].crop(W1), (6 + i * (p1w + 6), 24)); d1.text((6 + i * (p1w + 6), 6), r["label"], fill=(255, 230, 120), font=FONT)
        strip2.paste(r["full"].crop(W2).resize((p2w, p2h), Image.NEAREST), (6 + i * (p2w + 6), 24)); d2.text((6 + i * (p2w + 6), 6), r["label"], fill=(255, 230, 120), font=FONT)
    strip1.save(os.path.join(OUT, "A_gameplay_scale_in_goal_1x.png")); strip2.save(os.path.join(OUT, "B_4x_crop_clean.png"))
    strip1.resize((strip1.width * 2, strip1.height * 2), Image.NEAREST).save(os.path.join(OUT, "A2_gameplay_in_goal_2x_nearest.png"))
    # numbers json
    json.dump([{k: v for k, v in r.items() if k not in ("full",)} for r in data], open(os.path.join(OUT, "numbers.json"), "w"), indent=1, default=lambda o: None)
    for r in data:
        print("%-22s rot %2d torso %5.1f body %5.1f reach %5.1f | dive line %5.1f goal %5.1f track %5.1f | res runtime %s sprite px, anchor→hand %.2f live px, match offset %s | hip Δ (%+.1f,%+.1f) feet Δ (%+.1f,%+.1f) | pick %s %.3f tick %d" % (
            r["label"], r["rot"], r["torso_deg"], r["body_deg"], r["reach_deg"], r["target_deg"], r["goal_deg"], r["track_deg"], r["place"]["res"] if r["place"] else None, r["lead_vs_hand"], str(r["match_off"]),
            r["hip"][0] - base["hip"][0], r["hip"][1] - base["hip"][1], r["feet"][0] - base["feet"][0], r["feet"][1] - base["feet"][1], r["pick"]["id"], r["pick"]["score"], r["contactTick"]))


if __name__ == "__main__":
    main()
