// TOP-LEFT CORNER rotation/scale test (presentation only) for the raw Pro SOUTH sprite: the raw pose and its 35/45/50/55-degree
// clockwise rotations are drawn into ONE identical far top-left-corner save, at the simulation's own root and its own contact tick,
// at the sprite's measured body scale. The simulation runs untouched; the live default page is unchanged (candidates come from a
// review manifest and are drawn through the review override).   node topleft_rot_test.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"tl_test"; fs.mkdirSync(OUT,{recursive:true});
const MAN="/review_artifacts/gk_dive_south_v1/topleft_test/GK_DIVE_SOUTH_TOPLEFT_TEST.json";
const CASE={lat:-1.9, z:1.9, v:26};                     // AIRBORNE_DIVE TOP, GOAL_LEFT, full stretch (norm 0.97), contact at the top corner
const KEYS=["TL_RAW","TL_CW35","TL_CW45","TL_CW50","TL_CW55"];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-tlr-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("loaded:", await p.evaluate(()=>Object.keys(S.gkAnim.savePoses.CONTEXTUAL.ANY).join(" ")));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
  const origin=[101.7-20,34];
  ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  ptGkFire({name:"TOP LEFT", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
  let t=0, committed=null, cls=null, contact=null;
  while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
    if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
    if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
    if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
  S.pt.paused=true;
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
  const tp=committed?sproj3(committed.target[0],committed.target[2],committed.target[1]):null;
  return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)], handSp:hn?[+hn.x.toFixed(1),+hn.y.toFixed(1)]:null,
    targetSp: tp?[+tp.x.toFixed(1),+tp.y.toFixed(1)]:null, root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)],
    cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,L:cls.L,norm:cls.norm,goalSide:cls.goalSide,bestEffort:cls.bestEffort}:null,
    committed: committed?{tier:committed.tier,action:committed.action,target:committed.target.map(v=>+v.toFixed(2))}:null, contact, ticks:t}; }, CASE);
console.log("SIM:", JSON.stringify(g));
fs.writeFileSync(path.join(OUT,"case.json"), JSON.stringify(g,null,1));
const CLIP={x:Math.round(g.sp[0])-190, y:Math.round(g.sp[1])-230, width:380, height:300};
for(const key of KEYS){
  const info=await p.evaluate((key)=>{ const gk=S.pt.gk, smp=S.gkAnim.savePoses.CONTEXTUAL.ANY[key], an=smp.anchors;
    const sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES, ps=s*(an.pixel_scale||1);
    const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    // ROOT CALIBRATION (same idea as the approved north dive): put the root anchor where the keeper's ground position sits relative to
    // this artwork, so the drawn lead glove meets the simulation's contact point. Pure translation of the whole sprite; no IK, no warp.
    const lead=an.lead_glove; an.root=[+(lead[0]+(sp.x-hn.x)/ps).toFixed(1), +(lead[1]+(sp.y-hn.y)/ps).toFixed(1)];
    GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key, ik:true, simHand:hn, showLabel:false};
    return {key, canvas:[smp.img.width,smp.img.height], root:an.root, pixel_scale:an.pixel_scale, reach:an.reach_screen_unit, scale:+ps.toFixed(4)}; }, key);
  await new Promise(r=>setTimeout(r,200));
  await p.screenshot({path:path.join(OUT,key+"_game.png"), clip:CLIP});
  console.log("drawn", key, JSON.stringify(info));
}
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,200));
await p.screenshot({path:path.join(OUT,"LIVE_DEFAULT_game.png"), clip:CLIP});
fs.writeFileSync(path.join(OUT,"clip.json"), JSON.stringify(CLIP,null,1));
await b.close();})();
