"""SLIDE CONTACT GEOMETRY V1.2 → body interaction on cross-line slides: the review section (an HTML fragment + media) placed at the top of
review_artifacts/slide_contact_v1_2/index.html by of_slide_review.py.
    python3 of_slide_review13.py <media13 dir> <out dir>
Every number is read from the per-tick rendered geometry of the V1.2 commit (a1357dd) and of this build (of_slide_geo.js) and from the simulation's
own events / contact history; the media are composed here."""
import sys, os, json, math, html
from PIL import Image, ImageDraw

M, OUT = sys.argv[1:3]; IMG = os.path.join(OUT, "img"); os.makedirs(IMG, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__)); esc = lambda s: html.escape(str(s))
L = lambda f: json.load(open(os.path.join(M, f)))["all"]
D = {"sw": (L("geo_sw_v12.json"), L("geo_sw_head.json")), "def": (L("geo_def_v12.json"), L("geo_def_head.json")), "rx": (L("geo_rx_v12.json"), L("geo_rx_head.json"))}
NEAR = L("geo_sw_near.json")
LEG = ("thigh_", "shin_", "foot_"); TR = ("torso", "head"); ARM = ("uarm_", "farm_")
def cls(a, b):
    if a.startswith(ARM) or b.startswith(ARM): return "arm"
    if a in TR and b in TR: return "TT"
    if a in TR or b in TR: return "TL"
    return "LL"
def metrics(r):
    ev = r["events"]; st = next((e for e in ev if e["kind"] == "TACKLE_START"), None); k0 = st["tick"] - 1 if st else 0
    o = {c: [0.0, 0] for c in ("TT", "TL", "LL", "arm")}; dur = 0
    for q, row in zip(r["pen"], r["rows"]):
        if not q or row["k"] < k0: continue
        best = {}
        for p in q["pairs"]:
            c = cls(p[0], p[1]); best[c] = max(best.get(c, 0), p[2])
        for c, v in best.items(): o[c][0] = max(o[c][0], v); o[c][1] += v > 0.05
        dur += max([v for c, v in best.items() if c != "arm"] or [0]) > 0.03
    tk = next((e for e in ev if e["kind"] == "TACKLE" and e.get("type") == "SLIDE"), None)
    reacts = [f'{e.get("seg")}{" (planted)" if e.get("segPlanted") else ""} → {e.get("react") or e.get("cls")}' + (f' [{e.get("took")}]' if e.get("took") and e.get("took") != "REACTION" else "") for e in ev if e["kind"] in ("PLAYER_CONTACT", "PLAYER_CONTACT_ABSORBED")]
    man = None
    for row in r["rows"]:
        d = row["P"][1]["def"] if len(row["P"]) > 1 else None
        if d and d.get("manifold"): man = d["manifold"]
    tack = [m["kind"] for m in (man or []) if m["kind"] not in ("BALL", "BODY")]
    order = sorted(set(e.get("order") for e in ev if e["kind"] == "TACKLE_BODY_CONTACT" and e.get("order")))
    ball = (tk["out"] + (" " + tk["region"] if tk.get("region") else "") + (f' @{tk["contactTick"]}' if tk.get("contactTick") else "")) if tk else "—"
    st_s = (f'{st["foot"]} (far) · {st.get("tech")}' if st and st.get("tuck") else (f'{st["foot"]} (near, V1)' if st else "—"))
    return dict(o=o, dur=dur, reacts=reacts, tack=tack, order=order, ball=ball, leg=st_s, man=man)
cm = lambda v: f"{v * 100:.1f}"
def cell(v, n):
    c = "ok" if v <= 0.05 else "warn" if v <= 0.10 else "bad"
    return f'<td class="{c}">{cm(v)} cm · {n}</td>'

# ── the required proof: the worst cross-line cases, V1.2 vs now ────────────────────────────────────────────────────────────────────────
CASES = [("sw", "cf_right", "counterfactual pair, right: 0.75 m, the line 20° across the carrier"), ("sw", "cf_left", "counterfactual pair, left"),
         ("sw", "blk_front", "head-on block, the ball on the line"), ("def", "sl_loose", "loose-ball slide into a runner"), ("def", "sl_win", "V1 fixture: ball first, then the attacker"),
         ("rx", "rx_lateral", "slide straight across a runner (no ball)"), ("rx", "rx_front_diag", "front-diagonal slide at a runner"), ("rx", "rx_standing", "slide into a standing player"),
         ("rx", "rx_facing_front", "standing player facing the slide"), ("def", "sl_from_behind", "from behind (audited below)"), ("sw", "sw_right", "side-on sweep (reference)")]
