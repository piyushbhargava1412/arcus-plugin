// The ARCUS Exam — question pool.
//
// Each visit deals 5 random questions per difficulty ('easy' | 'medium' | 'hard'),
// with answer order shuffled, so grow this pool freely.
//
// To add a question, append an object:
//   d: difficulty tag            — 'easy', 'medium', or 'hard'
//   q: the question              — one sentence, quiz-card sized
//   o: exactly 4 answer options  — order here doesn't matter (they're shuffled)
//   a: index into o of the correct answer (0-based, position BEFORE shuffling)
//   w: the "why" line            — shown after answering; teach, don't just judge
//
// House rule: every question must be grounded in the actual pipeline/modes/
// context-engineering docs or a SKILL.md's own frontmatter — if you can't
// point at the line that makes an answer true, don't add the question. This
// comic teaches ARCUS through the persona team (Lucie/Angelina/Quinn/Diana/
// Steffi/Benny/Genie) — questions should speak in those terms, not in the
// underlying capability/coordinator/orchestrator architecture vocabulary,
// which this issue deliberately does not teach. Keep at least 5 questions
// per difficulty or the exam deals a short paper (ComicQuiz.vue warns in the
// console if a pool runs thin).

export interface QuizQuestion {
  /** difficulty tag */
  d: 'easy' | 'medium' | 'hard'
  /** the question text */
  q: string
  /** exactly 4 answer options (shuffled at render time) */
  o: string[]
  /** index into `o` of the correct answer, BEFORE shuffling */
  a: number
  /** the "why" line shown after answering */
  w: string
}

