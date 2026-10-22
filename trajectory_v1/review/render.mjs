import {GEOMETRY as G} from './geometry-data.mjs';import {ZONES,POSITIONS,classify} from './catalog.mjs';import {fieldTriangles,densityRaster,contourPoints,perimeter,CONTOURS} from './field.mjs';
const f=(x,n=2)=>Number(x.toFixed(n));
export function drawPitch(svg,{position={forward:20,lateral:0},profile={finishing:80,longShots:80},radius=20.16,overlay=false,rail=null,references=false}={}){
 const W=svg.clientWidth||600,H=(W-24)/68*39+34,s=(W-24)/68,cx=W/2,base=H-24,X=l=>cx+l*s,Y=d=>base-d*s;
 const label=(l,d,t,color='#2b504c',size=W<450?10:12)=>`<text x="${X(l)}" y="${Y(d)}" text-anchor="middle" fill="${color}" font-size="${size}" font-weight="650">${t}</text>`;
 const a=radius,b=G.penaltyDepth,half=G.penaltyWidth/2,arcL=Math.sqrt(G.arcRadius**2-(b-G.penaltySpotDistance)**2),values={1:profile.finishing,3:(profile.finishing+profile.longShots)/2,2:profile.longShots};
 const colour=z=>overlay?`hsl(${25+(values[z]-1)/98*125} 35% ${83-(values[z]-1)/98*20}%)`:ZONES[z].color;
 let h=`<rect width="${W}" height="${H}" fill="${colour(2)}"/><rect x="${X(-half)}" y="${Y(b)}" width="${2*half*s}" height="${b*s}" fill="${colour(3)}"/><path d="M${X(-a)} ${Y(0)} A${a*s} ${b*s} 0 0 1 ${X(a)} ${Y(0)} Z" fill="${colour(1)}" stroke="#2e654a" stroke-width="1.7"/>`;
 h+=`<path d="M${X(-34)} ${Y(0)}H${X(34)} M${X(-half)} ${Y(0)}V${Y(b)}H${X(half)}V${Y(0)} M${X(-G.sixYardWidth/2)} ${Y(0)}V${Y(G.sixYardDepth)}H${X(G.sixYardWidth/2)}V${Y(0)}" fill="none" stroke="#edf4e8" stroke-width="1.3"/>`;
 h+=`<path d="M${X(-arcL)} ${Y(b)} A${G.arcRadius*s} ${G.arcRadius*s} 0 0 1 ${X(arcL)} ${Y(b)}" fill="none" stroke="#dce8df" stroke-width="1.2"/><path d="M${cx} ${Y(0)}V${Y(36)}" stroke="#3b6c60" stroke-opacity=".45" stroke-dasharray="4 5"/><circle cx="${cx}" cy="${Y(11)}" r="2" fill="#eff5eb"/><rect x="${X(-G.goalWidth/2)}" y="${Y(0)}" width="${G.goalWidth*s}" height="${1.2*s}" fill="#f5f7eb" stroke="#305644" stroke-width="2"/>`;
 h+=label(-20,29,overlay?`C · ${values[2]}`:'C · LONG SHOTS')+label(-16,12,overlay?`B · ${values[3]}`:'B')+label(16,12,overlay?`B · ${values[3]}`:'B')+label(0,7,overlay?`A · ${values[1]}`:'A · FINISHING');
 h+=`<circle cx="${cx}" cy="${Y(b)}" r="3" fill="#fff" stroke="#29573d" stroke-width="1.5"/>`+label(0,18,'16.5 m apex','#25473e',W<450?9:11)+label(0,-3.3,'GOAL','#2b4b40',W<450?9:11);
 if(rail){h+=`<path d="M${cx} ${Y(rail.min)}V${Y(rail.max)}" stroke="#1e483b" stroke-width="3"/>`;for(const d of rail.stops)h+=`<circle cx="${cx}" cy="${Y(d)}" r="3" fill="#fff" stroke="#28533f"/>`+label(5,d,d+' m','#17352a',W<450?9:11);}
 if(references){for(const p of POSITIONS.filter(p=>['spot','six-corner','wide12','byline'].includes(p.id))){h+=`<circle cx="${X(p.lateral)}" cy="${Y(p.forward)}" r="3" fill="#fff" stroke="#475d42"/>`;}}
 h+=`<circle cx="${X(position.lateral)}" cy="${Y(position.forward)}" r="7" fill="#17362f" stroke="#fff" stroke-width="2.5"/>`;
 svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.style.height=H+'px';svg.innerHTML=h;
 svg.setAttribute('aria-label',`Shooting-zone map, radius ${radius} metres, forward radius 16.5 metres. Shooter ${f(position.forward)} metres forward and ${f(position.lateral)} metres lateral. ${ZONES[classify(position,profile,radius).zone].name}.`);
 return {W,H,s,cx,base};
}
const palette=['#f3d37f','#75d5bb','#b7a2ee','#ea9d79','#8fbbee','#c0de8d'];
export function drawGoal(canvas,meshes,{zoom=false,colours=palette,heat=true,domain=null,highlight=0}={}){
 const valid=meshes.filter(m=>m&&!m.unavailable&&m.bound),W=Math.max(240,Math.floor(canvas.clientWidth)),H=Math.max(230,Math.min(400,W*.62));canvas.width=W;canvas.height=H;canvas.style.height=H+'px';const ctx=canvas.getContext('2d');ctx.fillStyle='#101f28';ctx.fillRect(0,0,W,H);
 if(!valid.length){ctx.fillStyle='#bfd3cb';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('No natural plane projection at these settings',W/2,H/2);canvas.setAttribute('aria-label','No natural plane projection at these settings');return;}
 let l=Math.min(...valid.map(m=>m.bound.left)),r=Math.max(...valid.map(m=>m.bound.right)),b=Math.min(...valid.map(m=>m.bound.bottom)),t=Math.max(...valid.map(m=>m.bound.top));
 if(!zoom){l=Math.min(l,-3.66);r=Math.max(r,3.66);b=Math.min(b,0);t=Math.max(t,2.44);}
 const padX=Math.max(.025,(r-l)*.09),padY=Math.max(.025,(t-b)*.13);const d=domain??{left:l-padX,right:r+padX,bottom:b-padY,top:t+padY};
 const ml=43,mr=12,mt=18,mb=38,scale=Math.min((W-ml-mr)/(d.right-d.left),(H-mt-mb)/(d.top-d.bottom)),x0=ml+(W-ml-mr-scale*(d.right-d.left))/2,y0=mt+(H-mt-mb-scale*(d.top-d.bottom))/2;
 const T={X:x=>x0+(x-d.left)*scale,Y:y=>y0+(d.top-y)*scale,x:px=>d.left+(px-x0)/scale,y:py=>d.top-(py-y0)/scale};
 ctx.save();ctx.beginPath();ctx.rect(x0,y0,scale*(d.right-d.left),scale*(d.top-d.bottom));ctx.clip();
 if(heat){const m=valid[Math.min(highlight,valid.length-1)],field=fieldTriangles(m),raster=densityRaster(field.triangles,T,W,H);let peak=0;for(const value of raster)peak=Math.max(peak,value);const img=ctx.createImageData(W,H);for(let i=0;i<raster.length;i++){if(raster[i]<=0)continue;const q=Math.sqrt(raster[i]/peak),k=i*4;img.data[k]=Math.round(36+q*198);img.data[k+1]=Math.round(73+q*159);img.data[k+2]=Math.round(110+q*53);img.data[k+3]=255;}ctx.putImageData(img,0,0);}
 const supportOutline=(mesh,color)=>{const field=fieldTriangles(mesh);if(!field.foldedTriangles&&field.unmappedMass<1e-10)return false;const mask=densityRaster(field.triangles,T,W,H);ctx.fillStyle=color;for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x;if(mask[k]>0&&(!mask[k-1]||!mask[k+1]||!mask[k-W]||!mask[k+W]))ctx.fillRect(x,y,1,1);}return true;};
 const path=(ps,color,width=1,dash=[])=>{ctx.beginPath();let started=false;for(const p of ps){if(!p){started=false;continue;}if(!started){ctx.moveTo(T.X(p.x),T.Y(p.y));started=true;}else ctx.lineTo(T.X(p.x),T.Y(p.y));}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
 const tick=(span,pixels,gap)=>{const raw=span/Math.max(2,Math.floor(pixels/gap)),base=10**Math.floor(Math.log10(raw));return [1,2,2.5,5,10].find(n=>n*base>=raw)*base;},xt=tick(d.right-d.left,scale*(d.right-d.left),38),yt=tick(d.top-d.bottom,scale*(d.top-d.bottom),21);
 for(let x=Math.ceil(d.left/xt)*xt;x<=d.right+1e-8;x+=xt)path([{x,y:d.bottom},{x,y:d.top}],'#829d9c33',.6);
 for(let y=Math.ceil(d.bottom/yt)*yt;y<=d.top+1e-8;y+=yt)path([{x:d.left,y},{x:d.right,y}],'#829d9c33',.6);
 path([{x:-3.66,y:0},{x:-3.66,y:2.44},{x:3.66,y:2.44},{x:3.66,y:0}],'#edf3e7',3);path([{x:d.left,y:0},{x:d.right,y:0}],'#879d87',1);
 path([{x:-3.55,y:.11},{x:-3.55,y:2.33},{x:3.55,y:2.33},{x:3.55,y:.11}],'#ccdfcf',.8,[2,4]);
 valid.forEach((m,k)=>{if(valid.length===1){for(const c of CONTOURS)path(contourPoints(m,c.k),c.color,c.mass===.5?1.4:1);if(!supportOutline(m,'#f59abf'))path(perimeter(m),'#f59abf',1.4,[4,3]);}else {path(contourPoints(m,CONTOURS[1].k),colours[k%colours.length],k===highlight?2:1.3);if(!supportOutline(m,colours[k%colours.length]))path(perimeter(m),colours[k%colours.length]+'99',.9,[4,3]);}});
 const current=valid[Math.min(highlight,valid.length-1)],tx=T.X(current.ideal.target.x),ty=T.Y(current.ideal.target.y);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(tx-6,ty);ctx.lineTo(tx+6,ty);ctx.moveTo(tx,ty-6);ctx.lineTo(tx,ty+6);ctx.stroke();
 if(current.ideal.mode==='charge'&&current.ideal.plane.status!=='unreached'){const px=T.X(current.ideal.plane.x),py=T.Y(current.ideal.plane.y);ctx.fillStyle='#f3ce75';ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();}
 ctx.restore();ctx.font='10px -apple-system,sans-serif';ctx.fillStyle='#b6ccc5';ctx.textAlign='center';
 for(let x=Math.ceil(d.left/xt)*xt;x<=d.right+1e-8;x+=xt)ctx.fillText(String(f(x,2)),T.X(x),y0+scale*(d.top-d.bottom)+17);
 ctx.textAlign='right';for(let y=Math.ceil(d.bottom/yt)*yt;y<=d.top+1e-8;y+=yt)ctx.fillText(String(f(y,2)),x0-6,T.Y(y)+3);
 ctx.textAlign='center';ctx.fillText('Lateral position from goal centre (m)',W/2,H-5);ctx.save();ctx.translate(11,H/2);ctx.rotate(-Math.PI/2);ctx.fillText('Height (m)',0,0);ctx.restore();
 canvas.setAttribute('aria-label',`Physical execution field. Lateral ${f(d.left)} to ${f(d.right)} metres, height ${f(d.bottom)} to ${f(d.top)} metres. ${valid.length} compared distributions; full mapped support shown.`);
 return d;
}
export {palette};
