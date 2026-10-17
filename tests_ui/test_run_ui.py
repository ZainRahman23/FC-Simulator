"""The Run (docs/RUN_MODE.md): one round end to end against the real API.

Choose a system → pick the opponent → kick off with a hand → full time →
pick a reward → the next round. Also checks that the run never writes into
the season save and survives a reload.
"""
from test_career_ui import server, browser, Page


def to_full_time(p):
    p.js("CM.resume()")
    p.js("CM._jump(5390)")
    for _ in range(40):
        if p.js("S.match && S.match.status") == 'ft':
            return
        p.js("CM.resume()")
        p.page.wait_for_timeout(1500)
    raise AssertionError("match never reached full time")


def test_run_round_reward_and_isolation(server, browser):
    p = Page(browser, server, w=1440, h=960)
    try:
        p.wait("window.CB && CB.catalog && window.RN")
        season = p.js("JSON.stringify(S.current.starters)")
        p.js("RN.newRun()")
        p.wait("RN.state() && RN.state().status === 'draft' && document.querySelectorAll('.rn-sys').length === 3")
        sid = p.js("RN.state().choices[0]")
        p.js("sid => RN.chooseSystem(sid)", sid)
        p.wait("RN.state().phase === 'path' && Object.values(RN.state().squad.starters).filter(Boolean).length === 11")
        opts = p.js("RN.state().next.options.map(o => o.kind)")
        assert opts == ['standard', 'elite']
        assert p.js("RN.state().next.options[1].threats.length") == 1

        p.js("RN.pickOpponent(1)")
        p.wait("document.querySelectorAll('#rnBoard .cb-tok').length === 11 && RN.lastEval() && RN.lastEval().system_fit > 0")
        assert p.js("document.body.classList.contains('tl-run')")
        p.js("RN.kickOff()")
        p.wait("S.match && S.match.matchId && CM._cards() && CM._cards().hand.length === 5", 90000)
        assert p.js("S.matchFixture.run && S.ui.matchSpeed") == 8
        hand = p.js("CM._cards().hand")
        assert hand == p.js("RN.state().hand")
        p.js("CM._jump(1790)")
        p.wait("document.querySelector('#cmMoment .cm-mo-t') && /30'/.test(document.querySelector('#cmMoment .cm-mo-t').textContent)", 90000)
        to_full_time(p)
        p.wait("RN.state().last && RN.state().last.fid === S.matchFixture.id")
        last = p.js("RN.state().last")
        assert last['res'] in ('W', 'D', 'L') and last['xg'] is not None
        p.js("continueSeason()")
        p.wait("RN.state().offers && RN.state().offers.list", 90000)
        n = {'W': 3, 'D': 2, 'L': 1}[last['res']]
        offers = p.js("RN.state().offers.list")
        assert 1 <= len(offers) <= n
        assert any(o['type'] in ('card', 'partner') for o in offers)
        deck0 = p.js("RN.state().build.deck.length")
        p.js("RN.pickOffer(0)")
        p.wait("RN.state().phase === 'path'")
        st = p.js("RN.state()")
        assert st['round'] == 1 and st['lives'] == (3 if last['res'] != 'L' else 2)
        kind = offers[0]['type']
        if kind == 'card':
            assert len(st['build']['deck']) == deck0 + 1
        if kind == 'partner':
            assert st['build']['partnerships']

        p.js("RN.leave()")
        assert p.js("JSON.stringify(S.current.starters)") == season
        p.page.reload()
        p.wait("window.RN && RN.state() && TL.build && TL.build._run")
        assert p.js("RN.state().round") == 1
        assert p.js("JSON.stringify(S.current.starters)") == season
        assert not [e for e in p.errors if 'PAGEERROR' in e]
    finally:
        p.ctx.close()
