from __future__ import annotations

import argparse
import json
from pathlib import Path
from quality_upsets import run

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', type=int, default=12)
    ap.add_argument('--minutes', type=int, default=45)
    ap.add_argument('--seed0', type=int, default=32100)
    ap.add_argument('--deltas', type=float, nargs='+', default=[0.0, 1.0, 2.0, 3.0])
    ap.add_argument('--plan', type=Path, default=ROOT / 'plans' / 'end_to_end.json')
    ap.add_argument('--out', type=Path, default=ROOT / 'quality_sweep_v0_7.json')
    args = ap.parse_args()

    rows = []
    for delta in args.deltas:
        payload = run(args.samples, args.minutes, delta, args.seed0, args.plan)
        favorite = payload['favorite']
        underdog = payload['underdog']
        xg_ratio = favorite['mean_xg'] / max(1e-9, underdog['mean_xg'])
        rows.append({
            'delta_each_side': delta,
            'total_attribute_gap': 2.0 * delta,
            'favorite_wins': favorite['wins'],
            'draws': favorite['draws'],
            'underdog_wins': underdog['wins'],
            'favorite_win_rate': favorite['win_rate'],
            'underdog_win_rate': underdog['win_rate'],
            'favorite_mean_xg': favorite['mean_xg'],
            'underdog_mean_xg': underdog['mean_xg'],
            'favorite_xg_share': round(favorite['mean_xg'] / max(1e-9, favorite['mean_xg'] + underdog['mean_xg']), 4),
            'xg_ratio': round(xg_ratio, 4),
        })

    payload = {
        'experiment': 'actual_attribute_gap_sweep_no_outcome_switch',
        'samples_per_delta': args.samples,
        'minutes': args.minutes,
        'seed0': args.seed0,
        'plan': str(args.plan.relative_to(ROOT) if args.plan.is_relative_to(ROOT) else args.plan),
        'same_seed_set_for_every_delta': True,
        'rows': rows,
        'interpretation': [
            'Only actual attributes are changed. OVR is untouched and unused.',
            'The same seed set is used at every quality gap so counterfactual comparisons remain meaningful.',
            'Increasing quality should improve expected chance creation; individual match outcomes remain stochastic.',
            'No upset, comeback, favorite, or parity switch exists.',
        ],
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print(json.dumps(payload, indent=2))


if __name__ == '__main__':
    main()
