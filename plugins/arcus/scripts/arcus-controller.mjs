#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

export const CANONICAL_PIPELINE = [
  { key: 'scaffold', phaseGroup: 'scaffold', owner: 'scaffold.sh' },
  { key: 'context_pack', phaseGroup: 'brainstorm', owner: 'arcus:context-pack-builder' },
  { key: 'spec_finalizer', phaseGroup: 'brainstorm', owner: 'arcus:spec-finalizer' },
  { key: 'plan', phaseGroup: 'brainstorm', owner: 'arcus:implementation-planner' },
  { key: 'test_plan', phaseGroup: 'test_plan', owner: 'arcus:test-spec-compiler' },
  { key: 'branch', phaseGroup: 'implementation', owner: 'arcus:implementation-runner' },
  { key: 'code_review', phaseGroup: 'code_review', owner: 'arcus:code-reviewer' },
  { key: 'context_sync', phaseGroup: 'closure', owner: 'arcus:context-drift-sync' },
  { key: 'closure', phaseGroup: 'closure', owner: 'arcus:pull-request-builder' },
];

const ARTIFACT_FILES = {
  context_pack: 'context-pack.md',
  spec_finalizer: 'grounded-spec.md',
  plan: 'plan.md',
  test_plan: 'test-plan.md',
  code_review: 'review.md',
  closure: 'PR_DESCRIPTION.md',
};

