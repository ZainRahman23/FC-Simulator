// occupy1/tools/two/o_two_loader.mjs — the resolve hook (see o_two_hook.mjs)
const SHIM = new URL("./o_two_shim.js", import.meta.url).href, ENVSHIM = new URL("./o_two_env.mjs", import.meta.url).href;
export async function resolve(spec, ctx, next) { const r = await next(spec, ctx);
  if (r.url.endsWith("/sandbox/visual/possess1/p_world.js") && (ctx.parentURL || "").includes("/sandbox/visual/possess1/")) return Object.assign({}, r, { url: SHIM });
  if (r.url.endsWith("/sandbox/visual/vocab2/tools/u_env.mjs") && (ctx.parentURL || "").includes("/sandbox/visual/possess1/")) return Object.assign({}, r, { url: ENVSHIM });
  return r; }
