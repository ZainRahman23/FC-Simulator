"""Bookmark index for viewer_cal12.html — the §16 mandated sequence list."""
import json, math, collections
tr = json.load(open('trace_cal12.json'))
ev = json.load(open('events_cal12.json'))
dec = json.load(open('decisions_cal12.json'))
cons = json.load(open('contacts_cal12.json'))
home = lambda pid: not pid.startswith('bre') and pid != 'igorthiago'
W = 105.0
seqs = []
add = lambda kind, t: seqs.append({'kind': kind, 't': round(max(0.0, t), 1)})

# circulation: >=25 s same-team spell entirely below relx 60 → SLOW_CIRCULATION
ctrls = [(c['t'], 0 if home(c['pid']) else 1, c['pid']) for c in cons if c['kind'] in ('CONTROL', 'GK_CATCH')]
spell_start, spell_team = None, None
for t, tm, pid in ctrls:
    if spell_team is None: spell_team, spell_start = tm, t
    elif tm != spell_team:
        if t - spell_start > 22: add('BUILDUP', spell_start)
        spell_team, spell_start = tm, t
# events
for e in ev:
    if e['kind'] == 'BEAT': add('TAKEON_EXPLOIT', e['t'])
    elif e['kind'] == 'FOUL': add('FOUL', e['t'])
    elif e['kind'] == 'OFFSIDE': add('OFFSIDE', e['t'])
prev = None
for f in tr:
    r = f['restart']
    if r and r != prev and r in ('CORNER', 'FREE_KICK', 'KICKOFF', 'THROW_IN', 'GOAL'):
        add(r, f['t'])
    prev = r
for c in cons:
    if c['kind'] == 'KICK:SHOT': add('SHOT', c['t'])
    elif c['kind'] == 'KICK:LOFT': add('LONG_BALL', c['t'])
    elif c['kind'] == 'KICK:THROUGH': add('THROUGH_BALL', c['t'])
for d in dec:
    if d['action'] == 'PASS' and d.get('family') == 'CUTBACK': add('CUTBACK', d['t'])
# settled wakes cluster = press resistance moment; transitions from contacts
sett = [d['t'] for d in dec if d['why'] == 'SETTLED']
for t in sett[::40]: add('SETTLE_SCAN', t)
lastteam = None
for c in cons:
    if c['kind'] not in ('CONTROL', 'GK_CATCH'): continue
    tm = 0 if home(c['pid']) else 1
    if lastteam is not None and tm != lastteam:
        f0 = min(tr, key=lambda x: abs(x['t'] - c['t']))
        if (f0['b'][0] > 63 and tm == 1) or (f0['b'][0] < 42 and tm == 0):
            add('TRANSITION', c['t'])
    lastteam = tm
add('LATE_GAME', 80 * 60.0)
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
print('bookmarks:', dict(collections.Counter(s['kind'] for s in final)))
