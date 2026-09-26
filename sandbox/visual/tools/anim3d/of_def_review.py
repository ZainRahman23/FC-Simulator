"""DEFENDING V1 — builds review_artifacts/defending_v1/index.html from the gate outputs (of_def_gates.sh) and the review media.
    python3 of_def_review.py <gates dir> <media dir (img/ inside the review folder)> <out html>
Every number on the page is read from the runs; nothing is typed in by hand except the prose."""
import sys, json, os, subprocess, statistics
from collections import Counter

G, M, OUT = sys.argv[1:4]
AO = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
GB, MV = AO("--before"), AO("--views")   # V1.1: the committed-V1 gate run (before) and the slide review media
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda p: json.load(open(os.path.join(G, p)))
def run(*a):
    r = subprocess.run(["node"] + list(a), cwd=HERE, capture_output=True, text=True); return (r.stdout + r.stderr).strip()
esc = lambda s: str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
cm = lambda v: "-" if v is None else f"{v * 100:.1f}"
def verdict(txt): return f'<span class="{"ok" if ("PASS" in txt or "IDENTICAL" in txt) and "FAIL" not in txt and "DIFF" not in txt else "bad"}">{esc(txt)}</span>'

# ── gates ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
g_base = run("of_rp_baseline.js", "--compare", f"{G}/base_tag.json", f"{G}/base_head.json").splitlines()
g_sq = run("of_rp_regress.js", f"{G}/sq_tag/probe.json", f"{G}/sq_head/probe.json").splitlines()
g_sqp = run("of_def_presdiff.js", f"{G}/sq_tag/probe.json", f"{G}/sq_head/probe.json").splitlines()
g_ap = run("of_def_tracediff.js", f"{G}/ap_tag.json", f"{G}/ap_head.json").splitlines()
g_onoff = run("of_rp_regress.js", f"{G}/def_on/probe.json", f"{G}/def_off/probe.json").splitlines()
g_det = run("of_rp_regress.js", f"{G}/def_on/probe.json", f"{G}/def_on2/probe.json").splitlines()
g_ssg = run("of_def_tracediff.js", f"{G}/ssg_on.json", f"{G}/ssg_off.json").splitlines()
g_ssgd = run("of_def_tracediff.js", f"{G}/ssg_on.json", f"{G}/ssg_on2.json").splitlines()
g_demo = run("of_def_tracediff.js", f"{G}/demo_on.json", f"{G}/demo_off.json").splitlines()

g_d1 = [run("of_rp_regress.js", f"{G}/d1_def/probe.json", f"{G}/def_on/probe.json").splitlines(), run("of_def_tracediff.js", f"{G}/d1_ssg.json", f"{G}/ssg_on.json").splitlines(), run("of_def_tracediff.js", f"{G}/d1_demo.json", f"{G}/demo_on.json").splitlines()] if os.path.exists(f"{G}/d1_def/probe.json") else None

def slide_diag():
    if not MV: return ""
    rows = [("hips: yaw off square to the travel (0° = square) / roll (+ = tucked side down)", lambda g: f'{180 - abs(g["hipYaw"]):.0f}° / {abs(g["hipRoll"]):.0f}°'),
            ("trunk pitch (− = leaning back) / chest yaw", lambda g: f'{g["trunkPitch"]:.0f}° / {g["chestYaw"]:.0f}°'),
            ("tackling knee included angle", lambda g: None), ("trailing knee included angle", lambda g: None),
            ("tackling sole normal: forward component (studs at the ball)", lambda g: None), ("knee separation / foot separation (m)", lambda g: f'{g["kneeSep"]:.2f} / {g["footSep"]:.2f}'),
            ("trailing ankle: ahead of the pelvis (m) — a second foot forward?", lambda g: None), ("lowest body parts (on the pitch)", lambda g: ", ".join(x.split(":")[0] for x in g["lowest"][:4]))]
    h = '<table><thead><tr><th class="l">at the contact tick (tick 67)</th><th class="l">V1, left foot</th><th class="l">V1.1, left foot</th><th class="l">V1, right foot</th><th class="l">V1.1, right foot</th></tr></thead><tbody>'
    cells = {}
    for var in ["views_old", "views_new"]:
        for scen in ["sl_win", "sl_left"]:
            v = json.load(open(os.path.join(MV, var, "views.json")))["all"][scen]["67"]; g = v["diag"]; sd = v["foot"]; tr = "R" if sd == "L" else "L"
            cells[(var, scen)] = {0: rows[0][1](g), 1: rows[1][1](g), 2: f'{g["knee" + sd]:.0f}°', 3: f'{g["knee" + tr]:.0f}°', 4: f'{g["sole" + sd]["fwd"]:+.2f}', 5: rows[5][1](g), 6: f'{g["ankle" + tr][0]:+.2f}', 7: rows[7][1](g)}
    for i, (name, _) in enumerate(rows):
        h += f'<tr><td>{name}</td>' + "".join(f'<td class="l">{cells[(var, scen)][i]}</td>' for scen in ["sl_win", "sl_left"] for var in ["views_old", "views_new"]) + "</tr>"
    return h + "</tbody></table>"

