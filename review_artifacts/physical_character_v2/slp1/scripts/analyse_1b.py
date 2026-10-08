#!/usr/bin/env python3
# SLP-1b calibration analysis (read-only, from the evidence traces at 60 Hz): per scheduled step (touchdown to next touchdown of either foot) the vertical and
# forward impulses delivered by the legs (ankle-probe contact impulses, both feet) and by the artificial support, support saturation, pelvis pitch / roll,
# stance contact and the scheduled vertical impulse; plus the failure chain (first forward-cap saturation, first |pitch| > 5°, α < 0.99, FALLEN).
import json, gzip, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else 'review_artifacts/physical_character_v2/slp1/evidence/calibration_1b'
M, G, dtt = 78.91, 9.81, 1 / 60
def steps(d):
    ev = [e for e in d['events'] if e.get('ev') == 'TD']; tds = [e['t'] for e in ev]
    return list(zip(tds[:-1], tds[1:], [e['foot'] for e in ev[:-1]]))
out = {}
for sp in ['walk', 'jog', 'run']:
    for f in [1, 2, 4]:
        d = json.load(gzip.open(f'{D}/D0_{sp}_f{f}_a.json.gz')); tr = d['trace']; caps = d['run']['der']['caps']; g = d['run']['gait']; T2 = 1 / g['stepHz']
        fall = d['architecture']['A4_fallT']; rows = []
        for (a, b, foot) in steps(d):
            w = [r for r in tr if a <= r[0] < b]
            if not w: continue
            gy = sum(r[21][0][1] + r[21][1][1] for r in w) * dtt; sy = sum(r[4][1] for r in w) * dtt
            gz = sum(r[21][0][2] + r[21][1][2] for r in w) * dtt; sz = sum(r[4][2] for r in w) * dtt
            gzp = sum(max(0, r[21][0][2] + r[21][1][2]) for r in w) * dtt; szp = sum(max(0, r[4][2]) for r in w) * dtt
            sat = sum(1 for r in w if r[6]) / len(w); satF = sum(1 for r in w if abs(r[4][2]) >= 0.999 * caps['horizontalN']) / len(w); satT = sum(1 for r in w if max(abs(r[5][0]), abs(r[5][2])) >= 0.999 * caps['torqueNm']) / len(w)
            pit = max(abs(r[22]) for r in w); rol = max(abs(r[23]) for r in w); dev = max(abs(r[24][2]) for r in w) if w[0][24] else None
            rows.append({'t0': round(a, 3), 't1': round(b, 3), 'foot': foot, 'legVertNs': round(gy, 1), 'supVertNs': round(sy, 1), 'schedVertNs': round(M * G * (b - a), 1), 'legVertFrac': round(gy / (gy + sy), 3) if gy + sy else None,
                         'legFwdNetNs': round(gz, 1), 'supFwdNetNs': round(sz, 1), 'legFwdPosNs': round(gzp, 1), 'supFwdPosNs': round(szp, 1), 'trajMomentumGainNs': round(M * (min(b, d['run']['seconds']) and 0), 1),
                         'supSatFrac': round(sat, 3), 'fwdCapFrac': round(satF, 3), 'pitchRollCapFrac': round(satT, 3), 'pitchMaxDeg': round(pit, 1), 'rollMaxDeg': round(rol, 1), 'fwdDevVsSchedRefMaxM': round(dev, 3) if dev is not None else None})
        def first(pred):
            for r in tr:
                if r[0] >= 0.5 and pred(r): return round(r[0], 3)
        chain = {'firstFwdCap': first(lambda r: abs(r[4][2]) >= 0.999 * caps['horizontalN']), 'firstPitchRollCap': first(lambda r: max(abs(r[5][0]), abs(r[5][2])) >= 0.999 * caps['torqueNm']),
                 'firstPitchOver5deg': first(lambda r: abs(r[22]) > 5), 'firstAlphaBelow099': first(lambda r: r[1] < 0.99), 'fallT': fall}
        out[f'{sp}_f{f}'] = {'hash': d['hashEnd'], 'chain': chain, 'steps': rows}
json.dump(out, open('review_artifacts/physical_character_v2/slp1/analysis_1b/per_step.json', 'w'), indent=1)
for k, v in out.items():
    print('==', k, v['hash'], v['chain'])
    for r in v['steps'][:12]: print('  ', {kk: r[kk] for kk in ['t0', 'foot', 'legVertNs', 'supVertNs', 'schedVertNs', 'legVertFrac', 'legFwdNetNs', 'supFwdNetNs', 'legFwdPosNs', 'supFwdPosNs', 'supSatFrac', 'fwdCapFrac', 'pitchRollCapFrac', 'pitchMaxDeg', 'rollMaxDeg', 'fwdDevVsSchedRefMaxM']})
