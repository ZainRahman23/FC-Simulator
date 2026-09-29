"""RECEIVING V1.1 — the transition-quality section of the Receiving + Passing review page.
Inputs (all probe dumps, same fixtures, Gabriel cast, per-joint pops recorded with --joints):
  <v11>/j_on      V1.1, receiving ON          <v11>/j_off   receiving OFF (the locomotion control)
  <v11>/j_v1      V1 (commit 565436d, served from a worktree), receiving ON
  <attr>/a_*      V1 layer attribution runs (off / pose / plants / reach / pairs / on) on the seven moving fixtures
  <v11>/matrix.json, <v1final>/matrix.json   7-body contact matrices;  gates in <v11>/gate_*.txt
"""
import json, os, html
esc = html.escape
PH = [("lead-in", -10, 0), ("hold", 1, 14), ("exit", 15, 60)]

def load(p):
    return json.load(open(os.path.join(p, "probe.json")))["results"]

def pj(R, sc, pid, c, a, b, names):
    m = [0.0] * len(names)
    for row in R[sc]["joints"]:
        if c + a <= row[0] <= c + b and row[1 + pid]:
            for j, v in enumerate(row[1 + pid]): m[j] = max(m[j], v)
    return m

def section(v11, attr, v1final):
    ON, OFF, V1 = load(os.path.join(v11, "j_on")), load(os.path.join(v11, "j_off")), load(os.path.join(v11, "j_v1"))
    out = []
    # ── 1. attribution (V1) ──
    cfgs = [("off", "OFF"), ("pose", "pose only"), ("plants", "plants only"), ("reach", "reach only"), ("plants,reach", "plants+reach"), ("on", "all (V1)")]
    A = {k: load(os.path.join(attr, "a_" + k)) for k, _ in cfgs}
    rows = []
    for sc, r in A["on"].items():
        names = r["jointNames"]
        for rec in r["recv"]:
            pid, c = rec["pid"], rec["tick"]
            for ph, a, b in [("pre", -36, -11)] + PH:
                M = {k: pj(A[k], sc, pid, c, a, b, names) for k, _ in cfgs}
                j = max(range(len(names)), key=lambda j: M["on"][j] - M["off"][j])
                ex = (M["on"][j] - M["off"][j]) * 100
                if ex < 5: continue
                rows.append(f"<tr><td>{sc}</td><td>{rec['foot']} {rec['style']}</td><td>{ph}</td><td>{names[j]}</td>" + "".join(f"<td>{M[k][j]*100:.0f}</td>" for k, _ in cfgs) + "</tr>")
    out.append("<h3>1 · Where the V1 discontinuities came from (per joint, per phase, per receiving sub-layer)</h3>"
               "<p>Every receiving fixture was run with the receiving layer OFF (the locomotion control — same authoritative motion), fully ON, and with each "
               "sub-layer alone or in pairs: the <b>pose</b> overlay, the <b>plant</b> overrides, the <b>reach</b>. Shown: in each phase the joint whose "
               "pop (cm/tick, root frame) exceeds the control most, when the excess is ≥ 5 cm/tick.</p>"
               "<table><thead><tr><th>fixture</th><th>contact</th><th>phase</th><th>joint</th>" + "".join(f"<th>{n}</th>" for _, n in cfgs) + "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>")
    # ── 2. before / after by joint ──
    rows = []
    groups = lambda sd: [("receiving knee", "shin_" + sd), ("receiving foot", ["foot_" + sd, "toe_" + sd]), ("support knee", "shin_" + ("L" if sd == "R" else "R")),
                         ("support foot", ["foot_" + ("L" if sd == "R" else "R"), "toe_" + ("L" if sd == "R" else "R")]), ("trunk", ["pelvis", "spine", "chest", "neck", "head"]),
                         ("arms", ["upperArm_R", "upperArm_L", "foreArm_R", "foreArm_L", "hand_R", "hand_L"])]
    for sc, r in ON.items():
        names = r["jointNames"]
        for i, rec in enumerate(r["recv"]):
            pid, c, sd = rec["pid"], rec["tick"], rec["foot"]
            v1rec = [x for x in V1[sc]["recv"] if x["pid"] == pid]
            c1 = v1rec[min(i, len(v1rec) - 1)]["tick"] if v1rec else c
            for ph, a, b in PH:
                on, off, v1 = pj(ON, sc, pid, c, a, b, names), pj(OFF, sc, pid, c, a, b, names), pj(V1, sc, pid, c1, a, b, names)
                cells = []
                for gname, js in groups(sd):
                    js = js if isinstance(js, list) else [js]; idx = [names.index(x) for x in js]
                    g = lambda m: max(m[k] for k in idx) * 100
                    d1, d2, d0 = g(v1), g(on), g(off)
                    cls = "ok" if d2 <= max(d0 + 3, d1) else "warn"
                    cells.append(f"<td class='{cls}'>{d1:.0f} → {d2:.0f} <span class='dim'>({d0:.0f})</span></td>")
                rows.append(f"<tr><td>{sc}</td><td>{rec['foot']} {rec['style']}</td><td>{ph}</td>" + "".join(cells) + "</tr>")
    out.append("<h3>2 · Before / after, by joint group</h3><p>Worst per-tick pop in the phase, V1 → V1.1, with the receiving-OFF control in brackets "
               "(the locomotion's own motion in the same window). Lead-in = the 10 ticks before contact, hold = the 14 after, exit = the following 46. "
               "Green: V1.1 at or below the V1 value or within 3 cm/tick of the control.</p>"
               "<table><thead><tr><th>fixture</th><th>contact</th><th>phase</th>" + "".join(f"<th>{g}</th>" for g, _ in groups("R")) + "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>")
    # ── 3. residuals ──
    M1, M2 = json.load(open(os.path.join(v1final, "matrix.json"))), json.load(open(os.path.join(v11, "matrix.json")))
    cm = lambda v: "-" if v is None else f"{v*100:.1f}"
    rows = []
    for a, b in zip(M1["rows"], M2["rows"]):
        rows.append(f"<tr><td>{a['body']}</td><td>{cm(a['recvMedian'])} → {cm(b['recvMedian'])}</td><td>{cm(a['recvP95'])} → {cm(b['recvP95'])}</td><td>{cm(a['recvMax'])} → {cm(b['recvMax'])}</td>"
                    f"<td>{cm(a['passMedian'])} → {cm(b['passMedian'])}</td><td>{cm(a['passMax'])} → {cm(b['passMax'])}</td><td>{cm(a['slideMax'])} → {cm(b['slideMax'])}</td><td class='l'>{esc(json.dumps(b['outcomes']))}</td></tr>")
    ret = [c for c in M2["cells"] if c["kind"] == "recv" and c["scen"] == "chain_recv_pass" and c["foot"] == "R"]
    out.append("<h3>3 · Final boot–ball residuals (7 bodies, 24 fixtures), V1 → V1.1</h3>"
               "<table><thead><tr><th>body</th><th>reception median cm</th><th>p95</th><th>max</th><th>pass median</th><th>pass max</th><th>plant slide max</th><th class='l'>outcomes</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>"
               "<p>The quick return to the passer (<code>chain_recv_pass</code>, second reception): " + ", ".join(f"{c['body']} {c['surf']*100:.1f} cm" for c in ret) + ".</p>")
    figs = []
    for sc, cap in [("recv_meet", "Braking into a reception (receiver coming to meet, R boot)"), ("recv_running", "Running take (through ball run onto from behind, R boot)"),
                    ("chain_recv_pass", "Quick return to the passer (A passes, B one-touches it back, A receives)")]:
        figs.append(f"<h4>{cap}</h4><figure><img loading='lazy' src='img/v11_{sc}_before_after.jpg' alt='{sc} before / after'><figcaption>V1 (top) and V1.1 (bottom), same authoritative motion, every 3rd tick around the contact, close camera</figcaption></figure>"
                    f"<figure><img loading='lazy' src='img/v11_{sc}_before_after_slow.webp' alt='{sc} slow'><figcaption>0.25x slow motion, V1 left, V1.1 right</figcaption></figure>")
    out.insert(0, "<h3>0 · Before / after</h3>" + "".join(figs))
    return "\n".join(out)

if __name__ == "__main__":
    import sys
    print(section(*sys.argv[1:4]))