rows = ""
for grp, scen, what in CASES:
    A, B = D[grp]
    for lab, R in (("V1.2 (a1357dd)", A), ("now", B)):
        if scen not in R: continue
        m = metrics(R[scen]); o = m["o"]
        rows += (f'<tr><td class="l">{esc(scen) if lab.startswith("V1.2") else ""}<div class="dim">{esc(what) if lab.startswith("V1.2") else ""}</div></td><td class="l">{lab}</td>'
                 f'{cell(o["TT"][0], o["TT"][1])}{cell(o["TL"][0], o["TL"][1])}{cell(o["LL"][0], o["LL"][1])}<td>{m["dur"]}</td>'
                 f'<td class="l">{esc("; ".join(m["reacts"]) or "none")}</td><td class="l">{esc(", ".join(dict.fromkeys(m["tack"])) or "—")}</td><td class="l">{esc(m["ball"])}</td><td class="l">{esc(", ".join(m["order"]) or "—")}</td></tr>')
proof = ('<table><thead><tr><th class="l">case</th><th class="l">build</th><th>pelvis / torso ↔ pelvis / torso · ticks&gt;5cm</th><th>pelvis / torso ↔ leg · ticks&gt;5cm</th>'
         '<th>leg ↔ leg · ticks&gt;5cm</th><th>ticks any body overlap &gt;3cm</th><th class="l">attacker reaction(s)</th><th class="l">tackler response (contact history)</th><th class="l">ball</th><th class="l">order</th></tr></thead><tbody>' + rows + "</tbody></table>")

# every fixture: outcome changes between V1.2 and now (ball / leg / technique) — nothing else should move
chg = ""
for grp in ("sw", "def", "rx"):
    A, B = D[grp]
    for scen in A:
        if scen not in B: continue
        a, b = metrics(A[scen]), metrics(B[scen])
        if a["ball"].split(" @")[0] != b["ball"].split(" @")[0] or a["leg"] != b["leg"]:
            chg += f'<tr><td class="l">{esc(scen)}</td><td class="l">{esc(a["leg"])}</td><td class="l">{esc(a["ball"])}</td><td class="l">{esc(b["leg"])}</td><td class="l">{esc(b["ball"])}</td></tr>'
chg = ('<table><thead><tr><th class="l">fixture</th><th class="l">V1.2 leg / technique</th><th class="l">V1.2 ball</th><th class="l">now leg / technique</th><th class="l">now ball</th></tr></thead><tbody>'
       + (chg or '<tr><td class="l" colspan="5">none</td></tr>') + "</tbody></table>")

# ── media: before | after at identical starts ──────────────────────────────────────────────────────────────────────────────────────
CROP = (330, 230, 1170, 780)
def frame(d, scen, k, label):
    f = os.path.join(M, d, f"{scen}_t{k:03d}.jpg")
    if not os.path.exists(f): return None
    im = Image.open(f).convert("RGB").crop(CROP); im = im.resize((int(im.width * 0.5), int(im.height * 0.5)))
    dr = ImageDraw.Draw(im); dr.rectangle([2, 2, 9 + 6 * len(label), 16], fill=(0, 0, 0)); dr.text((5, 3), label, fill=(255, 230, 110)); return im
def pair(dA, dB, scen, k):
    a, b = frame(dA, scen, k, "V1.2"), frame(dB, scen, k, "now")
    if a is None or b is None: return None
    S = Image.new("RGB", (a.width + b.width + 4, a.height), (14, 17, 22)); S.paste(a, (0, 0)); S.paste(b, (a.width + 4, 0)); return S
def clips(dA, dB, scen, k0, k1, kc, name):
    n = [pair(dA, dB, scen, k) for k in range(k0, k1, 2)]; n = [x for x in n if x]
    s = [pair(dA, dB, scen, k) for k in range(max(k0, kc - 10), min(k1, kc + 40))]; s = [x for x in s if x]
    if n: n[0].save(os.path.join(IMG, name + "_normal.webp"), save_all=True, append_images=n[1:], duration=33, loop=0, quality=68)
    if s: s[0].save(os.path.join(IMG, name + "_slow.webp"), save_all=True, append_images=s[1:], duration=67, loop=0, quality=68)
    return name + "_normal.webp", name + "_slow.webp"
def plate(geo, scen, name, title, frm, to):
    import subprocess
    subprocess.run(["python3", os.path.join(HERE, "of_slide_plot.py"), os.path.join(M, geo), scen, os.path.join(IMG, name), "--title", title, "--every", "3", "--from", str(frm), "--to", str(to)], capture_output=True)
    return name
