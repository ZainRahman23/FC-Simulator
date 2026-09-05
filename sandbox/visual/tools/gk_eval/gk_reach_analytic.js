#!/usr/bin/env node
// GOALKEEPER V1 — ANALYTICAL REACH ENVELOPE (read-only; no shots fired).
//
// Reads the LIVE envelope constants out of match.js for each keeper profile and derives the exact
// oval/superellipse the engine grants, in three clearly separated coordinate senses:
//   HAND CENTRE   the point gkEnvNorm() constrains:  (L/maxLat)^p + (dz/vMax)^p <= 1  about (feet, comfortZ)
//   FINGERTIP     hand centre + handR                (the hand collision sphere's outer surface)
//   BALL CENTRE   hand centre + handR + ballR        (a contact needs the two spheres to touch)
// Ball radius is added ONCE, at the ball-centre step. Nothing here is a shot result — the executed
// (empirical) envelope is measured separately by gk_reach_envelope.js.
//
// Usage: node gk_reach_analytic.js [--url ...] [--profiles K1P,K2P,K3P,COURTOIS] [--out analytic.json]
const fs=require("fs"), path=require("path");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","gk_reach_analytic.json");
const PROFS=opt("--profiles","K1P,K2P,K3P,COURTOIS").split(",");
const PROFILES={
  K1P:{reflexes:45,diving:45,handling:45,jumping:48,positioning:72,acceleration:68,speed:62,strength:72,height:183,weight:80},
  K2P:{reflexes:72,diving:72,handling:72,jumping:72,positioning:72,acceleration:68,speed:62,strength:72,height:190,weight:80},
  K3P:{reflexes:92,diving:92,handling:92,jumping:92,positioning:72,acceleration:68,speed:62,strength:72,height:197,weight:80},
  COURTOIS:{reflexes:96,diving:91,handling:95,jumping:68,positioning:72,acceleration:42,speed:52,strength:70,height:199,weight:96},
  COURTOIS_BANDMOVE:{reflexes:96,diving:91,handling:95,jumping:68,positioning:72,acceleration:68,speed:62,strength:72,height:199,weight:80},
  // height-decomposition controls (phase 16)
  K1_ATTR_COURTOIS_H:{reflexes:45,diving:45,handling:45,jumping:48,positioning:72,acceleration:68,speed:62,strength:72,height:199,weight:80},
  COURTOIS_ATTR_183H:{reflexes:96,diving:91,handling:95,jumping:68,positioning:72,acceleration:42,speed:52,strength:70,height:183,weight:96},
  // tier-free reference fixtures + style fixtures (attribute-system pass; same bundles as gk_profile_goalface.js)
  POOR:    {reflexes:45,diving:45,handling:45,jumping:48,positioning:72,acceleration:68,speed:62,strength:72,height:183,weight:80},
  AVERAGE: {reflexes:68,diving:68,handling:68,jumping:66,positioning:68,acceleration:70,speed:63,strength:73,height:188,weight:83},
  GOOD:    {reflexes:78,diving:78,handling:78,jumping:74,positioning:78,acceleration:72,speed:64,strength:74,height:190,weight:85},
  ELITE:   {reflexes:90,diving:90,handling:90,jumping:82,positioning:90,acceleration:74,speed:65,strength:76,height:192,weight:88},
  TALL_SLOW:       {reflexes:72,diving:78,handling:78,jumping:72,positioning:78,acceleration:50,speed:48,strength:80,height:200,weight:95},
  SHORT_EXPLOSIVE: {reflexes:92,diving:92,handling:70,jumping:88,positioning:78,acceleration:88,speed:80,strength:66,height:183,weight:78},
  HANDLER:         {reflexes:70,diving:70,handling:94,jumping:68,positioning:78,acceleration:62,speed:58,strength:74,height:188,weight:84},
  STOPPER:         {reflexes:92,diving:92,handling:58,jumping:82,positioning:78,acceleration:66,speed:60,strength:72,height:190,weight:86},
};
// --finite "0.2,0.3,0.4,0.5,0.7,1.0": FINITE-TIME envelope — for each usable time T the farthest hand-centre point in each
// direction (keeper plane: lateral × vertical about the hand rest) whose causal action time (gkActionTime, from rest, feet
// planted) is ≤ T and which lies inside the static envelope. Bisection along 36 directions; reported as a polyline + the
// lateral reach at comfort height, at 1.9 m and at the bar for each T.
const FINITE=(opt("--finite","")||"").split(",").map(Number).filter(x=>x>0);
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-ra-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"],protocolTimeout:600000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; if(i===899) throw new Error("page never became ready"); await new Promise(r=>setTimeout(r,100)); }
 const data=await p.evaluate((CFG)=>{
  if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt;
  const HANDR=GK_HAND[t.gkHand], BALLR=GOALFX.ballR, P=GK_REACH.envExp;
  const BAR=2.44;
  const out={consts:{handR:HANDR,ballR:BALLR,envExp:P,bar:BAR,handFwd:GK_REACH.handFwd,standingArm:GK_REACH.standingArm,
    comfortFrac:GK_REACH.comfortFrac,vertReachStand:GK_REACH.vertReachStand,jumpReachGain:GK_REACH.jumpReachGain,
    latSpanBase:GK_REACH.latSpanBase,latSpanGain:GK_REACH.latSpanGain,latHeightTerm:GK_REACH.latHeightTerm,
    vertDownBase:GK_REACH.vertDownBase,vertDownGain:GK_REACH.vertDownGain,vertUpFloor:GK_REACH.vertUpFloor,
    footFrac:GK_DIVE.footFrac,prepStepMax:GK_MOVE.m6PrepStepMax,handRestFrac:GK_CFG.handReachFrac},profiles:{}};
  for(const nm of CFG.order){ const Q=CFG.profiles[nm];
    ptReset(); t.gkCap="manual"; t.gkReflex=Q.reflexes; t.gkDiving=Q.diving; t.gkHandling=Q.handling; t.gkJump=Q.jumping;
    t.gkHeight=Q.height; t.gkWeight=Q.weight; t.gkAccel=Q.acceleration; t.gkSpeed=Q.speed; t.gkStrength=Q.strength; t.gkPos=72;
    const gk=ptGkMake(); gk.height=Q.height/100; const h=gk.height;
    const e=gkEnvelope(t,gk,h);
    // hand-centre superellipse: L(dz) = maxLat * (1 - |dz/vMax|^p)^(1/p)
    const Lhand=(z)=>{ const dz=z-e.comfortZ, vM=dz>=0?e.maxVertUp:e.maxVertDown; const r=Math.abs(dz)/vM;
      if(r>=1) return 0; return e.maxLat*Math.pow(1-Math.pow(r,P),1/P); };
    // ball-centre boundary = Minkowski sum of the hand-centre superellipse with a sphere of radius (handR+ballR):
    // numerically the max lateral ball-centre offset at height z is  max over hand heights zh of
    //   L(zh) + sqrt(R^2 - (z-zh)^2)   with R = handR + ballR
    const R=HANDR+BALLR;
    const Lball=(z)=>{ let best=0; for(let k=-200;k<=200;k++){ const dzh=R*k/200; const zh=z-dzh; const s=R*R-dzh*dzh; if(s<0) continue;
        const v=Lhand(zh)+Math.sqrt(s); if(v>best) best=v; } return best; };
    const Zball=(L,sign)=>{ // max (sign=+1) / min (sign=-1) ball-centre height reachable at lateral offset L
      let best=sign>0?-9:9; for(let k=0;k<=520;k++){ const z=-1.0+5.2*k/520; if(Lball(z)>=L-1e-6){ if(sign>0&&z>best)best=z; if(sign<0&&z<best)best=z; } } return best; };
    const heights=[0.10,0.40,0.80,1.20,1.50,1.80,2.00,2.20,2.35,2.44];
    const lats=[0,0.5,1.0,1.5,2.0,2.5,3.0];
    const rows=heights.map(z=>({z,handLat:+Lhand(z).toFixed(4),ballLat:+Lball(z).toFixed(4)}));
    const cols=lats.map(L=>({L,zMaxBall:+Zball(L,1).toFixed(4),zMinBall:+Zball(L,-1).toFixed(4),
      zMaxHand:+(function(){let b=-9;for(let k=0;k<=520;k++){const z=-1.0+5.2*k/520;if(Lhand(z)>=L-1e-6&&z>b)b=z;}return b;})().toFixed(4),
      zMinHand:+(function(){let b=9;for(let k=0;k<=520;k++){const z=-1.0+5.2*k/520;if(Lhand(z)>=L-1e-6&&z<b)b=z;}return b;})().toFixed(4)}));
    const maxHandZ=e.comfortZ+e.maxVertUp, minHandZ=e.comfortZ-e.maxVertDown;
    out.profiles[nm]={attrs:Q,
      env:{comfortZ:+e.comfortZ.toFixed(4),maxLat:+e.maxLat.toFixed(4),maxVertUp:+e.maxVertUp.toFixed(4),maxVertDown:+e.maxVertDown.toFixed(4),
           highReachZ:+e.highReachZ.toFixed(4),standingReachZ:+e.standingReachZ.toFixed(4),handRestZ:+e.handRestZ.toFixed(4)},
      anatomy:{heightM:+h.toFixed(3),
        standingFingertipZ:+(e.standingReachZ+HANDR).toFixed(4),          // arm up, no jump: hand centre + handR
        standingHandCentreZ:+e.standingReachZ.toFixed(4),
        jumpFingertipZ:+(e.highReachZ+HANDR).toFixed(4),
        jumpHandCentreZ:+e.highReachZ.toFixed(4),
        diveMaxHandCentreZ:+maxHandZ.toFixed(4),                          // == highReachZ when the jump term exceeds the floor
        diveMaxFingertipZ:+(maxHandZ+HANDR).toFixed(4),
        maxBallCentreZ:+(maxHandZ+R).toFixed(4),
        minHandCentreZ:+minHandZ.toFixed(4), minBallCentreZ:+(minHandZ-R).toFixed(4),
        aboveBar:{fingertipM:+(maxHandZ+HANDR-BAR).toFixed(4),ballCentreM:+(maxHandZ+R-BAR).toFixed(4),
                  legalTopBallCentre:+(BAR-BALLR).toFixed(4),ballCentreAboveLegalTop:+(maxHandZ+R-(BAR-BALLR)).toFixed(4)}},
      timing:{latency:+gkReactionLatency(t,gk).toFixed(4),
        handAccel:+(GK_ACTION.handAccelBase+GK_ACTION.handAccelReflexGain*gkShape01(Q.reflexes)).toFixed(3),
        latDrive:+(GK_ACTION.latAccelBase+GK_ACTION.latAccelGain*gkShape01(Q.diving)).toFixed(3),
        upDrive:+(GK_ACTION.upAccelBase+GK_ACTION.upAccelGain*gkShape01(Q.jumping)).toFixed(3),
        downDrive:+(GK_ACTION.downAccelBase+GK_ACTION.downAccelGain*gkShape01(Q.diving)).toFixed(3),
        load:+(GK_ACTION.loadTime-GK_ACTION.loadDivingGain*gkShape01(Q.diving)).toFixed(4),
        rootAccel:+(GK_MOVE.accelBase+GK_MOVE.accelGain*gkNorm01(Q.acceleration)).toFixed(3),
        rootVmax:+(GK_MOVE.vmaxBase+GK_MOVE.vmaxGain*gkNorm01(Q.speed)).toFixed(3),
        armReach:GK_ACTION.armReach,leanReach:GK_ACTION.leanReach},
      lateralByHeight:rows, heightByLateral:cols,
      // full boundary polyline for plotting (ball-centre and hand-centre), z from floor to ceiling
      boundary:(function(){ const arr=[]; for(let k=0;k<=420;k++){ const z=-1.0+5.2*k/420; const lh=Lhand(z), lb=Lball(z); if(lh>0||lb>0) arr.push([+z.toFixed(4),+lh.toFixed(4),+lb.toFixed(4)]); } return arr; })(),
      // coupling check: is max lateral available at max vertical?
      coupling:{latAtMaxVertHand:+Lhand(maxHandZ).toFixed(4),latAtComfort:+Lhand(e.comfortZ).toFixed(4),
                latAtBarHand:+Lhand(BAR).toFixed(4),latAtBarBall:+Lball(BAR).toFixed(4),
                latAt90pctVert:+Lhand(e.comfortZ+0.9*e.maxVertUp).toFixed(4)},
      finiteFull:+gkActionTime(t,{x:0,y:0,handZ:gk.handZ,attrs:gk.attrs},[0,e.maxLat,e.comfortZ],0).execT.toFixed(4),   // full-stretch execution time: hand from rest to (maxLat, comfortZ)
      finite:(function(){ if(!CFG.finite||!CFG.finite.length) return null; const res={};
        // keeper at rest at (0,0) facing −x; hand rest at (0, 0, handZ); a target in the keeper plane is (0, L, z)
        const gk2={x:0,y:0,handZ:gk.handZ,attrs:gk.attrs};
        const reachable=(L,z,T)=>{ const dz=z-e.comfortZ; const vM=dz>=0?e.maxVertUp:e.maxVertDown; const norm=Math.pow(Math.pow(Math.abs(L)/e.maxLat,P)+Math.pow(Math.abs(dz)/vM,P),1/P); if(norm>1) return false;
          return gkActionTime(t,gk2,[0,L,z],0).execT<=T; };
        for(const T of CFG.finite){ const poly=[];
          for(let k=0;k<36;k++){ const th=k*Math.PI*2/36; const dy=Math.cos(th), dzv=Math.sin(th);
            let lo=0,hi=4.0; for(let it=0;it<30;it++){ const mid=0.5*(lo+hi); const L=mid*dy, z=e.handRestZ+mid*dzv; if(z<0||z>4){ hi=mid; continue; } if(reachable(L,z,T)) lo=mid; else hi=mid; }
            poly.push([+(lo*dy).toFixed(4),+(e.handRestZ+lo*dzv).toFixed(4)]); }
          const latAt=(z)=>{ let lo=0,hi=4; for(let it=0;it<30;it++){ const mid=0.5*(lo+hi); if(reachable(mid,z,T)) lo=mid; else hi=mid; } return +lo.toFixed(4); };
          const upAt=(L)=>{ let lo=e.handRestZ,hi=4; for(let it=0;it<30;it++){ const mid=0.5*(lo+hi); if(reachable(L,mid,T)) lo=mid; else hi=mid; } return +lo.toFixed(4); };
          res[T]={poly,latAtComfort:latAt(e.comfortZ),latAt19:latAt(1.9),latAtBar:latAt(BAR),maxUpCentre:upAt(0),maxUpAt1m:upAt(1.0)}; }
        return res; })()};
  }
  return out;
 },{profiles:PROFILES,order:PROFS,finite:FINITE});
 fs.writeFileSync(OUT,JSON.stringify({generated:new Date().toISOString(),url:URL,...data},null,1));
 console.log("[analytic] consts",JSON.stringify(data.consts));
 for(const nm of PROFS){ const P=data.profiles[nm];
   console.log(`\n== ${nm} h=${P.anatomy.heightM} m  env comfortZ ${P.env.comfortZ} maxLat ${P.env.maxLat} up ${P.env.maxVertUp} down ${P.env.maxVertDown} p=${data.consts.envExp}`);
   console.log(`   standing fingertip ${P.anatomy.standingFingertipZ}  jump fingertip ${P.anatomy.jumpFingertipZ}  dive-max fingertip ${P.anatomy.diveMaxFingertipZ}  max BALL-CENTRE ${P.anatomy.maxBallCentreZ}`);
   console.log(`   above bar: fingertip ${P.anatomy.aboveBar.fingertipM} m  ball-centre ${P.anatomy.aboveBar.ballCentreM} m`);
   console.log(`   coupling: lateral at max vertical ${P.coupling.latAtMaxVertHand} m  vs at comfort ${P.coupling.latAtComfort} m  (at bar ${P.coupling.latAtBarHand} m)`);
   if(P.finite) for(const T of Object.keys(P.finite)){ const f=P.finite[T]; console.log(`   finite ${T}s: lateral@comfort ${f.latAtComfort}  @1.9 ${f.latAt19}  @bar ${f.latAtBar}  up@centre ${f.maxUpCentre}  up@1m ${f.maxUpAt1m}`); } }
 console.log("\npage errors",errs.length);
 await b.close();
})().catch(e=>{console.error("FAILED",e);process.exit(1)});
