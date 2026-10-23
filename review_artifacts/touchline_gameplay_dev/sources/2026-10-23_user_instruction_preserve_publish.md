# Owner instruction — preserve and publish the current Touchline work (verbatim, received 23 Oct 2026 ≈ 14:10 EEST)

Before doing any further development, preserve and publish the current Touchline work.

The current Body Feint V2 is an improvement but is **not visually approved/frozen** and still needs substantial future improvement. Preserve it as provisional.

Do NOT develop anything new in this task.

First audit the current `dribble-1` worktree:

```text
git status
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -30
git remote -v
```

Identify:

- tracked modifications;
- untracked source;
- uncommitted review artifacts;
- local commits not on the intended GitHub remote;
- experimental work;
- current known-good/provisional milestones.

Preserve all meaningful current development, including the latest work actually present for:

```text
S99 / Sprint Speed 99
D38 Acceleration
A99-C
Agility Scale B
Carry-B
CONTROLLED / Technical Control
B4/B5
support / committed landings / leg fixes
Cruyff
Ronaldo Chop
Croqueta / ADV-4
V-turn
Matthews
Stop-and-Go
Body Feint V2
```

Do not claim something is present if it is not actually in this worktree/history.

Run the appropriate existing lock/regression checks before publication.

Commit any meaningful uncommitted current work in sensible commits. Do not squash away useful development history merely to make one giant commit.

Push the current development history to the correct repository:

```text
ZainRahman23/FC-Simulator
```

Verify the remote refs after pushing.

## IMPORTANT: DO NOT SWITCH THIS WORKTREE TO MAIN

Do not checkout `main`.

Do not merge into `main`.

Do not force-push `main`.

Do not rewrite existing history.

For now I want the current development lineage safely published exactly enough that another Astra/Claude session can retrieve it.

## CREATE A CANONICAL DEVELOPMENT MILESTONE

After preserving the current history, create a clearly identifiable branch/tag or milestone representing:

```text
CURRENT TOUCHLINE GAMEPLAY DEVELOPMENT
```

Use sensible project naming.

This milestone should point to the newest coherent current state, while clearly documenting which features are:

```text
APPROVED
PROVISIONAL
EXPERIMENTAL
KNOWN-ISSUE
```

Body Feint V2 must remain PROVISIONAL.

ADV-4/Croqueta should retain the status justified by its latest report rather than being silently called final.

## CREATE A SOURCE-OF-TRUTH HANDOFF

Create a concise manifest/handoff identifying the actual current paths and dependencies for:

```text
simulation
movement
pace
body / PlayBody
gait/support
leg/IK
Technical Control
dribbling vocabulary
character skeleton/rendering
review/playable pages
```

Also identify the latest playable I have actually been reviewing.

The purpose is that a fresh Astra session should be able to locate the current gameplay body immediately without repeating the forensic search we just went through.

Include exact:

```text
repository
branch
commit
source paths
dependency chain
playable
test commands
known limitations
```

## MAIN BRANCH RECOMMENDATION

Do not modify `main`, but inspect its current state/history and tell me whether you recommend:

A. keeping `main` untouched until a later integration milestone;

B. creating a new integration branch from the current gameplay development milestone;

C. merging the current gameplay milestone into `main` now.

Give the reasoning based on the actual repository state.

My current preference is **B** unless repository history gives a strong reason otherwise.

## REMOTE VERIFICATION

Do not report merely that `git push` executed.

Verify that the intended remote advertises the pushed commit/branch/tag.

Return:

```text
LOCAL WORKTREE:
ORIGINAL BRANCH:
ORIGINAL HEAD:

NEW COMMITS:
PUSHED BRANCH:
REMOTE VERIFIED HEAD:
TAG/MILESTONE:

LATEST PLAYABLE:

SOURCE-OF-TRUTH HANDOFF:

TEST RESULTS:

APPROVED COMPONENTS:
PROVISIONAL COMPONENTS:
EXPERIMENTAL COMPONENTS:
KNOWN ISSUES:

MAIN CURRENT HEAD:
RECOMMENDED MAIN/INTEGRATION STRATEGY:
```

Then STOP.

Do not start another gameplay feature after publication.
