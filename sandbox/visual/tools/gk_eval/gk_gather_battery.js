// GROUND / LOW-BALL and CHEST batteries (controlled arrivals, production keeper, explicit profiles)
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const {GLIB}=require("./gk_gather_lib.js");
const BASE="http://127.0.0.1:8126/sandbox/visual/"; const PAGE=process.env.PAGE||"match.html"; const WHICH=process.env.WHICH||"ground"; const OUTF=process.env.OUTF||("gath/"+WHICH+".json");
const PROFS=(process.env.PROFS||"K1,K2,K3,COURTOIS").split(",");
// SWEEP="handling=40,50,60" [BASE=K1]: one attribute varied on a base profile (generated in-page from gather_lib PROFILES)
const SWEEP=process.env.SWEEP||null, SWEEPBASE=process.env.BASE||"K1";
async function waitReady(p){for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function");});if(ok)return;await new Promise(r=>setTimeout(r,100));}throw new Error("nr");}
(async()=>{
 const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-gath-"+WHICH+PAGE.replace(/[^a-z0-9]/gi,""),args:["--no-sandbox"],protocolTimeout:3600000});
 const p=await b.newPage(); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto(BASE+PAGE+"?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000}); await waitReady(p);
 const out=await p.evaluate(new Function("WHICH","PROFS","SWEEP","SWEEPBASE",`
  if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); ${GLIB}
  if(SWEEP){ const [attr,vals]=SWEEP.split("="); const base=PROFILES[SWEEPBASE]; PROFS=[SWEEPBASE]; for(const v of vals.split(",").map(Number)){ const nm=SWEEPBASE+"__"+attr+"_"+v; PROFILES[nm]={...base,[attr]:v}; PROFS.push(nm); } }
  const rows=[]; const SD=12; // shooter object parked 12 m out (irrelevant to the ball)
  // the SET plane (identical for every profile because gk_positioning is held at 72): solve once
  const set0=setup(PROFILES.K1,SD); const X=set0[0], Y=set0[1];
  const cells=[];
  if(WHICH==="ground"){
    const SP=[1,2,3,4,5,6,8,10,12,15], LAT=[0,0.25,-0.25,0.5,-0.5,0.75,-0.75,1.0,-1.0];
    for(const sp of SP) for(const lat of LAT){ cells.push({mode:"roll",sp,z:0.11,lat}); if(sp>=5) cells.push({mode:"rollNear",sp,z:0.11,lat});
      for(const z of [0.10,0.20,0.35,0.50,0.70]){ if(sp>=4) cells.push({mode:"air",sp,z:Math.max(z,0.12),lat}); if(sp>=2&&sp<=8&&z>=0.2) cells.push({mode:"drop",sp,z,lat}); if(sp>=4&&sp<=12&&z<=0.35) cells.push({mode:"bounce",sp,z:Math.max(z,0.12),lat}); } }
  } else {
    const SP=[8,10,12,15,18,20,22,24,26,28,30,32], LAT=[0,0.1,-0.1,0.2,-0.2,0.3,-0.3,0.4,-0.4];
    const HF={stomach:0.55,lowerChest:0.62,sternum:0.70,upperChest:0.78,shoulder:0.85,head:0.92};
    for(const sp of SP) for(const [hn,hf] of Object.entries(HF)) for(const lat of LAT){ cells.push({mode:"air",sp,hf,hn,lat}); if(sp>=18) cells.push({mode:"air",sp,hf,hn,lat,dist:12}); }
  }
  // solve each arrival once (keeper inert) — per profile the height fraction differs only for chest (keeper height)
  for(const c of cells){
    for(const pn of PROFS){ const P=PROFILES[pn]; if(!P) continue;
      const z=c.hf!=null?+(c.hf*P.height/100).toFixed(3):c.z;
      setup(P,SD); const L=solveArrival(c.mode,c.sp,z,c.lat,X,Y,c.dist); if(!L){ rows.push({...c,z,profile:pn,fail:true}); continue; }
      const arr=L.arr||arrive(L.x0,L.y0,L.z0,L.vx,L.vy,L.vz,X);
      const r=runArrival(P,L,SD,300);
      rows.push({...c,z,profile:pn,arr,launch:{x0:+L.x0.toFixed(2),d:L.d,v0:+Math.hypot(L.vx,L.vy,L.vz).toFixed(2)},...r}); } }
  return {rows,setX:X,setY:Y,profiles:PROFS,sweep:SWEEP,base:SWEEPBASE};`),WHICH,PROFS,SWEEP,SWEEPBASE);
 fs.writeFileSync(OUTF,JSON.stringify(out));
 const ok=out.rows.filter(r=>!r.fail); console.log("[gather] %s: %d rows (%d unsolved) set (%s,%s) errs %s",WHICH,out.rows.length,out.rows.length-ok.length,out.setX.toFixed(2),out.setY.toFixed(2),JSON.stringify(errs.slice(0,2)));
 await b.close();
})();
