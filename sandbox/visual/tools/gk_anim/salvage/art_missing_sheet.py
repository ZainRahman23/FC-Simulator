# sheet: for each reproduced case, the live frame + overlay + the complete selector readout with per-candidate rejection reasons
#   python3 art_missing_sheet.py <repro_dir> <out.png> <title>
import sys, json, re, math
from PIL import Image, ImageDraw, ImageFont
CAP, OUTP, TITLE = sys.argv[1:4]
F = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s); Fr = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s); Fm = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New.ttf", s)
rec = json.load(open(f"{CAP}/repro.json"))
def ang(a): return (a + 180) % 360 - 180
def reason(sc, r):
    w = sc["why"] or ""; cls = r["cls"]; ms = r["minScore"]
    if w.startswith("height"): return f"REJECTED: height gate — {cls['hClass']} not in this pose's classes"
    if "family " in w and not w.startswith("family ok"): return "REJECTED: family gate — not an airborne dive/low collapse"
    t = {k: float(m.group(1)) for k in ("facing", "side", "keeperSide", "far", "offGround", "reach", "low", "stretch", "tight", "post", "vert", "lat", "open") if (m := re.search(k + r" (?:[A-Z]+/)?([0-9.]+)", w))}
    if t.get("side", 1) == 0 or t.get("keeperSide", 1) == 0: return "REJECTED: side — the pose serves the other goal side / keeper side"
    if t.get("facing", 1) == 0: return f"REJECTED: facing term 0 — frozen facing {r['facingAtCommitDeg']}° vs pose facing (shooter bearing {r['situation']['facingDeg']}°)"
    if t.get("low", 1) == 0: return "REJECTED: lowness term 0 (contact too high for a ground still)"
    if t.get("offGround", 1) == 0: return "REJECTED: off-ground term 0"
    if sc["score"] < ms:
        detail = f" (facing {t['facing']:.2f} × far {t['far']:.2f} × offGround {t.get('offGround', 1):.2f} × reach-term {0.5+0.5*t['reach']:.2f})" if "far" in t and "facing" in t and "reach" in t else ""
        picked = r["pick"] and r["pick"]["id"] == sc["id"]
        return (f"FALLBACK PICK: score {sc['score']} < minScore {ms} but ≥ farFallbackMin 0.25 — the side's only far-dive art for a MID/HIGH/TOP airborne dive" if picked else f"REJECTED: score {sc['score']} < minScore {ms}") + detail
    return "qualifies" + (" — PICKED" if r["pick"] and r["pick"]["id"] == sc["id"] else "")
cells = []
for r in rec:
    fr = Image.open(f"{CAP}/{r['id']}_frame.png").convert("RGB"); ov = Image.open(f"{CAP}/{r['id']}_overlay.png").convert("RGB")
    cls = r["cls"] or {}; sit = r["situation"] or {}; W = 1900; H = 300 + 18 * (len(r["scored"] or []) + 1) + 60
    im = Image.new("RGB", (W, H), (18, 19, 22)); d = ImageDraw.Draw(im)
    d.text((12, 8), f"{r['id']} — {r['label']}", font=F(19), fill=(235, 225, 120))
    im.paste(fr, (12, 36)); im.paste(ov.resize((ov.width * 7 // 10, ov.height * 7 // 10), Image.NEAREST), (424, 36))
    d.text((424, 130), "live GK ANIM overlay at the same tick", font=Fr(12), fill=(150, 155, 165))
    x0, y0 = 424, 150; L = []
    cm = r["committed"] or {}
    L.append(f"action family        {r['family']}   ({cm.get('tier')} / {cm.get('action')}){'   BEST EFFORT (unreachable)' if cls.get('bestEffort') else ''}" + (f"   first ball contact: {r['firstContact']['volume']} {r['firstContact']['outcome']} at tick {r['firstContact']['tick']}{' BEFORE the commit (rebound)' if r['firstContact'].get('beforeCommit') else ''}" if r.get("firstContact") else ""))
    L.append(f"AIRBORNE_DIVE side   {cls.get('side')} (keeper-frame, from the frozen facing)     goal side {cls.get('goalSide')} (from the target's y: north = GOAL_LEFT, south = GOAL_RIGHT)")
    L.append(f"keeper facing        tracked at commit {r['facingAtCommitDeg']}° ({r['dir']})   |   bearing feet→shooter {sit.get('facingDeg')}°   |   facing when the shot was struck {r['shotFacing']}°   |   mismatch {abs(ang((r['facingAtCommitDeg'] or 0)-(sit.get('facingDeg') or 0))):.1f}°" + (f"   → selector uses {sit.get('facingAtCommitDeg')}° for the stills ({'CORRECTED >90°' if sit.get('facingCorrected') else 'tracked'}), {sit.get('facingFarDeg')}° for the far-dive poses ({'CORRECTED >60°' if sit.get('facingFarCorrected') else 'tracked'})" if 'facingCorrected' in sit else ""))
    L.append(f"height class         {cls.get('hClass')}   contact height z {cls.get('z')} m (z/H {cls.get('zH')})   lateral demand L {cls.get('L')} m (keeper-frame lat {cls.get('lat')})   reach/envelope norm {cls.get('norm')} (maxLat {cls.get('maxLat')})")
    fd = [s for s in (r["scored"] or []) if s["id"] in ("DIVE_NORTH_MEDHIGH", "DIVE_SOUTH_MEDHIGH")]
    for s in fd:
        m = re.search(r"far ([0-9.]+)", s["why"] or ""); o = re.search(r"offGround ([0-9.]+)", s["why"] or "")
        L.append(f"{s['id']:20s} far term {m.group(1) if m else '-'}   offGround term {o.group(1) if o else '-'}   bestEffort {cls.get('bestEffort')}   nearMax {cls.get('expr', {}).get('nearMax') if cls.get('expr') else '-'}")
    L.append(f"selector result      pick {r['pick']['id'] + ' ' + str(r['pick']['score']) if r['pick'] else 'NONE'}   minScore {r['minScore']}   baseline {r['baseline']}   → drawn: {r['art']}")
    L.append(""); L.append(f"{'candidate':22s}{'prio':5s}{'score':7s}terms / rejection reason")
    for s in (r["scored"] or []):
        L.append(f"{s['id']:22s}{str(s.get('priority', 1)):5s}{str(s['score']):7s}{(s['why'] or '')[:95]}")
        L.append(f"{'':34s}{reason(s, r)}")
    y = y0
    for line in L:
        d.text((x0, y), line, font=Fm(11), fill=(220, 220, 230) if not line.startswith(" " * 30) else ((150, 235, 150) if "qualifies" in line or "FALLBACK" in line else (255, 170, 120))); y += 15
    cells.append(im.crop((0, 0, W, min(H, y + 10))))
hdr = Image.new("RGB", (1900, 70), (18, 19, 22)); d = ImageDraw.Draw(hdr); d.text((12, 10), TITLE, font=F(24), fill=(255, 255, 255))
d.text((12, 44), "plain match.html, real simulation, keeper positioned by the live controller; frame = the live default draw at the diagnostic/contact tick", font=Fr(14), fill=(150, 155, 165))
H = hdr.height + sum(c.height + 8 for c in cells); sheet = Image.new("RGB", (1900, H), (18, 19, 22)); sheet.paste(hdr, (0, 0)); y = hdr.height
for c in cells: sheet.paste(c, (0, y)); y += c.height + 8
sheet.save(OUTP); print("sheet", sheet.size)
