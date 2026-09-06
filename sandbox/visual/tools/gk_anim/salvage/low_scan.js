// Which synthetic low balls make the simulation commit a LOW_COLLAPSE / low AIRBORNE_DIVE (not a gather, not a foot save)? Default page.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-lows-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const [fname,deg] of [["west",180],["south-west",135],["north-west",225]]) for(const lat of [-1.8,-1.4,-1.0,1.0,1.4,1.8]) for(const z of [0.25,0.5]) for(const v of [22,26]){
  const r=await p.evaluate((deg,lat,z,v)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const a=deg*Math.PI/180, R=20, origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:"LOW", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat, z, v}}); gkAnimResetView(); S.pt.paused=false;
    let ticks=0, committed=null, cls=null, contact=null;
    while(ticks<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); ticks++; const g=S.pt.gk; if(g.committed&&!committed) committed=g.committed; if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls; if(g.contact){ contact={outcome:g.contact.outcome,volume:g.contact.volume}; break; } if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.2) break; }
    S.pt.paused=true; if(!committed) return {none:true};
    const c=committed, pf=sproj3(c.feet[0],0,c.feet[1]), pt=sproj3(c.target[0],c.target[2],c.target[1]); const rx=pt.x-pf.x, ry=pt.y-pf.y, rn=Math.hypot(rx,ry)||1e-6;
    return {tier:c.tier, action:c.action, gather:!!c.gather, target:c.target.map(x=>+x.toFixed(2)), feet:c.feet.map(x=>+x.toFixed(2)), cls:cls?{family:cls.family,zClass:cls.zClass,hClass:cls.hClass,zH:cls.zH,goalSide:cls.goalSide,L:cls.L,norm:cls.norm}:null, reach:[+(rx/rn).toFixed(2),+(ry/rn).toFixed(2)], reachPx:+rn.toFixed(0), contact}; }, deg, lat, z, v);
  out.push({facing:fname,lat,z,v,...r}); if(!r.none) console.log(fname.padEnd(10),"lat",lat,"z",z,"v",v,"|",r.tier,r.action,"| fam",r.cls&&r.cls.family,r.cls&&r.cls.zClass,"L",r.cls&&r.cls.L,"norm",r.cls&&r.cls.norm,r.cls&&r.cls.goalSide,"| reach",r.reach,r.reachPx+"px","| contact",r.contact&&r.contact.outcome);
}
fs.writeFileSync("low_scan.json",JSON.stringify(out,null,1)); await b.close();})();
