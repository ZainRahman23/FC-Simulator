#!/usr/bin/env python3
"""GK far-LATERAL dive review — HTML page (media from build_lat_review.py, numbers from the layer probes / gates / surveys / dive probes)."""
import json, os, math, html, shutil, glob, sys
sys.path.insert(0, "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"); import arm_section
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
R = "/Users/zainrahman/Downloads/FC Simulator/review_artifacts/gk_far_lateral"; M = R + "/media"; V = R + "/verification"; os.makedirs(V, exist_ok=True)
esc = html.escape
made = json.load(open(S + "/lat_made.json")); arm_made = json.load(open(S + "/arm_made.json")) if os.path.exists(S + "/arm_made.json") else {}
def layers(path):
    try: return {str(r["idx"]): r for r in json.load(open(path))}
    except Exception: return {}
LA = layers(S + "/layers_lat_courtois.json"); LB = layers(S + "/layers_courtois.json"); LT = layers(S + "/layers_lat_test.json"); L2 = layers(S + "/layers_lat_adhoc2_courtois.json"); L1 = layers(S + "/layers_lat_adhoc_courtois.json"); LX = layers(S + "/layers_lat_extra_courtois.json"); LADV = layers(S + "/layers_lat_adv_courtois.json"); LTB = layers(S + "/layers_test.json")
def summ(rec):
    if not rec: return None
    R_ = rec["rows"]; d = [r for r in R_ if r.get("axis")]; c = [r for r in R_ if r.get("committed")]
    if not d or not c: return None
    cm = c[0]["committed"]; ax = d[0]["axis"]; la = next((r["launch"] for r in d if r.get("launch")), None)
    res = [r["ik"]["residual"] for r in d if r.get("ik") and r["ik"].get("residual") is not None]; pel = [r["final"]["pelvis"][1] for r in R_ if r.get("final")]
    st = {}
    for r in d:
        s = r.get("landing")
        if s and s not in st: st[s] = r["k"]
    key = {}
    for nm in ("PUSH_END", "TOE_OFF", "FULL_EXTENSION"):
        r = next((r for r in d if (r.get("sub") or r.get("phase")) == nm), None)
        if r: key[nm] = (r.get("rawRoll") or [0, 0, 0])[2], (r.get("finalRoll") or [0, 0, 0])[2]
    tor = [abs(r.get("torso") or 0) for r in d]; pres = [r["pres"][2] for r in R_ if r.get("pres")]
    cont = next((r for r in R_ if r.get("contact")), None)
    return dict(name=rec["name"], action=cm["action"], best=cm["best"], exec=cm["exec"], theta=ax["theta"], wSide=ax["wSide"], lateral=ax["wSide"] >= 1 - 1e-6, motion=d[0].get("motion"), contact=bool(cont), contactK=cont["k"] if cont else None,
                resMax=max(res) if res else None, vUp=la["vUp"] if la else None, vLat=la["vLat"] if la else None, pelMax=max(pel) if pel else None, pelMin=min(pel) if pel else None, tE=st.get("FOLLOW"), impact=st.get("IMPACT"), settle=st.get("SETTLE"), brace=st.get("BRACE"), key=key, assist=max(tor) if tor else 0, presMax=max(pres) if pres else 0, H=rec["H"])
f2 = lambda v, n=2: "—" if v is None else (f"{v:.{n}f}" if isinstance(v, (int, float)) else str(v))
def keycell(s, nm):
    if not s or nm not in s["key"]: return "—"
    a, b = s["key"][nm]; return f"{a:.0f}° → <b>{b:.0f}°</b>"
def diag_row(fx, before, after, rig):
    b, a = summ(before), summ(after)
    if not a: return ""
    return (f"<tr><td>{fx} {esc(a['name'][:38])}<br><span class=note>{rig}</span></td><td>{a['action']}{' (best-effort)' if a['best'] else ''}<br>exec {a['exec']:.3f} s</td><td>{a['theta']:.1f}° / {a['wSide']:.2f}<br><b>{'LATERAL' if a['lateral'] else 'high-dive rule'}</b></td>"
            f"<td>{f2(a['vUp'])} / {f2(a['vLat'])}<br>pelvis {f2(a['pelMin'])}–{f2(a['pelMax'])} m</td>"
            f"<td>{keycell(b, 'PUSH_END')}<br>{keycell(a, 'PUSH_END')}</td><td>{keycell(b, 'TOE_OFF')}<br>{keycell(a, 'TOE_OFF')}</td><td>{keycell(b, 'FULL_EXTENSION')}<br>{keycell(a, 'FULL_EXTENSION')}</td>"
            f"<td>{f2(b and b['assist'], 1)}° → <b>{f2(a['assist'], 1)}°</b></td><td>{'contact tick %d' % a['contactK'] if a['contact'] else 'no contact (miss)'}<br>residual max {f2(a['resMax'], 3)} m</td>"
            f"<td>tE {b and b['tE']}→<b>{a['tE']}</b> / IMPACT {b and b['impact']}→<b>{a['impact']}</b> / SETTLE {b and b['settle']}→<b>{a['settle']}</b></td><td>{f2(a['presMax'], 3)} m</td></tr>")
