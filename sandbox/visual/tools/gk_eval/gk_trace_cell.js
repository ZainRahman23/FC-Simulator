#!/usr/bin/env node
// TRACE ONE CONTROLLED SHOT (deterministic): same launch construction as gk_envelope.js, full per-tick ball /
// keeper / hand trace + events, for review diagrams (gk_trace_render.py). Several cells per run.
// Usage: node gk_trace_cell.js --out traces.json --cells '[{"id":"lob catch","profile":"GOOD","y":34,"z":1.3,"speed":11,"dist":12,"target":"line"}, …]'
//   cell keys: id, profile (name or json), dist, y, z, target line|plane, flight|speed, family STRAIGHT|INSIDE_R, spin
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","gk_traces.json");
const CELLS=JSON.parse(opt("--cells","[]"));
const PROFILES={ K1:{reflexes:45,diving:45,handling:45,jumping:48,positioning:72,acceleration:68,speed:62,strength:72,height:183,weight:80},
  K3:{reflexes:92,diving:92,handling:92,jumping:92,positioning:72,acceleration:68,speed:62,strength:72,height:197,weight:88},
  POOR:{reflexes:42,diving:40,handling:41,jumping:44,positioning:46,acceleration:52,speed:50,strength:55,height:183,weight:80},
  GOOD:{reflexes:71,diving:68,handling:70,jumping:68,positioning:71,acceleration:64,speed:60,strength:70,height:188,weight:84},
  ELITE:{reflexes:91,diving:92,handling:90,jumping:88,positioning:90,acceleration:74,speed:69,strength:80,height:193,weight:88} };
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-trace-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox"],protocolTimeout:3600000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; await new Promise(r=>setTimeout(r,100)); }
 const data=await p.evaluate((CELLS,PROFILES)=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt, M=GK_MOUTH;
   function applyProfile(P){ t.gkCap="manual"; t.gkReflex=P.reflexes; t.gkDiving=P.diving; t.gkHandling=P.handling; t.gkJump=P.jumping; t.gkHeight=P.height;
     t.gkPos=P.positioning; t.gkAccel=P.acceleration; t.gkSpeed=P.speed; t.gkStrength=P.strength; t.gkWeight=P.weight;
     t.gkMovePolicy="M6"; t.gkPosQ="Q25"; t.gkHand="H4"; t.gkSelect=undefined; t.gkMomentum="SET"; t.gkScenario=null; t.gkStudy=null; t.paused=false; t.pauseAtContact=false;
     GK_POSMODEL.active="NEW"; GK_SETDEPTH.active="D2"; }
   function fly(x0,y0,z0,vx,vy,vz,curve,TX){ const keep=t.gk; t.gk=null; t.now=0; t.kick=null; t.net=null;
     t.b={x:x0,y:y0,z:z0,vx,vy,vz,ctrl:false,exclT:5,curve:curve?{s:curve.s,sgn:curve.sgn}:null}; let prev=null,c=null; const prof=[];
     for(let i=0;i<220;i++){ prev={x:t.b.x,y:t.b.y,z:t.b.z,t:t.now}; ptStep(); prof.push([+t.b.x.toFixed(3),+t.b.y.toFixed(3),+t.b.z.toFixed(3),+t.now.toFixed(4)]);
       if(!c&&prev.x<TX&&t.b.x>=TX){ const f=(TX-prev.x)/((t.b.x-prev.x)||1e-9); c={t:prev.t+f*PT_DT,y:prev.y+f*(t.b.y-prev.y),z:prev.z+f*(t.b.z-prev.z)}; }
       if(t.b.x>M.lineX+1.5||t.now>3.5) break; } t.gk=keep; return {c,prof}; }
   function solve(cell,x0,y0,z0,TX,curve){
     const mk=(v0,th,ph)=>[v0*Math.cos(ph)*Math.cos(th),v0*Math.cos(ph)*Math.sin(th),v0*Math.sin(ph)];
     function solveTheta(v0,seed){ let th=Math.atan2(cell.y-y0,TX-x0), ph=Math.atan2(cell.z-z0+0.5*9.81*Math.pow((TX-x0)/v0,2),TX-x0); let best=null;
       if(seed){th=seed.th;ph=seed.ph;} else { let bs=null; for(let k=0;k<=45;k++){ const pp=-0.06+k*1.01/45; const c=fly(x0,y0,z0,...mk(v0,th,pp),curve,TX).c; if(!c||(c.z<0.02&&cell.z>0.25))continue; const e=Math.abs(c.z-cell.z); if(!bs||e<bs.e)bs={pp,e}; } if(bs)ph=bs.pp;
         if(curve){ let bt=null; for(let k=0;k<=40;k++){ const tt=-0.55+k*1.1/40; const c=fly(x0,y0,z0,...mk(v0,tt,ph),curve,TX).c; if(!c)continue; const e=Math.abs(c.y-cell.y); if(!bt||e<bt.e)bt={tt,e}; } if(bt)th=bt.tt; } }
       for(let it=0;it<30;it++){ const L=mk(v0,th,ph); const c=fly(x0,y0,z0,L[0],L[1],L[2],curve,TX).c; if(!c){ph+=0.03;continue;} const ey=c.y-cell.y,ez=c.z-cell.z,err=Math.hypot(ey,ez); if(!best||err<best.err)best={th,ph,c,err,L}; if(err<0.004)break;
         const h=1e-3; const c1=fly(x0,y0,z0,...mk(v0,th+h,ph),curve,TX).c, c2=fly(x0,y0,z0,...mk(v0,th,ph+h),curve,TX).c; if(!c1||!c2)break; const J=[[(c1.y-c.y)/h,(c2.y-c.y)/h],[(c1.z-c.z)/h,(c2.z-c.z)/h]]; const det=J[0][0]*J[1][1]-J[0][1]*J[1][0]; if(Math.abs(det)<1e-9)break;
         th+=Math.max(-0.12,Math.min(0.12,-(J[1][1]*ey-J[0][1]*ez)/det)); ph+=Math.max(-0.12,Math.min(0.12,-(-J[1][0]*ey+J[0][0]*ez)/det)); } return best; }
     if(cell.speed!=null){ const s=solveTheta(cell.speed,null); return s?{...s,v0:cell.speed}:null; }
     let v=(TX-x0)/cell.flight*1.12, best=null, seed=null;
     for(let it=0;it<9;it++){ let s=solveTheta(v,seed); if(s&&s.err>0.05&&seed) s=solveTheta(v,null); if(!s){v*=1.12;seed=null;continue;} seed=s.err<=0.05?{th:s.th,ph:s.ph}:null;
       const score=Math.abs(s.c.t-cell.flight)+(s.err>0.05?1:0); if(!best||score<best.score) best={...s,v0:v,score}; if(Math.abs(s.c.t-cell.flight)<0.004&&s.err<=0.05)break; v=v*Math.pow(s.c.t/cell.flight,0.9); }
     return best; }
   const out=[];
   for(const cell of CELLS){
     const P=typeof cell.profile==="string"?(PROFILES[cell.profile]||JSON.parse(cell.profile)):cell.profile; ptReset(); applyProfile(P);
     const dist=cell.dist||19.5, x0=M.lineX-dist, y0=M.centerY, z0=GOALFX.ballR, curve=cell.family==="INSIDE_R"?{s:cell.spin||4.17,sgn:1}:null;
     t.gk=ptGkMake(); t.gk.height=t.gkHeight/100; const q=gkNorm01(t.gkPos); const set=gkPosition(t,x0,y0,q); const TX=cell.target==="plane"?set[0]:M.lineX;
     const L=solve(cell,x0,y0,z0,TX,curve); if(!L){ out.push({id:cell.id,fail:true}); continue; }
     const ref=fly(x0,y0,z0,L.L[0],L.L[1],L.L[2],curve,TX);
     // keeper-ON trace
     ptReset(); applyProfile(P); t.now=0; t.kick=null; t.shoot=null; t.net=null; t.last="";
     t.p={x:x0,y:y0,vx:0,vy:0,facing:0,touchT:0}; t.b={x:x0,y:y0,z:z0,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
     for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
     t.gk=ptGkMake(); t.gk.height=t.gkHeight/100; t.gk.handZ=t.gk.height*GK_CFG.handReachFrac; t.gk.x=set[0]; t.gk.y=set[1]; t.gk.vx=0; t.gk.vy=0;
     t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk.shotT0=null; t.gk._prevKicked=false;
     t.b.ctrl=false; t.b.exclT=5; t.b.curve=curve?{s:curve.s,sgn:curve.sgn}:null; t.b.vx=L.L[0]; t.b.vy=L.L[1]; t.b.vz=L.L[2];
     t.kick={t0:0,kickAt:0,end:0.3,kicked:true,noAnim:true,fam:"SYNTH",v0:L.v0,vz:L.L[2],dir:Math.atan2(L.L[1],L.L[0]),tech:"LACES",foot:"R",label:"TRACE",charge:null,tgtD:null};
     const tr=[], ev=[]; let nC=0, prevFH=null, goalT=null, commit=null, prep=null;
     for(let i=0;i<300;i++){ ptStep(); const gk=t.gk,b=t.b; const hn=gk.handNow||[gk.x,gk.y,gk.handZ];
       tr.push([+t.now.toFixed(4),+b.x.toFixed(3),+b.y.toFixed(3),+b.z.toFixed(3),+gk.x.toFixed(3),+gk.y.toFixed(3),gk.phase||"-",gk.committed?1:0,gk.prepared?1:0,+hn[0].toFixed(3),+hn[1].toFixed(3),+hn[2].toFixed(3)]);
       if(!prep&&gk.prepared) prep={t:+t.now.toFixed(3),tgt:gk.prepTarget?gk.prepTarget.slice():null};
       if(!commit&&gk.committed){ const c=gk.committed; commit={t:+t.now.toFixed(3),tier:c.tier,action:c.action,execT:+c.execTime.toFixed(3),target:c.target.map(v=>+v.toFixed(3)),feet:c.feet.map(v=>+v.toFixed(3)),norm:c.envNorm}; ev.push({t:commit.t,e:"COMMIT "+(c.action||c.tier)}); }
       if(gk.contacts&&gk.contacts.length>nC){ const c=gk.contacts[gk.contacts.length-1]; nC=gk.contacts.length; ev.push({t:+t.now.toFixed(3),e:"KEEPER "+c.volume+" "+c.outcome,pt:c.point,q:c.q?{catch:c.q.catchScore,thr:c.q.catchThresh,ctrl:c.q.controlScore,sRel:c.q.sRel,norm:c.q.norm,two:c.q.two,align:c.q.cAlign}:null}); }
       if(b.frameHit&&b.frameHit!==prevFH){ prevFH=b.frameHit; ev.push({t:+t.now.toFixed(3),e:"FRAME "+b.frameHit.cap}); }
       if(t.last==="GOAL!"&&!goalT){ goalT=+t.now.toFixed(3); ev.push({t:goalT,e:"GOAL"}); }
       if(b.held&&t.now>(gk.lastContactT||0)+0.4) break; if(b.x>107||(goalT&&t.now>goalT+0.4)||t.now>4.5) break; }
     out.push({id:cell.id,cell,profile:P,set:[+set[0].toFixed(3),+set[1].toFixed(3)],launch:{v0:+L.v0.toFixed(2),flightToTarget:+L.c.t.toFixed(3),err:+L.err.toFixed(4)},prof:ref.prof,tr,ev,prep,commit,
       env:(function(){ const e=gkEnvelope(t,t.gk,t.gk.height); return {comfortZ:+e.comfortZ.toFixed(3),maxLat:+e.maxLat.toFixed(3),maxVertUp:+e.maxVertUp.toFixed(3),maxVertDown:+e.maxVertDown.toFixed(3),highReachZ:+e.highReachZ.toFixed(3),handZ:+t.gk.handZ.toFixed(3)}; })(),
       outcome:(function(){ const c=t.gk.contacts&&t.gk.contacts[0]; return {contact:c?c.outcome:null,surface:c?c.surface:null,held:!!(c&&c.held),goal:!!goalT}; })()});
   }
   return out;
 },CELLS,PROFILES);
 fs.writeFileSync(OUT,JSON.stringify(data));
 for(const r of data) console.log(r.fail?`${r.id}: FAILED`:`${r.id}: ${r.outcome.contact||"no contact"} goal=${r.outcome.goal} | ${r.ev.map(e=>e.t+" "+e.e).join(" · ")}`);
 console.log("page errors",errs.slice(0,3)); await b.close();
})();