def slide_res():
    if not GB: return ""
    def fx(gdir):
        P2 = json.load(open(os.path.join(gdir, "def_on/probe.json")))["results"]; out = {}
        for k in ["sl_win", "sl_left", "sl_loose"]:
            d = P2[k].get("def") or []; out[k] = d[0] if d else None
        D2 = json.load(open(os.path.join(gdir, "demo_on.json")))["out"]
        for k in ["slide_win", "slide_miss"]:
            out[k] = [r["residual"] for r in D2[k]["demoResults"] if r.get("residual") and r.get("tackle") and r["tackle"].get("out") != "MISS"]
        return out
    B, A = fx(GB), fx(G)
    h = '<table><thead><tr><th class="l">slide contact</th><th>V1 rendered leg–ball (cm)</th><th>V1 tackling knee°</th><th>V1.1 rendered leg–ball (cm)</th><th>V1.1 tackling knee°</th><th class="l">outcome (identical)</th></tr></thead><tbody>'
    for k in ["sl_win", "sl_left", "sl_loose"]:
        b, a = B[k], A[k]
        h += f'<tr><td>{k}</td><td>{cm(b["legSurf"]) if b else "-"}</td><td>{b["knee"] if b else "-"}</td><td>{cm(a["legSurf"]) if a else "-"}</td><td>{a["knee"] if a else "-"}</td><td class="l">{a["out"] if a else "-"}</td></tr>'
    for k in ["slide_win", "slide_miss"]:
        b, a = B[k], A[k]; f = lambda L: f'{statistics.median(x["leg"] * 100 for x in L):.1f} median, {min(x["leg"] * 100 for x in L):.1f} … {max(x["leg"] * 100 for x in L):.1f}' if L else "-"
        kn = lambda L: f'{statistics.median(x["knee"] for x in L):.0f}' if L else "-"
        h += f'<tr><td>demo {k} ({len(a)} contacts)</td><td>{f(b)}</td><td>{kn(b)}</td><td>{f(a)}</td><td>{kn(a)}</td><td class="l">identical traces (gate 6)</td></tr>'
    return h + "</tbody></table><p class=\"dim\">leg–ball: the rendered shin and boot capsules against the ball surface at the authoritative contact tick (negative = the capsule overlaps the ball). V1.1 lays the leg along the simulation's leg line: it touches, sometimes overlaps by a few centimetres, and never floats short, with the knee bent (≈160°, not locked straight).</p>"

# ── defending fixtures ───────────────────────────────────────────────────────────────────────────────────────────────────────
P = J("def_on/probe.json")["results"]
def tackle_rows(prefix):
    rows = []
    for k, r in P.items():
        if not k.startswith(prefix): continue
        tk = [e for e in r["events"] if e["kind"] == "TACKLE"]; bc = [e for e in r["events"] if e["kind"] == "TACKLE_BODY_CONTACT"]
        d = r.get("def") or []
        for e in tk:
            m = next((x for x in d if x["tick"] == e.get("contactTick") or x["tick"] == e["tick"]), None)
            rows.append((k, e, m, bc, r["chars"][1] if len(r["chars"]) > 1 else "-"))
        if not tk: rows.append((k, None, None, bc, r["chars"][1] if len(r["chars"]) > 1 else "-"))
    return rows

