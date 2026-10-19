# receive_elite1/tools/re1_summary.py — the movement matrix, CURRENT vs NEW: outcomes, separation (turn / receive), speed, contacts, by receiver and turn
#   python3 re1_summary.py <cur.json> <new.json>
import json, sys, statistics as st
cur, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
def med(xs): xs = [x for x in xs if x is not None]; return round(st.median(xs), 2) if xs else None
def p90(xs): xs = sorted(x for x in xs if x is not None); return round(xs[int(0.9 * (len(xs) - 1))], 2) if xs else None
def oc(rows):
  d = {}
  for r in rows: d[r['cls5']] = d.get(r['cls5'], 0) + 1
  return d
for name, rows in (("CURRENT", cur), ("NEW", new)):
  print(name, len(rows), "outcomes", oc(rows), "| moving", oc([r for r in rows if r['mode'] == 'moving']), "| standing", oc([r for r in rows if r['mode'] == 'stationary']))
print("released (NEW):", sum(1 for r in new if r.get('elite') and r['elite']['failed']), " elite episodes:", sum(1 for r in new if r.get('elite')), " recovery contacts:", sum(r['elite']['rec'] for r in new if r.get('elite')))
print("\nturn | rs     | n  | turnMax med C→N  (p90)          | recvMax med C→N | contacts N | vMin med C→N | v+1s med C→N | outcome C → N")
key = lambda r: (r['turn'], r['rs'])
for t in sorted(set(abs(r['turn']) for r in cur)):
  for rs in ("STAND", "JOG", "RUN", "SPRINT"):
    C = [r for r in cur if abs(r['turn']) == t and r['rs'] == rs]; N = [r for r in new if abs(r['turn']) == t and r['rs'] == rs]
    if not C: continue
    g = lambda rows, f: [f(r) for r in rows]
    tm = lambda r: r['sep']['turn']['max'] if r['sep']['turn'] else None; rm = lambda r: r['sep']['receive']['max'] if r['sep']['receive'] else None
    print(f"{t:4} | {rs:6} | {len(C):2} | {med(g(C, tm))} → {med(g(N, tm))}  ({p90(g(C, tm))} → {p90(g(N, tm))}) | {med(g(C, rm))} → {med(g(N, rm))} | {med(g(N, lambda r: r['receiveContacts']))} | {med(g(C, lambda r: r['speed']['min']))} → {med(g(N, lambda r: r['speed']['min']))} | {med(g(C, lambda r: r['speed']['after10']))} → {med(g(N, lambda r: r['speed']['after10']))} | {oc(C)} → {oc(N)}")
