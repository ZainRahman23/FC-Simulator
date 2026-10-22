import {classifyZone,ellipseApex,lockedFinishingRadius} from './zones.mjs';

export function setupZoneVisualizer(g,onChange) {
 const $=id=>document.getElementById(id),num=v=>Number(v.toFixed(2)).toString();
 const state={radius:lockedFinishingRadius(g),finishing:90,longShots:60,position:{x:g.goalX-10,z:g.goalCentreZ}};
 const svg=$('zones-pitch'),halfBox=g.penaltyWidth/2,halfView=halfBox+4;
 const presets={central:{x:g.goalX-10,z:g.goalCentreZ},wide:{x:g.goalX-8,z:g.goalCentreZ+halfBox-2},outside:{x:g.goalX-g.penaltySpotDistance-g.arcRadius,z:g.goalCentreZ},apex:ellipseApex(g)};
 let transform;

 $('zone-lateral').min=-halfView;$('zone-lateral').max=halfView;
 const syncInput=(id,value)=>{if(document.activeElement!==$(id))$(id).value=value;};
 function draw() {
  const W=svg.clientWidth,H=(W-28)/(2*halfView)*27+45,s=(W-28)/(2*halfView),cx=W/2,base=H-29;
  const X=l=>cx+l*s,Y=d=>base-d*s;
  transform={W,H,s,cx,base};
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.style.height=H+'px';
  const line=(l1,d1,l2,d2,color='#f4f8ec',width=1.2,dash='')=>`<line x1="${X(l1)}" y1="${Y(d1)}" x2="${X(l2)}" y2="${Y(d2)}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}"/>`;
  const text=(l,d,t,fill='#203e52',size=W<420?10:13,anchor='middle')=>`<text x="${X(l)}" y="${Y(d)}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="650">${t}</text>`;
  const a=state.radius,b=g.penaltyDepth;
  // SVG's elliptical arc uses the same a and b as the analytic classifier.
  // Screen y increases downward: sweep 1 traces the upper half from left to right.
  const ellipse=`M${X(-a)} ${Y(0)} A${a*s} ${b*s} 0 0 1 ${X(a)} ${Y(0)} Z`;
  const arcL=Math.sqrt(g.arcRadius**2-(b-g.penaltySpotDistance)**2);
  let h=`<rect width="${W}" height="${H}" fill="#dce9f3"/><rect x="${X(-halfBox)}" y="${Y(b)}" width="${2*halfBox*s}" height="${b*s}" fill="#f4dfb5"/><path id="finishing-ellipse" d="${ellipse}" fill="#98d2b2" stroke="#22684c" stroke-width="2"/>`;
  h+=`<rect x="${X(-halfBox)}" y="${Y(b)}" width="${2*halfBox*s}" height="${b*s}" fill="none" stroke="#53604f" stroke-width="1.4"/>`;
  h+=line(-halfView,0,halfView,0,'#53604f',1.4)+line(0,0,0,25,'#668b83',1,'4 5');
  h+=`<path d="M${X(-arcL)} ${Y(b)} A${g.arcRadius*s} ${g.arcRadius*s} 0 0 1 ${X(arcL)} ${Y(b)}" fill="none" stroke="#8396a1" stroke-width="1.2"/>`;
  h+=`<circle cx="${cx}" cy="${Y(g.penaltySpotDistance)}" r="2" fill="#557866"/>`;
  h+=`<rect x="${X(-g.goalWidth/2)}" y="${Y(0)}" width="${g.goalWidth*s}" height="${1.2*s}" fill="#f8faf3" stroke="#234d42" stroke-width="2"/>`;
  h+=text(0,23,'2 · 100% LONG SHOTS');
  h+=text(-halfBox+2.5,12.7,'3','#76551f')+text(halfBox-2.5,12.7,'3','#76551f');
  if(a*s>48){h+=text(0,5.6,'1 · FINISHING','#154c34')+text(0,3.8,'100%','#154c34');}else h+=text(0,5.6,'1','#154c34');
  h+=`<circle id="ellipse-apex" cx="${cx}" cy="${Y(b)}" r="4" fill="#fff" stroke="#1b533c" stroke-width="2" data-world-x="${g.goalX-b}" data-world-z="${g.goalCentreZ}"/>`;
  h+=text(0,b+1.35,'Fixed apex · '+num(b)+' m','#294d43',W<420?10:12);
  h+=text(0,-3.5,'GOAL · CENTRE','#294d43',W<420?10:12);
  const p=classifyZone(g,state.position,state.radius,state.finishing,state.longShots);
  h+=`<circle cx="${X(p.lateral)}" cy="${Y(p.forward)}" r="9" fill="#172d36" stroke="white" stroke-width="2.5"/><circle cx="${X(p.lateral)}" cy="${Y(p.forward)}" r="2.2" fill="white"/>`;
  svg.innerHTML=h;
  svg.setAttribute('aria-label',`Top-down zones. Finishing radius ${num(a)} metres, full width ${num(2*a)} metres. Fixed apex ${num(b)} metres from goal line. Shooter ${num(p.forward)} metres forward, ${num(p.lateral)} metres lateral. ${p.label}. Click to move, or use arrow keys for one-metre steps.`);
 }
 function update(){
  const r=classifyZone(g,state.position,state.radius,state.finishing,state.longShots);
  $('zone-radius-number').textContent=num(state.radius);
  $('zone-width').textContent=num(2*state.radius)+' m';
  syncInput('zone-finishing',state.finishing);syncInput('zone-long-shots',state.longShots);
  syncInput('zone-depth',Number(r.forward.toFixed(3)));syncInput('zone-lateral',Number(r.lateral.toFixed(3)));
  $('zone-result').textContent=r.label;$('zone-result').dataset.zone=r.zone;
  $('zone-effective').textContent=num(r.effectiveAccuracy);
  const calculation=r.zone===1?`1.00 × ${state.finishing} = ${num(r.effectiveAccuracy)}`:r.zone===2?`1.00 × ${state.longShots} = ${num(r.effectiveAccuracy)}`:`0.50 × ${state.finishing} + 0.50 × ${state.longShots} = ${num(r.effectiveAccuracy)}`;
  $('zone-calculation').textContent=calculation;
  $('zone-position').textContent=`Forward ${num(r.forward)} m · lateral ${num(r.lateral)} m · world [${num(state.position.x)}, ${num(state.position.z)}]`;
  $('zone-equation').textContent=`((z − ${g.goalCentreZ}) / ${num(state.radius)})² + ((${g.goalX} − x) / ${g.penaltyDepth})² ≤ 1`;
  $('zone-anchor').textContent=`Goal centre [${g.goalX}, ${g.goalCentreZ}] → apex [${g.goalX-g.penaltyDepth}, ${g.goalCentreZ}]. Forward radius ${g.penaltyDepth} m, fixed.`;
  for(const b of $('zone-presets').querySelectorAll('button')){const p=presets[b.dataset.position];b.setAttribute('aria-pressed',String(Math.abs(p.x-state.position.x)<1e-9&&Math.abs(p.z-state.position.z)<1e-9));}
  draw();onChange({...r,...state,calculation});
 }
 for(const [id,key] of [['zone-finishing','finishing'],['zone-long-shots','longShots']])$(id).addEventListener('input',e=>{if(!e.target.value||!e.target.validity.valid)return;state[key]=Number(e.target.value);update();});
 for(const [id,key] of [['zone-depth','x'],['zone-lateral','z']])$(id).addEventListener('input',e=>{if(e.target.value===''||!e.target.validity.valid)return;const v=Number(e.target.value);state.position[key]=key==='x'?g.goalX-v:g.goalCentreZ+v;update();});
 for(const id of ['zone-finishing','zone-long-shots','zone-depth','zone-lateral'])$(id).addEventListener('blur',update);
 $('zone-presets').addEventListener('click',e=>{const b=e.target.closest('button[data-position]');if(b){state.position={...presets[b.dataset.position]};update();}});
 svg.addEventListener('click',e=>{const rect=svg.getBoundingClientRect(),t=transform;const px=(e.clientX-rect.left)*t.W/rect.width,py=(e.clientY-rect.top)*t.H/rect.height;const d=Math.max(0,Math.min(26,(t.base-py)/t.s)),l=Math.max(-halfView,Math.min(halfView,(px-t.cx)/t.s));state.position={x:g.goalX-d,z:g.goalCentreZ+l};update();});
 svg.addEventListener('keydown',e=>{const delta={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[e.key];if(!delta)return;e.preventDefault();state.position={x:Math.max(g.goalX-26,Math.min(g.goalX,state.position.x+delta[0])),z:Math.max(g.goalCentreZ-halfView,Math.min(g.goalCentreZ+halfView,state.position.z+delta[1]))};update();});
 new ResizeObserver(draw).observe(svg);update();
}