def stand_table():
    h = '<table><thead><tr><th class="l">fixture</th><th class="l">defender</th><th>foot</th><th class="l">outcome</th><th>hip–ball (m)</th><th>reach (m)</th><th>along</th><th>exposure</th><th>q</th><th>from behind</th><th>rel. v</th><th>rendered inside-face–ball (cm)</th><th>rendered leg–ball (cm)</th><th>tackling knee°</th><th>support plant</th></tr></thead><tbody>'
    for k, e, m, bc, ch in tackle_rows("st_") + [x for x in tackle_rows("jk_") if x[1] and x[1]["type"] == "STAND"]:
        if not e: h += f'<tr><td>{k}</td><td class="l">{ch}</td><td colspan="13" class="l dim">no challenge issued (the ball never came within the fixture\'s trigger distance)</td></tr>'; continue
        out = e["out"] + (f' ({e["why"]})' if e.get("why") else "")
        cls = "ok" if e["out"] == "WON" else "warn" if e["out"] in ("POKE", "BEATEN") else "bad"
        h += (f'<tr><td>{k}</td><td class="l">{ch}</td><td>{e["foot"]}</td><td class="l {cls}">{out}</td><td>{e.get("dh", "-")}</td><td>{e.get("reach", "-")}</td><td>{e.get("along", "-")}</td>'
              f'<td>{e.get("expose") if e.get("expose") is not None else "-"}</td><td>{e.get("q") if e.get("q") is not None else "-"}</td><td>{"yes" if e.get("behind") else "no" if e.get("behind") is not None else "-"}</td><td>{e.get("relV", "-")}</td>'
              f'<td>{cm(m["insideSurf"]) if m else "-"}</td><td>{cm(m["legSurf"]) if m else "-"}</td><td>{m["knee"] if m else "-"}</td><td>{(m["plantMode"] or "-") + (" locked" if m and m["plantContact"] else "") if m else "-"}</td></tr>')
    return h + "</tbody></table>"

def slide_table():
    h = '<table><thead><tr><th class="l">fixture</th><th class="l">defender</th><th>foot</th><th class="l">outcome</th><th>launch v0</th><th>slide v at contact</th><th>distance slid (m)</th><th>contact tick</th><th>leg point</th><th>q</th><th>from behind</th><th class="l">body contact</th><th>closest miss (m)</th><th>rendered leg–ball (cm)</th><th>tackling knee°</th></tr></thead><tbody>'
    for k, e, m, bc, ch in tackle_rows("sl_"):
        if not e: h += f'<tr><td>{k}</td><td class="l">{ch}</td><td colspan="13" class="l dim">no slide issued (the fixture\'s trigger distance was never reached)</td></tr>'; continue
        st = next((x for x in P[k]["events"] if x["kind"] == "TACKLE_START"), {})
        out = e["out"]; cls = "ok" if out == "WON" else "warn" if out in ("POKE", "GLANCE") else "bad"
        body = ", ".join(f'tick {b["tick"]} ({"after the ball" if b["ballFirst"] else "MAN FIRST"})' for b in bc) or "none"
        h += (f'<tr><td>{k}</td><td class="l">{ch}</td><td>{e["foot"]}</td><td class="l {cls}">{out}</td><td>{st.get("v0", "-")}</td><td>{e.get("slideV", "-")}</td><td>{e.get("slideDist", "-")}</td><td>{e.get("contactTick") or "-"}</td>'
              f'<td>{e.get("legAt", "-")}</td><td>{e.get("q", "-")}</td><td>{"yes" if e.get("behind") else "no" if e.get("behind") is not None else "-"}</td><td class="l">{body}</td><td>{e.get("minGap", "-")}</td><td>{cm(m["legSurf"]) if m else "-"}</td><td>{m["knee"] if m else "-"}</td></tr>')
    return h + "</tbody></table>"

