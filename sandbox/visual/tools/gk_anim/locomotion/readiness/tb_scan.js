// THERE-AND-BACK SCAN (fixed build, R 22): readiness 3 s → ball slides A m across the bearing over 1.5 s and back over 1.5 s → readiness 3 s.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const URL=process.argv[2]; const OUTF=process.argv[3]; const R=+process.argv[4]||22;
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-tb-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto(URL+(URL.includes("?")?"&":"?")+"r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const A of [4,5,6,7,8,10]){
  const res={};
  for(const [d,deg] of Object.entries({west:180,"south-west":135,"north-west":225})){
    res[d]=await p.evaluate((deg,R,A)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1;
      const a=deg*Math.PI/180; ptGkFire({name:"TB", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}});
      S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.b.z=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; S.pt.paused=true; gkAnimResetView();
      const ph=(f)=> f<120?0:(f<300?1:(f<480?2:3)); const st=[{},{},{},{}], fc=[0,0,0,0], vmax=[0,0,0,0], trav=[0,0,0,0], dirs=new Set(); let last=null, moveFrames=0, x1=0,y1=0, travelTot=0, px=null,py=null; const step=A/90;
      for(let f=0;f<660;f++){ if(f>=300&&f<390){ S.pt.b.x+=step*(-Math.sin(a)); S.pt.b.y+=step*Math.cos(a); } else if(f>=390&&f<480){ S.pt.b.x-=step*(-Math.sin(a)); S.pt.b.y-=step*Math.cos(a); } ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60);
        const g=S.pt.gk, cur=S.gkAnim.cur, k=ph(f); const v=Math.hypot(g.vx,g.vy); if(f===120||f===480){x1=g.x;y1=g.y;} if(k===2){ if(px!==null) travelTot+=Math.hypot(g.x-px,g.y-py); px=g.x; py=g.y; }
        if(f>=300 && v>0.35) moveFrames++; dirs.add(cur.dir);
        st[k][cur.state]=(st[k][cur.state]||0)+1; vmax[k]=Math.max(vmax[k],v); const c=cur.clip?cur.clip.v.dir+(cur.clip.mirrored?"m":"")+"#"+cur.clip.pos:null; if(last!==null&&c!==last) fc[k]++; last=c;
        if(f===299||f===659){ trav[k]=Math.hypot(g.x-x1,g.y-y1); } }
      const cond=(k)=> vmax[k]<0.001?"C":(trav[k]<0.01?"L":"M");
      return {r1:cond(1), r2:cond(3), st2:st[2], st3:st[3], fc1:fc[1], fc2:fc[2], fc3:fc[3], moveS:+(moveFrames/60).toFixed(2), vmax2:+vmax[2].toFixed(2), travel2:+travelTot.toFixed(2), dirs:[...dirs].join("/")}; },deg,R,A);
  }
  console.log(`R ${R} A ${String(A).padStart(2)} | `+Object.entries(res).map(([d,r])=>`${d.slice(0,2).toUpperCase()}: r1 ${r.r1}(${r.fc1}) move ${r.moveS}s vmax ${r.vmax2} path ${r.travel2}m frames ${r.fc2} r2 ${r.r2}(${r.fc3}) dirs ${r.dirs} st3 ${JSON.stringify(r.st3)}`).join(" | "));
  out.push({R,A,res});
}
fs.writeFileSync(OUTF,JSON.stringify(out)); await b.close();})();
