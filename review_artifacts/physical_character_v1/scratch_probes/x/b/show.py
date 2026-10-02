import json,sys; d=json.load(open(sys.argv[1])); every=int(sys.argv[2]) if len(sys.argv)>2 else 6
for r in d['rows']:
  s=r['swing']; f=lambda x: 'None' if x is None else (f'{x:.3f}' if isinstance(x,float) else str(x))
  print(r['case'].get('id'), 'lift',f(s['liftReal']),'td',f(s['tdReal']),'uAt',f(s['uAtView']),'lag',f(s['lagMax']),'lead',f(s['leadMax']),'minClr',f(s['minClr']),'recon',len(s['recons']),'trip',s['trip'],'err',[round(x,3) for x in r['land']['err']] if r['land'].get('err') else None,'after',r['after'],'T',f(r['dec']['T']), 'vTd', [round(x,2) for x in s['footVTd']] if s['footVTd'] else None)
  if every>0 and 'profile' in r:
    for row in r['profile'][::every]: print('   ', ' '.join(f'{x:7.3f}' if isinstance(x,(int,float)) and x is not None else str(x) for x in row))