def jockey_table():
    h = '<table><thead><tr><th class="l">fixture</th><th class="l">defender</th><th class="l">attacker does</th><th>ticks jockeying</th><th>mean speed (m/s)</th><th>max speed</th><th>facing error to carrier, mean°</th><th>distance to ball: min / mean (m)</th><th class="l">challenge</th></tr></thead><tbody>'
    notes = {"jk_stationary": "stands on the ball", "jk_walk": "walks at him", "jk_dribble": "jogs at him (dribbling)", "jk_lateral": "walks, then cuts right, then left",
             "jk_accel": "walks, then sprints past", "jk_to_tackle": "walks at him; he tackles when it is close", "jk_to_sprint": "walks, then sprints; he releases the jockey and sprints"}
    import math
    for k in [x for x in P if x.startswith("jk_")]:
        tr = P[k]["trace"]; n = 0; sp = []; fe = []; db = []
        for row in tr:
            bx, by = row[1], row[2]; ax, ay = row[8], row[9]; dx, dy, dvx, dvy, df = row[13], row[14], row[15], row[16], row[17]
            v = math.hypot(dvx, dvy); sp.append(v); db.append(math.hypot(bx - dx, by - dy))
            want = math.atan2(ay - dy, ax - dx); e = abs((df - want + math.pi * 3) % (2 * math.pi) - math.pi); fe.append(math.degrees(e))
        tk = [e for e in P[k]["events"] if e["kind"] == "TACKLE"]
        h += f'<tr><td>{k}</td><td class="l">{P[k]["chars"][1]}</td><td class="l">{notes.get(k, "")}</td><td>{len(tr)}</td><td>{statistics.mean(sp):.2f}</td><td>{max(sp):.2f}</td><td>{statistics.mean(fe):.1f}</td><td>{min(db):.2f} / {statistics.mean(db):.2f}</td><td class="l">{", ".join(e["type"] + " " + e["out"] for e in tk) or "none"}</td></tr>'
    return h + "</tbody></table>"

def foul_table():
    h = '<table><thead><tr><th class="l">fixture</th><th class="l">type</th><th class="l">outcome</th><th>ball contact tick</th><th>opponent contact tick</th><th class="l">order</th><th>from behind</th><th>closing speed (m/s)</th><th>q (tq)</th><th class="l">location (attacker)</th></tr></thead><tbody>'
    for k, r in P.items():
        tk = [e for e in r["events"] if e["kind"] == "TACKLE"]; bc = [e for e in r["events"] if e["kind"] == "TACKLE_BODY_CONTACT"]
        for e in tk:
            if not bc and not e.get("oppContact"): continue
            oc = bc[0]["tick"] if bc else e.get("oppContactTick")
            touched = e.get("ballFirst") if e["type"] == "STAND" else e.get("contactTick") is not None
            bt = e.get("contactTick") if touched else None
            order = ("ball first" if (oc is None or bt <= oc) else "MAN FIRST") if touched else ("MAN, NO BALL" if oc else "-")
            e = dict(e, contactTick=bt, behind=e.get("behind") if e.get("behind") is not None else (bc[0].get("behind") if bc else None), relV=e.get("relV") if e.get("relV") is not None else (bc[0].get("relV") if bc else None), attacker=e.get("attacker") or (bc[0].get("attacker") if bc else None))
            h += f'<tr><td>{k}</td><td class="l">{e["type"]}</td><td class="l">{e["out"]}</td><td>{e.get("contactTick") or "-"}</td><td>{oc or "-"}</td><td class="l {"bad" if order.startswith("MAN") else ""}">{order}</td><td>{"yes" if e.get("behind") else "no" if e.get("behind") is not None else "-"}</td><td>{e.get("relV", "-")}</td><td>{e.get("q", "-")}</td><td class="l">{e.get("attacker")}</td></tr>'
    return h + "</tbody></table>"

