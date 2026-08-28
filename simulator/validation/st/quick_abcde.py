import sys, json, statistics
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from st_multiseed import _run
import concurrent.futures as cf

if __name__ == "__main__":
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    rows = []
    with cf.ProcessPoolExecutor(max_workers=8) as ex:
        for m in ex.map(_run, ["ABCDE"]*15, range(lo, lo+15)):
            rows.append(m)
    K = lambda k: round(statistics.mean(r[k] for r in rows), 3)
    beats = statistics.mean(r["dribble_outcomes"].get("BEAT",0) for r in rows)
    print("ABCDE (15 seeds): poss", K("possessions"), "dur", K("poss_mean_s"), "hz/act", K("hazard_per_action"))
    print(" shots", K("shots_total"), "sh25", K("shots_25m_plus"),
          "xG H/A %.2f/%.2f" % (statistics.mean(r["xg"]["HOME"] for r in rows), statistics.mean(r["xg"]["AWAY"] for r in rows)),
          "goals %.2f/%.2f" % (statistics.mean(r["goals"][0] for r in rows), statistics.mean(r["goals"][1] for r in rows)))
    print(" slopeB", K("slope_back"), "len", K("team_len_mean"), "sup8", K("defthird_support8_mean"),
          "wide<2", K("wide1v1_contact_share"), "p>.5", K("press_gt05_share"),
          "beats %.1f" % beats, "drb", K("dribble_chosen"), "comp H/A", K("pass_comp_HOME"), K("pass_comp_AWAY"))
