#!/usr/bin/env node
// GOALKEEPER V1 — MATCHED MULTI-PROFILE GOAL-FACE AUDIT (deterministic, production shots only).
//
// Extends tools/gk_eval/gk_goalface_audit.js: the SAME dead-centre shooter at the apex of the penalty arc
// fires the SAME deterministic (aim x charge) sweep of REAL production shots, and every shot is replayed
// against EVERY keeper profile with a full ptReset between shots. Keeper-OFF is fired ONCE per shot (the
// untouched goal-line crossing / keeper-plane position is the shot's coordinate and cannot depend on the
// keeper), then keeper-ON once per profile.
//
// D2 SET GEOMETRY IS HELD CONSTANT for every profile: the SET position is solved once from the production
// positioning inputs (NEW surface, D2 depth, gk_positioning = the K-band value) and every keeper is placed
// there, so the experiment measures SAVE CAPABILITY, not starting geometry. gk_positioning is therefore
// deliberately NOT injected per profile (it is reported as held).
//
// Profiles inject ONLY explicit individual attributes + physical metadata. There is no OVR term anywhere.
//
// Usage: node gk_profile_goalface.js [--url ...] [--out out.json] [--families STRAIGHT,INSIDE_R]
//        [--profiles K1,K2,K3,COURTOIS] [--aimN 81] [--aimSpan 3.9] [--chargeN 96] [--cmin .10] [--cmax 1]
//        [--determinismN 60]
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","gf_profiles.json");
const FAMS=opt("--families","STRAIGHT,INSIDE_R").split(",");
const PROFS=opt("--profiles","K1,K2,K3,COURTOIS").split(",");
const AIMN=+opt("--aimN",81), AIMSPAN=+opt("--aimSpan",3.9);
const CN=+opt("--chargeN",96), CMIN=+opt("--cmin",0.10), CMAX=+opt("--cmax",1.0); const DETN=+opt("--determinismN",60);
// --set "GK_REACH.envExp=2.0,GK_REACH.jumpModel=BOUNDED" : constant overrides applied in-page before the sweep (calibration
// studies only; recorded in meta.sets so a dataset can never be mistaken for production). --udd names the Chrome profile dir.
const SETS=(opt("--set","")||"").split(",").map(x=>x.trim()).filter(Boolean).map(kv=>{ const i=kv.indexOf("="); return [kv.slice(0,i).trim(),kv.slice(i+1).trim()]; });
const UDD=opt("--udd","chrome-pgf");
// ── continuous-attribute tooling (attribute-system pass, 2026-09-05)
//   --sweep "reflexes=40,50,60,70,80,90,99" [--base K1]   one attribute varied on a base profile, everything else held
//   --dist 16 [--angle 30]     shooter placed `dist` m from the goal centre at `angle` degrees (0 = central; + = toward post B);
//                              aims always span the goal mouth about its centre; D2 SET is solved from that shooter position
//   --holdPositioning false    let gk_positioning vary with the profile (default: HELD at the production value, identical SET)
//   --compact                  smaller per-shot records (first 3 contacts, no closest-approach / launch on keeper-ON runs)
const BASE=opt("--base","K1"); const SWEEP=opt("--sweep",null); const DIST=opt("--dist",null)!=null?+opt("--dist",null):null; const ANGLE=+opt("--angle",0);
const HOLDPOS=(opt("--holdPositioning","true")!=="false"); const COMPACT=args.includes("--compact");