# ── demos ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
D = J("demo_on.json")["out"]
def demo_table2():
    h = '<table><thead><tr><th class="l">pattern</th><th class="l">the input tries to…</th><th>attempts</th><th class="l">what the simulation decided (→ ball 1.5 s later)</th><th>rendered leg–ball (cm) median / max |·|</th><th>rendered inside-face–ball (cm) median</th></tr></thead><tbody>'
    for k, v in D.items():
        R = v["demoResults"]; c = Counter((r["result"], r["after"]["owner"]) for r in R)
        legs = [r["residual"]["leg"] * 100 for r in R if r.get("residual") and r["residual"].get("leg") is not None and r.get("tackle") and r["tackle"].get("out") not in ("MISS",)]
        ins = [r["residual"]["inside"] * 100 for r in R if r.get("residual") and r.get("tackle") and r["tackle"].get("out") not in ("MISS",)]
        res = "<br>".join(f"{n}× {esc(a)} → {esc(b)}" for (a, b), n in c.most_common())
        h += f'<tr><td>{k}</td><td class="l">{esc(R[0]["intent"]) if R else ""}</td><td>{len(R)}</td><td class="l">{res}</td><td>{(f"{statistics.median(legs):.1f} / {max(abs(x) for x in legs):.1f}") if legs else "-"}</td><td>{(f"{statistics.median(ins):.1f}") if ins else "-"}</td></tr>'
    return h + "</tbody></table>"

# ── small-sided proof ────────────────────────────────────────────────────────────────────────────────────────────────────────
S = J("ssg_on.json")["out"]; S_off = J("ssg_off.json")["out"]
def ssg_block():
    h = '<table><thead><tr><th class="l">drill</th><th>seconds</th><th>passes</th><th>receptions (clean / heavy-loose)</th><th>tackles: stand W/P/B/M</th><th>slides W/P/G/M</th><th>body contacts (man first)</th><th>possession changes</th><th>receptions of an opponent&#39;s ball (interceptions / recoveries)</th><th>line restarts</th></tr></thead><tbody>'
    chains = {}
    for k in ["D7", "D8", "D9"]:
        ev = S[k]["events"]; ctx = {}
        tk = [e for e in ev if e["kind"] == "TACKLE"]; st = Counter(e["out"] for e in tk if e["type"] == "STAND"); sl = Counter(e["out"] for e in tk if e["type"] == "SLIDE")
        rc = [e for e in ev if e["kind"] == "RECEPTION"]; bc = [e for e in ev if e["kind"] == "TACKLE_BODY_CONTACT"]
        team = {}; spec = {"D7": [0, 1], "D8": [0, 0, 1, 1], "D9": [0, 0, 0, 1, 1, 1]}[k]
        owner_team = 0; changes = 0; inter = 0; chain = []
        for e in ev:
            if e["kind"] == "POSSESSION" or (e["kind"] == "RECEPTION" and e.get("outcome") == "CLEAN"):
                tm = spec[e["pid"]]
                if tm != owner_team: changes += 1
                owner_team = tm
            if e["kind"] == "RECEPTION" and e.get("hostile"): inter += 1
            if e["kind"] in ("PASS", "RECEPTION", "TACKLE", "TACKLE_BODY_CONTACT", "LOOSE", "LINE", "OUT", "RESTART", "POSSESSION") and len(chain) < 60: chain.append(e)
        h += (f'<tr><td>{k}</td><td>{len(S[k]["trace"]) / 60:.0f}</td><td>{sum(1 for e in ev if e["kind"] == "PASS")}</td><td>{sum(1 for e in rc if e.get("outcome") == "CLEAN")} / {sum(1 for e in rc if e.get("outcome") != "CLEAN")}</td>'
              f'<td>{st["WON"]}/{st["POKE"]}/{st["BEATEN"]}/{st["MISS"]}</td><td>{sl["WON"]}/{sl["POKE"]}/{sl["GLANCE"]}/{sl["MISS"]}</td><td>{len(bc)} ({sum(1 for b in bc if not b["ballFirst"])})</td>'
              f'<td>{changes}</td><td>{inter}</td><td>{sum(1 for e in ev if e["kind"] in ("LINE", "OUT"))}</td></tr>')
        chains[k] = chain
    return h + "</tbody></table>", chains

