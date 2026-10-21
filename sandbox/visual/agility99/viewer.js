import {AgilitySim,DT,DEG,PROFILES,scenario,run} from './cases.js';
import {Body99 as PlayBody} from './body.js';
import {DirectionBody} from './direction_body.js';
const makeBody=(env,sim,mode)=>mode==='original'?new PlayBody(env,sim):new DirectionBody(env,sim);
import {stickVector,stickMode,headingFrom} from '../tc_baseline_88573ef0/pt_input.js';
import {persp,lookAt,groundProg,ballProg,A3,QA} from './draw.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),hud=$('#hud'),ctx=hud.getContext('2d'),gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true}),ground=groundProg(gl),ball=ballProg(gl),R={gl};
let env,ent,entries=[],spec=null,live=true,playing=false,at=0,last=null,acc=0,keys=new Set(),src='keys',stick={x:0,y:0,r:0,m:0},sprint=false,view='body',pid=null;
const CAM_H=Math.atan2(4.6,3.5),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function newLive(){entries=[{profile:$('#profile').value,sim:new AgilitySim(env,{profile:$('#profile').value,ballOn:$('#ball').value==='on'})}];entries[0].body=makeBody(env,entries[0].sim,$('#bodymode').value);acc=0;at=0;keys.clear();stick={x:0,y:0,r:0,m:0};$('#nub').style.transform='';last=null;}
function setLive(on){live=on;$('#live').classList.toggle('active',on);$('#compare').classList.toggle('active',!on);$('#controls').style.display=on?'flex':'none';$('#compareOpts').style.display=on?'none':'flex';$('#compareOpts').style.padding='10px 22px';$('#replaybar').style.display=on?'none':'flex';$('#profile').disabled=false;$('#bodymode').disabled=!on;if(on)newLive();else load();}
function input(){
 const fast=sprint||keys.has('ShiftLeft')||keys.has('ShiftRight'),slow=keys.has('AltLeft')||keys.has('AltRight');
 if(src==='stick')return {h:stick.m>0?headingFrom(CAM_H,stick.x,stick.y):null,mode:fast?'SPRINT':slow?'WALK':stick.m>0?stickMode(stick.r):$('#mode').value,keys:64|(fast?128:0)};
 const x=+keys.has('KeyD')-+keys.has('KeyA'),y=+keys.has('KeyW')-+keys.has('KeyS');return {h:headingFrom(CAM_H,x,y),mode:fast?'SPRINT':slow?'WALK':$('#mode').value,keys:0};
}
function load(kind,angle=90,phase=0,sign=1,ballOn){
 if(kind){$('#case').value=kind==='snap'?'snap'+angle:kind;$('#phase').value=phase===0?'0':String(phase).replace('0.','.');$('#direction').value=String(sign);if(ballOn!==undefined)$('#ball').value=ballOn?'on':'off';}
 const c=$('#case').value;spec=scenario(c.startsWith('snap')?'snap':c,'SPRINT',c.startsWith('snap')?Number(c.slice(4)):90,+$('#phase').value,+$('#direction').value);
 const profile=$('#profile').value,r=run(env,spec,profile,$('#ball').value==='on');entries=['original','new'].map(bodymode=>({profile,...r,bodymode,body:makeBody(env,r.sim,bodymode)}));at=spec.t0-.7;playing=false;$('#toast').textContent='Matched input · 1× playback · gold dot shows root';$('#playback').textContent='Play 1×';$('#scrub').max=Math.round((spec.duration+.7)*1000);renderAt(at);return entries.map(e=>({profile:e.profile,hash:e.sim.hash}));
}
function sphere(pos,q,radius,tint,vm,pr){gl.useProgram(ball.p);gl.uniformMatrix4fv(ball.u.view,false,vm);gl.uniformMatrix4fv(ball.u.proj,false,pr);gl.uniform3fv(ball.u.c,A3(pos));gl.uniform4fv(ball.u.q,QA(q));gl.uniform1f(ball.u.r,radius);gl.uniform3fv(ball.u.tint,tint);gl.bindVertexArray(ball.vao);gl.drawElements(gl.TRIANGLES,ball.n,gl.UNSIGNED_SHORT,0);gl.bindVertexArray(null);}
function panel(e,index,t){
 const width=live?1600:800,height=820,x=live?0:index*width,y=0,gy=820-y-height,sim=e.sim,s=sim.stateAt(t),b=sim.ballTrack(t),pose=e.body.pose(t),q=live?sim.req?.h:spec.fn(t)==null?null:spec.fn(t)*DEG;
 const target=[s.P[0],.65,-s.P[1]],eye=view==='top'?[s.P[0],11,-s.P[1]]:[s.P[0]-3.5,3.3,-s.P[1]+4.6],vm=lookAt(eye,target,view==='top'?[1,0,0]:[0,1,0]),pr=persp(1/Math.tan((live?42:38)/2*DEG),width/height,.1,400);
 gl.viewport(x,gy,width,height);gl.scissor(x,gy,width,height);gl.enable(gl.SCISSOR_TEST);gl.clearColor(.06,.08,.07,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 const sh=new Float32Array(64);let ns=0;const push=(x,y,s,w)=>sh.set([x,y,s,w],ns++*4);push(s.P[0],s.P[1],.42,.4);for(const F of ['R','L']){const a=pose.feet[F].ank,h=Math.max(0,a[2]-.09);push(a[0],a[1],.15+h*.3,.5*Math.exp(-h*7));}if(sim.o.ballOn)push(b.p[0],b.p[1],.12,.65);
 gl.useProgram(ground.p);gl.uniformMatrix4fv(ground.u.view,false,vm);gl.uniformMatrix4fv(ground.u.proj,false,pr);gl.uniform4fv(ground.u.sh,sh);gl.uniform1i(ground.u.nsh,ns);gl.bindVertexArray(ground.vao);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.bindVertexArray(null);
 gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);window.ofCharDraw(R,ent,pose.skin,vm,pr);gl.disable(gl.CULL_FACE);
 if(sim.o.ballOn)sphere(b.p,b.q,.11,[1,1,1],vm,pr);sphere([s.P[0],s.P[1],.025],[0,0,0,1],.045,[1,.79,.25],vm,pr);
 if($('#guides').checked&&pose.support)for(const F of ['R','L']){const f=pose.feet[F];if(f.landing)sphere([f.landing[0],f.landing[1],.04],[0,0,0,1],.065,[.3,.85,1],vm,pr);sphere([f.ank[0],f.ank[1],.045],[0,0,0,1],.04,f.planted?[.3,1,.35]:[1,.4,.4],vm,pr);}
 const gap=Math.hypot(pose.P[0]-s.P[0],pose.P[1]-s.P[1]),plan=sim.planAt(t),controlled=plan.prog.kind==='tech'||(plan.prog.hold&&t<plan.prog.hold.until);
 ctx.fillStyle='#101e17ee';ctx.fillRect(x,y,width,live?92:72);ctx.fillRect(x,y+height-32,width,32);
 ctx.fillStyle=PROFILES[e.profile].color;ctx.font='bold 22px system-ui';ctx.fillText(e.profile+' · '+(live?($('#bodymode').value==='original'?'ORIGINAL V1 BODY':'NEW SUPPORT BODY'):(e.bodymode==='original'?'ORIGINAL V1 BODY':'NEW SUPPORT BODY')),x+18,y+29);ctx.fillStyle='#c0d3c7';ctx.font='14px system-ui';ctx.fillText(sim.o.ballOn?'BALL ON · unchanged baseline Technical Control':'BALL OFF · authoritative movement only',x+18,y+53);
 ctx.textAlign='right';ctx.fillStyle='#f2d184';ctx.fillText(live?'LIVE':`${t<spec.t0?'BEFORE':'AFTER'} INPUT ${(t-spec.t0).toFixed(2)} s`,x+width-16,y+27);ctx.fillStyle='#e7eee8';ctx.fillText(`${s.s.toFixed(2)} m/s · body/root ${(gap*100).toFixed(1)} cm`,x+width-16,y+52);ctx.textAlign='left';
 ctx.fillStyle=controlled?'#efb18c':'#d4e0d6';ctx.fillText(`${sim.o.ballOn?plan.action.label:(pose.support?.family||'ORIGINAL BODY')} · ${q==null?'released':Math.round(wrap(q)/DEG)+'° input'} · ${Math.round(wrap(s.h)/DEG)}° travel${controlled?' · TC owns trajectory':''}`,x+18,y+height-10);
 const cx=x+58,cy=y+116;ctx.strokeStyle='#adb9ad70';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,25,0,2*Math.PI);ctx.stroke();
 const arrow=(a,col,l)=>{ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l);ctx.stroke();};if(q!=null)arrow(q,'#f4d27b',28);arrow(s.h,'#83d8ed',22);
 if($('#guides').checked&&pose.support){ctx.fillStyle='#102017dc';ctx.fillRect(x+100,y+80,width-118,61);ctx.fillStyle='#cbe4d3';ctx.font='13px system-ui';ctx.fillText(`${pose.support.family} · next ${pose.support.nextSupport} · revisions ${pose.support.revision}`,x+112,y+101);ctx.fillText(`Added facing lag ${(Math.abs(wrap(pose.psi-s.psi))/DEG).toFixed(1)}° · cyan = planned landing`,x+112,y+124);}
 ctx.strokeStyle='#07110c';ctx.lineWidth=2;ctx.strokeRect(x,y,width,height);
 if(live)$('#toast').textContent=controlled?'TECHNICAL-CONTROL BOTTLENECK · baseline trajectory':`${s.s.toFixed(2)} m/s · facing gap ${(Math.abs(wrap(s.psi-s.h))/DEG).toFixed(0)}°${sim.o.ballOn?' · ball '+Math.hypot(b.p[0]-s.P[0],b.p[1]-s.P[1]).toFixed(2)+' m':''}`;
}
function renderAt(t){at=live?t:Math.max(spec.t0-.7,Math.min(spec.end-.001,Math.round(t/DT)*DT));ctx.clearRect(0,0,1600,820);entries.forEach((e,i)=>panel(e,i,at));if(!live){$('#scrub').value=Math.round((at-spec.t0+.7)*1000);$('#clock').textContent=(at-spec.t0).toFixed(2)+' s';}return at;}
function loop(now){
 if(last!=null){const dt=Math.min(.08,(now-last)/1000);if(live){acc+=dt;while(acc>=DT){entries[0].sim.step(input());acc-=DT;}renderAt(entries[0].sim.t);}else if(playing){at+=dt;if(at>spec.end-.02)at=spec.t0-.7;renderAt(at);}}
 last=now;requestAnimationFrame(loop);
}
function pointer(e){const r=$('#stick').getBoundingClientRect(),x=(e.clientX-(r.left+r.width/2))/(r.width*.44),y=((r.top+r.height/2)-e.clientY)/(r.height*.44);stick=stickVector(x,y);src='stick';const scale=Math.min(1,1/(Math.hypot(x,y)||1));$('#nub').style.transform=`translate(${x*scale*61}px,${-y*scale*61}px)`;}
async function boot(){
 const [colliders,baked,character]=await Promise.all([fetch('dribble1/d1_colliders.json').then(r=>r.json()),fetch('tc_baseline_88573ef0/pt_baked.json').then(r=>r.json()),window.ofCharLoad('vinicius')]);ent=character;env={E:window.RUN1_V13,M4,skel:ent.skel,colliders,baked,body:window.RUN1_V13.r1Body(ent.skel)};newLive();
 $('#live').onclick=()=>setLive(true);$('#compare').onclick=()=>setLive(false);$('#reset').onclick=()=>live?newLive():renderAt(spec.t0-.7);$('#bodymode').onchange=()=>{if(live)entries[0].body=makeBody(env,entries[0].sim,$('#bodymode').value);renderAt(at);};for(const id of ['profile','ball'])$('#'+id).onchange=()=>live?newLive():load();for(const id of ['case','phase','direction'])$('#'+id).onchange=()=>load();$('#view').onchange=e=>{view=e.target.value;renderAt(at);};$('#playback').onclick=()=>{playing=!playing;$('#playback').textContent=playing?'Pause':'Play 1×';};$('#scrub').oninput=e=>{playing=false;$('#playback').textContent='Play 1×';renderAt(spec.t0-.7+(+e.target.value)/1000);};$('#sprint').onclick=()=>{sprint=!sprint;$('#sprint').classList.toggle('active',sprint);};
 $('#stick').onpointerdown=e=>{pid=e.pointerId;e.currentTarget.setPointerCapture(pid);pointer(e);};$('#stick').onpointermove=e=>{if(e.pointerId===pid)pointer(e);};const release=()=>{pid=null;stick=stickVector(0,0);$('#nub').style.transform='';};$('#stick').onpointerup=release;$('#stick').onpointercancel=release;
 document.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','AltLeft','AltRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);src='keys';if(e.code==='Space'){if(live)newLive();else renderAt(spec.t0-.7);}}});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();release();});
 $('#guides').onchange=()=>renderAt(at);$('#toast').textContent='Ready · drag the joystick';window.A99={ready:true,setLive,load,renderAt,entries:()=>entries,spec:()=>spec,input,liveStep:(req,n=1)=>{for(let i=0;i<n;i++)entries[0].sim.step(req);renderAt(entries[0].sim.t);},setBody:mode=>{$('#bodymode').value=mode;if(live)entries[0].body=makeBody(env,entries[0].sim,mode);},setProfile:p=>{$('#profile').value=p;newLive();},setBall:on=>{$('#ball').value=on?'on':'off';newLive();},pause:()=>{playing=false;},env};requestAnimationFrame(loop);
}
boot().catch(e=>{$('#toast').textContent=e.stack;console.error(e);});
