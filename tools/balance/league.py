"""Season harness (§14.1 ``sim_season``).

1. **Requests come from the app itself.** Headless Chrome (Playwright) boots
   the Touchline page against a private server and, for every matchweek, asks
   the career layer for each club's CPU side exactly as a league batch would
   (``cpuSideForRequest``: squad, auto XI, AI tactics, rotation condition).
   Fixtures and seeds come from the app too. Exports are cached keyed by the
   web-layer digest + season seeds.
2. **Matches run through the real engine** via ``management.build_engine``
   (the same path as ``labsim.sim_full``). With ``cards`` enabled the worker
   plays the match in 1-minute steps and lets the build-layer AI policy play
   Tactic Cards for either side (compiled by ``build.py`` through the adapter).
3. The worker returns a compact record (score, team stats, per-player goals,
   goal/shot/red timelines, card plays) which feeds the season report and the
   feel metrics (§14.6).

Nothing here changes the engine; overrides only touch the manager-layer
inputs (squads, attributes, tactics, roles, lineups).
"""
from __future__ import annotations

import copy
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from collections import Counter, defaultdict
from typing import Any

from tools.balance import common as C

TOP6 = {"MCI", "ARS", "LIV", "CHE", "NEW", "TOT"}
BOTTOM6 = {"WOL", "LEE", "BUR", "SUN", "WHU", "EVE"}
PORT = int(os.environ.get("BALANCE_PORT", "8973"))


# ── 1. export requests from the app ─────────────────────────────────────────
def _port_free(port: int) -> bool:
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def start_server(port: int = PORT):
    """Private server (TOUCHLINE_DATA_DIR=/tmp/v2_bal). Returns (proc, url);
    proc is None if something already answers on the port (reused)."""
    url = f"http://127.0.0.1:{port}"
    if not _port_free(port):
        try:
            with urllib.request.urlopen(url + "/api/health", timeout=2):
                return None, url
        except Exception:
            raise RuntimeError(f"port {port} busy and not a Touchline server")
    data = os.environ.get("BALANCE_DATA_DIR", "/tmp/v2_bal")
    os.makedirs(data, exist_ok=True)
    env = {**os.environ, "TOUCHLINE_DATA_DIR": data, "TOUCHLINE_WORKERS": "0", "PORT": str(port)}
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "server:app", "--port", str(port)],
                            cwd=C.ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(160):
        try:
            with urllib.request.urlopen(url + "/api/health", timeout=1):
                return proc, url
        except Exception:
            time.sleep(0.25)
    proc.terminate()
    raise RuntimeError("server did not start")


EXPORT_JS = """(seasonSeed) => {
  const keep = {seed: S.season.seed, mw: S.season.matchweek};
  S.season.seed = seasonSeed;
  const clubs = CLUBS.map(c => c.id);
  const fixtures = S.season.fixtures.map(f => ({id: f.id, mw: f.mw, home: f.home, away: f.away, seed: fixtureSeed(f)}));
  const sides = {};
  const mws = [...new Set(fixtures.map(f => f.mw))];
  for(const mw of mws){
    S.season.matchweek = mw;
    sides[mw] = {};
    for(const c of clubs) sides[mw][c] = cpuSideForRequest(c);
  }
  S.season.seed = keep.seed; S.season.matchweek = keep.mw;
  const tier = {}; for(const c of clubs) tier[c] = CC.clubStrength(c);
  const plan = {}; for(const c of clubs){ const cl = CLUBS.find(x => x.id === c); plan[c] = cl && cl.plan; }
  const cpu_builds = window.CC && CC.cpuBuilds ? Object.fromEntries(clubs.map(c=>[c, CC.cpuBuilds({home:c,away:c}).HOME])) : {};
  const economy = window.CB && CB.ECON ? {constants: JSON.parse(JSON.stringify(CB.ECON)), prizes: Array.from({length:20}, (_,i)=>CB.ECON.PRIZE(i+1)), finances: JSON.parse(JSON.stringify(S.finance))} : null;
  return {fixtures, sides, strength: tier, plan, cpu_builds, economy, calendar: window.CB && CB.weeks ? CB.weeks() : null, names: Object.fromEntries(CLUBS.map(c => [c.id, c.name]))};
}"""


