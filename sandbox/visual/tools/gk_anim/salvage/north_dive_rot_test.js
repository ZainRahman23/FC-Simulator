// ROTATION TEST (presentation only): draw the raw Pro DIVE_NORTH sprite and its 35/45/55-degree clockwise rotations into ONE
// identical NORTH / keeper-right medium-high airborne save, at the simulation's own root and its own contact tick.
// The simulation runs untouched; each variant is drawn by the review override with the same bounded hand alignment.
//   node north_dive_rot_test.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"rot_test"; fs.mkdirSync(OUT,{recursive:true});
const MAN="/review_artifacts/gk_dive_north_v1/rotation_test/GK_DIVE_NORTH_ROTATION_TEST.json";
const CASE={lat:-2.0, z:1.45, v:25};                      // AIRBORNE_DIVE, GOAL_LEFT (north), z 1.52 m, lateral 1.99 m
const KEYS=["DIVE_N_RAW","DIVE_N_CW35","DIVE_N_CW45","DIVE_N_CW55"];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-rot-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?savePoses="+encodeURIComponent(MAN)+"&r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("loaded variants:", await p.evaluate(()=>Object.keys((S.gkAnim.savePoses.CONTEXTUAL||{}).ANY||{}).join(" ")));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});

// run the shot once; stop at the simulation's own contact tick and leave everything frozen there
const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
  const origin=[101.7-20,34];
  ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
  ptGkFire({name:"DIVE NORTH", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
  let t=0, committed=null, cls=null, contact=null;
  while(t<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
    if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
    if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
    if(S.pt.paused){ if(gk.contact) contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
    if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
  S.pt.paused=true;
  const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
  return {root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)],
          ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)], handSp:hn?[+hn.x.toFixed(1),+hn.y.toFixed(1)]:null, hand:gk.handNow?gk.handNow.map(v=>+v.toFixed(2)):null,
          cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,L:cls.L,goalSide:cls.goalSide,dz:cls.dz}:null,
          committed: committed?{tier:committed.tier,action:committed.action,target:committed.target.map(v=>+v.toFixed(2))}:null, contact, ticks:t}; }, CASE);
console.log("SIM:", JSON.stringify(g));
fs.writeFileSync(path.join(OUT,"case.json"), JSON.stringify(g,null,1));

const CLIP={x:Math.round(g.sp[0])-210, y:Math.round(g.sp[1])-215, width:420, height:300};
for(const key of KEYS){
  const info=await p.evaluate((key)=>{ const gk=S.pt.gk, A=S.gkAnim, smp=A.savePoses.CONTEXTUAL.ANY[key], an=smp.anchors||{};
    const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key, ik:true, simHand:hn, showLabel:false};
    // same numbers the override computes, reported for the sheet
    const sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;   // same sprite scale the draw path uses (match.js:4764)
    // the same bounded hand alignment the override applies, reported for the sheet
    const ax=an.root?an.root[0]:smp.img.width/2, ay=an.root?an.root[1]:smp.img.height-1, gl=an.gloves&&an.gloves.length?an.gloves:(an.lead_glove?[an.lead_glove]:[]);
    const dx0=Math.round(sp.x-ax*s), dy0=Math.round(sp.y-ay*s);
    const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*s), y:dy0+Math.round(py*s)}), hn, false), pl=gkAnimPlace(raw, hn, 1, s, null);
    return {key, canvas:[smp.img.width, smp.img.height], root:an.root, lead:an.lead_glove?an.lead_glove.slice(0,2):null, reach:an.reach_screen_unit,
            place:{raw:pl.rawErrPx, corr:pl.corrPx, res:pl.finalErrPx, capped:!!pl.capped}, scale:+s.toFixed(4)}; }, key);
  await new Promise(r=>setTimeout(r,200));
  await p.screenshot({path:path.join(OUT,key+"_game.png"), clip:CLIP});
  // REVIEW-ONLY second capture: the same whole-sprite translation with the 12-px bound lifted, so the drawn glove lands on the
  // simulation's contact point. Pure translation of the same pixels - no scaling, warp, limb edit or IK; the page constant is restored.
  const on=await p.evaluate(()=>{ const gk=S.pt.gk, A=S.gkAnim, o=GK_ANIM.reviewOverride, smp=A.savePoses[o.family][o.side][o.key], an=smp.anchors||{};
    const sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
    const ax=an.root?an.root[0]:smp.img.width/2, ay=an.root?an.root[1]:smp.img.height-1, gl=an.gloves&&an.gloves.length?an.gloves:(an.lead_glove?[an.lead_glove]:[]);
    const dx0=Math.round(sp.x-ax*s), dy0=Math.round(sp.y-ay*s);
    const raw=gkAnimGloves(gl,(px,py)=>({x:dx0+Math.round(px*s), y:dy0+Math.round(py*s)}), o.simHand, false);
    GK_ANIM.corrMaxPx=400; const pl=gkAnimPlace(raw, o.simHand, 1, s, null); return {shiftPx:pl.corrPx, res:pl.finalErrPx}; });
  await new Promise(r=>setTimeout(r,200));
  await p.screenshot({path:path.join(OUT,key+"_oncontact.png"), clip:CLIP});
  await p.evaluate(()=>{ GK_ANIM.corrMaxPx=12; });
  info.onContact=on;
  console.log("drawn", key, JSON.stringify(info));
}
// the live default presentation for the same tick, for reference (no override)
await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,200));
await p.screenshot({path:path.join(OUT,"LIVE_DEFAULT_game.png"), clip:CLIP});
fs.writeFileSync(path.join(OUT,"clip.json"), JSON.stringify(CLIP,null,1));
await b.close();})();
