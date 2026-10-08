/* Game-tuned surface response, shared by ball integration and predictors.
 * Air drag and launch impulses are unchanged; wet ground dissipates less
 * forward speed and produces lower, skidding bounces. Snow increases rolling
 * resistance and absorbs impact, including contacts too soft to rebound.
 * Units: metres/seconds.
 */
"use strict";
const TouchlineSurface = (() => {
  const profiles = Object.freeze({
    off: Object.freeze({ roll: 4.2, keep: .80, bounce: .55, settleKeep: 1 }),
    light: Object.freeze({ roll: 3.45, keep: .86, bounce: .50, settleKeep: 1 }),
    rain: Object.freeze({ roll: 2.65, keep: .92, bounce: .44, settleKeep: 1 }),
    'snow-light': Object.freeze({ roll: 4.35, keep: .79, bounce: .53, settleKeep: .98 }),
    snow: Object.freeze({ roll: 6.1, keep: .65, bounce: .34, settleKeep: .65 }),
    'snow-extreme': Object.freeze({ roll: 9.2, keep: .45, bounce: .20, settleKeep: .45 }),
  });
  let override = null;
  function forWeather(mode) { return profiles[mode] || profiles.off; }
  function current() { return forWeather(override ?? (typeof TouchlineRain === 'undefined' ? 'off' : TouchlineRain.getWeather())); }
  return {
    forWeather, current,
    // Synchronous isolated reference trajectories; never changes visible weather.
    withWeather(mode, fn) { const before=override;override=mode;try{return fn();}finally{override=before;} },
  };
})();