def export_seasons(season_seeds: list[int], url: str | None = None, refresh: bool = False) -> list[dict]:
    ck = f"export/{C.key(C.web_digest(), C.build_digest(), C.harness_digest())}_{C.key(season_seeds)}.pkl"
    if not refresh:
        hit = C.cache_get(ck)
        if hit is not None:
            return hit
    proc = None
    if not url:
        proc, url = start_server()
    try:
        from playwright.sync_api import sync_playwright
        out = []
        with sync_playwright() as p:
            try:
                b = p.chromium.launch(channel="chrome")
            except Exception:
                b = p.chromium.launch()
            pg = b.new_page()
            pg.goto(url + "/")
            pg.wait_for_function("window.TL && TL.booted && window.CC && S.career && S.season", timeout=60000)
            pg.evaluate("TL.booted.then(()=>0)")
            pg.wait_for_function("window.CB && CB.catalog && CB.catalog.systems && CB.catalog.systems.length", timeout=60000)
            for s in season_seeds:
                sea = pg.evaluate(EXPORT_JS, s)
                sea["sides"] = {int(k): v for k, v in sea["sides"].items()}
                sea["season_seed"] = s
                out.append(sea)
            b.close()
    finally:
        if proc:
            proc.terminate()
            try:
                proc.wait(10)
            except Exception:
                proc.kill()
    C.cache_put(ck, out)
    return out


def fixture_request(sea: dict, f: dict, home_side: dict | None = None, away_side: dict | None = None) -> dict:
    sd = sea["sides"][f["mw"]]
    return {"save_id": "season-sim", "fixture_id": f["id"], "seed": f["seed"], "mode": "full",
            "config": {"duration_seconds": 90 * 60}, "coach_ai": {"home": True, "away": True},
            "home_team": home_side or sd[f["home"]], "away_team": away_side or sd[f["away"]]}


# ── 2. match worker ─────────────────────────────────────────────────────────
def _flat(ts: dict) -> dict:
    return {k: v for k, v in ts.items() if not isinstance(v, dict)}


def play_match(req: dict, opts: dict | None = None) -> dict:
    """One match through the engine. ``opts``:
      builds: {"HOME"|"AWAY": {system_id, control:'cpu', difficulty, ...}}
              -> merged into request["builds"]; build.py's CPU card runtime
                 plays Tactic Cards for that side and kick-off modifiers apply.
      engine_only: True -> management.build_engine (no build layer at all).
    Returns a compact, picklable record."""
    import bridge
    opts = opts or {}
    req = dict(req)
    if opts.get("builds"):
        req["builds"] = {**(req.get("builds") or {}), **opts["builds"]}
    if opts.get("engine_only") or not req.get("builds"):
        import management           # no build layer in play: the current game
        engine = management.build_engine(req)
    else:
        from tools.balance import adapter
        engine = adapter.build_engine(req)
    result = engine.run()
    plays = [(e.timestamp, e.team_id, (e.detail or {}).get("card_id") or (e.detail or {}).get("card"))
             for e in engine.events if e.event_type in ("CARD_PLAY", "TACTIC_CARD", "CARD_PLAYED")]
    ft = bridge.full_time_payload(engine, result)
    ps = {}
    for pid, p in (ft.get("player_stats") or {}).items():
        ps[pid] = {k: p.get(k) for k in ("name", "team_id", "goals", "assists", "shots", "passes",
                                          "minutes", "slot")}
    goals, shots, reds, shapes, subs = [], [], [], [], []
    for e in engine.events:
        t = e.event_type
        if t == "GOAL":
            goals.append((e.timestamp, e.team_id, e.actor_id))
        elif t == "SHOT":
            shots.append((e.timestamp, e.team_id, float((e.detail or {}).get("xg", 0) or 0)))
        elif t == "CARD" and "RED" in str((e.detail or {}).get("card", "")):
            reds.append((e.timestamp, e.team_id))
        elif t == "FORMATION_CHANGE":
            shapes.append((e.timestamp, e.team_id))
        elif t == "SUBSTITUTION":
            subs.append((e.timestamp, e.team_id))
    # fatigue alert proxy: first time any on-pitch player of a side is < 60 energy
    return {"score": ft["score"],
            "team_stats": {s: _flat(ts) for s, ts in ft["team_stats"].items()},
            "possession": ft.get("possession"),
            "players": ps, "goals": goals, "shots": shots, "reds": reds,
            "shapes": shapes, "subs": subs, "plays": plays}


