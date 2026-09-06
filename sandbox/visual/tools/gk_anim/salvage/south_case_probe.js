// Probe the real camera basis and one representative FAR SOUTH (keeper's left / GOAL_RIGHT) airborne save, for building a pose guide.
//   node south_case_probe.js <outfile.json>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const CASES=[{lat:1.9,z:1.30,v:24},{lat:2.1,z:1.45,v:25},{lat:2.3,z:1.20,v:24}];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-scp-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=[101.7-20,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:"S", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
    const P=(x,z,y)=>{const q=sproj3(x,z,y); return [+q.x.toFixed(2), +q.y.toFixed(2)];};
    const o=P(gk.x,0,gk.y);
    const basis={ x:[+(P(gk.x+1,0,gk.y)[0]-o[0]).toFixed(3), +(P(gk.x+1,0,gk.y)[1]-o[1]).toFixed(3)],
                  y:[+(P(gk.x,0,gk.y+1)[0]-o[0]).toFixed(3), +(P(gk.x,0,gk.y+1)[1]-o[1]).toFixed(3)],
                  z:[+(P(gk.x,1,gk.y)[0]-o[0]).toFixed(3), +(P(gk.x,1,gk.y)[1]-o[1]).toFixed(3)] };
    return {feetXY:[+gk.x.toFixed(3), +gk.y.toFixed(3)], height:+(gk.height||1.83).toFixed(2), spriteScale:+s.toFixed(4), basis,
      committed: committed?{target:committed.target.map(v=>+v.toFixed(3)), feet:committed.feet.map(v=>+v.toFixed(3)), tier:committed.tier, action:committed.action}:null,
      cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,L:cls.L,norm:cls.norm,goalSide:cls.goalSide,lat:cls.lat,dz:cls.dz,bestEffort:cls.bestEffort}:null,
      handNow: gk.handNow?gk.handNow.map(v=>+v.toFixed(3)):null, contact}; }, c);
  out.push({...c, ...g});
  const cl=g.cls; console.log(`lat ${c.lat} z ${c.z} v ${c.v} | ${cl?cl.family+" "+cl.hClass+" norm "+cl.norm+" L "+cl.L+" "+cl.goalSide:"-"} | ${g.committed?g.committed.tier+"/"+g.committed.action:"-"} | target ${g.committed?JSON.stringify(g.committed.target):"-"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
console.log("basis", JSON.stringify(out[0].basis), "spriteScale", out[0].spriteScale);
fs.writeFileSync(process.argv[2]||"south_case.json", JSON.stringify(out,null,1));
await b.close();})();
