// Find a representative NORTH (GOAL_LEFT) medium-high AIRBORNE_DIVE with a contact, on the default page.
// Prints the simulation's own classification for each probe; no art involved.  node north_dive_scan.js
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const PROBES=[];
for(const lat of [-1.4,-1.7,-2.0]) for(const z of [1.0,1.2,1.45]) for(const v of [22,25]) PROBES.push({lat,z,v});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-nds-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
for(const c of PROBES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=[101.7-20,34];                                            // straight in front of goal, 20 m out (west of the keeper)
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:"N", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, contact=null;
    while(t<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused) { if(gk.contact) contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    return {cls: cls?{family:cls.family,zClass:cls.zClass,hClass:cls.hClass,z:cls.z,zH:cls.zH,goalSide:cls.goalSide,L:cls.L,dz:cls.dz}:null,
            committed: committed?{tier:committed.tier,action:committed.action,target:committed.target.map(v=>+v.toFixed(2))}:null, contact, ticks:t}; }, c);
  console.log(`lat ${c.lat} z ${c.z} v ${c.v} | ${g.cls?g.cls.family+" "+g.cls.hClass+" z "+g.cls.z+" L "+g.cls.L+" "+g.cls.goalSide:"-"} | ${g.committed?g.committed.tier+" "+g.committed.action:"-"} | ${g.contact?g.contact.volume+" "+g.contact.outcome+" @"+g.contact.tick:"no contact"}`);
}
await b.close();})();
