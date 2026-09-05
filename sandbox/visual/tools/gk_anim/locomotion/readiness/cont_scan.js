// CONTINUOUS-BALL SCENARIO SCAN (fixed build): R 22, readiness 3 s → ball slides across the bearing for 3 s (D metres total) → stops → readiness 3 s.
// Reports per facing: readiness-1/2 condition (L = residual step, C = converged), keeper movement duration/peak speed, drawn-frame changes per phase.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const URL=process.argv[2]; const OUTF=process.argv[3]; const R=+process.argv[4]||22;
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-cont-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const D of [-12,-10,-8,-7,-6,6,7,8,9,10,12,14]){
  const res={};
  for(const [d,deg] of Object.entries({west:180,"south-west":135,"north-west":225})){
    res[d]=await p.evaluate((deg,R,D)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
      const a=deg*Math.PI/180; ptGkFire({name:"CONT", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
      S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView();
      const ph=(f)=> f<120?0:(f<300?1:(f<480?2:3)); const st=[{},{},{},{}], fc=[0,0,0,0], vmax=[0,0,0,0], trav=[0,0,0,0]; let last=null, moveFrames=0, x1=0,y1=0, arrived=null; const step=D/180;
      for(let f=0;f<660;f++){ if(f>=300&&f<480){ S.pt.b.x+=step*(-Math.sin(a)); S.pt.b.y+=step*Math.cos(a); } ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
        const g=S.pt.gk, cur=S.gkAnim.cur, k=ph(f); const v=Math.hypot(g.vx,g.vy); if(f===120||f===480){x1=g.x;y1=g.y;}
        if(f>=300 && v>0.35) moveFrames++; if(f>=480 && arrived===null && g.state==="SET") arrived=f;
        st[k][cur.state]=(st[k][cur.state]||0)+1; vmax[k]=Math.max(vmax[k],v); const c=cur.clip?cur.clip.v.dir+(cur.clip.mirrored?"m":"")+"#"+cur.clip.pos:null; if(last!==null&&c!==last) fc[k]++; last=c;
        if(f===299||f===659){ trav[k]=Math.hypot(g.x-x1,g.y-y1); } }
      const cond=(k)=> vmax[k]<0.001?"C":(trav[k]<0.01?"L":"M");
      return {r1:cond(1), r2:cond(3), st2:st[2], fc1:fc[1], fc2:fc[2], fc3:fc[3], moveS:+(moveFrames/60).toFixed(2), arrivedS:arrived!==null?+((arrived-480)/60).toFixed(2):null, vmax2:+vmax[2].toFixed(2), trav3:+trav[3].toFixed(4), ballD:+Math.hypot(S.pt.b.x-S.pt.gk.x,S.pt.b.y-S.pt.gk.y).toFixed(1), dir:S.gkAnim.cur.dir}; },deg,R,D);
  }
  console.log(`R ${R} D ${String(D).padStart(3)} | `+Object.entries(res).map(([d,r])=>`${d.slice(0,2).toUpperCase()}: r1 ${r.r1}(${r.fc1}) move ${r.moveS}s vmax ${r.vmax2} shuffle-frames ${r.fc2} arrive+${r.arrivedS}s r2 ${r.r2}(${r.fc3}) end-dir ${r.dir.slice(0,2)}`).join(" | "));
  out.push({R,D,res});
}
fs.writeFileSync(OUTF,JSON.stringify(out)); await b.close();})();
