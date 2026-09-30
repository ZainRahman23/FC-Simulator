# contact sheets for the V1.1 anatomy report: pairs of harness captures (cropped to the 3D view + status), captioned
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
IN, OUT = sys.argv[1], sys.argv[2]; shots = {s["name"]: s for s in json.load(open(sys.argv[3]))}
TOP = {"A": 146, "C": 186, "C2": 224}
try: FONT = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 17); FB = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 22)
except Exception: FONT = FB = ImageFont.load_default()
def tile(name, w=760):
    im = Image.open(os.path.join(IN, name + ".png")).convert("RGB"); t = TOP[shots[name]["suite"]]; im = im.crop((0, t, 1230, 818))
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
def sheet(rows, title, path):
    tiles = [[(tile(n), cap) for n, cap in r] for r in rows]; W = 760; pad = 14; capH = 30
    Hs = [max(t.height for t, _ in r) for r in tiles]; cols = max(len(r) for r in tiles)
    S = Image.new("RGB", (pad + cols * (W + pad), 60 + sum(h + capH + pad for h in Hs)), (18, 20, 23)); d = ImageDraw.Draw(S); d.text((pad, 16), title, fill=(240, 192, 96), font=FB)
    y = 60
    for r, h in zip(tiles, Hs):
        for i, (t, cap) in enumerate(r):
            x = pad + i * (W + pad); d.text((x, y + 4), cap, fill=(230, 228, 223), font=FONT); S.paste(t, (x, y + capH))
        y += h + capH + pad
    S.save(path, quality=88); print(path, S.size)
sheet([[("01_anat_front_V1", "V1 — hip centres 32.3 cm (red), shoulders 8 cm above the cap"), ("01_anat_front_V11", "V1.1 — hip centres 18.4 cm (green) inside a 41 cm visible pelvis")],
       [("03_skeletons_V1", "V1 — physics skeleton (blue) = rendered rig skeleton (orange)"), ("03_skeletons_V11", "V1.1 — physics hips/knees/shoulders moved; rig (mesh) unchanged")],
       [("02_anat_colliders_V1", "V1 — colliders + segment COMs"), ("02_anat_colliders_V11", "V1.1 — colliders unchanged except upper arm (+ deltoid sphere)")],
       [("04_limits_front_V1", "V1 — joint-limit cones, front"), ("04_limits_front_V11", "V1.1 — hip ab/ad about the 4.3° splayed bind, ankle inv/ev about the bind")],
       [("05_limits_side_V1", "V1 — side: hip ext 30°, ankle DF 20°"), ("05_limits_side_V11", "V1.1 — side: hip ext 20°, ankle DF 30°")],
       [("06_quiet_live_V1", "V1 — quiet stance QS20, live joint angles"), ("06_quiet_live_V11", "V1.1 — quiet stance QS20 (splayed legs: hip Z 24 N·m)")]],
      "Physical Character V1.1 — anatomy (V1 left · V1.1 right)", os.path.join(OUT, "contact_sheet_anatomy.jpg"))
sheet([[("10_single_leg_V1", "V1 single leg (B_hold_R t 12 s): lean 13.3°, hip abd 98 N·m"), ("11_single_leg_V11_R_D1", "V1.1 + R1·R2 + D1: no lean, hip abd 69 N·m (49 %)")],
       [("12_single_leg_V1_side", "V1 single leg, ¾ view"), ("13_single_leg_V11_R_D1_side", "V1.1 + R1·R2 + D1 single leg, ¾ view")],
       [("20_transfer_V1_t2.0", "V1 transfer (plan, t 2.0): ξ overshoots onto the L sole → R unloads"), ("21_transfer_V11_raw_t2.4", "V1.1 raw (plan, t 2.4): ξ stalls 1 cm short, R keeps 85 N")],
       [("22_transfer_V11_R_t2.4", "V1.1 + R1·R2 (plan, t 2.4): still 57 N on R — REJECTED"), ("24_descent_V11_R_D1", "V1.1 + R1·R2 + D1: descent reaches the turf (R2)")],
       [("40_Dfwd_V1_td", "V1 D_fwd_R touchdown (feasible 27.1 cm)"), ("42_Dfwd_V11_D1_lost", "V1.1 + D1 D_fwd_R: 28.6 cm accepted by the larger ROM → lost in ACCEPT")]],
      "Physical Character V1.1 — single-leg stance, weight transfer, placement", os.path.join(OUT, "contact_sheet_behaviour.jpg"))
sheet([[("31_dropA_limit_t_V1", "Gate A drop A, V1 at the same t"), ("30_dropA_limit_V11", "drop A, V1.1: elbow_R soft stop overshot 16.7°")],
       [("36_dropA_energy_V1", "drop A, V1 at t 0.55 s (knee stop: +0.5 J)"), ("35_dropA_energy_V11", "drop A, V1.1 t 0.55 s: knee soft-stop impact, +12.8 J in one step")],
       [("33_dropE_start_V1", "drop E start, V1"), ("32_dropE_start_V11", "drop E start, V1.1: authored arm pose puts the forearm 112 mm into the head")],
       [("38_dropB_limit_V1", "drop B (side-first), V1 at t 1.00 s"), ("37_dropB_limit_V11", "drop B, V1.1: shoulder_R 16.4° past its HARD limit (V1 5.6°)")],
       [("34_dropC_worst_V11", "drop C worst limit, V1.1 (elbow_L soft 10.8°)"), ("47_Jrepeat_V11_R_fell", "C2 J_repeat, V1.1 + R1·R2: 3 rejected transfers, then fell in ACCEPT")],
       [("43_Gfar_V11_D1_lost", "C2 G_far, V1.1 + D1: feasible 34.9 cm (V1 27.1) → lost in ACCEPT"), ("44_Iblock_V11_D1", "C2 I_block, V1.1 + D1: blocked and held (as V1)")]],
      "Physical Character V1.1 — regressions (not hidden)", os.path.join(OUT, "contact_sheet_regressions.jpg"))
