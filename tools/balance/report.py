"""Generate an evidence dashboard; smoke samples never certify balance gates."""
from __future__ import annotations
import json
from pathlib import Path
from tools.balance import common as C
OUT = Path(__file__).resolve().parent / 'report.md'


def cli(a):
    from tools.balance.run import load_result
    lines = ['# Touchline v2 balance report', '',
             f'Run scale: **{C.SCALE["name"]}**. Source versions: `{json.dumps(C.provenance(), sort_keys=True)}`.', '',
             'Release balance is **not certified**. Extreme match outcomes and historical scorer concentration require completed calibration and tuning before release. Only results matching the current engine, build, web, harness and scale are included. '
             'Smoke verifies tooling; it cannot certify season totals, card bands, dominance or agency. '
             'An in-band point estimate alone is not statistical support for a gate.', '']
    available = []
    for name in ('baseline', 'baseline_cards', 'state_library', 'effects_summary', 'curves', 'matchup', 'matchup_cards', 'economy', 'career_experiments'):
        data = load_result(name)
        if data is None:
            continue
        available.append(name)
        lines.extend([f'## {name.replace("_", " ")}', ''])
        if name.startswith('baseline'):
            lines += [f'{len(data["reports"])} season samples; {sum(r["matches"] for r in data["reports"])} fixtures.', '',
                      '| Gate | Estimate | 95% interval / per season | Target | Evidence |', '|---|---|---|---|---|']
            for g in data['gates']:
                status = 'PASS' if g['pass'] is True else 'FAIL' if g['pass'] is False else 'UNVERIFIED'
                lines.append(f'| {g["gate"]} | {g["value"]:.3f} | {g.get("ci") or g.get("per_season", "")} | {g["target"]} | {status} |')
            lines += ['', 'Largest observed margins (actual sampled fixtures):', '',
                      '| Home | Away | Score | xG home / away |', '|---|---|---|---|']
            for sample in data['reports']:
                for tail in sample.get('tail_matches', []):
                    score = tail['score']
                    lines.append(f'| {tail["home"]} | {tail["away"]} | {score["home"]}–{score["away"]} | {tail["xg_home"]:.2f} / {tail["xg_away"]:.2f} |')
            lines += ['', 'Feel metrics (moment counts are engine-event proxies, not UI opportunities):', '```json', json.dumps(data['feel'], indent=2), '```', '']
        elif name == 'effects_summary':
            lines += [f'{len(data["summary"])} cards × {data["n_states"]} sampled states × {data["n"]} paired futures.', '',
                      '| Card | Cost | Mean Δpoints ± SE | Value / energy | Applied |', '|---|---|---|---|---|']
            for cid, row in sorted(data['summary'].items()):
                lines.append(f'| {cid} | {row["cost"]} | {row["mean_dpts"]:+.3f} ± {row["se_dpts"]:.3f} | {row["per_energy"]} | {row["applied_rate"]:.0%} |')
            lines += ['', '**UNVERIFIED:** preview calibration requires held-out futures and system-pair coverage. '
                      'Observed dominance/bad-context counts are screening statistics. '
                      'READ THE GAME reveals opponent intent; its informational utility is unmeasured by causal xG futures and must not be tuned to a fictitious pitch-value band. Total variation of W/D/L is not the paired fraction of results changed; '
                      'selecting the best card on the same sample biases agency upward.', '']
        elif 'markdown' in data:
            lines += [data['markdown'], '', '**UNVERIFIED:** these are screening results until complete coverage and uncertainty support the target.', '']
        else:
            lines += ['```json', json.dumps(data, indent=2, default=str), '```', '']
    lines += ['## Coverage and rerun commands', '',
              f'Current matching results: {", ".join(available) or "none"}. All missing areas are **UNVERIFIED**.', '',
              '```sh', '/tmp/tlvenv/bin/python -m tools.balance.run all --scale smoke --workers 2',
              '# Full run on a Slurm CPU allocation, using a frozen source snapshot:',
              'python -m tools.balance.run baseline --scale full --workers 8',
              'python -m tools.balance.run baseline --scale full --workers 8 --cards',
              'python -m tools.balance.run states --scale full --workers 8',
              'python -m tools.balance.run effects --scale full --workers 8',
              'python -m tools.balance.run curves --scale full --workers 8',
              'python -m tools.balance.run matchup --scale full --workers 8 --cards',
              'python -m tools.balance.run economy --scale full --workers 8',
              'python -m tools.balance.run report --scale full', '```', '',
              '## Method limits', '',
              'The season exporter samples CPU squads at each matchweek from a fixed browser save. CPU-card baselines then persist authoritative TP training, partnerships and familiarity; '
              'It does not advance persistent injuries or transfers. '
              'Build curves control kickoff inputs rather than simulate manager choices. '
              'Economy is a scripted Liverpool surrogate fitted to league output, not all club sizes or the full production economy. '
              'Training includes paired persistent youth versus first-XI plans. '
              'Consequently §9/§14 definition of done remains open even after a full screening run.']
    OUT.write_text('\n'.join(lines) + '\n')
    print(f'wrote {OUT}')
