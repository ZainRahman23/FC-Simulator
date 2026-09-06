// GAMEPLAY-SCALE REFERENCE CAPTURE on the plain default page: the SET keeper at his root, the renderer's sprite scale at that
// root, and the root's screen position, so offline sheets can composite candidate art at the true on-screen size.
//   node gameplay_clip.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"gameplay_clip"; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-gclip-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,500));
const g=await p.evaluate(()=>{ const gk=S.pt.gk, sp=sproj3(gk.x,0,gk.y), s=S.playerVScale*depthScale(sp.d)*RIG.zoom*RES;
  const dn=S.gkAnim.savePoses&&S.gkAnim.savePoses.CONTEXTUAL&&S.gkAnim.savePoses.CONTEXTUAL.ANY&&S.gkAnim.savePoses.CONTEXTUAL.ANY.DIVE_NORTH_MEDHIGH;
  return {root:[+gk.x.toFixed(3),+gk.y.toFixed(3)], sp:[+sp.x.toFixed(2),+sp.y.toFixed(2)], spriteScale:+s.toFixed(5), dir:headingToDir(gk.facing*180/Math.PI),
          northDivePixelScale: dn?dn.anchors.pixel_scale:null}; });
const CLIP={x:Math.round(g.sp[0])-200, y:Math.round(g.sp[1])-150, width:400, height:210};
await p.screenshot({path:path.join(OUT,"gameplay_set_clip.png"), clip:CLIP});
fs.writeFileSync(path.join(OUT,"gameplay_clip.json"), JSON.stringify({...g, clip:CLIP},null,1));
console.log(JSON.stringify({...g, clip:CLIP}));
await b.close();})();
