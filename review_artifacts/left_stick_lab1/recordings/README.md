# recordings/ — the owner's left-stick datasets

Exported from TOUCHLINE — LEFT-STICK INPUT LAB V1, format `TOUCHLINE_LEFT_STICK_RECORDING_V1` (`../LEFT_STICK_LAB_REPORT.md` §5). Analysis sessions read them with `sandbox/visual/lsi1/tools/lsr_report.mjs`, `lsr_verify.mjs`, `lsr_owner_analysis.mjs` and `lsr_owner_probe.mjs`.

| file | what |
|---|---|
| `owner_2026-10-24_session1_21attempts.json` | **The owner's first session** (24 Oct 2026, 00:43–01:21 UTC): 21 real attempts, mouse on the virtual stick, RESET starts, no G marks. The lab saves attempts in the browser's IndexedDB rather than exporting them, so this file was read from a **copy** of the owner's Chrome store (origin 127.0.0.1:8362) in a separate headless profile; the owner's browser was not touched. It re-simulates 21/21 identically (`../../owner_input_analysis1/evidence/owner_verify.txt`). Analysed in `../../owner_input_analysis1/`. |

No recognizer exists; these files are the evidence for designing one.