def _job(req: dict, opts: dict | None) -> dict:
    return play_match(req, opts)


def simulate_matches(reqs: list[dict], opts_list: list[dict | None] | None = None,
                     label: str = "matches", cache_tag: str | None = None) -> list[dict]:
    """Parallel + cached (per request+opts, keyed by engine & build digests)."""
    opts_list = opts_list or [None] * len(reqs)
    if len(opts_list) != len(reqs):
        raise ValueError("requests/options lengths differ")
    ed, bd = C.engine_digest(), C.build_digest()
    keys = [f"match/{ed}/{C.key(r, o, bd, C.harness_digest(), C.policy_digest())}.pkl" for r, o in zip(reqs, opts_list)]
    out: list[Any] = [C.cache_get(k) for k in keys]
    todo = [i for i, v in enumerate(out) if v is None]
    if todo:
        res = C.run_map(_job, [(reqs[i], opts_list[i]) for i in todo], label=f"{label} ({len(todo)} new)",
                        on_result=lambda j, r: C.cache_put(keys[todo[j]], r))
        for i, r in zip(todo, res):
            out[i] = r
            C.cache_put(keys[i], r)
    return out


def sim_season(sea: dict, side_override=None, opts_fn=None, label="season", career_state=None) -> list[dict]:
    """All fixtures of an exported season. ``side_override(club, mw, side) -> side``
    lets experiments swap in modified sides; ``opts_fn(f) -> opts`` adds cards."""
    if opts_fn and side_override is None:
        return sim_progressing_season(sea, opts_fn, label, career_state)
    reqs, opts = [], []
    for f in sea["fixtures"]:
        sd = sea["sides"][f["mw"]]
        h, a = sd[f["home"]], sd[f["away"]]
        if side_override:
            h = side_override(f["home"], f["mw"], h)
            a = side_override(f["away"], f["mw"], a)
        reqs.append(fixture_request(sea, f, h, a))
        opts.append(opts_fn(f) if opts_fn else None)
    res = simulate_matches(reqs, opts, label=label)
    return [{**f, **r} for f, r in zip(sea["fixtures"], res)]


def _train_cpu_side(b, side, club, builds, gains, policy, mw, do_train=True):
    players = [p for p in list(side["lineup"].values()) + side.get("bench", []) if p]
    for p in players:
        for attr, gain in gains.get(club, {}).get(str(p["id"]), {}).items():
            p["a"][attr] = min(99, p["a"][attr] + gain)
    if not do_train:
        return
    # Scripted balanced plan: establish CB combo, train system and
    # spread remaining TP over first XI. All caps/wallets from build.train.
    plan = []
    if "LCB" in side["lineup"] and "RCB" in side["lineup"]:
        plan.append({"kind": "pair", "pattern": "cb_pair", "members": [str(side["lineup"][sl]["id"]) for sl in ("LCB", "RCB")], "tp": 1})
    plan.append({"kind": "system", "tp": 1})
    xi = [p for p in side["lineup"].values() if p and p["pos"] != "GK"]
    if policy == "youth":
        youth = sorted((p for p in players if p["pos"] != "GK"), key=lambda p: (p.get("age", 99), -p.get("pot", p["ovr"])))
        xi = youth[:min(5, len(youth))] or xi
    budget = max(0, builds[club]["tp"]["wallet"] - len(plan))
    for k in range(budget):
        p = xi[(mw + k) % len(xi)]
        plan.append({"kind": "attr", "pid": str(p["id"]), "attr": ("stam", "rea", "sps")[(mw+k) % 3], "tp": 1})
    trained = b.train(players, builds[club], plan)
    builds[club] = trained["build"]
    for pid, attrs in trained["squad_deltas"].items():
        acc = gains.setdefault(club, {}).setdefault(pid, {})
        for attr, gain in attrs.items():
            acc[attr] = acc.get(attr, 0) + gain
            for p in players:
                if str(p["id"]) == pid:
                    p["a"][attr] += gain


