// DISTANCE SCAN at the live camera: for each bearing and ball distance, park the ball, run 5 s, report the controller condition
// (converged |v|=0 vs residual limit cycle), the animation states, odometer rate and frame changes. Page loop paused; manual 60 Hz steps.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const URL=process.argv[2]; const OUTF=process.argv[3];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-scan-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const [name,deg] of [["west",180],["south-west",135],["north-west",225],["south",90],["north",270],["south-east",45],["north-east",315]]){
  const line=[];
  for(let R=8;R<=32;R+=2){
    const r=await p.evaluate((deg,R)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
      const a=deg*Math.PI/180; ptGkFire({name:"SCAN", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
      S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView();
      const st={}; let vmin=1e9,vmax=0,odo0=null,clipCh=0,last=null,x0=0,y0=0; let dir=null;
      for(let f=0;f<300;f++){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); if(f<120){ if(f===119){odo0=S.gkAnim.odo; x0=S.pt.gk.x; y0=S.pt.gk.y;} continue; }
        const g=S.pt.gk, cur=S.gkAnim.cur; const v=Math.hypot(g.vx,g.vy); vmin=Math.min(vmin,v); vmax=Math.max(vmax,v); st[cur.state]=(st[cur.state]||0)+1; dir=cur.dir;
        const c=cur.clip?cur.clip.name+"/"+cur.clip.v.dir+(cur.clip.mirrored?"m":"")+"#"+cur.clip.pos:null; if(last!==null&&c!==last) clipCh++; last=c; }
      return {dir, st, vmin:+vmin.toFixed(3), vmax:+vmax.toFixed(3), odoRate:+((S.gkAnim.odo-odo0)/3).toFixed(3), travel:+Math.hypot(S.pt.gk.x-x0,S.pt.gk.y-y0).toFixed(4), clipCh, simState:S.pt.gk.state, gx:+S.pt.gk.x.toFixed(2), gy:+S.pt.gk.y.toFixed(2)}; },deg,R);
    const cond = r.vmax<0.001 ? "CONVERGED" : (r.travel<0.01 ? "LIMIT-CYCLE" : "MOVING");
    line.push(`${String(R).padStart(2)}m ${cond[0]}${r.dir!==name?"(dir "+r.dir+")":""}`);
    out.push({name,deg,R,cond,...r});
  }
  console.log(name.padEnd(11), line.join(" | "));
}
console.log("\nC = converged (|v|=0, static hold)   L = limit cycle (|v|>0, net travel < 1 cm → odometer runs → shuffle frames cycle slowly)   M = still moving");
for(const o of out.filter(o=>o.cond!=="CONVERGED")) console.log(o.name.padEnd(11), o.R+"m", o.cond, "dir",o.dir,"states",JSON.stringify(o.st),"|v|",o.vmin+".."+o.vmax,"odo/s",o.odoRate,"travel",o.travel,"clip changes/3s",o.clipCh);
fs.writeFileSync(OUTF, JSON.stringify(out)); await b.close();})();
