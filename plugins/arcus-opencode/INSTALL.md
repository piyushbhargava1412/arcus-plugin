# Installing arcus-opencode (without an npm registry)

`arcus-opencode` is an [OpenCode](https://opencode.ai) plugin distributed as a **GitHub Release
tarball** — no npm registry account or `npm login` required. OpenCode plugins are npm packages, but
they do **not** have to come from npmjs.org: a target repo can install the package from a tarball URL
into its own `node_modules`, then load it with a one-line local plugin file.

> **Why not `"plugin": ["arcus-opencode"]`?** That form makes OpenCode fetch the package from a
> configured npm **registry** (into `~/.cache/opencode/node_modules/`). OpenCode does **not** install a
> `.tgz` path/URL placed directly in the `plugin` array. The tarball flow below works because the
> package is installed into the repo's `node_modules` first, then loaded via a local loader file.

---

## For users — install into your repo

Prerequisites: `pnpm`, `git`, and a working OpenCode (with a model provider configured).

### Quick install (one command)

From your project root:

```bash
curl -fsSL https://github.com/piyushbhargava1412/arcus-plugin/releases/latest/download/install.sh | sh
```

Install once for **every** repo instead (global):

```bash
curl -fsSL https://github.com/piyushbhargava1412/arcus-plugin/releases/latest/download/install.sh | sh -s -- --global
```

Pin a version with `sh -s -- --version X.Y.Z`. The script installs the plugin and writes the loader; the
plugin then auto-stages skills/agents and manages `.gitignore`. (Prefer to do it by hand? The manual
steps are below.)

---

### Manual install

Pick a scope:

- **Per-project** (below) — ARCUS is available in this repo only. Two steps.
- **Global** (see [Global install](#global-install-all-repos)) — install once, ARCUS is available in
  **every** repo you open with OpenCode. Zero per-repo steps after that.

In both cases the plugin auto-stages its skills + agents and auto-manages `.gitignore` — no
`opencode.json` and no manual `.gitignore` edits required.

### 1. Add the plugin from the release tarball

From your project root:

```bash
pnpm add -D https://github.com/piyushbhargava1412/arcus-plugin/releases/download/arcus-opencode-vX.Y.Z/arcus-opencode-X.Y.Z.tgz
```

(Replace `X.Y.Z` with the release version. `pnpm add` accepts a tarball URL directly.)

### 2. Add a one-line loader

Create `.opencode/plugins/arcus.ts`:

```ts
export { ArcusOpencode } from "arcus-opencode"
```

That's it. (This tiny file is what tells OpenCode to load the plugin from `node_modules`. It is the
only ARCUS file you commit — along with `package.json` / `pnpm-lock.yaml`.)

### 3. Run it

Open OpenCode (`opencode`, or the VS Code terminal). On the first session the plugin:

- stages the ARCUS skills + agents (so OpenCode discovers them), and
- appends the generated-artifact paths (`.opencode/skills/`, `.opencode/agents/`, `.arcus/`) to your
  `.gitignore` automatically, keeping your working tree clean (ARCUS requires a clean tree).

Invoke ARCUS with natural-language triggers:

- `what is arcus` — help / onboarding
- `plan <path/to/story.md>` — brainstorm + planning (gated)
- `implement <path/to/story.md>` — full Spec → Code → PR pipeline

> **Optional:** OpenCode allows skills by default, so no `opencode.json` is needed. If you want to
> require confirmation before the internal `model-strategy` reference skill loads, add a project
> `opencode.json` with `{ "permission": { "skill": { "model-strategy": "ask" } } }`.

### Updating

Re-run step 1 with the new release URL.

---

## Global install (all repos)

Install ARCUS once into OpenCode's **global** config so it loads in every repository you open — no
per-repo loader or install needed.

### 1. Add the plugin to the global config

```bash
cd ~/.config/opencode
pnpm add https://github.com/piyushbhargava1412/arcus-plugin/releases/download/arcus-opencode-vX.Y.Z/arcus-opencode-X.Y.Z.tgz
```

This installs `arcus-opencode` into `~/.config/opencode/node_modules/` (OpenCode reads dependencies
from `~/.config/opencode/package.json`).

### 2. Add the global loader

Create `~/.config/opencode/plugins/arcus.ts`:

```ts
export { ArcusOpencode } from "arcus-opencode"
```

That's it. Open OpenCode in **any** git repo and ARCUS auto-stages its skills + agents and manages
that repo's `.gitignore` — nothing to add per project.

### Updating / removing

- **Update:** re-run step 1 with the new release URL.
- **Remove:** `cd ~/.config/opencode && pnpm remove arcus-opencode && rm plugins/arcus.ts`.

> **Project vs global:** if both a global loader and a project-local install are present, OpenCode
> loads the plugin from each separately. For per-repo control (e.g. pinning different ARCUS versions
> in different repos), prefer the per-project install; for convenience across all your repos, prefer
> global.

---

## For maintainers — releases are automated

The OpenCode package version is **derived from the canonical ARCUS version** in
`plugins/arcus/.claude-plugin/plugin.json` (via `scripts/sync-version.mjs`, which runs in the build).
The Claude plugin and the OpenCode package therefore always share one version — you never bump
arcus-opencode independently.

**To cut a release: bump `plugins/arcus/.claude-plugin/plugin.json` and merge to `main`.** The
[`release-opencode-plugin`](../../.github/workflows/release-opencode-plugin.yml) GitHub Action then:

1. reads the version from `plugin.json`,
2. skips if a release `arcus-opencode-v<version>` already exists (idempotent),
3. otherwise runs `pnpm pack` (which syncs the version + builds `bundled/` + `dist/`) and
4. creates the GitHub Release with the `.tgz` attached.

The release asset URL is what users put in `pnpm add` (step 1 above).

> To build the tarball locally for testing (not a release), run `pnpm pack` in this directory — its
> `prepack` step syncs the version and builds `bundled/` + `dist/`.