DIAG_H = "<table><tr><th>fixture</th><th>committed action</th><th>body axis θ / wSide<br>regime</th><th>launch vUp / vLat [m/s]<br>pelvis height range</th><th>pelvis roll PUSH_END<br>authored → resolved<br>(before / after)</th><th>roll TOE_OFF</th><th>roll FULL_EXTENSION</th><th>torso assist max<br>before → after</th><th>simulation contact /<br>glove residual</th><th>landing stage ticks (before → after)</th><th>pres-root dev max</th></tr>"
diag = DIAG_H + "".join(diag_row(fx, LB.get(fx), LA.get(fx), "Courtois") for fx in ("2", "13", "15")) + "".join(diag_row(fx, LTB.get(fx), LT.get(fx), "shared test rig") for fx in ("2", "13", "15")) + "</table>"
def matrix_row(tag, s, rig="Courtois"):
    if not s: return f"<tr><td>{tag}</td><td colspan=9 class=note>no layer probe</td></tr>"
    return (f"<tr><td>{tag} {esc(s['name'][:46])}<br><span class=note>{rig} H {s['H']}</span></td><td>{s['action']}{' best-effort' if s['best'] else ''} / {s['motion']}<br>exec {s['exec']:.3f} s</td><td>{s['theta']:.1f}° / {s['wSide']:.2f} → <b>{'LATERAL' if s['lateral'] else 'high-dive'}</b></td><td>{'CONTACT (tick %d)' % s['contactK'] if s['contact'] else 'miss'}<br>residual max {f2(s['resMax'], 3)}</td>"
            f"<td>{f2(s['vUp'])} / {f2(s['vLat'])}</td><td>{f2(s['pelMin'])}–{f2(s['pelMax'])}</td><td>{keycell(s, 'TOE_OFF')}</td><td>{keycell(s, 'FULL_EXTENSION')}</td><td>{f2(s['assist'], 1)}°</td><td>tE {s['tE']} / IMPACT {s['impact']} / SETTLE {s['settle']} / BRACE {s['brace']}</td><td>{f2(s['presMax'], 3)}</td></tr>")
MAT_H = "<table><tr><th>case</th><th>action / motion</th><th>θ / wSide → regime</th><th>simulation result</th><th>launch vUp / vLat</th><th>pelvis height [m]</th><th>roll TOE_OFF (authored → resolved)</th><th>roll FULL_EXT</th><th>torso assist</th><th>landing ticks</th><th>pres-root dev</th></tr>"
CASES = [("15", LA.get("15")), ("13", LA.get("13")), ("2", LA.get("2")), ("42", LX.get("42")), ("14", LX.get("14")), ("39", LX.get("39")), ("a2_0", L2.get("adhoc0")), ("a2_1", L2.get("adhoc1")), ("a2_2", L2.get("adhoc2")), ("a2_3", L2.get("adhoc3")), ("a2_8", L2.get("adhoc8")), ("a2_9", L2.get("adhoc9")), ("a1_6", L1.get("adhoc6")), ("adv8", LADV.get("adhoc8")), ("adv9", LADV.get("adhoc9"))]
matrix = MAT_H + "".join(matrix_row(t, summ(r)) for t, r in CASES) + "".join(matrix_row(t, summ(LT.get(t)), "shared test rig") for t in ("15", "13", "2", "42", "14", "39")) + "</table>"
# ── regression: gates, manifests, surveys, dive probes ──
def md_table(md):
    out = []
    for ln in md.strip().split("\n"):
        if ln.startswith("|---"): continue
        if ln.startswith("|"): cells = [c.strip() for c in ln.strip().strip("|").split("|")]; tag = "th" if not out else "td"; out.append("<tr>" + "".join("<%s>%s</%s>" % (tag, esc(c), tag) for c in cells) + "</tr>")
        else: out.append("<tr><td colspan=9 class=note>%s</td></tr>" % esc(ln))
    return "<table>" + "".join(out) + "</table>"
