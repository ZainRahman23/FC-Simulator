"""RECEIVING + PASSING V1 — build the review page from the final probe dumps, the gates, the body matrix and the media.
    python3 of_rp_review.py <final dir> <out dir> [<v1.1 dir> <v1 attribution dir> v11]
"""
import sys, os, json, html

F, OUT = sys.argv[1], sys.argv[2]
IMG = os.path.join(OUT, "img"); os.makedirs(IMG, exist_ok=True)
G = json.load(open(os.path.join(F, "g_on", "probe.json")))["results"]
MX = json.load(open(os.path.join(F, "matrix.json")))
rd = lambda p: open(os.path.join(F, p)).read() if os.path.exists(os.path.join(F, p)) else "(missing)"
PERF = {n: json.load(open(os.path.join(F, "..", f"perf_{n}.json"))) for n in (2, 6, 22) if os.path.exists(os.path.join(F, "..", f"perf_{n}.json"))}
cm = lambda v: "-" if v is None else f"{v * 100:.1f}"
esc = html.escape

def media(scen, cap):
    out = []
    for kind in ("normal", "slow0", "slow1", "slow2"):
        f = f"{scen}_{kind}.webp"
        if os.path.exists(os.path.join(IMG, f)): out.append(f'<figure><img loading="lazy" src="img/{f}" alt="{esc(scen)} {kind}"><figcaption>{"normal speed (real time, gameplay camera)" if kind == "normal" else "0.25x slow motion around contact " + kind[-1] + " (close camera)"}</figcaption></figure>')
    for i in range(3):
        f = f"{scen}_strip{i}.jpg"
        if os.path.exists(os.path.join(IMG, f)): out.append(f'<figure><img loading="lazy" src="img/{f}" alt="{esc(scen)} strip"><figcaption>every 4th tick from 24 ticks before to 20 after contact {i} (close camera)</figcaption></figure>')
    return f'<h3>{esc(cap)}</h3><div class="grid">' + "".join(out) + "</div>" + rec_table(scen)

def rec_table(scen):
    r = G.get(scen)
    if not r: return ""
    rows = []
    for x in r["recv"]:
        s = x["sim"]
        rows.append(f"<tr><td>reception</td><td>{x['tick']}</td><td>{esc(x['name'])} ({esc(x['char'])})</td><td>{x['foot']}</td><td>{x['style']}</td><td class='{'ok' if x['outcome']=='CLEAN' else 'warn'}'>{x['outcome']}</td><td>{cm(x['surf'])}</td><td>{cm(x['reachApplied'])}</td><td>{'standing' if x['standing'] else 'moving'} · plant {x['plantMode']}{' locked' if x['plantContact'] else ''}</td><td>{s['rv']:.1f}</td><td>{'stretch' if s['stretch'] else ''}</td></tr>")
    for x in r["pass"]:
        rows.append(f"<tr><td>{x['kind'].lower()}</td><td>{x['tick']}</td><td>{esc(x['name'])} ({esc(x['char'])})</td><td>{x['foot']}</td><td>{x['fam']} / {x['tech']}</td><td>{x['v0']} m/s</td><td>{cm(x['surf'])}</td><td>{cm(x['reachApplied'])}</td><td>plant {x['plantMode']}{' locked' if x['plantContact'] else ''}</td><td>{x['speed']}</td><td>{x['surfName']}</td></tr>")
    ev = [e for e in r["events"] if e["kind"] in ("OUT_OF_REACH", "LOOSE")]
    extra = f"<p class='dim'>other simulation events: {esc(', '.join(e['kind'] + '@' + str(e['tick']) for e in ev))}</p>" if ev else ""
    if not rows: return "<p class='dim'>no contact — " + esc(", ".join(e["kind"] + "@" + str(e["tick"]) for e in r["events"])) + "</p>"
    return ("<table><thead><tr><th>contact</th><th>tick</th><th>player</th><th>foot</th><th>kind</th><th>outcome / v0</th><th>boot–ball cm</th><th>reach cm</th><th>body</th><th>rel. speed / own speed</th><th></th></tr></thead><tbody>"
            + "".join(rows) + "</tbody></table>" + extra)

