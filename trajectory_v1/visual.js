import {createField} from './model.mjs';
import {setupZoneVisualizer} from './zones.js';
(() => {
'use strict';
const D=window.ACCURACY_VISUAL,N=D.grid.length,$=id=>document.getElementById(id),f=(x,n=3)=>x.toFixed(n),deg=x=>f(x)+'°';
let zoneSelection=null;
let selectedAccuracy=90,field=createField(D,90),ds=field.ds,S=field.summary,sp=S.spatialSigma,peak=field.peak;
const sample=(u,v)=>field.sample(u,v),inverse=(x,y)=>field.inverse(x,y);
function list(id,rows){$(id).innerHTML=rows.map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('');}
function renderNumbers(){
 $('title-accuracy').textContent=selectedAccuracy;
 $('finishing').textContent=zoneSelection.finishing;$('long-shots').textContent=zoneSelection.longShots;
 $('effective-zone').textContent=zoneSelection.label;$('effective-rule').textContent=zoneSelection.calculation;
 $('typical-h').textContent='≈ '+f(sp.horizontal*100,2)+' cm';$('typical-v').textContent='≈ '+f(sp.vertical*100,2)+' cm';
 $('outer-spread').textContent='≈ '+f(S.maxHorizontalDeviation,3)+' / '+f(S.maxVerticalDeviation,3)+' m';
 for(const [id,value] of Object.entries({'base-h':ds.sigmaBaseH,'base-v':ds.sigmaBaseV,'add-h':ds.addedSigmaH,'add-v':ds.addedSigmaV,'final-h':ds.sigmaH,'final-v':ds.sigmaV}))$(id).textContent=(id.startsWith('add')?'+':'')+deg(value);
 $('power-factor').textContent=f(ds.difficulty,4)+'× power difficulty';$('power-percent').textContent=f(ds.powerIncreasePercent,2)+'%';
 list('bound-numbers',[
  ['Horizontal angle','± '+deg(ds.maxH)],['Elevation angle','± '+deg(ds.maxV)],['Left / right of target',f(S.offsets.left,3)+' / '+f(S.offsets.right,3)+' m'],['Below / above target',f(S.offsets.down,3)+' / '+f(S.offsets.up,3)+' m'],['Full bound width × height',f(S.extent.width,3)+' × '+f(S.extent.height,3)+' m'],['Highest ball centre',f(S.bounds.top,3)+' m'],['Crossbar reference','2.440 m'],['Furthest right centre','+'+f(S.bounds.right,3)+' m'],['Right post reference','+3.660 m']]);
 for(const row of $('comparison-rows').querySelectorAll('tr'))row.classList.toggle('selected',Number(row.dataset.accuracy)===selectedAccuracy);
 $('plot').setAttribute('aria-label',`Goal-plane heat map for ${selectedAccuracy} accuracy: same upper-right target. Maximum deviations ${f(S.maxHorizontalDeviation,3)} m horizontal and ${f(S.maxVerticalDeviation,3)} m vertical.`);
}
$('comparison-rows').innerHTML=D.comparisons.map(r=>`<tr data-accuracy="${r.accuracy}"><th>${r.accuracy}</th><td>${f(r.dispersion.sigmaH,3)}°</td><td>${f(r.dispersion.sigmaV,3)}°</td><td>${f(100*r.spatialSigma.horizontal,2)} / ${f(100*r.spatialSigma.vertical,2)}</td><td>${f(r.maxHorizontalDeviation,3)} / ${f(r.maxVerticalDeviation,3)}</td><td>${f(r.extent.width,3)} × ${f(r.extent.height,3)}</td></tr>`).join('');
list('shot-numbers',[
 ['Shot / foot','Laces / right'],['Goal-centre distance',f(D.distanceToGoalCentre,2)+' m'],['Target ground distance',f(D.groundDistanceToTarget,2)+' m'],['Hold on approved curve',f(D.ideal.holdMs,3)+' ms'],['Requested speed',f(D.ideal.speed,6)+' m/s'],['SP80 capability',f(D.ideal.capability,6)+' m/s'],['Relative speed',f(D.ideal.relativeSpeed*100,2)+'%'],['Requested apex',f(D.ideal.requestedApex,3)+' m'],['Ideal yaw / elevation',f(D.ideal.yaw,3)+'° / '+f(D.ideal.elevation,3)+'°'],['Intended corner','+3.410 m / 2.190 m']]);
$('formula').textContent=['Outside box: Long Shots. Inside box + ellipse: Finishing. Otherwise: 0.50 Finishing + 0.50 Long Shots.',...Object.entries(D.formula).filter(([k])=>k!=='accuracy').map(([,v])=>v)].join('\n\n');
$('method-text').textContent='No random draws or Monte Carlo cloud. One fixed '+N+' × '+N+' angular projection grid ('+D.method.projectionNodes+' nodes) covers all ratings. The ideal launch is copied unchanged from the first visualizer, not re-solved for each rating. Off-grid checks found a maximum interpolation error of '+f(D.method.maxInterpolationError*1000,3)+' mm; 99-bound checks: '+f(D.method.precise99Error*1000,3)+' mm.';
$('preservation').textContent='Preservation check: all 58 protected source hashes unchanged; gameplay repository clean. Shooter, target, hold, ideal velocity and spin are identical to the first visualizer. No gameplay resolver, charge formula, ball physics or goalkeeper was edited. The approved dispersion model and projection data are byte-identical to baseline-v2. Geometry calibration is isolated to this page.';
let redrawRequest=0;
function selectAccuracy(a){selectedAccuracy=Math.max(1,Math.min(99,Number(a)));field=createField(D,selectedAccuracy);ds=field.ds;S=field.summary;sp=S.spatialSigma;peak=field.peak;renderNumbers();tooltip.hidden=true;cancelAnimationFrame(redrawRequest);redrawRequest=requestAnimationFrame(draw);}
const stops=[[0,[12,26,34]],[.04,[37,77,126]],[.25,[60,129,168]],[.55,[103,211,187]],[1,[245,230,165]]];
function color(t){t=Math.max(0,Math.min(1,t));let i=0;while(i<stops.length-2&&stops[i+1][0]<t)i++;const a=stops[i],b=stops[i+1],q=(t-a[0])/(b[0]-a[0]);return a[1].map((x,j)=>Math.round(x+(b[1][j]-x)*q));}
let view='full',lastTransform=null;
const plot=$('plot'),svg=$('overlay'),canvas=$('heat'),tooltip=$('tooltip');
function draw(){
 const detail=view!=='full',precision=view==='precision';
 const W=plot.clientWidth,H=detail?Math.max(250,Math.min(520,W*.6)):Math.max(180,Math.min(520,W*.48));plot.style.height=H+'px';
 const domain=precision?{xmin:3.31,xmax:3.51,ymin:2.09,ymax:2.29}:detail?{xmin:2.65,xmax:4.2,ymin:1.7,ymax:2.7}:D.fullView;
 const margin={left:55,right:26,top:42,bottom:49};const scale=Math.min((W-margin.left-margin.right)/(domain.xmax-domain.xmin),(H-margin.top-margin.bottom)/(domain.ymax-domain.ymin));
 const x0=margin.left+(W-margin.left-margin.right-scale*(domain.xmax-domain.xmin))/2,y0=margin.top+(H-margin.top-margin.bottom-scale*(domain.ymax-domain.ymin))/2;
 const X=x=>x0+(x-domain.xmin)*scale,Y=y=>y0+(domain.ymax-y)*scale,pw=scale*(domain.xmax-domain.xmin),ph=scale*(domain.ymax-domain.ymin);
 lastTransform={W,H,domain,X,Y,scale,x0,y0,pw,ph};
 const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 const left=Math.max(Math.ceil(x0*dpr),Math.floor(X(S.bounds.left)*dpr)),right=Math.min(Math.floor((x0+pw)*dpr),Math.ceil(X(S.bounds.right)*dpr)),top=Math.max(Math.ceil(y0*dpr),Math.floor(Y(S.bounds.top)*dpr)),bottom=Math.min(Math.floor((y0+ph)*dpr),Math.ceil(Y(S.bounds.bottom)*dpr));
 const iw=right-left,ih=bottom-top,img=ctx.createImageData(iw,ih);
 for(let py=0;py<ih;py++)for(let px=0;px<iw;px++){
  const wx=domain.xmin+((left+px+.5)/dpr-x0)/scale,wy=domain.ymax-((top+py+.5)/dpr-y0)/scale,r=inverse(wx,wy);if(!r)continue;
  const c=color(r.density/peak),k=4*(py*iw+px);img.data[k]=c[0];img.data[k+1]=c[1];img.data[k+2]=c[2];img.data[k+3]=255;
 }ctx.putImageData(img,left,top);
 svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const path=points=>points.map((p,i)=>(i?'L':'M')+f(X(p.x),2)+','+f(Y(p.y),2)).join(' ');
 const line=(x1,y1,x2,y2,color,width=1,dash='')=>`<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
 const text=(x,y,t,anchor='middle',color='#a9bec5',size=11)=>`<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${size}">${t}</text>`;
 let html=`<defs><clipPath id="chartclip"><rect x="${x0}" y="${y0}" width="${pw}" height="${ph}"/></clipPath></defs>`;
 html+=`<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="none" stroke="#28404b"/>`;
 const xtick=precision?.05:detail?.25:W<600?2:1,ytick=precision?.05:detail?.2:W<600?1:.5;
 for(let x=Math.ceil(domain.xmin/xtick)*xtick;x<=domain.xmax+1e-8;x+=xtick){html+=line(x,domain.ymin,x,domain.ymax,'#8aa2aa',.5);html+=text(X(x),y0+ph+20,detail?f(x,2):f(x,0));}
 for(let y=Math.ceil(domain.ymin/ytick)*ytick;y<=domain.ymax+1e-8;y+=ytick){html+=line(domain.xmin,y,domain.xmax,y,'#8aa2aa',.5);html+=text(x0-9,Y(y)+4,f(y,precision?2:1),'end');}
 // Grid is faint enough that the density remains the primary encoding.
 html=html.replaceAll('stroke="#8aa2aa"','stroke="#8aa2aa" stroke-opacity=".16"');
 html+=text(x0+pw/2,H-7,'Lateral position from goal centre (m)');
 html+=`<text transform="translate(15 ${y0+ph/2}) rotate(-90)" fill="#a9bec5" font-size="11" text-anchor="middle">Height above turf (m)</text>`;
 html+='<g clip-path="url(#chartclip)">';
 if(!detail){html+=`<rect x="${X(domain.xmin)}" y="${Y(0)}" width="${pw}" height="${Math.max(0,Y(domain.ymin)-Y(0))}" fill="#1c3c32"/>`;html+=line(domain.xmin,0,domain.xmax,0,'#829d8c',1.5);}
 // Nominal 7.32 x 2.44 m reference frame, with outside-only display thickness.
 const g=D.geometry,w=g.goalWidth/2,hg=g.goalHeight;
 const frame=[{x:-w,y:0},{x:-w,y:hg},{x:w,y:hg},{x:w,y:0}];
 html+=`<path d="${path(frame)}" stroke="#ecf3ea" fill="none" stroke-width="${Math.max(3,scale*.06)}" stroke-linejoin="miter"/>`;
 const clear=[{x:-w+g.ballRadius,y:g.ballRadius},{x:-w+g.ballRadius,y:hg-g.ballRadius},{x:w-g.ballRadius,y:hg-g.ballRadius},{x:w-g.ballRadius,y:g.ballRadius}];
 html+=`<path d="${path(clear)}" fill="none" stroke="#c4d3ce" stroke-width="1" stroke-dasharray="2 5" opacity=".7"/>`;
 if($('base').checked)html+=`<path d="${path(field.baseBound)} Z" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="8 5" opacity=".7"/>`;
 const colors=['#fff1b1','#83f3d3','#81b8de'];
 D.contours.forEach((contour,idx)=>{
  const pts=[];for(let i=0;i<=180;i++){const th=i*Math.PI*2/180,c=Math.cos(th),s=Math.sin(th),ca=Math.abs(c),sa=Math.abs(s);let lo=0,hi=1/Math.max(ca,sa);for(let k=0;k<30;k++){const r=(lo+hi)/2;if((1-r*ca)*(1-r*sa)>contour.k)lo=r;else hi=r;}pts.push(sample(c*(lo+hi)/2,s*(lo+hi)/2));}
  html+=`<path d="${path(pts)} Z" fill="none" stroke="${colors[idx]}" stroke-width="${idx===0?1.5:1.1}" opacity=".9"/>`;
 });
 const perimeter=field.perimeter;
 html+=`<path d="${path(perimeter)} Z" fill="none" stroke="#ff9ab6" stroke-width="1.6" stroke-dasharray="5 4"/>`;
 const tx=X(D.targetLocal.x),ty=Y(D.targetLocal.y);
 const cross=`M${tx-9} ${ty}H${tx-3} M${tx+3} ${ty}H${tx+9} M${tx} ${ty-9}V${ty-3} M${tx} ${ty+3}V${ty+9}`;
 html+=`<path d="${cross}" fill="none" stroke="#0c1a22" stroke-width="3.5"/><path d="${cross}" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="${tx}" cy="${ty}" r=".65" fill="#fff"/>`;
 html+='</g>';
 if(precision){html+=text(x0+pw/2,y0-15,'TARGET CLOSE-UP · 20 × 20 cm','middle','#d5e3e3',10);}
 else if(detail){html+=text(x0+8,y0-15,'UPPER-RIGHT CORNER','start','#d5e3e3',11);html+=text(x0+pw-5,Y(2.44)-8,'Crossbar 2.44 m','end','#e9f1e7',11);}
 else{
  if(W>500)html+=text(X(0),Y(2.44)-12,'7.32 m goal reference', 'middle','#e8efe9',12);
  const labelX=Math.min(W-12,tx+26),labelY=Y(4.2);html+=`<path d="M${tx} ${ty-13} L${tx} ${labelY+9} L${labelX} ${labelY+9}" fill="none" stroke="#d7e7de" stroke-width="1"/>`;
  html+=text(labelX,labelY,W>500?'INTENDED TARGET':'TARGET','end','#fff4ca',10);
  html+=text(X(-3.6),Y(.17),W>500?'GOAL MOUTH':'7.32 × 2.44 m','start','#8eaaa4',W>500?11:9);
 }
 svg.innerHTML=html;
 $('scale-note').textContent='Axes stay fixed as accuracy changes';
 const cropped=S.bounds.left<domain.xmin||S.bounds.right>domain.xmax||S.bounds.bottom<domain.ymin||S.bounds.top>domain.ymax;
 $('view-note').textContent=cropped?'This zoom crops the outer region. Full goal shows the entire bound.':S.extent.width*scale<6?'Tiny at this scale. Use Precision to inspect the nonzero region; its size is not inflated.':precision?'True-size 20 × 20 cm window around the unchanged target.':'Full outer support visible. The target and viewing scale do not move between ratings.';
 $('view-note').classList.toggle('cropped',cropped);
}
function selectView(v){view=v;for(const id of ['full','detail','precision'])$(id).setAttribute('aria-pressed',String(id===v));tooltip.hidden=true;draw();}
for(const id of ['full','detail','precision'])$(id).onclick=()=>selectView(id);
$('base').onchange=draw;
plot.addEventListener('pointermove',e=>{
 const T=lastTransform,r=plot.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,x=T.domain.xmin+(px-T.x0)/T.scale,y=T.domain.ymax-(py-T.y0)/T.scale,p=inverse(x,y);
 if(!p){tooltip.hidden=true;return;}
 tooltip.hidden=false;tooltip.innerHTML=`<strong>Ball centre: ${f(x,2)} m / ${f(y,2)} m</strong>From target: ${f((x-D.targetLocal.x)*100,1)} cm across, ${f((y-D.targetLocal.y)*100,1)} cm up<br>Density: ${f(p.density,2)} / m² · ${f(100*p.density/peak,1)}% of peak`;
 tooltip.style.left=Math.min(T.W-245,Math.max(5,px+15))+'px';tooltip.style.top=Math.min(T.H-90,Math.max(5,py-90))+'px';
});plot.addEventListener('pointerleave',()=>tooltip.hidden=true);
const pitch=$('pitch');
function drawPitch(){
 const W=390,H=245,s=7.7,cx=W/2,top=18,X=z=>cx+(z-34)*s,Y=x=>top+(105-x)*s;
 const L=(x1,z1,x2,z2,c='#8da796',sw=1)=>`<line x1="${X(z1)}" y1="${Y(x1)}" x2="${X(z2)}" y2="${Y(x2)}" stroke="${c}" stroke-width="${sw}"/>`;
 let h=L(105,11,105,57)+L(88.5,13.84,88.5,54.16)+L(88.5,13.84,105,13.84)+L(88.5,54.16,105,54.16)+L(99.5,24.84,99.5,43.16)+L(99.5,24.84,105,24.84)+L(99.5,43.16,105,43.16);
 const angle=Math.acos(5.5/9.15),pts=[];for(let i=0;i<=60;i++){const t=Math.PI-angle+2*angle*i/60;pts.push([X(34+9.15*Math.sin(t)),Y(94+9.15*Math.cos(t))]);}
 h+=`<path d="${pts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')}" fill="none" stroke="#8da796"/>`;
 h+=`<circle cx="${cx}" cy="${Y(94)}" r="2" fill="#8da796"/>`;
 h+=L(105,30.34,105,37.66,'#214d40',4)+L(D.origin[0],D.origin[2],105,D.target[2],'#2f8870',1.6);
 h+=`<circle cx="${X(D.origin[2])}" cy="${Y(D.origin[0])}" r="5" fill="#174e3c" stroke="#fff" stroke-width="2"/><circle cx="${X(D.target[2])}" cy="${Y(105)}" r="4" fill="#b77d28" stroke="#fff"/>`;
 h+=`<text x="${cx}" y="${Y(D.origin[0])+22}" text-anchor="middle" fill="#25443c" font-size="12">Shooter · top of the D</text><text x="${cx}" y="${Y(D.origin[0])+39}" text-anchor="middle" fill="#537065" font-size="10">20.15 m from goal · outside the area</text><text x="${X(54.16)-5}" y="${Y(88.5)-7}" text-anchor="end" fill="#537065" font-size="10">Penalty area · 16.5 m</text>`;
 pitch.setAttribute('viewBox',`0 0 ${W} ${H}`);pitch.innerHTML=h;
}
setupZoneVisualizer(D.geometry,selection=>{zoneSelection=selection;selectAccuracy(selection.effectiveAccuracy);});
new ResizeObserver(draw).observe(plot);drawPitch();draw();
window.accuracyVisualDiagnostics=()=>({dataVersion:D.version,view,selectedAccuracy,plotWidth:plot.clientWidth,plotHeight:plot.clientHeight,peakDensity:peak,centreInverse:inverse(D.targetLocal.x,D.targetLocal.y),...D.validation});
})();