GT = "arm" if os.path.exists(f"{S}/arm_gate_all.md") else "lat"; gateAll = open(f"{S}/{GT}_gate_all.md").read(); gateDist = open(f"{S}/{GT}_gate_dist.md").read()
gate_summary = f"<p>All-fixture gate (0–79, 260 ticks, full precision) — <b class={'ok' if 'ALL IDENTICAL: YES' in gateAll else 'bad'}>{'ALL IDENTICAL: YES' if 'ALL IDENTICAL: YES' in gateAll else 'DIFFERENCES'}</b>; distribution gate (64–79, 300 ticks) — <b class={'ok' if 'ALL IDENTICAL: YES' in gateDist else 'bad'}>{'ALL IDENTICAL: YES' if 'ALL IDENTICAL: YES' in gateDist else 'DIFFERENCES'}</b> (SPRITE vs OFF vs SKELETAL_3D test rig vs SKELETAL_3D Courtois: simulation hashes, commit / contact ticks, ball, events).</p>"
def mancmp(a, b):
    A = json.load(open(f"{S}/{a}")); B = json.load(open(f"{S}/{b}")); rows = []
    for k in A:
        jw = {}; fields = 0
        for x, y in zip(A[k]["rows"], B[k]["rows"]):
            for j in x["joints"]:
                d = math.dist(x["joints"][j], y["joints"][j])
                if d > 1e-9: jw[j] = max(jw.get(j, 0), d)
            for kk in x:
                if kk != "joints" and json.dumps(x[kk], sort_keys=True) != json.dumps(y.get(kk), sort_keys=True): fields += 1
        rows.append(f"<tr><td>{k} {esc(A[k].get('name', '')[:44])}</td><td>{'<b class=ok>IDENTICAL (every joint, every tick)</b>' if not jw and not fields else '<b class=bad>DIFFERS</b> max joint %.4f m, %d field rows' % (max(jw.values()) if jw else 0, fields)}</td></tr>")
    return rows
MF = "arm" if os.path.exists(f"{S}/arm_manifest_reg.json") else "lat"; mantab = "<table><tr><th>frozen TEST-character manifest (320 / 300 ticks) vs the committed HEAD manifest</th><th>result</th></tr>" + "".join(mancmp("final_manifest_reg.json", f"{MF}_manifest_reg.json")) + "".join(mancmp("final_manifest_dist.json", f"{MF}_manifest_dist.json")) + "</table>"
def surv(path):
    try: o = json.load(open(path))["out"]
    except Exception: return None
    return dict(scMin=min(((x["selfColMin"], k) for k, x in o.items() if x.get("selfColMin") is not None), default=None), scMinPre=min(((x["selfColMinPre"], k) for k, x in o.items() if x.get("selfColMinPre") is not None), default=None), asserts=sum(x.get("asserts", 0) or 0 for x in o.values()), nan=sum(1 for x in o.values() if x["nan"]), flips=sum(x.get("flips", 0) for x in o.values()), presMax=max((x["presMax"], k) for k, x in o.items()), torsoMax=max((x["torsoMax"], k) for k, x in o.items()), elbowMin=min((x["elbowMin"], k) for k, x in o.items()), pelvMax=max((x["pelvMax"], k) for k, x in o.items()), headMax=max((x["headMax"], k) for k, x in o.items()), jl=sum(x.get("jointLimitTicks", 0) for x in o.values()), sole=min(((x["soleMinPlanted"], k) for k, x in o.items() if x.get("soleMinPlanted") is not None), default=None), n=len(o))
def survtab():
    SV = "arm" if os.path.exists(f"{S}/survey_arm_test.json") else "lat"; st, sc = surv(f"{S}/survey_{SV}_test.json"), surv(f"{S}/survey_{SV}_courtois.json"); pt, pc = surv(f"{S}/survey_dv_test.json"), surv(f"{S}/survey_dv_courtois.json")
    if not st or not sc: return "<p class=note>survey pending</p>"
    fm = lambda v: "—" if v is None else (f"{v[0]:.3f} (fixture {v[1]})" if isinstance(v, tuple) else str(v))
    rows = [("fixtures × 300 ticks", "n"), ("bad continuity assertions", "asserts"), ("NaN frames", "nan"), ("bend-plane flips (IK)", "flips"), ("joint-limit ticks", "jl"), ("max presentation-root deviation [m]", "presMax"), ("max torso-assist [deg]", "torsoMax"), ("min elbow included angle [deg]", "elbowMin"), ("max pelvis height [m]", "pelvMax"), ("max head height [m]", "headMax"), ("min planted sole height [m]", "sole"), ("min arm-to-torso clearance, dive lifecycle pre branch [m] (new gate)", "scMinPre"), ("min arm-to-torso clearance, any tick [m] (new gate; recovery stages included)", "scMin")]
    return "<table><tr><th>survey (all fixtures)</th><th>test rig — HEAD</th><th>test rig — now</th><th>Courtois — HEAD</th><th>Courtois — now</th></tr>" + "".join(f"<tr><td>{lab}</td><td>{fm(pt and pt[k])}</td><td><b>{fm(st[k])}</b></td><td>{fm(pc and pc[k])}</td><td><b>{fm(sc[k])}</b></td></tr>" for lab, k in rows) + "</table>"
