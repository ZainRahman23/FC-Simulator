#!/usr/bin/env python3
"""Compatibility entry point for the versioned v2 season balance gate.

python tools/season_sim.py --scale smoke --workers 2
python tools/season_sim.py --scale full --workers 8 --cards

Use tools.balance.run for states, paired card effects, curves and the report.
"""
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.balance.league import export_seasons, play_match, season_report, sim_season
from tools.balance.run import main
if __name__ == '__main__':
    sys.argv.insert(1, 'baseline')
    main()
