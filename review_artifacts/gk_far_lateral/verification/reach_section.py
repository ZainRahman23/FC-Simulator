"""HTML section for the reachability pass (imported by build_lat_html.py)."""
import json, os, html
S = "/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad"
esc = html.escape
def rows(path, rig):
    out = []
    try: recs = json.load(open(path))
    except Exception: return out
    for rec in recs:
        R = rec["rows"]; c = next((r for r in R if r.get("committed")), None)
        if not c: out.append((rec["name"], rig, None, None, None, None, None, None, None, None)); continue
        cm = c["committed"]; rc = next((r["reach"] for r in R if r.get("reach")), None); la = next((r["launch"] for r in R if r.get("launch")), None)
        pel = [r["final"]["pelvis"][1] for r in R if r.get("final")]; feet = [min(r["final"]["foot_R"][1], r["final"]["foot_L"][1]) for r in R if r.get("final")]
        cont = any(r.get("contact") for r in R); ld = next((r["launchDowngrade"] for r in R if r.get("launchDowngrade")), None)
        out.append((rec["name"], rig, cm, rc, la, max(pel) if pel else None, max(feet) if feet else None, cont, ld, rec["H"]))
    return out
def table(allrows):
    h = "<table><tr><th>shot</th><th>rig / H</th><th>sim commit (tier · best-effort · envelope norm · margin [m])</th><th>presentation class</th><th>intercept t [s] (from the shot)</th><th>root travel [m]</th><th>hand displacement [m]</th><th>physical shortfall / band [m]</th><th>action / contact</th><th>launch vUp [m/s] · downgrade</th><th>pelvis max [m]</th><th>leaves the ground</th></tr>"
    for name, rig, cm, rc, la, pel, feet, cont, ld, H in allrows:
        if not cm: h += f"<tr><td>{esc(name[:52])}</td><td>{rig}</td><td colspan=10 class=note>no commit (the simulation reached it on the feet / no save action)</td></tr>"; continue
        cls = rc["cls"] if rc else "—"; col = {"REACHABLE": "ok", "MARGINAL": "warn", "CLEAR": "bad"}.get(cls, "")
        air = feet is not None and feet > 0.30
        h += (f"<tr><td>{esc(name[:52])}</td><td>{rig} / {H}</td><td>{esc(str(cm.get('tier'))[:14])} · {'best-effort' if cm['best'] else 'reachable'} · {cm.get('envNorm')} · {cm.get('reachMargin')}</td><td class={col}><b>{cls}</b></td><td>{rc['interceptT'] if rc else '—'}</td><td>{rc['rootTravel'] if rc else '—'}</td><td>{rc['handDisp'] if rc else '—'}</td><td>{'%+.2f / %.2f' % (rc['shortfall'], rc['band']) if rc else '—'}</td>"
              f"<td>{cm['action']} · {'CONTACT' if cont else 'no contact'}</td><td>{('%.2f' % la['vUp']) if la else 'no launch'}{(' · −%.2f m' % ld) if ld else ''}</td><td>{'%.2f' % pel if pel is not None else '—'}</td><td class={'bad' if (air and cls == 'CLEAR') else ''}>{'yes' if air else 'no'}</td></tr>")
    return h + "</table>"
