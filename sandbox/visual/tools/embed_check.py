"""Broadcast embed check: drives sandbox/visual/tools/embed_check.html (which
plays the Touchline app's role against window.TouchlineBroadcast) through the
contract — start, labels, highlight, 8x, rewind, sub, hide/show, init-again,
full time — taking screenshots and collecting console errors / HTTP >= 400.

  TOUCHLINE_WORKERS=2 python -m uvicorn server:app --port 8921   (separately)
  python sandbox/visual/tools/embed_check.py [--base http://127.0.0.1:8921] [--out /tmp/embedshots] [--dpr 2]
"""
import argparse
import asyncio
import json
import os

from playwright.async_api import async_playwright


async def main(a):
    os.makedirs(a.out, exist_ok=True)
    problems, report = [], {}
    async with async_playwright() as p:
        # this sandbox's Chrome caps rAF at ~30 Hz unless the frame-rate limiter is off
        # (an about:blank rAF probe reads 30 without / 59 with these flags)
        args = ["--disable-gpu-vsync", "--disable-frame-rate-limit"] if not a.capped else []
        b = await p.chromium.launch(channel="chrome", headless=not a.headed, args=args)
        ctx = await b.new_context(viewport={"width": a.w, "height": a.h}, device_scale_factor=a.dpr)
        pg = await ctx.new_page()
        pg.on("console", lambda m: problems.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
        pg.on("response", lambda r: problems.append(f"HTTP {r.status} {r.url}") if r.status >= 400 else None)
        await pg.goto(a.base + "/sandbox/visual/tools/embed_check.html")
        fr = pg.frame_locator("#bc")

        async def B(js):
            return await pg.evaluate(f"(async () => {{ {js} }})()")

        async def shot(name, wait=0):
            if wait:
                await pg.wait_for_timeout(wait)
            path = os.path.join(a.out, name + ".png")
            await pg.screenshot(path=path)
            return path

        async def stats():
            return await B("return H.B.stats();")

        await B("await H.start();")
        await B("H.B.setOptions({labels: 'numbers'});")
        await pg.wait_for_timeout(6000)
        report["numbers_1x"] = await stats()
        await shot("01_numbers_1x")
        # highlight two home players + names
        hl = await B("const ids = Object.entries(H.players).filter(([k, v]) => v.team === 'HOME' && v.position !== 'GK').map(([k]) => k).slice(0, 2); H.B.setOptions({labels: 'names', highlight: ids}); return ids;")
        report["highlight"] = hl
        await shot("02_names_highlight", 2500)
        # 8x for 8 s: fps
        await B("H.speed = 8; H.B.setOptions({labels: 'numbers', highlight: []});")
        await pg.wait_for_timeout(8000)
        report["numbers_8x"] = await stats()
        await shot("03_numbers_8x")
        await B("H.B.setOptions({quality: 'low'});")
        await pg.wait_for_timeout(4000)
        report["numbers_8x_low"] = await stats()
        await shot("03b_numbers_8x_quality_low")
        await B("H.B.setOptions({quality: 'high'});")
        # pause, click a player
        await B("H.playing = false;")
        await pg.wait_for_timeout(500)
        # find a drawn player via the frame's internal list (exposed through a click probe)
        pos = await pg.evaluate("""() => { const w = document.getElementById('bc').contentWindow;
            const cv = w.document.getElementById('view'); const r = cv.getBoundingClientRect();
            const R = cv.width / r.width; const L = w.TouchlineBroadcast._drawn ? w.TouchlineBroadcast._drawn() : [];
            if (!L.length) return null; const e = L[L.length - 1];
            return {pid: e.pid, x: e.ax / R + r.left, y: (e.ay - 50 * e.s) / R + r.top + 28}; }""")
        if pos:
            await pg.mouse.click(pos["x"], pos["y"])
            await pg.wait_for_timeout(200)
            clicks = await B("return H.clicks;")
            report["click"] = {"expected": pos["pid"], "got": clicks}
        await B("H.playing = true; H.speed = 1;")
        # rewind 60 s
        cl = await B("return H.clock;")
        await B(f"await H.rewind({max(0, int(cl) - 60)});")
        await pg.wait_for_timeout(3000)
        report["after_rewind"] = await stats()
        await shot("04_after_rewind")
        # substitution: first HOME outfielder off, first unused bench on
        sub = await B("""const r = await fetch('/api/matches/' + H.mid + '/insights?team=HOME').then(x => x.ok ? x.json() : null);
            const on = (H.roster || []).find(pid => pid.startsWith('liv_') && !H.players[pid]);
            const off = Object.entries(H.players).find(([k, v]) => v.team === 'HOME' && v.position === 'ST');
            if (!on || !off) return {skipped: true};
            try { await H.sub('HOME', off[0], on); } catch (e) { return {error: String(e)}; }
            await H.fetchMore(60); return {off: off[0], on, info: H.players[on] || null};""")
        report["sub"] = sub
        await pg.wait_for_timeout(3000)
        await shot("05_after_sub")
        # hide / show: drawing stops when hidden
        await B("H.B.setOptions({visible: false});")
        await pg.wait_for_timeout(1500)
        report["hidden"] = await stats()
        await B("H.B.setOptions({visible: true});")
        await pg.wait_for_timeout(1500)
        # init again: new match, different kits, NO positions (keeper fallback), dry, names
        await B("""H.speed = 1; await H.start({seed: 7, fixture: 'embed_check_2', positions: false, weather: 'off', ball: 'yellow',
            kits: {home: {name: 'Home FC', short: 'HOM', kit: {primary: '#ffffff', secondary: '#111111', gk: '#ff7a00'}},
                   away: {name: 'Away FC', short: 'AWA', kit: {primary: '#101010', secondary: '#f0c419', gk: '#9b30ff'}}}});
            H.B.setOptions({labels: 'names'});""")
        await pg.wait_for_timeout(5000)
        report["init_again"] = await stats()
        await shot("06_init_again_names")
        # full time: seek near the end, run out the clock at 8x
        await B("await H.seekForward(5360); H.speed = 8; H.B.setOptions({labels: 'off'});")
        await pg.wait_for_timeout(9000)
        report["full_time"] = await stats()
        report["ft_flag"] = await B("return {ft: H.ft, clock: H.clock, bufEnd: H.bufEnd};")
        await shot("07_full_time")
        await b.close()
    report["problems"] = problems
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8921")
    ap.add_argument("--out", default="/tmp/embedshots")
    ap.add_argument("--dpr", type=float, default=2)
    ap.add_argument("--headed", action="store_true", help="real window (headless Chrome caps rAF near 30 Hz)")
    ap.add_argument("--capped", action="store_true", help="keep Chrome's default frame-rate limiter")
    ap.add_argument("--w", type=int, default=1280)
    ap.add_argument("--h", type=int, default=748)
    asyncio.run(main(ap.parse_args()))
