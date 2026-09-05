// HUD smoke: real render loop (RAF) with the keeper HUD visible during a shot; collects page errors.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
const BASE="http://127.0.0.1:8126/sandbox/visual/";
async function waitReady(p){ for(let i=0;i<900;i++){ const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function");}); if(ok)return; await new Promise(r=>setTimeout(r,100)); } throw new Error("nr"); }
(async()=>{
 const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:require("fs").mkdtempSync(require("path").join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),".gk-hud-")),args:["--no-sandbox"],protocolTimeout:600000});
 const p=await b.newPage(); await p.setViewport({width:1400,height:900}); await p.setCacheEnabled(false); const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{ if(m.type()==="error") errs.push("console: "+m.text()); });
 await p.goto(BASE+"match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000}); await waitReady(p);
 const res=[];
 for(const [label,fn] of [["chest 22 m/s from 14 m",`ptKick("DRIVEN","HUD",20,{tech:"LACES",foot:"R"},{c:0.62,holdMs:0})`],["ground roller",`ptKick("SHORT","HUD",14,{tech:"INSIDE",foot:"R"},{c:0.18,holdMs:0})`]]){
   await p.evaluate(new Function(`if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); const t=S.pt; t.gkCap="K1"; t.gkHud=true; t.showGkHud=true; const M=GK_MOUTH; t.p={x:M.lineX-14,y:M.centerY,vx:0,vy:0,facing:0,touchT:0}; t.b={x:M.lineX-14,y:M.centerY,z:0.06,vx:0,vy:0,vz:0,ctrl:true,exclT:0,curve:null}; ${fn};`));
   await new Promise(r=>setTimeout(r,2500));
   const st=await p.evaluate(()=>{ const t=S.pt, gk=t.gk; return {last:t.last,state:gk&&gk.state,contact:gk&&gk.contact?{o:gk.contact.outcome,held:gk.contact.held,q:{support:gk.contact.q.support,stable:gk.contact.q.stable,gather:gk.contact.q.gather,vSecureEff:gk.contact.q.vSecureEff}}:null,committed:gk&&gk.committed?{action:gk.committed.action,gather:gk.committed.gather}:null,frames:S.frame||null}; });
   res.push([label,st]);
 }
 // screenshot for the record
 await p.screenshot({path:require("path").join(process.env.GK_EVAL_PROFILE_DIR||process.cwd(),"hud_smoke.png")});
 console.log(JSON.stringify(res,null,0)); console.log("pageErrors",JSON.stringify(errs.slice(0,5)));
 await b.close();
})();
