"""Touchline coaching intelligence — the legibility layer.

Pure, read-only analysis of authoritative engine output (event ledger,
player states, management state). Nothing here feeds back into football
resolution: it explains the match to the manager.

  live_insights()   assistant-coach reads during a match (with one-click actions)
  change_impacts()  what happened after each of your decisions (before/after)
  momentum()        per-5-minute threat for both teams
  review()          the post-match "why" — result vs process, turning points,
                    your decisions, players, lessons
  scout()           pre-match opponent report + matchups + suggested plan

Coordinates are the engine's 0-100 frame. A team's own "left" is low y for
both teams (formation anchors: LB y=15, RB y=85, see formations.py), so an
attack down the opponent's low-y channel is aimed at OUR low-y defenders.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from bridge import (ATTACK_ROLE_MAP, DEFENSE_ROLE_MAP, TACTIC_KEY_MAP,
                    TACTIC_VALUE_MAP)

# engine vocabulary -> frontend vocabulary (actions are sent back verbatim)
_TKEY = {v: k for k, v in TACTIC_KEY_MAP.items()}
_TVAL = {v: k for k, v in TACTIC_VALUE_MAP.items()}
_AROLE = {v: k for k, v in ATTACK_ROLE_MAP.items()}
_DROLE = {v: k for k, v in DEFENSE_ROLE_MAP.items()}

LEFT_SLOTS = {"LB", "LCB", "LCM", "LM", "LW", "LAM", "LDM"}
RIGHT_SLOTS = {"RB", "RCB", "RCM", "RM", "RW", "RAM", "RDM"}
DEF_SLOTS = {"LB", "LCB", "RCB", "RB", "CB"}
MID_SLOTS = {"CDM", "LDM", "RDM", "LCM", "RCM", "CM", "LM", "RM"}
ATT_SLOTS = {"LW", "RW", "LAM", "RAM", "CAM", "ST"}
WINDOW = 15 * 60


def opp(team: str) -> str:
    return "AWAY" if team == "HOME" else "HOME"


def _minute(t: int) -> int:
    return max(1, (int(t) + 59) // 60)


_PARTICLES = {"mac", "mc", "st", "al", "el", "van", "von", "de", "der", "den", "da", "di", "dos", "das", "del", "della", "le", "la", "ten", "ter"}


def _short(name: str | None) -> str:
    """Surname as commentators say it: 'Virgil van Dijk' -> 'van Dijk'."""
    if not name:
        return "?"
    parts = str(name).split()
    if len(parts) == 1:
        return parts[0]
    i = len(parts) - 1
    while i > 1 and parts[i - 1].lower() in _PARTICLES:
        i -= 1
    return " ".join(parts[i:])


def _att_x(team: str, x: float) -> float:
    return x if team == "HOME" else 100.0 - x


def _channel(y: float) -> str:
    return "left" if y < 34 else "right" if y > 66 else "centre"


def _slot_channel(slot: str | None) -> str:
    if slot in LEFT_SLOTS:
        return "left"
    if slot in RIGHT_SLOTS:
        return "right"
    return "centre"


# ── windowed metrics ─────────────────────────────────────────────────────────
def window_metrics(events: list[dict], team: str, t0: int, t1: int) -> dict[str, float]:
    """Process metrics for ``team`` over (t0, t1] from the event ledger."""
    m = defaultdict(float)
    poss_for = poss_against = 0.0
    for e in events:
        ts = e["timestamp"]
        if ts <= t0 or ts > t1:
            continue
        et, tid, d = e["event_type"], e.get("team_id"), e.get("detail") or {}
        mine = tid == team
        if et == "SHOT":
            k = "for" if mine else "against"
            m[f"shots_{k}"] += 1
            m[f"xg_{k}"] += float(d.get("xg", 0.0))
            if float(d.get("xg", 0.0)) >= 0.3:
                m[f"big_{k}"] += 1
            if d.get("transition"):
                m[f"transition_shots_{k}"] += 1
        elif et == "BOX_ENTRY":
            m["box_for" if mine else "box_against"] += 1
        elif et == "PASS" and tid is not None:
            k = "for" if mine else "against"
            m[f"passes_{k}"] += 1
            if d.get("outcome") in ("COMPLETED", "AERIAL_COMPLETED"):
                m[f"passes_done_{k}"] += 1
                tgt = d.get("actual_target") or d.get("intended")
                if tgt and _att_x(tid, float(tgt[0])) >= 66.0:
                    m[f"final_third_{k}"] += 1
        elif et == "POSSESSION_CHANGE":
            dur = float(d.get("previous_duration_s", 0.0))
            if d.get("from") == team:
                poss_for += dur
            elif d.get("from"):
                poss_against += dur
            if d.get("from") == team:
                m["turnovers"] += 1
            elif d.get("to") == team:
                m["recoveries"] += 1
    tot = poss_for + poss_against
    m["possession"] = round(100.0 * poss_for / tot, 1) if tot > 0 else 50.0
    for k in ("xg_for", "xg_against"):
        m[k] = round(m[k], 2)
    return dict(m)


def attack_channels(events: list[dict], attacker: str, t0: int, t1: int,
                    slot_of: dict[str, str]) -> Counter:
    """Where ``attacker`` is getting at goal: final-third receptions by
    landing channel, plus crosses/dribbles/cutbacks by the actor's flank."""
    c: Counter = Counter()
    for e in events:
        ts = e["timestamp"]
        if ts <= t0 or ts > t1 or e.get("team_id") != attacker:
            continue
        et, d = e["event_type"], e.get("detail") or {}
        if et == "PASS" and d.get("outcome") in ("COMPLETED", "AERIAL_COMPLETED"):
            tgt = d.get("actual_target") or d.get("intended")
            if tgt and _att_x(attacker, float(tgt[0])) >= 70.0:
                c[_channel(float(tgt[1]))] += 1
        elif et in ("CROSS", "CUTBACK_WINDOW"):
            c[_slot_channel(slot_of.get(e.get("actor_id") or ""))] += 2
        elif et == "DRIBBLE" and d.get("outcome") in ("BEAT", "PARTIAL"):
            c[_slot_channel(slot_of.get(e.get("actor_id") or ""))] += 1
    return c


