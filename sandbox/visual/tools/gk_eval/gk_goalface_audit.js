#!/usr/bin/env node
// GOALKEEPER V1 — GOAL-FACE HEAT-MAP AUDIT (deterministic, production shots only).
//
// A dead-centre shooter at the apex of the penalty arc fires REAL production shots (ptKick: LACES = straight,
// INSIDE = target-solved INSIDE_R) over a dense (aim, charge) sweep. Every shot runs twice: keeper OFF
// (GK_COLLIDE=false — the untouched goal-line crossing and the ball's position at the keeper's SET plane are the
// shot's coordinates) and keeper ON (full reset, production defaults, nothing overridden). Wide/over shots are
// recorded but never counted as saves. Output JSON for gk_goalface_audit_render.py. A measurement — never tune
// against it.
//
// Usage: node gk_goalface_audit.js [--url ...] [--out gf_audit.json] [--families STRAIGHT,INSIDE_R]
//        [--aimN 61] [--aimSpan 3.9] [--chargeN 64] [--cmin 0.10] [--cmax 1.0] [--determinismN 120]
//        [--trace '[{"id":"...","family":"STRAIGHT","aimY":34,"c":0.86}, ...]']
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","gf_audit.json");
const FAMS=opt("--families","STRAIGHT,INSIDE_R").split(","); const AIMN=+opt("--aimN",61), AIMSPAN=+opt("--aimSpan",3.9);
const CN=+opt("--chargeN",64), CMIN=+opt("--cmin",0.10), CMAX=+opt("--cmax",1.0); const DETN=+opt("--determinismN",120);
const TRACE=opt("--trace",null)?JSON.parse(opt("--trace")):null;
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-gfa-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox"],protocolTimeout:7200000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; if(i===899) throw new Error("page never became ready"); await new Promise(r=>setTimeout(r,100)); }
 const t0=Date.now();
 const data=await p.evaluate((CFG)=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt, M=GK_MOUTH;
   // ── production defaults, read (never set) after a plain ptReset
   const defaults={posModel:GK_POSMODEL.active,setDepth:GK_SETDEPTH.active,cap:t.gkCap,reflex:t.gkReflex,diving:t.gkDiving,height:t.gkHeight,jump:t.gkJump,handling:t.gkHandling,
     pol:t.gkMovePolicy,hand:t.gkHand,posQ:t.gkPosQ,select:GK_REACH.selectPolicy,timeFeasible:GK_REACH.selectTimeFeasible,lobRule:GK_REACH.lobTakeLower,
     actionModel:GK_ACTION.model,x3:PT_X3.active,x3k:+ptX3K().toFixed(4),collide:GK_COLLIDE,frameCollision:GOALFX.collision,
     gkAttrs:{...ptGkMake().attrs},reContactExcl:GK_DIVE.reContactExcl,hipFrac:GK_BODY.hipFrac};
   // ── shooter: apex of the penalty arc (penalty spot 11 m from the line, arc radius 9.15 m — the drawn D)
   const PEN_SPOT=11.0, ARC_R=9.15; const SX=M.lineX-(PEN_SPOT+ARC_R), SY=M.centerY;
   const q=gkNorm01(t.gkPos!=null?t.gkPos:ptGkMake().attrs.gk_positioning);
   const SET=gkPosition(t,SX,SY,q);
   const geometry={shooter:[+SX.toFixed(3),SY],distToCentre:+Math.hypot(M.lineX-SX,M.centerY-SY).toFixed(3),distToLine:+(M.lineX-SX).toFixed(3),
     angleToPosts:[+(Math.atan2(M.postA-SY,M.lineX-SX)*180/Math.PI).toFixed(2),+(Math.atan2(M.postB-SY,M.lineX-SX)*180/Math.PI).toFixed(2)],
     aperture:+((Math.atan2(M.postB-SY,M.lineX-SX)-Math.atan2(M.postA-SY,M.lineX-SX))*180/Math.PI).toFixed(2),
     set:[+SET[0].toFixed(3),+SET[1].toFixed(3)],setDepth:+(M.lineX-SET[0]).toFixed(3),posQ:q};
   const env=(function(){ const gk=ptGkMake(); gk.height=t.gkHeight/100; const e=gkEnvelope(t,gk,gk.height); return {comfortZ:+e.comfortZ.toFixed(3),maxLat:+e.maxLat.toFixed(3),maxVertUp:+e.maxVertUp.toFixed(3),maxVertDown:+e.maxVertDown.toFixed(3),highReachZ:+e.highReachZ.toFixed(3),standingReachZ:+e.standingReachZ.toFixed(3),handZ:+(gk.height*GK_CFG.handReachFrac).toFixed(3),latency:+gkReactionLatency(t,gk).toFixed(4)}; })();
   const TECH={STRAIGHT:{tech:"LACES",fam:"DRIVEN",D:20},INSIDE_R:{tech:"INSIDE",fam:"SHORT",D:14}};
   // ── one production shot; collide=false → untouched reference, collide=true → keeper live. Full reset every call.
   function fire(family,aimY,c,collide,noKeeper,wantTrace){
     ptReset();                                            // production defaults re-asserted (K1 band etc.)
     t.now=0; t.net=null; t.kick=null; t.charge=null; t.shoot=null; t.gkScenario=null; t.gkStudy=null; t.tgtOverride=null; t.last=""; t.gkMomentum="SET"; t.keys={};
     t.p={x:SX,y:SY,vx:0,vy:0,facing:Math.atan2(aimY-SY,M.lineX-SX),touchT:0};
     t.b={x:SX,y:SY,z:0.06,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
     for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
     if(noKeeper){ t.gk=null; } else {
       t.gk=ptGkMake(); t.gk.height=t.gkHeight/100; t.gk.handZ=t.gk.height*GK_CFG.handReachFrac;
       t.gk.x=SET[0]; t.gk.y=SET[1]; t.gk.vx=0; t.gk.vy=0; t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk._prevKicked=false; t.gk.shotT0=null; }
     GK_COLLIDE=collide;
     const map=TECH[family]; const tgtDist=Math.hypot(M.lineX-SX,aimY-SY);
     ptKick(map.fam,"GFA "+family,map.D,{tech:map.tech,foot:"R"},{c,holdMs:0},map.tech==="INSIDE"?tgtDist:undefined);
     let shotT=null,prev=null,line=null,plane=null,goal=false,launch=null,bounces=0,zmax=0,commit=null,prep=null,firstMove=null,closest={d:1e9},nC=0,contacts=[],frame=[],prevFH=null,crossAfter=null;
     const tr=[],ev=[]; const gk0=t.gk;
     for(let s=0;s<400;s++){ const zb=t.b.z,vzb=t.b.vz; ptStep(); const bl=t.b, gk=t.gk;
       if(shotT===null&&t.kick&&t.kick.kicked){ shotT=t.now; const ki=t.kickInfo||{}; launch={v0:ki.v0,vz:ki.vz,elevDeg:ki.elevDeg,tech:ki.tech,setupDeg:ki.setupDeg!=null?ki.setupDeg:null,tgtD:ki.tgtD!=null?ki.tgtD:null,tgtSolved:ki.tgtSolved!=null?ki.tgtSolved:null,tgtClamped:!!ki.tgtClamped,spin:bl.curve?+bl.curve.s.toFixed(3):null}; }
       if(shotT!==null){
         if(bl.z>zmax) zmax=bl.z; if(zb<=0.001+GOALFX.ballR&&vzb<0&&bl.vz>0&&bl.x<M.lineX) bounces++;
         if(prev&&prev.x<M.lineX&&bl.x>=M.lineX&&!line){ const f=(M.lineX-prev.x)/(bl.x-prev.x); line={y:+(prev.y+(bl.y-prev.y)*f).toFixed(3),z:+(prev.z+(bl.z-prev.z)*f).toFixed(3),t:+(t.now-shotT-(1-f)*PT_DT).toFixed(4),sp:+Math.hypot(bl.vx,bl.vy,bl.vz).toFixed(2),afterContact:contacts.length>0}; if(contacts.length&&!crossAfter) crossAfter=line; }
         if(prev&&prev.x<SET[0]&&bl.x>=SET[0]&&!plane){ const f=(SET[0]-prev.x)/(bl.x-prev.x); plane={y:+(prev.y+(bl.y-prev.y)*f).toFixed(3),z:+(prev.z+(bl.z-prev.z)*f).toFixed(3),t:+(t.now-shotT-(1-f)*PT_DT).toFixed(4),sp:+Math.hypot(bl.vx,bl.vy,bl.vz).toFixed(2)}; }
         if(gk){
           if(firstMove===null&&Math.hypot(gk.x-SET[0],gk.y-SET[1])>0.02) firstMove=+(t.now-shotT).toFixed(3);
           if(!prep&&gk.prepared) prep={t:+(t.now-shotT).toFixed(3),tgt:gk.prepTarget?gk.prepTarget.map(v=>+v.toFixed(3)):null};
           if(!commit&&gk.committed){ const cm=gk.committed, be=gk.reach&&gk.reach.best;
             commit={t:+(t.now-shotT).toFixed(3),tier:cm.tier,action:cm.action||null,execT:+cm.execTime.toFixed(3),bestEffort:!!cm.bestEffort,norm:cm.envNorm,reachMargin:cm.reachMargin,
               target:cm.target.map(v=>+v.toFixed(3)),feet:cm.feet.map(v=>+v.toFixed(3)),avail:be?+be.availableTime.toFixed(3):null,feasible:be?!!be.timeFeasible:null,arrivalGap:be&&be.arrivalGap!=null?+be.arrivalGap.toFixed(3):null,
               dArm:cm.actionDetail?+cm.actionDetail.dArm.toFixed(3):null,dBody:cm.actionDetail?+cm.actionDetail.dBody.toFixed(3):null,lob:!!gk.lobLatched}; if(wantTrace) ev.push({t:+(t.now-shotT).toFixed(3),e:"COMMIT "+(cm.action||cm.tier)}); }
           const hn=gk.handNow||[gk.x,gk.y,gk.handZ]; if(!contacts.length){ const dd=Math.hypot(bl.x-hn[0],bl.y-hn[1],bl.z-hn[2]); if(dd<closest.d) closest={d:+dd.toFixed(3),t:+(t.now-shotT).toFixed(3),ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)],hand:[+hn[0].toFixed(2),+hn[1].toFixed(2),+hn[2].toFixed(2)]}; }
           if(gk.contacts&&gk.contacts.length>nC){ const c2=gk.contacts[gk.contacts.length-1]; nC=gk.contacts.length;
             contacts.push({t:+(t.now-shotT).toFixed(3),surface:c2.surface,volume:c2.volume,outcome:c2.outcome,held:!!c2.held,point:c2.point,speedIn:+Math.hypot(...c2.vIn).toFixed(2),speedOut:c2.speedOut,
               q:c2.q?{norm:c2.q.norm,reachMargin:c2.q.reachMargin,catchScore:c2.q.catchScore,catchThresh:c2.q.catchThresh,controlScore:c2.q.controlScore,ctrlThresh:c2.q.ctrlThresh,sRel:c2.q.sRel,two:c2.q.two,cAlign:c2.q.cAlign,u:c2.q.u,fingertip:c2.q.fingertip}:null});
             if(wantTrace) ev.push({t:+(t.now-shotT).toFixed(3),e:"KEEPER "+c2.volume+" "+c2.outcome,pt:c2.point,q:c2.q?{catch:c2.q.catchScore,thr:c2.q.catchThresh,ctrl:c2.q.controlScore,sRel:c2.q.sRel,norm:c2.q.norm,two:c2.q.two,align:c2.q.cAlign}:null}); }
           if(wantTrace) tr.push([+(t.now-shotT).toFixed(4),+bl.x.toFixed(3),+bl.y.toFixed(3),+bl.z.toFixed(3),+gk.x.toFixed(3),+gk.y.toFixed(3),gk.phase||"-",gk.committed?1:0,gk.prepared?1:0,+hn[0].toFixed(3),+hn[1].toFixed(3),+hn[2].toFixed(3)]);
         } else if(wantTrace) tr.push([+(t.now-shotT).toFixed(4),+bl.x.toFixed(3),+bl.y.toFixed(3),+bl.z.toFixed(3)]);
         if(bl.frameHit&&bl.frameHit!==prevFH){ prevFH=bl.frameHit; frame.push({t:+(t.now-shotT).toFixed(3),cap:bl.frameHit.cap}); if(wantTrace) ev.push({t:+(t.now-shotT).toFixed(3),e:"FRAME "+bl.frameHit.cap}); }
         if(t.last==="GOAL!"&&!goal){ goal=true; if(wantTrace) ev.push({t:+(t.now-shotT).toFixed(3),e:"GOAL"}); }
       }
       prev={x:bl.x,y:bl.y,z:bl.z};
       if(shotT!==null){ if(bl.held){ if(t.now-shotT>(contacts.length?contacts[contacts.length-1].t:0)+0.4) break; }
         else if(bl.x>=106.8||bl.x<60||(bl.z<=0.02&&Math.hypot(bl.vx,bl.vy)<0.25&&t.now-shotT>0.8)||(contacts.length&&t.now-shotT>contacts[contacts.length-1].t+1.5)||(!contacts.length&&line&&t.now-shotT>line.t+0.3)) break; }
       else if(t.now>1.5) break; }
     const inFrame=!!(line&&!line.afterContact&&line.y-GOALFX.ballR>M.postA&&line.y+GOALFX.ballR<M.postB&&line.z+GOALFX.ballR<2.44&&line.z>=0);
     const rec={launch,line,plane,inFrame,bounces,zmax:+zmax.toFixed(2)};
     if(!noKeeper&&collide){ Object.assign(rec,{latency:gk0?+gk0.latency.toFixed(4):null,firstMove,prep,commit,contacts,frame,goal,closest:closest.d<1e8?closest:null,crossAfterContact:crossAfter,
       endRoot:gk0?[+gk0.x.toFixed(2),+gk0.y.toFixed(2)]:null}); }
     if(wantTrace){ rec.tr=tr; rec.ev=ev; rec.set=[+SET[0].toFixed(3),+SET[1].toFixed(3)]; }
     return rec; }
   const out={defaults,geometry,env,families:{},checks:{}};
   if(CFG.trace){ out.traces=[];
     for(const tc of CFG.trace){ const off=fire(tc.family,tc.aimY,tc.c,false,false,true); const on=fire(tc.family,tc.aimY,tc.c,true,false,true);
       out.traces.push({id:tc.id,family:tc.family,aimY:tc.aimY,c:tc.c,off:{line:off.line,plane:off.plane,prof:off.tr.map(r=>[r[1],r[2],r[3],r[0]]),launch:off.launch},on}); }
     return out; }
   const aims=[]; for(let i=0;i<CFG.aimN;i++) aims.push(+(SY-CFG.aimSpan+2*CFG.aimSpan*i/(CFG.aimN-1)).toFixed(4));
   const charges=[]; for(let j=0;j<CFG.chargeN;j++) charges.push(+(CFG.cmin+(CFG.cmax-CFG.cmin)*j/(CFG.chargeN-1)).toFixed(4));
   for(const fam of CFG.families){ const shots=[]; let wide=0,over=0,short=0;
     for(const aimY of aims) for(const c of charges){
       const off=fire(fam,aimY,c,false,false,false);
       const rec={aimY,c,off};
       if(!off.line){ short++; rec.skip="no crossing"; shots.push(rec); continue; }
       if(!off.inFrame){ if(off.line.z+GOALFX.ballR>=2.44) over++; else wide++; rec.skip="off target"; shots.push(rec); continue; }
       rec.on=fire(fam,aimY,c,true,false,false); shots.push(rec); }
     out.families[fam]={shots,aims,charges,offTarget:{wide,over,noCrossing:short}}; }
   // ── validity checks
   const H=(o)=>JSON.stringify(o);
   // determinism: re-run the first N on-target keeper-ON shots
   let detSame=0,detN=0;
   for(const fam of CFG.families){ for(const sh of out.families[fam].shots){ if(!sh.on) continue; if(detN>=CFG.detN) break;
       const again=fire(fam,sh.aimY,sh.c,true,false,false); detN++;
       const key=(r)=>H({g:r.goal,c:r.contacts.map(x=>[x.t,x.surface,x.outcome]),cm:r.commit?[r.commit.t,r.commit.action,r.commit.execT]:null,l:r.line});
       if(key(again)===key(sh.on)) detSame++; } }
   out.checks.determinism={repeated:detN,identical:detSame};
   // keeper-OFF reference equals a run with NO keeper object at all (the keeper's presence never touches the ball when GK_COLLIDE=false)
   let offSame=0,offN=0;
   for(const fam of CFG.families){ let k=0; for(const sh of out.families[fam].shots){ if(!sh.on) continue; if(k++>=12) break;
       const nk=fire(fam,sh.aimY,sh.c,false,true,false); offN++; if(H([nk.line,nk.plane])===H([sh.off.line,sh.off.plane])) offSame++; } }
   out.checks.offEqualsNoKeeper={compared:offN,identical:offSame};
   // straight mirror: matched trials aimY = 34±d must give mirrored outcomes
   if(out.families.STRAIGHT){ const S_=out.families.STRAIGHT.shots; const byKey={}; for(const sh of S_) byKey[sh.aimY.toFixed(4)+"|"+sh.c.toFixed(4)]=sh;
     let pairs=0,agree=0,lineMirror=0,maxDy=0; const dis=[];
     for(const sh of S_){ if(sh.aimY<=SY) continue; const m=byKey[(2*SY-sh.aimY).toFixed(4)+"|"+sh.c.toFixed(4)]; if(!m) continue;
       if(sh.off.line&&m.off.line){ const dy=Math.abs((sh.off.line.y-SY)+(m.off.line.y-SY)); if(dy>maxDy) maxDy=dy; if(dy<1e-6&&Math.abs(sh.off.line.z-m.off.line.z)<1e-6) lineMirror++; }
       if(sh.on&&m.on){ pairs++; const a=sh.on, bb=m.on; const same=(a.goal===bb.goal)&&(!!a.contacts.length===!!bb.contacts.length)&&((a.contacts[0]||{}).outcome===(bb.contacts[0]||{}).outcome); if(same) agree++; else if(dis.length<12) dis.push({aimY:sh.aimY,c:sh.c,a:[a.goal,(a.contacts[0]||{}).outcome],b:[bb.goal,(bb.contacts[0]||{}).outcome]}); } }
     out.checks.straightMirror={onTargetPairs:pairs,outcomeAgree:agree,offLineExactMirror:lineMirror,maxLineDy:+maxDy.toFixed(6),disagreements:dis}; }
   return out;
 },{families:FAMS,aimN:AIMN,aimSpan:AIMSPAN,chargeN:CN,cmin:CMIN,cmax:CMAX,detN:DETN,trace:TRACE});
 data.meta={generated:new Date().toISOString(),url:URL,elapsedS:+((Date.now()-t0)/1000).toFixed(1),pageErrors:errs.slice(0,5),args:{families:FAMS,aimN:AIMN,aimSpan:AIMSPAN,chargeN:CN,cmin:CMIN,cmax:CMAX}};
 fs.writeFileSync(OUT,JSON.stringify(data));
 console.log("[gf_audit] defaults",JSON.stringify(data.defaults)); console.log("[gf_audit] geometry",JSON.stringify(data.geometry)); console.log("[gf_audit] env",JSON.stringify(data.env));
 for(const fam of Object.keys(data.families||{})){ const F=data.families[fam]; const on=F.shots.filter(s=>s.on); const ct=on.filter(s=>s.on.contacts.length).length, g=on.filter(s=>s.on.goal).length, held=on.filter(s=>s.on.contacts.some(c=>c.held)).length;
   console.log(`[gf_audit] ${fam}: ${F.shots.length} shots, on-target ${on.length} (wide ${F.offTarget.wide}, over ${F.offTarget.over}, no crossing ${F.offTarget.noCrossing}) | contact ${(100*ct/on.length).toFixed(1)}% | goals ${(100*g/on.length).toFixed(1)}% | catch ${(100*held/on.length).toFixed(1)}%`); }
 if(data.checks) console.log("[gf_audit] checks",JSON.stringify(data.checks));
 if(data.traces) for(const r of data.traces) console.log(`[trace] ${r.id}: ${r.on.contacts.map(c=>c.outcome).join("+")||"no contact"} goal=${r.on.goal} | ${r.on.ev.map(e=>e.t+" "+e.e).join(" · ")}`);
 console.log("[gf_audit] elapsed",data.meta.elapsedS,"s errors",errs.length); await b.close();
})();