export const QUIZ: QuizQuestion[] = [
  // ---------- easy ----------
  { d: 'easy', q: 'What does ARCUS stand for?',
    o: ['Automated Repository Code Update System', 'Any Repository Can Use Spec-driven development', 'Agentic Review, Chase, and Ultra-Sync', 'A Repo’s Continuous Update Sequence'],
    a: 1, w: 'Straight from the marketplace description: ARCUS = "Any Repository Can Use Spec-driven development."' },
  { d: 'easy', q: 'What phrase starts Interactive (gated) mode by default?',
    o: ['forge <STORY>', 'afk <STORY>', 'plan <STORY> or implement <STORY>', 'sync context'],
    a: 2, w: 'Interactive is Lucie’s default — no flag needed. forge/afk/run afk on are the autonomous triggers.' },
  { d: 'easy', q: 'Which teammate designs the test matrix before any code is written?',
    o: ['Angelina', 'Quinn', 'Diana', 'Steffi'],
    a: 1, w: 'Quinn (QA) sorts functional, edge-case, and error-handling tests before Diana ever touches a ticket.' },
  { d: 'easy', q: 'Which teammate is the deterministic gate — zero nuance, hard stop?',
    o: ['Lucie', 'Steffi', 'Benny', 'Genie'],
    a: 2, w: 'Any hard block (typecheck, tests, build, secrets) skips Steffi’s review and returns changes_requested immediately — no judgment call, exactly like Benny.' },
  { d: 'easy', q: 'What is the maximum number of Code Review rounds before a human is needed?',
    o: ['1', '3', '5', 'Unlimited'],
    a: 1, w: 'Bounded to 3 rounds maximum, specifically to prevent loops on subjective issues.' },
  { d: 'easy', q: 'Which artifact holds the atomic, numbered task list for implementation?',
    o: ['grounded-spec.md', 'plan.md', 'test-plan.md', 'review.md'],
    a: 1, w: 'plan.md carries the design deliberation plus the ### Task N: headings that Implementation later parses.' },
  { d: 'easy', q: 'What makes a skill different from an agent, at the simplest level?',
    o: ['Skills are faster than agents', 'A skill is a teammate you can call directly; an agent is only looped in by name, never by you', 'Agents can edit files, skills cannot', 'There is no real difference'],
    a: 1, w: 'Skills live at plugins/arcus/skills/ and are called by their bare name (kick-off); agents live flat under agents/ and are only ever dispatched as isolated subagents, never by you.' },
  { d: 'easy', q: 'What is Genie for?',
    o: ['Running the deterministic gate', 'Comprehensive help and onboarding — "where am I", "arcus help", mode guidance', 'Writing the PR description', 'Building the shared notebook'],
    a: 1, w: 'Genie is always on standby, independent of where your story is in the pipeline — and not on the board herself.' },
  { d: 'easy', q: 'Which teammate builds the shared notebook for a whole repository?',
    o: ['Lucie', 'Angelina', 'Diana', 'Benny'],
    a: 1, w: 'Angelina is the "day one" step — she produces the .context/ notebook and pins up AGENTS.md + CLAUDE.md.' },
  { d: 'medium', q: 'ARCUS bundles a SessionStart hook that runs bootstrap.sh. Why does it re-stage the toolbox at the start of every run anyway?',
    o: ['To pick up new stories', 'Because .arcus/bin is a copy that never expires, and not every host fires the hook', 'To reset the checkpoint', 'It does not — the hook is enough'],
    a: 1, w: 'Only Claude Code fires the bundled hook; Copilot CLI reads hooks from .github/hooks/ in a different schema. And .arcus/bin is a snapshot with no expiry, so a repo bootstrapped once would serve those same scripts forever. locate.sh re-stages from the newest install every run.' },
  { d: 'easy', q: 'Which pipeline stage comes immediately after `plan` in the ordered stage keys?',
    o: ['branch', 'test_plan', 'code_review', 'closure'],
    a: 1, w: 'The ordered keys are scaffold → context_pack → spec_finalizer → plan → test_plan → branch → task_1..N → code_review → context_sync → closure.' },
  { d: 'easy', q: 'Which review severity level never blocks a merge?',
    o: ['critical', 'warning', 'suggestion', 'blocker'],
    a: 2, w: 'critical blocks merge, warning is a concrete but survivable issue, and suggestion is a non-blocking minor nit.' },
  { d: 'easy', q: 'Which teammate holds the whole roadmap — every ticket, every checkpoint, start to finish?',
    o: ['Diana', 'Genie', 'Lucie', 'Quinn'],
    a: 2, w: 'Lucie is the only one who carries the checkpoint and the branch across the entire story.' },

  // ---------- medium ----------
  { d: 'medium', q: 'What are the three categories Quinn designs test cases across?',
    o: ['Unit / Integration / E2E', 'Functional / Edge Case / Error Handling', 'Smoke / Regression / Load', 'Manual / Automated / Exploratory'],
    a: 1, w: 'Happy-path functional coverage, boundary/edge conditions, and validation/exception error paths.' },
  { d: 'medium', q: 'Exactly when is the real git branch created?',
    o: ['On day one, before Brainstorm', 'At the start of Implementation, not on day one', 'At Code Review, once approved', 'At Closure, right before the PR'],
    a: 1, w: 'Deferred branch creation: day one only plans the name; Lucie realizes it at the start of Implementation, re-checking for collisions.' },
  { d: 'medium', q: 'What happens to the per-ticket spec-compliance check while Diana is implementing?',
    o: ['It hard-blocks the ticket immediately', 'It is advisory only — unresolved issues carry forward to Steffi’s review', 'It is skipped entirely', 'It replaces Steffi’s review'],
    a: 1, w: 'Per-ticket spec compliance is lightweight and advisory; it does not hard-block, unlike the holistic review pass.' },
  { d: 'medium', q: 'Why is code quality reviewed holistically by Steffi instead of per ticket?',
    o: ['Holistic review is faster', 'The parallel Dianas never see each other’s code, so only the whole diff can be judged as a whole', 'Per-ticket review is not supported by the tooling', 'Users prefer one report'],
    a: 1, w: 'Each ticket runs in its own sealed room with no visibility into other tickets’ code — Steffi’s review is the first point anyone sees the whole picture.' },
  { d: 'medium', q: 'What does Angelina’s notebook sync actually touch?',
    o: ['Every file in the repository', 'Only the notebook pages the approved diff materially changed — facts-only, no full rewrite', 'Only AGENTS.md', 'Nothing — it is purely advisory'],
    a: 1, w: 'The sync is diff-driven and surgical: it touches only what materially drifted, keeping the notebook honest without a full rescan.' },
  { d: 'medium', q: 'Is there a gate between Angelina’s notebook sync and Lucie shipping the PR?',
    o: ['Yes, a fifth gate', 'No — it moves straight into Closure once the sync is decided', 'Only in AFK mode', 'Only if the notebook changed'],
    a: 1, w: 'Notebook sync flows directly into Closure with no user decision gate, the same way day one flows directly into Brainstorm.' },
  { d: 'medium', q: 'What is distinctive about design-and-coding-patterns.md among the notebook’s five files?',
    o: ['It is regenerated on every commit', 'It is static by design — corrected only when a pattern recurs in ≥3 places or is superseded', 'It is the only one Angelina does not write', 'It has no context-meta header'],
    a: 1, w: 'Unlike the other four files, it records settled conventions and deliberately resists routine churn.' },
  { d: 'medium', q: 'When you ask a teammate directly, with no ticket filed on Lucie’s board, where does the result land?',
    o: ['It refuses to run without a ticket', 'A plain, predictable spot — .arcus/outputs/<name>/ — discoverable with no board state at all', 'Always inside .arcus/specs/<STORY-ID>/', 'A temp directory that gets deleted after the run'],
    a: 1, w: 'Filed through the board, output lands with the ticket; asked alone, it defaults to a plain path anyone can find.' },
  { d: 'medium', q: 'How does Angelina hand you the calls she was least sure about?',
    o: ['One question at a time, waiting for each answer before asking the next', 'All of them at once as an Open Questions list — each with exactly one Recommended option and a one-line reason', 'She blocks the whole pipeline until someone replies', 'She leaves those decisions blank for you to fill in'],
    a: 1, w: 'She always decides everything herself first, then hands over the whole list in one go — so you answer in a single reply, and the spec is never left half-written waiting on you.' },
  { d: 'medium', q: 'In gated mode, how many times does Lucie stop and wait for you?',
    o: ['Once after every stage', 'Four times — one per phase group', 'At most once: when a Brainstorm stage has open questions. If there are none, not at all', 'Never — gated only changes the logging'],
    a: 2, w: 'Everything after Brainstorm follows mechanically from a decision you already approved, so there is nothing left to confirm. The decision points that matter are the questions and the pull request.' },
  { d: 'medium', q: 'In AFK mode, what happens to Angelina’s Open Questions list?',
    o: ['She skips writing it entirely', 'She still writes it — nobody reads it, and her own picks simply stand', 'She emails it to you', 'AFK mode refuses to run if she has any'],
    a: 1, w: 'The list is written identically in both modes. Only the orchestrator differs: gated shows it to you, AFK ignores it — which is why an AFK spec is never less resolved, just less confirmed.' },
  { d: 'medium', q: 'Why do three copies of Diana sometimes appear at once during Implementation?',
    o: ['A bug — only one Diana should exist', 'Each ticket is dispatched to a fresh copy of her, working in its own sealed room, in parallel', 'She works in shifts, one at a time', 'Only for stories with three or more files'],
    a: 1, w: 'One ticket per isolated instance is exactly what makes it safe to run several at once — no shared state, no collisions.' },
  { d: 'medium', q: 'What must a plain conversation with a teammate, run outside the board, never rely on?',
    o: ['Complete sentences', 'An ARCUS filename or artifact path entering the request', 'A recommended default', 'The repo’s own conventions'],
    a: 1, w: 'A standalone ask stays in domain language — "reset my password" — never an ARCUS-specific filename or path.' },

  // ---------- hard ----------
  { d: 'hard', q: 'In what order does Benny try to resolve the commands he actually runs?',
    o: ['Only .context/ tables, nothing else', 'CI workflows first, then .context/ tables', 'Always npm test, regardless of repo', 'He asks the user to type the commands'],
    a: 1, w: 'Benny prefers whatever CI already runs, falling back to the notebook’s recorded commands, and records anything unresolved as skipped: not configured.' },
  { d: 'hard', q: 'A hard block fires at Benny’s gate. What happens to Steffi’s five checklists?',
    o: ['They still run, but findings are marked low-confidence', 'They are skipped entirely — changes_requested returns immediately', 'Only the security checklist still runs', 'They run first, then Benny runs after'],
    a: 1, w: 'There’s no point reasoning about design over code that doesn’t compile or pass its tests — Steffi’s review never starts.' },
  { d: 'hard', q: 'Which of Steffi’s five checklists is explicitly skipped on docs-only diffs and shallow history?',
    o: ['Security', 'Performance', 'History', 'Spec compliance'],
    a: 2, w: 'The history lens needs real commit history and code to reason about — it steps aside when there’s neither.' },
  { d: 'hard', q: 'What four things does Angelina’s day-one scan actually produce, working in parallel?',
    o: ['Security, performance, quality, and spec-compliance reports', 'An overview pass, a business-flow map, test-pattern notes, and design-pattern notes', 'The context pack, the grounded spec, the plan, and the test plan', 'A branch, a checkpoint, a commit, and a PR'],
    a: 1, w: 'These four discovery passes are what actually builds the .context/ notebook, all dispatched together rather than queued.' },
  { d: 'hard', q: 'What is the difference between Angelina’s everyday notebook sync and a full re-scan of the codebase?',
    o: ['They are two names for the same operation', 'The everyday sync is diff-driven and partial after each approved change; a full re-scan is rare, reserved for a major restructure', 'A full re-scan happens automatically after every merge', 'The everyday sync only runs in AFK mode'],
    a: 1, w: 'Day-to-day, only what materially drifted gets synced; the whole notebook is rebuilt only when the codebase’s shape has fundamentally changed.' },
  { d: 'hard', q: 'In the standalone example, what does Angelina need to ground a spec with no board involved?',
    o: ['A session-checkpoint.json path', 'A plain-text story, plus an optional grounding hint — nothing ARCUS-specific', 'A pre-filled grounded-spec.md to validate', 'An .arcus/ directory and a STORY-ID'],
    a: 1, w: 'Just domain values — a story and an optional hint — with zero ARCUS plumbing required.' },
  { d: 'hard', q: 'Steffi describes her own review style, almost word for word, as…',
    o: ['"Fast and forgiving — ship first, ask questions later"', '"Brutal in the hunt, fair in the verdict"', '"Optimistic by default, pessimistic on request"', '"Silent unless a critical issue is found"'],
    a: 1, w: 'Code Review is documented with a zero-trust persona — thorough while investigating, but calibrated and fair in the actual verdict.' },
  { d: 'hard', q: 'Can Lucie change speed mid-story — swap gated for AFK partway through a run?',
    o: ['Yes, whenever she stops for questions', 'Yes, but only once', 'No — mode is set at the very start and persists through every stage', 'Only Diana can trigger the switch'],
    a: 2, w: 'Both speeds are the same Lucie underneath, but the mode choice is locked in from the start; you cannot switch mid-run.' },
  { d: 'hard', q: 'How many of ARCUS’s roughly 29 jobs are teammates you can call directly, versus ones only looped in by name?',
    o: ['All 29 are callable directly', 'None are callable directly', '13 are directly callable (skills); 16 are only looped in by name (agents)', '20 are directly callable; 9 are looped in by name'],
    a: 2, w: 'The skill/agent split is exactly this: 13 of 29 jobs are user-and-model invocable; the other 16 are dispatched by name only.' },
]
