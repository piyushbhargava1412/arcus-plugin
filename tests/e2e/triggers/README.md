# Layer-4 Trigger Corpus (L4-1 .. L4-3)

Tests that the right skill activates (and the wrong ones do NOT) for a corpus of
natural-language trigger phrases. Guards the `description:` trigger phrasing in every
`SKILL.md` against over- and under-triggering.

> **Status: DEFERRED.** No trigger corpus exists yet. The runner
> (`run-triggers.mjs`) is a stub that prints deferred and exits 0. See
> [`ARCUS-TESTING-DEFERRED.md`](../../../ARCUS-TESTING-DEFERRED.md).

## Intended scope

- **L4-1 — positive corpus.** For each skill, a set of phrasings that SHOULD activate
  it (e.g. `"implement ARC-0007"` → `arcus-controller` interactive;
  `"forge ARC-0007"` → autonomous; `"simplify and verify these files"` →
  `simplify-and-verify`).
- **L4-2 — heavy negatives.** Phrasings that must NOT activate a given skill —
  near-miss wording, adjacent intents, and other skills' triggers. Negatives are
  weighted heavily because over-triggering is the dominant real-world failure.
- **L4-3 — disambiguation.** Phrases that could plausibly match two skills, asserting
  the intended one wins (e.g. `"plan <STORY>"` vs `"implement <STORY>"`).

The corpus grades by which skill's trigger description matches; it does not require a
live judge.
