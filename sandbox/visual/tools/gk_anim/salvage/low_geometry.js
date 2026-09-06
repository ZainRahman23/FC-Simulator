// Desired screen-space reach for low saves per facing and goal side, from REAL synthetic shots on the default page (no drawing changes):
// keeper positioned for a shooter at the SW / W / NW bearing (20 m), synthetic low ball passing 1.2 m along the goal line to each side.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-lowg-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const out=[];
for(const [fname,deg] of [["south-west",135],["west",180],["north-west",225]]) for(const [side,lat] of [["GOAL_LEFT",-1.2],["GOAL_RIGHT",1.2]]) for(const z of [0.3]){
  const r=await p.evaluate((deg,lat,z)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const a=deg*Math.PI/180, R=20, origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const f0=S.pt.gk.facing; ptGkFire({name:"LOW", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat, z, v:16}}); gkAnimResetView(); S.pt.paused=false;
    let ticks=0, committed=null, cls=null, contact=null, ctx=null;
    while(ticks<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); ticks++; const g=S.pt.gk; if(g.committed&&!committed) committed=g.committed; if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls){ cls=S.gkAnim.commit.cls; ctx=S.gkAnim.commit.ctx; } if(g.contact){ contact={outcome:g.contact.outcome,volume:g.contact.volume,tick:ticks}; break; } if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime) break; }
    S.pt.paused=true; const c=committed; const pf=sproj3(c.feet[0],0,c.feet[1]), pt=sproj3(c.target[0],c.target[2],c.target[1]); const rx=pt.x-pf.x, ry=pt.y-pf.y, rn=Math.hypot(rx,ry)||1e-6;
    const gk=S.pt.gk, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, q=sproj3(gk.x,0,gk.y);
    return {origin:origin.map(v=>+v.toFixed(1)), facingDeg:+(f0*180/Math.PI).toFixed(1), facingAtCommitDeg:+(S.gkAnim.commit?S.gkAnim.commit.facing*180/Math.PI:0).toFixed(1), facingBin:headingToDir(f0*180/Math.PI), feet:c.feet.map(v=>+v.toFixed(2)), target:c.target.map(v=>+v.toFixed(2)), tier:c.tier, action:c.action, cls:cls?{family:cls.family,zClass:cls.zClass,hClass:cls.hClass,zH:cls.zH,goalSide:cls.goalSide,L:cls.L,lat:cls.lat,dz:cls.dz,norm:cls.norm}:null, reach:[+(rx/rn).toFixed(3),+(ry/rn).toFixed(3)], reachPx:+rn.toFixed(1), contact, rootAtPause:[+gk.x.toFixed(2),+gk.y.toFixed(2)], handScreenRelRoot: hn?[+(hn.x-q.x).toFixed(1),+(hn.y-q.y).toFixed(1)]:null, art:S.gkAnim.cur&&S.gkAnim.cur.artLabel, ctxPick: ctx&&ctx.pick?ctx.pick.id:null}; }, deg, lat, z);
  out.push({facing:fname,side,lat,z,...r}); console.log(fname,side,"| facing",r.facingDeg,r.facingBin,"at commit",r.facingAtCommitDeg,"| target",r.target,r.tier,r.action,"| cls",r.cls,"| screen reach",r.reach,r.reachPx+"px","| hand rel root",r.handScreenRelRoot,"| contact",r.contact&&r.contact.outcome,"| art",r.art&&r.art.slice(0,60));
}
fs.writeFileSync("low_geometry.json",JSON.stringify(out,null,1)); await b.close();})();