const RUNNABLE_STATUSES = new Set(['pending', 'in_progress', 'needs_rework']);
const RECONCILABLE_STATUSES = new Set(['pending', 'in_progress']);
const OPEN_QUESTION_STAGES = new Set(['spec_finalizer', 'plan']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortTaskStages(keys) {
  return keys
    .filter((key) => /^task_\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
}

function stageOrder(stages = {}) {
  const tasks = sortTaskStages(Object.keys(stages));
  const beforeTasks = ['scaffold', 'context_pack', 'spec_finalizer', 'plan', 'test_plan', 'branch'];
  const afterTasks = ['code_review', 'context_sync', 'closure'];
  return [...beforeTasks, ...tasks, ...afterTasks].filter((key) => key in stages || beforeTasks.includes(key) || afterTasks.includes(key));
}

function firstIncompleteStage(stages = {}) {
  for (const key of stageOrder(stages)) {
    if (stages[key] !== 'complete') return key;
  }
  return null;
}

function allStagesComplete(stages = {}) {
  const order = stageOrder(stages);
  return order.length > 0 && order.every((key) => stages[key] === 'complete');
}

function advanceCurrentStage(checkpoint) {
  const next = firstIncompleteStage(checkpoint.stages);
  if (next) {
    checkpoint.current_stage = next;
    checkpoint.current_status = 'IN_PROGRESS';
    return checkpoint;
  }
  checkpoint.current_status = 'COMPLETE';
  checkpoint.current_stage = checkpoint.current_stage || 'closure';
  return checkpoint;
}

function markStageComplete(checkpoint, stage) {
  if (!checkpoint.stages || !(stage in checkpoint.stages)) {
    checkpoint.stages = checkpoint.stages || {};
    checkpoint.stages[stage] = 'complete';
  } else {
    checkpoint.stages[stage] = 'complete';
  }
  return advanceCurrentStage(checkpoint);
}

export function countPlanTasks(text = '') {
  return (text.match(/^### Task\b/gm) || []).length;
}

export function countResolvedDecisions(text = '') {
  return (text.match(/\*\*Decision\*\*:/g) || []).length;
}

export function countTestCases(text = '') {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\|/.test(line) && !/^(\|\s*:?-+:?\s*)+\|?$/.test(line))
    .filter((line) => !/^\|\s*Test Case\s*\|/i.test(line)).length;
}

function extractHeadingSection(text = '', heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n#\\s|$)`));
  return match ? match[1].trim() : '';
}

function extractOpenQuestionsYaml(text = '') {
  const section = extractHeadingSection(text, 'Open Questions');
  if (!section) return '';
  const fenceMatch = section.match(/```yaml\s*\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : '';
}

function parseInlineObject(text) {
  const fields = {};
  for (const part of text.split(/,\s*(?=[a-zA-Z_][a-zA-Z0-9_-]*\s*:)/)) {
    const match = part.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.+)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    fields[match[1]] = value;
  }
  return fields;
}

export function parseOpenQuestions(text = '') {
  const yaml = extractOpenQuestionsYaml(text);
  if (!yaml) return [];

  const questions = [];
  let current = null;
  let inOptions = false;

  for (const rawLine of yaml.split('\n')) {
    const line = rawLine.trimEnd();
    const idMatch = line.match(/^- id:\s*(.+)$/);
    if (idMatch) {
      if (current) questions.push(current);
      current = { id: idMatch[1].trim(), gap: '', tentative: null, options: [] };
      inOptions = false;
      continue;
    }
    if (!current) continue;

    const gapMatch = line.match(/^\s*gap:\s*(.+)$/);
    if (gapMatch) {
      current.gap = gapMatch[1].trim();
      continue;
    }
    const tentativeMatch = line.match(/^\s*tentative:\s*(.+)$/);
    if (tentativeMatch) {
      current.tentative = tentativeMatch[1].trim();
      continue;
    }
    if (/^\s*options:\s*$/.test(line)) {
      inOptions = true;
      continue;
    }
    if (inOptions) {
      const optionMatch = line.match(/^\s*-\s*\{(.+)\}\s*$/);
      if (optionMatch) {
        const option = parseInlineObject(optionMatch[1]);
        current.options.push({
          key: option.key ?? null,
          text: option.text ?? '',
          recommended: option.recommended === true,
          rationale: typeof option.rationale === 'string' ? option.rationale : '',
        });
        continue;
      }
    }
  }

  if (current) questions.push(current);
  return questions;
}

function dialogueAnswerIds(text = '') {
  const section = extractHeadingSection(text, 'Dialogue Answers');
  if (!section) return new Set();
  return new Set(section.match(/\b[A-Z]+-\d+\b/g) || []);
}

export function unansweredQuestionIds(text = '') {
  const answered = dialogueAnswerIds(text);
  return parseOpenQuestions(text)
    .map((question) => question.id)
    .filter((id) => !answered.has(id));
}

function artifactTextForStage(stage, artifacts = {}) {
  switch (stage) {
    case 'context_pack':
      return artifacts.contextPack || '';
    case 'spec_finalizer':
      return artifacts.groundedSpec || '';
    case 'plan':
      return artifacts.plan || '';
    case 'test_plan':
      return artifacts.testPlan || '';
    case 'code_review':
      return artifacts.review || '';
    case 'closure':
      return artifacts.prDescription || '';
    default:
      return '';
  }
}

function ownerForStage(stage) {
  if (/^task_\d+$/.test(stage)) return 'arcus:implementation-runner';
  return CANONICAL_PIPELINE.find((entry) => entry.key === stage)?.owner || null;
}

function awaitingHandoffDecision(checkpoint, artifacts) {
  const stage = checkpoint.current_stage;
  const artifact = artifactTextForStage(stage, artifacts);
  const unanswered = artifact ? unansweredQuestionIds(artifact) : [];

  if (unanswered.length > 0) {
    if (checkpoint.mode === 'afk') {
      return { kind: 'clear_and_continue', completeStage: stage, questionIds: unanswered };
    }
    return {
      kind: 'await_questions',
      stage,
      questionIds: unanswered,
      questions: parseOpenQuestions(artifact).filter((question) => unanswered.includes(question.id)),
      mode: checkpoint.mode,
    };
  }

  return { kind: 'clear_and_continue' };
}

function reconcileArtifacts(checkpoint, artifacts) {
  const next = clone(checkpoint);
  const reconciledStages = [];

  for (const stage of Object.keys(ARTIFACT_FILES)) {
    const status = next.stages?.[stage];
    if (!RECONCILABLE_STATUSES.has(status)) continue;
    const artifact = artifactTextForStage(stage, artifacts);
    if (!artifact) continue;
    if (OPEN_QUESTION_STAGES.has(stage) && unansweredQuestionIds(artifact).length > 0) {
      continue;
    }
    markStageComplete(next, stage);
    reconciledStages.push(stage);
  }

  return { checkpoint: next, reconciledStages };
}

export function shouldGatePhaseBoundary({ mode, stopAfter = [], phaseGroup }) {
  if (mode !== 'gated') return false;
  return new Set(stopAfter || []).has(phaseGroup);
}

export function shouldAutoLoop(reviewRound) {
  return Number(reviewRound) < 3;
}

export function decideNextAction({ checkpoint, artifacts = {} }) {
  if (!checkpoint || typeof checkpoint !== 'object') {
    throw new Error('checkpoint is required');
  }

  let working = clone(checkpoint);
  const reconciledStages = [];

  switch (working.current_status) {
    case 'FAILED':
      return {
        kind: 'stop_failed',
        storyId: working.story_id,
        mode: working.mode,
        stage: working.failure?.stage || working.current_stage || null,
        reason: working.failure?.reason || 'checkpoint marked FAILED',
      };
    case 'COMPLETE':
      return { kind: 'complete', storyId: working.story_id, mode: working.mode };
    case 'AWAITING_HANDOFF': {
      const handoff = awaitingHandoffDecision(working, artifacts);
      if (handoff.kind === 'await_questions') {
        return {
          kind: 'await_questions',
          storyId: working.story_id,
          mode: working.mode,
          stage: handoff.stage,
          questionIds: handoff.questionIds,
          questions: handoff.questions,
        };
      }
      working.current_status = 'IN_PROGRESS';
      if (handoff.completeStage) {
        markStageComplete(working, handoff.completeStage);
        reconciledStages.push(handoff.completeStage);
      }
      break;
    }
    case 'IN_PROGRESS':
    default:
      break;
  }

  const reconciled = reconcileArtifacts(working, artifacts);
  working = reconciled.checkpoint;
  reconciledStages.push(...reconciled.reconciledStages);

  if (allStagesComplete(working.stages)) {
    working.current_status = 'COMPLETE';
    return {
      kind: 'complete',
      storyId: working.story_id,
      mode: working.mode,
      reconciledStages,
    };
  }

  const stage = firstIncompleteStage(working.stages);
  if (!stage) {
    return {
      kind: 'complete',
      storyId: working.story_id,
      mode: working.mode,
      reconciledStages,
    };
  }

  if (stage === 'code_review' && working.stages?.code_review === 'needs_rework') {
    return {
      kind: 'loopback',
      storyId: working.story_id,
      mode: working.mode,
      stage,
      reviewRound: Number(working.review_round || 0),
      autoLoop: shouldAutoLoop(working.review_round || 0),
      reconciledStages,
    };
  }

  return {
    kind: 'run_stage',
    storyId: working.story_id,
    mode: working.mode,
    stage,
    owner: ownerForStage(stage),
    reconciledStages,
  };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { _: command || '' };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true';
    args[key] = value;
  }
  return args;
}

async function readTextIfExists(path) {
  if (!path || !existsSync(path)) return '';
  return readFile(path, 'utf8');
}

async function loadArtifacts(args) {
  const checkpointDir = args.checkpoint ? dirname(args.checkpoint) : null;
  const withDefault = (explicit, fallback) => explicit || (checkpointDir ? join(checkpointDir, fallback) : null);

  return {
    contextPack: await readTextIfExists(withDefault(args.contextPack, ARTIFACT_FILES.context_pack)),
    groundedSpec: await readTextIfExists(withDefault(args.groundedSpec, ARTIFACT_FILES.spec_finalizer)),
    plan: await readTextIfExists(withDefault(args.plan, ARTIFACT_FILES.plan)),
    testPlan: await readTextIfExists(withDefault(args.testPlan, ARTIFACT_FILES.test_plan)),
    review: await readTextIfExists(withDefault(args.review, ARTIFACT_FILES.code_review)),
    prDescription: await readTextIfExists(withDefault(args.prDescription, ARTIFACT_FILES.closure)),
  };
}

async function runCli(argv) {
  const args = parseArgs(argv);

  switch (args._) {
    case 'decide': {
      if (!args.checkpoint) throw new Error('decide requires --checkpoint <path>');
      const checkpoint = JSON.parse(await readFile(args.checkpoint, 'utf8'));
      const artifacts = await loadArtifacts(args);
      console.log(JSON.stringify(decideNextAction({ checkpoint, artifacts }), null, 2));
      return;
    }
    case 'questions': {
      if (!args.artifact) throw new Error('questions requires --artifact <path>');
      const artifact = await readFile(args.artifact, 'utf8');
      console.log(JSON.stringify({
        questions: parseOpenQuestions(artifact),
        unansweredQuestionIds: unansweredQuestionIds(artifact),
      }, null, 2));
      return;
    }
    case 'counts': {
      const plan = await readTextIfExists(args.plan);
      const groundedSpec = await readTextIfExists(args.groundedSpec);
      const testPlan = await readTextIfExists(args.testPlan);
      console.log(JSON.stringify({
        tasks: countPlanTasks(plan),
        decisions: countResolvedDecisions(groundedSpec),
        testCases: countTestCases(testPlan),
      }, null, 2));
      return;
    }
    case 'gate': {
      console.log(JSON.stringify({
        gate: shouldGatePhaseBoundary({
          mode: args.mode,
          stopAfter: String(args.stopAfter || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          phaseGroup: args.phaseGroup,
        }),
      }, null, 2));
      return;
    }
    case 'loopback': {
      console.log(JSON.stringify({
        autoLoop: shouldAutoLoop(Number(args.reviewRound || 0)),
      }, null, 2));
      return;
    }
    default:
      throw new Error(`unknown command: ${args._ || basename(__filename)}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(`[ERROR] arcus-controller.mjs: ${error.message}`);
    process.exit(1);
  });
}
