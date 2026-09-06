// ART_MISSING HUNT on the plain default page: (1) every built-in GK scenario, (2) a grid of real kicks from realistic origins/aims/
// techniques with the keeper allowed to settle into his real positioning for the ball before the strike. For every case that ends in
// the AIRBORNE_DIVE diagnostic (no contextual pick), the complete selector readout is recorded. No runtime change, no screenshots.
//   node art_missing_hunt.js <out.json> [settleTicks]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const OUT=process.argv[2]||"hunt.json"; const SETTLE=+(process.argv[3]||120);
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-hunt-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto((process.env.GK_PAGE||"http://127.0.0.1:8126/sandbox/visual/match.html")+"?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const res=await p.evaluate((SETTLE)=>{
  if(!(S.pt&&S.pt.on))ptEnter();
  const A=S.gkAnim;
  function record(tag, setup){
    const gk=S.pt.gk, cm=A.commit, cls=cm&&cm.cls, ctx=cm&&cm.ctx, cur=A.cur, c=gk.committed;
    return {tag, setup, family:cls?cls.family:null, cls:cls?{side:cls.side, goalSide:cls.goalSide, hClass:cls.hClass, z:cls.z, zH:cls.zH, L:cls.L, lat:cls.lat, norm:cls.norm, maxLat:cls.maxLat, bestEffort:cls.bestEffort, nearMax:cls.expr?cls.expr.nearMax:null, action:cls.action, tier:cls.tier, feetPlanted:cls.feetPlanted}:null,
      facingAtCommitDeg:cm?+(cm.facing*180/Math.PI).toFixed(1):null, dir:cm?cm.dir:null, situation:ctx?ctx.situation:null, scored:ctx?ctx.scored:null, pick:ctx&&ctx.pick?{id:ctx.pick.id,score:ctx.pick.score}:null, baseline:ctx?ctx.baseline:null,
      art:cur?cur.artLabel:null, state:cur?cur.state:null, keeperAtCommit:c?c.feet.map(v=>+v.toFixed(2)):null, target:c?c.target.map(v=>+v.toFixed(2)):null, shooter:S.pt.p?[+S.pt.p.x.toFixed(2),+S.pt.p.y.toFixed(2)]:null};
  }
  function runToCommit(maxT){ let t=0; while(t<maxT){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed && A.commit && A.commit.ctx!==undefined) { ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); return t; } if(!gk.shotActive && t>30) return -t; } return -maxT; }
  const out={scenarios:[], grid:[]};
  // (1) real-kick grid — run FIRST: a scenario that pins a capability band (S4 fixtures) leaves it set across ptReset with the keeper settled on the ball's position first (normal positioning), then the strike
  const XS=[84,88,92,96,100], YS=[22,28,34,40,46], AIMS=[30.8,32.3,34,35.7,37.2], TECHS=["LACES","POWER","CHIP"], CS=[0.55,0.8];
  for(const x of XS) for(const y of YS) for(const ay of AIMS) for(const tech of TECHS) for(const c of CS){
    ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
    const origin=[x,y];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
    for(let k=0;k<SETTLE;k++){ ptStep(); }                       // the keeper takes up his real position/facing for this ball
    const gk0=[+S.pt.gk.x.toFixed(2),+S.pt.gk.y.toFixed(2),+(S.pt.gk.facing*180/Math.PI).toFixed(1)];
    ptGkFire({name:"HUNT", origin, aim:[105,ay], tech, c}); gkAnimResetView(); S.pt.paused=false;
    const t=runToCommit(300);
    out.grid.push({ticks:t, gk0, ...record("grid", {origin, aim:[105,ay], tech, c})});
  }
  // (2) built-in scenarios (some pin a keeper capability band that persists afterwards)
  for(let idx=0; idx<GK_SCENARIOS.length; idx++){
    ptReset(); S.pt.paused=true; ptGkScenario(idx); S.pt.paused=true; gkAnimResetView(); S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.pauseAtContact=false; S.pt.paused=false;
    const t=runToCommit(300); out.scenarios.push({idx, name:GK_SCENARIOS[idx].name, ticks:t, ...record("scenario", {idx, name:GK_SCENARIOS[idx].name})});
  }
  return out;
}, SETTLE);
fs.writeFileSync(OUT, JSON.stringify(res,null,1));
const all=[...res.scenarios,...res.grid]; const dives=all.filter(r=>r.family==="AIRBORNE_DIVE"); const miss=dives.filter(r=>!r.pick);
console.log(`cases ${all.length} (scenarios ${res.scenarios.length}, grid ${res.grid.length}) | AIRBORNE_DIVE ${dives.length} | ART_MISSING (no pick) ${miss.length}`);
const byKey={}; for(const r of miss){ const k=`${r.cls.side}/${r.cls.goalSide}/${r.cls.hClass}/${r.dir}`; byKey[k]=(byKey[k]||0)+1; }
console.log("ART_MISSING by keeperSide/goalSide/height/facingDir:", JSON.stringify(byKey));
for(const r of miss.slice(0,12)){
  const s=r.situation||{}; console.log(`\n== ${r.tag} ${JSON.stringify(r.setup)} | keeper@commit ${JSON.stringify(r.keeperAtCommit)} facing ${r.facingAtCommitDeg} (${r.dir}) bearing-to-shooter ${s.facingDeg} | ${r.cls.hClass} z ${r.cls.z} L ${r.cls.L} lat ${r.cls.lat} norm ${r.cls.norm} best ${r.cls.bestEffort} | ${r.cls.tier}/${r.cls.action}`);
  for(const sc of (r.scored||[])) console.log(`   ${sc.id.padEnd(20)} ${String(sc.score).padEnd(6)} ${sc.why}`);
}
await b.close();})();
