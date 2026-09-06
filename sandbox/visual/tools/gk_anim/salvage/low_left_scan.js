// Find LOW airborne saves (0.25-0.60 m contact) to the keeper's physical LEFT at three demand levels.  node low_left_scan.js
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const PROBES=[]; for(const lat of [1.6,1.9,2.2,2.5,2.9,3.3]) for(const z of [0.30,0.45,0.58]) PROBES.push({lat,z,v:24});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-lls-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
for(const c of PROBES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=[101.7-20,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:"LL", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    return {cls: cls?{family:cls.family,hClass:cls.hClass,side:cls.side,goalSide:cls.goalSide,z:cls.z,zH:cls.zH,L:cls.L,norm:cls.norm,bestEffort:cls.bestEffort}:null,
      committed: committed?{tier:committed.tier,action:committed.action}:null, contact}; }, c);
  const cl=g.cls;
  console.log(`lat ${String(c.lat).padStart(4)} z ${c.z} | ${cl?(cl.family+" "+cl.hClass).padEnd(22)+" side "+String(cl.side).padEnd(6)+" z "+String(cl.z).padEnd(6)+" L "+String(cl.L).padEnd(6)+" norm "+String(cl.norm).padEnd(6)+(cl.bestEffort?"BEST-EFFORT":"           "):"-"} | ${g.committed?(g.committed.tier+"/"+g.committed.action).padEnd(30):"-"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
await b.close();})();