def sim_progressing_season(sea, opts_fn, label, career_state=None):
    """Scripted CPU manager: persistent training/partnership/familiarity inputs.
    Fixture results remain engine generated. Injuries/transfers are not modelled.
    State may be shared across seasons; each season resets authoritative caps.
    """
    from tools.balance import adapter
    b = adapter.build_mod()
    store = career_state if career_state is not None else {}
    builds = store.setdefault("builds", {})
    gains = store.setdefault("gains", {})
    first = min(sea["sides"])
    calendar = sea.get("calendar") or [{"kind": "camp", "mws": []}] + [{"kind": "single", "mws": [i]} for i in range(1, 39)]
    by_mw = {mw: w for w in calendar for mw in w["mws"]}
    pending_played = defaultdict(list)
    for club, side in sea["sides"][first].items():
        template = opts_fn({"home": club, "away": club})["builds"]["HOME"]
        builds[club] = b.new_season(builds.get(club) or b.new_build(template["system_id"]))
        builds[club].update(control="cpu", difficulty="normal")
        for ci, camp in enumerate(w for w in calendar if w["kind"] == "camp"):
            builds[club] = b.week_tick([], builds[club], [], "camp")["build"]
            camp_side = copy.deepcopy(side)
            _train_cpu_side(b, camp_side, club, builds, gains, (store.get("training_policy") or {}).get(club, "first_xi"), -ci)
        builds[club] = b.week_tick([], builds[club], [], by_mw[first]["kind"])["build"]
    output = []
    for mw in sorted({f["mw"] for f in sea["fixtures"]}):
        sides = copy.deepcopy(sea["sides"][mw])
        week = by_mw.get(mw, {"kind": "single", "mws": [mw]})
        for club, side in sides.items():
            policy = (store.get("training_policy") or {}).get(club, "first_xi")
            _train_cpu_side(b, side, club, builds, gains, policy, mw, do_train=mw == week["mws"][0])
        fixtures = [f for f in sea["fixtures"] if f["mw"] == mw]
        reqs, opts = [], []
        for f in fixtures:
            reqs.append(fixture_request(sea, f, sides[f["home"]], sides[f["away"]]))
            opts.append({"builds": {"HOME": builds[f["home"]], "AWAY": builds[f["away"]]}})
        results = simulate_matches(reqs, opts, label=f"{label} MW{mw}")
        output += [{**f, **r} for f, r in zip(fixtures, results)]
        for club, side in sides.items():
            played = [{"system_id": builds[club]["system_id"], "xi": [str(p["id"]) for p in side["lineup"].values() if p]}] if any(club in (f["home"], f["away"]) for f in fixtures) else []
            pending_played[club].extend(played)
            if mw == week["mws"][-1]:
                next_kind = by_mw.get(mw + 1, {"kind": "single"})["kind"]
                builds[club] = b.week_tick([], builds[club], pending_played[club], next_kind)["build"]
                pending_played[club] = []
    store["last_season"] = sea.get("season_seed")
    return output


