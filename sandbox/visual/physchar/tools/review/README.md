# physchar review tooling (preserved from the session scratchpad, 2026-09-30)

These are the tools used to produce the Gate A → D evidence. They were copied here before a reboot, because the session scratchpad under `/private/tmp` does not survive one.

| file / folder | what it is |
|---|---|
| `regress.sh` | Full regression. V1 (approved) and V1.1 (promoted) Gates A/B/C1/C2, then C3 (29) and Gate D (7), each compared with the committed evidence hashes. `tools/review/regress.sh [outdir]`, about 2–3 min, sequential. |
| `v11_cap.js` | One headless Chrome against the harness. It does two jobs: a **browser = Node hash check** (`--hash plan.json`) and **captures** (`--shots shots.json`). It needs `puppeteer-core` (see below) and the harness server. |
| `strip.py` | Filmstrip / contact sheet from captured PNGs: `python3 strip.py <capdir> <out.jpg> 186 <cols> <name…>`. |
| `gatea_cap.js` … `gatec2_cap.js` | The earlier per-gate capture scripts (Gates A–C2 evidence). |
| `page_shot.js` | A single full-page screenshot (it needs the `puppeteer` package instead of `puppeteer-core`). |
| `shots/` | The shot lists used for the review sheets: C2, C3, C4/C5, C5 late and fade, Gate D, D6, harness UI, V1.1. |
| `hashplans/` | The browser = Node plans: V1.1 promotion, C3, C4 + C5 with arms/protective flags, Gate D, cross-suite smoke. |
| `probes/` | Analysis probes (Node, read-only against the gate modules). Each is run as `node probes/<x>.mjs "$PWD" …` from `sandbox/visual/physchar`. Copies of the ones cited in the reports also sit in `review_artifacts/physical_character_v1/*/analysis/`. |
| `v1_1_report/` | Sources and generators of `ANATOMY_V1_1_REPORT` (`v11_assemble.py`, tables, sheets, batch scripts). Their paths point at the old scratchpad; adjust `SP` if you re-run them. |

## Browser checks and captures after a reboot

```sh
# 1. harness server (worktree root)
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1" && python3 -m http.server 8171
# 2. puppeteer-core (once; the overnight runs used puppeteer-core 24.43.1 with the installed Google Chrome)
mkdir -p ~/pptr && cd ~/pptr && npm i puppeteer-core@24.43.1
# 3. e.g. Gate D browser = Node
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/tools/review"
PUPPETEER_NODE_MODULES=~/pptr/node_modules node v11_cap.js --out /tmp/pc_cap \
  --url "http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=D&test=D0_apart" \
  --hash hashplans/d_hashplan.json --shots shots/empty_shots.json
```