mrows = "".join(f"<tr><td>{esc(r['body'])}</td><td>{r['recvN']}</td><td>{cm(r['recvMedian'])}</td><td>{cm(r['recvP95'])}</td><td>{cm(r['recvMax'])}</td><td>{r['passN']}</td><td>{cm(r['passMedian'])}</td><td>{cm(r['passP95'])}</td><td>{cm(r['passMax'])}</td><td>{r['passPlantLocked']}/{r['passN']}</td><td>{cm(r['slideMax'])}</td><td class='l'>{esc(json.dumps(r['outcomes']))}</td></tr>" for r in MX["rows"])
prow = "".join(f"<tr><td>{n}</td><td>{d['chars']}</td><td>{d['sim']['mean']:.3f} / {d['sim']['p95']:.2f}</td><td>{d['plan']['mean']:.3f} / {d['plan']['p95']:.2f}</td><td>{d['presentation']['mean']:.2f} / {d['presentation']['p95']:.2f}</td><td>{d['render']['mean']:.1f}</td></tr>" for n, d in PERF.items())
def pops():
    try:
        A = json.load(open(os.path.join(F, "mx_gabriel", "probe.json")))["results"]; B = json.load(open(os.path.join(F, "mxoff_gabriel", "probe.json")))["results"]
    except Exception: return ""
    rows = []
    for sc in B:
        for rec in A[sc]["recv"]:
            pid, c = rec["pid"], rec["tick"]
            w = lambda r, a, b, j: [row[j + 3 * pid] for row in r["pres"] if c + a <= row[0] <= c + b]
            rows.append(f"<tr><td>{sc}</td><td>{c}</td><td>{rec['foot']} {rec['style']}</td><td>{max(w(A[sc], -30, 60, 1)) * 100:.1f}</td><td>{max(w(B[sc], -30, 60, 1)) * 100:.1f}</td><td>{max(w(A[sc], -30, 60, 2)) * 100:.1f}</td></tr>")
    return ("<p>Worst per-tick pop (change of a joint's per-tick displacement, root frame — the Locomotion V1 discontinuity metric) on the receiver in the window 0.5 s before to 1 s after each contact, Gabriel, with the receiving layer ON and with it switched OFF (same authoritative motion: the control shows what the locomotion itself does in that window). Plant slide = worst planted-foot slide while in contact.</p>"
            "<table><thead><tr><th>fixture</th><th>contact tick</th><th>foot / kind</th><th>pop ON cm/tick</th><th>pop OFF (control)</th><th>plant slide ON cm</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>")
body = open(os.path.join(os.path.dirname(__file__), "of_rp_review_body.html")).read()
body = body.replace("{{MATRIX}}", mrows).replace("{{PERF}}", prow)
body = body.replace("{{GATE_ONOFF}}", esc(rd("gate_onoff.txt"))).replace("{{GATE_DET}}", esc(rd("gate_det.txt"))).replace("{{GATE_BASE}}", esc(rd("gate_baseline.txt"))).replace("{{MATRIX_TXT}}", esc(rd("matrix.txt"))).replace("{{POPS}}", pops())
import re
body = re.sub(r"\{\{MEDIA:([a-z_A-Z]+)\|([^}]*)\}\}", lambda m: media(m.group(1), m.group(2)), body)
if len(sys.argv) > 5:                                                                       # V1.1 section: <v11 dir> <attribution dir>
    import importlib.util
    spec = importlib.util.spec_from_file_location("v11", os.path.join(os.path.dirname(__file__), "of_rp_review_v11.py")); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    V = sys.argv[3]
    body = body.replace("{{V11}}", m.section(V, sys.argv[4], F))
    rv = lambda p: esc(open(os.path.join(V, p)).read()) if os.path.exists(os.path.join(V, p)) else "(missing)"
    body = body.replace("{{V11_V1}}", rv("gate_v1_vs_v11.txt")).replace("{{V11_ONOFF}}", rv("gate_onoff.txt")).replace("{{V11_DET}}", rv("gate_det.txt")).replace("{{V11_BASE}}", rv("gate_baseline.txt"))
    body = body.replace("{{V11_REMAIN}}", open(os.path.join(V, "remaining.html")).read() if os.path.exists(os.path.join(V, "remaining.html")) else "")
open(os.path.join(OUT, "index.html"), "w").write(body)
print("wrote", os.path.join(OUT, "index.html"))