// ── KEEPER PROFILES ────────────────────────────────────────────────────────────────────────────────────
// Every field is an individual attribute or a physical dimension. `ovr` is DESCRIPTIVE METADATA ONLY and is
// never read by the engine or by this harness. `positioning` is listed for the record but is HELD at the
// K-band value for the matched comparison (see header).
const PROFILES = {
  // production K bands, read from GK_CAP in match.js (reflex/diving/height/jump/handling). The bands do NOT
  // vary movement/strength/weight: those stay at the GK_CFG reference values for every band.
  K1:       { reflexes:45, diving:45, handling:45, jumping:48, height:183, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"GK_CAP.K1 ordinary (REFERENCE)" },
  K2:       { reflexes:72, diving:72, handling:72, jumping:72, height:190, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"GK_CAP.K2 strong" },
  K3:       { reflexes:92, diving:92, handling:92, jumping:92, height:197, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"GK_CAP.K3 elite" },
  // Thibaut Courtois — OUR players.json ratings (p001) + real stature + real physical dimensions (diagnostic only).
  // Sources agree: 200 cm / 96 kg, DIV 86, HAN 89, KIC 78, POS 88, REF 90, Jumping 68, Reactions 88,
  // Acceleration 42, Sprint Speed 52, Strength 70, Agility 63. GK Kicking / Reactions / Agility / Balance /
  // Composure are NOT consumed by this engine (reported, never invented into a mechanic).
  COURTOIS: { reflexes:96, diving:91, handling:95, jumping:68, height:199, weight:96, acceleration:42, speed:52, strength:70, positioning:94, ovr:93, note:"our players.json ratings + real stature; OVR is metadata only" },
  // control: Courtois's GK attributes + the K-band movement/weight constants, to separate the movement-attribute
  // asymmetry (the K bands never vary acceleration/speed/strength/weight) from his goalkeeping attributes.
  COURTOIS_BANDMOVE: { reflexes:96, diving:91, handling:95, jumping:68, height:199, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"control" },
  // ── phase 16 height decomposition ─────────────────────────────────────────────────────────────────
  K1_H200:  { reflexes:45, diving:45, handling:45, jumping:48, height:199, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"K1 attributes + Courtois height (199)" },
  COURTOIS_H183: { reflexes:96, diving:91, handling:95, jumping:68, height:183, weight:96, acceleration:42, speed:52, strength:70, positioning:72, ovr:null, note:"Courtois attributes + 183 cm" },
  // ── phase 17 single-attribute swaps onto K1 (exactly one Courtois attribute at a time) ────────────
  K1_REF:  { reflexes:96, diving:45, handling:45, jumping:48, height:183, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"K1 + Courtois reflexes" },
  K1_DIV:  { reflexes:45, diving:91, handling:45, jumping:48, height:183, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"K1 + Courtois diving" },
  K1_JMP:  { reflexes:45, diving:45, handling:45, jumping:68, height:183, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"K1 + Courtois jumping" },
  K1_HGT:  { reflexes:45, diving:45, handling:45, jumping:48, height:199, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"K1 + Courtois height (199)" },
  K1_HND:  { reflexes:45, diving:45, handling:95, jumping:48, height:183, weight:80, acceleration:68, speed:62, strength:72, positioning:72, ovr:null, note:"K1 + Courtois handling" },
  K1_ACC40: { reflexes:45, diving:45, handling:45, jumping:48, height:183, weight:80, acceleration:40, speed:62, strength:72, positioning:72, ovr:null, note:"K1 with acceleration 40 (interaction grid base)" },
  K1_ACC99: { reflexes:45, diving:45, handling:45, jumping:48, height:183, weight:80, acceleration:99, speed:62, strength:72, positioning:72, ovr:null, note:"K1 with acceleration 99 (interaction grid base)" },
  // ── tier-free reference fixtures (attribute-system pass). Individual attributes only; the labels are conceptual quality
  //    points (~60 / ~70 / ~80 / ~90+) for reading the ladder, never an input. POOR is the K1 anchor bundle verbatim.
  POOR:    { reflexes:45, diving:45, handling:45, jumping:48, height:183, weight:80, acceleration:68, speed:62, strength:72, positioning:72, reactions:50, agility:55, ovr:null, note:"weak-keeper anchor (= K1 bundle)" },
  AVERAGE: { reflexes:68, diving:68, handling:68, jumping:66, height:188, weight:83, acceleration:70, speed:63, strength:73, positioning:68, reactions:68, agility:60, ovr:null, note:"competent professional" },
  GOOD:    { reflexes:78, diving:78, handling:78, jumping:74, height:190, weight:85, acceleration:72, speed:64, strength:74, positioning:78, reactions:78, agility:62, ovr:null, note:"strong" },
  ELITE:   { reflexes:90, diving:90, handling:90, jumping:82, height:192, weight:88, acceleration:74, speed:65, strength:76, positioning:90, reactions:90, agility:64, ovr:null, note:"elite (human)" },
  // ── style fixtures: similar conceptual quality, different shapes
  TALL_SLOW:       { reflexes:72, diving:78, handling:78, jumping:72, height:200, weight:95, acceleration:50, speed:48, strength:80, positioning:78, reactions:72, agility:50, ovr:null, note:"200 cm, strong reach, moderate reflexes/acceleration" },
  SHORT_EXPLOSIVE: { reflexes:92, diving:92, handling:70, jumping:88, height:183, weight:78, acceleration:88, speed:80, strength:66, positioning:78, reactions:90, agility:85, ovr:null, note:"183 cm, elite reflexes/diving/acceleration" },
  HANDLER:         { reflexes:70, diving:70, handling:94, jumping:68, height:188, weight:84, acceleration:62, speed:58, strength:74, positioning:78, reactions:72, agility:60, ovr:null, note:"moderate physical, elite handling" },
  STOPPER:         { reflexes:92, diving:92, handling:58, jumping:82, height:190, weight:86, acceleration:66, speed:60, strength:72, positioning:78, reactions:88, agility:66, ovr:null, note:"elite reflexes/diving, weak handling" },
};
let PROFS_EFFECTIVE=PROFS;
if(SWEEP){ const [attr,vals]=SWEEP.split("="); const base=PROFILES[BASE]; if(!base) throw new Error("unknown --base "+BASE);
  const names=[BASE]; for(const v of vals.split(",").map(Number)){ const nm=BASE+"__"+attr+"_"+v; PROFILES[nm]={...base,[attr]:v,ovr:null,note:BASE+" with "+attr+"="+v}; names.push(nm); }
  PROFS_EFFECTIVE=names; }
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),"."+UDD+"-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"],protocolTimeout:14400000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; if(i===899) throw new Error("page never became ready"); await new Promise(r=>setTimeout(r,100)); }
 const t0=Date.now();
 const data=await p.evaluate((CFG)=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt, M=GK_MOUTH;
   const defaults={posModel:GK_POSMODEL.active,setDepth:GK_SETDEPTH.active,cap:t.gkCap,reflex:t.gkReflex,diving:t.gkDiving,height:t.gkHeight,jump:t.gkJump,handling:t.gkHandling,
     pol:t.gkMovePolicy,hand:t.gkHand,posQ:t.gkPosQ,select:GK_REACH.selectPolicy,timeFeasible:GK_REACH.selectTimeFeasible,lobRule:GK_REACH.lobTakeLower,
     actionModel:GK_ACTION.model,x3:PT_X3.active,x3k:+ptX3K().toFixed(4),collide:GK_COLLIDE,frameCollision:GOALFX.collision,
     gkAttrs:{...ptGkMake().attrs},reContactExcl:GK_DIVE.reContactExcl,hipFrac:GK_BODY.hipFrac,handR:GK_HAND[t.gkHand],ballR:GOALFX.ballR};
   // ── shooter: apex of the penalty arc (penalty spot 11 m from the line, arc radius 9.15 m — the drawn D)
   const PEN_SPOT=11.0, ARC_R=9.15;
   const DISTM=CFG.dist!=null?CFG.dist:(PEN_SPOT+ARC_R), ANG=(CFG.angle||0)*Math.PI/180;
   const SX=M.lineX-DISTM*Math.cos(ANG), SY=M.centerY+DISTM*Math.sin(ANG);
   // SET solved ONCE with the PRODUCTION positioning inputs, then held for every profile
   const HOLD_POS = t.gkPos!=null?t.gkPos:ptGkMake().attrs.gk_positioning;
   const q=gkNorm01(HOLD_POS);
   const SET=gkPosition(t,SX,SY,q);
   const geometry={shooter:[+SX.toFixed(3),SY],distToCentre:+Math.hypot(M.lineX-SX,M.centerY-SY).toFixed(3),distToLine:+(M.lineX-SX).toFixed(3),
     angleToPosts:[+(Math.atan2(M.postA-SY,M.lineX-SX)*180/Math.PI).toFixed(2),+(Math.atan2(M.postB-SY,M.lineX-SX)*180/Math.PI).toFixed(2)],
     aperture:+((Math.atan2(M.postB-SY,M.lineX-SX)-Math.atan2(M.postA-SY,M.lineX-SX))*180/Math.PI).toFixed(2),
     set:[+SET[0].toFixed(3),+SET[1].toFixed(3)],setDepth:+(M.lineX-SET[0]).toFixed(3),posQ:q,posHeldAt:HOLD_POS,dist:DISTM,angleDeg:CFG.angle||0,holdPositioning:!!CFG.holdPositioning};
   function applyProfile(P){
     t.gkCap="manual";                                   // per-attribute override; no band re-assertion
     t.gkReflex=P.reflexes; t.gkDiving=P.diving; t.gkHandling=P.handling; t.gkJump=P.jumping;
     t.gkHeight=P.height; t.gkWeight=P.weight;
     t.gkAccel=P.acceleration; t.gkSpeed=P.speed; t.gkStrength=P.strength;
     t.gkPos=CFG.holdPositioning ? geometry.posHeldAt : P.positioning;   // HELD by default
     t.gkMovePolicy="M6"; t.gkPosQ="Q25"; t.gkHand="H4"; t.gkSelect=undefined; t.gkMomentum="SET";
     GK_POSMODEL.active="NEW"; GK_SETDEPTH.active="D2";
   }
   function envOf(P){ ptReset(); applyProfile(P); const gk=ptGkMake(); gk.height=t.gkHeight/100;
     const e=gkEnvelope(t,gk,gk.height);
     return {comfortZ:+e.comfortZ.toFixed(4),maxLat:+e.maxLat.toFixed(4),maxVertUp:+e.maxVertUp.toFixed(4),maxVertDown:+e.maxVertDown.toFixed(4),
       highReachZ:+e.highReachZ.toFixed(4),standingReachZ:+e.standingReachZ.toFixed(4),handRestZ:+e.handRestZ.toFixed(4),
       latency:+gkReactionLatency(t,gk).toFixed(4),
       moveAccel:+(GK_MOVE.accelBase+GK_MOVE.accelGain*gkNorm01(gkAttr(t,gk,"acceleration"))).toFixed(3),
       moveVmax:+(GK_MOVE.vmaxBase+GK_MOVE.vmaxGain*gkNorm01(gkAttr(t,gk,"sprint_speed"))).toFixed(3),
       handAccel:+(GK_ACTION.handAccelBase+GK_ACTION.handAccelReflexGain*gkShape01(t.gkReflex)).toFixed(3),
       latDrive:+(GK_ACTION.latAccelBase+GK_ACTION.latAccelGain*gkShape01(t.gkDiving)).toFixed(3),
       upDrive:+(GK_ACTION.upAccelBase+GK_ACTION.upAccelGain*gkShape01(t.gkJump)).toFixed(3),
       downDrive:+(GK_ACTION.downAccelBase+GK_ACTION.downAccelGain*gkShape01(t.gkDiving)).toFixed(3),
       load:+((GK_ACTION.loadTime-GK_ACTION.loadDivingGain*gkShape01(t.gkDiving))).toFixed(4)};
   }
   const TECH={STRAIGHT:{tech:"LACES",fam:"DRIVEN",D:20},INSIDE_R:{tech:"INSIDE",fam:"SHORT",D:14}};
   function fire(family,aimY,c,collide,noKeeper,P){
     ptReset(); if(P) applyProfile(P);
     t.now=0; t.net=null; t.kick=null; t.charge=null; t.shoot=null; t.gkScenario=null; t.gkStudy=null; t.tgtOverride=null; t.last=""; t.gkMomentum="SET"; t.keys={};
     t.p={x:SX,y:SY,vx:0,vy:0,facing:Math.atan2(aimY-SY,M.lineX-SX),touchT:0};
     t.b={x:SX,y:SY,z:0.06,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
     for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
     if(noKeeper){ t.gk=null; } else {
       t.gk=ptGkMake(); t.gk.height=t.gkHeight/100; t.gk.handZ=t.gk.height*GK_CFG.handReachFrac;
       t.gk.x=SET[0]; t.gk.y=SET[1]; t.gk.vx=0; t.gk.vy=0; t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk._prevKicked=false; t.gk.shotT0=null; }
     GK_COLLIDE=collide;
     const map=TECH[family]; const tgtDist=Math.hypot(M.lineX-SX,aimY-SY);
     ptKick(map.fam,"PGF "+family,map.D,{tech:map.tech,foot:"R"},{c,holdMs:0},map.tech==="INSIDE"?tgtDist:undefined);
     let shotT=null,prev=null,line=null,plane=null,goal=false,launch=null,bounces=0,zmax=0,commit=null,closest={d:1e9},nC=0,contacts=[],prevFH=null,frame=0;
     const gk0=t.gk;
     for(let s=0;s<400;s++){ const zb=t.b.z,vzb=t.b.vz; ptStep(); const bl=t.b, gk=t.gk;
       if(shotT===null&&t.kick&&t.kick.kicked){ shotT=t.now; const ki=t.kickInfo||{}; launch={v0:ki.v0,elevDeg:ki.elevDeg,setupDeg:ki.setupDeg!=null?ki.setupDeg:null,tgtClamped:!!ki.tgtClamped,spin:bl.curve?+bl.curve.s.toFixed(3):null}; }
       if(shotT!==null){
         if(bl.z>zmax) zmax=bl.z; if(zb<=0.001+GOALFX.ballR&&vzb<0&&bl.vz>0&&bl.x<M.lineX) bounces++;
         if(prev&&prev.x<M.lineX&&bl.x>=M.lineX&&!line){ const f=(M.lineX-prev.x)/(bl.x-prev.x); line={y:+(prev.y+(bl.y-prev.y)*f).toFixed(4),z:+(prev.z+(bl.z-prev.z)*f).toFixed(4),t:+(t.now-shotT-(1-f)*PT_DT).toFixed(4),sp:+Math.hypot(bl.vx,bl.vy,bl.vz).toFixed(3),afterContact:contacts.length>0}; }
         if(prev&&prev.x<SET[0]&&bl.x>=SET[0]&&!plane){ const f=(SET[0]-prev.x)/(bl.x-prev.x); plane={y:+(prev.y+(bl.y-prev.y)*f).toFixed(4),z:+(prev.z+(bl.z-prev.z)*f).toFixed(4),t:+(t.now-shotT-(1-f)*PT_DT).toFixed(4),sp:+Math.hypot(bl.vx,bl.vy,bl.vz).toFixed(3)}; }
         if(gk){
           if(!commit&&gk.committed){ const cm=gk.committed, be=gk.reach&&gk.reach.best;
             commit={t:+(t.now-shotT).toFixed(4),tier:cm.tier,action:cm.action||null,execT:+cm.execTime.toFixed(4),bestEffort:!!cm.bestEffort,norm:cm.envNorm,
               target:cm.target.map(v=>+v.toFixed(3)),feet:cm.feet.map(v=>+v.toFixed(3)),avail:be?+be.availableTime.toFixed(4):null,feasible:be?!!be.timeFeasible:null,
               dBody:cm.actionDetail?+cm.actionDetail.dBody.toFixed(3):null}; }
           const hn=gk.handNow||[gk.x,gk.y,gk.handZ]; if(!contacts.length){ const dd=Math.hypot(bl.x-hn[0],bl.y-hn[1],bl.z-hn[2]); if(dd<closest.d) closest={d:+dd.toFixed(3),t:+(t.now-shotT).toFixed(3),hand:[+hn[0].toFixed(3),+hn[1].toFixed(3),+hn[2].toFixed(3)],ball:[+bl.x.toFixed(3),+bl.y.toFixed(3),+bl.z.toFixed(3)]}; }
           if(gk.contacts&&gk.contacts.length>nC){ const c2=gk.contacts[gk.contacts.length-1]; nC=gk.contacts.length;
             contacts.push({t:+(t.now-shotT).toFixed(4),surface:c2.surface,volume:c2.volume,outcome:c2.outcome,held:!!c2.held,point:c2.point?c2.point.map(v=>+v.toFixed(3)):null,
               speedIn:+Math.hypot(...c2.vIn).toFixed(2),norm:c2.q?c2.q.norm:null}); }
         }
         if(bl.frameHit&&bl.frameHit!==prevFH){ prevFH=bl.frameHit; frame++; }
         if(t.last==="GOAL!"&&!goal) goal=true;
       }
       prev={x:bl.x,y:bl.y,z:bl.z};
       if(shotT!==null){ if(bl.held){ if(t.now-shotT>(contacts.length?contacts[contacts.length-1].t:0)+0.4) break; }
         else if(bl.x>=106.8||bl.x<60||(bl.z<=0.02&&Math.hypot(bl.vx,bl.vy)<0.25&&t.now-shotT>0.8)||(contacts.length&&t.now-shotT>contacts[contacts.length-1].t+1.5)||(!contacts.length&&line&&t.now-shotT>line.t+0.3)) break; }
       else if(t.now>1.5) break; }
     const inFrame=!!(line&&!line.afterContact&&line.y-GOALFX.ballR>M.postA&&line.y+GOALFX.ballR<M.postB&&line.z+GOALFX.ballR<2.44&&line.z>=0);
     const rec={launch,line,plane,inFrame,bounces,zmax:+zmax.toFixed(3)};
     if(!noKeeper&&collide){ Object.assign(rec,{commit,contacts:CFG.compact?contacts.slice(0,3):contacts,frame,goal,closest:(CFG.compact||closest.d>=1e8)?null:closest,
       held:contacts.some(c=>c.held),endRoot:gk0?[+gk0.x.toFixed(3),+gk0.y.toFixed(3)]:null,latency:gk0&&gk0.latency!=null?+gk0.latency.toFixed(4):null});
       if(CFG.compact){ delete rec.launch; delete rec.plane; delete rec.zmax; } }
     return rec; }
   // constants are top-level const/let bindings (not window properties): assign through indirect eval in the page's global scope
   const applied={}; for(const [k,v] of (CFG.sets||[])){ const num=Number(v); const val=(v!==""&&!isNaN(num))?num:v;
     (0,eval)(k+"="+JSON.stringify(val)+";"); applied[k]=(0,eval)(k); }
   const envsAfterSets={};
   const aims=[]; for(let i=0;i<CFG.aimN;i++) aims.push(+(M.centerY-CFG.aimSpan+2*CFG.aimSpan*i/(CFG.aimN-1)).toFixed(4));   // aims span the MOUTH about its centre (identical to the old SY-centred aims for a central shooter)
   const charges=[]; for(let j=0;j<CFG.chargeN;j++) charges.push(+(CFG.cmin+(CFG.cmax-CFG.cmin)*j/(CFG.chargeN-1)).toFixed(4));
   const envs={}; for(const nm of CFG.profileOrder) envs[nm]=envOf(CFG.profiles[nm]);
   const out={defaults,geometry,envs,sets:applied,reach:{envExp:GK_REACH.envExp,jumpModel:GK_REACH.jumpModel,latModel:GK_REACH.latModel,jumpReachBase:GK_REACH.jumpReachBase,jumpReachSpan:GK_REACH.jumpReachSpan,jumpReachExp:GK_REACH.jumpReachExp,latSpanBounded:GK_REACH.latSpanBounded,latSpanExp:GK_REACH.latSpanExp,jumpReachGain:GK_REACH.jumpReachGain,latSpanGain:GK_REACH.latSpanGain},
     profiles:CFG.profiles,profileOrder:CFG.profileOrder,families:{},checks:{}};
   for(const fam of CFG.families){ const shots=[]; let wide=0,over=0,short=0;
     for(const aimY of aims) for(const c of charges){
       const off=fire(fam,aimY,c,false,false,null);
       const rec={aimY,c,off,on:{}};
       if(!off.line){ short++; rec.skip="no crossing"; shots.push(rec); continue; }
       if(!off.inFrame){ if(off.line.z+GOALFX.ballR>=2.44) over++; else wide++; rec.skip="off target"; shots.push(rec); continue; }
       for(const nm of CFG.profileOrder) rec.on[nm]=fire(fam,aimY,c,true,false,CFG.profiles[nm]);
       shots.push(rec); }
     out.families[fam]={shots,aims,charges,offTarget:{wide,over,noCrossing:short}}; }
   // ── validity checks
   const H=(o)=>JSON.stringify(o);
   let detSame=0,detN=0;
   for(const fam of CFG.families) for(const sh of out.families[fam].shots){ if(!sh.on||!sh.on[CFG.profileOrder[0]]) continue; if(detN>=CFG.detN) break;
     for(const nm of CFG.profileOrder){ const again=fire(fam,sh.aimY,sh.c,true,false,CFG.profiles[nm]); detN++;
       const key=(r)=>H({g:r.goal,c:r.contacts.map(x=>[x.t,x.surface,x.outcome]),cm:r.commit?[r.commit.t,r.commit.action,r.commit.execT]:null,l:r.line});
       if(key(again)===key(sh.on[nm])) detSame++; } }
   out.checks.determinism={repeated:detN,identical:detSame};
   // keeper-OFF is profile independent by construction; verify the keeper-OFF crossing equals a no-keeper run
   let offSame=0,offN=0;
   for(const fam of CFG.families){ let k=0; for(const sh of out.families[fam].shots){ if(k>=12) break; if(!sh.off.line) continue; k++; offN++;
     const nk=fire(fam,sh.aimY,sh.c,false,true,null); if(H(nk.line)===H(sh.off.line)) offSame++; } }
   out.checks.offEqualsNoKeeper={compared:offN,identical:offSame};
   // SET position identical for every profile (D2 geometry held)
   const setChk={}; for(const nm of CFG.profileOrder){ ptReset(); applyProfile(CFG.profiles[nm]);
     const qq=gkNorm01(t.gkPos); const s=gkPosition(t,SX,SY,qq); setChk[nm]=[+s[0].toFixed(4),+s[1].toFixed(4)]; }
   out.checks.setPerProfile=setChk;
   return out;
 },{families:FAMS,profiles:PROFILES,profileOrder:PROFS_EFFECTIVE,aimN:AIMN,aimSpan:AIMSPAN,chargeN:CN,cmin:CMIN,cmax:CMAX,detN:DETN,holdPositioning:HOLDPOS,sets:SETS,dist:DIST,angle:ANGLE,compact:COMPACT});
 const meta={generated:new Date().toISOString(),url:URL,sets:SETS,families:FAMS,profiles:PROFS_EFFECTIVE,sweep:SWEEP,base:BASE,dist:DIST,angle:ANGLE,holdPositioning:HOLDPOS,compact:COMPACT,aimN:AIMN,aimSpan:AIMSPAN,chargeN:CN,cmin:CMIN,cmax:CMAX,
   elapsedS:+((Date.now()-t0)/1000).toFixed(1),pageErrors:errs.slice(0,5)};
 fs.writeFileSync(OUT,JSON.stringify({meta,...data}));
 console.log("[pgf] defaults",JSON.stringify(data.defaults));
 console.log("[pgf] geometry",JSON.stringify(data.geometry));
 for(const nm of PROFS_EFFECTIVE) console.log("[pgf] env",nm,JSON.stringify(data.envs[nm]));
 for(const fam of FAMS){ const F=data.families[fam]; const on=F.shots.filter(s=>s.on&&Object.keys(s.on).length);
   console.log(`[pgf] ${fam}: ${F.shots.length} shots, on-target ${on.length} (wide ${F.offTarget.wide}, over ${F.offTarget.over}, no crossing ${F.offTarget.noCrossing})`);
   for(const nm of PROFS_EFFECTIVE){ const c=on.filter(s=>s.on[nm].contacts.length).length, g=on.filter(s=>s.on[nm].goal).length, h=on.filter(s=>s.on[nm].held).length;
     console.log(`        ${nm.padEnd(18)} contact ${(100*c/on.length).toFixed(1)}%  total save ${(100*(on.length-g)/on.length).toFixed(1)}%  catch|contact ${(100*h/Math.max(1,c)).toFixed(1)}%`); } }
 console.log("[pgf] checks",JSON.stringify(data.checks));
 console.log(`[pgf] elapsed ${meta.elapsedS} s errors ${errs.length}`);
 await b.close();
})().catch(e=>{ console.error("[pgf] FAILED",e); process.exit(1); });
