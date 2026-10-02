import json,sys,collections
d=json.load(open(sys.argv[1]))['rows']; G=collections.defaultdict(list)
key=lambda r: r['case']['id'].split('|')[0]
for r in d: G[key(r)].append(r)
def m(a): a=[x for x in a if x is not None]; return (sum(a)/len(a)) if a else float('nan')
def sd(a): a=[x for x in a if x is not None]; mu=m(a); return (sum((x-mu)**2 for x in a)/len(a))**.5 if a else float('nan')
for k,rs in G.items():
  sw=[r['swing'] for r in rs if r.get('swing')]
  ef=[r['land']['err'][0] for r in rs if r.get('land') and r['land'].get('err')]; el=[r['land']['err'][1] for r in rs if r.get('land') and r['land'].get('err')]
  ok=sum(1 for s in sw if s['ok']); trip=sum(1 for s in sw if s['trip']); early=sum(1 for s in sw if s['early'])
  print(f"{k:10s} n {len(rs)} ok {ok} trip {trip} early {early} | err fwd {m(ef)*100:+.1f}±{sd(ef)*100:.1f} lat {m(el)*100:+.1f}±{sd(el)*100:.1f} cm | td {m([s['tdReal'] for s in sw]):.3f} lift {m([s['liftReal'] for s in sw]):.3f} minClr {m([s['minClr'] for s in sw])*100:.1f} cm | vTd {m([s['footVTd'][0] for s in sw if s['footVTd']]):.2f},{m([s['footVTd'][1] for s in sw if s['footVTd']]):.2f} | after {m([r['after'] for r in rs]):.2f}")
if len(sys.argv)>2:
  for r in d:
    s=r.get('swing') or {}; e=r['land'].get('err') if r.get('land') else None
    print(r['case']['id'], 'ok',s.get('ok'),'trip',s.get('trip'),'td',round(s['tdReal'],3) if s.get('tdReal') else None,'err',[round(x*100,1) for x in e] if e else None,'after',r.get('after'))
