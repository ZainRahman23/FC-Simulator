#!/usr/bin/env node
// GOALKEEPER V1 — SAVE-ENVELOPE HARNESS (deterministic, reusable).
//
// Fires CONTROLLED synthetic shots at a dense goal-face grid from a fixed shooter origin, with the launch
// solved against the production integrator so that the ball crosses the goal line at the target with a
// controlled FLIGHT TIME (or launch speed), keeper OFF (free-flight reference: goal-line + keeper-plane
// coordinates) and keeper ON (Stage-3 contact, Stage-4 outcome, goal). The keeper is fully reset every
// shot; profiles inject explicit attributes + height/weight (never an OVR). Output: per-cell JSON + CSV
// for gk_envelope_render.py. A measurement, not an objective — never tune constants against it.
//
// Usage:
//   node gk_envelope.js --url http://127.0.0.1:8126/sandbox/visual/match.html --out env.json
//        [--dist 19.5] [--flight 0.85 | --usable 0.5 | --speed 26] [--family STRAIGHT|INSIDE_R] [--spin 4.17]
//        [--profile K1|K2|K3|POOR|BELOW|GOOD|VGOOD|ELITE|{"reflexes":..,"diving":..,"handling":..,"jumping":..,
//          "positioning":..,"acceleration":..,"speed":..,"strength":..,"height":..,"weight":..}]
//        [--ny 25 --nz 13] [--ymargin 0.15 --zmargin 0.15] [--model CAUSAL|TIER] [--x3 B] [--tag name]
// Profiles (synthetic evaluation bands; the OVR-equivalent labels are DOCUMENTATION ONLY):
const PROFILES = {
  K1:    { reflexes: 45, diving: 45, handling: 45, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 183, weight: 80 },
  K2:    { reflexes: 72, diving: 72, handling: 72, jumping: 72, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 190, weight: 84 },
  K3:    { reflexes: 92, diving: 92, handling: 92, jumping: 92, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 197, weight: 88 },
  POOR:  { reflexes: 42, diving: 40, handling: 41, jumping: 44, positioning: 46, acceleration: 52, speed: 50, strength: 55, height: 183, weight: 80 },   // ~50–60 OVR-equivalent (label only)
  BELOW: { reflexes: 56, diving: 53, handling: 57, jumping: 55, positioning: 58, acceleration: 58, speed: 55, strength: 62, height: 185, weight: 82 },   // ~60–70
  GOOD:  { reflexes: 71, diving: 68, handling: 70, jumping: 68, positioning: 71, acceleration: 64, speed: 60, strength: 70, height: 188, weight: 84 },   // ~70–80
  VGOOD: { reflexes: 82, diving: 80, handling: 81, jumping: 78, positioning: 81, acceleration: 69, speed: 65, strength: 76, height: 190, weight: 86 },   // ~80–88
  ELITE: { reflexes: 91, diving: 92, handling: 90, jumping: 88, positioning: 90, acceleration: 74, speed: 69, strength: 80, height: 193, weight: 88 },   // ~88–95
  // ── keeper-profile audit (2026-09-04): the production K bands with the band-constant movement attributes,
  //    and a DIAGNOSTIC Thibaut Courtois profile built from his OUR players.json ratings (p001) + real stature. No OVR anywhere.
  //    `positioning` is held at 72 for every profile in the matched comparison so D2 SET geometry is identical.
  K1P:   { reflexes: 45, diving: 45, handling: 45, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 183, weight: 80 },
  K2P:   { reflexes: 72, diving: 72, handling: 72, jumping: 72, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 190, weight: 80 },
  K3P:   { reflexes: 92, diving: 92, handling: 92, jumping: 92, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 197, weight: 80 },
  COURTOIS: { reflexes: 96, diving: 91, handling: 95, jumping: 68, positioning: 72, acceleration: 42, speed: 52, strength: 70, height: 199, weight: 96 },
  COURTOIS_BANDMOVE: { reflexes: 96, diving: 91, handling: 95, jumping: 68, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 199, weight: 80 },
  K1_ATTR_COURTOIS_H: { reflexes: 45, diving: 45, handling: 45, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 199, weight: 80 },
  COURTOIS_ATTR_183H: { reflexes: 96, diving: 91, handling: 95, jumping: 68, positioning: 72, acceleration: 42, speed: 52, strength: 70, height: 183, weight: 96 },
  K1_REF: { reflexes: 96, diving: 45, handling: 45, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 183, weight: 80 },
  K1_DIV: { reflexes: 45, diving: 91, handling: 45, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 183, weight: 80 },
  K1_JMP: { reflexes: 45, diving: 45, handling: 45, jumping: 68, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 183, weight: 80 },
  K1_HGT: { reflexes: 45, diving: 45, handling: 45, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 199, weight: 80 },
  K1_HND: { reflexes: 45, diving: 45, handling: 95, jumping: 48, positioning: 72, acceleration: 68, speed: 62, strength: 72, height: 183, weight: 80 },
};
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","gk_envelope.json");
const DIST=+opt("--dist",20.15); const FLIGHT=opt("--flight",null); const USABLE=opt("--usable",null); const SPEED=opt("--speed",null);
const FAM=opt("--family","STRAIGHT"); const SPIN=+opt("--spin",4.17); const NY=+opt("--ny",25), NZ=+opt("--nz",13);
const TARGETS=opt("--targets",null)?JSON.parse(opt("--targets")):null; const YM=+opt("--ymargin",0.15), ZM=+opt("--zmargin",0.15); const YSPAN=opt("--yspan",null)?+opt("--yspan"):null; const ZMIN=opt("--zmin",null)?+opt("--zmin"):null; const MODEL=opt("--model",null); const X3=opt("--x3",null); const TAG=opt("--tag","");
const PROF_ARG=opt("--profile","K1"); const PROFILE=PROFILES[PROF_ARG]||JSON.parse(PROF_ARG);
const TARGET=opt("--target","line");   // line = targets are goal-line crossings; plane = targets are crossings of the keeper's SET plane (the envelope's own coordinates)
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-env-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox"],protocolTimeout:3600000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; if(i===899) throw new Error("page never became ready"); await new Promise(r=>setTimeout(r,100)); }
 const t0=Date.now();
 const data=await p.evaluate((CFG)=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt, M=GK_MOUTH;
   // ── keeper profile injection (explicit attributes + height/weight; no OVR)
   function applyProfile(){ const P=CFG.profile; t.gkCap="manual";
     t.gkReflex=P.reflexes; t.gkDiving=P.diving; t.gkHandling=P.handling; t.gkJump=P.jumping; t.gkHeight=P.height;
     t.gkPos=P.positioning; t.gkAccel=P.acceleration; t.gkSpeed=P.speed; t.gkStrength=P.strength; t.gkWeight=P.weight;
     t.gkMovePolicy="M6"; t.gkPosQ="Q25"; t.gkHand="H4"; t.gkSelect=undefined; t.gkMomentum="SET"; t.gkScenario=null; t.gkStudy=null; t.paused=false; t.pauseAtContact=false;
     GK_POSMODEL.active="NEW"; GK_SETDEPTH.active="D2"; if(CFG.model&&typeof GK_ACTION!=="undefined") GK_ACTION.model=CFG.model; if(CFG.x3&&typeof PT_X3!=="undefined") PT_X3.active=CFG.x3; }
   applyProfile();
   // HARNESS FIX (audit fork): the engine's gkReactionLatency uses gkShape01, not gkNorm01. gk_envelope.js
   // solves the flight time against the norm01 value, so the delivered usable time is up to ~8 ms off the
   // requested one, and the error VARIES WITH THE PROFILE (0 ms at reflexes>=90, 6 ms at 45, 8 ms at 72) —
   // which is exactly the quantity a matched time-conditioned envelope comparison holds constant.
   const latency=GK_REACH.reactionBase-GK_REACH.reactionReflexGain*gkShape01(CFG.profile.reflexes);
   // ── free flight with the keeper inert (solver + reference)
   function fly(x0,y0,z0,vx,vy,vz,curve,maxT,wantProfile,planeX){
     const keep=t.gk; t.gk=null; t.now=0; t.kick=null; t.net=null;
     t.b={x:x0,y:y0,z:z0,vx,vy,vz,ctrl:false,exclT:0,curve:curve?{s:curve.s,sgn:curve.sgn}:null};
     let prev=null,cross=null,line=null,bounces=0,zmax=z0,plane=null; const prof=[];
     for(let i=0;i<Math.round((maxT||3.2)/PT_DT);i++){
       prev={x:t.b.x,y:t.b.y,z:t.b.z,t:t.now}; const zb=t.b.z,vzb=t.b.vz; ptStep();
       if(t.b.z>zmax)zmax=t.b.z; if(zb<=0.001+GOALFX.ballR&&vzb<0&&t.b.vz>0)bounces++;
       if(wantProfile&&t.b.x>=x0) prof.push([+t.b.x.toFixed(3),+t.b.y.toFixed(3),+t.b.z.toFixed(3),+t.now.toFixed(4)]);
       if(planeX!=null&&!plane&&prev.x<planeX&&t.b.x>=planeX){ const f=(planeX-prev.x)/((t.b.x-prev.x)||1e-9); plane={y:+(prev.y+f*(t.b.y-prev.y)).toFixed(3),z:+(prev.z+f*(t.b.z-prev.z)).toFixed(3),t:+(prev.t+f*PT_DT).toFixed(4)}; }
       if(!cross&&prev.x<TX&&t.b.x>=TX){ const f=(TX-prev.x)/((t.b.x-prev.x)||1e-9);        // the SOLVER's crossing: the target plane
         cross={t:prev.t+f*PT_DT,y:prev.y+f*(t.b.y-prev.y),z:prev.z+f*(t.b.z-prev.z),sp:Math.hypot(t.b.vx,t.b.vy,t.b.vz),vx:t.b.vx,vy:t.b.vy,vz:t.b.vz,bounces,zmax}; if(TX>=M.lineX){ line=cross; break; } }
       if(prev.x<M.lineX&&t.b.x>=M.lineX){ const f=(M.lineX-prev.x)/((t.b.x-prev.x)||1e-9);
         line={t:prev.t+f*PT_DT,y:prev.y+f*(t.b.y-prev.y),z:prev.z+f*(t.b.z-prev.z),sp:Math.hypot(t.b.vx,t.b.vy,t.b.vz),bounces,zmax}; break; }
       if(t.b.x>M.lineX+2||t.now>(maxT||3.2))break; }
     t.gk=keep; return {cross,line,prof,plane}; }
   const x0=M.lineX-CFG.dist, y0=M.centerY, z0=GOALFX.ballR;
   // the keeper's SET plane for this shooter (profile positioning applied) — plane-targeted grids aim here
   const PLANE_X=(function(){ ptReset(); applyProfile(); t.gk=ptGkMake(); t.gk.height=t.gkHeight/100;
     const q=gkNorm01(t.gkPos!=null?t.gkPos:t.gk.attrs.gk_positioning); return gkPosition(t,x0,y0,q)[0]; })();
   const TX=CFG.target==="plane"?PLANE_X:M.lineX;   // x at which (yT,zT) must be met
   const mk=(v0,th,ph)=>[v0*Math.cos(ph)*Math.cos(th),v0*Math.cos(ph)*Math.sin(th),v0*Math.sin(ph)];
   function solveTheta(yT,zT,v0,curve,seed){                    // azimuth+elevation for a given speed (scan + Newton; seed = warm start, skips the scans)
     const T0=CFG.dist/Math.max(1,v0); let th=Math.atan2(yT-y0,M.lineX-x0), ph=Math.atan2(zT-z0+0.5*9.81*T0*T0,CFG.dist);
     const scanPh=(tt)=>{let bs=null;for(let k=0;k<=45;k++){const pp=-0.06+k*1.01/45;const c=fly(x0,y0,z0,...mk(v0,tt,pp),curve,3.2).cross;if(!c||(c.z<0.02&&zT>0.25))continue;const e=Math.abs(c.z-zT);if(!bs||e<bs.e)bs={pp,e};}return bs;};
     const scanTh=(pp)=>{let bs=null;for(let k=0;k<=40;k++){const tt=-0.55+k*1.10/40;const c=fly(x0,y0,z0,...mk(v0,tt,pp),curve,3.2).cross;if(!c)continue;const e=Math.abs(c.y-yT);if(!bs||e<bs.e)bs={tt,e};}return bs;};
     if(seed){ th=seed.th; ph=seed.ph; }
     else { let b1=scanPh(th); if(b1)ph=b1.pp; if(curve){ const b2=scanTh(ph); if(b2)th=b2.tt; const b3=scanPh(th); if(b3)ph=b3.pp; } }
     let best=null;
     for(let it=0;it<30;it++){ const L=mk(v0,th,ph); const c=fly(x0,y0,z0,L[0],L[1],L[2],curve,3.2).cross; if(!c){ph+=0.03;continue;}
       const ey=c.y-yT,ez=c.z-zT,err=Math.hypot(ey,ez); if(!best||err<best.err)best={th,ph,c,err,L}; if(err<0.004)break;
       const h=1e-3; const c1=fly(x0,y0,z0,...mk(v0,th+h,ph),curve,3.2).cross, c2=fly(x0,y0,z0,...mk(v0,th,ph+h),curve,3.2).cross; if(!c1||!c2)break;
       const J=[[(c1.y-c.y)/h,(c2.y-c.y)/h],[(c1.z-c.z)/h,(c2.z-c.z)/h]]; const det=J[0][0]*J[1][1]-J[0][1]*J[1][0]; if(Math.abs(det)<1e-9)break;
       let dth=-(J[1][1]*ey-J[0][1]*ez)/det, dph=-(-J[1][0]*ey+J[0][0]*ez)/det; const lim=0.12; dth=Math.max(-lim,Math.min(lim,dth)); dph=Math.max(-lim,Math.min(lim,dph)); th+=dth; ph+=dph; }
     return best; }
   function solve(yT,zT,curve){
     if(CFG.speed!=null){ const s=solveTheta(yT,zT,CFG.speed,curve,null); return s?{...s,v0:CFG.speed}:null; }
     const tT=CFG.flight!=null?CFG.flight:(CFG.usable+latency);           // controlled flight time
     const dx=TX-x0; let v=dx/tT*1.12, best=null, seed=null;
     for(let it=0;it<9;it++){ let s=solveTheta(yT,zT,v,curve,seed);
       if(s&&s.err>0.05&&seed){ s=solveTheta(yT,zT,v,curve,null); }        // warm start stalled (e.g. bounce regime): full scan
       if(!s){v*=1.12;seed=null;continue;}
       seed=s.err<=0.05?{th:s.th,ph:s.ph}:null;
       const score=Math.abs(s.c.t-tT)+ (s.err>0.05?1:0);                    // prefer accurate solutions, then closest flight time
       if(!best||score<best.score) best={...s,v0:v,score};
       if(Math.abs(s.c.t-tT)<0.004&&s.err<=0.05)break; v=v*Math.pow(s.c.t/tT,0.9); }
     return best; }
   // ── keeper-ON run
   function run(L,curve,yT,zT){
     ptReset(); applyProfile();
     t.now=0; t.kick=null; t.shoot=null; t.net=null;
     t.p={x:x0,y:y0,vx:0,vy:0,facing:0,touchT:0}; t.b={x:x0,y:y0,z:z0,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null};
     for(const g of S.goalPanels||[]) if(g.net){ g.net.pos.set(g.net.rest); g.net.vel.fill(0); g.net.active=false; g.net._ptV2=false; }
     t.gk=ptGkMake(); t.gk.height=t.gkHeight/100; t.gk.handZ=t.gk.height*GK_CFG.handReachFrac;
     const q=gkNorm01(t.gkPos!=null?t.gkPos:t.gk.attrs.gk_positioning); const des=gkPosition(t,x0,y0,q);
     t.gk.x=des[0]; t.gk.y=des[1]; t.gk.vx=0; t.gk.vy=0; t.gk.handNow=[t.gk.x,t.gk.y,t.gk.handZ]; t.gk.bodyNow=[t.gk.x,t.gk.y]; t.gk.shotT0=null; t.gk._prevKicked=false;
     const setX=t.gk.x,setY=t.gk.y;
     t.b.ctrl=false; t.b.exclT=t.now+5; t.b.curve=curve?{s:curve.s,sgn:curve.sgn}:null; t.b.vx=L.L[0]; t.b.vy=L.L[1]; t.b.vz=L.L[2];   // exclT: the shooter must not re-capture a slow ball (production kicks set now+5)
     t.kick={t0:0,kickAt:0,end:0.3,kicked:true,noAnim:true,fam:"SYNTH",v0:L.v0,vz:L.L[2],dir:Math.atan2(L.L[1],L.L[0]),tech:"LACES",foot:"R",label:"ENV",charge:null,tgtD:null};
     let commit=null,contact=null,closest={d:1e9},prep=null,goal=false,cross=null,prevB=null,firstMove=null; const gk=t.gk;
     let handMaxZ=-9,handMaxLat=0,handAtContact=null,rootMax=0;
     for(let i=0;i<320;i++){ prevB={x:t.b.x,y:t.b.y,z:t.b.z}; ptStep(); const b=t.b;
       if(firstMove===null&&Math.hypot(gk.x-setX,gk.y-setY)>0.02) firstMove=+t.now.toFixed(3);
       if(prep===null&&gk.prepared) prep={t:+t.now.toFixed(3),tgt:gk.prepTarget?gk.prepTarget.map(v=>+v.toFixed(3)):null};
       if(!commit&&gk.committed){ const c=gk.committed; commit={t:+t.now.toFixed(3),tier:c.tier,action:c.action||null,execT:+c.execTime.toFixed(3),bestEffort:!!c.bestEffort,norm:c.envNorm,
           target:c.target.map(v=>+v.toFixed(3)),feet:c.feet.map(v=>+v.toFixed(3)),avail:gk.reach&&gk.reach.best?+gk.reach.best.availableTime.toFixed(3):null,
           feasible:gk.reach&&gk.reach.best?gk.reach.best.timeFeasible:null,arrivalGap:gk.reach&&gk.reach.best&&gk.reach.best.arrivalGap!=null?+gk.reach.best.arrivalGap.toFixed(3):null}; }
       const hn=gk.handNow||[gk.x,gk.y,gk.handZ]; const dd=Math.hypot(b.x-hn[0],b.y-hn[1],b.z-hn[2]);
       if(hn[2]>handMaxZ) handMaxZ=hn[2]; { const hl=Math.abs(hn[1]-setY); if(hl>handMaxLat) handMaxLat=hl; const rl=Math.abs(gk.y-setY); if(rl>rootMax) rootMax=rl; }
       if(!contact&&dd<closest.d) closest={d:+dd.toFixed(3),t:+t.now.toFixed(3),ball:[+b.x.toFixed(2),+b.y.toFixed(2),+b.z.toFixed(2)],hand:[+hn[0].toFixed(2),+hn[1].toFixed(2),+hn[2].toFixed(2)],root:[+gk.x.toFixed(2),+gk.y.toFixed(2)]};
       if(!contact&&gk.contact){ const c=gk.contact; handAtContact=[+hn[0].toFixed(3),+hn[1].toFixed(3),+hn[2].toFixed(3)]; contact={t:+t.now.toFixed(3),surface:c.surface,volume:c.volume,outcome:c.outcome,held:!!c.held,point:c.point,norm:c.q?c.q.norm:null,
           catchScore:c.q?c.q.catchScore:null,catchThresh:c.q?c.q.catchThresh:null,controlScore:c.q?c.q.controlScore:null,sRel:c.q?c.q.sRel:null,two:c.q?c.q.two:null,cAlign:c.q?c.q.cAlign:null,u:c.q?c.q.u:null,
           speedIn:+Math.hypot(...c.vIn).toFixed(2),speedOut:c.speedOut,vOut:c.vOut}; }
       if(!cross&&prevB.x<M.lineX&&b.x>=M.lineX){ const f=(M.lineX-prevB.x)/((b.x-prevB.x)||1e-9); cross={t:+t.now.toFixed(3),y:+(prevB.y+f*(b.y-prevB.y)).toFixed(3),z:+(prevB.z+f*(b.z-prevB.z)).toFixed(3),afterContact:!!contact}; }
       if(t.last==="GOAL!") goal=true;
       if(b.held){ if(contact&&t.now>contact.t+0.3) break; }
       else if(b.x>=106.8||b.x<70||(contact&&t.now>contact.t+1.2)||(!contact&&cross&&t.now>cross.t+0.25)) break; }
     return {setX:+setX.toFixed(3),setY:+setY.toFixed(3),latency:+gk.latency.toFixed(4),firstMove,prep,commit,contact,closest,goal,cross,
             handMaxZ:+handMaxZ.toFixed(3),handMaxLat:+handMaxLat.toFixed(3),rootMaxLat:+rootMax.toFixed(3),handAtContact,
             endRoot:[+gk.x.toFixed(2),+gk.y.toFixed(2)]}; }
   // ── grid
   const curve=CFG.family==="INSIDE_R"?{s:CFG.spin,sgn:1}:null;
   const ys=[],zs=[];
   if(CFG.targets){ /* explicit target list */ }
   else if(CFG.yspan!=null){ for(let i=0;i<CFG.ny;i++) ys.push(M.centerY-CFG.yspan+2*CFG.yspan*i/(CFG.ny-1)); }
   else { for(let i=0;i<CFG.ny;i++) ys.push(M.postA+CFG.ym+(M.postB-M.postA-2*CFG.ym)*i/(CFG.ny-1)); }
   const zTop=CFG.zmax||2.44, zBot=CFG.zmin!=null?CFG.zmin:CFG.zm;
   for(let j=0;j<CFG.nz;j++) zs.push(zBot+(zTop-zBot)*j/(CFG.nz-1));
   const cells=[]; let fails=0; let setRef=null;
   const pairs=CFG.targets?CFG.targets.map(o=>[o.y,o.z,o.id||null]):[]; if(!CFG.targets){ for(const zT of zs) for(const yT of ys) pairs.push([yT,zT,null]); }
   for(const [yT,zT,ID] of pairs){
     const L=solve(yT,zT,curve); if(!L||!L.c||L.err>0.12){ fails++; cells.push({id:ID,y:+yT.toFixed(3),z:+zT.toFixed(3),unsolved:true,err:L?L.err:null}); continue; }
     const r=run(L,curve,yT,zT);
     const ref=fly(x0,y0,z0,L.L[0],L.L[1],L.L[2],curve,3.2,false,r.setX);   // free-flight keeper-plane position at the SET plane + goal-line crossing
     const ln=ref.line; const inFrame=!!(ln&&ln.y>M.postA&&ln.y<M.postB&&ln.z<2.44&&ln.z>=0);
     cells.push({id:ID,y:+yT.toFixed(3),z:+zT.toFixed(3),v0:+L.v0.toFixed(2),flight:+L.c.t.toFixed(4),err:+L.err.toFixed(4),bounces:L.c.bounces,zmax:+L.c.zmax.toFixed(2),
       crossSp:+L.c.sp.toFixed(2),plane:ref.plane,line:ln?{y:+ln.y.toFixed(3),z:+ln.z.toFixed(3),t:+ln.t.toFixed(4)}:null,inFrame,usable:+(L.c.t-r.latency).toFixed(4),...r});
   }
   return {cells,fails,latency:+latency.toFixed(4),ys:ys.map(v=>+v.toFixed(3)),zs:zs.map(v=>+v.toFixed(3)),target:CFG.target,planeX:+PLANE_X.toFixed(3),
           frozen:{posModel:GK_POSMODEL.active,setDepth:GK_SETDEPTH.active,actionModel:(typeof GK_ACTION!=="undefined")?GK_ACTION.model:"n/a",x3:PT_X3.active,sel:GK_REACH.selectPolicy,hand:t.gkHand,pol:t.gkMovePolicy},
           env:(function(){ const gk=ptGkMake(); gk.height=t.gkHeight/100; const e=gkEnvelope(t,gk,gk.height); return {comfortZ:+e.comfortZ.toFixed(3),maxLat:+e.maxLat.toFixed(3),maxVertUp:+e.maxVertUp.toFixed(3),maxVertDown:+e.maxVertDown.toFixed(3),highReachZ:+e.highReachZ.toFixed(3),standingReachZ:+e.standingReachZ.toFixed(3),handZ:+(gk.height*GK_CFG.handReachFrac).toFixed(3)}; })()};
 },{profile:PROFILE,dist:DIST,flight:FLIGHT!=null?+FLIGHT:null,usable:USABLE!=null?+USABLE:null,speed:SPEED!=null?+SPEED:null,family:FAM,spin:SPIN,ny:NY,nz:NZ,ym:YM,zm:ZM,zmax:opt("--zmax",null)?+opt("--zmax",null):null,yspan:YSPAN,zmin:ZMIN,targets:TARGETS,model:MODEL,x3:X3,target:TARGET});
 const meta={generated:new Date().toISOString(),url:URL,tag:TAG,profileName:PROFILES[PROF_ARG]?PROF_ARG:"custom",profile:PROFILE,dist:DIST,target:TARGET,flight:FLIGHT,usable:USABLE,speed:SPEED,family:FAM,spin:SPIN,ny:NY,nz:NZ,elapsedS:+((Date.now()-t0)/1000).toFixed(1),pageErrors:errs.slice(0,5)};
 fs.writeFileSync(OUT,JSON.stringify({meta,...data}));
 const on=data.cells.filter(c=>!c.unsolved); const inb=on;
 const contact=on.filter(c=>c.contact).length, held=on.filter(c=>c.contact&&c.contact.held).length, goals=on.filter(c=>c.goal).length;
 console.log(`[gk_envelope] ${meta.profileName} ${FAM} dist ${DIST} target ${TARGET}${TARGET==="plane"?"(x="+data.planeX+")":""} ${FLIGHT?"flight "+FLIGHT:USABLE?"usable "+USABLE:"speed "+SPEED}: ${on.length} cells (${data.fails} unsolved) | contact ${(100*contact/on.length).toFixed(0)}% | catch ${(100*held/on.length).toFixed(0)}% | goals ${(100*goals/on.length).toFixed(0)}% | latency ${data.latency}s | ${meta.elapsedS}s | errors ${errs.length}`);
 await b.close();
})();