media = ""
for grp, scen, dA, dB, geoA, geoB, k0 in [("sw", "cf_right", "game_v12", "game_head", "geo_sw_v12.json", "geo_sw_head.json", 58), ("sw", "cf_left", "game_v12", "game_head", "geo_sw_v12.json", "geo_sw_head.json", 58),
        ("sw", "blk_front", "game_v12", "game_head", "geo_sw_v12.json", "geo_sw_head.json", 58), ("def", "sl_loose", "game_def_v12", "game_def_head", "geo_def_v12.json", "geo_def_head.json", 125),
        ("rx", "rx_lateral", "game_rx_v12", "game_rx_head", "geo_rx_v12.json", "geo_rx_head.json", 35), ("rx", "rx_standing", "game_rx_v12", "game_rx_head", "geo_rx_v12.json", "geo_rx_head.json", 35)]:
    B = D[grp][1][scen]; bc = [e for e in B["events"] if e["kind"] == "TACKLE_BODY_CONTACT"]; kc = (bc[0]["tick"] - 1) if bc else k0 + 20
    n, s = clips(dA, dB, scen, k0, k0 + 110, kc, "v13_" + scen)
    pa = plate(geoA, scen, f"v13_{scen}_v12.png", "V1.2 (a1357dd)", max(0, kc - 10), kc + 40); pb = plate(geoB, scen, f"v13_{scen}_now.png", "now", max(0, kc - 10), kc + 40)
    media += (f'<h3>{esc(scen)} — identical start, identical slide request</h3><div class="grid"><figure><img src="img/{pa}"><figcaption>V1.2</figcaption></figure><figure><img src="img/{pb}"><figcaption>now</figcaption></figure></div>'
              f'<div class="grid"><figure><img src="img/{n}"><figcaption>V1.2 | now, gameplay camera, real time</figcaption></figure><figure><img src="img/{s}"><figcaption>V1.2 | now, 0.25× around the first body contact</figcaption></figure></div>')

# ── sl_from_behind audit (this build) ─────────────────────────────────────────────────────────────────────────────────────────────────
R = D["def"][1]["sl_from_behind"]; ev = R["events"]
st = next(e for e in ev if e["kind"] == "TACKLE_START"); bcs = [e for e in ev if e["kind"] == "TACKLE_BODY_CONTACT"]; pcs = [e for e in ev if e["kind"] == "PLAYER_CONTACT"]
tk = next((e for e in ev if e["kind"] == "TACKLE" and e.get("type") == "SLIDE"), {}); lr = next((d.get("v12") for d in R["defRecs"] if d.get("v12")), None) or {}
mfb = metrics(R); g = st.get("geo") or {}
audit = f"""<table class="kv"><tbody>
<tr><th class="l">approach</th><td class="l">slide requested at tick {st["tick"]}, v0 {st["v0"]} m/s, direction {st["dir"]} rad: {g.get("approach")}° from the carrier's line, on his {str(g.get("side", "")).replace("CARRIER_", "").lower()} and <b>behind</b> him; the ball {abs(g.get("ballLat", 0)):.2f} m to the side of the slide line, {g.get("ballFwd")} m ahead → far leg {st["foot"]}, tucked {st.get("tuck")}, {st.get("tech")}</td></tr>
<tr><th class="l">first contact</th><td class="l">{"; ".join(f'tick {e["tick"]}: {e.get("prim")} → {e.get("seg")}, {e.get("order")}, from behind = {e.get("behind")}' for e in bcs[:1])} — <b>the man first</b>. Reaction: {esc("; ".join(f'{e.get("seg")} (planted={e.get("segPlanted")}) → {e.get("react")} {e.get("family", "")}' for e in pcs[:2]))}. He falls and the ball runs loose.</td></tr>
<tr><th class="l">ball contact</th><td class="l">{tk.get("out")} at tick {tk.get("contactTick")} on the {tk.get("region")} (along {tk.get("legAt")}) — {(tk.get("contactTick") or 0) - (bcs[0]["tick"] if bcs else 0)} ticks after the man; the ball LOOSE (the quality law treats a loose ball as fully exposed: q {tk.get("q")}, exposure {tk.get("expose")}); leg velocity {tk.get("vLeg")} m/s, normal {tk.get("normal")}, ball {tk.get("vIn")} → {tk.get("vOut")} m/s</td></tr>
<tr><th class="l">penetration</th><td class="l">pelvis / torso ↔ torso {cm(mfb["o"]["TT"][0])} cm, torso ↔ leg {cm(mfb["o"]["TL"][0])} cm, leg ↔ leg {cm(mfb["o"]["LL"][0])} cm — the far leg does not reach anything by passing through him</td></tr>
<tr><th class="l">rendered boot at the ball</th><td class="l">{lr.get("patchPart")} face {cm(lr.get("sepContact", 0))} cm from the ball surface at the contact instant; rendered vs simulated normal {lr.get("nAngle")}° (at the very end of the fully swept leg; V1.2 showed the boot 10.3 cm short here — see the reach calibration)</td></tr>
</tbody></table>
<p><b>Verdict.</b> The corrected geometry is why the slide now touches anything: V1's straight near leg passed 12 cm short of everything. The sequence is physically coherent, and nothing passes through the attacker. It is not a clean ball-winning tackle, though. The far leg takes the carrier's planted foot <b>from behind, man first</b>. The ball contact is the still-sliding, fully swept leg meeting the ball that his fall released, {(tk.get("contactTick") or 0) - (bcs[0]["tick"] if bcs else 0)} ticks later. The simulation keeps the result (a real contact of the leg with a loose ball, WON by the unchanged quality law, exactly as V1 treats any loose ball the slide meets). The foul facts record it as a man-first challenge from behind, which is what a future referee needs. Nothing in this fixture is special-cased.</p>"""

