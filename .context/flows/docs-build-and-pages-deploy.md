# Flow: Docs Build And Pages Deploy

<!-- context-meta
verification-commit: 9107e6a1b19abee4250ef8d3df6e47ac13fa5ddf
generated-at: 2026-06-18T03:03:49Z
confidence: high
-->

## Overview
Builds the VitePress documentation site and deploys generated static artifacts to GitHub Pages on eligible main-branch runs.

## Entry Points
- **Type**: Job
- **Path/Topic**: GitHub Actions workflow `docs` on `push`, `pull_request`, or `workflow_dispatch`
- **File**: `.github/workflows/docs.yml`

## Core Path
1. `.github/workflows/docs.yml` build job checks out repository and configures pnpm/node/pages actions.
2. Build step runs `pnpm install --frozen-lockfile && pnpm run docs:build` in `site/`.
3. Build job uploads `site/.vitepress/dist` as Pages artifact.
4. Deploy job runs only for non-PR `main` branch context and deploys artifact via `actions/deploy-pages`.

## Data Touchpoints
- **Entities**: `site/package.json` script commands (`docs:build`)
- **Entities**: `site/.vitepress/dist` (deploy artifact)
- **Entities**: GitHub workflow event context (`github.ref`, `github.event_name`)
- **Tables**: Not evident in repository.

## Integrations
- **Type**: API Call
- **Target**: GitHub Actions marketplace actions and GitHub Pages deployment service
- **Channel**: `.github/workflows/docs.yml` `uses:` and `run:` steps

## Scope
- `.github/workflows/docs.yml`
- `site/package.json`
- `site/.vitepress/config.ts`

## Tests
- Not detected for this flow — checked: `.github/workflows/` for explicit test jobs
