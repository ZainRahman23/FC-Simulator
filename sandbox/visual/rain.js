/* Touchline rain. Presentation only; metres and the existing world projection.
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
  try { setWeather(new URLSearchParams(location.search).get("weather") || "rain"); } catch (_) {}
  function setWeather(value) { if (["off", "light", "rain"].includes(value)) weather = value; }
  function count() { return weather === "off" ? 0 : weather === "light" ? 1400 : drops.length; }
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
  return {
    step(dt) { if (Number.isFinite(dt) && dt > 0) time += Math.min(dt, .1); },
    setWeather, getWeather: () => weather, ground, air,
    inspect: () => ({ weather, time, count: count() }),
    sample: state,
  };
})();
