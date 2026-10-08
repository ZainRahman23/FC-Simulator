#!/usr/bin/env python3
# SLP-1b calibration time series (read-only, 60 Hz evidence traces, f = 1 Hz = the preregistered softest): support force, ground-reaction forces (ankle-probe contact
# impulses), pelvis pitch / roll and forward deviation from the scheduled reference, from gait start to the fall. No steady cycle exists (every run fails in the ramp
# or, for walk, collapses within ~1 s of gait start), so the window shows the start-up cycles and the failure.
import json, gzip, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
D = 'review_artifacts/physical_character_v2/slp1/evidence/calibration_1b/'
fig, ax = plt.subplots(4, 3, figsize=(18, 13), sharex='col')
for c, sp in enumerate(['walk', 'jog', 'run']):
    d = json.load(gzip.open(D + f'D0_{sp}_f1_a.json.gz')); tr = [r for r in d['trace'] if r[0] >= 0.4]; t = [r[0] for r in tr]; caps = d['run']['der']['caps']; fall = d['architecture']['A4_fallT'] or t[-1]
    tr = [r for r in tr if r[0] <= fall + 0.1]; t = [r[0] for r in tr]
    a = ax[0][c]; [a.plot(t, [r[4][i] for r in tr], lab, label=f'support F{k}') for i, k, lab in [(0, 'x (lateral)', 'g-'), (1, 'y (vertical)', 'b-'), (2, 'z (forward)', 'r-')]]
    a.axhline(caps['horizontalN'], color='r', ls=':', lw=0.8); a.axhline(-caps['horizontalN'], color='r', ls=':', lw=0.8); a.set_title(f'{sp} {d["run"]["gait"]["v"]} m/s, f = 1 Hz (fell {fall:.2f} s)'); a.set_ylabel('support force N'); a.legend(fontsize=7)
    a = ax[1][c]; a.plot(t, [r[21][0][1] for r in tr], 'm-', label='ground Fy left'); a.plot(t, [r[21][1][1] for r in tr], 'c-', label='ground Fy right'); a.plot(t, [r[4][1] for r in tr], 'b--', label='support Fy'); a.axhline(78.91 * 9.81, color='k', ls=':', lw=0.8, label='body weight'); a.set_ylabel('vertical N'); a.legend(fontsize=7)
    a = ax[2][c]; a.plot(t, [r[21][0][2] + r[21][1][2] for r in tr], 'k-', label='ground F forward (both feet)'); a.plot(t, [r[4][2] for r in tr], 'r--', label='support F forward'); a.axhline(0, color='grey', lw=0.5); a.set_ylabel('forward N'); a.legend(fontsize=7)
    a = ax[3][c]; a.plot(t, [r[22] for r in tr], 'b-', label='pelvis pitch °'); a.plot(t, [r[23] for r in tr], 'g-', label='pelvis roll °'); a2 = a.twinx(); a2.plot(t, [r[24][2] * 100 if r[24] else 0 for r in tr], 'r:', label='forward dev vs scheduled ref (cm)'); a2.set_ylabel('cm'); a.set_ylabel('deg'); a.set_xlabel('t (s)'); a.legend(fontsize=7, loc='upper left'); a2.legend(fontsize=7, loc='lower left')
    for e in d['events']:
        if e.get('ev') in ('TD', 'LO'):
            for rr in range(4): ax[rr][c].axvline(e['t'], color=('m' if e['foot'] == 'L' else 'c'), ls='-' if e['ev'] == 'TD' else '--', lw=0.5, alpha=0.6)
fig.suptitle('SLP-1b calibration (undisturbed): support vs ground forces and pelvis motion from gait start to the fall — TD solid / LO dashed (magenta L, cyan R)', fontsize=11)
fig.tight_layout(); fig.savefig('review_artifacts/physical_character_v2/slp1/analysis_1b/SLP1b_TIMESERIES.png', dpi=110); print('ok')
