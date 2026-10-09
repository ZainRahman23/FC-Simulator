#!/usr/bin/env python3
# SLP-2 calibration analysis (read-only, 60 Hz traces): per run the A9 / A10 values; per scheduled step the forward impulse of A, B and the legs (ankle-probe
# contact impulses), the first-60-ms touchdown share of the legs' impulse, peak leg vertical force, max |pitch| and min Dv_z (COM forward speed minus the
# reference); the failure chain (first forward-cap saturation, first |pitch| > 5°, FALLEN); and a figure of A / B / leg forward forces, Dv_z and pitch.
import json, gzip, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
D = 'review_artifacts/physical_character_v2/slp2/evidence/calibration/'; O = 'review_artifacts/physical_character_v2/slp2/analysis/'; dt = 1 / 60
lines, summ = [], {}
for sp in ['walk', 'jog', 'run']:
    for f in [1, 2, 4]:
        d = json.load(gzip.open(D + f'D0_{sp}_f{f}_a.json.gz')); tr = d['trace']; caps = d['run']['der']['caps']; s2 = d['slp2']; A = d['architecture']
        chain = {'firstFwdCap': next((round(r[0], 3) for r in tr if r[0] >= 0.5 and abs(r[4][2]) >= 0.999 * caps['horizontalN']), None), 'firstPitchOver5': next((round(r[0], 3) for r in tr if r[0] >= 0.5 and abs(r[22]) > 5), None), 'fallT': A['A4_fallT']}
        ev = [e for e in d['events'] if e.get('ev') == 'TD']; b = [0.5] + [e['t'] for e in ev]; steps = []
        for a, c, foot in zip(b[:-1], b[1:], ['start'] + [e['foot'] for e in ev[:-1]]):
            w = [r for r in tr if a <= r[0] < c]
            if not w: continue
            steps.append({'t0': round(a, 3), 'after': foot, 'JA': round(sum(r[25][0] for r in w) * dt, 1), 'JB': round(sum(r[4][2] for r in w) * dt, 1), 'Jlegs': round(sum(r[21][0][2] + r[21][1][2] for r in w) * dt, 1),
                          'Jlegs_first60ms': round(sum(r[21][0][2] + r[21][1][2] for r in w if r[0] < a + 0.06) * dt, 1), 'peakLegFy': round(max(r[21][0][1] + r[21][1][1] for r in w)), 'maxAbsPitch': round(max(abs(r[22]) for r in w), 1), 'minDvz': round(min(r[25][2][2] for r in w), 3)})
        summ[f'{sp}_f{f}'] = {'hash': d['hashEnd'], 'A9': s2['A9_supportBudget'], 'A9_pass': s2['A9_pass'], 'A10': s2['A10'], 'A1': A['A1_realisedSpeed'], 'A3': A['A3_satFraction'], 'A4alpha': A['A4_alphaMinSteady'], 'fall': A['A4_fallT'], 'A5sumPos': A['A5']['energySumPosJ'], 'A6': [A['A6']['stancesWithContact'], A['A6']['scheduledStances']], 'A7': d['slp1b']['A7_legWeightFraction'], 'WA_J': s2['WA_J'], 'chain': chain, 'steps': steps}
json.dump(summ, open(O + 'calibration_summary.json', 'w'), indent=1)
for k, v in summ.items():
    print('==', k, v['hash'], 'A1', v['A1'], 'A3', v['A3'], 'A4', v['A4alpha'], 'fall', v['fall'], 'A6', v['A6'], 'A7', v['A7'], 'A9', v['A9_pass'], {a: x['meanFracOfCap'] for a, x in v['A9'].items()}, 'A10', v['A10'], 'chain', v['chain'])
    for s in v['steps']: print('   ', s)
fig, ax = plt.subplots(3, 3, figsize=(18, 10), sharex='col')
for c, sp in enumerate(['walk', 'jog', 'run']):
    d = json.load(gzip.open(D + f'D0_{sp}_f1_a.json.gz')); fall = d['architecture']['A4_fallT'] or d['endT']; tr = [r for r in d['trace'] if 0.4 <= r[0] <= fall + 0.1]; t = [r[0] for r in tr]; caps = d['run']['der']['caps']
    a = ax[0][c]; a.plot(t, [r[25][0] for r in tr], 'g-', label='A forward (Σ m_i α a_T)'); a.plot(t, [r[4][2] for r in tr], 'r-', label='B forward'); a.plot(t, [r[21][0][2] + r[21][1][2] for r in tr], 'k-', lw=0.8, label='legs (ground) forward')
    a.axhline(caps['horizontalN'], color='r', ls=':', lw=0.8); a.set_title(f'SLP-2 {sp} {d["run"]["gait"]["v"]} m/s, f = 1 Hz (fell {fall:.2f} s)'); a.set_ylabel('forward force N'); a.legend(fontsize=7)
    a = ax[1][c]; a.plot(t, [r[25][2][2] for r in tr], 'b-', label='Dv_z = COM fwd speed − reference'); a.plot(t, [r[25][1][2] for r in tr], 'c--', label='Dx_z (m)'); a.axhline(0, color='grey', lw=0.5); a.set_ylabel('m/s, m'); a.legend(fontsize=7)
    a = ax[2][c]; a.plot(t, [r[22] for r in tr], 'b-', label='pelvis pitch °'); a.plot(t, [r[23] for r in tr], 'g-', label='pelvis roll °'); a.plot(t, [r[4][1] / 10 for r in tr], 'm:', label='B vertical / 10 (N)'); a.set_xlabel('t (s)'); a.set_ylabel('deg'); a.legend(fontsize=7)
    for e in d['events']:
        if e.get('ev') == 'TD':
            for rr in range(3): ax[rr][c].axvline(e['t'], color='m' if e['foot'] == 'L' else 'c', lw=0.5, alpha=0.6)
fig.suptitle('SLP-2 calibration (undisturbed, f = 1 Hz): A carries the authoritative acceleration; the legs\' net braking grows and B absorbs it until its forward cap (touchdowns: magenta L, cyan R)', fontsize=11)
fig.tight_layout(); fig.savefig(O + 'SLP2_CALIBRATION_TIMESERIES.png', dpi=105)