def dsumm(run):
    Rr = run["rows"]; con = next((r["contact"] for r in Rr if r["contact"]), None); act = [r for r in Rr if r["ikW"] and r["ikW"] > 0]
    return dict(pelv=max(r["post"]["pelvis"][1] for r in Rr), head=max(r["post"]["head"][1] for r in Rr), pres=max(r["pres"]["dm"] for r in Rr), torso=max(abs(r["torso"]) for r in Rr), elbow=min(r["elbowAngDeg"] for r in Rr), out=(con["outcome"] if isinstance(con, dict) else ("contact" if con else "NO CONTACT")), resMiss=max((r["residual"] or 0) for r in act if not r["contactTick"]) if act else None, nan=any(r["nan"] for r in Rr), bad=sum(1 for r in Rr if r.get("assertsBad")))
def divetab():
    try: DV = "dive6" if os.path.exists(f"{S}/dive6_fx_test.json") else "dive5"; before = {f: {ch: {str(r["idx"]): r for r in json.load(open(f"{S}/dive4_{f}_{ch}.json"))["runs"]} for ch in ("test", "courtois")} for f in ("fx", "adv")}; after = {f: {ch: {str(r["idx"]): r for r in json.load(open(f"{S}/{DV}_{f}_{ch}.json"))["runs"]} for ch in ("test", "courtois")} for f in ("fx", "adv")}
    except Exception as e: return f"<p class=note>dive probe pending ({esc(str(e))})</p>"
    rows = []
    for f in ("fx", "adv"):
        for k in after[f]["courtois"]:
            name = after[f]["courtois"][k]["name"]; cells = [f"{k} {esc(name[:44])}"]
            for ch in ("test", "courtois"):
                a, b = dsumm(before[f][ch][k]), dsumm(after[f][ch][k])
                same = b["out"] == a["out"]
                cells += [f"{a['pelv']:.2f}→<b>{b['pelv']:.2f}</b>", f"{a['pres']:.2f}→<b>{b['pres']:.2f}</b>", f"{a['torso']:.0f}→<b>{b['torso']:.0f}°</b>", f"{a['elbow']:.0f}→<b>{b['elbow']:.0f}°</b>", f"{'<b class=ok>' if same else '<b class=bad>'}{esc(str(b['out']))}</b>", f"{'—' if b['resMiss'] is None else '%.2f' % b['resMiss']}", f"{'NaN!' if b['nan'] else 'ok'}/{b['bad']}"]
            rows.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
    return ("<table><tr><th rowspan=2>fixture</th><th colspan=7>shared test rig (H 1.83)</th><th colspan=7>Courtois (H 2.014)</th></tr><tr>" + "<th>pelvis max [m] HEAD→now</th><th>pres-root dev</th><th>torso assist</th><th>elbow min</th><th>simulation outcome (must be unchanged)</th><th>miss residual max [m]</th><th>NaN / bad asserts</th>" * 2 + "</tr>" + "".join(rows) + "</table>")
# copy verification inputs
for f in ["arm_gate_all.md", "arm_gate_dist.md", "survey_arm_courtois.json", "survey_arm_test.json", "dive6_fx_courtois.json", "dive6_fx_test.json", "dive6_adv_courtois.json", "dive6_adv_test.json", "layers_armF_courtois.json", "layers_armF_test.json", "layers_armF_adhoc.json", "layers_armF_broken.json", "layers_armF_extra.json", "layers_poleA.json", "layers_poleB.json", "arm_gate.py", "arm_section.py", "build_arm_review.py", "lat_caps3.sh", "arm_gates.sh", "lat_gate_all.md", "lat_gate_dist.md", "survey_lat_courtois.json", "survey_lat_test.json", "dive5_fx_courtois.json", "dive5_fx_test.json", "dive5_adv_courtois.json", "dive5_adv_test.json", "adhoc_dives.json", "lat_adhoc.json", "lat_adhoc2.json", "layers_lat_courtois.json", "layers_courtois.json", "layers_lat_test.json", "layers_lat_adhoc2_courtois.json", "layers_lat_adhoc_courtois.json", "layers_lat_extra_courtois.json", "layers_lat_adv_courtois.json"]:
    if os.path.exists(f"{S}/{f}"): shutil.copy(f"{S}/{f}", f"{V}/{f}")
for f in ["probe_layers.js", "lat_plots.py", "build_lat_review.py", "build_lat_html.py", "lat_caps.sh", "lat_gates.sh"]: shutil.copy(f"{S}/{f}", f"{V}/{f}")
# ── page ──
def media(tag, key, w=None, cap=""):
    p = made.get(tag, {}).get(key)
    return f'<figure><img src="{p}"{" style=\"max-width:%dpx\"" % w if w else ""}><figcaption>{esc(cap)}</figcaption></figure>' if p else f"<p class=note>[{tag} {key}: not captured]</p>"