# ── 3. report ───────────────────────────────────────────────────────────────
def table(matches: list[dict]) -> list[tuple]:
    t = defaultdict(lambda: {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0})
    for m in matches:
        h, a = m["home"], m["away"]
        gh, ga = m["score"]["home"], m["score"]["away"]
        for c, gf, gA in ((h, gh, ga), (a, ga, gh)):
            r = t[c]
            r["p"] += 1; r["gf"] += gf; r["ga"] += gA
            if gf > gA:
                r["w"] += 1; r["pts"] += 3
            elif gf == gA:
                r["d"] += 1; r["pts"] += 1
            else:
                r["l"] += 1
    rows = sorted(t.items(), key=lambda kv: (-kv[1]["pts"], -(kv[1]["gf"] - kv[1]["ga"]), -kv[1]["gf"]))
    return [(c, r["pts"], r["w"], r["d"], r["l"], r["gf"], r["ga"]) for c, r in rows]


def season_report(matches: list[dict]) -> dict:
    n = len(matches)
    hw = sum(m["score"]["home"] > m["score"]["away"] for m in matches)
    dr = sum(m["score"]["home"] == m["score"]["away"] for m in matches)
    goals = sum(m["score"]["home"] + m["score"]["away"] for m in matches)
    nil = sum(m["score"]["home"] + m["score"]["away"] == 0 for m in matches)
    big = sum(abs(m["score"]["home"] - m["score"]["away"]) >= 5 for m in matches)
    scorers = Counter(); scorer_name = {}; team_goals = Counter()
    pa = pc = 0; xg = 0.0; shots = 0
    bvs = Counter(); slot_goals = Counter()
    for m in matches:
        h, a = m["home"], m["away"]
        gh, ga = m["score"]["home"], m["score"]["away"]
        team_goals[h] += gh; team_goals[a] += ga
        for side in ("home", "away"):
            ts = m["team_stats"][side]
            pa += ts.get("passes_attempted", 0) or 0
            pc += ts.get("passes_completed", 0) or 0
            xg += ts.get("xg", 0) or 0
            shots += ts.get("shots", 0) or 0
        for pid, p in m["players"].items():
            if p.get("goals"):
                club = h if p["team_id"] == "HOME" else a
                scorers[(pid, club)] += p["goals"]
                scorer_name[(pid, club)] = p["name"]
                slot_goals[p.get("slot") or "?"] += p["goals"]
        for big_c, small_c in ((h, a), (a, h)):
            if big_c in TOP6 and small_c in BOTTOM6:
                gb = gh if big_c == h else ga
                gs = ga if big_c == h else gh
                bvs["W" if gb > gs else "D" if gb == gs else "L"] += 1
    rows = table(matches)
    best = {}
    for (pid, club), g in scorers.items():
        if club not in best or g > best[club][1]:
            best[club] = (scorer_name[(pid, club)], g)
    shares = {c: best[c][1] / team_goals[c] for c in best if team_goals[c]}
    top = scorers.most_common(10)
    tg = sum(slot_goals.values()) or 1
    return {
        "tail_matches": [{"home": m["home"], "away": m["away"], "score": m["score"],
                          "xg_home": m["team_stats"]["home"].get("xg", 0),
                          "xg_away": m["team_stats"]["away"].get("xg", 0)}
                         for m in sorted(matches, key=lambda m: (abs(m["score"]["home"] - m["score"]["away"]),
                             m["score"]["home"] + m["score"]["away"]), reverse=True)[:5]],
        "matches": n, "goal_totals": [m["score"]["home"] + m["score"]["away"] for m in matches], "home_win": hw / n, "draw": dr / n, "away_win": (n - hw - dr) / n,
        "goals_pg": goals / n, "xg_pg": xg / n, "shots_pg": shots / n, "nil_nil": nil / n,
        "margin5plus": big / n, "pass_completion": pc / max(1, pa),
        "table": rows, "champion_pts": rows[0][1], "p17_pts": rows[16][1], "p18_pts": rows[17][1],
        "last_pts": rows[-1][1],
        "top_scorers": [(scorer_name[k], k[1], g) for k, g in top],
        "top_scorer_goals": top[0][1] if top else 0,
        "club_top_share": {c: (best[c][0], best[c][1], round(shares[c], 3)) for c in shares},
        "mean_club_top_share": sum(shares.values()) / max(1, len(shares)),
        "max_club_top_share": max(shares.values()) if shares else 0,
        "clubs_over_45": sum(1 for v in shares.values() if v > 0.45),
        "big_vs_small": dict(bvs),
        "slot_goal_share": {k: v / tg for k, v in slot_goals.most_common()},
    }


