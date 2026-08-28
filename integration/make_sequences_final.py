"""§11 bookmark index for the final candidate (viewer_cal12.html reads
sequences_cal12.json — we overwrite it with the final-candidate set)."""
import json, math, collections
tr = json.load(open('trace_final_c.json'))
ev = json.load(open('events_final_c.json'))
dec = json.load(open('decisions_final_c.json'))
cons = json.load(open('contacts_final_c.json'))
home = lambda pid: not pid.startswith('bre') and pid != 'igorthiago'
W = 105.0
seqs = []
add = lambda k, t: seqs.append({'kind': k, 't': round(max(0.0, t), 1)})

# sustained attack / recycle-no-shot: final-third team spells
shots = [(c['t'], 0 if home(c['pid']) else 1) for c in cons if c['kind'] == 'KICK:SHOT']
cur, t0 = None, None
for f in tr:
    b = f['b']
    if b[4] is None or f['restart'] is not None: continue
    tm = 0 if home(b[4]) else 1
    relx = b[0]/1.05 if tm == 0 else 100 - b[0]/1.05
    if relx >= 66:
        if cur != tm: cur, t0 = tm, f['t']
    else:
        if cur is not None and f['t'] - t0 > 14:
            shot_in = any(t0 <= st <= f['t'] + 1 and sm == cur for st, sm in shots)
            add('SUSTAINED_ATTACK' if shot_in else 'RECYCLE_NO_SHOT', t0)
        cur = None
# multi-player box arrival: controlled box moments with >=2 attackers
prev_in = False
for f in tr:
    b = f['b']
    if b[4] is None: prev_in = False; continue
    tm = 0 if home(b[4]) else 1
    inb = (b[0] > W-16.5 if tm == 0 else b[0] < 16.5) and abs(b[1]-34) < 20.15
    if inb and not prev_in:
        occ = sum(1 for p in f['p'] if (home(p[0]) == (tm == 0))
                  and ((p[1] > W-16.5) if tm == 0 else (p[1] < 16.5)) and abs(p[2]-34) < 20.15)
        if occ >= 2: add('MULTI_BOX_ARRIVAL', f['t'])
    prev_in = inb
# aerial contests: fair vs foul
fouls = [e['t'] for e in ev if e['kind'] == 'FOUL']
for c in cons:
    if c['kind'] == 'HEADER':
        foul_near = any(abs(ft - c['t']) < 0.4 for ft in fouls)
        add('AERIAL_FOUL' if foul_near else 'AERIAL_FAIR', c['t'])
for e in ev:
    if e['kind'] == 'BEAT': add('TAKEON_EXPLOIT', e['t'])
for e in ev:
    if e['kind'] == 'FOUL' and e.get('card'): add('FOUL_CARD', e['t'])
for d in dec:
    if d['action'] == 'PASS' and d.get('family') == 'CUTBACK': add('CUTBACK', d['t'])
    if d['action'] == 'PASS' and d.get('family') == 'CROSS': add('CROSS_FARPOST', d['t'])
for t, tm in shots:
    add('SHOT_HOME' if tm == 0 else 'WEAK_TEAM_CHANCE', t)
# transitions (aggressive/weak-team): away gains high then reaches home half fast
lastteam = None
for c in cons:
    if c['kind'] not in ('CONTROL', 'GK_CATCH'): continue
    tm = 0 if home(c['pid']) else 1
    if lastteam == 0 and tm == 1:
        f0 = min(tr, key=lambda x: abs(x['t'] - c['t']))
        if f0['b'][0] > 60: add('WEAK_TRANSITION', c['t'])
    lastteam = tm
prev = None
for f in tr:
    r = f['restart']
    if r and r != prev and r in ('CORNER', 'FREE_KICK', 'KICKOFF', 'GOAL', 'PENALTY'):
        add(r, f['t'])
    prev = r
seen = set(); out = []
for s in sorted(seqs, key=lambda s: s['t']):
    k = (s['kind'], int(s['t'] // 15))
    if k in seen: continue
    seen.add(k); out.append(s)
caps = collections.Counter(); final = []
for s in out:
    caps[s['kind']] += 1
    if caps[s['kind']] <= 5: final.append(s)
json.dump(final, open('sequences_cal12.json', 'w'), indent=0)
# point the viewer at the final-candidate artifacts
import shutil
shutil.copy('trace_final_c.json', 'trace_cal12.json')
shutil.copy('decisions_final_c.json', 'decisions_cal12.json')
print('bookmarks:', dict(collections.Counter(s['kind'] for s in final)))