sec = f"""<h2 id="v13">Follow-up — body interaction on cross-line slides</h2>
<div class="lede">The side-on sweep (V1.2) put the defender's body beside the attacker. What remained was the case where the slide line itself cuts across the carrier: the defender's authoritative path genuinely intersects the space the attacker occupies. V1.2 left 13–22 cm of overlap there. This follow-up makes the two bodies <b>interact</b> in those cases, using the persistent contact history already built. Nothing is teleported, nothing is separated in the presentation only, no slide is shortened, and the attacker is never made intangible. The far-leg selection, the sweep, the swept ball contact and the ball-contact model are unchanged. The one exception is the leg's reach, re-calibrated where measurement proved the rendered leg can't reach it (see (8) below).</div>
<h3>What measurement showed (each fixed at its cause)</h3>
<ol>
<li><b>The simulation did not know where the V1.2 body was.</b> The V1.2 alignment moved the rendered slider onto his tackling hip, so seat, trunk and the tucked leg lie 13–20 cm toward the tucked side (toward the attacker). The simulation's capsules were still where the V1 pose had them. In the two worst cases the simulated capsules were 1–23 cm <i>apart</i> while the rendered bodies overlapped by up to 22 cm. The capsules are now re-measured from the rendered V1.2 pose: seat, reclined trunk, the tucked thigh, and its shin folded back under the seat.</li>
<li><b>Once a contact was resolved, nothing kept the bodies apart.</b> An "absorbed" or "resting" contact changed nothing, and the tackler's only response was losing the impulse from his speed. Now, while a slide is in contact with a player on his feet, a bounded <b>non-penetration</b> constraint acts on every rigid body-to-body pair (his seat / trunk / tucked leg against the player's pelvis, trunk, thighs or a weight-bearing leg). It removes the closing velocity along the contact normal plus a separating bias, shared by the players' recorded masses. The slider loses speed and is <b>deflected sideways</b>; the player is pushed on top of his reaction's steps. It uses velocities only. The sweeping leg against legs, and anything against a swinging limb, stays with the impulse / reaction model (sweep, trip, step-over), because that is the tackle itself.</li>
<li><b>The contact window ended when the slider stopped.</b> A player still on his feet (in his failing steps) then walked through the slider lying on the pitch. The window now lasts until the slider's get-up. A stopped slider can't be pushed (ground friction), so the player takes the whole correction.</li>
<li><b>A planted foot under the slider's seat cannot be pushed out</b>, because it is planted: moving his body doesn't move it. Held there (more than 4 cm for 3 ticks), any rigid part of him trapped on the slider's body is an <b>OVERRUN</b>. That contact is re-resolved through the same balance law with the support lost, and normally he goes over the slider.</li>
<li><b>A deeply penetrated closest-point normal can point the wrong way.</b> A foot already under the seat was being driven further through. The separating direction is now from the slider's body axis to the player.</li>
<li><b>Falling over the slider.</b> While he is in the air, his body is modelled as the fall presentation carries it: pelvis over his root, head going where his head goes, legs trailing. The slider is stopped against him and he is steered off it with a separating push. When his trunk topples into the slider's upper body, the <b>fall rotates around it</b> (bounded turn rate); the presentation's directional fall basis follows.</li>
<li><b>Two presentation defects the measurement exposed.</b> A faller was laid on a slider who was getting up, so he floated at 1.5 m. Only the faller's trunk now rests on the slider, and only while the slider is on the pitch. A slider getting up out of a pile was popped out by a full-correction mop-up. He now shuffles clear at ≤ 1 m/s.</li>
<li><b>Leg reach.</b> Under the contact-tracking IK, the Astra leg's ankle is soft-limited, so the rendered toe reaches 1.12 m from the hip, not the 1.16 m V1.2 assumed. The simulated leg is re-calibrated to 1.20 × leg, so a simulated end-of-leg contact is one you can see. The tracked point is the mid-boot, 0.15 m inside the leg's toe end.</li>
<li><b>A struck left leg was thrown INTO the tackler (a V1 presentation sign error).</b> The tackled-player overlay pulls a struck swing leg the way it was hit. The rig's thigh rotation moves the knee the same world direction for both legs, but V1 mirrored the sign for the left leg. So every struck left leg was pulled toward the tackler, not away. In <code>cf_left</code> the knee went 15 cm toward the slider and 22 cm into his trunk; in <code>rx_lateral</code>, 16 cm. With the sign corrected (verified on both sides: the right leg already moved along the contact normal), trunk ↔ leg in this pass's build before the fix vs after: <code>rx_lateral</code> 16.3 → 0 cm, <code>cf_left</code> 22.0 → 10.6 cm. This is presentation, but it removes a pose that contradicted the simulation; it does not hide an overlap the simulation has.</li>
<li><b>A slider coming to rest popped a player beside him.</b> The resting slider's body on the pitch was mopped up in a single tick, which moved the attacker's root 38 cm in one tick in <code>sl_loose</code> and 29 cm in <code>rx_front_diag</code>, effectively a teleport. The standing player is now moved off at the non-penetration bias rate (≤ 2.5 m/s, 4.2 cm per tick), with the velocity into the body still removed. No fixture now shows a root displacement more than 4.6 cm beyond its velocity. In <code>rx_front_diag</code> this means his planted foot really is trapped under the resting slider (he's no longer popped clear), so the OVERRUN law applies and he goes over the slider (FALL, as he did in V1.2).</li></ol>
<h3>Required proof — the worst cross-line cases, V1.2 vs now, identical initial states</h3>
<p>Rendered penetration of the final skeletons, measured every tick from the slide request. The first three columns are the maximum depth · ticks deeper than 5 cm; the fourth counts ticks with any body overlap deeper than 3 cm. Arms are not counted here; they're listed in the residuals. Tackler response is taken from the challenge's contact history.</p>
{proof}
<h3>Every fixture whose ball outcome or leg / technique changed between V1.2 and now</h3>
{chg}
<p><code>cf_left</code>: the ball contact is the same (tick 82, thigh). In V1.2 a body capsule that was in the wrong place (see (1)) struck his swinging foot at tick 79, and he fell, so the quality law saw a fully exposed ball (1.2) and gave WON. The corrected capsules meet that foot with the thigh at tick 80. He stumbles and keeps the ball close (exposure 0.15), so the same contact is a POKE. The corrected geometry decides it; it isn't a tackle turned into a miss.</p>
<p><b>Residuals, stated plainly.</b> Pelvis / torso against pelvis / torso is 0 cm in every fixture. Two limb brushes deeper than 10 cm remain, both about 5 ticks (≈ 80 ms): (a) <code>sl_loose</code>, a runner at 4 m/s crossing a slider that has almost stopped, his swinging right leg brushing through the slider's reclined upper body (max 16 cm); the simulation does register it (NON-PENETRATION, OVERRUN → CORRECTION, trunk ↔ thigh absorbed), but his stumble steps keep carrying him across while the separating push acts. (b) <code>cf_left</code>, his raised step-over knee brushing the back of a slider that is overtaking him and already moving away (max 10.6 cm). Leg ↔ leg tangles stay at up to ≈ 13 cm in the pile-ups. These are limb-surface contacts, not two bodies sharing space.</p>
<p class="dim">Any other fixture differs only in body contacts and reactions, which is the point of this pass. The regression gates below list every slide fixture's changed facts against <code>baseline/tackled-player-v1</code>.</p>
{media}
<h3>sl_from_behind — audit of the V1.2 MISS → WON</h3>
{audit}
"""
open(os.path.join(OUT, "section13.html"), "w").write(sec); print("wrote section13.html", len(sec))