def momentum(events: list[dict], upto: int, bucket: int = 300) -> list[dict]:
    """Threat per 5-minute bucket: xG + 0.04 per box entry, both teams."""
    n = max(1, (int(upto) + bucket - 1) // bucket)
    rows = [{"minute": (i + 1) * bucket // 60, "HOME": 0.0, "AWAY": 0.0,
             "goals": []} for i in range(n)]
    for e in events:
        ts = e["timestamp"]
        if ts > upto or ts <= 0:
            continue
        i = min(n - 1, (ts - 1) // bucket)
        tid = e.get("team_id")
        if e["event_type"] == "SHOT" and tid:
            rows[i][tid] += float((e.get("detail") or {}).get("xg", 0.0))
        elif e["event_type"] == "BOX_ENTRY" and tid:
            rows[i][tid] += 0.04
        elif e["event_type"] == "GOAL" and tid:
            rows[i]["goals"].append({"team": tid, "minute": _minute(ts),
                                     "name": _short(e.get("actor_name"))})
    for r in rows:
        r["HOME"] = round(r["HOME"], 3)
        r["AWAY"] = round(r["AWAY"], 3)
    return rows


# ── actions (frontend vocabulary, sent back verbatim by the client) ─────────
_TLABEL = {"build_up_tempo": "Build-Up Tempo", "passing_directness": "Passing Directness",
           "progression_risk": "Progression Risk", "attacking_width": "Attacking Width",
           "chance_creation_focus": "Chance-Creation Focus", "box_commitment": "Box Commitment",
           "after_winning_possession": "After Winning Possession",
           "after_losing_possession": "After Losing Possession",
           "defensive_block_height": "Defensive Block Height",
           "pressing_intensity": "Pressing Intensity", "defensive_width": "Defensive Width",
           "marking_orientation": "Marking Orientation",
           "defensive_line_behavior": "Defensive Line Behaviour"}


def _tactics_action(label: str, current: dict[str, str], changes: dict[str, str]) -> dict | None:
    """``current``/``changes`` in ENGINE vocabulary. Returns a full frontend
    tactics payload (map_tactics resets unspecified dials, so always send all)."""
    changes = {k: v for k, v in changes.items() if v and current.get(k) != v}
    if not changes:
        return None
    merged = dict(current)
    merged.update(changes)
    return {"label": label, "type": "tactics",
            "tactics": {_TKEY[k]: _TVAL[v] for k, v in merged.items() if k in _TKEY and v in _TVAL},
            "summary": ", ".join(f"{_TLABEL.get(k, k)}: {_TVAL.get(v, v)}"
                                 for k, v in changes.items())}


def _instr_action(label: str, pid: str, ins: dict[str, Any], **changes) -> dict | None:
    new = dict(ins)
    new.update(changes)
    if new == ins:
        return None
    return {"label": label, "type": "instructions", "player_id": pid,
            "instructions": {"attackRole": _AROLE.get(new["attack_role"], "Support"),
                             "attackEffort": int(new["attack_effort"]),
                             "defenseRole": _DROLE.get(new["defense_role"], "Hold Zone"),
                             "defenseEffort": int(new["defense_effort"])}}


_POS_GROUP = {"GK": "GK", "LB": "FB", "RB": "FB", "LWB": "FB", "RWB": "FB",
              "CB": "CB", "LCB": "CB", "RCB": "CB",
              "CDM": "DM", "LDM": "DM", "RDM": "DM", "DM": "DM",
              "CM": "CM", "LCM": "CM", "RCM": "CM",
              "LM": "WM", "RM": "WM", "CAM": "AM", "AM": "AM", "LAM": "WM", "RAM": "WM",
              "LW": "W", "RW": "W", "ST": "ST", "CF": "ST"}
_NEAR = {"FB": {"FB", "CB", "WM"}, "CB": {"CB", "DM", "FB"}, "DM": {"DM", "CM", "CB"},
         "CM": {"CM", "DM", "AM"}, "AM": {"AM", "CM", "W", "WM"}, "WM": {"WM", "W", "FB", "AM"},
         "W": {"W", "WM", "AM", "ST"}, "ST": {"ST", "W", "AM"}, "GK": {"GK"}}


def best_replacement(slot: str, bench: list[dict], used: set[str]) -> dict | None:
    """Most suitable unused bench player for an engine slot."""
    g = _POS_GROUP.get(slot, "CM")
    best, best_key = None, None
    for b in bench:
        if b["id"] in used:
            continue
        bg = _POS_GROUP.get(b.get("pos", "CM"), "CM")
        if (g == "GK") != (bg == "GK"):
            continue
        fit = 0 if bg == g else 1 if bg in _NEAR.get(g, set()) else 3
        key = (fit, -int(b.get("ovr") or 0))
        if best_key is None or key < best_key:
            best, best_key = b, key
    return best if best_key is not None and best_key[0] <= 1 else None


def _sub_action(label: str, out_pid: str, out_slot: str, b: dict) -> dict:
    return {"label": label, "type": "sub", "player_off": out_pid, "player_on": b["id"],
            "target_slot": out_slot, "on_name": b["name"]}


def _pace_loss(energy: float) -> int:
    """Acceleration lost to fatigue (the engine's own fatigue curve, fatigue.py:
    sensitivity 0.34 x energy-deficit squared), in whole percent."""
    d = max(0.0, min(1.0, (100.0 - float(energy)) / 100.0))
    return int(round(100 * 0.34 * d * d))


def player_evidence(ev: list[dict], pid: str, name: str) -> dict[str, int]:
    """Honest per-player counts from the ledger (what actually happened)."""
    c = Counter()
    for e in ev:
        et, d = e["event_type"], e.get("detail") or {}
        if e.get("actor_id") == pid:
            if et == "PASS":
                c["passes"] += 1
                if d.get("outcome") in ("COMPLETED", "AERIAL_COMPLETED"):
                    c["passes_done"] += 1
                elif d.get("outcome") in ("INTERCEPTED", "RECEIVER_DENIED"):
                    c["passes_cut_out"] += 1
            elif et == "DRIBBLE":
                if d.get("outcome") == "LOOSE":        # TACKLED is counted via TACKLE below
                    c["dispossessed"] += 1
                elif d.get("outcome") in ("BEAT", "PARTIAL"):
                    c["dribbles_won"] += 1
            elif et == "SHIELD" and d.get("outcome") in ("DEFENDER_WIN", "LOOSE"):
                c["dispossessed"] += 1
            elif et == "FOUL":
                c["fouls"] += 1
            elif et == "TACKLE" and d.get("outcome") in ("CLEAN_WIN", "POKE_LOOSE"):
                c["tackles_won"] += 1
        if et == "TACKLE" and d.get("carrier") == name and d.get("outcome") in ("CLEAN_WIN", "POKE_LOOSE"):
            c["dispossessed"] += 1
        if et == "DRIBBLE" and d.get("defender") == name and d.get("outcome") == "BEAT":
            c["beaten"] += 1
        if et in ("GROUND_DUEL", "AERIAL_DUEL") and (e.get("actor_id") == pid or d.get("opponent") == name):
            c["duels"] += 1
            if d.get("winner") == name:
                c["duels_won"] += 1
    return dict(c)


def _struggle_text(r: float, evd: dict[str, int]) -> str:
    bits = []
    lost = evd.get("passes", 0) - evd.get("passes_done", 0)
    if evd.get("passes", 0) >= 8 and lost / evd["passes"] >= 0.3:
        bits.append(f"{lost} of his {evd['passes']} passes have gone astray")
    if evd.get("dispossessed", 0) >= 3:
        bits.append(f"he's been dispossessed {evd['dispossessed']} times")
    dl = evd.get("duels", 0) - evd.get("duels_won", 0)
    if evd.get("duels", 0) >= 4 and dl / evd["duels"] >= 0.6:
        bits.append(f"he's lost {dl} of {evd['duels']} duels")
    if evd.get("beaten", 0) >= 2:
        bits.append(f"he's been dribbled past {evd['beaten']} times")
    if not bits:
        return f"Rated {r:.1f} — well below the rest of the side."
    return f"Rated {r:.1f}: " + (", ".join(bits[:-1]) + " and " + bits[-1] if len(bits) > 1 else bits[0]) + "."


# ── live assistant ──────────────────────────────────────────────────────────
def live_insights(ctx: dict[str, Any]) -> list[dict[str, Any]]:
    """ctx: events (<= now), now, team, players (snapshot), management,
    bench (unused bench entries: id/name/pos/ovr), score {HOME,AWAY},
    subs_used, commands (<= now). Returns insights, most important first.

    Design: an assistant who speaks when a decision is worth making. Each
    insight has a stable ``id`` (the client shows an id once); severity 3 is
    reserved for moments that justify pausing the match."""
    ev, now, team = ctx["events"], int(ctx["now"]), ctx["team"]
    other = opp(team)
    players = ctx["players"]
    mg = ctx["management"][team]
    tactics = mg["tactics"]
    my_ins = mg["players"]
    slot_of = {pid: p["slot"] for pid, p in players.items()}
    score = ctx["score"]
    lead = score[team] - score[other]
    minute = now // 60
    dur_min = int(ctx.get("duration", 5400)) // 60
    left = max(0, dur_min - minute)
    half = 1 if now < 45 * 60 else 2
    subs_left = 5 - int(ctx.get("subs_used", 0))
    bench = list(ctx.get("bench") or [])
    used_bench: set[str] = set()
    out: list[dict[str, Any]] = []
    mine_cmds = [c for c in (ctx.get("commands") or [])
                 if str(c["payload"].get("team", "")).upper() == team]
    last_change = max((int(c["sim_clock"]) for c in mine_cmds), default=-10 ** 6)
    settling = now - last_change < 240       # give a fresh change time to work

    t0 = max(0, now - WINDOW)
    w = window_metrics(ev, team, t0, now)
    my_active = {pid: p for pid, p in players.items() if p["team"] == team and p["active"]}
    outfield = {pid: p for pid, p in my_active.items() if p["slot"] != "GK"}

    def add(kind, sev, title, text, why="", actions=None, key=None):
        out.append({"id": key or kind, "kind": kind, "severity": sev, "minute": _minute(now),
                    "title": title, "text": text, "why": why,
                    "actions": [a for a in (actions or []) if a]})

    fresh = {str(c["payload"].get("player_on")) for c in mine_cmds
             if c["kind"] == "substitution" and now - int(c["sim_clock"]) < 15 * 60}
    reds_mine = sum(1 for p in players.values() if p["team"] == team and p["cards"][1] > 0)

    def sub_for(pid, label_fmt="Bring on {on}"):
        if subs_left <= 0 or pid in fresh:        # never undo a sub you just made
            return None
        p = players[pid]
        b = best_replacement(p["slot"], bench, used_bench)
        if not b:
            return None
        used_bench.add(b["id"])
        return _sub_action(label_fmt.format(on=_short(b["name"]), off=_short(p["name"])), pid, p["slot"], b)

    # 1. fatigue — Energy drives effective pace/agility/reactions down
    tired = sorted((p["energy"], pid) for pid, p in outfield.items()
                   if (p["energy"] < 62 and minute >= 55) or p["energy"] < 50)
    if tired and minute < dur_min - 2:
        energy, pid = tired[0]
        p = players[pid]
        acts = [sub_for(pid)]
        ins = my_ins.get(pid, {}).get("instructions")
        if ins and ins["attack_effort"] + ins["defense_effort"] > 110:
            acts.append(_instr_action(f"Ease {_short(p['name'])}'s workload", pid, ins,
                                      attack_effort=max(30, ins["attack_effort"] - 20),
                                      defense_effort=max(30, ins["defense_effort"] - 15)))
        acts = [a for a in acts if a]
        if acts:
            others = len(tired) - 1
            loss = _pace_loss(energy)
            title = (f"{_short(p['name'])} is running on empty" if energy < 52
                     else f"{_short(p['name'])} is tiring")
            sev = 3 if energy < 50 else 2
            add("fatigue", sev, title,
                f"{p['name']} is down to {energy:.0f}% energy — he's lost about {loss}% of his "
                f"acceleration and a fresh player would win those races."
                + (f" {others} more {'is' if others == 1 else 'are'} fading too." if others > 0 else ""),
                why=f"Energy {energy:.0f}% ({p['slot']}) · {subs_left} subs left",
                actions=acts, key=f"fatigue:{pid}:{sev}")   # escalation = a new moment

    # 2. card risk — a booked player who keeps fouling (FOUL actor = offender)
    fouls = Counter(e.get("actor_id") for e in ev if e["event_type"] == "FOUL")
    for pid, p in outfield.items():
        n = fouls.get(pid, 0)
        if p["cards"][0] >= 1 and p["cards"][1] == 0 and n >= 2 and minute < dur_min - 3:
            ins = my_ins.get(pid, {}).get("instructions")
            acts = [sub_for(pid, "Take him off for {on}")]
            if ins and ins["defense_effort"] > 45:
                acts.append(_instr_action(f"Calm {_short(p['name'])} down", pid, ins,
                                          defense_effort=max(30, ins["defense_effort"] - 25)))
            add("card_risk", 3 if n >= 3 else 2, f"{_short(p['name'])} is walking a tightrope",
                f"Booked, and {n} fouls so far — one more mistimed challenge and you're down to "
                f"{'nine' if reds_mine else 'ten'}.",
                why=f"Yellow card · {n} fouls", actions=acts, key=f"card:{pid}")
            break

    # 3. they are targeting one flank
    ch = attack_channels(ev, other, t0, now, slot_of)
    total = sum(ch.values())
    if total >= 12 and minute >= 15 and not settling and (
            w.get("box_against", 0) >= 4 or w.get("xg_against", 0) >= 0.3):
        side, n = ch.most_common(1)[0]
        if side != "centre" and n / total >= 0.58:
            flank = ("LB", "LCB", "LM", "LW", "LAM") if side == "left" else ("RB", "RCB", "RM", "RW", "RAM")
            defenders = [(pid, p) for pid, p in my_active.items() if p["slot"] in flank]
            fb = next(((pid, p) for pid, p in defenders if p["slot"] in ("LB", "RB")), None)
            wing = next(((pid, p) for pid, p in defenders
                         if p["slot"] in ("LW", "RW", "LM", "RM", "LAM", "RAM")), None)
            acts, names = [], []
            if wing:
                wpid, wp = wing
                names.append(_short(wp["name"]))
                ins = my_ins.get(wpid, {}).get("instructions")
                if ins and ins["defense_role"] != "TRACK_FULLBACK":
                    acts.append(_instr_action(f"{_short(wp['name'])}: track back", wpid, ins,
                                              defense_role="TRACK_FULLBACK",
                                              defense_effort=max(70, ins["defense_effort"])))
            if fb:
                fpid, fpp = fb
                names.insert(0, _short(fpp["name"]))
                ins = my_ins.get(fpid, {}).get("instructions")
                if ins and (ins["attack_role"] in ("OVERLAP", "WIDE_ADVANCE", "UNDERLAP")
                            or ins["attack_effort"] > 55):
                    acts.append(_instr_action(f"{_short(fpp['name'])}: stay home", fpid, ins,
                                              attack_role="SUPPORT",
                                              attack_effort=min(40, ins["attack_effort"])))
            if tactics.get("defensive_width") == "NARROW":
                acts.append(_tactics_action("Defend wider", tactics, {"defensive_width": "BALANCED"}))
            who = " and ".join(names) if names else "that side"
            add("overload", 2, f"They're getting at your {side} side",
                f"{int(round(100 * n / total))}% of their final-third play in the last "
                f"{min(15, max(1, minute))} minutes has come down your {side} — {who} "
                f"{'are' if len(names) > 1 else 'is'} being outnumbered.",
                why=f"Their final-third actions: left {ch['left']}, centre {ch['centre']}, right {ch['right']}",
                actions=acts, key=f"overload:{side}:{half}")

    # 4. being out-created / counter-attacked
    xa, xf = w.get("xg_against", 0), w.get("xg_for", 0)
    if minute >= 15 and not settling and xa >= 0.6 and xa >= 2.5 * max(0.05, xf) and w.get("box_against", 0) >= 5:
        trans = w.get("transition_shots_against", 0)
        shots = max(1.0, w.get("shots_against", 0))
        if trans / shots >= 0.4 and (tactics.get("defensive_line_behavior") == "STEP_UP"
                                     or tactics.get("defensive_block_height") == "HIGH"):
            act = _tactics_action("Stop the counters", tactics,
                                  {"defensive_line_behavior": "HOLD", "defensive_block_height": "MID",
                                   "after_losing_possession": "BALANCED"})
            text = (f"They've had {xa:.2f} xG in the last 15 minutes, {int(trans)} of {int(shots)} "
                    f"shots on the break — our high line is being run in behind.")
        else:
            act = _tactics_action("Get compact", tactics,
                                  {"defensive_width": "NARROW",
                                   "defensive_block_height": "MID" if tactics.get("defensive_block_height") == "HIGH" else None,
                                   "pressing_intensity": "SELECTIVE" if tactics.get("pressing_intensity") in ("AGGRESSIVE", "RELENTLESS") else None})
            text = (f"They've created {xa:.2f} xG to our {xf:.2f} in the last 15 minutes "
                    f"({int(w.get('box_against', 0))} times into our box). We're being opened up.")
        add("pressure", 3 if xa >= 1.0 and lead <= 1 else 2, "We're under the cosh", text,
            why=f"xG last 15': {xf:.2f} – {xa:.2f}", actions=[act], key=f"pressure:{half}")

    # 5. chance drought while not winning
    w20 = window_metrics(ev, team, max(0, now - 20 * 60), now)
    if (minute >= 30 and (half == 1 or minute >= 60) and lead <= 0
            and w20.get("shots_for", 0) == 0 and not settling and left >= 8):
        if tactics.get("passing_directness") == "SHORT" and w20.get("possession", 50) >= 55:
            act = _tactics_action("Play forward quicker", tactics,
                                  {"build_up_tempo": "QUICK", "passing_directness": "MIXED",
                                   "progression_risk": "AMBITIOUS"})
            text = (f"We're keeping the ball but going nowhere — {w20.get('possession', 50):.0f}% "
                    f"possession and not a single shot in 20 minutes.")
        else:
            act = _tactics_action("Commit more to attack", tactics,
                                  {"box_commitment": "COMMIT", "progression_risk": "AMBITIOUS",
                                   "chance_creation_focus": "VERTICAL" if tactics.get("chance_creation_focus") == "CENTRAL" else None})
            text = ("Not a shot in 20 minutes. We need more bodies in the box and more risk "
                    "in the final third.")
        add("drought", 2 if (lead < 0 or minute >= 55) else 1, "We're not creating anything", text,
            why=f"Shots last 20': 0 · box entries {int(w20.get('box_for', 0))}", actions=[act],
            key=f"drought:{half}")

    # 6. game state
    if lead < 0 and minute >= 60 and left >= 3:
        late = minute >= 78 and lead == -1
        acts = [_tactics_action("Go for it", tactics,
                                {"box_commitment": "COMMIT", "progression_risk": "AMBITIOUS",
                                 "build_up_tempo": "QUICK", "after_losing_possession": "COUNTERPRESS",
                                 "pressing_intensity": "AGGRESSIVE" if tactics.get("pressing_intensity") in ("PASSIVE", "SELECTIVE") else None})]
        defmid = sorted(((p["rating"], pid) for pid, p in outfield.items()
                         if p["slot"] in ("CDM", "LDM", "RDM", "LB", "RB")))
        attackers = sorted((b for b in bench if b["id"] not in used_bench
                            and _POS_GROUP.get(b.get("pos", ""), "") in ("ST", "W", "AM")),
                           key=lambda x: -int(x.get("ovr") or 0))
        if subs_left > 0 and defmid and attackers:
            _r, pid = defmid[0]
            b = attackers[0]
            used_bench.add(b["id"])
            acts.append({"label": f"{_short(b['name'])} on for {_short(players[pid]['name'])}",
                         "type": "sub", "player_off": pid, "player_on": b["id"],
                         "target_slot": players[pid]["slot"], "on_name": b["name"]})
        acts = [a for a in acts if a]
        if late:
            add("chase", 3, f"{left} minutes to find a goal",
                "Still a goal down. If you're going to gamble, it's now: all in on attack and "
                "win it back high.", why=f"Score {score[team]}–{score[other]}, {minute}'",
                actions=acts, key="chase:late")
        else:
            gap = abs(lead)
            add("chase", 2, f"{'A goal' if gap == 1 else f'{gap} goals'} down with {left} to play",
                "Time to take risks: commit numbers forward and win the ball back higher. "
                "You'll leave space on the break — that's the price.",
                why=f"Score {score[team]}–{score[other]}, {minute}'", actions=acts, key="chase")
    elif lead == 1 and minute >= 70 and left >= 3:
        acts = [_tactics_action("See it out", tactics,
                                {"defensive_block_height": "MID" if tactics.get("defensive_block_height") == "HIGH" else "DEEP",
                                 "build_up_tempo": "PATIENT", "progression_risk": "SECURE",
                                 "after_winning_possession": "SECURE", "box_commitment": "CAUTIOUS"})]
        add("protect", 2, "Protect the lead?",
            f"One goal in it with {left} to play. Drop deeper and keep the ball and you'll invite "
            "pressure — or keep playing your way and try to kill the game.",
            why=f"Score {score[team]}–{score[other]}, {minute}'", actions=acts, key="protect")

    # 7. strugglers — well below the rest of the side, with evidence
    if minute >= 40 and len(outfield) >= 5:
        ratings = sorted((p["rating"], pid) for pid, p in outfield.items())
        avg = sum(r for r, _ in ratings) / len(ratings)
        r, pid = ratings[0]
        if r <= 5.0 and avg - r >= 1.0:
            p = players[pid]
            evd = player_evidence(ev, pid, p["name"])
            act = sub_for(pid, "Replace with {on}")
            add("struggler", 2 if (minute >= 55 and act) else 1, f"{_short(p['name'])} is having a nightmare",
                _struggle_text(r, evd), why=f"Rating {r:.1f} vs team average {avg:.1f}",
                actions=[act], key=f"struggler:{pid}")

    # 8. opponent adjustments (their coach reacts too)
    for e in reversed(ev):
        if e["timestamp"] < now - 5 * 60:
            break
        if e.get("team_id") == other and e["event_type"] in ("FORMATION_CHANGE", "TACTIC_CHANGE"):
            d = e.get("detail") or {}
            mode = str(d.get("mode", ""))
            if e["event_type"] == "FORMATION_CHANGE":
                meaning = {"4-2-3-1": "two holding midfielders and a No. 10 behind the striker",
                           "4-1-4-1": "a single pivot with a flat midfield four",
                           "4-3-3": "a front three with wingers pushed high"}.get(str(d.get("to")), "a new shape")
                add("opp_change", 2, f"They've switched to {d.get('to')}",
                    f"From {d.get('from')} to {d.get('to')} — {meaning}. Check your matchups.",
                    why=f"Formation change at {_minute(e['timestamp'])}'", key=f"opp:shape:{d.get('to')}:{half}")
            elif "RISK+" in mode or "CHASE" in mode:
                add("opp_change", 1, "They're going for it",
                    "They've pushed more players forward — there will be space behind them on the break.",
                    why=f"Their game-state change at {_minute(e['timestamp'])}'", key=f"opp:attack:{half}")
            elif "RISK-" in mode or "PROTECT" in mode:
                add("opp_change", 1, "They're sitting on it",
                    "They've dropped deeper to protect what they have — expect a crowded box.",
                    why=f"Their game-state change at {_minute(e['timestamp'])}'", key=f"opp:protect:{half}")
            break

    # 9. someone on fire (information, not an action)
    stars = sorted(((p["rating"], pid) for pid, p in my_active.items()), reverse=True)
    if stars and stars[0][0] >= 8.0 and minute >= 30:
        r, pid = stars[0]
        add("star", 1, f"{_short(players[pid]['name'])} is running the show",
            f"Rated {r:.1f} — keep getting him on the ball.", why=f"Rating {r:.1f}", key=f"star:{pid}")

    # one voice: when chasing, don't also counsel caution (and vice versa)
    kinds = {i["kind"] for i in out}
    if "chase" in kinds:
        out = [i for i in out if i["kind"] not in ("pressure", "protect")]
    elif "protect" in kinds:
        out = [i for i in out if i["kind"] not in ("drought",)]
    out.sort(key=lambda i: -i["severity"])
    return out


# ── decision impact (before vs after each of your changes) ──────────────────
def _engine_tactics(front: dict[str, Any] | None) -> dict[str, str]:
    from dataclasses import asdict
    from bridge import map_tactics
    try:
        return asdict(map_tactics(front or {}))
    except Exception:
        return {}


def describe_command(cmd: dict[str, Any], names: dict[str, str],
                     prev_tactics: dict[str, str] | None = None) -> str:
    """One legible label per command. ``prev_tactics`` (engine vocabulary) is
    the team's tactics before this command, to name what actually changed."""
    k, p = cmd["kind"], cmd["payload"]
    if k == "substitution":
        return f"{_short(names.get(p.get('player_on'), p.get('player_on')))} on for {_short(names.get(p.get('player_off'), p.get('player_off')))}"
    if k == "formation":
        return f"Formation → {({'433': '4-3-3', '4231': '4-2-3-1', '4141': '4-1-4-1'}).get(p.get('formation'), p.get('formation'))}"
    if k == "instructions":
        ins = p.get("instructions") or {}
        who = _short(names.get(p.get("player_id"), p.get("player_id")))
        roles = " / ".join(str(r) for r in (ins.get("attackRole"), ins.get("defenseRole")) if r)
        return f"{who}: {roles}" if roles else f"New instructions for {who}"
    if prev_tactics is not None:
        new = _engine_tactics(p.get("tactics"))
        diff = [(key, v) for key, v in new.items() if prev_tactics.get(key) != v]
        if diff:
            head = ", ".join(f"{_TLABEL.get(key, key)} {_TVAL.get(v, v)}" for key, v in diff[:2])
            return head + (f" +{len(diff) - 2} more" if len(diff) > 2 else "")
    return "Tactical change"


def command_labels(commands: list[dict[str, Any]], team: str, names: dict[str, str],
                   base_tactics: dict[str, Any] | None = None) -> list[str]:
    """Labels for ``team``'s commands in order (tracking tactics as they change)."""
    cur = _engine_tactics(base_tactics)
    out = []
    for c in sorted((c for c in commands if str(c["payload"].get("team", "")).upper() == team),
                    key=lambda c: int(c["sim_clock"])):
        out.append(describe_command(c, names, cur))
        if c["kind"] == "tactics":
            cur = _engine_tactics(c["payload"].get("tactics")) or cur
    return out


def group_commands(commands: list[dict[str, Any]], team: str, gap: int = 120) -> list[list[dict]]:
    """Consecutive decisions within ``gap`` seconds form one decision moment."""
    mine = [c for c in commands if str(c["payload"].get("team", "")).upper() == team]
    groups: list[list[dict]] = []
    for c in sorted(mine, key=lambda c: int(c["sim_clock"])):
        if groups and int(c["sim_clock"]) - int(groups[-1][-1]["sim_clock"]) <= gap:
            groups[-1].append(c)
        else:
            groups.append([c])
    return groups


def _per15(m: dict[str, float], secs: int) -> dict[str, float]:
    f = 900.0 / max(60, secs)
    return {"xg_for": round(m.get("xg_for", 0) * f, 2), "xg_against": round(m.get("xg_against", 0) * f, 2),
            "shots_for": round(m.get("shots_for", 0) * f, 1), "shots_against": round(m.get("shots_against", 0) * f, 1),
            "box_for": round(m.get("box_for", 0) * f, 1), "box_against": round(m.get("box_against", 0) * f, 1),
            "possession": m.get("possession", 50.0)}


def change_impacts(events: list[dict], commands: list[dict], team: str, now: int,
                   names: dict[str, str], base_tactics: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    out = []
    groups = group_commands(commands, team)
    labels = command_labels(commands, team, names, base_tactics)
    glabels, k = [], 0
    for g in groups:
        glabels.append(" · ".join(labels[k:k + len(g)]))
        k += len(g)
    for gi, g in enumerate(groups):
        c0 = int(g[0]["sim_clock"])
        c1 = int(g[-1]["sim_clock"])
        nxt = int(groups[gi + 1][0]["sim_clock"]) if gi + 1 < len(groups) else None
        end = min(now, c1 + WINDOW, nxt if nxt is not None else now)
        start = max(0, c0 - WINDOW)
        before_s, after_s = c0 - start, end - c1
        if before_s < 120:
            continue
        before = _per15(window_metrics(events, team, start, c0), before_s)
        after = _per15(window_metrics(events, team, c1, end), after_s) if after_s >= 300 else None
        verdict, text = "pending", "Too early to judge — give it ten minutes."
        if after is not None and after_s >= 600:
            d_for = after["xg_for"] - before["xg_for"]
            d_against = after["xg_against"] - before["xg_against"]
            # judge by what the change was for: protecting a lead is about
            # conceding less, chasing a game is about creating more
            lead = sum(1 if e.get("team_id") == team else -1 for e in events
                       if e["event_type"] == "GOAL" and e["timestamp"] <= c0)
            w_for, w_against = (0.5, 1.5) if lead > 0 else (1.5, 0.5) if lead < 0 else (1.0, 1.0)
            net = w_for * d_for - w_against * d_against
            if net >= 0.12:
                verdict = "better"
            elif net <= -0.12:
                verdict = "worse"
            else:
                verdict = "neutral"
            bits = []
            if abs(d_for) >= 0.05:
                bits.append(f"chances created {'up' if d_for > 0 else 'down'} ({before['xg_for']:.2f} → {after['xg_for']:.2f} xG per 15')")
            if abs(d_against) >= 0.05:
                bits.append(f"chances conceded {'up' if d_against > 0 else 'down'} ({before['xg_against']:.2f} → {after['xg_against']:.2f})")
            if abs(after["possession"] - before["possession"]) >= 6:
                bits.append(f"possession {before['possession']:.0f}% → {after['possession']:.0f}%")
            text = "; ".join(bits) or "no real change in the pattern of the game"
            text = text[0].upper() + text[1:] + "."
        out.append({"minute": _minute(c0), "clock": c0,
                    "label": glabels[gi],
                    "before": before, "after": after, "after_minutes": round(after_s / 60, 1),
                    "verdict": verdict, "text": text})
    return out


# ── post-match review ────────────────────────────────────────────────────────
def review(ft: dict[str, Any], team: str, commands: list[dict], team_names: dict[str, str],
           base_tactics: dict[str, Any] | None = None) -> dict[str, Any]:
    ev = ft["events"]
    other = opp(team)
    side = "home" if team == "HOME" else "away"
    oside = "away" if side == "home" else "home"
    gs = ft["score"][side]
    ga = ft["score"][oside]
    ts = ft["team_stats"]
    xf, xa = float(ts[side].get("xg", 0)), float(ts[oside].get("xg", 0))
    ps = ft["player_stats"]
    names = {pid: p["name"] for pid, p in ps.items()}
    me, them = team_names.get(team, "You"), team_names.get(other, "They")
    res = "W" if gs > ga else "D" if gs == ga else "L"

    # 1. result vs process
    dx = xf - xa
    if res == "W":
        verdict = ("A deserved win" if dx >= 0.4 else "A smash-and-grab" if dx <= -0.4
                   else "A tight game you edged")
    elif res == "L":
        verdict = ("An unlucky defeat" if dx >= 0.4 else "Beaten fair and square" if dx <= -0.4
                   else "A game that could have gone either way")
    else:
        verdict = ("The better side, but only a point" if dx >= 0.5 else "A point gained" if dx <= -0.5
                   else "A fair draw")
    process = (f"xG {xf:.2f}–{xa:.2f}. You scored {gs} from {xf:.2f} expected"
               f"{' — clinical' if gs - xf >= 0.8 else ' — wasteful' if xf - gs >= 0.8 else ''}; "
               f"they scored {ga} from {xa:.2f}"
               f"{' — they punished everything' if ga - xa >= 0.8 else ' — you got away with some' if xa - ga >= 0.8 else ''}.")

    # 2. turning points
    moments = []
    for e in ev:
        et, d = e["event_type"], e.get("detail") or {}
        if et == "GOAL":
            mine = e.get("team_id") == team
            moments.append({"minute": _minute(e["timestamp"]), "kind": "goal_for" if mine else "goal_against",
                            "text": f"{_short(e.get('actor_name'))} scores"
                                    + (f" (assist {_short(d.get('assist'))})" if d.get("assist") else "")
                                    + (" — from the penalty spot" if d.get("penalty") or d.get("shot_type") == "PENALTY"
                                       or not d.get("xg") else f" — {d.get('xg', 0):.2f} xG chance")})
        elif et == "SHOT" and float(d.get("xg", 0)) >= 0.3 and d.get("outcome") != "GOAL":
            mine = e.get("team_id") == team
            how = {"MISS": "misses", "BLOCKED": "is blocked", "SAVED_PARRIED": "is denied by the keeper",
                   "SAVED_CAUGHT": "is denied by the keeper"}.get(d.get("outcome"), "misses")
            moments.append({"minute": _minute(e["timestamp"]), "kind": "big_miss_for" if mine else "big_miss_against",
                            "text": f"{_short(e.get('actor_name'))} {how} from a big chance ({float(d['xg']):.2f} xG)"})
        elif et == "CARD" and "RED" in str(d.get("card", "")):
            mine = e.get("team_id") == team
            moments.append({"minute": _minute(e["timestamp"]), "kind": "red_for" if mine else "red_against",
                            "text": f"{_short(e.get('actor_name'))} is sent off"})
        elif et == "PENALTY" and any(g["event_type"] == "GOAL" and abs(g["timestamp"] - e["timestamp"]) <= 5 for g in ev):
            continue                                   # the GOAL line already tells it
        elif et == "PENALTY":
            moments.append({"minute": _minute(e["timestamp"]), "kind": "penalty",
                            "text": f"Penalty — {_short(e.get('actor_name'))} {'scores' if d.get('outcome') == 'GOAL' else 'fails to score'}"})

    # biggest momentum swing
    mom = momentum(ev, max([int(e["timestamp"]) for e in ev] + [60]))
    swing = None
    for i in range(2, len(mom)):
        a = sum(r[team] - r[other] for r in mom[max(0, i - 5):i - 2]) if i >= 3 else 0
        b = sum(r[team] - r[other] for r in mom[i - 2:i + 1])
        if swing is None or abs(b - a) > abs(swing[1]):
            swing = (mom[i]["minute"], b - a)
    if swing and abs(swing[1]) >= 0.35:
        moments.append({"minute": swing[0], "kind": "swing_for" if swing[1] > 0 else "swing_against",
                        "text": ("The game swung your way" if swing[1] > 0 else "The game swung away from you")
                                + f" around {swing[0]}'"})
    moments.sort(key=lambda m: m["minute"])

    # 3. your decisions
    end_ts = max([int(e["timestamp"]) for e in ev] + [60])
    impacts = change_impacts(ev, commands, team, end_ts, names, base_tactics)

    # 4. players
    mine = [(pid, p) for pid, p in ps.items() if p.get("team_id") == team and p.get("minutes", 0) >= 15]
    mine.sort(key=lambda x: -float(x[1].get("rating", 6)))

    def good(pid: str, p: dict) -> str:
        bits = []
        if p.get("goals"):
            bits.append(f"{p['goals']} goal{'s' if p['goals'] > 1 else ''}")
        if p.get("assists"):
            bits.append(f"{p['assists']} assist{'s' if p['assists'] > 1 else ''}")
        if p.get("saves", 0) >= 3:
            bits.append(f"{p['saves']} saves")
        if p.get("key_passes", 0) >= 2:
            bits.append(f"{p['key_passes']} key passes")
        dr = p.get("dribbles") or [0, 0]
        if dr and dr[0] >= 3:
            bits.append(f"beat his man {dr[0]} times")
        tk = p.get("tackles") or [0, 0]
        if tk and tk[0] >= 3:
            bits.append(f"won {tk[0]} of {tk[1]} tackles")
        if p.get("interceptions", 0) >= 8:
            bits.append(f"cut out {p['interceptions']} passes")
        pa = p.get("passes") or [0, 0]
        if pa and pa[1] >= 30 and pa[0] / pa[1] >= 0.82:
            bits.append(f"{round(100 * pa[0] / pa[1])}% passing")
        return ", ".join(bits[:3]) or f"steady over {p.get('minutes', 0)} minutes"

    def bad(pid: str, p: dict) -> str:
        evd = player_evidence(ev, pid, p["name"])
        bits = []
        pa = p.get("passes") or [0, 0]
        if pa and pa[1] >= 15 and pa[0] / pa[1] < 0.72:
            bits.append(f"only {round(100 * pa[0] / pa[1])}% of his passes found a teammate")
        if evd.get("dispossessed", 0) >= 4:
            bits.append(f"dispossessed {evd['dispossessed']} times")
        if evd.get("beaten", 0) >= 3:
            bits.append(f"dribbled past {evd['beaten']} times")
        dl = evd.get("duels", 0) - evd.get("duels_won", 0)
        if evd.get("duels", 0) >= 5 and dl / evd["duels"] >= 0.6:
            bits.append(f"lost {dl} of {evd['duels']} duels")
        if p.get("goals_conceded") and p.get("slot") == "GK" and p.get("saves", 0) <= 1:
            bits.append(f"{p['goals_conceded']} conceded, {p.get('saves', 0)} saves")
        return ", ".join(bits[:2]) or f"quiet over {p.get('minutes', 0)} minutes"

    best = [{"id": pid, "name": p["name"], "rating": round(float(p["rating"]), 1), "why": good(pid, p)}
            for pid, p in mine[:3]]
    best_ids = {b["id"] for b in best}
    worst = [{"id": pid, "name": p["name"], "rating": round(float(p["rating"]), 1), "why": bad(pid, p)}
             for pid, p in mine[-2:] if float(p["rating"]) < 6.0 and pid not in best_ids]
    tired = [{"id": pid, "name": p["name"], "energy": round(float(p.get("energy", 100)))}
             for pid, p in mine if p.get("active_at_ft") and p.get("slot") != "GK"
             and float(p.get("energy", 100)) < 60]

    # 5. lessons (rules over the ledger — honest, specific, actionable)
    lessons = []
    w = window_metrics(ev, team, 0, 10 ** 6)
    subs_made = sum(1 for c in commands if c["kind"] == "substitution"
                    and str(c["payload"].get("team", "")).upper() == team)
    trans_against = w.get("transition_shots_against", 0)
    if trans_against >= 4 and trans_against / max(1, w.get("shots_against", 1)) >= 0.35:
        lessons.append(f"{them} had {int(trans_against)} shots on the counter. Against teams who break "
                       "quickly, a Hold line or a Mid block trades a little pressure for a lot of safety.")
    if w.get("possession", 50) >= 60 and w.get("xg_for", 0) < 1.0:
        lessons.append(f"{w['possession']:.0f}% of the ball but only {w.get('xg_for', 0):.2f} xG — possession "
                       "without penetration. Quicker tempo, runners in behind or more width turn it into chances.")
    slot_of = {pid: p.get("slot") for pid, p in ps.items()}
    ch = attack_channels(ev, other, 0, 10 ** 6, slot_of)
    tot = sum(ch.values())
    if tot >= 30:
        side_, n = ch.most_common(1)[0]
        if side_ != "centre" and n / tot >= 0.5:
            lessons.append(f"{them} kept attacking your {side_} side ({round(100 * n / tot)}% of their "
                           "final-third play). Tell your winger to track back, or keep that full-back at home.")
    late_conceded = [e for e in ev if e["event_type"] == "GOAL" and e.get("team_id") == other
                     and e["timestamp"] >= 80 * 60]
    if late_conceded and res != "W":
        lessons.append(f"You conceded after the 80th minute{' twice' if len(late_conceded) > 1 else ''}. "
                       "Fresh legs and a slightly deeper block in the last ten protect what you've earned.")
    if xa - ga >= 0.8:
        lessons.append(f"You rode your luck — {them} wasted {xa - ga:.1f} goals' worth of chances. "
                       "The process needs tightening even though the result held.")
    if xf - gs >= 0.9:
        lessons.append(f"You created enough to win ({xf:.2f} xG). Keep doing that and the goals will come — "
                       "finishing evens out over a season.")
    if tired and subs_made < 3:
        lessons.append(f"{', '.join(_short(t['name']) for t in tired[:3])} finished on "
                       f"{min(t['energy'] for t in tired[:3])}% energy with {5 - subs_made} subs unused. "
                       "Fresh legs keep your effective quality up in the last 20 minutes.")
    helped = [i for i in impacts if i["verdict"] == "better"]
    if helped:
        lessons.append(f"Your change at {helped[0]['minute']}' ({helped[0]['label']}) changed the pattern: "
                       f"{helped[0]['text'][0].lower() + helped[0]['text'][1:]}")
    if not impacts and res != "W":
        lessons.append("You didn't make a single change. The bench and the tactics board are your levers — "
                       "the assistant flags the moments where they matter.")
    if not lessons:
        lessons.append("A clean performance — no glaring tactical leaks in the numbers.")

    return {"result": res, "score": [gs, ga], "verdict": verdict, "process": process,
            "xg": [round(xf, 2), round(xa, 2)], "moments": moments[:10], "impacts": impacts,
            "best": best, "worst": worst, "tired": tired, "lessons": lessons[:4],
            "momentum": mom}


# ── pre-match scouting ───────────────────────────────────────────────────────
_STYLE_TEXT = {
    "pressing_intensity": {"RELENTLESS": "press relentlessly", "AGGRESSIVE": "press aggressively",
                           "SELECTIVE": "press selectively", "PASSIVE": "sit off and let you have it"},
    "defensive_block_height": {"HIGH": "defend high", "MID": "defend in a mid block", "DEEP": "sit in a deep block"},
    "build_up_tempo": {"QUICK": "attack quickly", "BALANCED": "mix their tempo", "PATIENT": "build patiently"},
    "passing_directness": {"DIRECT": "go direct", "MIXED": "mix it up", "SHORT": "play short"},
    "attacking_width": {"WIDE": "stretch the pitch", "BALANCED": "use balanced width", "NARROW": "attack through the middle"},
    "after_winning_possession": {"COUNTER": "break fast when they win it", "BALANCED": "", "SECURE": "keep the ball after winning it"},
}


def _a(p: dict, key: str) -> float:
    return float((p.get("a") or {}).get(key, 50))


def _line_avg(players: list[dict], keys: tuple[str, ...]) -> float:
    if not players:
        return 50.0
    return sum(sum(_a(p, k) for k in keys) / len(keys) for p in players) / len(players)


def _pos_bucket(slot: str) -> str:
    s = slot.upper()
    if s == "GK":
        return "GK"
    if s in ("LB", "RB", "LCB", "RCB", "CB", "LWB", "RWB"):
        return "DEF"
    if s in ("ST", "LW", "RW", "CF"):
        return "ATT"
    return "MID"


def scout(opponent: dict[str, Any], mine: dict[str, Any]) -> dict[str, Any]:
    """Pre-match report from the two kickoff sides (frontend team dicts)."""
    def lines(side):
        out = defaultdict(list)
        for slot, p in (side.get("lineup") or {}).items():
            if p:
                out[_pos_bucket(slot)].append(dict(p, slot=slot))
        return out

    ol, ml = lines(opponent), lines(mine)
    t = {TACTIC_KEY_MAP.get(k, k): TACTIC_VALUE_MAP.get(v, str(v).upper())
         for k, v in (opponent.get("tactics") or {}).items()}
    style_bits = [(_STYLE_TEXT[k].get(t.get(k, ""), "")) for k in _STYLE_TEXT]
    style = ", ".join(b for b in style_bits if b)

    def strength(ls):
        return {"attack": round(_line_avg(ls["ATT"] + ls["MID"][:1], ("fin", "apo", "dri", "acc", "cmp"))),
                "midfield": round(_line_avg(ls["MID"], ("sps", "vis", "bco", "sta", "stam"))),
                "defence": round(_line_avg(ls["DEF"], ("daw", "sta", "int", "str", "spr"))),
                "keeper": round(_line_avg(ls["GK"], ("gkd", "gkh", "gkp", "gkr")))}
    so, sm = strength(ol), strength(ml)

    everyone = [p for grp in ol.values() for p in grp if p["slot"] != "GK"]
    forwards = ol["ATT"] + [p for p in ol["MID"] if p["slot"] in ("CAM", "LAM", "RAM", "LM", "RM")]
    threat = sorted(forwards or everyone, key=lambda p: -(_a(p, "fin") * 0.35 + _a(p, "apo") * 0.2 + _a(p, "dri") * 0.15
                                                          + (_a(p, "acc") + _a(p, "spr")) * 0.1 + _a(p, "cmp") * 0.1))
    creators = sorted(ol["MID"] + ol["ATT"] or everyone,
                      key=lambda p: -(_a(p, "vis") * 0.4 + _a(p, "sps") * 0.3 + _a(p, "lps") * 0.3))
    aerial = sorted(everyone, key=lambda p: -(_a(p, "hea") * 0.4 + _a(p, "jum") * 0.3 + float(p.get("ht") or 180) * 0.15))
    key_players = []
    for label, pool, why in (("Main threat", threat, lambda p: f"finishing {_a(p, 'fin'):.0f}, pace {(_a(p, 'acc') + _a(p, 'spr')) / 2:.0f}"),
                             ("Playmaker", creators, lambda p: f"vision {_a(p, 'vis'):.0f}, passing {_a(p, 'sps'):.0f}"),
                             ("Aerial danger", aerial, lambda p: f"heading {_a(p, 'hea'):.0f}, {p.get('ht') or '?'} cm")):
        for p in pool:
            if p["id"] not in {k["id"] for k in key_players}:
                key_players.append({"label": label, "id": p["id"], "name": p["name"], "slot": p["slot"],
                                    "why": why(p)})
                break

    # matchups: our quickest forward vs their slowest defender on that flank
    matchups, weaknesses = [], []
    def pace(p):
        return (_a(p, "acc") + _a(p, "spr")) / 2
    their_def = sorted(ol["DEF"], key=pace)
    our_fwd = sorted(ml["ATT"] + [p for p in ml["MID"] if p["slot"] in ("LM", "RM", "LW", "RW")], key=lambda p: -pace(p))
    if their_def and our_fwd:
        slow = their_def[0]
        fast = our_fwd[0]
        gap = pace(fast) - pace(slow)
        if gap >= 8:
            matchups.append({"text": f"{_short(fast['name'])} (pace {pace(fast):.0f}) against {_short(slow['name'])} (pace {pace(slow):.0f}) — "
                                     "get the ball in behind early.", "edge": "you"})
            weaknesses.append(f"Slow at the back: {_short(slow['name'])} has pace {pace(slow):.0f}.")
    their_fwd = sorted(ol["ATT"], key=lambda p: -pace(p))
    our_def = sorted(ml["DEF"], key=pace)
    if their_fwd and our_def and pace(their_fwd[0]) - pace(our_def[0]) >= 8:
        matchups.append({"text": f"Watch {_short(their_fwd[0]['name'])} (pace {pace(their_fwd[0]):.0f}) running at "
                                 f"{_short(our_def[0]['name'])} (pace {pace(our_def[0]):.0f}).", "edge": "them"})
    stam = _line_avg([p for grp in ol.values() for p in grp if p["slot"] != "GK"], ("stam",))
    if stam <= 70:
        weaknesses.append(f"Low stamina (squad average {stam:.0f}) — they should fade in the last 20 minutes.")
    aer_def = _line_avg(ol["DEF"], ("hea", "jum"))
    if aer_def <= 68:
        weaknesses.append(f"Vulnerable in the air (defensive heading/jumping {aer_def:.0f}) — crosses could hurt them.")
    press_resist = _line_avg(ol["DEF"], ("sps", "bco", "cmp"))
    if press_resist <= 66:
        weaknesses.append(f"Their back line isn't comfortable on the ball ({press_resist:.0f}) — pressing high could force errors.")
    if so["keeper"] <= 74:
        weaknesses.append(f"The goalkeeper is beatable (rating {so['keeper']}) — shoot on sight.")

    plan = []
    if t.get("pressing_intensity") in ("AGGRESSIVE", "RELENTLESS") and t.get("defensive_block_height") == "HIGH":
        plan.append({"text": "They press high — go direct to play through or over the press, and look for space behind their line.",
                     "tactics": {"passingDirectness": "Direct", "buildUpTempo": "Quick", "chanceCreationFocus": "Vertical"}})
    if t.get("defensive_block_height") == "DEEP":
        plan.append({"text": "They'll sit deep — be patient, use the width and commit bodies to the box.",
                     "tactics": {"buildUpTempo": "Patient", "attackingWidth": "Wide", "boxCommitment": "Commit"}})
    if t.get("after_winning_possession") == "COUNTER":
        plan.append({"text": "They break quickly — keep your defensive line honest and counterpress to stop the transition at source.",
                     "tactics": {"defensiveLineBehavior": "Hold", "afterLosingPossession": "Counterpress"}})
    if aer_def <= 68:
        plan.append({"text": "Get crosses into the box — they struggle in the air.",
                     "tactics": {"attackingWidth": "Wide", "chanceCreationFocus": "Wide"}})
    if press_resist <= 66 and not any("press" in p["text"].lower() for p in plan):
        plan.append({"text": "Press their centre-backs — they'll give it away.",
                     "tactics": {"pressingIntensity": "Aggressive", "defensiveBlockHeight": "High"}})
    if not plan:
        plan.append({"text": "A balanced side with no obvious hole — control midfield and pick your moments.", "tactics": {}})

    edge = sum(sm.values()) - sum(so.values())
    outlook = ("You're clear favourites." if edge >= 25 else "You should have the edge." if edge >= 8
               else "Evenly matched." if edge > -8 else "They're stronger on paper." if edge > -25
               else "A big underdog game — a draw would be a good result.")
    return {"formation": opponent.get("formation"), "style": style, "strength": so, "your_strength": sm,
            "key_players": key_players, "matchups": matchups, "weaknesses": weaknesses[:4],
            "plan": plan[:3], "outlook": outlook}


# ── challenge scenarios: the card a manager reads before taking over ────────
STADIUMS = {
    "ARS": "the Emirates", "AVL": "Villa Park", "BOU": "the Vitality", "BRE": "the Gtech",
    "BHA": "the Amex", "BUR": "Turf Moor", "CHE": "Stamford Bridge", "CRY": "Selhurst Park",
    "EVE": "Hill Dickinson Stadium", "FUL": "Craven Cottage", "LEE": "Elland Road",
    "LIV": "Anfield", "MCI": "the Etihad", "MUN": "Old Trafford", "NEW": "St James' Park",
    "NFO": "the City Ground", "SUN": "the Stadium of Light", "TOT": "Tottenham Hotspur Stadium",
    "WHU": "the London Stadium", "WOL": "Molineux",
}

SCENARIO_STARS = {
    "chase": [{"stars": 3, "label": "Win"}, {"stars": 2, "label": "Draw"}],
    "comeback": [{"stars": 3, "label": "Win"}, {"stars": 2, "label": "Draw"},
                 {"stars": 1, "label": "Lose by one"}],
    "tenmen": [{"stars": 3, "label": "Win"}, {"stars": 2, "label": "Draw"}],
    "protect": [{"stars": 3, "label": "Win by two or more"}, {"stars": 2, "label": "Win"},
                {"stars": 1, "label": "Draw"}],
    "deadlock": [{"stars": 3, "label": "Win"}, {"stars": 1, "label": "Draw"}],
}


def _side_name(side: dict[str, Any]) -> str:
    return str(side.get("name") or side.get("club_id") or "them")


def _style_clause(tactics: dict[str, Any]) -> str:
    t = tactics or {}
    if t.get("defensiveBlockHeight") == "Deep":
        return "have sat deep and made you break them down"
    if t.get("pressingIntensity") in ("Aggressive", "Relentless"):
        return "have pressed you high all afternoon"
    if t.get("afterWinningPossession") == "Counter":
        return "have been waiting to hit you on the break"
    if t.get("buildUpTempo") == "Patient" or t.get("passingDirectness") == "Short":
        return "have kept the ball well"
    return ""


def _ordinal(n: int) -> str:
    n = int(n)
    suf = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"


def _goal_clause(goals: list[dict], team: str) -> str:
    theirs = [g for g in goals if g.get("team") != team]
    if not theirs:
        return ""
    if len(theirs) == 1:
        g = theirs[0]
        return f"{_short(g.get('name'))}'s {_ordinal(g['minute'])}-minute goal is the difference"
    by: dict[str, list[int]] = {}
    for g in theirs:
        by.setdefault(_short(g.get("name")), []).append(int(g["minute"]))
    if len(by) == 1:
        (who, mins), = by.items()
        return f"{who} has scored {'twice' if len(mins) == 2 else f'{len(mins)} times'} ({', '.join(f'{m}’' for m in mins)})"
    names = " and ".join(f"{who} ({', '.join(f'{m}’' for m in mins)})" for who, mins in list(by.items())[:2])
    return f"{names} have done the damage"


def scenario_card(scenario_id: str, kind: str, seed: int, takeover_clock: int,
                  st: dict[str, Any], team: str, request: dict[str, Any],
                  fallback: bool) -> dict[str, Any]:
    """Title, brief and objective for a found scenario (all from real state)."""
    other = opp(team)
    me_side = request["home_team"] if team == "HOME" else request["away_team"]
    op_side = request["away_team"] if team == "HOME" else request["home_team"]
    me, them = _side_name(me_side), _side_name(op_side)
    home_side = request["home_team"]
    ground = STADIUMS.get(str(home_side.get("club_id") or "").upper())
    venue = (f"at {ground}" if ground else f"at home to {them}") if team == "HOME" else \
        (f"at {ground}" if ground else f"away at {them}")
    gf, ga = st["score"][team], st["score"][other]
    xf, xa = st["xg"][team], st["xg"][other]
    minute = takeover_clock // 60
    left = 90 - minute
    style = _style_clause(op_side.get("tactics") or {})
    goals = _goal_clause(st.get("goals") or [], team)
    xg_note = (f" You've had the better of it on xG ({xf:.1f} to {xa:.1f}) — the goal will come if you keep your nerve."
               if xf > xa + 0.3 else
               f" On xG ({xa:.1f} to your {xf:.1f}) they've deserved it." if xa > xf + 0.3 else "")

    def they(clause_goals: bool = True) -> str:
        """'Everton have sat deep and X's goal is the difference.' from what is known."""
        parts = []
        if style:
            parts.append(f"{them} {style}")
        if clause_goals and goals:
            parts.append(goals if parts else goals[0].upper() + goals[1:])
        return (" and ".join(parts) + ".") if parts else ""

    score_txt = f"{gf}–{ga}"
    diff = gf - ga
    if kind == "comeback":
        title = f"The comeback {venue}"
        brief = (f"{score_txt} down after {minute} minutes. {they()}{xg_note} "
                 f"{left} minutes and five changes to turn it round.")
    elif kind == "protect":
        title = f"Hold on {venue}"
        brief = (f"{score_txt} up with {left} to play. {them} are about to throw everything at you. "
                 f"See it out — and a second goal would kill it.")
    elif kind == "tenmen":
        red = next((r for r in (st.get("sent_off") or []) if r.get("team") == team), None)
        who = f"{_short(red['name'])} has been sent off" if red else "You're down to ten men"
        state = "level" if diff == 0 else f"{score_txt} down"
        title = f"Ten men {venue}"
        brief = (f"{who} and it's {state} on the hour. {they(False)} "
                 f"Reshape, keep your legs and nick something from the last {left} minutes.")
    elif kind == "deadlock":
        title = f"Break the deadlock {venue}"
        brief = (f"0–0 after {minute} minutes and {them} have had the better chances "
                 f"({xa:.1f} xG to your {xf:.1f}). {they(False)} Find a way to win it.")
    else:  # chase (also the fallback)
        if diff < 0:
            title = f"Rescue it {venue}"
            brief = (f"{score_txt} down on the hour. {they()}{xg_note} "
                     "Thirty minutes, five changes — go and get something.")
        else:
            title = f"Take charge {venue}"
            brief = (f"It's {score_txt} on the hour against {them}. {they(False)} "
                     "Thirty minutes to make it yours.")
    if kind != "tenmen":
        for r in (st.get("sent_off") or []):
            if r.get("team") == team:
                brief += f" And you're down to ten — {_short(r.get('name'))} has been sent off."
            else:
                brief += f" {them} are down to ten: {_short(r.get('name'))} has been sent off."
    brief = " ".join(brief.split())
    return {"scenario_id": scenario_id, "kind": kind, "seed": int(seed),
            "takeover_clock": int(takeover_clock), "title": title, "brief": brief,
            "objective": {"stars": SCENARIO_STARS.get(kind, SCENARIO_STARS["chase"])},
            "state": {"score": [gf, ga], "xg": [round(xf, 2), round(xa, 2)],
                      "shots": [st["shots"][team], st["shots"][other]],
                      "reds": [st["reds"][team], st["reds"][other]]},
            "teams": {"you": me, "them": them}, "fallback": bool(fallback)}
