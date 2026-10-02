#!/bin/sh
# V2 must never modify V1. Fails (exit 1) if anything under V1's runtime or evidence differs from the frozen tag.
cd "$(git rev-parse --show-toplevel)" || exit 2
TAG=checkpoint/physchar-v1-final-research
if git diff --quiet "$TAG" -- sandbox/visual/physchar review_artifacts/physical_character_v1 && \
   [ -z "$(git status --porcelain -- sandbox/visual/physchar review_artifacts/physical_character_v1)" ]; then
  echo "guard_v1: OK — V1 runtime + evidence identical to $TAG"; exit 0
fi
echo "guard_v1: FAIL — V1 files differ from $TAG:"; git diff --stat "$TAG" -- sandbox/visual/physchar review_artifacts/physical_character_v1; git status --porcelain -- sandbox/visual/physchar review_artifacts/physical_character_v1; exit 1
