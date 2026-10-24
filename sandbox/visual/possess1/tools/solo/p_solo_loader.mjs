// possess1/tools/solo/p_solo_loader.mjs — the resolve hook (see p_solo_hook.mjs)
const SHIM = new URL("./p_solo_shim.js", import.meta.url).href;
export async function resolve(spec, ctx, next) { const r = await next(spec, ctx);
  if (r.url.endsWith("/sandbox/visual/vocab2/c_sim.js") && !(ctx.parentURL || "").includes("/sandbox/visual/possess1/")) return Object.assign({}, r, { url: SHIM });
  return r; }
