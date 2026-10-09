// usage: run from a directory containing presdiag/procOnly/<case>_LOCO.json.gz (the moving-handoff investigation exports)
// law stance-foot world drift (procOnly presentation = shared law + lean/roll/twist; and the simulation's own simBody foot)
const zlib=require("zlib"),fs=require("fs");
for (const cs of process.argv.slice(2)) { const R=JSON.parse(zlib.gunzipSync(fs.readFileSync(`presdiag/procOnly/${cs}_LOCO.json.gz`)));
  const idx=Object.fromEntries(R.bones.map((b,i)=>[b.name,i])), pos=(m)=>[m[12],m[13],m[14]];
  const out={R:[],L:[]}; let cur={R:null,L:null};
  for (let k=1;k<R.pres.length;k++){ const dg=R.pres[k].dg; if(!dg||!dg.legs) continue; const v=Math.hypot(R.rows[k][10],R.rows[k][11]);
    for (const sd of ["R","L"]) { const lg=dg.legs[sd], a=pos(R.pres[k].world[idx["foot_"+sd]]), t=pos(R.pres[k].world[idx["toe_"+sd]]);
      const sb=R.simBody[k]&&R.simBody[k][3]; const sa=sb?sb.segs.find(g=>g.name==="foot_"+sd).a:null;
      if (lg.st) { if(!cur[sd]) cur[sd]={k0:k,s0:lg.s,a0:a,t0:t,sa0:sa,v,maxDev:0}; cur[sd].k1=k; cur[sd].s1=lg.s; cur[sd].a1=a; cur[sd].t1=t; cur[sd].sa1=sa; }
      else if (cur[sd]) { const c=cur[sd]; const hd=(p,q)=>Math.hypot(p[0]-q[0],p[2]-q[2]); const hs=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
        out[sd].push({k0:c.k0,k1:c.k1,s:[+c.s0.toFixed(2),+c.s1.toFixed(2)],v:+c.v.toFixed(2),ankleDriftMm:+(hd(c.a0,c.a1)*1000).toFixed(0),toeDriftMm:+(hd(c.t0,c.t1)*1000).toFixed(0),simAnkleDriftMm:c.sa0?+(hs(c.sa0,c.sa1)*1000).toFixed(0):null,
          signedFwdMm:+(((c.a1[0]-c.a0[0])*Math.cos(0)+0)*1000).toFixed(0)}); cur[sd]=null; } } }
  console.log(cs, "rigLegLen", R.rigLegLen, "legLen", R.legLen, JSON.stringify(out)); }
