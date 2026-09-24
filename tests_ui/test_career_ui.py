"""Career & modes UI tests (web/coach-career.js).

Runs its own Touchline server on a free port with a temp data dir and drives
the real page with Playwright (Chrome). Covers: distinct tiered squads, CPU
formations, the one-call matchweek batch + table, scouting + Apply, condition
carry-over into the next request (`cond`), injuries making players
unavailable, season end -> next season, and the daily challenge
(find -> take charge -> sim to FT -> stars + leaderboard).

    /tmp/fcv/bin/python -m pytest tests_ui/test_career_ui.py -q
Screenshots: /tmp/tl_careerui_shots/test_*.png
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

ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path("/tmp/tl_careerui_shots")
SHOTS.mkdir(parents=True, exist_ok=True)


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


@pytest.fixture(scope="module")
def server():
    port = _free_port()
    data = tempfile.mkdtemp(prefix="tl_careerui_test_")
    env = {**os.environ, "TOUCHLINE_DATA_DIR": data, "PORT": str(port)}
    log = open(Path(data) / "server.log", "w")
    proc = subprocess.Popen([sys.executable, "server.py"], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
    url = f"http://127.0.0.1:{port}"
    for _ in range(120):
        try:
            with urllib.request.urlopen(url + "/api/health", timeout=1) as r:
                if r.status == 200:
                    break
        except Exception:
            time.sleep(0.25)
    else:
        proc.terminate()
        raise RuntimeError("server did not start")
    yield url
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        try:
            b = p.chromium.launch(channel="chrome")
        except Exception:
            b = p.chromium.launch()
        yield b
        b.close()


class Page:
    def __init__(self, browser, url, w=1280, h=800):
        self.ctx = browser.new_context(viewport={"width": w, "height": h})
        self.page = self.ctx.new_page()
        self.errors: list[str] = []
        self.page.on("console", lambda m: self.errors.append(m.text) if m.type == "error" else None)
        self.page.on("pageerror", lambda e: self.errors.append("PAGEERROR " + str(e)))
        self.page.goto(url + "/")
        self.page.wait_for_function("window.TL && TL.booted && window.CC && S.career && document.querySelector('#homeBody')")
        self.page.evaluate("TL.booted.then(()=>0)")
        self.page.evaluate("CC.closeIntro(true)")

    def js(self, code, arg=None):
        return self.page.evaluate(code, arg) if arg is not None else self.page.evaluate(code)

    def wait(self, expr, timeout=60000):
        self.page.wait_for_function(expr, timeout=timeout)

    def shot(self, name, full=False):
        self.page.screenshot(path=str(SHOTS / f"test_{name}.png"), full_page=full)

    def play_next_league_match(self):
        mw = self.js("S.season.matchweek")
        self.js("startFixture(nextLivFixture().id)")
        self.js("kickOff()")
        self.wait("S.match && S.match.matchId", 30000)
        self.js("CM.simToFT()")
        self.wait(f"S.season.matchweek > {mw} && !CC.isFinalizing() && S.career.lastReport", 90000)
        return mw

    def close(self, allow=()):
        errs = [e for e in self.errors if not any(a in e for a in allow)]
        self.ctx.close()
        return errs


def test_squads_distinct_and_tiered(server, browser):
    pg = Page(browser, server)
    r = pg.js("""() => {
      const out = {counts:{}, strength:{}, dup:0, flat:0};
      const seen = new Set();
      for(const c of CLUBS){ out.counts[c.id] = playersForClub(c.id).length; out.strength[c.id] = CC.clubStrength(c.id); }
      for(const p of PLAYERS.filter(p => p.clubId)){
        const k = JSON.stringify(p.a); if(seen.has(k)) out.dup++; seen.add(k);
        const v = Object.entries(p.a).filter(([k]) => !k.startsWith('gk')).map(e => e[1]);
        if(Math.max(...v) - Math.min(...v) < 10) out.flat++;
      }
      const avg = (pos, k) => { const L = PLAYERS.filter(p => p.fictional && p.pos === pos); return L.reduce((a, p) => a + p.a[k], 0) / L.length; };
      out.cbDef = avg('CB','daw'); out.wDef = avg('LW','daw'); out.wPace = avg('LW','spr'); out.cbPace = avg('CB','spr');
      out.gkDiv = avg('GK','gkd'); out.stGk = avg('ST','gkd');
      out.livGen = LIVERPOOL_GENERICS.map(g => [g.name, g.ovr, g.a.daw, g.a.fin]);
      out.names = new Set(PLAYERS.filter(p => p.clubId).map(p => p.name)).size === PLAYERS.filter(p => p.clubId).length;
      out.inList = (() => { show('players'); listFilters.club = 'BUR'; renderList(); return document.querySelectorAll('#listGrid .pw').length; })();
      out.market = marketPool().filter(p => p.fictional).length;
      out.imgs = [...document.querySelectorAll('#listGrid img.art')].length;
      return out; }""")
    assert all(18 <= n <= 36 for n in r["counts"].values()), r["counts"]
    assert r["dup"] == 0 and r["flat"] == 0
    assert r["names"], "fictional names must be unique"
    s = r["strength"]
    assert min(s["MCI"], s["ARS"], s["LIV"]) > max(s["SUN"], s["BUR"], s["LEE"]) + 5, s   # tiered, but compressed (engine sensitivity)
    assert r["cbDef"] > r["wDef"] + 10 and r["wPace"] > r["cbPace"] + 8 and r["gkDiv"] > r["stGk"] + 40
    assert len({g[1] for g in r["livGen"]}) > 3, "Liverpool fillers are no longer flat 75s"
    assert r["inList"] >= 18 and r["market"] > 200
    assert r["imgs"] == 0, "no art <img> requested for players without card art"
    pg.shot("players_bur")
    assert pg.close() == []


def test_cpu_formations_vary(server, browser):
    pg = Page(browser, server)
    r = pg.js("""() => CLUBS.filter(c => c.id !== 'LIV').map(c => { const s = cpuSideForRequest(c.id);
      return {id: c.id, f: s.formation, n: Object.values(s.lineup).filter(Boolean).length, b: s.bench.length,
        gk: s.lineup.GK && s.lineup.GK.pos, bgk: s.bench.some(p => p.pos === 'GK'), tac: JSON.stringify(s.tactics) === JSON.stringify(CC.cpuTactics(c.plan)),
        cond: Object.values(s.lineup).every(p => p.cond >= 80 && p.cond <= 100)}; })""")
    forms = {x["f"] for x in r}
    assert forms <= {"433", "4231", "4141"} and len(forms) == 3
    for x in r:
        assert x["n"] == 11 and x["b"] == 7 and x["gk"] == "GK" and x["bgk"] and x["tac"] and x["cond"], x
    assert pg.close() == []


def test_prematch_scouting_apply(server, browser):
    pg = Page(browser, server, 1440, 900)
    pg.js("startFixture(nextLivFixture().id)")
    pg.wait("document.querySelector('#ccScout .cc-outlook') && document.querySelector('#ccPlan .cc-plan')", 30000)
    txt = pg.js("document.querySelector('.cc-pre').innerText")
    assert "THE BOARD EXPECTS" in txt and "KEY PLAYERS" in txt and "LINE STRENGTHS" in txt
    pg.shot("prematch", full=True)
    before = pg.js("JSON.stringify(S.current.tactics)")
    btn = pg.page.locator("#ccPlan button.btn.pri").first
    if btn.count():
        btn.click()
        pg.page.wait_for_timeout(300)
        after = pg.js("JSON.stringify(S.current.tactics)")
        assert after != before
        assert pg.js("Object.keys(S.current.tactics).length") == 13
        assert pg.page.locator("#ccPlan button:has-text('Applied')").count() >= 1
    # Back / Touchline buttons are live
    pg.page.locator(".cc-actions button:has-text('Edit team')").click()
    assert pg.js("S.ui.view") == "squad"
    assert pg.close() == []


def test_matchweek_batch_condition_injury(server, browser):
    pg = Page(browser, server, 1280, 800)
    t0 = time.time()
    mw = pg.play_next_league_match()
    pg.page.wait_for_timeout(800)
    pg.shot("ft_league")
    r = pg.js("""() => ({results: Object.keys(S.season.results).length, played: computeStandings().filter(x => x.p === 1).length,
       ms: S.career.batchMs, lg: CC.leagueStats().length, conds: Object.values(S.career.cond).filter(v => v < 100).length,
       board: S.career.board.history.length, banner: !!document.getElementById('ccFt')})""")
    assert r["results"] == 10 and r["played"] == 20, r
    assert r["lg"] > 200 and r["board"] == 1 and r["banner"]
    assert r["conds"] >= 4, "starters carry fatigue into next week"
    assert r["ms"] < 8000, f"batch took {r['ms']} ms"
    pg.js("continueSeason()")
    pg.js("show('table')")
    pg.page.wait_for_timeout(300)
    assert pg.page.locator(".cc-leaders").count() == 1
    pg.shot("table_leaders")

    # condition carries into the next request as `cond`
    tired = pg.js("Object.entries(S.career.cond).filter(([k, v]) => v < 100 && Object.values(S.current.starters).includes(k)).map(e => e[0])")
    assert tired
    # injury: a starter becomes unavailable and is replaced with a notice
    victim = pg.js("S.current.starters.RW || S.current.starters.ST")
    pg.js("(pid) => { S.career.injuries[pid] = {weeks: 3, total: 3, type: 'Hamstring strain', mw: 1}; }", victim)
    pg.js("startFixture(nextLivFixture().id)")
    pg.wait("document.querySelector('.cc-pre')")
    assert pg.js("(pid) => Object.values(S.current.starters).includes(pid)", victim) is False
    assert "Hamstring strain" in pg.js("document.querySelector('.cc-pre').innerText")
    assert pg.js("Object.values(S.current.starters).filter(Boolean).length") == 11
    pg.js("(pid) => putInSlot('ST', pid)", victim)
    assert pg.js("(pid) => Object.values(S.current.starters).includes(pid)", victim) is False
    pg.shot("prematch_injury", full=True)
    with pg.page.expect_request(lambda q: q.url.endswith("/api/matches/start") and q.method == "POST") as req:
        pg.js("kickOff()")
    body = json.loads(req.value.post_data)
    liv = body["home_team"] if body["home_team"]["club_id"] == "LIV" else body["away_team"]
    sent = {p["id"]: p["cond"] for p in list(liv["lineup"].values()) + liv["bench"]}
    assert all(isinstance(v, int) for v in sent.values())
    career = pg.js("S.career.cond")
    for pid, v in sent.items():
        assert v == round(career.get(pid, 100))
    assert any(v < 100 for v in sent.values())
    assert victim not in sent
    pg.wait("S.match && S.match.matchId")
    pg.js("abandonMatch()")
    assert pg.close() == []


def test_season_end_next_season(server, browser):
    pg = Page(browser, server, 1440, 900)
    # fast-forward: everything except the last matchweek gets a result
    pg.js("""() => { let i = 0; for(const f of S.season.fixtures){ if(f.mw >= 38) continue; i++;
        const liv = f.home === 'LIV' || f.away === 'LIV';
        const sc = liv ? (f.home === 'LIV' ? [2, 1] : [1, 2]) : [i % 3, (i * 7) % 4];
        S.season.results[f.id] = {score: sc, stats: null, scorers: {}, ratings: null, lg: {}}; S.career.processed[f.id] = true; }
      S.season.matchweek = 38; saveState(); renderTopBar(); }""")
    age0 = pg.js("P('mohamedsalah').age")
    pg.js("startFixture(nextLivFixture().id)")
    pg.js("kickOff()")
    pg.wait("S.match && S.match.matchId", 30000)
    pg.js("CM.simToFT()")
    pg.wait("S.career.seasonEnd && S.career.seasonEnd.awards", 90000)
    pg.page.wait_for_timeout(600)
    pg.js("continueSeason()")
    assert pg.js("S.ui.view") in ("season", "gameover")
    if pg.js("S.ui.view") == "gameover":
        pytest.skip("board sacked the manager on this seed")
    txt = pg.js("document.getElementById('seasonBody').innerText")
    assert "BOARD VERDICT" in txt and "AWARDS" in txt and "FINAL TABLE" in txt and "GOLDEN BOOT" in txt
    pg.shot("season_end")
    pg.page.locator("#seasonBody button:has-text('Start')").click()
    pg.page.wait_for_timeout(500)
    r = pg.js("""() => ({year: S.career.year, label: PREMIER_LEAGUE.season, results: Object.keys(S.season.results).length,
      mw: S.season.matchweek, fixtures: S.season.fixtures.length, hist: S.career.history.length, view: S.ui.view,
      age: P('mohamedsalah').age, obj: S.career.board.objective.text})""")
    assert r["year"] == 2027 and r["label"] == "2027/28" and r["results"] == 0 and r["fixtures"] == 380
    assert r["hist"] == 1 and r["view"] == "home" and r["age"] == age0 + 1
    pg.shot("home_new_season")
    # persisted: a reload keeps the new season and ages
    pg.page.reload()
    pg.page.wait_for_function("window.CC && S.career && TL.booted")
    pg.page.wait_for_timeout(800)
    assert pg.js("PREMIER_LEAGUE.season") == "2027/28"
    assert pg.js("P('mohamedsalah').age") == age0 + 1
    assert pg.close() == []


def test_daily_challenge_flow(server, browser):
    pg = Page(browser, server, 1280, 800)
    squad0 = pg.js("JSON.stringify(S.current.starters)")
    pg.js("show('challenges')")
    pg.wait("document.querySelector('#ccDaily .cc-brief')", 90000)
    pg.shot("challenges", full=True)
    pg.page.locator("#ccDaily button:has-text('Take charge')").click()
    pg.wait("S.match && S.matchFixture && S.matchFixture.exhibition && S.matchFixture.scenario", 30000)
    st = pg.js("({clock: S.match.clockSeconds, take: S.matchFixture.scenario.takeover_clock})")
    assert st["clock"] >= st["take"] - 1
    pg.js("CM.simToFT()")
    pg.wait("S.match.status === 'ft' && document.querySelector('#ccFt .cc-stars')", 90000)
    pg.page.wait_for_timeout(500)
    pg.page.fill("#ccMgr", "Pytest Gaffer")
    pg.page.locator("#ccSubmit button:has-text('Submit')").click()
    pg.wait("document.querySelector('#ccSubmit') && /rank/.test(document.querySelector('#ccSubmit').innerText)", 30000)
    pg.wait("document.querySelector('#ccLb tr')", 20000)
    pg.shot("challenge_ft")
    assert "Pytest Gaffer" in pg.js("document.getElementById('ccLb').innerText")
    share = pg.js("CC.shareText(S.matchFixture.scenario.scenario_id)")
    assert share.startswith("Touchline Daily ") and " from " in share and "'" in share
    # the season was untouched and the squad is restored
    assert pg.js("Object.keys(S.season.results).length") == 0
    pg.js("continueSeason()")
    assert pg.js("S.ui.view") == "challenges"
    assert pg.js("JSON.stringify(S.current.starters)") == squad0
    assert pg.js("Object.values(S.career.challenges.best).length") == 1
    assert pg.close() == []
