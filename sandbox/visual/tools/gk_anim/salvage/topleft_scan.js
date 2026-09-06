// Find a representative FAR TOP-LEFT CORNER save (north post, bar height) and report the screen vector of the committed target.
//   node topleft_scan.js
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const PROBES=[]; for(const lat of [-1.9,-2.3,-2.7]) for(const z of [1.9,2.15,2.35]) for(const v of [26,30]) PROBES.push({lat,z,v});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-tls-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
for(const c of PROBES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=[101.7-20,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:"TL", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y);
    let vec=null; if(committed){ const tp=sproj3(committed.target[0],committed.target[2],committed.target[1]); const dx=tp.x-q.x, dy=tp.y-q.y, n=Math.hypot(dx,dy)||1;
      vec={unit:[+(dx/n).toFixed(3), +(dy/n).toFixed(3)], degAboveHoriz:+(Math.atan2(-dy,dx)*180/Math.PI).toFixed(1), px:+n.toFixed(1)}; }
    return {cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,L:cls.L,norm:cls.norm,goalSide:cls.goalSide,bestEffort:cls.bestEffort}:null,
            committed: committed?{tier:committed.tier,action:committed.action,target:committed.target.map(v=>+v.toFixed(2))}:null, vec, contact}; }, c);
  const cl=g.cls;
  console.log(`lat ${c.lat} z ${c.z} v ${c.v} | ${cl?cl.family+" "+cl.hClass+" norm "+cl.norm+" L "+cl.L+" "+cl.goalSide+(cl.bestEffort?" BEST-EFFORT":""):"-"} | ${g.committed?g.committed.tier+"/"+g.committed.action:"-"} | reach ${g.vec?JSON.stringify(g.vec.unit)+" "+g.vec.degAboveHoriz+"deg "+g.vec.px+"px":"-"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
await b.close();})();