def case_block(tag, title, s, extra=""):
    st = f"{s['action']}{' (best-effort)' if s['best'] else ''} · θ {s['theta']:.1f}° · {'LATERAL regime' if s['lateral'] else 'high-dive rule'} · {'CONTACT tick %d' % s['contactK'] if s['contact'] else 'miss'} · exec {s['exec']:.3f} s · vUp {f2(s['vUp'])} m/s · pelvis max {f2(s['pelMax'])} m · torso assist {f2(s['assist'], 1)}°" if s else ""
    return (f"<details open><summary><b>{esc(title)}</b> <span class=note>{esc(st)}</span></summary><div class=row>"
            + media(tag, "A", 500, "A — gameplay camera, 1:1, normal speed") + media(tag, "B", 440, "B — close rig, normal speed") + media(tag, "C", 440, "C — close rig, ¼ speed (dive window)") + "</div>"
            + media(tag, "D", None, "D — key-phase strip (close rig): LOAD → PLANT → PUSH → TOE_OFF → FLIGHT → FULL_EXTENSION → DESCENT/IMPACT → ABSORB → SETTLE → BRACE → PUSH_UP")
            + "<div class=row>" + media(tag, "E", 440, "E — diagnostic overlay (¼ speed): authoritative sim root, presentation root, pelvis, feet, hand target, ball") + media(tag, "Estrip", None, "E — diagnostic key phases") + "</div>" + extra + "</details>")
