#!/usr/bin/env python3
# SLP-1b calibration summary over two data-driven windows (read-only, 60 Hz traces + 20 N contact log): W1 = [t_g, first forward-cap saturation) — the interval in
# which the separation existed if it existed at all; W2 = [t_g, FALLEN or end]. Per run: achieved forward COM speed vs v_ref, leg vs support vertical share,
# forward impulses (net and positive), support saturation, pelvis pitch / roll, tracking vs the authoritative path and the scheduled reference, actuator
# saturation, leg hard-limit margin, stance-contact fraction (20 N contact inside scheduled stances).
import json, gzip, statistics as stt
D = 'review_artifacts/physical_character_v2/slp1/evidence/calibration_1b/'; dt = 1 / 60
def contacts(d, n):
    iv, on, s0 = [], True, 0.0
    for t, v in d['fz20'][n]:
        if v == 1 and not on: on, s0 = True, t
        elif v == 0 and on: on = False; iv.append((s0, t))
    if on: iv.append((s0, d['endT']))
    return iv
out = {}
for sp in ['walk', 'jog', 'run']:
    for f in [1, 2, 4]:
        d = json.load(gzip.open(D + f'D0_{sp}_f{f}_a.json.gz')); tr = d['trace']; g = d['run']['gait']; caps = d['run']['der']['caps']; tg = 0.5; fall = d['architecture']['A4_fallT']
        tcap = next((r[0] for r in tr if r[0] >= tg and abs(r[4][2]) >= 0.999 * caps['horizontalN']), None)
        T = 2 / g['stepHz']; tsw = T - g['contactS']
        res = {}
        for name, a, b in [('W1', tg, tcap or d['endT']), ('W2', tg, fall or d['endT'])]:
            w = [r for r in tr if a <= r[0] < b]
            if len(w) < 3: res[name] = None; continue
            legY = stt.mean(r[21][0][1] + r[21][1][1] for r in w); supY = stt.mean(r[4][1] for r in w)
            gz = sum(r[21][0][2] + r[21][1][2] for r in w) * dt; sz = sum(r[4][2] for r in w) * dt
            gzp = sum(max(0, r[21][0][2] + r[21][1][2]) for r in w) * dt; szp = sum(max(0, r[4][2]) for r in w) * dt
            sat = sum(1 for r in w if r[6]) / len(w); pit = [r[22] for r in w]; rol = [r[23] for r in w]
            eA = [((r[7][0]) ** 2 + (r[7][2]) ** 2) ** 0.5 for r in w]; eS = [((r[24][0]) ** 2 + (r[24][2]) ** 2) ** 0.5 for r in w if r[24]]
            vEnd = stt.mean(r[10][2] for r in w[-6:]); tEnd = w[-1][0]; vRef = g['v'] * (lambda u: 1 if u >= 1 else u ** 3 * (10 - 15 * u + 6 * u * u))((tEnd - tg) / g['rampS'])
            # stance-contact fraction over scheduled stances fully inside the window
            st = []
            for n in [0, 1]:
                t0f = tg + (T / 2 if n == 1 else 0); iv = contacts(d, n); k = 0
                while True:
                    td = t0f + k * T + tsw; lo = td + g['contactS']; k += 1
                    if td > b: break
                    if td >= a and lo <= b: st.append(sum(max(0, min(y, lo) - max(x, td)) for x, y in iv) / g['contactS'])
            res[name] = {'window_s': [round(a, 3), round(b, 3)], 'comFwdSpeedEnd': round(vEnd, 3), 'vRefEnd': round(vRef, 3), 'legWeightFraction': round(legY / (legY + supY), 3) if legY + supY else None,
                'legVertMeanN': round(legY, 1), 'supVertMeanN': round(supY, 1), 'fwdImpulseNs': {'groundNet': round(gz, 1), 'supportNet': round(sz, 1), 'groundPos': round(gzp, 1), 'supportPos': round(szp, 1),
                'supportShareOfPos': round(szp / (gzp + szp), 3) if gzp + szp else None}, 'supportSatPct': round(100 * sat, 1), 'pitchDeg': [round(min(pit), 1), round(max(pit), 1)], 'rollDeg': [round(min(rol), 1), round(max(rol), 1)],
                'pelvisErrVsAuthoritativeMaxM': round(max(eA), 3), 'pelvisErrVsScheduledMaxM': round(max(eS), 3) if eS else None, 'actSatAxesMean': round(stt.mean(r[14] for r in w), 2), 'legHardMarginMinDeg': round(min(r[15] for r in w), 2),
                'stanceContactFrac': round(stt.mean(st), 3) if st else None, 'stances': len(st)}
        out[f'{sp}_f{f}'] = {'hash': d['hashEnd'], 'firstForwardCapT': tcap, 'fallT': fall, **res}
json.dump(out, open('review_artifacts/physical_character_v2/slp1/analysis_1b/summary_windows.json', 'w'), indent=1)
for k, v in out.items():
    print('==', k, v['hash'], 'first forward cap', v['firstForwardCapT'], 'fall', v['fallT'])
    for w in ['W1', 'W2']: print('  ', w, json.dumps(v[w]))
