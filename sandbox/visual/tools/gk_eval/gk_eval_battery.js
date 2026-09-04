#!/usr/bin/env node
// GOALKEEPER V1 EVALUATION BATTERY — deterministic, reusable regression/measurement tool.
//
// Fires REAL production shots (same charge-launch path as play) from a matrix of shooter positions,
// techniques, charges and aims at the JS keeper, once keeper-OFF (untouched crossing = bin coordinate)
// and once keeper-ON, and records contact / Stage-4 outcome / goal for each shot. Reports CONTACT RATE,
// SAVE RATE GIVEN CONTACT and TOTAL SAVE RATE separately, per technique, band and goal-face cell, and
// writes per-shot JSON for the renderer (gk_eval_render.py). Never tune against this corpus while
// generating it: it is a measurement, not an objective.
//
// Usage:  node sandbox/visual/tools/gk_eval/gk_eval_battery.js [--url http://127.0.0.1:8124/sandbox/visual/match.html]
//              [--out gk_eval.json] [--bands K1,K2,K3] [--quick] [--momentum SET,TOWARD,AWAY] [--select S2]
// Needs: the preview server (python3 sandbox/visual/serve_match.py, engine on :8000) and puppeteer-core with
// Google Chrome (npm i puppeteer-core in a scratch dir; set PUPPETEER_NODE_MODULES to its node_modules).
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8124/sandbox/visual/match.html"); const OUT=opt("--out","gk_eval.json");
const BANDS=opt("--bands","K1").split(","); const QUICK=args.includes("--quick"); const MOM=opt("--momentum","SET").split(","); const SEL=opt("--select",null);
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 // unique Chrome profile per run (parallel runs / stale profiles never collide); the OS temp dir may be read-only in sandboxes,
 // so default to the working directory (override with GK_EVAL_PROFILE_DIR)
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-eval-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox"]});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; if(i===899) throw new Error("page never became ready (assets/engine)"); await new Promise(r=>setTimeout(r,100)); }
 await new Promise(r=>setTimeout(r,300));
 const data=await p.evaluate((CFG)=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset();
   const t=S.pt, M=GK_MOUTH;
   function applyBand(band){ const c=GK_CAP[band]; t.gkCap=band; t.gkReflex=c.reflex;t.gkDiving=c.diving;t.gkHeight=c.height;t.gkJump=c.jump; if(c.handling!=null)t.gkHandling=c.handling;
     t.gkMovePolicy="M6"; t.gkPosQ="Q25"; t.gkHand="H4"; t.gkPosCand="P4"; t.gkDepth=GK_DEPTH_CANDS.P4; t.gkPos=72; if(CFG.select) t.gkSelect=CFG.select; t.paused=false; t.pauseAtContact=false; }
   function fire(sh,collide){
     applyBand(sh.band); t.now=0; t.net=null; t.kick=null; t.charge=null; t.shoot=null; t.gkScenario=null; t.gkStudy=null; t.tgtOverride=null; t.last=""; t.gkMomentum=sh.mom||"SET";
     GK_COLLIDE=collide;
     const SX=sh.ox, SY=sh.oy; t.p={x:SX,y:SY,vx:0,vy:0,facing:Math.atan2(sh.aimY-SY,105-SX),touchT:0};
     t.b={x:SX,y:SY,z:0.06,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
     t.gk=ptGkMake(); const q=gkNorm01(72); const kset=gkPosition(t,SX,SY,q);
     t.gk.x=kset[0]; t.gk.y=kset[1]; t.gk.vx=0; t.gk.vy=0; t.gk.height=t.gkHeight/100; t.gk.handZ=t.gk.height*GK_CFG.handReachFrac;
     t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk._prevKicked=false;
     for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
     const map=GK_TECH_FAM[sh.tech]||GK_TECH_FAM.LACES; const tgtDist=Math.hypot(105-SX,sh.aimY-SY);
     ptKick(map.fam,"EVAL "+sh.tech,map.D,{tech:sh.tech,foot:"R"},{c:sh.charge,holdMs:0},sh.tech==="INSIDE"?tgtDist:undefined);
     let shotT=null,prev=null,line=null,plane=null,ct=null,ctk=null,goal=false,commit=null,launch=null,minSep=1e9;
     for(let s=0;s<320;s++){ ptStep(); const bl=t.b, gk=t.gk;
       if(shotT===null&&t.kick&&t.kick.kicked){ shotT=t.now; launch={v0:+Math.hypot(bl.vx,bl.vy).toFixed(2),vz:+bl.vz.toFixed(2)}; }
       if(shotT!=null){
         if(prev&&prev.x<M.lineX&&bl.x>=M.lineX&&!line){ const f=(M.lineX-prev.x)/(bl.x-prev.x); line={y:+(prev.y+(bl.y-prev.y)*f).toFixed(3),z:+(prev.z+(bl.z-prev.z)*f).toFixed(3),t:+(t.now-shotT-(1-f)*PT_DT).toFixed(3),afterContact:!!ct}; }
         if(prev&&prev.x<kset[0]&&bl.x>=kset[0]&&!plane){ const f=(kset[0]-prev.x)/(bl.x-prev.x); plane={y:+(prev.y+(bl.y-prev.y)*f).toFixed(3),z:+(prev.z+(bl.z-prev.z)*f).toFixed(3),t:+(t.now-shotT-(1-f)*PT_DT).toFixed(3)}; }
         if(gk.handNow&&!ct){ const sep=Math.hypot(bl.x-gk.handNow[0],bl.y-gk.handNow[1],bl.z-gk.handNow[2]); if(sep<minSep)minSep=sep; }
         if(!commit&&gk.committed) commit={t:+(t.now-shotT).toFixed(3),tier:gk.committed.tier,norm:gk.committed.envNorm,depth:+(gk.committed.target[0]-kset[0]).toFixed(2)};
         if(!ct&&gk.contacted){ const c=gk.contact; ct={t:+(t.now-shotT).toFixed(3),surface:c.surface,outcome:c.outcome||null,held:!!c.held,point:c.point,norm:c.q?c.q.norm:null,speedIn:+Math.hypot(...c.vIn).toFixed(2),speedOut:c.speedOut!=null?c.speedOut:+Math.hypot(...c.vOut).toFixed(2)}; ctk=s; }
         if(t.last==="GOAL!") goal=true; }
       prev={x:bl.x,y:bl.y,z:bl.z};
       if(bl.held){ if(s>ctk+20)break; } else if(bl.x>=106.5||bl.x<70||(bl.z<=0.02&&Math.abs(bl.vx)<0.25&&t.now>0.6)||(ct&&s>ctk+200)) break; }
     const inMouth=!!(line&&line.y>M.postA&&line.y<M.postB&&line.z<2.44&&line.z>=0);
     return {launch,line,plane,inMouth,goal,commit,contact:ct,minSep:+minSep.toFixed(3),keeper:[+kset[0].toFixed(3),+kset[1].toFixed(3)]};
   }
   const origins=CFG.quick?[{name:"top-of-D",ox:85.5,oy:34},{name:"box-edge-left",ox:88.5,oy:28},{name:"close-centre",ox:94,oy:34}]
     :[{name:"top-of-D",ox:85.5,oy:34},{name:"long-centre",ox:81,oy:34},{name:"box-edge-left",ox:88.5,oy:28},{name:"box-edge-right",ox:88.5,oy:40},{name:"close-centre",ox:94,oy:34},{name:"wide-left",ox:91,oy:24},{name:"wide-right",ox:91,oy:44}];
   const techs=["INSIDE","LACES","LACES_POWER","OUTSIDE","CHIP"];
   const charges=CFG.quick?[0.5,0.7,0.9]:[0.45,0.6,0.75,0.85,0.93,1.0];
   const nAim=CFG.quick?9:13; const aims=[]; for(let i=0;i<nAim;i++) aims.push(+(M.postA-0.2+(M.postB+0.2-(M.postA-0.2))*i/(nAim-1)).toFixed(3));
   const shots=[];
   for(const band of CFG.bands) for(const mom of CFG.moms) for(const o of origins) for(const tech of techs) for(const c of charges) for(const ay of aims){
     const sh={band,mom,origin:o.name,ox:o.ox,oy:o.oy,tech,charge:c,aimY:ay};
     const off=fire(sh,false); if(!off.inMouth) { shots.push({...sh,u:off.line,uClass:off.line?(off.line.z>=2.44?"OVER":"WIDE"):"SHORT",valid:false}); continue; }
     const on=fire(sh,true);
     shots.push({...sh,u:off.line,plane:off.plane,valid:true,keeper:on.keeper,launch:on.launch,goal:on.goal,contact:on.contact,commit:on.commit,minSep:on.minSep,lineOn:on.line});
   }
   return {meta:{url:location.href,cfg:{select:t.gkSelect||(GK_REACH.selectPolicy||null),strictNorm:GK_REACH.selectStrictNorm,backMax:GK_REACH.selectBackMax,envExp:GK_REACH.envExp,comfortFrac:GK_REACH.comfortFrac,execTime:GK_DIVE.execTime,hand:t.gkHand,posQ:t.gkPosQ,move:t.gkMovePolicy},origins,techs,charges,aims,bands:CFG.bands,moms:CFG.moms,postA:M.postA,postB:M.postB},shots};
 },{bands:BANDS,quick:QUICK,moms:MOM,select:SEL});
 data.errs=errs.slice(0,5); data.generated=new Date().toISOString();
 fs.writeFileSync(OUT,JSON.stringify(data));
 const V=data.shots.filter(s=>s.valid); const C=V.filter(s=>s.contact); const SV=V.filter(s=>s.contact&&!s.goal);
 console.log("shots",data.shots.length,"on-target",V.length,"| CONTACT RATE %.1f%%  SAVE|CONTACT %.1f%%  TOTAL SAVE %.1f%%".replace("%.1f%%",(100*C.length/V.length).toFixed(1)+"%").replace("%.1f%%",(100*SV.length/Math.max(1,C.length)).toFixed(1)+"%").replace("%.1f%%",(100*SV.length/V.length).toFixed(1)+"%"));
 for(const band of BANDS) for(const tech of data.meta.techs){ const v=V.filter(s=>s.band===band&&s.tech===tech); if(!v.length) continue; const c=v.filter(s=>s.contact), sv=v.filter(s=>s.contact&&!s.goal);
   console.log("  "+band+" "+tech.padEnd(12)+" on-target "+String(v.length).padStart(4)+"  contact "+(100*c.length/v.length).toFixed(0).padStart(3)+"%  save|contact "+(100*sv.length/Math.max(1,c.length)).toFixed(0).padStart(3)+"%  total save "+(100*sv.length/v.length).toFixed(0).padStart(3)+"%"); }
 console.log("errs:",data.errs); await b.close(); try{ fs.rmSync(udd,{recursive:true,force:true}); }catch(e){}
})();