def chain_html(k, chain, names):
    out = []
    for e in chain[:48]:
        who = names[e["pid"]] if e.get("pid") is not None else ""
        if e["kind"] == "PASS": s = f'{who} passes ({e.get("fam")}) → {names[e["to"]] if e.get("to") is not None else "space"}'
        elif e["kind"] == "RECEPTION": s = f'{who} first touch {e.get("outcome")}'
        elif e["kind"] == "POSSESSION": s = f'<b>{who} has the ball</b>'
        elif e["kind"] == "TACKLE": s = f'<b>{who} {e["type"].lower()} tackle → {e["out"]}</b>' + (f' ({e["why"]})' if e.get("why") else "") + (f' q {e["q"]}' if e.get("q") is not None else "")
        elif e["kind"] == "TACKLE_BODY_CONTACT": s = f'{who} slide meets {names[e["on"]] if e.get("on") is not None else "?"}\'s body ({"after the ball" if e["ballFirst"] else "man first"})'
        elif e["kind"] == "LOOSE": s = f'{who} loses it — ball loose'
        elif e["kind"] == "LINE": s = f'<b>{who} carries it over the line</b>'
        elif e["kind"] == "OUT": s = 'ball out of the box'
        elif e["kind"] == "RESTART": s = f'restart — team {"A" if e["team"] == 0 else "D"} ({names[e["owner"]]})'
        else: s = e["kind"]
        out.append(f'<li><span class="dim">{e["t"]:6.2f} s</span> {s}</li>')
    return "<ul class=\"chain\">" + "".join(out) + "</ul>"

ssg_tab, chains = ssg_block()
perf = {k: (S[k]["msPerTick"], S[k]["msMax"], S_off[k]["msPerTick"], S_off[k]["msMax"]) for k in S}

def media(name, cap, kind="strip"):
    p = os.path.join(M, name)
    if not os.path.exists(p): return f'<p class="dim">[missing media {esc(name)}]</p>'
    return f'<figure><img src="img/{name}" loading="lazy"><figcaption>{cap}</figcaption></figure>'

css = open(os.path.join(HERE, "of_def_review.css")).read()
body = open(os.path.join(HERE, "of_def_review_body.html")).read()
fill = {
    "{{GATE_BASE}}": verdict(g_base[-1]), "{{GATE_SQ}}": verdict(g_sq[-1]), "{{GATE_SQP}}": verdict(g_sqp[-1]), "{{GATE_AP}}": verdict(g_ap[-1]),
    "{{GATE_ONOFF}}": verdict(g_onoff[-1]), "{{GATE_DET}}": verdict(g_det[-1]), "{{GATE_SSG}}": verdict(g_ssg[-1]), "{{GATE_SSGD}}": verdict(g_ssgd[-1]), "{{GATE_DEMO}}": verdict(g_demo[-1]),
    "{{GATE_DETAIL}}": "<pre>" + esc("\n".join(g_ssg + [""] + g_demo + [""] + g_ap)) + "</pre>",
    "{{STAND_TABLE}}": stand_table(), "{{SLIDE_TABLE}}": slide_table(), "{{JOCKEY_TABLE}}": jockey_table(), "{{FOUL_TABLE}}": foul_table(),
    "{{DEMO_TABLE}}": demo_table2(), "{{SSG_TABLE}}": ssg_tab,
    "{{CHAIN_D8}}": chain_html("D8", chains["D8"], ["A1", "A2", "D1", "D2"]), "{{CHAIN_D9}}": chain_html("D9", chains["D9"], ["A1", "A2", "A3", "D1", "D2", "D3"]),
    "{{SLIDE_DIAG}}": slide_diag(), "{{SLIDE_RES}}": slide_res(),
    "{{GATE_D1}}": "".join(f'<tr><td>{n}</td><td class="l">{verdict(x[-1])}</td></tr>' for n, x in zip(["defending fixtures: Defending V1 (57c6539) vs the slide revision — authoritative trace + events", "small-sided 1v1 / 2v2 / 3v3: V1 vs V1.1", "auto defending demos: V1 vs V1.1"], g_d1)) if g_d1 else "",
    "{{PERF}}": "".join(f'<tr><td>{k}</td><td>{v[2]:.3f}</td><td>{v[3]:.2f}</td><td>{v[0]:.3f}</td><td>{v[1]:.2f}</td></tr>' for k, v in perf.items()),
}
for k, v in fill.items(): body = body.replace(k, v)
import re
body = re.sub(r"\{\{MEDIA:([^|}]+)\|([^}]*)\}\}", lambda m: media(m.group(1), m.group(2)), body)
open(OUT, "w").write(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Defending V1 Review</title><style>{css}</style></head><body><div class="wrap">{body}</div></body></html>')
print("wrote", OUT, os.path.getsize(OUT), "bytes")