def build(made):
    def media(i, key, w=None, cap=""):
        p = made.get(str(i), {}).get(key)
        return f'<figure><img src="{p}"{" style=\"max-width:%dpx\"" % w if w else ""}><figcaption>{esc(cap)}</figcaption></figure>' if p else f"<p class=note>[case {i} {key}: not captured]</p>"
    tab = table(rows(S + "/layers_reach1_courtois.json", "Courtois") + rows(S + "/layers_reach1_test.json", "test rig") + rows(S + "/layers_reach1_fx.json", "Courtois (fixtures)"))
    def case(i, title):
        o = made.get(str(i), {}); rc = o.get("reach") or {}
        st = f"class {rc.get('cls')} · shortfall {rc.get('shortfall')} m (band {rc.get('band')}) · root travel {rc.get('rootTravel')} m · hand displacement {rc.get('handDisp')} m · intercept t {rc.get('interceptT')} s" if rc else ""
        return f"<details open><summary><b>{esc(title)}</b> <span class=note>{esc(st)}</span></summary><div class=row>{media(i, 'game', 500, 'gameplay camera 1:1, normal speed')}{media(i, 'x1', 440, 'close rig, normal speed')}{media(i, 'x4', 440, 'close rig, ¼ speed')}</div>{media(i, 'strip')}{media(i, 'test')}{media(i, 'dbg', 440, 'roots / feet overlay ¼ speed') if o.get('dbg') else ''}</details>"
    return f"""
<h2 id=reach>10. Reachability contract before the dive solver — clearly unreachable shots no longer launch the keeper</h2>
<div class=verdict><b>Finding.</b> The simulation commits a save action on every shot it predicts it cannot reach as well: for a ball outside its envelope (norm &gt; 1) it commits a <i>best-effort</i> dive whose hand target is projected onto the envelope boundary toward the ball, with an execution time from its action-time model. The presentation then fitted a ballistic arc THROUGH the solved full-extension pelvis at execution end whatever that time was: for a corner-flag shot (norm 3.4, 7 m short) the window is 1.24 s and the fit needs 4.3 m/s upward — the hip went to 2.21 m; "clearly over the bar" (norm 1.34, 1 m short) lifted it to 1.57 m. The impossible target was being fed into the fit; the earlier flight cap only bounded the continuation after execution end.
<br><b>Change (presentation only; the simulation's commit, target, contact and ball are untouched — an additive diagnostic field <code>ballPoint</code> now carries the raw predicted interception on the commit record).</b> <code>gkReachClass</code> decides ONCE at the commit: a simulation-reachable commit is always <b>REACHABLE</b> (normal solver); a best-effort commit is classified by a PHYSICAL shortfall derived from the skeleton and the physical state, not from attributes: the raw interception vs the hand reach (0.64·H) from a pelvis anywhere between the ground-hip floor and standing hip + 0.55 m above the simulation's own end root, with 0.15·H of hip displacement beyond the feet. Shortfall ≤ 0.30·H → <b>MARGINAL</b>: the full-extension attempt runs and misses naturally; its launch fit is bounded at 3.7 m/s BEFORE the fit (the exec-end pelvis is lowered to what that launch reaches, never clamped afterwards). Beyond → <b>CLEARLY UNREACHABLE</b>: no dive solver, no launch plan, no IK toward the point — the initiation (load → plant) starts and is aborted, the body comes back up while the feet step with the simulation's own root travel (footwork odometer) and the head tracks the ball; then a recovery to the set. A taller keeper has a larger envelope (band 0.60 m at H 2.01, 0.55 m at H 1.83). A narrowly unreachable shot still produces a genuine attempt (fast wide / high wide medium / fixture 2 are MARGINAL and unchanged).</div>
<h3>Adversarial free-play matrix (band COURTOIS; both rigs; fixtures 2 / 13 / 15 / 42 / 14 / 39 / 36 / 40 as controls)</h3>
<p class=note>"leaves the ground" = both ankle joints above 0.30 m at some tick. Slow wide R is met on the feet by the simulation (no save action). The control fixtures keep their previous launch numbers exactly (fixture 2 is MARGINAL below the 3.7 m/s bound; 42 / 13 / 15 / 14 / 39 / 36 / 40 are simulation-reachable).</p>
{tab}
{case(0, "reachable top corner (contact)")}{case(2, "just outside the top corner — simulation-reachable at the fingertips (contact)")}{case(12, "fast wide — MARGINAL: a believable full-extension miss")}{case(15, "high wide medium — MARGINAL")}{case(4, "clearly over the bar — CLEARLY UNREACHABLE: restrained reaction")}{case(6, "clearly wide of the post — CLEARLY UNREACHABLE")}{case(8, "corner flag, very high + very wide — CLEARLY UNREACHABLE (previously a 2.2 m hip launch)")}{case(9, "corner flag, left mirror")}{case(13, "fast wide, left mirror — MARGINAL")}
"""
