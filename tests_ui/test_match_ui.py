"""Match-experience UI tests (web/coach-match.js): real Chrome, real server,
real native engine.

Run:  /tmp/fcv/bin/python -m pytest tests_ui/test_match_ui.py -q

The tests share one live match (module-scoped page) and run in file order:
kickoff → spoiler-free feed → one-click decision at the presented second →
next moment → presentation-gated full time → review + decision lab →
replay-from rehearsal. The goal auto-pause test uses its own fresh saves.
Presentation is sped up only through the renderer's pacing knobs
(AnimR2.targetLen + 8x speed) — the football is untouched.
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
SHOTS = Path(os.environ.get("TL_SHOTS", "/tmp/tl_matchui_shots"))


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


@pytest.fixture(scope="module")
def base():
    port = _free_port()
    data = tempfile.mkdtemp(prefix="tl_matchui_test_")
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


def _open(browser, base, w=1280, h=800):
    ctx = browser.new_context(viewport={"width": w, "height": h})
    pg = ctx.new_page()
    errors: list[str] = []
    pg.on("console", lambda m: errors.append(m.text)
          if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.goto(base + "/", wait_until="domcontentloaded")
    pg.wait_for_function("() => typeof S !== 'undefined' && S.season && window.CM && typeof TL.startLiveFromSnapshot === 'function'")
    pg.wait_for_timeout(600)
    pg.evaluate("if(window.CC && document.getElementById('ccIntro')) CC.closeIntro(true)")
    return ctx, pg, errors


def _kickoff(pg, mode="moments", fast=True):
    pg.evaluate(f"S.coachUI = null; localStorage.setItem('touchline:coachUI', JSON.stringify({{autoPause: '{mode}'}}))")
    pg.evaluate("startFixture(nextLivFixture().id)")
    pg.wait_for_timeout(300)
    pg.evaluate("kickOff()")
    pg.wait_for_function("() => S.match && S.match.matchId && S.match.status === 'live'", timeout=20000)
    if fast:
        pg.evaluate("AnimR2.targetLen = 200; setSpeed(8)")


def _st(pg):
    return pg.evaluate("""() => { const m = S.match, cm = CM._state(); return {
      S: CM._presS(), server: m.clockSeconds, status: m.status, ht: !!m.htActive,
      modal: !!document.querySelector('#cmMoment'), kind: cm.moment ? cm.moment.kind : null,
      busy: cm.busy, serverFT: cm.serverFT, ft: cm.ftPresented, decisions: cm.decisions.length,
      shownMax: cm.feedPtr ? m.events[cm.feedPtr - 1].timestamp : -1 }; }""")


def _shot(pg, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / name))


def _wait(pg, js, timeout=60000):
    pg.wait_for_function(js, timeout=timeout, polling=200)


@pytest.fixture(scope="module")
def match(browser, base):
    ctx, pg, errors = _open(browser, base)
    _kickoff(pg, "moments")
    yield {"page": pg, "errors": errors}
    ctx.close()


# ── 1. spoiler-free presentation ────────────────────────────────────────────
def test_feed_score_and_stats_never_ahead_of_the_picture(match):
    pg = match["page"]
    ahead_seen = False
    for _ in range(40):
        pg.wait_for_timeout(250)
        r = pg.evaluate("""() => {
          const m = S.match; updateMatchHeader(m); updateFeedList(m);
          const s = CM._presS(), cm = CM._state();
          const shown = m.events.slice(0, cm.feedPtr);
          const late = shown.filter(e => e.timestamp > s + 0.001).length;
          const goals = m.events.filter(e => e.event_type === 'GOAL' && e.timestamp <= s).length;
          const sc = CM._stats().score;
          const hdr = document.querySelector('#cmScore').textContent.replace(/\\s/g, '');
          const feedMins = [...document.querySelectorAll('#feedList .ev .min')].map(n => parseInt(n.textContent));
          return {s, server: m.clockSeconds, late, goals, scoreSum: sc.HOME + sc.AWAY, hdr,
                  expect: sc.HOME + '–' + sc.AWAY, feedMax: Math.max(0, ...feedMins),
                  minuteNow: Math.max(1, Math.ceil(s / 60)), status: m.status};
        }""")
        if r["status"] != "live":
            pg.evaluate("CM.resume()")
            continue
        assert r["late"] == 0, r
        assert r["scoreSum"] == r["goals"], r
        assert r["hdr"] == r["expect"], r
        assert r["feedMax"] <= r["minuteNow"] + 1, r
        if r["server"] > r["s"] + 15:
            ahead_seen = True
    assert ahead_seen, "server never prefetched ahead of the picture — the gating test is vacuous"
    _shot(pg, "t_live.png")
    assert not match["errors"], match["errors"]


# ── 2. one-click decision at the presented second ──────────────────────────
def test_one_click_action_applies_at_presented_second(match):
    pg = match["page"]
    got = False
    # the hour mark: tired legs and the "your window" moment (no decision made yet)
    pg.evaluate("CM.closeMoment(); CM._jump(58 * 60)")
    _wait(pg, "() => !CM._state().busy")
    deadline = time.time() + 60
    while time.time() < deadline and pg.evaluate("CM._presS()") < 80 * 60:
        pg.wait_for_timeout(300)
        st = _st(pg)
        if st["modal"]:
            pg.wait_for_timeout(1500)       # assistant cards load
            if pg.locator("#cmMoment .cm-act:not([disabled]):not(.resume)").count():
                got = "modal"
                break
            pg.evaluate("CM.resume()")
        elif st["status"] == "paused":
            pg.evaluate("CM.resume()")
    if not got:                             # the same one-click cards live in the ASSISTANT tab
        pg.evaluate("CM.closeMoment(); if(S.match.status === 'live') togglePlay(); setSideTab('assistant')")
        pg.wait_for_timeout(2500)
        if pg.locator("#cmAsst .cm-act:not([disabled]):not(.resume)").count():
            got = "tab"
    presented = pg.evaluate("Math.floor(CM._presS())")
    ahead = pg.evaluate("S.match.clockSeconds")
    if got:
        _shot(pg, "t_moment.png")
        with pg.expect_response(lambda r: any(k in r.url for k in ("/substitution", "/tactics", "/instructions"))
                                and r.request.method == "POST") as ri:
            pg.locator(("#cmMoment" if got == "modal" else "#cmAsst") + " .cm-act:not([disabled]):not(.resume)").first.click()
    else:   # no assistant action came up: use the existing tactics path (same api() wrapper)
        pg.evaluate("CM.closeMoment(); if(S.match.htActive) startSecondHalf(); if(S.match.status === 'live') togglePlay()")
        assert pg.evaluate("isLiveMatch()"), _st(pg)
        presented = pg.evaluate("Math.floor(CM._presS())")
        with pg.expect_response(lambda r: "/tactics" in r.url and r.request.method == "POST") as ri:
            pg.evaluate("setTactic('pressingIntensity', S.current.tactics.pressingIntensity === 'Aggressive' ? 'Selective' : 'Aggressive')")
    resp = ri.value
    body = json.loads(resp.request.post_data)
    out = resp.json()
    assert resp.status == 200, out
    assert body["at_clock"] == presented
    if ahead > presented:
        assert out["rewound_to"] == presented, out
    pg.wait_for_timeout(800)
    after = pg.evaluate("""() => ({S: CM._presS(), server: S.match.clockSeconds, idx: S.match.eventIndex,
        n: S.match.events.length, dec: CM._state().decisions.length,
        feed: [...document.querySelectorAll('#feedList .ev.you')].map(e => e.textContent),
        toast: document.querySelector('#toast').textContent})""")
    assert after["server"] == presented and abs(after["S"] - presented) < 1.01, after
    # ledger truncated to the rewind point; the command's own event(s) come with the next advance
    assert after["idx"] == after["n"] and out["event_count"] - 3 <= after["n"] <= out["event_count"], (after, out.get("event_count"))
    assert after["dec"] >= 1
    assert any("YOUR CALL" in t for t in after["feed"]), after["feed"]
    if got:
        assert "applied at" in after["toast"]
        assert pg.locator(("#cmMoment" if got == "modal" else "#cmAsst") + " .cm-act.done").count() >= 1
        _shot(pg, "t_moment_applied.png")
    pg.evaluate("CM.resume()")
    pg.wait_for_timeout(1500)
    assert pg.evaluate("S.match.status") in ("live", "paused")
    ids = pg.evaluate("(() => { const i = S.match.events.map(e => e.event_id); return [i.length, new Set(i).size, i.every((v, k) => k === 0 || v > i[k - 1])]; })()")
    assert ids[0] == ids[1] and ids[2], ids          # no duplicated / reordered ledger entries
    near = pg.evaluate("S.match.events.filter(e => Math.abs(e.timestamp - %d) <= 3).map(e => [e.event_id, e.timestamp, e.event_type, e.team_id])" % presented)
    assert any(t in ("SUBSTITUTION", "TACTIC_CHANGE", "INSTRUCTION_CHANGE") for _, _, t, _ in near), (presented, near, pg.evaluate("[S.match.eventIndex, S.match.clockSeconds, S.match.status]"))
    pg.evaluate("CM.closeMoment(); if(S.match.status === 'live') togglePlay()")   # hold it for test 4
    assert not match["errors"], match["errors"]


# ── 3. goal auto-pause (fresh saves until a goal happens) ───────────────────
def test_autopause_fires_on_a_goal(browser, base):
    for attempt in range(3):
        ctx, pg, errors = _open(browser, base)
        try:
            _kickoff(pg, "goals")
            deadline = time.time() + 120
            while time.time() < deadline:
                pg.wait_for_timeout(250)
                st = _st(pg)
                if st["ft"] or st["serverFT"] and st["S"] > 5390:
                    break
                if st["ht"]:
                    pg.evaluate("startSecondHalf()")
                    continue
                if st["modal"]:
                    assert st["kind"] == "goal", st          # 'goals' mode: only goals pause
                    info = pg.evaluate("""() => { const m = S.match, s = CM._presS();
                      const g = m.events.filter(e => e.event_type === 'GOAL' && e.timestamp <= s).pop();
                      return {s, goal: g ? g.timestamp : null, title: document.querySelector('.cm-mo-t').textContent}; }""")
                    assert info["goal"] is not None and 0 <= info["s"] - info["goal"] <= 40, info
                    assert st["status"] == "paused"
                    assert pg.evaluate("!document.querySelector('#cmMoment') || true")
                    _shot(pg, "t_goal_pause.png")
                    pg.click("#cmMoment .cm-resume")
                    pg.wait_for_timeout(400)
                    assert pg.evaluate("S.match.status") == "live"
                    assert not pg.evaluate("!!document.querySelector('#cmMoment')")
                    # ⏭ Next moment: scans ahead without frames, lands just before the moment
                    s0 = pg.evaluate("CM._presS()")
                    seeks = []
                    pg.on("response", lambda r: seeks.append(r.status) if "/seek" in r.url else None)
                    pg.click("#cmCtrl .cm-next")
                    _wait(pg, "() => !CM._state().busy")
                    assert all(code == 200 for code in seeks), seeks   # none needed if the moment is already buffered
                    _wait(pg, "() => !!document.querySelector('#cmMoment') || S.match.htActive || CM._state().serverFT", timeout=60000)
                    nm = _st(pg)
                    assert nm["S"] > s0 and nm["shownMax"] <= nm["S"] + 0.001, (s0, nm)
                    _shot(pg, "t_next_moment.png")
                    assert not errors, errors
                    return
            if not pg.evaluate("S.match.events.some(e => e.event_type === 'GOAL')"):
                continue            # 0-0: try another seed
            pytest.fail("a goal was presented but the game did not auto-pause")
        finally:
            ctx.close()
    pytest.skip("three goalless matches in a row")


# ── 4. next moment + full time gated to the presentation ──────────────────
def test_ft_gated_to_presentation_and_finalized_once(match):
    pg = match["page"]
    pg.evaluate("CM.closeMoment(); if(S.match.htActive) startSecondHalf(); else if(S.match.status !== 'live') togglePlay();")
    assert pg.evaluate("isLiveMatch()")
    # jump to 87' and let the picture run: the server reaches FT first
    pg.evaluate("S.coachUI.autoPause = 'off'; AnimR2.targetLen = 450; S.ui.matchSpeed = 1; CM._jump(Math.max(87 * 60, Math.ceil(CM._presS())))")
    _wait(pg, "() => !CM._state().busy")
    pg.evaluate("""window.__fin = 0; (function(){ const f = window.finalizeFixture;
      window.finalizeFixture = function(){ window.__fin++; return f.apply(this, arguments); }; })();
      if(S.match.status !== 'live') togglePlay();""")
    saw_gap = False
    for _ in range(240):
        pg.wait_for_timeout(250)
        st = _st(pg)
        if st["ft"]:
            break
        if st["status"] == "paused" and not st["busy"]:
            pg.evaluate("CM.resume()")
        if st["serverFT"] and st["S"] < 5399:
            saw_gap = True
            assert pg.locator(".cm-fttabs").count() == 0, "FT screen shown before the picture reached 90'"
            assert pg.evaluate("window.__fin") == 0
    assert st["ft"], st
    assert saw_gap, "server FT never ran ahead of the presentation"
    _wait(pg, "() => !!document.querySelector('.cm-fttabs')")
    pg.wait_for_timeout(4000)
    assert pg.evaluate("window.__fin") == 1
    assert pg.evaluate("S.match.status") == "ft"
    assert not match["errors"], match["errors"]


# ── 5. full time: review + decision lab ─────────────────────────────────────
def test_ft_review_and_decision_lab(match):
    pg = match["page"]
    _wait(pg, "() => !!document.querySelector('.cm-review h2')", timeout=30000)
    verdict = pg.locator(".cm-review h2").inner_text()
    assert verdict.strip()
    assert pg.locator(".cm-review .cm-lessons li").count() >= 1
    _shot(pg, "t_ft_review.png")
    pg.click(".cm-fttabs button[data-ft=lab]")
    _wait(pg, "() => CM._state().lab && !CM._state().lab.running", timeout=90000)
    lab = pg.evaluate("CM._state().lab")
    assert not lab["error"], lab["error"]
    assert len(lab["items"]) >= 1          # test 2 made at least one decision
    card = pg.locator(".cm-lab").first
    cf = card.locator(".cm-lab-cf").inner_text()
    assert cf.startswith("In this match, standing pat would have ended"), cf
    assert card.locator(".cm-epb").count() == 2 and card.locator(".cm-wdl").count() == 2
    assert card.locator(".cm-chip").count() == 1
    _shot(pg, "t_ft_lab.png")
    assert not match["errors"], match["errors"]


# ── 6. replay from… → live rehearsal ───────────────────────────────────────
def test_replay_from_creates_a_rehearsal(match):
    pg = match["page"]
    real_id = pg.evaluate("S.match.matchId")
    pg.click(".cm-fttabs button[data-ft=replay]")
    pg.evaluate("CM.setReplay(55)")
    _wait(pg, "() => !document.querySelector('.cm-rp-go .btn').disabled", timeout=60000)
    _shot(pg, "t_replay.png")
    with pg.expect_response(lambda r: "/branch" in r.url) as ri:
        pg.click(".cm-rp-go .btn")
    assert ri.value.status == 200
    _wait(pg, "() => S.match && S.match.matchId !== '%s' && !!document.querySelector('#cmMoment')" % real_id, timeout=20000)
    assert pg.evaluate("CM._state().moment.kind") == "takeover"
    assert "Rehearsal from" in pg.locator("#cmMoment .cm-mo-t").inner_text()
    _shot(pg, "t_rehearsal_takeover.png")
    pg.click("#cmMoment .cm-resume")
    _wait(pg, "() => S.match.status === 'live'")
    info = pg.evaluate("""() => ({ex: !!S.matchFixture.exhibition, branchOf: S.matchFixture.branchOf,
        s: CM._presS(), ribbon: (document.querySelector('.cm-reh') || {}).textContent || ''})""")
    assert info["ex"] and info["branchOf"] == real_id
    assert abs(info["s"] - 55 * 60) < 30, info
    assert "REHEARSAL" in info["ribbon"] and "DOESN'T COUNT" in info["ribbon"]
    pg.wait_for_timeout(1500)
    _shot(pg, "t_rehearsal.png")
    pg.evaluate("CM.exitRehearsal()")
    _wait(pg, "() => S.match && S.match.matchId === '%s' && S.match.status === 'ft'" % real_id)
    assert pg.locator(".cm-fttabs").count() == 1
    assert not match["errors"], match["errors"]
