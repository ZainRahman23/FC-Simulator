"""Focused v2 build-to-match smoke test against the real API and browser.

One server and one browser; intentionally avoids running the expensive Analyst
and Ghost simulations. Their request plumbing is exercised by backend suites.
"""
from pathlib import Path

from test_career_ui import server, browser, Page


def test_build_training_persistence_and_prepared_hand(server, browser):
    p = Page(browser, server)
    try:
        p.wait("window.CB && CB.catalog && S.career.build && S.career.cal")
        assert p.js("CB.api.source['/build/catalog']") == "server"
        assert p.js("S.career.cal.phase") == "preseason"
        assert p.js("S.career.build.deck.length") >= 10
        p.js("show('build')")
        p.wait("document.querySelectorAll('#cbPitch .cb-tok').length === 11 && CB._boardEval")
        displayed = p.js("CB._boardEval.system_fit")
        actual = p.js("CB.api.evaluate({squad:CB.squadPayload(), xi:S.current.starters, bench:S.current.bench, system_id:S.career.build.system_id, build:S.career.build})")
        assert displayed == actual['system_fit']
        assert p.js("TL.build.kickoffBuild().staff.coach") == 1
        assert p.js("CB.cpuSystemFor('MCI').id") == 'positional'
        assert p.js('CB.systemApplied()')

        p.js("show('training')")
        pid = p.js("S.current.starters.ST")
        before = p.js("({attribute:P(S.current.starters.ST).a.fin,wallet:S.career.build.tp.wallet})")
        p.js("pid => CB.drill(pid,'fin',1)", pid)
        p.wait("CB.ui.preview2 && CB.ui.preview2.tp_spent === 1")
        gain = p.js("pid => CB.ui.preview2.squad_deltas[pid].fin", pid)
        assert gain > 0
        p.js("CB.runTraining()")
        p.wait("CB.ui.plan && Object.keys(CB.ui.plan.attr).length === 0")
        after = p.js("({attribute:P(S.current.starters.ST).a.fin,wallet:S.career.build.tp.wallet,load:S.career.build.load[S.current.starters.ST]})")
        assert abs(after['attribute'] - before['attribute'] - gain) < .02
        assert after['wallet'] == before['wallet'] - 1
        assert after['load'] == 3
        p.page.reload()
        p.wait("window.CB && CB.catalog && S.career.build")
        assert abs(p.js("P(S.current.starters.ST).a.fin") - after['attribute']) < .02
        p.js("startFixture(nextLivFixture().id)")
        p.wait("document.querySelectorAll('.cm-pcard').length > 0")
        assert 'YOUR HAND' in p.page.locator('#v-match').inner_text()
        p.js('CM.prepCompare()')
        assert 'Compared with' in p.page.locator('#v-match').inner_text()
        p.js('CM.prepCompare(true)')
        # The hand's drawer text comes verbatim from server-generated effects.
        assert p.js("CB.catalog.cards.every(c => c.lines.length && c.text)")
        assert not p.errors
    finally:
        p.ctx.close()


def test_analyst_compare_and_three_week_stress(server, browser):
    """Exercise real Analyst workers through UI with short smoke-test fixtures."""
    import json
    p = Page(browser, server)
    requests, responses = [], []
    try:
        p.wait('window.CB && CB.catalog && S.career.build')
        def short_fixture(route):
            body = route.request.post_data_json
            body['start_request']['config']['duration_seconds'] = 180
            requests.append(body)
            route.continue_(post_data=json.dumps(body))
        p.page.route('**/api/analyst/test', short_fixture)
        p.page.on('response', lambda r: responses.append(r.json())
                  if r.url.endswith('/api/analyst/test') and r.status == 200 else None)
        p.js('CB.playFriendly(S.career.cal.friendlies[0].id)')
        p.wait("document.querySelectorAll('.cm-pcard').length > 0")
        p.js("CM.prepCompare(); CM.prepToggle('time_waste'); CM.prepToggle('blitz'); CM.analystTest()")
        p.wait('S.career.build.analyst_runs_left === 1', 60000)
        assert requests[0]['hand'] != requests[0]['variants'][0]['hand']
        assert len(responses[0]['variants']) == 1
        assert 'saved hand' in p.page.locator('.cm-an-res').inner_text()
        p.js('CB.finishCampWeek()')
        p.wait('S.career.cal.camp === 2 && S.career.build.analyst_runs_left === 2')
        p.js("CM.analystTest('stress')")
        p.wait('S.career.build.analyst_runs_left === 0', 60000)
        result = responses[-1]
        assert result['mode'] == 'stress' and result['matches'] == 48
        assert len(result['weeks']) == 3 and result['runs_left'] == 0
        assert requests[-1]['start_request']['away_team']['club_id'] == 'FUL'
        assert 'Week 3:' in p.page.locator('.cm-an-res').inner_text()
        assert not p.errors
    finally:
        p.ctx.close()
