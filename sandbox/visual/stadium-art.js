/* Tottenham-inspired seating bowl, authored to fit the Touchline pitch.
   Repeated seats are baked into shared atlases; the bowl remains world-space.
   The near stand is cut away for the broadcast camera, not moved onto the field. */
const TouchlineStands=(()=>{
 'use strict';
 const config={cutaway:true,enabled:true,crowd:true,front:{left:-8,right:113,far:-7,near:80.5,radius:11},seatPitch:.52,rowDepth:.78};
 const sectors=[],surfaces=[],rails=[],atlases=new Map(),layers={};let built=false,buildMs=0,drawn=0;
 const fanImage=new Image();let fanReady=false,fanCount=0;
 const scriptBase=typeof document.currentScript!=='undefined'&&document.currentScript?document.currentScript.src:location.href;
 fanImage.onload=()=>{fanReady=true;for(const k of Object.keys(layers))delete layers[k]};
 fanImage.src=new URL('../../assets/stadium/fans.png',scriptBase).href;
 const C={seat:'#36414f',base:'#202b35',concrete:'#929b9b',cap:'#c2c8c4',wall:'#aab2af',ink:'#18252e',steel:'#aebaba'};
 function sector(a,b,n0,n1,zone){sectors.push({a,b,n0,n1,zone,id:sectors.length})}
 function straight(a,b,n,count,zone){for(let i=0;i<count;i++){const lerp=t=>a.map((v,k)=>v+(b[k]-v)*t);sector(lerp(i/count),lerp((i+1)/count),n,n,zone)}}
 function arc(cx,cz,a0,a1,zone){for(let i=0;i<3;i++){const p=a=>[cx+11*Math.cos(a),cz+11*Math.sin(a)],n=a=>[Math.cos(a),Math.sin(a)];const a=a0+(a1-a0)*i/3,b=a0+(a1-a0)*(i+1)/3;sector(p(a),p(b),n(a),n(b),zone)}}
 function point(s,t,d,h){return [s.a[0]+(s.b[0]-s.a[0])*t+(s.n0[0]+(s.n1[0]-s.n0[0])*t)*d,h,s.a[1]+(s.b[1]-s.a[1])*t+(s.n0[1]+(s.n1[1]-s.n0[1])*t)*d]}
 function quad(s,d0,h0,d1,h1,c,extra={},t0=0,t1=1){surfaces.push({p:[point(s,t0,d0,h0),point(s,t1,d0,h0),point(s,t1,d1,h1),point(s,t0,d1,h1)],c,zone:s.zone,...extra})}
 function rail(a,b,zone,w=.045,c=C.cap){rails.push({a,b,zone,w,c})}
 function guard(s,d,h){rail(point(s,0,d,h+.9),point(s,1,d,h+.9),s.zone,.045);rail(point(s,0,d,h+.45),point(s,1,d,h+.45),s.zone,.025,'#7d8d90');
  const len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);for(let t=0;t<=1;t+=1/Math.ceil(len/2))rail(point(s,t,d,h),point(s,t,d,h+.9),s.zone,.035,'#94a5a8');
 }
 function seating(s,d,h,rows,rise,kind){
  const depth=rows*.78,span0=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);
  const p0=point(s,0,d+depth/2,0),p1=point(s,1,d+depth/2,0),span=Math.hypot(p1[0]-p0[0],p1[2]-p0[2]);
  const cols=Math.max(8,Math.round((span-1.35)/config.seatPitch));
  const spec={kind,rows,cols,portal:kind==='lower'||kind==='upper',id:s.id};
  quad(s,d,h,d+depth,h+rows*rise,C.base,{tex:spec});
  // Seats form the bowl's opaque foundation. People sort separately at body height.
  for(let r=0;r<rows;r++)quad(s,d+r*.78+.4,h+r*rise,d+r*.78+.4,h+r*rise+1.65,C.base,
    {crowdOnly:true,tex:spec,crowd:{s,d:d+r*.78+.40,h:h+r*rise,row:r,seed:Math.round(d*100)+s.id*7919}});
  // Front fascia and a thin pale coping keep tiers distinct.
  quad(s,d,h-.65,d,h,C.wall);quad(s,d-.08,h,d+.10,h,C.cap);guard(s,d-.04,h);
  // Aisle's centre handrail follows the rake; texture carries stair treads.
  rail(point(s,0,d,h+.95),point(s,0,d+depth,h+rows*rise+.95),s.zone,.035,'#a6b2b2');
  for(let r=0;r<rows;r+=5)rail(point(s,0,d+r*.78,h+r*rise),point(s,0,d+r*.78,h+r*rise+.95),s.zone,.025,'#8d9b9e');
  return {d:d+depth,h:h+rows*rise};
 }
 function ribbon(s,d,h){quad(s,d,h,d,h+.72,C.ink,{ribbon:true});quad(s,d-.10,h+.72,d+.12,h+.72,C.cap)}
 function hospitality(s,d,h){
  // Shadowed glazing behind the balcony, with dark mullions.
  quad(s,d+2,h+.1,d+2,h+2.3,'#253840');
  for(let t=.1;t<1;t+=.16)rail(point(s,t,d+1.98,h+.15),point(s,t,d+1.98,h+2.25),s.zone,.04,'#718283');
  quad(s,d,h,d+2.5,h,'#697a7b');ribbon(s,d-.02,h-.1);
 }
 function build(){if(built)return;built=true;
  straight([3,-7],[102,-7],[0,-1],10,'far');arc(102,4,-Math.PI/2,0,'right');
  straight([113,4],[113,69.5],[1,0],8,'right');arc(102,69.5,0,Math.PI/2,'near');
  straight([102,80.5],[3,80.5],[0,1],10,'near');arc(3,69.5,Math.PI/2,Math.PI,'near');
  straight([-8,69.5],[-8,4],[-1,0],8,'left');arc(3,4,Math.PI,Math.PI*1.5,'left');
  for(const s of sectors){
   // A pale perimeter wall and accessible front walkway behind the LED run.
   if(s.zone==='near'&&Math.abs(s.a[1]-80.5)<.01&&Math.abs(s.b[1]-80.5)<.01){
    const ts=[0,1,...[50,55].map(x=>(x-s.a[0])/(s.b[0]-s.a[0])).filter(t=>t>0&&t<1)].sort((a,b)=>a-b);
    for(let i=0;i<ts.length-1;i++){const x=point(s,(ts[i]+ts[i+1])/2,0,0)[0];if(x>50&&x<55)continue;quad(s,-.55,0,-.55,.85,C.wall,{},ts[i],ts[i+1]);quad(s,-.65,.85,0,.85,C.cap,{},ts[i],ts[i+1])}
   }else{quad(s,-.55,0,-.55,.85,C.wall);quad(s,-.65,.85,0,.85,C.cap)}
   let q;
   if(s.zone==='right'){
    // The home end rises continuously; its super-riser aligns with side tiers.
    q=seating(s,0,.95,24,.47,'lower');
    quad(s,q.d,q.h,q.d+1.6,q.h,'#657477');guard(s,q.d,q.h);q.d+=1.6;quad(s,q.d,q.h,q.d,q.h+.95,C.wall);q.h+=.95;
    q=seating(s,q.d,q.h,33,.56,'home');
   }else if(s.zone==='left'){
    q=seating(s,0,.95,24,.47,'lower');
    quad(s,q.d,q.h,q.d+2.5,q.h,'#637275');ribbon(s,q.d,q.h);q.d+=2.5;quad(s,q.d,q.h,q.d,q.h+2,C.ink);q.h+=2;
    q=seating(s,q.d,q.h,31,.56,'upper');
   }else{
    q=seating(s,0,.95,22,.47,'lower');
    hospitality(s,q.d,q.h);q.d+=2.5;q.h+=2.6;
    q=seating(s,q.d,q.h,4,.43,'premium');
    hospitality(s,q.d,q.h);q.d+=2.5;q.h+=2.6;
    q=seating(s,q.d,q.h,4,.43,'premium');
    q.d+=1.3;quad(s,q.d,q.h,q.d,q.h+1.25,C.ink);q.h+=1.25;ribbon(s,q.d,q.h-.7);
    q=seating(s,q.d,q.h,24,.56,'upper');
   }
   // Rear clerestory and a shallow canopy; open pitch aperture stays clear.
   quad(s,q.d+.2,q.h-.5,q.d+.2,36.2+(q.d+.2-29)/22*1.9,'#73898f');
   for(let t=0;t<=1;t+=.25)rail(point(s,t,q.d,q.h),point(s,t,q.d,q.h+3.5),s.zone,.09,'#a6b8b8');
   const roofH=36.8,outer=51,inner=29;
   quad(s,inner,roofH-.6,35,roofH-.1,'#718992',{roof:'glass'});quad(s,35,roofH-.1,outer,roofH+1.3,'#3d4a51',{roof:'solid'});
   quad(s,inner,roofH-.6,inner,roofH-.12,'#b8c2bf');
   quad(s,outer,roofH+1.3,outer,roofH+1.7,'#b8c2bf');
   for(const t of [0,.5]){
    rail(point(s,t,inner,roofH-.7),point(s,t,outer,roofH+1.1),s.zone,.12,'#abb9ba');
    rail(point(s,t,inner,roofH-.7),point(s,t,outer,roofH-1.0),s.zone,.07,'#718588');
    for(let d=inner+4;d<outer;d+=4)rail(point(s,t,d,roofH-.7+(d-inner)/22*1.8),point(s,t,d,roofH-1),s.zone,.045,'#728489');
   }
  }
 }
 function rounded(t,x,y,w,h,r){t.beginPath();t.moveTo(x+r,y);t.lineTo(x+w-r,y);t.quadraticCurveTo(x+w,y,x+w,y+r);t.lineTo(x+w,y+h);t.lineTo(x,y+h);t.lineTo(x,y+r);t.quadraticCurveTo(x,y,x+r,y);t.closePath()}
 function atlas(spec){
  const key=[spec.kind,spec.rows,spec.cols,spec.portal].join('/');if(atlases.has(key))return atlases.get(key);
  const c=document.createElement('canvas'),cw=28,rh=30;c.width=(spec.cols+3)*cw;c.height=spec.rows*rh;const t=c.getContext('2d');
  t.fillStyle='#26323d';t.fillRect(0,0,c.width,c.height);
  for(let r=0;r<spec.rows;r++){
   const y=r*rh;t.fillStyle=r%2?'#3e4b55':'#3b4852';t.fillRect(0,y,c.width,rh);
   t.fillStyle='#172631';t.fillRect(0,y+rh-4,c.width,4);
   for(let col=0;col<spec.cols;col++){
    const x=(col+1.5)*cw,y0=y+4;
    t.fillStyle='#18232e';rounded(t,x-2,y0+4,25,22,6);t.fill();
    t.fillStyle=(r+col)%5===0?'#4b5966':'#465460';rounded(t,x,y0,22,16,6);t.fill();
    t.fillStyle='#65727b';t.fillRect(x+5,y0+1,12,1.6);
    t.fillStyle='#344450';rounded(t,x+2,y0+3,18,11,4);t.fill();
    t.fillStyle='#576570';t.fillRect(x+1,y0+17,20,4);t.fillStyle='#202e39';t.fillRect(x+1,y0+21,20,3);
   }
   // Concrete radial aisles with two half-height stair treads per seat row.
   for(const x of [0,c.width-cw*1.35]){t.fillStyle='#929b99';t.fillRect(x,y,cw*1.35,rh);t.fillStyle='#c1c6bd';t.fillRect(x,y,cw*1.35,2);t.fillRect(x,y+rh/2,cw*1.35,2);t.fillStyle='#667474';t.fillRect(x,y+rh/2-2,cw*1.35,2)}
  }
  if(spec.portal&&spec.rows>16){
   const w=2.6*cw,h=4.2*rh,x=cw*1.2,y=c.height*.63;
   t.fillStyle='#929e9b';t.fillRect(x-5,y-5,w+10,h+10);t.fillStyle='#12212b';t.fillRect(x,y,w,h);t.fillStyle='#0d1921';t.fillRect(x+8,y+6,w-16,h-6);
   t.fillStyle='#bbc4be';t.fillRect(x-7,y-7,w+14,9);t.fillStyle='#c9d3c6';t.fillRect(x+w/2-9,y+8,18,4);
  }
  atlases.set(key,c);return c;
 }
 function ribbonTex(){if(atlases.has('ribbon'))return atlases.get('ribbon');const c=document.createElement('canvas');c.width=640;c.height=48;const t=c.getContext('2d');t.fillStyle='#18292e';t.fillRect(0,0,640,48);t.fillStyle='#e4e8dd';t.font='600 24px Arial';t.textBaseline='middle';t.textAlign='center';t.fillText('T O U C H L I N E',320,25);atlases.set('ribbon',c);return c}
 function path(t,p){t.beginPath();p.forEach((q,i)=>i?t.lineTo(q.x,q.y):t.moveTo(q.x,q.y));t.closePath()}
 function tri(t,img,q,uv){
  const [a,b,c]=q,[u,v,w]=uv,det=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);if(!det)return;
  const A=((b.x-a.x)*(w[1]-u[1])-(c.x-a.x)*(v[1]-u[1]))/det,B=((b.y-a.y)*(w[1]-u[1])-(c.y-a.y)*(v[1]-u[1]))/det;
  const C=((c.x-a.x)*(v[0]-u[0])-(b.x-a.x)*(w[0]-u[0]))/det,D=((c.y-a.y)*(v[0]-u[0])-(b.y-a.y)*(w[0]-u[0]))/det;
  t.save();path(t,q);t.clip();t.setTransform(A,B,C,D,a.x-A*u[0]-C*u[1],a.y-B*u[0]-D*u[1]);t.drawImage(img,0,0);t.restore();
 }
 function tex(t,f,project){const img=f.tex?atlas(f.tex):ribbonTex(),n=f.tex&&f.seatRow===undefined?4:1,mix=(a,b,u)=>a.map((v,k)=>v+(b[k]-v)*u);
  // Textures are laid from the back row to front row; glyphs face the pitch.
  for(let i=0;i<n;i++){
   const v=i/n,w=(i+1)/n,uv0=f.seatRow===undefined?v:(f.tex.rows-f.seatRow-1)/f.tex.rows,uv1=f.seatRow===undefined?w:(f.tex.rows-f.seatRow)/f.tex.rows;
   const a=project(...mix(f.p[3],f.p[0],v)),b=project(...mix(f.p[2],f.p[1],v)),c=project(...mix(f.p[2],f.p[1],w)),d=project(...mix(f.p[3],f.p[0],w));
   tri(t,img,[a,b,c],[[0,uv0*img.height],[img.width,uv0*img.height],[img.width,uv1*img.height]]);tri(t,img,[a,c,d],[[0,uv0*img.height],[img.width,uv1*img.height],[0,uv1*img.height]]);
  }
 }
 function hash(n){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0}
 function occupied(spec,row,col,seed){
  // The stair aisles and the concourse portal stay genuinely unoccupied.
  const atlasRow=spec.rows-row-1;
  if(spec.portal&&spec.rows>16&&col<3&&atlasRow+0.5>=spec.rows*.63-.2&&atlasRow+0.5<=spec.rows*.63+4.5)return false;
  return hash(seed+row*131+col*17)%100>=(spec.kind==='premium'?12:4);
 }
 const crowdRows=new Map();let crowdRowBytes=0;
 function crowdStrip(spec,row,seed,angle,home){
  const pattern=hash(seed+row*131)%8,portal=spec.portal&&spec.rows>16&&spec.rows-row-.5>=spec.rows*.63-.2&&spec.rows-row-.5<=spec.rows*.63+4.5;
  const key=[spec.cols,pattern,portal,angle,home,spec.kind==='premium'].join('/');
  if(crowdRows.has(key)){const v=crowdRows.get(key);crowdRows.delete(key);crowdRows.set(key,v);return v}
  const density=38,span=(spec.cols+3)*.52,pad=.70,c=document.createElement('canvas');c.width=Math.ceil((span+2*pad)*density);c.height=88;
  const t=c.getContext('2d'),squeeze=Math.max(.38,Math.abs(Math.cos(angle*Math.PI/4))),fw=1.65*density/squeeze;
  let count=0;
  for(let col=0;col<spec.cols;col++){
   if(portal&&col<3)continue;
   const n=hash(pattern*7919+col*131);if(n%100<(spec.kind==='premium'?12:4))continue;
   const outfit=(n>>>8)%100,variant=n%6+6*(outfit<42?0:outfit<76?1:outfit<94?2:3),pose=(n>>>16)%100<(home?18:6)?2:(n>>>22)%2;
   const x=(pad+(col+1.89)*.52)*density;
   t.drawImage(fanImage,variant*80,(pose*8+angle)*112,80,112,x-fw/2,0,fw,88);count++;
  }
  const result={canvas:c,count,pad,span};crowdRows.set(key,result);crowdRowBytes+=c.width*c.height*4;
  // Bound GPU/CPU image storage on long camera tours.
  while(crowdRowBytes>40*1024*1024){const k=crowdRows.keys().next().value,old=crowdRows.get(k);crowdRowBytes-=old.canvas.width*old.canvas.height*4;crowdRows.delete(k)}
  return result;
 }
 function supporters(t,f,project,width,height){
  if(!config.crowd||!fanReady||!f.crowd)return;
  const {s,d,h,row,seed}=f.crowd,spec=f.tex;
  const mid=point(s,.5,d,h),q=project(...mid),px=project(mid[0]+1,mid[1],mid[2]),pz=project(mid[0],mid[1],mid[2]+1);
  const toward=[q.d-px.d,q.d-pz.d],normal=[-(s.n0[0]+s.n1[0])/2,-(s.n0[1]+s.n1[1])/2];
  const angle=(Math.round(Math.atan2(normal[0]*toward[1]-normal[1]*toward[0],normal[0]*toward[0]+normal[1]*toward[1])/(Math.PI/4))+8)%8;
  // Rows are upright world-space planes, not painted on the sloping seating.
  // Near edge-on rows need individual billboards to retain their silhouettes.
  if(angle===2||angle===6){
   for(let col=0;col<spec.cols;col++){
    if(!occupied(spec,row,col,seed))continue;const n=hash(seed+row*131+col*17),p=point(s,(col+1.89)/(spec.cols+3),d,h),b=project(...p),top=project(p[0],p[1]+2.31,p[2]);
    const ph=Math.abs(b.y-top.y),pw=ph*80/112;if(b.d<1||ph<1||b.x+pw/2<0||b.x-pw/2>width||b.y<0||b.y-ph>height)continue;
    const outfit=(n>>>8)%100,variant=n%6+6*(outfit<42?0:outfit<76?1:outfit<94?2:3),pose=(n>>>16)%100<(s.zone==='right'?18:6)?2:(n>>>22)%2;
    t.drawImage(fanImage,variant*80,(pose*8+angle)*112,80,112,b.x-pw/2,b.y-ph,pw,ph);fanCount++;
   }return;
  }
  const strip=crowdStrip(spec,row,seed,angle,s.zone==='right'),extra=strip.pad/strip.span;
  const a=project(...point(s,-extra,d,h+2.31)),b=project(...point(s,1+extra,d,h+2.31)),c=project(...point(s,1+extra,d,h)),e=project(...point(s,-extra,d,h));
  const img=strip.canvas;
  // One affine draw per short seat block; averaging the two vertical edges keeps
  // people upright at the curved corners without individual-character draw calls.
  const vx=((e.x-a.x)+(c.x-b.x))/2,vy=((e.y-a.y)+(c.y-b.y))/2;
  t.save();t.setTransform((b.x-a.x)/img.width,(b.y-a.y)/img.width,vx/img.height,vy/img.height,a.x,a.y);t.drawImage(img,0,0);t.restore();fanCount+=strip.count;
 }
 function visibleZone(zone,phase){return phase==='near'?zone==='near'&&!config.cutaway:zone!=='near'}
 function layer(project,phase,source){build();const sig=[source.width,source.height,config.cutaway,config.crowd,fanReady,...[[0,0,0],[105,0,68],[52,35,-40]].flatMap(p=>{const q=project(...p);return [q.x,q.y,q.d]})].join('|');let l=layers[phase];if(l&&l.sig===sig)return l.canvas;
  const start=performance.now();fanCount=0;if(!l)l=layers[phase]={canvas:document.createElement('canvas')};l.sig=sig;const c=l.canvas;c.width=source.width;c.height=source.height;const t=c.getContext('2d');t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';const items=[];
  for(const f of surfaces){if(!visibleZone(f.zone,phase))continue;const q=f.p.map(p=>project(...p));if(q.some(p=>p.d<1))continue;if(Math.max(...q.map(p=>p.x))<0||Math.min(...q.map(p=>p.x))>c.width||Math.max(...q.map(p=>p.y))<0||Math.min(...q.map(p=>p.y))-120>c.height)continue;items.push({f,q,d:q.reduce((s,p)=>s+p.d,0)/q.length})}
  for(const r of rails){if(!visibleZone(r.zone,phase))continue;const a=project(...r.a),b=project(...r.b);if(a.d<1||b.d<1||Math.max(a.x,b.x)<0||Math.min(a.x,b.x)>c.width||Math.max(a.y,b.y)<0||Math.min(a.y,b.y)>c.height)continue;items.push({r,q:[a,b],d:(a.d+b.d)/2})}
  items.sort((a,b)=>b.d-a.d);drawn=items.length;
  // Seating floors are under every supporter. This avoids distant row planes
  // slicing through heads when looking sideways across the home end.
  for(const item of items){if(item.f&&item.f.tex&&!item.f.crowdOnly){path(t,item.q);t.fillStyle=item.f.c; t.fill();tex(t,item.f,project)}}
  let pending=false,lastColour='',lastWidth=0;
  const flush=()=>{if(pending){t.stroke();pending=false}};
  for(const item of items){const {f,r,q}=item;
   if(f&&f.tex&&!f.crowdOnly)continue;
   if(f&&f.crowdOnly){flush();supporters(t,f,project,c.width,c.height);continue}
   if(r){
    const o=project(r.a[0],r.a[1]+1,r.a[2]);
    const width=Math.max(.5,Math.round(Math.hypot(o.x-q[0].x,o.y-q[0].y)*r.w*4)/4);
    if(!pending||r.c!==lastColour||width!==lastWidth){flush();t.strokeStyle=r.c;t.lineWidth=width;t.beginPath();pending=true;lastColour=r.c;lastWidth=width}
    t.moveTo(q[0].x,q[0].y);t.lineTo(q[1].x,q[1].y);
   }else{
    flush();path(t,q);t.fillStyle=f.roof?(((q[1].x-q[0].x)*(q[3].y-q[0].y)-(q[1].y-q[0].y)*(q[3].x-q[0].x))<0?(f.roof==='glass'?'#a5bfc4':'#b5bfbe'):(f.roof==='glass'?'#768991':'#35414a')):f.c;
    t.fill();if(f.tex||f.ribbon)tex(t,f,project);
   }
  }
  flush();
  buildMs=performance.now()-start;return c;
 }
 function draw(ctx,project,phase='far'){if(!config.enabled)return;ctx.drawImage(layer(project,phase,ctx.canvas),0,0)}
 function compositeNear(ctx,project,view,source){if(!config.enabled||config.cutaway)return;ctx.drawImage(layer(project,'near',source),view.sx,view.sy,view.sw,view.sh,0,0,ctx.canvas.width,ctx.canvas.height)}
 return {config,draw,compositeNear,inspect(){build();return {sectors:sectors.length,surfaces:surfaces.length,rails:rails.length,atlasCount:atlases.size,buildMs,drawn,fansDrawn:fanCount,fanReady,crowdRowAtlases:crowdRows.size,crowdRowMB:+(crowdRowBytes/1048576).toFixed(2),crowd:config.crowd,cutaway:config.cutaway}}};
})();
const TouchlineStadium=(()=>{
 'use strict';
 const config=Object.freeze({pitchW:105,pitchH:68,boardHeight:.9,sideOffset:3.6,endOffset:5.5,
   benches:[{x:36.5,w:10.5},{x:58,w:10.5}],benchFront:72.3,benchBack:75.6,
   technicalFront:69,technicalMargin:1,seatsPerRow:12,rows:2,seatPitch:.78});
 const faces=[],grounds=[],boards=[];
 const palette={ink:'#182327',rim:'#465352',base:'#283333',concrete:'#c4c7bd',stone:'#969e94',seat:'#343e4b',seatLight:'#56606b',seatDark:'#222c38',trim:'#737d82',grass:'#304f24',paint:'#f4f4ee'};
 let built=false,enabled=true;const cache={};const textures={};let lastBuildMs=0;
 function face(p,c,extra={}){const z=p.reduce((v,q)=>v+q[2],0)/p.length;faces.push({p,c,near:z>68,...extra})}
 function flat(x0,z0,x1,z1,c){grounds.push({p:[[x0,.008,z0],[x1,.008,z0],[x1,.008,z1],[x0,.008,z1]],c})}
 function box(x,y,z,w,h,d,c,top=c,side=c){
  face([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],c);
  face([[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]],side);
  face([[x,y,z],[x,y,z+d],[x,y+h,z+d],[x,y+h,z]],side);
  face([[x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z]],side);
  face([[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]],top);
 }
 function rod(a,b,r,c){
  // Square-profile slim metal rail; each quad stays in world coordinates.
  const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1,ox=-dz/len*r,oz=dx/len*r;
  face([[a[0]+ox,a[1],a[2]+oz],[b[0]+ox,b[1],b[2]+oz],[b[0]-ox,b[1],b[2]-oz],[a[0]-ox,a[1],a[2]-oz]],c);
  face([[a[0],a[1]-r,a[2]],[b[0],b[1]-r,b[2]],[b[0],b[1]+r,b[2]],[a[0],a[1]+r,a[2]]],c);
 }
 function chair(x,z,h){
  box(x-.09,h,z+.22,.18,.4,.22,palette.seatDark,palette.trim);
  box(x-.31,h+.4,z-.08,.62,.14,.57,palette.seat,palette.seatLight,palette.seatDark);
  // Sculpted shoulder and headrest outline, with a gently reclined back.
  const outline=[[-.29,.52],[-.34,.84],[-.28,1.01],[-.23,1.38],[-.16,1.46],[.16,1.46],[.23,1.38],[.28,1.01],[.34,.84],[.29,.52]];
  const front=outline.map(([u,v])=>[x+u,h+v,z+.35+(v-.5)*.11]);
  const back=front.map(p=>[p[0],p[1],p[2]+.12]);
  face(front,palette.seatLight);face(back,palette.seat);
  // Inset rear upholstery panel and shoulder seam give the broadcast-facing
  // backs the same broad, readable shaping as the character materials.
  face([[-.20,.64],[.20,.64],[.21,1.02],[.14,1.28],[-.14,1.28],[-.21,1.02]].map(([u,v])=>[x+u,h+v,z+.475+(v-.5)*.11]),'#2c3642');
  rod([x-.15,h+1.3,z+.559],[x+.15,h+1.3,z+.559],.008,'#6a7480');
  for(let i=0;i<front.length;i++)face([front[i],front[(i+1)%front.length],back[(i+1)%front.length],back[i]],i<5?palette.seatDark:palette.trim);
  face([[x-.20,h+.67,z+.375],[x+.20,h+.67,z+.375],[x+.19,h+1.08,z+.42],[x-.19,h+1.08,z+.42]],'#424d5a');
  for(const v of [.71,.87,1.03])rod([x-.18,h+v,z+.36+(v-.5)*.11],[x+.18,h+v,z+.36+(v-.5)*.11],.006,'#66717a');
  for(const s of [-1,1])box(x+s*.34-.045,h+.65,z-.04,.09,.095,.48,palette.seatDark,palette.trim);
  // Subtle seam on the back, visible from the broadcast camera.
  rod([x-.22,h+.66,z+.49],[x-.16,h+1.29,z+.565],.008,'#56616b');
  rod([x+.22,h+.66,z+.49],[x+.16,h+1.29,z+.565],.008,'#56616b');
 }
 function glass(x,z0,z1,h0,h1){
  face([[x,h0,z0],[x,h0,z1],[x,h1,z1],[x,h1,z0]],'rgba(162,190,182,.20)');
  rod([x,h1,z0],[x,h1,z1],.025,'#9baaa4');
  for(const z of [z0,z1])box(x-.028,h0,z-.028,.056,h1-h0,.056,'#728680','#b3c0b6');
 }
 function bench(b){
  const {x,w}=b,z=config.benchFront;
  flat(x-.4,z-.35,x+w+.4,76,'rgba(15,24,18,.22)');
  box(x,.02,z,w,.16,3.3,'#485448',palette.grass,'#556050');
  box(x,.18,z+1.55,w,.28,1.75,'#455043',palette.grass,'#626b5e');
  box(x,0,75.55,w,.85,.24,palette.concrete,'#d7d9d0',palette.stone);
  for(const side of [x-.12,x+w]){
   box(side,0,z,.12,.2,3.55,palette.stone,palette.concrete);
   glass(side+.06,z+.2,75.45,.2,1.05);
  }
  const start=x+(w-(config.seatsPerRow-1)*config.seatPitch)/2;
  for(let row=0;row<2;row++)for(let i=0;i<config.seatsPerRow;i++)chair(start+i*config.seatPitch,z+.35+row*1.5,.18+row*.28);
  // Small stepped access at each outer edge, silver handrails.
  for(const sx of [x-.9,x+w+.15]){
   box(sx,0,z+.9,.7,.14,.8,'#626c60','#8a9286');
   box(sx,.14,z+1.3,.7,.14,.8,'#626c60','#8a9286');
   rod([sx+.35,.9,z+.9],[sx+.35,1.18,z+2.1],.025,'#abb4b1');
   for(const zz of [z+1,z+2])rod([sx+.35,.15,zz],[sx+.35,1.04,zz],.025,'#abb4b1');
  }
 }
 function texture(kind){
  if(textures[kind])return textures[kind];
  const c=document.createElement('canvas');c.width=768;c.height=96;const t=c.getContext('2d');
  const cream=kind%3===1;t.fillStyle=cream?'#e6e8dc':'#152522';t.fillRect(0,0,768,96);
  const fg=cream?'#233b31':'#ecefdf';t.fillStyle=fg;t.font='900 64px Arial, sans-serif';t.textAlign='center';t.textBaseline='middle';
  t.fillText('TOUCHLINE',382,50);
  t.fillStyle=cream?'#42593a':'#c7cc74';
  for(const x of [22,674])for(let j=0;j<3;j++){t.beginPath();t.moveTo(x+j*19,23);t.lineTo(x+j*19+10,23);t.lineTo(x+j*19+24,73);t.lineTo(x+j*19+14,73);t.fill()}
  // Fine LED rows are part of a cached texture, never animated noise.
  t.fillStyle=cream?'rgba(0,0,0,.04)':'rgba(0,0,0,.14)';for(let y=0;y<96;y+=3)t.fillRect(0,y,768,1);
  return textures[kind]=c;
 }
 function board(a,b,n,idx){
  const h=config.boardHeight,th=.20;
  const back=p=>[p[0]-n[0]*th,p[1],p[2]-n[1]*th];
  const A=[a[0],.04,a[1]],B=[b[0],.04,b[1]],C=[b[0],h,b[1]],D=[a[0],h,a[1]];
  face([A,B,C,D],palette.ink,{ad:idx%3});
  face([back(B),back(A),back(D),back(C)],'#263331');
  face([D,C,back(C),back(D)],'#7a8479');
  face([A,D,back(D),back(A)],'#36443e');face([B,C,back(C),back(B)],'#36443e');
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  // Rear cabinet ribs and angled stabilising feet.
  for(let d=.35;d<len;d+=1.5){const f=d/len,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
   rod([x-n[0]*.22,.1,z-n[1]*.22],[x-n[0]*.22,.83,z-n[1]*.22],.018,'#47554e');
   rod([x-n[0]*.2,.55,z-n[1]*.2],[x-n[0]*.62,.02,z-n[1]*.62],.028,'#39483f');
  }
  boards.push({a,b,n,height:h});
 }
 function run(a,b,n){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(len/7.6);
  for(let i=0;i<count;i++){const p=f=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];board(p(i/count),p((i+1)/count),n,boards.length)}
 }
 function build(){
  if(built)return;built=true;
  // Single-height, inward-facing LED perimeter, rounded with chamfered corners.
  run([-3,-3.6],[108,-3.6],[0,1]);run([108,-3.6],[110.5,-1.1],[-.707,.707]);
  run([110.5,-1.1],[110.5,69.1],[-1,0]);run([110.5,69.1],[108,71.6],[-.707,-.707]);
  run([108,71.6],[71.3,71.6],[0,-1]);
  run([71.3,71.6],[71.3,77.3],[-1,0]);run([71.3,77.3],[55,77.3],[0,-1]);
  run([50,77.3],[33.7,77.3],[0,-1]);run([33.7,77.3],[33.7,71.6],[1,0]);
  run([33.7,71.6],[-3,71.6],[0,-1]);run([-3,71.6],[-5.5,69.1],[.707,-.707]);
  run([-5.5,69.1],[-5.5,-1.1],[1,0]);run([-5.5,-1.1],[-3,-3.6],[.707,.707]);
  flat(33.4,70.25,71.6,78.1,'#314d29');flat(49.9,70.3,55.1,80,'#394f33');
  config.benches.forEach(bench);
  // Open central tunnel approach; no ad barrier across the players' route.
  for(const x of [49.85,55.0]){
   box(x,0,75.6,.15,.67,4.4,palette.concrete,'#d5d9ce',palette.stone);
   rod([x+.075,.88,75.8],[x+.075,.88,79.8],.028,'#bac0b8');
   for(const z of [76,77.7,79.5])rod([x+.075,.25,z],[x+.075,.88,z],.022,'#8d9b93');
  }
  // Fourth official station sits beside, rather than across, the access lane.
  box(48.35,0,72.7,.75,.83,.52,'#303b39','#737f73','#232f2a');
  box(48.46,.84,72.83,.46,.035,.27,'#171e20','#0c1418');
  chair(48.72,73.6,0);
  // Shrouded referee-review monitor inside its marked box.
  box(29.45,0,70.45,.55,.12,.42,'#252f2b','#626c62');
  box(29.68,.12,70.55,.09,.94,.09,'#46534c','#7c877b');
  box(29.35,1.05,70.43,.75,.47,.12,'#18231f','#424e46');
  face([[29.41,1.1,70.422],[30.04,1.1,70.422],[30.04,1.45,70.422],[29.41,1.45,70.422]],'#30433c');
  box(29.31,1.52,70.2,.83,.04,.4,'#1b2722','#4b594f');
 }
 function path(ctx,q){ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}
 function projected(f,project,W,H){const q=f.p.map(p=>project(...p));if(q.some(p=>p.d<.5))return null;
  if(Math.max(...q.map(p=>p.x))<0||Math.min(...q.map(p=>p.x))>W||Math.max(...q.map(p=>p.y))<0||Math.min(...q.map(p=>p.y))>H)return null;
  return {f,q,d:q.reduce((s,p)=>s+p.d,0)/q.length};
 }
 function texTri(ctx,img,q,s){
  const [a,b,c]=q,[u,v,w]=s,det=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);if(Math.abs(det)<1e-8)return;
  const aa=((b.x-a.x)*(w[1]-u[1])-(c.x-a.x)*(v[1]-u[1]))/det;
  const bb=((b.y-a.y)*(w[1]-u[1])-(c.y-a.y)*(v[1]-u[1]))/det;
  const cc=((c.x-a.x)*(v[0]-u[0])-(b.x-a.x)*(w[0]-u[0]))/det;
  const dd=((c.y-a.y)*(v[0]-u[0])-(b.y-a.y)*(w[0]-u[0]))/det;
  ctx.save();path(ctx,q);ctx.clip();ctx.setTransform(aa,bb,cc,dd,a.x-aa*u[0]-cc*u[1],a.y-bb*u[0]-dd*u[1]);ctx.drawImage(img,0,0);ctx.restore();
 }
 function paint(ctx,item,project){const {f,q}=item;path(ctx,q);ctx.fillStyle=f.c;ctx.fill();
  if(f.ad!==undefined){
   // Only the pitch-facing side carries advertising.
   const area=(q[1].x-q[0].x)*(q[3].y-q[0].y)-(q[1].y-q[0].y)*(q[3].x-q[0].x);
   if(area>=0)return;
   const img=texture(f.ad),steps=4,lerp=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
   for(let i=0;i<steps;i++){
    const a=project(...lerp(f.p[3],f.p[2],i/steps)),b=project(...lerp(f.p[3],f.p[2],(i+1)/steps));
    const d=project(...lerp(f.p[0],f.p[1],i/steps)),c=project(...lerp(f.p[0],f.p[1],(i+1)/steps));
    const u=i/steps*img.width,v=(i+1)/steps*img.width;
    texTri(ctx,img,[a,b,c],[[u,0],[v,0],[v,img.height]]);texTri(ctx,img,[a,c,d],[[u,0],[v,img.height],[u,img.height]]);
   }
  }
 }
 function ground(ctx,project){if(!enabled)return;build();ctx.save();
  for(const f of grounds){const a=projected(f,project,ctx.canvas.width,ctx.canvas.height);if(a){path(ctx,a.q);ctx.fillStyle=f.c;ctx.fill()}}
  // World-space 10 cm paint, independent of camera zoom. Technical area front
  // is 1 m outside touchline; lateral boundaries are 1 m beyond each bench.
  const line=(a,b,w=.10)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),ox=-dz/l*w/2,oz=dx/l*w/2;
   const q=[[a[0]+ox,.012,a[1]+oz],[b[0]+ox,.012,b[1]+oz],[b[0]-ox,.012,b[1]-oz],[a[0]-ox,.012,a[1]-oz]].map(p=>project(...p));if(q.some(p=>p.d<.5))return;path(ctx,q);ctx.fillStyle=palette.paint;ctx.fill()};
  const dash=(a,b)=>{const len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<len;t+=.72){const p=d=>[a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len];line(p(t),p(Math.min(t+.43,len)))}};
  for(const b of config.benches){const x=b.x-1,r=b.x+b.w+1;dash([x,69],[r,69]);dash([x,69],[x,75.6]);dash([r,69],[r,75.6]);}
  // Optional 9.15 m corner-distance ticks measured from the 1 m corner arc.
  for(const x of [10.15,94.85])for(const z of [0,68])line([x,z+(z===0?-.25:.25)],[x,z+(z===0?-.65:.65)]);
  for(const z of [10.15,57.85])for(const x of [0,105])line([x+(x===0?-.25:.25),z],[x+(x===0?-.65:.65),z]);
  // Referee review area, kept outside both technical areas and access routes.
  const pts=[[28.6,69.3],[30.8,69.3],[30.8,71],[28.6,71]];for(let i=0;i<4;i++)line(pts[i],pts[(i+1)%4]);
  ctx.restore();
 }
 function layer(project,phase,source){build();const pts=[[0,0,0],[105,0,68],[52.5,2,75]].map(p=>project(...p));
  const key=[source.width,source.height,...pts.flatMap(p=>[p.x,p.y,p.d])].join('|');let c=cache[phase];if(c&&c.key===key)return c.canvas;
  const start=performance.now();if(!c)c=cache[phase]={canvas:document.createElement('canvas')};c.key=key;const canvas=c.canvas;canvas.width=source.width;canvas.height=source.height;const ct=canvas.getContext('2d');ct.imageSmoothingEnabled=true;
  const items=faces.filter(f=>f.near===(phase==='near')).map(f=>projected(f,project,source.width,source.height)).filter(Boolean).sort((a,b)=>b.d-a.d);
  items.forEach(i=>paint(ct,i,project));lastBuildMs=performance.now()-start;return canvas;
 }
 function draw(ctx,project,phase='far'){if(!enabled)return;TouchlineStands.draw(ctx,project,phase);ctx.save();ctx.drawImage(layer(project,phase,ctx.canvas),0,0);ctx.restore()}
 function compositeNear(ctx,project,view,source){if(!enabled)return;TouchlineStands.compositeNear(ctx,project,view,source);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(layer(project,'near',source),view.sx,view.sy,view.sw,view.sh,0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore()}
 return {config,ground,draw,compositeNear,setEnabled(v){enabled=!!v},inspect(){build();return {config,boards,faceCount:faces.length,lastBuildMs}}};
})();
