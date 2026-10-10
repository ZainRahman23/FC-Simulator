// prints the scratch-only VARIATION_SET extension for the RH1 battery (RH1_PREREG.md §6): the PI-1 runner (control R0) and RH1, as plain data,
// plus their expected spec hashes at ankle K 0.13 (the battery verifies the scratch tree reproduces them). usage (worktree root): node …/rh1_varset_ext.mjs
const P2 = process.cwd() + "/sandbox/visual/physchar2/";
const { PI1_RUNNER, pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js"), { PI1_RUNNER_RH1, pi1RunnerRH1Spec } = await import(P2 + "spec/v2_pi1_runner_rh.js"), { specHash } = await import(P2 + "spec/v2_spec.js");
const R0 = JSON.parse(JSON.stringify(PI1_RUNNER)), RH = JSON.parse(JSON.stringify(PI1_RUNNER_RH1));
console.log(`// ── RH1 battery (scratch only, record_hinged/RH1_PREREG.md §6): control R0 = PI-1 runner, subject RH1; expected spec hashes at K 0.13: R0 ${specHash(pi1RunnerSpec())}, RH1 ${specHash(pi1RunnerRH1Spec())}\nVARIATION_SET.push(${JSON.stringify(R0)}, ${JSON.stringify(RH)});`);
