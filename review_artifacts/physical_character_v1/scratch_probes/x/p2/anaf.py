import json,collections,statistics as S,sys
d=json.load(open(sys.argv[1]))['rows']; G=collections.defaultdict(list)
for r in d:
  v,st,K,tau,dd,dT=r['case']['id'].split('|'); G[(v,float(tau),float(dd),float(dT))].append(r)
def ms(a): return (S.mean(a), S.pstdev(a)) if a else (float('nan'),0)
print("var  tau   d     dT   | foothold err vs request (cm) | td err vs request (ms) | ok | X predicted-landing err (cm)")
for k in sorted(G):
  rs=G[k]; v,tau,dd,dT=k; fe=[];te=[];pe=[];ok=0
  for r in rs:
    if not r.get('land') or r['land'].get('ach') is None: continue
    ach=r['land']['ach'][0]; req=0.27+dd; fe.append((ach-req)*100)
    if r['swing']['tdReal'] is not None: te.append((r['swing']['tdReal']-(0.42+dT))*1000)
    ok+=r['swing']['ok']
    if r.get('swx') and r['swx']['lastShort'] and r['swx']['lastShort'][0] is not None: pe.append((ach-(req-r['swx']['lastShort'][0]))*100)
  a,b=ms(fe); c,e=ms(te); p,q=ms(pe)
  print(f"{v:4s} {tau:.2f} {dd:+.2f} {dT:+.2f} | {a:+5.1f} ± {b:4.1f} | {c:+5.0f} ± {e:3.0f} | {ok}/{len(rs)} | {p:+5.1f} ± {q:4.1f}")
