"""Browser end-to-end tests: real Chrome, real server, real v0.7 engine.

Run:  .venv/bin/python -m pytest tests_e2e.py -q
Uses the installed Google Chrome via Playwright (channel="chrome").
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent
PORT = 8123
BASE = f"http://127.0.0.1:{PORT}"


def api_get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as r:
        return json.loads(r.read())


@pytest.fixture(scope="module")
def server():
    env = {**os.environ, "TOUCHLINE_PORT": str(PORT)}
    proc = subprocess.Popen([sys.executable, str(ROOT / "server.py")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            assert api_get("/api/health")["status"] == "ok"
            break
        except Exception:
            time.sleep(0.2)
    else:
        proc.kill()
        raise RuntimeError("server did not start")
    yield
    proc.terminate()


@pytest.fixture()
def page(server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
        pg = ctx.new_page()
        pg.goto(BASE + "/")
        pg.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")
        yield pg
        browser.close()


def ev(page, script):
    return page.evaluate(script)


def wait(page, script, timeout=30000):
    page.wait_for_function(script, timeout=timeout)


def use_circles(page):
    """Marker-DOM tests exercise the legacy circle renderer (?renderer=circles)."""
    page.goto(BASE + "/?renderer=circles")
    page.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")


def start_liverpool_match(page):
    """Schedule → Play match → Kick off; returns once the live session ticks."""
    page.click('.navtab[data-v="schedule"]')
    page.click(".fixrow.next .btn")
    wait(page, "() => document.querySelector('#matchBody .btn.pri') !== null")
    page.click("#matchBody .btn.pri")          # Kick off
    wait(page, "() => S.match && S.match.matchId && S.match.clockSeconds > 0", timeout=30000)
    return ev(page, "S.match.matchId")


def backend_mgmt(page, team=None):
    mid = ev(page, "S.match.matchId")
    m = api_get(f"/api/matches/{mid}")["management"]
    if team is None:
        team = ev(page, "livTeamId()")
    return m[team]


def ui_engine_slot_map(page):
    """UI starters expressed as {player_id: engine_slot}."""
    return ev(page, """() => {
      const out = {};
      for(const [slot, pid] of Object.entries(S.current.starters))
        if(pid) out[pid] = engineSlot(slot);
      return out;
    }""")


# ═══ MANDATORY FULL LIVE-MATCH FLOW ══════════════════════════════════════════
def test_full_live_match_flow(page):
    use_circles(page)
    # 3. backend/engine connected
    expect(page.locator("#engineStatus")).to_contain_text("FC Simulator v0.7")

    # 4-5. start a Liverpool match and advance into it
    mid = start_liverpool_match(page)
    assert api_get("/api/health")["active_matches"] >= 1

    # 6. pause stops advancement
    page.click("#matchBody button:has-text('Pause')")
    clock1 = ev(page, "S.match.clockSeconds")
    time.sleep(1.2)
    assert ev(page, "S.match.clockSeconds") == clock1

    # 7-8. team tactic change: API accepted + UI + backend agree
    page.click('.navtab[data-v="squad"]')
    ctrl = page.locator(".tctrl", has=page.locator("b", has_text="PROGRESSION RISK"))
    ctrl.locator("button", has_text="Ambitious").click()
    wait(page, "() => S.current.tactics.progressionRisk === 'Ambitious'")
    expect(ctrl.locator("button.on")).to_have_text("Ambitious")
    assert backend_mgmt(page)["tactics"]["progression_risk"] == "AMBITIOUS"

    # 9-10. Salah role + effort: UI/backend agreement
    page.locator('.slot[data-player="mohamedsalah"] .holder').click()
    wait(page, "() => document.querySelector('#flipA .face-b select') !== null")
    page.locator("#flipA .face-b select").first.select_option("Inside Forward")
    wait(page, "() => S.current.playerInstructions.mohamedsalah.attackRole === 'Inside Forward'")
    page.locator("#flipA .face-b input[type=range]").first.fill("82")
    wait(page, "() => S.current.playerInstructions.mohamedsalah.attackEffort === 82")
    sal = backend_mgmt(page)["players"]["mohamedsalah"]["instructions"]
    assert sal["attack_role"] == "INSIDE_FORWARD" and sal["attack_effort"] == 82
    ev(page, "closeAll()")

    # 11-12. formation change 4-3-3 → 4-2-3-1: engine decides slots, UI matches
    page.click(".formrow .arw:last-child")     # next formation = 4231
    wait(page, "() => S.current.formationId === '4231'")
    mgmt = backend_mgmt(page)
    assert mgmt["formation"] == "4-2-3-1"
    ui_map = ui_engine_slot_map(page)
    eng_map = {pid: p["slot"] for pid, p in mgmt["players"].items() if p["active"]}
    assert ui_map == eng_map, f"UI/engine slot divergence: {ui_map} vs {eng_map}"

    # 13-14. substitution via drag: bench player onto the striker
    sub_in = ev(page, "S.current.bench[1]")    # a non-GK bench player
    st_slot = ev(page, "Object.keys(S.current.starters).find(k => engineSlot(k) === 'ST')")
    sub_out = ev(page, f"S.current.starters['{st_slot}']")
    bench_card = page.locator(f'.bench .slot[data-player="{sub_in}"]')
    target = page.locator(f'.slot[data-slot="{st_slot}"] .holder')
    bench_card.hover(); page.mouse.down()
    box = target.bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=12)
    page.mouse.up()
    page.locator("#subConfirm button", has=page.get_by_text("Confirm")).click()
    wait(page, f"() => S.current.starters['{st_slot}'] === '{sub_in}'")
    mgmt = backend_mgmt(page)
    assert mgmt["players"][sub_out]["active"] is False
    assert mgmt["players"][sub_out]["subbed_off"] is True
    assert mgmt["players"][sub_in]["active"] is True
    assert mgmt["substitutions_used"] == 1
    assert ev(page, f"S.current.bench.includes('{sub_out}')") is False   # cannot return

    # 15-16. resume the SAME session, fast playback, ride through halftime, finish
    ev(page, "show('match')")
    page.click("#matchBody button:has-text('Resume')")
    assert ev(page, "S.match.matchId") == mid
    ev(page, "PLAYBACK_SECONDS = 600")
    wait(page, "() => S.match && (S.match.htActive || S.match.status === 'ft')", timeout=120000)
    if ev(page, "S.match.htActive"):
        expect(page.locator(".htpanel")).to_be_visible()
        assert api_get(f"/api/matches/{mid}")["clock_seconds"] == 2700   # HT = engine clock stopped
        # D/E: rendered marker slots and identities == backend management state at HT
        mgmt = backend_mgmt(page)
        ui_markers = ev(page, "Object.fromEntries(Object.entries(S.match.markers).map(([pid,n]) => [pid, n.dataset.slot]))")
        eng_active = {pid: p["slot"] for pid, p in mgmt["players"].items() if p["active"]}
        for pid, slot in eng_active.items():
            assert ui_markers.get(pid) == slot, f"marker/slot mismatch for {pid}"
        assert sub_out not in ui_markers            # substituted player gone from the pitch
        assert sub_in in ui_markers                 # replacement rendered
        page.click("button:has-text('Start second half')")
    wait(page, "() => S.match && S.match.status === 'ft'", timeout=120000)
    wait(page, "() => Object.keys(S.season.results).length >= 10", timeout=90000)

    # 17. displayed = backend full-time truth
    ft = ev(page, "S.match.fullTime")
    score_ui = page.locator("#matchBody .scoreline .sc").inner_text().replace("\n", "")
    assert score_ui == f"{ft['score']['home']}–{ft['score']['away']}"
    fid = ev(page, "S.matchFixture.id")
    rec = ev(page, f"S.season.results['{fid}']")
    assert rec["stats"]["xg"] == [ft["team_stats"]["home"]["xg"], ft["team_stats"]["away"]["xg"]]
    for pid, rating in rec["ratings"].items():
        assert rating == ft["player_stats"][pid]["rating"]         # ratings: backend
    assert ev(page, "S.match.playerEnergy['mohamedsalah']") == \
        api_get(f"/api/matches/{mid}")["players"]["mohamedsalah"]["energy"]  # energy: backend
    assert rec["stats"]["fouls"] == [ft["team_stats"]["home"]["fouls"], ft["team_stats"]["away"]["fouls"]]

    # 18. completed record: full kickoff input + management ledger
    assert rec["engine"]["seed"] and rec["engine"]["engine_version"] == "0.7"
    assert rec["engine"]["calibration_version"] == api_get("/api/health")["calibration_version"]
    ko = rec["kickoff"]
    liv_side = ko["home"] if ko["home"]["club_id"] == "LIV" else ko["away"]
    assert liv_side["formation"] == "433"
    assert len([v for v in liv_side["starters"].values() if v]) == 11
    assert "mohamedsalah" in liv_side["starters"].values()
    assert len(liv_side["bench"]) >= 3
    assert len(liv_side["tactics"]) == 13
    assert liv_side["instructions"]["mohamedsalah"]["attackRole"]   # kickoff instructions
    mgmt_types = {e["type"] for e in rec["managementEvents"]}
    assert {"TACTIC_CHANGE", "INSTRUCTION_CHANGE", "FORMATION_CHANGE", "SUBSTITUTION"} <= mgmt_types
    assert len(rec["changes"]) >= 4


# ═══ NEGATIVE: rejection does not commit; local live mutations blocked ═══════
def test_rejection_and_blocked_local_mutations(page):
    # pre-match: switch to 4-2-3-1 locally (allowed), then kick off
    page.click('.navtab[data-v="squad"]')
    page.click(".formrow .arw:last-child")
    wait(page, "() => S.current.formationId === '4231'")
    start_liverpool_match(page)
    page.click("#matchBody button:has-text('Pause')")
    page.click('.navtab[data-v="squad"]')

    # unsupported live transition 4-2-3-1 → 4-1-4-1: rejected, nothing commits
    page.click(".formrow .arw:last-child")
    time.sleep(1.0)
    assert ev(page, "S.current.formationId") == "4231"
    assert backend_mgmt(page)["formation"] == "4-2-3-1"

    # starter↔starter drag swap: blocked during live, board unchanged
    before = ev(page, "JSON.stringify(S.current.starters)")
    a = page.locator('.slot[data-slot="ST"] .holder').bounding_box()
    b = page.locator('.slot[data-slot="CAM"] .holder').bounding_box()
    page.mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2)
    page.mouse.down()
    page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, steps=10)
    page.mouse.up()
    time.sleep(0.5)
    assert ev(page, "JSON.stringify(S.current.starters)") == before

    # dragging a starter to the bench: blocked during live
    bench_box = page.locator(".bench").bounding_box()
    page.mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2)
    page.mouse.down()
    page.mouse.move(bench_box["x"] + bench_box["width"] / 2, bench_box["y"] + 30, steps=10)
    page.mouse.up()
    time.sleep(0.5)
    assert ev(page, "JSON.stringify(S.current.starters)") == before
    ev(page, "abandonMatch()")


# ═══ LIVE MOVEMENT + PAUSE (backend clock authority) ═════════════════════════
def test_live_movement_and_backend_pause(page):
    use_circles(page)
    mid = start_liverpool_match(page)
    wait(page, "() => Object.keys(S.match.markers || {}).length >= 20")
    # rendered player IDs correspond to Python's active players
    snap = api_get(f"/api/matches/{mid}")
    backend_active = {pid for pid, p in snap["players"].items() if p["active"]}
    ui_pids = set(ev(page, "Object.keys(S.match.markers)"))
    assert ui_pids == backend_active
    assert ev(page, "document.querySelectorAll('#livePitch .pm').length") == len(backend_active)
    assert ev(page, "document.querySelector('#ballM').style.display") != "none"   # authoritative ball

    pos1 = ev(page, "Object.fromEntries(Object.entries(S.match.markers).map(([pid,n]) => [pid, n.style.left+'|'+n.style.top]))")
    time.sleep(2.5)
    pos2 = ev(page, "Object.fromEntries(Object.entries(S.match.markers).map(([pid,n]) => [pid, n.style.left+'|'+n.style.top]))")
    moved = sum(1 for pid in pos1 if pid in pos2 and pos1[pid] != pos2[pid])
    assert moved >= 5, f"only {moved} players moved visually"

    # pause: Python clock must stop; resume: it advances again — same session
    page.click("#mHeader button:has-text('Pause')")
    time.sleep(0.8)                                  # let any in-flight advance land
    c1 = api_get(f"/api/matches/{mid}")["clock_seconds"]
    time.sleep(1.6)
    assert api_get(f"/api/matches/{mid}")["clock_seconds"] == c1
    page.click("#mHeader button:has-text('Resume')")
    wait(page, f"() => S.match.clockSeconds > {c1}")
    assert api_get(f"/api/matches/{mid}")["clock_seconds"] > c1
    ev(page, "abandonMatch()")


# ═══ PLAYBACK-SPEED INVARIANCE ═══════════════════════════════════════════════
def _run_fixed_seed_match(server, playback):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
        pg = ctx.new_page()
        pg.goto(BASE + "/")
        pg.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")
        pg.evaluate("() => { S.season.seed = 424242; saveState(); }")   # fixed random environment
        pg.click('.navtab[data-v="schedule"]')
        pg.click(".fixrow.next .btn")
        pg.wait_for_function("() => document.querySelector('#matchBody .btn.pri') !== null")
        pg.evaluate(f"PLAYBACK_SECONDS = {playback}")
        pg.click("#matchBody .btn.pri")
        pg.wait_for_function("() => S.match && S.match.matchId && S.match.clockSeconds > 0", timeout=30000)
        pg.wait_for_function("() => S.match.htActive || S.match.status === 'ft'", timeout=180000)
        if pg.evaluate("S.match.htActive"):
            pg.click("button:has-text('Start second half')")
        pg.wait_for_function("() => S.match.status === 'ft'", timeout=180000)
        seed = pg.evaluate("S.match.engine.seed")
        ft = pg.evaluate("S.match.fullTime")
        browser.close()
        return seed, ft


def test_playback_speed_invariance(server):
    seed_a, ft_a = _run_fixed_seed_match(server, 137)   # odd, small batches
    seed_b, ft_b = _run_fixed_seed_match(server, 600)   # large batches
    assert seed_a == seed_b == ft_a["engine"]["seed"]
    assert ft_a["score"] == ft_b["score"]
    assert ft_a["events"] == ft_b["events"], "playback speed altered the event ledger"
    assert ft_a["player_stats"] == ft_b["player_stats"]
    assert ft_a["possession"] == ft_b["possession"]


# ═══ ANIMATED RENDERER (default path) ════════════════════════════════════════
def test_animated_renderer_live(page):
    """Milestone-1 renderer (?renderer=anim1; default is anim2 since RC8)."""
    page.goto(BASE + "/?renderer=anim1")
    page.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")
    mid = start_liverpool_match(page)
    wait(page, "() => typeof AnimR !== 'undefined' && AnimR.frames.length >= 3")
    assert ev(page, "document.querySelector('#livePitch canvas.animcanvas') !== null")
    assert ev(page, "document.querySelectorAll('#livePitch .pm').length") == 0
    h1 = ev(page, "AnimR.head")
    time.sleep(2.0)
    h2 = ev(page, "AnimR.head")
    assert h2 > h1, f"playhead did not advance ({h1} -> {h2})"
    assert ev(page, "AnimR.head <= AnimR.bufferedUntil() + 0.001"), "playhead ran past buffer"
    # pause freezes the playhead exactly
    page.click("#mHeader button:has-text('Pause')")
    time.sleep(0.6)
    hp1 = ev(page, "AnimR.head"); time.sleep(1.2); hp2 = ev(page, "AnimR.head")
    assert hp1 == hp2, "playhead moved while paused"
    page.click("#mHeader button:has-text('Resume')")
    wait(page, f"() => AnimR.head > {hp2}")
    ev(page, "abandonMatch()")


# ═══ ANIM2 PROTOTYPE (staging renderer, ?renderer=anim2) ═════════════════════
def test_anim2_prototype_live(page):
    """Milestone-2 renderer (default since RC8): three-clock presentation, decoupled clocks."""
    pg = page
    start_liverpool_match(pg)
    wait(pg, "() => typeof AnimR2 !== 'undefined' && AnimR2.frames.length >= 3")
    assert ev(pg, "document.querySelector('#livePitch canvas.animcanvas.anim2') !== null")
    assert ev(pg, "document.querySelectorAll('#livePitch .pm').length") == 0
    s1 = ev(pg, "AnimR2.S")
    time.sleep(2.5)
    s2 = ev(pg, "AnimR2.S")
    assert s2 > s1, "presentation head did not advance"
    assert ev(pg, "AnimR2.S <= AnimR2.bufferedUntil() + 0.6"), "presentation ran past authoritative buffer"
    # sim-time decoupling: presentation clock advances at ~wall speed, sim faster
    p1, sim1 = ev(pg, "[AnimR2.P, AnimR2.S]")
    time.sleep(2.0)
    p2, sim2 = ev(pg, "[AnimR2.P, AnimR2.S]")
    assert 1.0 <= (p2 - p1) <= 3.5, f"presentation clock rate wrong: {p2-p1}"
    assert (sim2 - sim1) > (p2 - p1), "sim head should outpace presentation seconds (compression)"
    # user pause freezes the presentation exactly
    pg.click("#mHeader button:has-text('Pause')")
    time.sleep(0.6)
    h1 = ev(pg, "AnimR2.S"); time.sleep(1.0); h2 = ev(pg, "AnimR2.S")
    assert h1 == h2, "presentation moved while paused"
    pg.click("#mHeader button:has-text('Resume')")
    wait(pg, f"() => AnimR2.S > {h2}")
    ev(pg, "abandonMatch()")


# ═══ ANIM4 PHYSICAL-BALL RENDERER (staging, ?renderer=anim4) ═════════════════
def test_anim4_physical_ball_live(page):
    """Milestone-4: physical ball only moves by integration; arrival gating holds."""
    pg = page
    pg.goto(BASE + "/?renderer=anim4")
    pg.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")
    start_liverpool_match(pg)
    wait(pg, "() => typeof AnimR4 !== 'undefined' && AnimR4.frames.length >= 3")
    assert ev(pg, "document.querySelector('#livePitch canvas.anim4') !== null")
    assert ev(pg, "document.querySelectorAll('#livePitch .pm').length") == 0
    # ball physics-integrity over 3 seconds: displacement bounded by velocity
    bad = ev(pg, """new Promise(res => {
        let px = AnimR4.ball.x, py = AnimR4.ball.y, bad = 0, n = 0;
        function f(){
            const b = AnimR4.ball, sg = AnimR4.seg();
            const rst = sg && sg.kind === 'reset';
            const d = Math.hypot(b.x - px, b.y - py);
            if(!rst && d > Math.max(2.2, Math.hypot(b.vx, b.vy) * 0.05 + 0.5)) bad++;
            px = b.x; py = b.y;
            if(++n < 180) requestAnimationFrame(f); else res(bad);
        }
        requestAnimationFrame(f);
    })""")
    assert bad == 0, f"{bad} ball displacements exceeded physical velocity"
    # playhead advances and respects buffer
    s1 = ev(pg, "AnimR4.simPos()")
    time.sleep(2.5)
    s2 = ev(pg, "AnimR4.simPos()")
    assert s2 > s1
    assert ev(pg, "AnimR4.simPos() <= AnimR4.bufferedUntil() + 0.6")
    # pause freezes playhead AND ball
    pg.click("#mHeader button:has-text('Pause')")
    time.sleep(0.6)
    h1 = ev(pg, "[AnimR4.simPos(), AnimR4.ball.x, AnimR4.ball.y]")
    time.sleep(1.0)
    h2 = ev(pg, "[AnimR4.simPos(), AnimR4.ball.x, AnimR4.ball.y]")
    assert h1 == h2, "presentation moved while paused"
    pg.click("#mHeader button:has-text('Resume')")
    wait(pg, f"() => AnimR4.simPos() > {h2[0]}")
    ev(pg, "abandonMatch()")
