"""Broadcast view UI tests (web/coach-match.js ⇄ sandbox/visual/match.html?embed=1).

Real Chrome, real server, real native engine, the real broadcast renderer.

Run:  /tmp/tlvenv/bin/python -m pytest tests_ui/test_broadcast_ui.py -q

What is checked:
  * the broadcast iframe loads over the pitch with no console errors / 404s,
    and nothing about it (e.g. the weather) is ever sent to the engine;
  * its clock is AnimR2's presentation clock (within 0.5 s) at 1x and 8x;
  * the app's overlays (pause card) stay on top and clickable;
  * a decision at an earlier presented second rewinds the server, resets the
    broadcast buffer and refills it;
  * Broadcast <-> Tactical keeps the match running with score/feed unchanged;
  * a missing renderer falls back to Tactical silently (one console.warn);
  * the same fixture + seed ends identically whichever view was used.
Screenshots land in $TL_SHOTS (default /tmp/tl_broadcast_shots).
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = Path(os.environ.get("TL_SHOTS", "/tmp/tl_broadcast_shots"))
EMBED = "/sandbox/visual/match.html?embed=1"
BCAPI = "document.getElementById('cmBroadcast').contentWindow.TouchlineBroadcast"


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


@pytest.fixture(scope="module")
def base():
    port = _free_port()
    data = tempfile.mkdtemp(prefix="tl_bcui_test_")
    env = {**os.environ, "PORT": str(port), "TOUCHLINE_DATA_DIR": data}
    proc = subprocess.Popen([sys.executable, str(ROOT / "server.py")], cwd=str(ROOT), env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            with urllib.request.urlopen(url + "/api/health", timeout=2) as r:
                if json.loads(r.read())["status"] == "ok":
                    break
        except Exception:
            time.sleep(0.2)
    else:
        proc.kill()
        raise RuntimeError("server did not start")
    yield url
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except Exception:
        proc.kill()


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel="chrome", headless=True)
        yield b
        b.close()


def _open(browser, base, w=1400, h=820, route=None):
    ctx = browser.new_context(viewport={"width": w, "height": h})
    if route:
        for pattern, handler in route.items():
            ctx.route(pattern, handler)
    pg = ctx.new_page()
    log = {"errors": [], "warnings": [], "bad": [], "api_bodies": []}
    pg.on("console", lambda m: (log["errors"].append(m.text)
                                if m.type == "error" and "Failed to load resource" not in m.text
                                else log["warnings"].append(m.text) if m.type == "warning" else None))
    pg.on("pageerror", lambda e: log["errors"].append("pageerror: " + str(e)))
    pg.on("response", lambda r: log["bad"].append(f"{r.status} {r.url}") if r.status >= 400 else None)
    pg.on("request", lambda r: log["api_bodies"].append(r.post_data or "")
          if "/api/" in r.url and r.method == "POST" else None)
    pg.goto(base + "/", wait_until="domcontentloaded")
    pg.wait_for_function("() => typeof S !== 'undefined' && S.season && window.CM && typeof TL.startLiveFromSnapshot === 'function'")
    pg.wait_for_timeout(600)
    pg.evaluate("if(window.CC && document.getElementById('ccIntro')) CC.closeIntro(true)")
    return ctx, pg, log


def _kickoff(pg, mode="moments", view=None, seed=None):
    prefs = {"autoPause": mode}
    if view:
        prefs["view"] = view
    pg.evaluate(f"S.coachUI = null; localStorage.setItem('touchline:coachUI', {json.dumps(json.dumps(prefs))})")
    if seed is not None:
        pg.evaluate(f"S.season.seed = {int(seed)}")
    pg.evaluate("startFixture(nextLivFixture().id)")
    pg.wait_for_timeout(300)
    pg.evaluate("kickOff()")
    pg.wait_for_function("() => S.match && S.match.matchId && S.match.status === 'live'", timeout=20000)


def _wait(pg, js, timeout=60000):
    pg.wait_for_function(js, timeout=timeout, polling=200)


def _wait_visible(pg, timeout=60000):
    _wait(pg, "() => CM._bc().visible === true && CM._bc().state === 'ready'", timeout)


def _shot(pg, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / name))


def _sync_sample(pg):
    """Read AnimR2's clock and the broadcast's clock in the same animation frame
    (after both the renderer loop and the broadcast driver have run)."""
    return pg.evaluate("""() => new Promise(res => requestAnimationFrame(() => {
      const st = %s.stats();
      res({S: AnimR2.S, clock: st.clock, frames: st.frames, head: st.head, visible: st.visible,
           speed: S.ui.matchSpeed || 1, status: S.match.status, modal: !!document.querySelector('#cmMoment'),
           last: CM._bc().last});
    }))""" % BCAPI)


@pytest.fixture(scope="module")
def match(browser, base):
    ctx, pg, log = _open(browser, base)
    _kickoff(pg, "off")
    yield {"page": pg, "log": log}
    ctx.close()


# ── 1. loads clean, layered exactly over the pitch ─────────────────────────
def test_broadcast_loads_over_the_pitch_without_errors(match):
    pg, log = match["page"], match["log"]
    _wait_visible(pg)
    pg.wait_for_timeout(1500)
    info = pg.evaluate("""() => {
      const f = document.getElementById('cmBroadcast'), p = document.getElementById('livePitch');
      const fr = f.getBoundingClientRect(), pr = p.getBoundingClientRect();
      const cv = p.querySelector('canvas.anim2');
      return {inPitch: f.parentNode === p, fr: [fr.left, fr.top, fr.width, fr.height], pr: [pr.left, pr.top, pr.width, pr.height],
              canvasHidden: getComputedStyle(cv).visibility === 'hidden', opacity: getComputedStyle(f).opacity,
              seg: document.querySelector('#cmCtrl .cm-viewseg button.on').dataset.view,
              lbl: (document.querySelector('#cmCtrl .cm-lblseg button.on') || {}).dataset?.lbl,
              S: AnimR2.S};
    }""")
    assert info["inPitch"] and info["canvasHidden"] and info["opacity"] == "1", info
    # same box as the pitch (the pitch has a 1px border; the iframe fills its padding box)
    for a, b in zip(info["fr"], info["pr"]):
        assert abs(a - b) <= 2.5, info
    assert info["seg"] == "broadcast" and info["lbl"] == "numbers", info
    # AnimR2 keeps running underneath (clock owner) while its drawing is skipped
    pg.wait_for_timeout(1000)
    assert pg.evaluate("AnimR2.S") > info["S"]
    _shot(pg, "bc_kickoff_1400.png")
    meta = pg.evaluate("CM._bcMeta()")
    players = meta["players"]
    assert len(players) == len(meta["roster"]) >= 22                # bench included, for subs
    for team in ("HOME", "AWAY"):
        mine = [p for p in players.values() if p["team"] == team]
        assert sum(1 for p in mine if p["position"] == "GK") >= 1, team
        nums = [p["number"] for p in mine]
        assert len(nums) == len(set(nums)) and all(isinstance(n, int) and n > 0 for n in nums), (team, nums)
        assert all(p["name"] and p["short_name"] for p in mine)
    assert meta["weather"] in ("rain", "light", "off")
    assert not log["errors"], log["errors"]
    assert not log["bad"], log["bad"]
    # presentation never reaches the engine: nothing we POSTed carries the weather
    assert not any("weather" in b for b in log["api_bodies"]), [b[:200] for b in log["api_bodies"] if "weather" in b]


# ── 2. clock in sync with AnimR2.S at 1x and 8x ────────────────────────────
def test_clock_follows_animr2_at_1x_and_8x(match):
    pg, log = match["page"], match["log"]
    for speed in (1, 8):
        pg.evaluate(f"setSpeed({speed})")
        pg.wait_for_timeout(1200)
        worst, moving, n = 0.0, 0, 0
        prev = None
        for _ in range(25):
            pg.wait_for_timeout(120)
            r = _sync_sample(pg)
            if r["status"] != "live" or r["modal"]:
                pg.evaluate("CM.closeMoment(); if(S.match.htActive) startSecondHalf(); else if(S.match.status !== 'live') togglePlay()")
                continue
            n += 1
            assert r["visible"] and r["frames"] > 0, r
            worst = max(worst, abs(r["clock"] - r["S"]))
            assert r["last"]["speed"] == speed, r
            if prev is not None and r["S"] > prev:
                moving += 1
            prev = r["S"]
        assert n >= 10, "match was not live long enough to sample"
        assert worst <= 0.5, (speed, worst)
        assert moving >= n // 2, (speed, moving, n)
        if speed == 8:                                                 # 4x+ renders at quality 'low'
            assert pg.evaluate(f"{BCAPI}.stats().quality") == "low"
    pg.evaluate("setSpeed(1)")
    _shot(pg, "bc_midplay_1400.png")
    assert not log["errors"], log["errors"]


# ── 3. Broadcast <-> Tactical keeps the match running, score/feed unchanged ─
def test_switching_views_keeps_the_match_running(match):
    pg, log = match["page"], match["log"]
    pg.evaluate("setSpeed(2)")
    before = pg.evaluate("""() => ({S: AnimR2.S, score: document.querySelector('#cmScore').textContent,
        feed: [...document.querySelectorAll('#feedList .ev')].map(n => n.textContent), events: S.match.events.length,
        mid: S.match.matchId})""")
    pg.click("#cmCtrl .cm-viewseg button[data-view=tactical]")
    after = pg.evaluate("""() => ({S: AnimR2.S, score: document.querySelector('#cmScore').textContent,
        feed: [...document.querySelectorAll('#feedList .ev')].map(n => n.textContent), mid: S.match.matchId,
        canvas: getComputedStyle(document.querySelector('#livePitch canvas.anim2')).visibility,
        bc: CM._bc(), cam: !!document.querySelector('#cmCtrl .cm-cam'),
        pref: JSON.parse(localStorage.getItem('touchline:coachUI')).view})""")
    assert after["mid"] == before["mid"]
    assert after["score"] == before["score"]
    assert after["feed"][-len(before["feed"]):] == before["feed"] if before["feed"] else True
    assert after["canvas"] == "visible" and after["bc"]["visible"] is False, after
    assert after["cam"], "Wide/Follow camera toggle must be available in Tactical"
    assert after["pref"] == "tactical"
    pg.wait_for_timeout(300)
    assert pg.evaluate(f"{BCAPI}.stats().visible") is False          # setOptions({visible:false})
    pg.wait_for_timeout(1500)
    s_tac = pg.evaluate("AnimR2.S")
    assert s_tac > after["S"], "match stopped when switching to Tactical"
    _shot(pg, "bc_tactical_1400.png")
    pg.click("#cmCtrl .cm-viewseg button[data-view=broadcast]")
    _wait_visible(pg, 10000)
    pg.wait_for_timeout(800)
    r = _sync_sample(pg)
    assert r["visible"] and abs(r["clock"] - r["S"]) <= 0.5 and r["S"] > s_tac, r
    assert pg.evaluate("JSON.parse(localStorage.getItem('touchline:coachUI')).view") == "broadcast"
    pg.evaluate("setSpeed(1)")
    assert not log["errors"], log["errors"]


# ── 4. overlays: labels toggle, highlights, player click ───────────────────
def test_labels_highlight_and_player_click(match):
    pg, log = match["page"], match["log"]
    pg.evaluate("""() => { const T = %s; window.__bcOpts = [];
      const o = T.setOptions; T.setOptions = function(x){ window.__bcOpts.push(JSON.parse(JSON.stringify(x))); return o.apply(this, arguments); }; }""" % BCAPI)
    pg.click("#cmCtrl .cm-lblseg button[data-lbl=names]")
    _wait(pg, "() => window.__bcOpts.some(o => o.labels === 'names')", 5000)
    assert pg.evaluate("JSON.parse(localStorage.getItem('touchline:coachUI')).labels") == "names"
    pid = pg.evaluate("Object.entries(S.match.snap.players).find(([k, p]) => p.team === livTeamId() && p.slot !== 'GK')[0]")
    pg.evaluate(f"S.match.selPid = null; {BCAPI}.onPlayerClick('{pid}')")
    _wait(pg, f"() => window.__bcOpts.some(o => (o.highlight || []).includes('{pid}'))", 5000)
    box = pg.evaluate("(() => { const b = document.getElementById('pInfoBox'); return {shown: b.style.display !== 'none', text: b.textContent}; })()")
    name = pg.evaluate(f"S.match.snap.players['{pid}'].name")
    assert box["shown"] and name in box["text"], box
    _shot(pg, "bc_names_selected_1400.png")
    pg.click("#cmCtrl .cm-lblseg button[data-lbl=numbers]")
    pg.evaluate(f"selectLivePlayer('{pid}')")                          # deselect
    assert not log["errors"], log["errors"]


# ── 5. a decision at an earlier presented second resets + refills the buffer ─
def test_rewind_resets_and_refills_the_broadcast(match):
    pg, log = match["page"], match["log"]
    pg.evaluate("setSpeed(1)")
    # let the server prefetch ahead of the picture
    _wait(pg, "() => S.match.clockSeconds > CM._presS() + 15", 30000)
    pg.evaluate("""() => { const T = %s; window.__bcResets = [];
      const o = T.reset; T.reset = function(c){ window.__bcResets.push(c); return o.apply(this, arguments); }; }""" % BCAPI)
    pg.evaluate("if(S.match.status === 'live') togglePlay()")
    presented = pg.evaluate("Math.floor(CM._presS())")
    with pg.expect_response(lambda r: "/tactics" in r.url and r.request.method == "POST") as ri:
        pg.evaluate("setTactic('pressingIntensity', S.current.tactics.pressingIntensity === 'Aggressive' ? 'Selective' : 'Aggressive')")
    out = ri.value.json()
    assert out["rewound_to"] == presented, out
    _wait(pg, "() => window.__bcResets.length > 0", 5000)
    assert presented in pg.evaluate("window.__bcResets"), pg.evaluate("window.__bcResets")
    pg.evaluate("if(S.match.status === 'paused') CM.resume()")
    _wait(pg, f"() => {BCAPI}.stats().frames > 10 && AnimR2.S > {presented} + 3", 30000)
    r = _sync_sample(pg)
    assert abs(r["clock"] - r["S"]) <= 0.5 and r["frames"] > 10, r
    assert not log["errors"], log["errors"]


# ── 6. the pause card sits above the broadcast and is clickable ────────────
def test_goal_pause_card_is_clickable_over_the_broadcast(browser, base):
    for attempt in range(3):
        ctx, pg, log = _open(browser, base)
        try:
            _kickoff(pg, "goals")
            _wait_visible(pg)
            pg.evaluate("AnimR2.targetLen = 200; setSpeed(8)")
            deadline = time.time() + 150
            while time.time() < deadline:
                pg.wait_for_timeout(250)
                st = pg.evaluate("""() => ({modal: !!document.querySelector('#cmMoment'), ht: !!S.match.htActive,
                    ft: CM._state().ftPresented, kind: CM._state().moment && CM._state().moment.kind})""")
                if st["ft"]:
                    break
                if st["ht"]:
                    pg.evaluate("startSecondHalf()")
                    continue
                if st["modal"] and st["kind"] == "goal":
                    pg.wait_for_timeout(700)
                    assert pg.evaluate("CM._bc().visible") is True
                    _shot(pg, "bc_goal_pause_1400.png")
                    hit = pg.evaluate("""() => { const b = document.querySelector('#cmMoment .cm-resume').getBoundingClientRect();
                        const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
                        return {inModal: !!(el && el.closest('#cmMoment')), tag: el && el.tagName}; }""")
                    assert hit["inModal"], hit
                    pg.click("#cmMoment .cm-resume")
                    pg.wait_for_timeout(400)
                    assert pg.evaluate("S.match.status") == "live"
                    assert not pg.evaluate("!!document.querySelector('#cmMoment')")
                    # Space still pauses after clicking inside the broadcast picture
                    pg.evaluate("setSpeed(1)")
                    box = pg.locator("#cmBroadcast").bounding_box()
                    pg.mouse.click(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.8)
                    pg.wait_for_timeout(200)
                    pg.keyboard.press("Space")
                    pg.wait_for_timeout(300)
                    assert pg.evaluate("S.match.status") == "paused"
                    assert not log["errors"], log["errors"]
                    return
            if not pg.evaluate("S.match.events.some(e => e.event_type === 'GOAL')"):
                continue            # goalless: try another season seed
            pytest.fail("a goal was presented but no pause card appeared over the broadcast")
        finally:
            ctx.close()
    pytest.skip("three goalless matches in a row")


# ── 7. smaller viewport ─────────────────────────────────────────────────────
def test_broadcast_layout_at_1024x700(browser, base):
    ctx, pg, log = _open(browser, base, 1024, 700)
    try:
        _kickoff(pg, "off")
        _wait_visible(pg)
        pg.wait_for_timeout(2500)
        lay = pg.evaluate("""() => { const f = document.getElementById('cmBroadcast').getBoundingClientRect();
            const c = document.getElementById('cmCtrl').getBoundingClientRect();
            return {fw: f.width, fh: f.height, ctrlBottom: c.bottom, frameTop: f.top, docW: document.documentElement.scrollWidth}; }""")
        assert lay["fw"] >= 500 and lay["fh"] >= 280, lay
        assert lay["frameTop"] >= lay["ctrlBottom"], lay               # controls never sit on the picture
        assert lay["docW"] <= 1024, lay                                 # no horizontal overflow
        _shot(pg, "bc_kickoff_1024.png")
        assert not log["errors"], log["errors"]
    finally:
        ctx.close()


# ── 8. renderer unavailable → Tactical, silently ───────────────────────────
@pytest.mark.parametrize("what", ["page404", "assets_missing"])
def test_fallback_to_tactical_when_broadcast_unavailable(browser, base, what):
    if what == "page404":
        route = {"**/sandbox/visual/match.html*": lambda r: r.fulfill(status=404, body="not found")}
    else:
        route = {"**/sandbox/visual/match.js*": lambda r: r.fulfill(status=404, body="not found")}
    ctx, pg, log = _open(browser, base, route=route)
    try:
        _kickoff(pg, "off")
        _wait(pg, "() => CM._bc().state === 'failed'", 20000)
        s0 = pg.evaluate("AnimR2.S")
        pg.wait_for_timeout(1500)
        info = pg.evaluate("""() => ({S: AnimR2.S, status: S.match.status, iframe: !!document.getElementById('cmBroadcast'),
            canvas: getComputedStyle(document.querySelector('#livePitch canvas.anim2')).visibility,
            bcBtnDisabled: document.querySelector('#cmCtrl .cm-viewseg button[data-view=broadcast]').disabled,
            tacOn: document.querySelector('#cmCtrl .cm-viewseg button[data-view=tactical]').classList.contains('on'),
            cam: !!document.querySelector('#cmCtrl .cm-cam')})""")
        assert info["S"] > s0 and info["status"] == "live", info
        assert not info["iframe"] and info["canvas"] == "visible", info
        assert info["bcBtnDisabled"] and info["tacOn"] and info["cam"], info
        warns = [w for w in log["warnings"] if "broadcast view unavailable" in w]
        assert len(warns) == 1, log["warnings"]
        # the page's own errors are the renderer's missing files, nothing from the app
        assert not [e for e in log["errors"] if "sandbox/visual" not in e], log["errors"]
        _shot(pg, f"bc_fallback_{what}.png")
    finally:
        ctx.close()


# ── 9. same fixture + seed → identical outcome in either view ──────────────
def _play_out(browser, base, view):
    ctx, pg, log = _open(browser, base)
    try:
        _kickoff(pg, "off", view=view, seed=424242)
        if view == "broadcast":
            _wait_visible(pg)
        else:
            assert pg.evaluate("CM._bc().visible") in (None, False)
        pg.evaluate("AnimR2.targetLen = 200; setSpeed(8)")
        _wait(pg, "() => CM._presS() > 240", 60000)
        pg.evaluate("CM.simToFT()")
        _wait(pg, "() => CM._state().ftPresented && !!S.match.fullTime", 90000)
        out = pg.evaluate("""() => ({score: S.match.score, events: S.match.events.length,
            goals: S.match.events.filter(e => e.event_type === 'GOAL').map(e => [e.timestamp, e.actor_name]),
            ft: S.match.fullTime.score || null, fixture: S.matchFixture.id, mid: S.match.matchId})""")
        # FT screen: no pitch, the broadcast is parked (kept alive, hidden)
        assert pg.evaluate("CM._bc().inPitch") is False and pg.evaluate("!CM._bc().visible")
        if view == "broadcast":
            # rehearsal ("Replay from…") is a new live match: the broadcast re-inits for it
            pg.click(".cm-fttabs button[data-ft=replay]")
            pg.evaluate("CM.setReplay(55)")
            _wait(pg, "() => !document.querySelector('.cm-rp-go .btn').disabled", 60000)
            pg.click(".cm-rp-go .btn")
            _wait(pg, "() => S.match && S.match.matchId !== '%s' && !!document.querySelector('#cmMoment')" % out["mid"], 20000)
            pg.click("#cmMoment .cm-resume")
            _wait(pg, "() => CM._bc().visible && CM._bc().key === S.match.matchId && %s.stats().frames > 5" % BCAPI, 30000)
            r = _sync_sample(pg)
            assert abs(r["clock"] - r["S"]) <= 0.5 and abs(r["S"] - 55 * 60) < 60, r
            _shot(pg, "bc_rehearsal_1400.png")
            pg.evaluate("CM.exitRehearsal()")
            _wait(pg, "() => S.match && S.match.matchId === '%s' && S.match.status === 'ft'" % out["mid"])
            # past-match reopen from Results still works with the broadcast around
            _wait(pg, "() => CM._state().finalizeDone && S.season.results['%s'] && S.season.results['%s'].matchId" % (out["fixture"], out["fixture"]), 60000)
            pg.evaluate("S.match = null; S.matchFixture = null; show('results')")
            pg.evaluate("CM.openPast('%s')" % out["fixture"])
            _wait(pg, "() => !!document.querySelector('.cm-fttabs') && S.match && S.match.pastReview", 20000)
            assert pg.evaluate("CM._bc().inPitch") is False
        assert not log["errors"], log["errors"]
        return out
    finally:
        ctx.close()


def test_outcome_identical_in_broadcast_and_tactical(browser, base):
    a = _play_out(browser, base, "broadcast")
    b = _play_out(browser, base, "tactical")
    assert a["fixture"] == b["fixture"]
    assert a["score"] == b["score"], (a["score"], b["score"])
    assert a["events"] == b["events"], (a["events"], b["events"])
    assert a["goals"] == b["goals"]


# ── 10. presentation data: kits, weather, Home tile ─────────────────────────
def test_kits_distinct_and_weather_deterministic(match):
    pg = match["page"]
    r = pg.evaluate("""() => {
      const ids = CLUBS.map(c => c.id), bad = [];
      for(const h of ids) for(const a of ids){ if(h === a) continue;
        const k = CM._kits(h, a), d = CM._deltaE;
        if(d(k.home.primary, k.away.primary) < 40) bad.push([h, a, 'shirts']);
        if(k.home.gk === k.away.gk) bad.push([h, a, 'gk same']);
        for(const g of [k.home.gk, k.away.gk]) if(d(g, k.home.primary) < 40 || d(g, k.away.primary) < 40) bad.push([h, a, 'gk vs shirt', g]); }
      const fx = S.season.fixtures.map(f => CM.weatherFor(f));
      const again = S.season.fixtures.map(f => CM.weatherFor({id: f.id}));
      const n = w => fx.filter(x => x === w).length / fx.length;
      return {bad, same: JSON.stringify(fx) === JSON.stringify(again), rain: n('rain'), light: n('light'), dry: n('off'),
              branch: CM.weatherFor({id: S.season.fixtures[0].id + '#branch'}) === fx[0]};
    }""")
    assert not r["bad"], r["bad"][:10]
    assert r["same"] and r["branch"]
    assert 0.12 <= r["rain"] <= 0.38 and 0.05 <= r["light"] <= 0.28 and r["dry"] >= 0.45, r


def test_home_training_ground_tile(browser, base):
    ctx, pg, log = _open(browser, base)
    try:
        pg.evaluate("show('home')")
        pg.wait_for_timeout(400)
        a = pg.locator("#ccTrainingGround")
        assert a.count() == 1
        assert a.get_attribute("href") == "/sandbox/visual/match.html?ofPlay=1"
        assert a.get_attribute("target") == "_blank"
        assert "prototype" in pg.locator(".cc-proto").inner_text().lower()
        with urllib.request.urlopen(base + "/sandbox/visual/match.html?ofPlay=1", timeout=5) as r:
            assert r.status == 200
        assert not log["errors"], log["errors"]
    finally:
        ctx.close()
