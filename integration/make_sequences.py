"""Build sequences.json — bookmark index for viewer_sequences.html (evidence)."""
import json, collections
tr = json.load(open('trace_90min.json'))
ev = json.load(open('events_90min.json'))
dec = json.load(open('decisions_90min.json'))

seqs = []
def add(kind, t):
    seqs.append({'kind': kind, 't': round(max(0.0, t), 1)})

# events ledger: BEAT / FOUL / OFFSIDE
for e in ev:
    if e['kind'] in ('BEAT', 'FOUL', 'OFFSIDE'):
        add(e['kind'], e['t'])

# restarts from the trace restart field (first frame of each restart span)
prev = None
for f in tr:
    r = f['restart']
    if r and r != prev and r in ('THROW_IN', 'CORNER', 'FREE_KICK', 'PENALTY', 'GOAL', 'KICKOFF', 'GOAL_KICK'):
        add(r, f['t'])
    prev = r

# shots / crosses / cutbacks / take-ons / pressing bursts / buildups from decisions
pass_run = []
press_last = -99
for d in dec:
    if d['action'] == 'SHOOT':
        add('SHOT', d['t'])
    elif d['action'] == 'DRIBBLE':
        if len([s for s in seqs if s['kind'] == 'TAKE_ON']) < 8:
            add('TAKE_ON', d['t'])
    elif d['action'] == 'PASS':
        if d.get('family') in ('CROSS', 'CUTBACK'):
            add(d['family'], d['t'])
        pass_run.append(d)
        if len(pass_run) >= 4 and pass_run[-1]['t'] - pass_run[-4]['t'] < 14:
            if not seqs or seqs[-1]['kind'] != 'BUILDUP' or d['t'] - seqs[-1]['t'] > 60:
                add('BUILDUP', pass_run[-4]['t'])
    if d['why'] == 'PRESSURE' and d['t'] - press_last > 45:
        press_last = d['t']
        add('PRESS', d['t'])

# de-dup, sort, cap
seen = set(); out = []
for s in sorted(seqs, key=lambda s: s['t']):
    k = (s['kind'], int(s['t'] // 8))
    if k in seen: continue
    seen.add(k); out.append(s)
counts = collections.Counter(s['kind'] for s in out)
capped = collections.Counter(); final = []
for s in out:
    capped[s['kind']] += 1
    if capped[s['kind']] <= 10:
        final.append(s)
json.dump(final, open('sequences.json', 'w'), indent=0)
print('sequence kinds:', dict(counts))
print('bookmarks written:', len(final))
