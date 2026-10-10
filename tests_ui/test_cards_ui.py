"""A prepared card stays tied to the presented clock and authoritative effects."""
from test_career_ui import server, browser, Page


def test_card_drawer_exact_effects_and_presented_play(server, browser):
    p = Page(browser, server)
    try:
        p.wait('window.CB && CB.catalog && S.career.build')
        p.js('startFixture(nextLivFixture().id)')
        p.wait("document.querySelectorAll('.cm-pcard').length > 0")
        p.js("CM.setAutoPause('off'); kickOff()")
        p.wait("S.match && S.match.status === 'live' && S.match.matchId")
        p.page.wait_for_timeout(400)
        p.js("if(S.match.status === 'live') togglePlay()")
        p.js("CM.cardDrawer('tactical_foul')")
        p.wait("document.querySelector('.cm-drawer .cd-lines li')")
        card = p.js("CB.catalog.cards.find(c => c.id === 'tactical_foul')")
        drawer = p.page.locator('.cm-drawer').inner_text()
        for line in card['lines']:
            assert line in drawer
        state = p.js('CM._cards()')
        clock = p.js('Math.floor(CM._presS())')
        requests = []
        p.page.on('request', lambda r: requests.append(r.post_data_json)
                  if r.url.endswith('/card') and r.method == 'POST' else None)
        p.js("CM.playCard('tactical_foul')")
        p.wait("CM._cards().plays.length === 1")
        played = p.js('CM._cards()')
        assert requests and requests[0]['at_clock'] == clock
        assert played['plays'][0]['clock'] == clock
        assert played['influence']['now'] == state['influence']['now'] - card['cost']
        assert p.js('S.match.clockSeconds') == clock
        p.js('CM.resume()')
        p.wait("CM._cards().played.some(e => e.id === 'tactical_foul')")
        assert not p.errors
    finally:
        p.ctx.close()
