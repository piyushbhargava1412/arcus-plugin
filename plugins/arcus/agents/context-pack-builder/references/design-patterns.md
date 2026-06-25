# Design Patterns: Feature Context Packs

## Concept: Progressive Disclosure
Feature context packs are the third layer of context in our framework:
1. **Repo Scope**: High-level boundaries.
2. **Business Flows**: Interaction patterns.
3. **Story Context (This skill)**: Just enough info to implement one feature.

## Best Practices for Matching
- **Semantic mapping**: If a user story mentions "payment processing", look for flows named `*processing*.md`, `*payments*.md`, or flows mentioning `stripe`, `braintree`, etc.
- **Dependency chain**: If a feature touches the UI, include the UI-to-API flow. Don't include deep backend batch jobs unless the story specifically impacts them.

## Handling Uncertainty
When the mapping is ambiguous (e.g., two flows seem relevant):
1. **Compare entry points**: Which flow's entry point matches the API/UI being modified?
2. **Cross-reference `.context/repo_map.md`**: Which flow covers the packages likely to change?
3. **Explicitly mark as "Assumed"**: If you pick one over the other without 100% certainty, state why in the "Assumptions" section.

## Verification
Before finalizing:
- Ensure NO files outside of `.context/` were read (unless explicitly provided in the story).
- Ensure the output file is strictly under `.arcus/specs/...story-id.../`.

