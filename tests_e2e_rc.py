"""RC1 browser tests: refresh/reconnect, disconnect behavior, backend restart.

Python remains authoritative throughout: the frontend never simulates football,
never advances a fake clock, and reconnects to the same backend match.
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
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PORT = 8112
BASE = f"http://127.0.0.1:{PORT}"


def api_get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as r:
        return json.loads(r.read())


def spawn_server(data_dir):
    env = {**os.environ, "TOUCHLINE_PORT": str(PORT), "TOUCHLINE_DATA_DIR": str(data_dir)}
    proc = subprocess.Popen([sys.executable, str(ROOT / "server.py")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            if api_get("/api/health")["status"] == "ok":
                return proc
        except Exception:
            time.sleep(0.25)
    proc.kill()
    raise RuntimeError("server did not start")


@pytest.fixture()
def rc_server(tmp_path):
    proc = spawn_server(tmp_path)
    yield proc
    proc.terminate()
    proc.wait(timeout=10)


def kickoff(pg):
    pg.goto(BASE + "/")
    pg.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")
    pg.click('.navtab[data-v="schedule"]')
    pg.click(".fixrow.next .btn")
    pg.wait_for_function("() => document.querySelector('#matchBody .btn.pri') !== null")
    pg.wait_for_function("() => !document.querySelector('#matchBody .btn.pri').disabled", timeout=15000)
    pg.click("#matchBody .btn.pri")
    pg.wait_for_function("() => S.match && S.match.matchId && S.match.clockSeconds > 0", timeout=30000)


def test_browser_refresh_reconnects_same_match(rc_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        pg = browser.new_context().new_page()
        kickoff(pg)
        pg.wait_for_function("() => S.match.clockSeconds >= 300", timeout=60000)
        mid = pg.evaluate("S.match.matchId")
        pg.evaluate("togglePlay()")                    # pause so the clock is stable
        time.sleep(0.8)
        clock_before = api_get(f"/api/matches/{mid}")["clock_seconds"]

        pg.reload()
        pg.wait_for_function("() => S.match && S.match.matchId", timeout=20000)
        assert pg.evaluate("S.match.matchId") == mid   # SAME match, not a new one
        assert pg.evaluate("S.match.status") == "paused"
        assert pg.evaluate("S.match.clockSeconds") == clock_before
        # resume: play continues from the authoritative backend clock
        pg.evaluate("togglePlay()")
        pg.wait_for_function(f"() => S.match.clockSeconds > {clock_before}", timeout=30000)
        assert api_get(f"/api/matches/{mid}")["clock_seconds"] > clock_before
        pg.evaluate("abandonMatch()")
        browser.close()


def test_disconnect_pauses_never_simulates_locally(rc_server):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context()
        pg = ctx.new_page()
        kickoff(pg)
        pg.wait_for_function("() => S.match.clockSeconds >= 120", timeout=60000)
        mid = pg.evaluate("S.match.matchId")
        # sever the API
        ctx.route("**/api/**", lambda route: route.abort())
        pg.wait_for_function("() => S.match.status === 'reconnecting'", timeout=30000)
        frozen = pg.evaluate("S.match.clockSeconds")
        time.sleep(4)                                   # no local football, no fake time
        assert pg.evaluate("S.match.clockSeconds") == frozen
        assert pg.evaluate("S.match.status") == "reconnecting"
        assert pg.evaluate("ENGINE_MODE") == "v07"      # no mock fallback, ever
        # heal the connection: auto-resync resumes from the authoritative state
        ctx.unroute("**/api/**")
        pg.wait_for_function("() => S.match.status === 'live'", timeout=30000)
        pg.wait_for_function(f"() => S.match.clockSeconds > {frozen}", timeout=30000)
        backend_clock = api_get(f"/api/matches/{mid}")["clock_seconds"]
        assert backend_clock >= pg.evaluate("S.match.clockSeconds") - 600
        pg.evaluate("abandonMatch()")
        browser.close()


def test_backend_restart_recovery_through_browser(rc_server, tmp_path):
    proc = rc_server
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        pg = browser.new_context().new_page()
        kickoff(pg)
        pg.wait_for_function("() => S.match.clockSeconds >= 240", timeout=60000)
        mid = pg.evaluate("S.match.matchId")
        pg.evaluate("togglePlay()")                    # pause; wait for in-flight advance
        time.sleep(1.0)
        clock_before = api_get(f"/api/matches/{mid}")["clock_seconds"]

        proc.terminate(); proc.wait(timeout=10)        # hard server restart
        proc2 = spawn_server(tmp_path)
        try:
            pg.reload()                                # replay recovery + reconnect
            pg.wait_for_function("() => S.match && S.match.matchId", timeout=30000)
            assert pg.evaluate("S.match.matchId") == mid
            assert pg.evaluate("S.match.clockSeconds") == clock_before
            pg.evaluate("togglePlay()")
            pg.wait_for_function(f"() => S.match.clockSeconds > {clock_before}", timeout=30000)
            pg.evaluate("abandonMatch()")
        finally:
            browser.close()
            proc2.terminate()


def test_completed_result_debug_identity(rc_server, tmp_path):
    """rc1.1: with ?debug=1 the completed-result drawer shows the persisted
    backend identity (Match ID/seed/versions/ledger), survives refresh AND a
    backend restart, and never appears without debug mode."""
    proc = rc_server
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.goto(BASE + "/?debug=1")
        pg.wait_for_function("() => typeof S !== 'undefined' && S.season && !!S.season.seed")
        pg.click('.navtab[data-v="schedule"]')
        pg.click(".fixrow.next .btn")
        pg.wait_for_function("() => document.querySelector('#matchBody .btn.pri') !== null")
        pg.wait_for_function("() => !document.querySelector('#matchBody .btn.pri').disabled", timeout=15000)
        fid = pg.evaluate("S.matchFixture.id")
        pg.evaluate("PLAYBACK_SECONDS = 600")
        pg.click("#matchBody .btn.pri")
        pg.wait_for_function("() => S.match && S.match.clockSeconds > 0", timeout=30000)
        pg.wait_for_function("() => S.match.htActive || S.match.status === 'ft'", timeout=180000)
        if pg.evaluate("S.match.htActive"):
            pg.click("button:has-text('Start second half')")
        pg.wait_for_function("() => S.match.status === 'ft'", timeout=180000)
        # wait until the whole matchweek is finalized (CPU sims + overlay done)
        pg.wait_for_function(
            "() => { const mw = S.matchFixture ? S.matchFixture.mw : 1;"
            "  return S.season.fixtures.filter(f => f.mw === mw).every(f => S.season.results[f.id]); }",
            timeout=180000)
        mid = pg.evaluate(f"S.season.results['{fid}'].matchId")
        assert mid, "result record must carry the persisted matchId"
        pg.click("button:has-text('Continue')")     # tester flow: FT -> Continue

        def open_result_and_read(page):
            page.click('.navtab[data-v="schedule"]')
            page.locator("text=View result").first.click()
            page.wait_for_selector("#resultDebug", timeout=15000)
            page.wait_for_function(
                "() => document.querySelector('#resultDebugBody') && "
                "document.querySelector('#resultDebugBody').textContent.includes('Match ID')",
                timeout=15000)
            return page.evaluate("document.querySelector('#resultDebugBody').textContent")

        body = open_result_and_read(pg)
        assert mid in body and "Calibration" in body and "Ledger" in body
        # sticky debug across refresh (no query param this time)
        pg.goto(BASE + "/")
        pg.wait_for_function("() => typeof S !== 'undefined' && !!S.season")
        assert pg.evaluate("DEBUG_MODE") is True
        body2 = open_result_and_read(pg)
        assert mid in body2

        # backend restart: identity must come purely from persistence
        proc.terminate(); proc.wait(timeout=10)
        proc2 = spawn_server(tmp_path)
        try:
            pg.reload()
            pg.wait_for_function("() => typeof S !== 'undefined' && !!S.season", timeout=30000)
            body3 = open_result_and_read(pg)
            cal_now = api_get("/api/health")["calibration_version"]
            assert mid in body3 and cal_now in body3
        finally:
            proc2.terminate()

        # normal mode: no technical section
        ctx2 = browser.new_context()
        pg2 = ctx2.new_page()
        proc3 = spawn_server(tmp_path)
        try:
            pg2.goto(BASE + "/")
            pg2.wait_for_function("() => typeof S !== 'undefined' && !!S.season")
            assert pg2.evaluate("DEBUG_MODE") is False
        finally:
            proc3.terminate()
        browser.close()
