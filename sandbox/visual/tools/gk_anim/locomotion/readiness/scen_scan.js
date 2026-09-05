// SCENARIO SCAN (fixed build): for R × nudge, run settle 2 s → readiness 3 s → nudge → ~3 s → readiness 3 s for W/SW/NW without screenshots.
// Reports per facing: readiness-1 condition, movement duration, readiness-2 condition, animation states per phase, drawn-frame changes per phase.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const URL=process.argv[2]; const OUTF=process.argv[3];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-scen-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const R of [20,22,24,26]) for(const NUDGE of [5,6,7,8,9]){
  const res={};
  for(const [d,deg] of Object.entries({west:180,"south-west":135,"north-west":225})){
    res[d]=await p.evaluate((deg,R,NUDGE)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
      const a=deg*Math.PI/180; ptGkFire({name:"SCEN", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
      S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView();
      const ph=(f)=> f<120?0:(f<300?1:(f<480?2:3)); const st=[{},{},{},{}], fc=[0,0,0,0], vmax=[0,0,0,0], trav=[0,0,0,0]; let last=null, moveFrames=0, x1=0,y1=0, arrived=null;
      for(let f=0;f<660;f++){ if(f===300){ S.pt.b.x+=NUDGE*(-Math.sin(a)); S.pt.b.y+=NUDGE*Math.cos(a); } ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
        const g=S.pt.gk, cur=S.gkAnim.cur, k=ph(f); const v=Math.hypot(g.vx,g.vy); if(f===120||f===480){x1=g.x;y1=g.y;}
        if(f>=300 && v>0.35) moveFrames++; if(f>=300 && arrived===null && g.state==="SET" && f>320) arrived=f;
        st[k][cur.state]=(st[k][cur.state]||0)+1; vmax[k]=Math.max(vmax[k],v); const c=cur.clip?cur.clip.v.dir+(cur.clip.mirrored?"m":"")+"#"+cur.clip.pos:null; if(last!==null&&c!==last) fc[k]++; last=c;
        if(f===299||f===659){ trav[k]=Math.hypot(g.x-x1,g.y-y1); } }
      const cond=(k)=> vmax[k]<0.001?"C":(trav[k]<0.01?"L":"M");
      return {r1:cond(1), r2:cond(3), st1:st[1], st3:st[3], fc1:fc[1], fc2:fc[2], fc3:fc[3], moveS:+(moveFrames/60).toFixed(2), arrivedS:arrived!==null?+((arrived-300)/60).toFixed(2):null, vmax2:+vmax[2].toFixed(2), trav1:+trav[1].toFixed(4), trav3:+trav[3].toFixed(4)}; },deg,R,NUDGE);
  }
  const line=`R ${R} nudge ${NUDGE} | `+Object.entries(res).map(([d,r])=>`${d.slice(0,2).toUpperCase()}: ready1 ${r.r1} (frames ${r.fc1}) move ${r.moveS}s arrive ${r.arrivedS}s ready2 ${r.r2} (frames ${r.fc3})`).join(" | ");
  console.log(line); out.push({R,NUDGE,res});
}
fs.writeFileSync(OUTF,JSON.stringify(out)); await b.close();})();
