#!/usr/bin/env node
// REBOUND-CHAIN SCENARIOS (deterministic). Synthetic launches + placed keeper that exercise multi-contact
// sequences (keeper → post → goal, crossbar → keeper → goal, fingertip → bar → keeper → goal …) and a
// tunnelling detector: every tick the ball is tested for geometric overlap with the goal frame and with the
// keeper's volumes; an overlap that produced no registered event is a SKIPPED collision.
// Usage: node gk_rebound_chains.js [--url ...] [--out chains.json] [--search]  (--search scans launch families to find each chain)
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","gk_rebound_chains.json"); const SEARCH=args.includes("--search");
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-chain-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox"],protocolTimeout:3600000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; await new Promise(r=>setTimeout(r,100)); }
 const data=await p.evaluate((SEARCH)=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt, M=GK_MOUTH;
   // one scenario: keeper placed at (kx,ky) with a chosen reflex (latency) and optional "no reaction" (statue) mode,
   // ball launched from p with velocity v; returns the ordered event list + tunnelling checks
   function run(sc){
     ptReset(); t.gkCap="manual"; t.gkReflex=sc.reflex!=null?sc.reflex:60; t.gkDiving=60; t.gkHandling=sc.handling!=null?sc.handling:60; t.gkJump=60; t.gkHeight=188; t.gkPos=70;
     GK_POSMODEL.active="NEW"; GK_SETDEPTH.active="D2"; t.gkMovePolicy="M6"; t.gkHand="H4";
     t.now=0; t.kick=null; t.shoot=null; t.net=null; t.last="";
     t.p={x:sc.p[0],y:sc.p[1],vx:0,vy:0,facing:0,touchT:0}; t.b={x:sc.p[0],y:sc.p[1],z:sc.p[2],vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
     for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
     t.gk=ptGkMake(); t.gk.height=1.88; t.gk.handZ=1.88*GK_CFG.handReachFrac; t.gk.x=sc.k[0]; t.gk.y=sc.k[1]; t.gk.vx=0; t.gk.vy=0;
     t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk.shotT0=null; t.gk._prevKicked=false;
     t.b.ctrl=false; t.b.exclT=t.now+5; t.b.vx=sc.v[0]; t.b.vy=sc.v[1]; t.b.vz=sc.v[2];
     t.kick={t0:0,kickAt:0,end:0.3,kicked:true,noAnim:true,fam:"SYNTH",v0:Math.hypot(...sc.v),vz:sc.v[2],dir:Math.atan2(sc.v[1],sc.v[0]),tech:"LACES",foot:"R",label:"CHAIN",charge:null,tgtD:null};
     if(sc.statue){ /* a keeper who cannot react: passive block only */ t.gkReflex=20; }
     const ev=[]; let prevFH=null, nCont=0, goalT=null, skipped=[]; const R=GOALFX.frameR+GOALFX.ballR; let prevB=null, groundB=0, lastGoalLabel=false;
     for(let i=0;i<360;i++){ prevB={x:t.b.x,y:t.b.y,z:t.b.z,vz:t.b.vz}; ptStep(); const b=t.b, gk=t.gk;
       if(b.frameHit&&b.frameHit!==prevFH){ prevFH=b.frameHit; ev.push({t:+t.now.toFixed(3),e:"FRAME:"+b.frameHit.cap,vIn:+Math.hypot(...b.frameHit.vIn).toFixed(1),vOut:+Math.hypot(...b.frameHit.vOut).toFixed(1)}); }
       if(gk.contacts&&gk.contacts.length>nCont){ const c=gk.contacts[gk.contacts.length-1]; nCont=gk.contacts.length; ev.push({t:+t.now.toFixed(3),e:"KEEPER:"+c.volume+"/"+c.outcome,vIn:+Math.hypot(...c.vIn).toFixed(1),vOut:c.speedOut,pt:c.point}); }
       if(prevB.vz<0&&b.vz>0&&b.z<0.2){ groundB++; ev.push({t:+t.now.toFixed(3),e:"GROUND"}); }
       if(t.last==="GOAL!"&&!lastGoalLabel){ lastGoalLabel=true; goalT=+t.now.toFixed(3); ev.push({t:goalT,e:"GOAL"}); }
       // tunnelling detector: overlap with a frame capsule without a frame event this tick
       if(GOALFX.collision){ for(const cap of GOAL_CAPSULES){ const A=cap.A,B=cap.B; const ab=[B[0]-A[0],B[1]-A[1],B[2]-A[2]]; const ap=[b.x-A[0],b.y-A[1],b.z-A[2]];
           const L2=ab[0]*ab[0]+ab[1]*ab[1]+ab[2]*ab[2]; const u=Math.max(0,Math.min(1,(ap[0]*ab[0]+ap[1]*ab[1]+ap[2]*ab[2])/(L2||1e-9)));
           const q=[A[0]+ab[0]*u,A[1]+ab[1]*u,A[2]+ab[2]*u]; const d=Math.hypot(b.x-q[0],b.y-q[1],b.z-q[2]);
           if(d<R-0.01&&!(b.frameHit&&Math.abs(b.frameHit.t-t.now)<1e-6)) skipped.push({t:+t.now.toFixed(3),what:"inside frame "+cap.name,d:+d.toFixed(3)}); } }
       // keeper-volume overlap without a contact this tick (only while the ball is not held)
       if(!b.held&&gk.handNow&&(!gk.lastContactT||t.now-gk.lastContactT>0.05)){ const hr=(GK_HAND[t.gkHand]||0.045)+GOALFX.ballR; const dh=Math.hypot(b.x-gk.handNow[0],b.y-gk.handNow[1],b.z-gk.handNow[2]);
           const H=gk.height, zc=Math.max(GK_BODY.hipFrac*H,Math.min(GK_BODY.shoulderFrac*H,b.z)); const dT=Math.hypot(b.x-gk.x,b.y-gk.y,b.z-zc);
           if(dh<hr-0.02) skipped.push({t:+t.now.toFixed(3),what:"inside HAND",d:+dh.toFixed(3)}); if(dT<GK_BODY.torsoR+GOALFX.ballR-0.02) skipped.push({t:+t.now.toFixed(3),what:"inside TORSO",d:+dT.toFixed(3)}); }
       if(b.held&&t.now>(gk.lastContactT||0)+0.3) break; if(b.x>108||b.x<80||t.now>5.5) break; if(goalT&&t.now>goalT+0.6) break; }
     return {ev,goal:!!goalT,skipped:skipped.slice(0,6),nSkipped:skipped.length,contacts:nCont,end:[+t.b.x.toFixed(2),+t.b.y.toFixed(2),+t.b.z.toFixed(2)]};
   }
   const chainOf=(ev)=>ev.map(e=>e.e.replace(/:.*\/(.*)/,":$1").replace("KEEPER:","GK:")).join(" -> ");
   // hand-authored fixtures (searched then frozen): each is a placed keeper + synthetic launch
   const FIX=[
     {name:"post -> keeper -> goal (statue keeper on the far side)", p:[97,31.0,0.4], v:[22,1.55,2.2], k:[104.4,33.2], statue:true},
     {name:"crossbar -> keeper back/body -> goal", p:[98.5,34,1.4], v:[19,0,6.1], k:[104.2,34.0], statue:true},
     {name:"keeper parry -> post -> goal", p:[93,35.2,0.9], v:[24,0.35,1.3], k:[103.1,34.0], reflex:80, handling:35},
     {name:"keeper parry -> post -> out", p:[93,36.4,0.9], v:[24,0.10,1.3], k:[103.1,34.0], reflex:80, handling:35},
     {name:"fingertip -> crossbar -> out", p:[92,34.9,1.1], v:[26,0.0,4.2], k:[102.6,34.0], reflex:75, handling:45},
     {name:"fingertip -> crossbar -> keeper -> goal", p:[92,34.4,1.1], v:[25,0.0,4.05], k:[102.4,34.0], reflex:75, handling:45},
     {name:"keeper -> ground -> goal (weak parry drops in)", p:[95,34.6,0.5], v:[27,0.1,1.9], k:[103.2,34.0], reflex:80, handling:25},
     {name:"keeper -> ground -> post -> out", p:[95,35.6,0.5], v:[27,0.1,1.9], k:[103.2,34.0], reflex:80, handling:25},
   ];
   const results=FIX.map(sc=>{ const r=run(sc); return {name:sc.name,fixture:{p:sc.p,v:sc.v,k:sc.k,statue:!!sc.statue,reflex:sc.reflex,handling:sc.handling},chain:chainOf(r.ev),events:r.ev,goal:r.goal,contacts:r.contacts,nSkipped:r.nSkipped,skipped:r.skipped}; });
   let search=null;
   if(SEARCH){ search={};
     // SOLVER-AIMED search: launch from p so the ball crosses x=105 at (yT,zT) with speed v0 (free flight, keeper inert),
     // then run with the keeper placed at k; scan the target around the posts/bar and the keeper placement
     function launchTo(p,yT,zT,v0){ const keep=t.gk; let best=null;
       const fly=(th,ph)=>{ t.gk=null; t.now=0; t.kick=null; t.net=null; t.b={x:p[0],y:p[1],z:p[2],vx:v0*Math.cos(ph)*Math.cos(th),vy:v0*Math.cos(ph)*Math.sin(th),vz:v0*Math.sin(ph),ctrl:false,exclT:0,curve:null};
         const save=GOALFX.collision; GOALFX.collision=false; let prev=null,c=null;
         for(let i=0;i<200;i++){ prev={x:t.b.x,y:t.b.y,z:t.b.z}; ptStep(); if(prev.x<105&&t.b.x>=105){ const f=(105-prev.x)/(t.b.x-prev.x); c={y:prev.y+f*(t.b.y-prev.y),z:prev.z+f*(t.b.z-prev.z)}; break; } if(t.b.x>107) break; }
         GOALFX.collision=save; return c; };
       let th=Math.atan2(yT-p[1],105-p[0]), ph=Math.atan2(zT-p[2]+0.5*9.81*Math.pow((105-p[0])/v0,2),105-p[0]);
       for(let it=0;it<25;it++){ const c=fly(th,ph); if(!c) break; const ey=c.y-yT, ez=c.z-zT, err=Math.hypot(ey,ez); if(!best||err<best.err) best={th,ph,err};
         if(err<0.005) break; const h=1e-3; const c1=fly(th+h,ph), c2=fly(th,ph+h); if(!c1||!c2) break;
         const J=[[(c1.y-c.y)/h,(c2.y-c.y)/h],[(c1.z-c.z)/h,(c2.z-c.z)/h]]; const det=J[0][0]*J[1][1]-J[0][1]*J[1][0]; if(Math.abs(det)<1e-9) break;
         th+=Math.max(-0.1,Math.min(0.1,-(J[1][1]*ey-J[0][1]*ez)/det)); ph+=Math.max(-0.1,Math.min(0.1,-(-J[1][0]*ey+J[0][0]*ez)/det)); }
       t.gk=keep; if(!best) return null; return [v0*Math.cos(best.ph)*Math.cos(best.th),v0*Math.cos(best.ph)*Math.sin(best.th),v0*Math.sin(best.ph)]; }
     const K=(xs,ys)=>{ const o=[]; for(const x of xs) for(const y of ys) o.push([x,y]); return o; };
     const FAMS=[
       {name:"post -> keeper -> goal", p:[97,31.5,0.3], v0:24, yT:[37.40,37.46,37.52], zT:[0.5,1.0,1.5], k:K([104.2,104.5,104.8],[34.6,35.0,35.4,35.8,36.2,36.6]), statue:true},
       {name:"crossbar -> keeper back/body -> goal", p:[96,34,0.3], v0:23, yT:[33.6,34,34.4], zT:[2.30,2.34,2.38,2.41], k:[[104.6,34],[104.3,34],[104.0,34]], statue:true},
       {name:"crossbar -> keeper -> out / over", p:[96,34,0.3], v0:23, yT:[34], zT:[2.36,2.40,2.43], k:[[103.6,34],[103.3,34]], statue:true},
       {name:"keeper parry -> post -> goal/out", p:[93,34.6,0.3], v0:22, yT:[35.8,36.2,36.6,37.0], zT:[0.5,0.9,1.3], k:K([102.8,103.3,103.8],[34,34.6]), reflex:88, handling:25},
       {name:"fingertip -> crossbar -> keeper / out", p:[92,34.2,0.3], v0:27, yT:[34,34.6], zT:[2.30,2.38,2.44], k:[[102.4,34],[103.0,34],[103.6,34]], reflex:85, handling:35},
       {name:"keeper -> ground -> goal / post", p:[95,34.6,0.3], v0:20, yT:[34.8,35.2,35.6,36.4,37.0], zT:[0.3,0.6], k:[[103.2,34],[103.8,34]], reflex:88, handling:22},
     ];
     for(const F of FAMS){ const found=[]; for(const yT of F.yT) for(const zT of F.zT){ const v=launchTo(F.p,yT,zT,F.v0); if(!v) continue;
         for(const k of F.k){ const r=run({p:F.p,v,k,statue:F.statue,reflex:F.reflex,handling:F.handling}); found.push({yT,zT,k,v:v.map(x=>+x.toFixed(3)),chain:chainOf(r.ev),goal:r.goal,contacts:r.contacts,nSkipped:r.nSkipped}); } }
       search[F.name]=found; } }
   return {results,search,frozen:{reContactExcl:GK_DIVE.reContactExcl,reContactMinGap:GK_DIVE.reContactMinGap}};
 },SEARCH);
 fs.writeFileSync(OUT,JSON.stringify(data,null,1));
 for(const r of data.results) console.log(`${r.name.padEnd(52)} | ${r.chain} | goal=${r.goal} contacts=${r.contacts} skipped=${r.nSkipped}${r.nSkipped?" "+JSON.stringify(r.skipped.slice(0,2)):""}`);
 if(data.search){ for(const k of Object.keys(data.search)){ const uniq={}; let sk=0; for(const f of data.search[k]){ uniq[f.chain]=(uniq[f.chain]||0)+1; sk+=f.nSkipped; }
   console.log("\nSEARCH "+k+"   (skipped collisions over the family: "+sk+")"); for(const c of Object.keys(uniq).sort((a,b)=>uniq[b]-uniq[a])) console.log("   "+String(uniq[c]).padStart(3)+" x  "+c);
   const ex=data.search[k].filter(f=>/FRAME/.test(f.chain)&&/GK:/.test(f.chain)).slice(0,3); for(const f of ex) console.log("      e.g. yT "+f.yT+" zT "+f.zT+" k "+JSON.stringify(f.k)+" v "+JSON.stringify(f.v)+" -> "+f.chain); } }
 console.log("page errors",errs.slice(0,3)); await b.close();
})();