def league_gates(reps: list[dict]) -> list[dict]:
    """§9 league-realism gates over pooled seasons, with 95% CIs."""
    def pooled(k):
        return sum(r[k] * r["matches"] for r in reps) / sum(r["matches"] for r in reps)
    N = sum(r["matches"] for r in reps)
    out = []

    def prop(name, k, lo, hi):
        p, a, b = C.prop_ci(round(pooled(k) * N), N)
        out.append({"gate": name, "value": p, "ci": (a, b), "target": f"{lo:.0%}-{hi:.0%}",
                    "pass": lo <= p <= hi, "fmt": "pct"})
    prop("draws", "draw", 0.22, 0.28)
    prop("home win", "home_win", 0.42, 0.48)
    gp = [r["goals_pg"] for r in reps]
    m = pooled("goals_pg")
    goal_samples = [g for report in reps for g in report.get("goal_totals", [])]
    interval = C.ci95(goal_samples)[1:] if len(goal_samples) == N else None
    out.append({"gate": "goals/game", "value": m, "ci": interval, "target": "2.5-3.0",
                "pass": 2.5 <= m <= 3.0, "fmt": "f2", "per_season": gp})
    ch = [r["champion_pts"] for r in reps]
    out.append({"gate": "champion pts", "value": sum(ch) / len(ch), "per_season": ch, "target": "85-95",
                "pass": all(85 <= x <= 95 for x in ch), "fmt": "f1"})
    rl = [r["p18_pts"] for r in reps]
    out.append({"gate": "relegation line (18th)", "value": sum(rl) / len(rl), "per_season": rl,
                "target": "30-38", "pass": all(30 <= x <= 38 for x in rl), "fmt": "f1"})
    sh = [r["max_club_top_share"] for r in reps]
    ms = [r["mean_club_top_share"] for r in reps]
    out.append({"gate": "top scorer share of team goals (max club)", "value": max(sh),
                "per_season": [round(x, 2) for x in sh], "mean_club": sum(ms) / len(ms),
                "target": "<=45%", "pass": max(sh) <= 0.45, "fmt": "pct"})
    ts = [r["top_scorer_goals"] for r in reps]
    out.append({"gate": "top scorer tally", "value": sum(ts) / len(ts), "per_season": ts,
                "target": "20-30", "pass": all(20 <= x <= 30 for x in ts), "fmt": "f1"})
    p, a, b = C.prop_ci(round(pooled("margin5plus") * N), N)
    out.append({"gate": "blowouts (5+ margin)", "value": p, "ci": (a, b), "target": "<3%",
                "pass": p < 0.03, "fmt": "pct"})
    complete = len(reps) >= 3 and all(r["matches"] == 380 for r in reps)
    for gate in out:
        gate["screening_in_band"] = gate["pass"]
        if not complete:
            gate["pass"] = None
            gate["reason"] = "Requires at least three complete 380-match seasons"
        elif gate.get("ci"):
            lo, hi = gate["ci"]
            if gate["gate"] == "blowouts (5+ margin)":
                gate["pass"] = True if hi < .03 else False if lo >= .03 else None
            else:
                low, high = (.22, .28) if gate["gate"] == "draws" else ((2.5, 3.) if gate["gate"] == "goals/game" else (.42, .48))
                gate["pass"] = True if low <= lo and hi <= high else False if hi < low or lo > high else None
    return out
