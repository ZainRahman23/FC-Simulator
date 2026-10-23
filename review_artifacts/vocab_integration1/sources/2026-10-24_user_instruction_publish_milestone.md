# Owner instruction — publish the vocabulary-integration milestone (24 Oct 2026 ≈ 02:00 EEST), verbatim

Publish the current completed **Body Feint + La Croqueta vocabulary integration milestone** to the authoritative GitHub repository.

This is a **publication-only task**.

Do NOT develop anything new.

Do NOT modify gameplay behavior.

Do NOT start the left-stick recognizer.

Do NOT fix inherited B4 issues.

Do NOT retune Body Feint or Croqueta.

The current local integration commit is:

```text
f775daac
```

and the pre-integration recovery checkpoint is:

```text
checkpoint/touchline-feint-croqueta-approved-2026-10-23
```

First independently verify the exact local repository/branch/HEAD and use the existing source-of-truth documentation rather than assuming any identifier from this prompt is correct.

# 1. VERIFY LOCAL STATE

Report:

```text
repository
worktree path
current branch
HEAD
git status
remotes
```

Confirm that the intended integration commit contains the completed vocabulary integration described in the current handoff.

Check for:

```text
tracked modifications
untracked source
unpushed commits
unpublished tags/checkpoints
```

Do not accidentally omit relevant source.

Do not publish disposable logs, recordings, browser captures, temporary evidence, caches, or other generated material that is intentionally excluded.

# 2. VERIFY THE MILESTONE CONTENT

Before pushing, confirm the milestone identifies the current authoritative versions as:

```text
BODY FEINT
video-guided + exit-foot implementation

LA CROQUETA
LEG-WAVE V4
```

Confirm their approved/reviewed motion is unchanged by integration.

Confirm the source-of-truth documentation and manifest identify:

```text
authoritative source paths
current production/provisional vocabulary entries
superseded versions
historical versions
validated entry envelopes
known limitations
decline policies
review pages
test/evidence locations
```

# 3. PRESERVE THE PRE-INTEGRATION CHECKPOINT

Verify:

```text
checkpoint/touchline-feint-croqueta-approved-2026-10-23
```

points to the intended pre-integration approved state.

Publish it if it is not already on the authoritative remote.

Do not move/recreate it if it is already correct.

# 4. CREATE A CLEAN INTEGRATION MILESTONE

Create a clearly named milestone branch/tag for the integrated state at the exact approved integration commit.

Use a sensible convention consistent with the repository.

Preferred concept:

```text
milestone/feint-croqueta-vocab-v1
```

and a corresponding milestone/checkpoint tag such as:

```text
FEINT-CROQUETA-VOCAB-V1
```

If the repository already has an established naming convention that differs, follow the established convention and report the exact names.

The milestone must resolve to the exact published integration commit.

Do NOT create another code-changing commit merely to manufacture a milestone unless genuinely required for authoritative documentation.

# 5. PUSH TO THE CORRECT REPOSITORY

The authoritative repository is expected to be:

```text
ZainRahman23/FC-Simulator
```

but verify the configured remote before pushing.

Do NOT accidentally publish this milestone only to the old/wrong TouchlineSimulator remote.

Push:

```text
the relevant development/integration branch if required
the milestone branch
the pre-integration checkpoint/tag if unpublished
the new integration milestone tag
```

Do NOT touch `main`.

Do NOT merge anything.

Do NOT rewrite history.

Do NOT force-push.

# 6. FRESH REMOTE VERIFICATION

After pushing, independently verify the publication from the remote.

Use fresh remote checks rather than trusting the push command's success message.

Verify:

```text
milestone branch exists remotely
milestone branch SHA
integration commit exists remotely
integration tag exists remotely
tag resolves to intended commit
pre-integration checkpoint exists remotely
```

Where practical, fetch/read the authoritative handoff and manifest back from the remote and confirm they match the local milestone.

# 7. VERIFY THE IMPORTANT GAMEPLAY STATE

The published handoff should make it unambiguous that:

```text
BODY FEINT
= video-guided + exit-foot
= integrated vocabulary entry
= old analog/automatic Body Feint OFF
= older Body Feint variants superseded/non-eligible

CROQUETA
= LEG-WAVE V4
= integrated vocabulary entry
= ADV-4 is NOT the Croqueta fallback
= infeasible V4 requests decline cleanly
```

Also preserve/document that:

```text
Body Feint and Croqueta remain provisional foundations,
not permanently frozen final mechanics.
```

Their validated entry envelopes and known gaps must remain explicit.

# 8. DO NOT FIX KNOWN ISSUES

Publication must preserve the current known state.

Do NOT attempt to fix during this task:

```text
inherited B4 carry/cut leg crossings
rapid repeated-feint ordinary-carry events
random-input recognition gap
post-gait settling delay
unvalidated Body Feint entries
unvalidated Croqueta entries
```

These belong to future work.

# 9. RUN ONLY NECESSARY PUBLICATION CHECKS

Run the appropriate lock/source-integrity checks required before publication.

Do NOT launch another large development campaign.

We already completed the integration testing.

The purpose here is to prove:

```text
LOCAL APPROVED STATE
=
PUBLISHED GITHUB STATE
```

# FINAL RESPONSE

Return a concise publication receipt containing:

```text
AUTHORITATIVE REPOSITORY:

PUBLISHED DEVELOPMENT/INTEGRATION BRANCH:
REMOTE SHA:

PRE-INTEGRATION CHECKPOINT/TAG:
RESOLVED SHA:

MILESTONE BRANCH:
REMOTE SHA:

MILESTONE TAG:
TAG SHA:
RESOLVED COMMIT:

INTEGRATION COMMIT:

BODY FEINT:
authoritative version
source path
status

LA CROQUETA:
authoritative version
source path
status

SOURCE-OF-TRUTH HANDOFF:
MANIFEST:

REMOTE VERIFICATION:
PASS / FAIL

LOCAL WORKTREE STATUS:
```

Also state explicitly:

```text
MAIN TOUCHED: NO
HISTORY REWRITTEN: NO
GAMEPLAY CHANGED DURING PUBLICATION: NO
LEFT-STICK RECOGNIZER STARTED: NO
```

Then STOP.

Do not begin Step 2.

# CENTRAL GOAL

Publish the exact current Body Feint + LEG-WAVE V4 vocabulary-integration state to the authoritative FC-Simulator GitHub repository, create/verify durable milestone references, verify them independently from the remote, and make this the clean recovery point from which the next fresh session can begin the left-stick control system.
