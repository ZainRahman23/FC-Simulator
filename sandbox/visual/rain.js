/* Touchline weather. Presentation only; metres and the existing world projection.
 * Seeded positions + an analytic clock make motion independent of frame rate.
 * No textures, simulation state, camera settings or stadium materials change.
 */
"use strict";
const TouchlineRain = (() => {
  const drops = [];
  let seed = 47219, time = 0, weather = "rain";
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 3200; i++) drops.push({
    x: -3 + random() * 111, y: -3 + random() * 74,
    phase: random(), speed: 11 + random() * 5, band: i % 3,
  });
  // Match the full rendered grass apron, including runoff beyond the lines.
  const snowBounds = { x0: -8, x1: 113, y0: -8, y1: 76 };
  const snow = [];
  for (let i = 0; i < 6200; i++) snow.push({
    x: snowBounds.x0 + random() * (snowBounds.x1 - snowBounds.x0), y: snowBounds.y0 + random() * (snowBounds.y1 - snowBounds.y0),
    phase: random(), speed: .85 + random() * .9,
    size: .025 + random() * .05, sway: random() * Math.PI * 2,
  });
  const snowStates = {
    'snow-light': { count: 1000, speed: 1, wind: .10, sway: .24, cover: 0 },
    'snow': { count: 3000, speed: 1.3, wind: .28, sway: .45, cover: .12 },
    'snow-extreme': { count: 6200, speed: 2.2, wind: 1.1, sway: .85, cover: .58 },
  };
  try { setWeather(new URLSearchParams(location.search).get("weather") || "rain"); } catch (_) {}
  function setWeather(value) { if (["off", "light", "rain", ...Object.keys(snowStates)].includes(value)) weather = value; }
  function count() { return snowStates[weather]?.count ?? (weather === "off" ? 0 : weather === "light" ? 1400 : drops.length); }
  function snowState(i, at = time, mode = weather) {
    const p = snow[i], preset = snowStates[mode] || snowStates.snow;
    const cycle = ((at * p.speed * preset.speed / 18 + p.phase) % 1 + 1) % 1;
    const h = 18 * (1 - cycle);
    // Wind acts through world space, so flakes follow the same rail projection.
    // Gusts share a slow rhythm; individual eddies keep the fall irregular.
    const gust = preset.wind * (1 + .38 * Math.sin(at * .63));
    return {
      x: p.x - h * gust + Math.sin(at * 1.1 + p.sway) * preset.sway,
      y: p.y + Math.cos(at * .8 + p.sway) * preset.sway * .5,
      h, size: p.size,
    };
  }
  function state(i, at = time) {
    const p = drops[i], cycle = ((at * p.speed / 18 + p.phase) % 1 + 1) % 1;
    const h = 18 * (1 - cycle);
    return { x: p.x - h * .07, y: p.y, h, impactAge: cycle * 18 / p.speed };
  }
  function point(project, x, h, y, view) {
    const q = project(x, h, y);
    return view ? { x: (q.x - view.sx) * view.Z, y: (q.y - view.sy) * view.Z, d: q.d } : q;
  }
  function valid(q) { return Number.isFinite(q.x) && Number.isFinite(q.y) && (q.d === undefined || q.d > 0); }
  function ground(ctx, project, resolution = 1) {
    if (!count()) return;
    if (snowStates[weather]) return snowGround(ctx, project);
    ctx.save(); ctx.strokeStyle = "rgba(215,230,208,0.24)";
    ctx.lineWidth = Math.max(1, resolution * .65); ctx.beginPath();
    // Short, broken ground rings on the exposed pitch only; no glossy wash.
    for (let i = 0; i < count(); i += 3) {
      const p = drops[i], s = state(i);
      if (s.impactAge > .16 || p.x < 0 || p.x > 105 || p.y < 0 || p.y > 68) continue;
      const r = .035 + .13 * s.impactAge / .16;
      const a = project(p.x - r, .018, p.y), b = project(p.x, .018, p.y + r * .55), c = project(p.x + r, .018, p.y);
      if (!valid(a) || !valid(b) || !valid(c)) continue;
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
    }
    ctx.stroke(); ctx.restore();
  }
  function air(ctx, project, resolution = 1, view = null) {
    if (!count()) return;
    if (snowStates[weather]) return snowAir(ctx, project, resolution, view);
    ctx.save(); ctx.lineCap = "butt";
    const colours = ["rgba(216,231,216,0.24)", "rgba(221,233,220,0.34)", "rgba(234,239,225,0.43)"];
    for (let band = 0; band < 3; band++) {
      ctx.strokeStyle = colours[band]; ctx.lineWidth = Math.max(1, resolution * (band === 2 ? .9 : .65)); ctx.beginPath();
      for (let i = band; i < count(); i += 3) {
        const s = state(i), tail = Math.min(18 - s.h, .38 + band * .14);
        const a = point(project, s.x, s.h, s.y, view);
        const b = point(project, s.x - tail * .07, s.h + tail, s.y, view);
        if (!valid(a) || !valid(b) || Math.max(a.x, b.x) < 0 || Math.min(a.x, b.x) > ctx.canvas.width || Math.max(a.y, b.y) < 0 || Math.min(a.y, b.y) > ctx.canvas.height) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function snowGround(ctx, project) {
    const cover = snowStates[weather].cover;
    if (!cover) return;
    ctx.save(); ctx.fillStyle = `rgba(235,237,222,${cover})`;
    ctx.beginPath();
    const {x0,x1,y0,y1} = snowBounds;
    const corners = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>project(x,.012,y));
    if (!corners.every(valid)) { ctx.restore(); return; }
    corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
    // Less-trampled runoff holds a little more snow, with no green boundary
    // at the touchlines. Four disjoint strips avoid double-painted corners.
    ctx.fillStyle = `rgba(235,237,222,${cover * .18})`;
    for (const [l,t,r,b] of [[x0,y0,x1,0],[x0,68,x1,y1],[x0,0,0,68],[105,0,x1,68]]) {
      const ring = [[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>project(x,.012,y));
      if (!ring.every(valid)) continue;
      ctx.beginPath();ring.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fill();
    }
    // Broken, matte deposits extend across the same full grass apron.
    ctx.fillStyle = `rgba(242,240,226,${cover * .48})`;ctx.beginPath();
    for (let i=0;i<520;i++) {
      const p=snow[i], rx=.22+p.size*10, ry=.08+p.size*4;
      if(p.x-rx<x0||p.x+rx>x1||p.y-ry<y0||p.y+ry>y1)continue;
      const vertices=[[-rx,0],[-rx*.4,-ry],[rx*.6,-ry*.7],[rx,0],[rx*.25,ry],[-rx*.65,ry*.6]];
      const poly=vertices.map(([x,y])=>project(p.x+x,.014,p.y+y));
      if(!poly.every(valid))continue;
      poly.forEach((q,j)=>j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();
    }
    ctx.fill();ctx.restore();
  }
  function snowAir(ctx, project, resolution, view) {
    ctx.save();
    const colours=['rgba(222,231,222,.48)','rgba(240,242,231,.70)','rgba(250,247,235,.88)'];
    for(let band=0;band<3;band++) {
      ctx.fillStyle=colours[band];ctx.beginPath();
      for(let i=band;i<count();i+=3) {
        const p=snowState(i),q=point(project,p.x,p.h,p.y,view);
        if(!valid(q)||q.x< -12||q.x>ctx.canvas.width+12||q.y< -12||q.y>ctx.canvas.height+12)continue;
        const edge=point(project,p.x+p.size,p.h,p.y,view);
        if(!valid(edge))continue;
        const r=Math.max(resolution*.55,Math.min(resolution*3.2,Math.hypot(edge.x-q.x,edge.y-q.y)));
        // Small faceted flakes complement the game's soft cel / pixel detail.
        ctx.moveTo(q.x-r,q.y);ctx.lineTo(q.x-r*.4,q.y-r*.75);
        ctx.lineTo(q.x+r*.6,q.y-r*.65);ctx.lineTo(q.x+r,q.y+r*.25);
        ctx.lineTo(q.x+r*.1,q.y+r);ctx.lineTo(q.x-r*.7,q.y+r*.6);ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  }
  return {
    step(dt) { if (Number.isFinite(dt) && dt > 0) time += Math.min(dt, .1); },
    setWeather, getWeather: () => weather, ground, air,
    inspect: () => ({ weather, time, count: count() }),
    sample: state,
    sampleSnow: snowState,
  };
})();
