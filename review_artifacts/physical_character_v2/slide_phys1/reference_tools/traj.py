import json,numpy as np,sys
name=sys.argv[1]; stab=sys.argv[2]
P=json.load(open(f'pose_{name}.json')); H={int(k):np.array(v) for k,v in json.load(open(f'stab_{stab}.json')).items()}
def tr(n,x,y):
    p=H[n]@np.array([x,y,1.0]); return p[:2]/p[2]
rows=[]
for k in sorted(P,key=int):
    n=int(k); po=P[k]['pose']
    if not po or n not in H: continue
    L=lambda i: tr(n,po[i][0],po[i][1])
    hip=(L(23)+L(24))/2; sh=(L(11)+L(12))/2; nose=L(0)
    rows.append((n,hip,sh,nose,L(27),L(28),L(25),L(26),L(15),L(16)))
print(' n    hipx  hipy   shx   shy  lAnkx lAnky rAnkx rAnky   dhip(px/fr)')
prev=None
for r in rows:
    n,hip,sh,nose,la,ra,lk,rk,lw,rw=r
    v='' if prev is None else f'{hip[0]-prev[0]:6.1f} {hip[1]-prev[1]:6.1f}'
    print(f'{n:3d} {hip[0]:6.1f} {hip[1]:6.1f} {sh[0]:6.1f} {sh[1]:6.1f} {la[0]:6.1f} {la[1]:6.1f} {ra[0]:6.1f} {ra[1]:6.1f}  {v}')
    prev=hip
json.dump([[r[0]]+[list(map(float,x)) for x in r[1:]] for r in rows],open(f'traj_{name}.json','w'))
