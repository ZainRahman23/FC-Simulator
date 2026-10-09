#!/usr/bin/env python3
# SLP-2C stage report (read-only): the user's per-speed quantities for a stage run, over (W1) the pre-collapse window [t_g, first |pitch| > 5°) and (W2) the run
# to FALLEN; plus a comparison figure against the SLP-2 run at the same speed / f (legs' forward force split by scheduled stance / swing, B forward, pitch).
import json, gzip, sys, statistics as stt, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
sp = sys.argv[1] if len(sys.argv) > 1 else 'walk'; R = 'review_artifacts/physical_character_v2/slp2/'; dt = 1 / 60; M, G = 78.91, 9.81
d = json.load(gzip.open(R + f'evidence/slp2c_stages/stage1_{sp}_D0_f1_a.json.gz')); d2 = json.load(gzip.open(R + f'evidence/calibration/D0_{sp}_f1_a.json.gz'))
tr = d['trace']; caps = d['run']['der']['caps']; fall = d['architecture']['A4_fallT']; tp = next((r[0] for r in tr if r[0] >= 0.5 and abs(r[22]) > 5), d['endT'])
def win(a, b):
    w = [r for r in tr if a <= r[0] < b]
    st = [(r, n) for r in w for n in (0, 1) if r[12][n] == 'S']; sw = [(r, n) for r in w for n in (0, 1) if r[12][n] == 'W']
    return {'window_s': [round(a, 3), round(b, 3)], 'A_forwardImpulseNs': round(sum(r[25][0] for r in w) * dt, 2), 'legs_netForwardImpulseNs': round(sum(r[21][0][2] + r[21][1][2] for r in w) * dt, 2),
            'legs_forward_stance_vs_swingNs': [round(sum(r[21][n][2] for r, n in st) * dt, 2), round(sum(r[21][n][2] for r, n in sw) * dt, 2)], 'swingTicksInContact': f"{sum(1 for r, n in sw if r[21][n][1] > 20)}/{len(sw)}",
            'legs_verticalImpulseNs': round(sum(r[21][0][1] + r[21][1][1] for r in w) * dt, 1), 'weightImpulseNs': round(M * G * len(w) * dt, 1), 'B_forwardImpulseNs': round(sum(r[4][2] for r in w) * dt, 2),
            'B_meanAbsFracOfCap': {k: round(stt.mean(abs(r[4][i]) / (caps['horizontalN'] if i != 1 else (caps['verticalUpN'] if r[4][1] >= 0 else caps['verticalDownN'])) for r in w), 3) for i, k in enumerate(['Fx', 'Fy', 'Fz'])} | {k: round(stt.mean(abs(r[5][i]) / caps['torqueNm'] for r in w), 3) for i, k in enumerate(['Tx', 'Ty', 'Tz'])},
            'B_saturatedPct': round(100 * sum(1 for r in w if r[6]) / len(w), 1), 'D_comFwdM_range': [round(min(r[25][1][2] for r in w), 4), round(max(r[25][1][2] for r in w), 4)], 'Dv_fwd_range': [round(min(r[25][2][2] for r in w), 3), round(max(r[25][2][2] for r in w), 3)],
            'pelvisPitchDeg': [round(min(r[22] for r in w), 1), round(max(r[22] for r in w), 1)], 'pelvisRollDeg': [round(min(r[23] for r in w), 1), round(max(r[23] for r in w), 1)], 'legHardMarginMinDeg': round(min(r[15] for r in w), 2), 'actSatAxesMean': round(stt.mean(r[14] for r in w), 2)}
out = {'speed': sp, 'hash': d['hashEnd'], 'hashRepeat': json.load(gzip.open(R + f'evidence/slp2c_stages/stage1_{sp}_D0_f1_b.json.gz'))['hashEnd'], 'fallT': fall, 'firstPitchOver5': tp, 'P': {k: d['slp2c'][k]['pass'] for k in ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']} | {'base': d['slp2c']['base'], 'pass': d['slp2c']['pass']},
       'touchdowns': d['slp2c']['touchdowns'], 'W1_preCollapse': win(0.5, tp), 'W2_toFall': win(0.5, fall or d['endT']), 'events': d['events']}
json.dump(out, open(R + f'analysis/slp2c_stage1_{sp}_report.json', 'w'), indent=1); print(json.dumps(out, indent=1))
fig, ax = plt.subplots(3, 2, figsize=(15, 9), sharex=True)
for c, (lab, dd) in enumerate([('SLP-2 (version 2)', d2), ('SLP-2C (version 2c)', d)]):
    t2 = [r for r in dd['trace'] if 0.4 <= r[0] <= (dd['architecture']['A4_fallT'] or dd['endT']) + 0.05]; t = [r[0] for r in t2]
    a = ax[0][c]; a.plot(t, [sum(r[21][n][2] for n in (0, 1) if r[12][n] == 'S') for r in t2], 'k-', label='legs forward, STANCE feet'); a.plot(t, [sum(r[21][n][2] for n in (0, 1) if r[12][n] == 'W') for r in t2], 'm-', label='legs forward, SWING feet (drag)'); a.plot(t, [r[4][2] for r in t2], 'r--', label='B forward'); a.plot(t, [r[25][0] for r in t2], 'g:', label='A forward')
    a.set_title(f'{lab}: walk 1.2 m/s, f = 1 Hz (fell {dd["architecture"]["A4_fallT"]:.2f} s)'); a.set_ylabel('N'); a.legend(fontsize=7)
    a = ax[1][c]; a.plot(t, [sum(r[21][n][1] for n in (0, 1) if r[12][n] == 'W') for r in t2], 'm-', label='vertical load on SWING feet (N)'); a.plot(t, [r[4][1] for r in t2], 'b--', label='B vertical'); a.set_ylabel('N'); a.legend(fontsize=7)
    a = ax[2][c]; a.plot(t, [r[22] for r in t2], 'b-', label='pelvis pitch °'); a.plot(t, [r[25][2][2] * 100 for r in t2], 'c-', label='Dv_z (cm/s)'); a.axhline(0, color='grey', lw=0.5); a.set_xlabel('t (s)'); a.legend(fontsize=7)
    for e in dd['events']:
        if e.get('ev') in ('TD', 'LO'):
            for rr in range(3): ax[rr][c].axvline(e['t'], color='m' if e['foot'] == 'L' else 'c', ls='-' if e['ev'] == 'TD' else '--', lw=0.5, alpha=0.6)
fig.suptitle('SLP-2 vs SLP-2C at 1.2 m/s: C2 removes the stance braking; C1 compresses the horizontal swing and the trailing foot drags after liftoff (TD solid / LO dashed)', fontsize=11)
fig.tight_layout(); fig.savefig(R + 'analysis/SLP2C_STAGE1_vs_SLP2.png', dpi=105)