S15, S13, S2 = summ(LA.get("15")), summ(LA.get("13")), summ(LA.get("2"))
page = f"""<!doctype html><html><head><meta charset="utf-8"><title>GK far-lateral dive — diagnosis and correction</title>
<style>body{{font:13px/1.45 -apple-system,Helvetica,Arial,sans-serif;background:#0f1216;color:#d8dde3;margin:0;padding:18px 26px;max-width:1900px}}h1{{font-size:21px;color:#ffdc78}}h2{{font-size:16px;color:#ffdc78;border-top:1px solid #2a323c;padding-top:12px;margin-top:26px}}h3{{font-size:14px;color:#9ee8ff}}table{{border-collapse:collapse;font-size:11.5px;margin:8px 0}}td,th{{border:1px solid #2a323c;padding:3px 6px;vertical-align:top;text-align:left}}th{{background:#1a2028}}.ok{{color:#7ee787}}.bad{{color:#ff7b72}}.warn{{color:#ffd166}}.note{{color:#8a97a6;font-size:11px}}figure{{margin:6px 8px 6px 0;display:inline-block;vertical-align:top}}figcaption{{font-size:11px;color:#8a97a6;max-width:520px}}img{{image-rendering:pixelated;border:1px solid #2a323c;background:#000;max-width:100%}}.row{{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start}}details{{margin:8px 0 14px;border:1px solid #2a323c;padding:6px 10px;border-radius:4px}}summary{{cursor:pointer}}code{{background:#1a2028;padding:1px 4px;border-radius:3px}}.verdict{{border-left:4px solid #7ee787;padding:6px 12px;background:#141a20}}li{{margin:3px 0}}</style></head><body>
<h1>Goalkeeper far-LATERAL dive — why fixtures 13 / 15 looked transported, the correction, and the arm-transition pass</h1>
<p class=note>Branch prototype/3d-animation-pipeline · continues the far-dive / reach safety fix (bounded flight, elbow protections — all preserved) · every capture at capability band COURTOIS (a fresh page; the surveys run the fixtures in page order, i.e. band K1, where fixture 15 is a bigger leap — vUp 3.45 m/s, pelvis apex 1.68 m, arrival 4.5 m/s — so both regimes are covered) · media 2× nearest-neighbour · simulation is authoritative throughout; animation ON / OFF neutrality is re-gated below.</p>
<p class=note><b>Second pass (arm transition)</b>: the body / root / landing correction below is preserved unchanged; the arm-through-abdomen collapse at load / take-off is diagnosed and corrected in <a href="#arm">§9</a>, with a new self-collision gate.</p>
<div class=verdict><b>Verdict.</b> The authored V6 far dive DOES contain a complete lateral lifecycle (load → plant → push → toe-off → flight → full extension, pelvis +0.48 m lateral / +0.30 m up, roll to −72°, bent trailing leg, landing keys). Fixtures 13 and 15 were not starved of authored geometry — four <i>procedural</i> layers, each individually reasonable for the approved high-dive regime, combined badly once the committed body axis passed ~60° from vertical:
<ol><li><b>axis redirect</b>: <code>lerp(authoredRoll, −θ, |authoredRoll|/72)</code> adds up to 72·f·(1−f) ≈ 18° of extra roll in the MIDDLE of the push for any θ — harmless when θ &lt; 72° (fixtures 2, 42: it <i>reduces</i> roll), but for θ ≥ 70° it laid the trunk almost flat (toe-off roll −63° / −67° vs the authored −51° / −49°) while the feet were still on the ground → a horizontal body that then translates with the simulation root: the "transported plank".</li>
<li><b>torso assist</b>: bent the spine up to −20° toward an UNREACHABLE hand target at full extension (fixture 15) — the numeric-residual minimisation the brief warned about; it cancelled the authored trunk inclination exactly at the reach.</li>
<li><b>landing tempo</b>: the authored impact / absorb durations (0.14 s + 0.30 s) were applied to a hip arriving at 3–4.5 m/s from 0.66 m → the pelvis floated down over 0.44 s (IMPACT → SETTLE 27 ticks) instead of the ~0.25 s a braced stop takes.</li>
<li><b>glove IK through the landing</b> (found by the survey after the first three fixes): the reach IK kept fading for 0.35 s after the execution end, pulling the arm toward a target 1–2 m away while the body was already on its side — with the trunk no longer bent toward the target, the elbow folded to its 30° limit during ABSORB and its bend plane flipped (fixtures 13 / 14 / 15 / 39 / 40 on the survey page). The reach is over at the execution end; the landing arm is authored.</li></ol>
The launch itself was <i>not</i> the defect: the flat arc (vUp ≈ 2 m/s, pelvis peak ≈ 1.0 m) is the geometry the simulation's target dictates (hip = target − 0.64·H along a 70–78° axis ≈ 1.0 m). Decision taken: <b>correct the procedural layers conservatively in a new, explicitly gated far-lateral regime</b> (body axis ≥ sideLandHi 60°, FAR_DIVE only, decided once at the commit) — <b>no new authored clip</b>, no root / torso / IK escalation. Fixture 2, fixture 42 (V6) and every fixture below the regime are byte-identical.</div>
<h2>1. Diagnosis — each layer measured independently (Courtois, band COURTOIS)</h2>
<p>Per-tick probe (<code>verification/probe_layers.js</code>): authored keys + simulation root only → + axis redirect → + launch / landing plan → + torso assist → + glove IK (final). Numbers below are the committed axis, the launch, the pelvis roll at three authored keys (authored → resolved, BEFORE on the first line / AFTER on the second), the torso assist and the landing stage ticks.</p>
{diag}
<h3>Per-tick layer plots (before / after) — pelvis height by layer, lateral travel (simulation root vs presentation), pelvis roll by layer, torso assist / IK residual / feet</h3>
<div class=row>{''.join(f'<figure><img src="media/plots/layers_{fx}_{w}.svg" style="max-width:940px"><figcaption>fixture {fx} — {w.upper()}</figcaption></figure>' for fx in ("15", "13", "2") for w in ("before", "after"))}</div>
<h3>The resolver layers switched on one at a time (fixture 15, then the control fixture 2)</h3>
<p class=note>Row 1 is the authored V6 motion on the simulation root with every procedural layer off — the geometry that exists. Rows 2–5 add the axis redirect, the launch / landing plan, the torso assist and the glove IK. Fixture 15 rows 2–5 are the corrected code; fixture 2 is unchanged by it.</p>
{media("15", "layers")}{media("15", "authgif", 440, "fixture 15 — authored V6 keys + simulation root only, ¼ speed")}
{media("2", "layers")}{media("2", "authgif", 440, "fixture 2 — authored only, ¼ speed")}
<h2>2. The correction (gk_graph.js — far-lateral regime, gated)</h2>
<ul>
<li><b>Regime</b>: <code>state.lateral</code> is decided ONCE per commit from the committed target's body axis: FAR_DIVE and wSide = 1 (θ ≥ sideLandHi = 60°). It never switches mid-action. Below the regime nothing changes (fixtures 2 θ 50°, 42 θ 36°: identical manifests / captures). Master switch <code>GK_GRAPH.lateralRule</code> (review preset <code>before</code> = off).</li>
<li><b>Redirect roll (proportional)</b>: in the regime the pelvis roll is <code>−sign·min(θ, rollMax)·(|authoredRoll|/72)</code> — the authored roll <i>curve</i> scaled to the target axis, so the trunk inclines in the authored proportion (most of it in flight) instead of lerping toward the full axis during the push. Spine / chest scaling and the pelvis position lerp are unchanged.</li>
<li><b>Torso assist</b>: 0 in the regime (spine / chest bend and clavicle assist toward the hand target). The reach is the arm's; a miss keeps its residual. Outside the regime the ±20° assist is unchanged.</li>
<li><b>Landing tempo</b>: in the regime the hip is stopped by ONE uniform deceleration from the arrival vertical speed to rest at the ground height (a = v²/2Δh, T = 2Δh/v); the impact / absorb split is where that profile crosses the impact height and the stage-boundary velocity is the profile's own (vMid = −v<sub>impact</sub>), so the two hermite stages reproduce the quadratic exactly — no velocity kink, no per-tick jump (the continuity assertion stays silent at a 4.5 m/s arrival). Only ever faster than the authored tempo; a slow arrival keeps the authored durations. Not applied to the low-arrival branch.</li>
<li><b>Glove IK fade</b>: in the regime the reach IK is faded out between the execution end and the IMPACT stage (min 0.12 s) instead of the flat 0.35 s — the arm is released from the (missed) target as the body comes down and the authored landing keys place it (bridge / brace). Held-ball catches keep IK weight 1.</li>
<li>Everything from the safety fix stays: bounded post-exec flight (flightCap), 30° elbow fold limit, FK elbow limit, contact rules, no RNG, no ball parenting.</li></ul>
<h2>3. Fixture 15 — BEFORE vs AFTER (Courtois)</h2>
{media("15", "BA")}
<div class=row>{media("15", "Abefore", 500, "BEFORE — gameplay")}{media("15", "A", 500, "AFTER — gameplay")}</div>
<div class=row>{media("15", "Bbefore", 440, "BEFORE — close, normal speed")}{media("15", "B", 440, "AFTER — close, normal speed")}{media("15", "Cbefore", 440, "BEFORE — ¼ speed")}{media("15", "C", 440, "AFTER — ¼ speed")}</div>
{media("15", "TESTBA")}
<h2>4. Fixture 13 — BEFORE vs AFTER (Courtois)</h2>
{media("13", "BA")}
<div class=row>{media("13", "Bbefore", 440, "BEFORE — close, normal speed")}{media("13", "B", 440, "AFTER — close, normal speed")}{media("13", "Cbefore", 440, "BEFORE — ¼ speed")}{media("13", "C", 440, "AFTER — ¼ speed")}</div>
{arm_section.build(arm_made)}
<h2>5. Test matrix — A gameplay / B close / C slow / D key phases / E diagnostic</h2>
{matrix}
{case_block("15", "fixture 15 — rocket top corner, UNREACHABLE (right)", S15)}
{case_block("13", "fixture 13 — legal under-bar top corner, unreachable (right)", S13)}
{case_block("2", "fixture 2 — high corner (CONTROL: below the regime, UNCHANGED)", S2, media("2", "vs15", None, "fixture 2 control — key phases (unchanged code path; compare with the fixture 15 strip above)"))}
{case_block("42", "fixture 42 — V6 reference far dive (FROZEN, byte-identical manifest)", summ(LX.get("42")))}
{case_block("14", "fixture 14 — medium-height far side (lateral regime, unreachable)", summ(LX.get("14")))}
{case_block("39", "fixture 39 — fingertip deflection (genuinely REACHABLE far corner, contact)", summ(LX.get("39")))}
{case_block("a2_0", "reachable far corner RIGHT (lat +1.8, z 1.2, 19 m/s) — contact", summ(L2.get("adhoc0")))}
{case_block("a2_1", "reachable far corner LEFT (mirror) — contact", summ(L2.get("adhoc1")))}
{case_block("a2_2", "near-max reach RIGHT (lat +2.1, z 1.4, 19 m/s) — contact", summ(L2.get("adhoc2")))}
{case_block("a2_3", "near-max reach LEFT (mirror) — contact", summ(L2.get("adhoc3")))}
{case_block("a2_8", "beyond reach, fast RIGHT (lat +2.2, z 1.2, 21 m/s)", summ(L2.get("adhoc8")))}
{case_block("a2_9", "beyond reach, fast LEFT (mirror)", summ(L2.get("adhoc9")))}
{case_block("a1_6", "fixture-15-like mirror LEFT (lat −1.9, z 1.45, 22 m/s) — unreachable", summ(L1.get("adhoc6")))}
{case_block("adv8", "SW-facing wide RIGHT high (lat +2.6, z 2.6, 22 m/s) — angled facing, so the close rig shows the lateral travel as WIDTH (the straight-facing cases above show it as depth)", summ(LADV.get("adhoc8")))}
{case_block("adv9", "SW-facing wide LEFT high (mirror)", summ(LADV.get("adhoc9")))}
<h3>Shared test rig (H 1.83)</h3>
<div class=row>{media("15", "TEST", 440, "fixture 15 — test rig, normal speed")}{media("13", "TEST", 440, "fixture 13 — test rig")}{media("2", "TEST", 440, "fixture 2 — test rig")}</div>
{media("15", "TESTstrip")}{media("13", "TESTstrip")}{media("2", "TESTstrip")}
<h2>6. Authored vs procedural — what the far-lateral lifecycle covers and its safe envelope</h2>
<table><tr><th>dimension</th><th>authored (V6 clip GK_CLIP_FAR_DIVE, mirrored L/R)</th><th>procedural (resolver)</th><th>safe range / behaviour beyond</th></tr>
<tr><td>direction (side)</td><td>right; mirrored for left (frozen per commit)</td><td>world facing from the simulation; body axis sign from the committed target</td><td>any facing; the mirror is exact (matrix: L/R pairs)</td></tr>
<tr><td>body-axis angle θ (from vertical)</td><td>roll curve to −72° at full extension</td><td>redirect: θ &lt; 60° blends feet/side landing (approved high-dive rule); θ ≥ 60° LATERAL regime: roll = θ·(authored fraction), capped at rollMax (LOW_DIVE 82°; FAR_DIVE none)</td><td>35–60° blend, 60–90° lateral; θ &gt; 90° (ball below the hip) is classified LOW → LOW_DIVE / LOW_COLLAPSE by the motion selector</td></tr>
<tr><td>height / pelvis</td><td>+0.30 m rise at full extension</td><td>axis solve: pelvis = target − 0.64·H·d, clamped to [0.30 m, hip + 0.55·launch]; launch arc through it (bounded post-exec)</td><td>target heights 0.9–2.6 m produce pelvis 0.9–1.56 m; the ceiling is the jump cap, above it the reach is the arm's only</td></tr>
<tr><td>shoulder reach / hand placement</td><td>arms along the body axis at full extension</td><td>glove IK to the SIMULATION hand target (weight ramps in flight), elbow fold ≥ 30°, clavicle assist (0 in the lateral regime)</td><td>reachable: contact at the sim's contact tick; unreachable: the hand stops short by the sim's miss (residual 0.2–0.6 m on the matrix) — <b>not</b> chased</td></tr>
<tr><td>torso inclination</td><td>trunk tilt 64 → 100° across the push / flight</td><td>spine / chest roll scaled by min(1.4, θ/72) in flight; torso assist ±20° toward the target (high-dive rule only; 0 in the lateral regime)</td><td>—</td></tr>
<tr><td>take-off</td><td>LOAD 0.00 / PLANT 0.10 / PUSH 0.19–0.26 / TOE_OFF 0.31 of the exec window</td><td>authored crouch is kept (feet planted) until launchPos; the launch plan takes over the pelvis from toe-off</td><td>exec windows 0.15–0.75 s on the matrix; very short windows (&lt; 0.2 s, late commits) compress the push — sim-authoritative</td></tr>
<tr><td>landing</td><td>postSide keys FOLLOW → DESCENT → TOUCH → IMPACT → ABSORB → SETTLE → BRACE → PUSH_UP → HALF_KNEEL → CROUCH</td><td>side plan: touch / impact / ground heights, slide deceleration, fall-timed impact / absorb (lateral regime), get-up chain, reposition steps to the sim root</td><td>landing side = the measured landed side; the hip never dips below the ground height</td></tr></table>
<h2>7. Regression</h2>
{gate_summary}{mantab}{survtab()}
<h3>Dive instrumentation — every dive fixture and the 14 adversarial shots, HEAD → now, both rigs</h3>{divetab()}
<details><summary>gate tables</summary>{md_table(gateAll)}{md_table(gateDist)}</details>
<h2>8. Answers</h2>
<ol>
<li><b>Why 13 / 15 looked transported</b>: the redirect lerp rotated the trunk to ~65° of roll before toe-off (feet still planted), the flat-but-correct launch then translated that near-horizontal body with the simulation root, the torso assist folded the spine toward an unreachable target at the reach, and the landing floated the hip down on the authored tempo. Rigid body + translation + slow sink = "transported".</li>
<li><b>Which layer</b>: resolver (redirect timing) + torso assist + landing plan tempo + the post-execution IK fade. Not the authored motion, not the launch-root magnitude (the arc is what the sim target dictates), not IK solving as such, not retargeting (the shared test rig shows the same numbers scaled by H).</li>
<li><b>Did an appropriate far-lateral lifecycle exist?</b> Yes — V6's pre keys are a lateral dive (pelvis +0.48 m lateral, roll −72°, trailing leg bent); the defects were in how it was redirected past 60°.</li>
<li><b>What was added</b>: a gated far-lateral regime (proportional roll, no target-bending assist, uniform-deceleration landing, IK released by the impact) + review instrumentation (layer probe, layer-isolation presets, <code>before</code> preset, <code>--band</code>). No new authored clip. ~30 lines in gk_graph.js, every rule behind <code>state.lateral</code>.</li>
<li><b>Authored vs procedural</b>: table in §6.</li>
<li><b>Safe redirection / reach limits</b>: θ 35–60° blend, 60–90° lateral regime, pelvis ceiling hip + 0.55 m, reach 0.64·H, elbow ≥ 30°, torso assist 0 (lateral) / ±20° (high).</li>
<li><b>Beyond the limits</b>: θ &gt; 90° → LOW motions; target beyond reach → the hand stops short by the simulation's miss and the body completes the lateral lifecycle; heights above the jump cap → arm-only reach.</li>
<li><b>Courtois</b>: performs the same lifecycle at H 2.014 (matrix rows), contact ticks unchanged.</li>
<li><b>Neutrality gates</b>: all identical (sprite / off / test rig / Courtois), manifests byte-identical, no RNG, ball untouched.</li></ol>
</body></html>"""
open(f"{R}/GK_FAR_LATERAL_REVIEW.html", "w").write(page); print("page", len(page))
