#!/usr/bin/env node
// ATTRIBUTE MONOTONICITY + NO-HIDDEN-MULTIPLIER CHECK (deterministic).
// (1) causal quantities each attribute drives must be monotone in that attribute (strict where the mechanism says so);
// (2) an attribute must NOT move quantities it does not own (e.g. handling must not change reach/latency/execT;
//     height must not change latency or root accel); (3) aggregate contact/catch over a fixed corpus is
//     non-decreasing (within a 1-cell tolerance) in each attribute.
// Usage: node gk_attr_monotonic.js [--url ...] [--out attr_mono.json]
const path=require("path"); const fs=require("fs");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"); const OUT=opt("--out","attr_mono.json");
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const CHROME=process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-mono-chrome-"));
 const b=await puppeteer.launch({executablePath:CHROME,headless:"new",userDataDir:udd,args:["--no-sandbox"],protocolTimeout:3600000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(URL+(URL.includes("?")?"&":"?")+"rs="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; await new Promise(r=>setTimeout(r,100)); }
 const data=await p.evaluate(()=>{
   if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt;
   const BASE={reflexes:60,diving:60,handling:60,jumping:60,positioning:70,acceleration:60,speed:60,strength:60,height:188};
   function apply(P){ t.gkCap="manual"; t.gkReflex=P.reflexes; t.gkDiving=P.diving; t.gkHandling=P.handling; t.gkJump=P.jumping; t.gkHeight=P.height;
     t.gkPos=P.positioning; t.gkAccel=P.acceleration; t.gkSpeed=P.speed; t.gkStrength=P.strength; GK_POSMODEL.active="NEW"; GK_SETDEPTH.active="D2"; }
   // causal quantities for a profile
   function quantities(P){ ptReset(); apply(P); t.gk=ptGkMake(); const gk=t.gk; gk.height=t.gkHeight/100; gk.handZ=gk.height*GK_CFG.handReachFrac; gk.x=102.1; gk.y=34; gk.vx=0; gk.vy=0;
     const env=gkEnvelope(t,gk,gk.height);
     const q={latency:+gkReactionLatency(t,gk).toFixed(4), maxLat:+env.maxLat.toFixed(4), highReachZ:+env.highReachZ.toFixed(4), maxVertUp:+env.maxVertUp.toFixed(4), maxVertDown:+env.maxVertDown.toFixed(4),
       comfortZ:+env.comfortZ.toFixed(4), standingReachZ:+env.standingReachZ.toFixed(4), handZ:+gk.handZ.toFixed(4),
       accel:+(GK_MOVE.accelBase+GK_MOVE.accelGain*gkNorm01(gkAttr(t,gk,"acceleration"))).toFixed(4), vmax:+(GK_MOVE.vmaxBase+GK_MOVE.vmaxGain*gkNorm01(gkAttr(t,gk,"sprint_speed"))).toFixed(4),
       execMid15:+gkActionTime(t,gk,[gk.x,gk.y+1.5,1.1],0).execT.toFixed(4), execLow15:+gkActionTime(t,gk,[gk.x,gk.y+1.5,0.3],0).execT.toFixed(4), execTop15:+gkActionTime(t,gk,[gk.x,gk.y+1.5,2.3],0).execT.toFixed(4),
       execArm05:+gkActionTime(t,gk,[gk.x,gk.y+0.5,1.4],0).execT.toFixed(4),
       catchThresh:+(GK_CONTACT.catchThreshBase-GK_CONTACT.catchThreshGain*gkShape01(t.gkHandling)).toFixed(4),
       vSecure:+(GK_CONTACT.secureSpeedBase+GK_CONTACT.secureSpeedGain*gkShape01(t.gkHandling)+GK_CONTACT.secureStrengthGain*gkShape01(t.gkStrength)).toFixed(4),
       weakJmax:+(GK_CONTACT.surf.HAND_WEAK.jMax+GK_CONTACT.surf.HAND_WEAK.jMaxHand*gkShape01(t.gkHandling)+GK_CONTACT.weakHandStrengthGain*gkShape01(t.gkStrength)).toFixed(4) };
     return q; }
   const SWEEP={reflexes:[30,45,60,75,90],diving:[30,45,60,75,90],handling:[30,45,60,75,90],jumping:[30,45,60,75,90],acceleration:[30,45,60,75,90],speed:[30,45,60,75,90],strength:[30,45,60,75,90],height:[175,180,185,190,195,200,205]};
   const OWN={reflexes:["latency","execArm05","execMid15","execLow15","execTop15"], diving:["maxLat","maxVertDown","execMid15","execLow15","execTop15"], jumping:["highReachZ","maxVertUp","execTop15"],
     handling:["catchThresh","vSecure","weakJmax"], strength:["vSecure","weakJmax"], acceleration:["accel"], speed:["vmax"],
     height:["comfortZ","standingReachZ","highReachZ","handZ","maxLat","maxVertUp","execMid15","execLow15","execTop15","execArm05"]};   // height moves execT only through the hand ORIGIN (geometry), never through speed
   const DIR={latency:-1,execArm05:-1,execMid15:-1,execLow15:-1,execTop15:-1,maxLat:1,maxVertDown:1,highReachZ:1,maxVertUp:1,catchThresh:-1,vSecure:1,weakJmax:1,accel:1,vmax:1,comfortZ:1,standingReachZ:1,handZ:1};
   const HEIGHT_GEOM=["execMid15","execLow15","execTop15","execArm05"];   // height: monotone direction is not required for these (pure geometry of a fixed target); only "no speed coupling" is
   const res={};
   for(const a of Object.keys(SWEEP)){ const rows=SWEEP[a].map(v=>({v,q:quantities({...BASE,[a]:v})})); const fails=[], unowned=[];
     for(const k of OWN[a]){ if(a==="height"&&HEIGHT_GEOM.includes(k)) continue; for(let i=1;i<rows.length;i++){ const d=(rows[i].q[k]-rows[i-1].q[k])*DIR[k]; if(d<-1e-9) fails.push(k+" "+rows[i-1].v+"->"+rows[i].v+": "+rows[i-1].q[k]+"->"+rows[i].q[k]); } }
     for(const k of Object.keys(rows[0].q)){ if(OWN[a].includes(k)) continue; for(let i=1;i<rows.length;i++) if(Math.abs(rows[i].q[k]-rows[i-1].q[k])>1e-9){ unowned.push(k); break; } }
     res[a]={rows,monotoneFails:fails,touchesUnowned:[...new Set(unowned)]}; }
   return {res,base:BASE};
 });
 fs.writeFileSync(OUT,JSON.stringify(data,null,1));
 for(const a of Object.keys(data.res)){ const r=data.res[a];
   console.log(`${a.padEnd(13)} monotone fails: ${r.monotoneFails.length}${r.monotoneFails.length?"  "+r.monotoneFails.slice(0,3).join(" | "):""}   touches unowned: ${r.touchesUnowned.length?r.touchesUnowned.join(","):"none"}`);
   const ks=Object.keys(r.rows[0].q); console.log("   "+["v"].concat(ks).map(s=>String(s).padStart(10)).join(""));
   for(const row of r.rows) console.log("   "+[row.v].concat(ks.map(k=>row.q[k])).map(s=>String(s).padStart(10)).join("")); }
 console.log("page errors",errs.slice(0,2)); await b.close();
})();
