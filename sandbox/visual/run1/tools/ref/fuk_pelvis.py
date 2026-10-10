# Fukuchi et al. 2017 running dataset (figshare 10.6084/m9.figshare.4543435, CC BY 4.0), raw markers + GRF, treadmill 3.5 / 4.5 m/s, 5 subjects.
# Reference only: data read from a scratch directory, never copied into the repository.
# Fukuchi 2017 (CC BY 4.0) raw markers: pelvis axial rotation (ASIS line) and obliquity phase relative to right foot strike, per subject/speed.
import sys, os, glob, math
d = sys.argv[1]
def load(fn):
    L = open(fn).read().split('\n'); h = L[0].split('\t'); rows = []
    for l in L[1:]:
        p = l.split('\t')
        if len(p) != len(h): continue
        try: rows.append([float(x) if x not in ('', 'NaN') else float('nan') for x in p])
        except: pass
    return h, rows
def norm(v): l = math.sqrt(sum(x*x for x in v)); return [x/l for x in v]
for mf in sorted(glob.glob(os.path.join(d, 'RBDS*run*markers.txt'))):
    tag = os.path.basename(mf).replace('markers.txt', ''); spd = float(tag[-2:]) / 10
    h, M = load(mf); ci = {n: i for i, n in enumerate(h)}
    P = lambda r, n: (r[ci[n+'X']], r[ci[n+'Y']], r[ci[n+'Z']])
    hf, F = load(mf.replace('markers', 'forces')); fy = [r[2] for r in F]; fs, ffs = 150.0, 300.0
    RA = [P(r, 'R.ASIS') for r in M]; LA = [P(r, 'L.ASIS') for r in M]; RP = [P(r, 'R.PSIS') for r in M]; LP = [P(r, 'L.PSIS') for r in M]
    hz = lambda v: [v[0], 0.0, v[2]]
    ok = [i for i in range(len(M)) if all(q[i][0] == q[i][0] for q in (RA, LA, RP, LP))]
    if len(ok) < 100: print(tag, 'too few frames'); continue
    fwd = norm(hz([sum((RA[i][k]+LA[i][k]-RP[i][k]-LP[i][k])/2 for i in ok) for k in range(3)]))
    rgt = norm(hz([sum(RA[i][k]-LA[i][k] for i in ok) for k in range(3)]))
    dot = lambda a, b: a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
    yaw = []; obl = []
    for i in range(len(M)):
        v = [RA[i][k]-LA[i][k] for k in range(3)]
        yaw.append(math.degrees(math.atan2(-dot(v, fwd), dot(v, rgt))) if v[0]==v[0] else float('nan'))
        obl.append(math.degrees(math.atan2(v[1], dot(v, rgt))) if v[0]==v[0] else float('nan'))      # + = right ASIS up (Y vertical)
    # foot strikes from GRF onset, assigned to the foot whose metatarsal markers are lowest
    tds = []
    for i in range(10, len(fy)-1):
        if fy[i-1] < 50 <= fy[i] and max(fy[i-10:i]) < 30:
            j = int(round(i/ffs*fs))
            if j < 2 or j >= len(M)-3: continue
            yR = min(P(M[j], 'R.MT1')[1], P(M[j], 'R.Heel.Bottom')[1]); yL = min(P(M[j], 'L.MT1')[1], P(M[j], 'L.Heel.Bottom')[1])
            tds.append((j, 'R' if yR < yL else 'L'))
    R = [j for j, s in tds if s == 'R']
    ph_yaw = []; ph_obl = []; amps = []; ampo = []
    for a, b in zip(R, R[1:]):
        if b - a < 40 or b - a > 160: continue
        seg = yaw[a:b+1]; sego = obl[a:b+1]
        bad = sum(1 for x in seg if x != x)
        if bad > 0.1 * len(seg): continue
        def fill(z):
            z = z[:]; good = [i for i, x in enumerate(z) if x == x]
            for i, x in enumerate(z):
                if x != x:
                    lo = max([g for g in good if g < i], default=None); hi = min([g for g in good if g > i], default=None)
                    z[i] = z[lo] if hi is None else z[hi] if lo is None else z[lo] + (z[hi] - z[lo]) * (i - lo) / (hi - lo)
            return z
        seg = fill(seg); sego = fill(sego)
        m = sum(seg)/len(seg); mo = sum(sego)/len(sego)
        iy = max(range(len(seg)), key=lambda k: seg[k]); io = max(range(len(sego)), key=lambda k: sego[k])
        ph_yaw.append(iy/(b-a)); ph_obl.append(io/(b-a)); amps.append(max(seg)-min(seg)); ampo.append(max(sego)-min(sego))
        # left strike inside this stride
    Lin = [j for j, s in tds if s == 'L']
    if not ph_yaw: print(tag, 'no clean strides', len(R), 'R strikes'); continue
    cm = lambda xs: (math.degrees(math.atan2(sum(math.sin(2*math.pi*x) for x in xs), sum(math.cos(2*math.pi*x) for x in xs))) / 360 + 1) % 1
    print(f"{tag} {spd} m/s: {len(ph_yaw)} strides; pelvis R-back peak at {cm(ph_yaw)*100:.0f}% of the R stride (range {sum(amps)/len(amps):.1f}°); R-ASIS-up peak at {cm(ph_obl)*100:.0f}% (range {sum(ampo)/len(ampo):.1f}°)")
