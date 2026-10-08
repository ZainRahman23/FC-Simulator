# Package validation — 8 October 2026

These checks validate the reconstruction package, **not the historical game, original UI prototypes or original workbooks**. No repository import has been applied.

Inventory: **24 source groups**, **105 recorded evidence events**, **7 daily supplements**, **9 existing screenshot references**, **30 acquisition-queue records**. The records are extracted summaries/locators, not newly recovered original files.

| Check | Result |
|---|---|
| source ids unique | PASS |
| seven daily supplements | PASS |
| nine existing screenshot references | PASS |
| thirty acquisition queue records | PASS |
| exact git manifest snapshot | PASS |
| local markdown links resolve | PASS |
| six synthetic importer tests | PASS |
| no original binary media claimed or embedded | PASS |

## Importer test scope

Six tests passed on a synthetic fixture: non-UI sentinel preservation; duplicate refusal; missing-anchor refusal; exact-blob guard refusal without writes; synthetic dry-run and local application; and symlink refusal. The fixture is not the full actual GitHub chronicle. The full chronicle was inspected through connector excerpts but was not mounted locally, so a real-checkout guarded dry run is still required.

The production importer has no hash-bypass option. The test alone substitutes an in-memory expected hash for its synthetic fixture; it never touches the actual repository. No original game tests were run.

## Manifest verification

The reproduced existing screenshot manifest contains **3,088 bytes** and computes to Git blob **75eb420c372bda8a92a16f4f63ed7f383bea28f3**, matching the fetched GitHub file. This proves the manifest snapshot’s bytes, **not the original PNGs’ bytes**. Nine selected image hashes are carried from the original manifest; image binaries were not downloaded, viewed or re-hashed here.

## Checksums and publication

`SHA256SUMS` contains hashes of the deliverable package files (excluding itself). Those hashes are integrity checks for this October 8 reconstruction, not backdated evidence hashes. The ZIP is a local deliverable. A GitHub documentation-branch write returned HTTP 403; no repository files or history were changed.
