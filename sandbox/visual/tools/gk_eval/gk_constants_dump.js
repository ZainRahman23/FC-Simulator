// Dump every goalkeeper constant block + the reference attribute bundle from the live page (machine-readable baseline).
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const args=process.argv.slice(2); const opt=(k,d)=>{ const i=args.indexOf(k); return i>=0?args[i+1]:d; };
const URL=opt("--url","http://127.0.0.1:8126/sandbox/visual/match.html"), OUT=opt("--out","gk_constants.json");
(async()=>{
 const udd=fs.mkdtempSync(path.join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-const-"));
 const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:udd,args:["--no-sandbox","--disable-gpu"],protocolTimeout:600000});
 const p=await b.newPage(); await p.setCacheEnabled(false);
 await p.goto(URL+"?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
 for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{ const el=document.getElementById("loading"); return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"); }); if(ok) break; await new Promise(r=>setTimeout(r,100)); }
 const data=await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset();
   const cp=(o)=>JSON.parse(JSON.stringify(o));
   const out={GK_REACH:cp(GK_REACH),GK_ACTION:cp(GK_ACTION),GK_MOVE:cp(GK_MOVE),GK_CONTACT:cp(GK_CONTACT),GK_GATHER:cp(GK_GATHER),GK_BODY:cp(GK_BODY),GK_DIVE:cp(GK_DIVE),GK_CAP:cp(GK_CAP),GK_HAND:cp(GK_HAND),
     GK_CFG_attrs:cp(GK_CFG.attrs),GK_CFG_geom:{height_m:GK_CFG.height_m,handReachFrac:GK_CFG.handReachFrac,armSpan:GK_CFG.armSpan},GK_POS_FC:cp(GK_POS_FC),GK_SETDEPTH:{active:GK_SETDEPTH.active},GK_POSMODEL:{active:GK_POSMODEL.active},
     PT_X3:{active:PT_X3.active,k:ptX3K()},ballR:GOALFX.ballR,ptGkMakeAttrs:cp(ptGkMake().attrs),
     transforms:{norm01:[20,30,40,45,50,60,70,72,80,90,92,95,99].map(a=>[a,+gkNorm01(a).toFixed(4)]),shape01:[20,30,40,45,50,60,70,72,80,90,92,95,99].map(a=>[a,+gkShape01(a).toFixed(4)])}};
   return out; });
 fs.writeFileSync(OUT,JSON.stringify(data,null,1)); console.log("wrote",OUT); await b.close().catch(()=>{}); process.exit(0);
})();
