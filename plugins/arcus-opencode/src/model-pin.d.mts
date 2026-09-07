// Type surface for the plain-ESM sibling module (see model-pin.mjs's header for
// why the implementation deliberately is not TypeScript). Hand-written rather
// than emitted: the module is four small functions and adding a tsc emit step to
// a package esbuild otherwise compiles in one pass would not pay for itself.

/** `(level, message, extra?) => void` — the plugin's structured logger. */
export type PinLogger = (
  level: "debug" | "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) => unknown

/** Resolves an agent basename to a `provider/model-id` pin, or null to inherit. */
export type ModelPinner = (agentName: string) => string | null

export declare function withModelPin(md: string, model: string): string

export declare function makeModelPinner(opts: {
  models: any
  policy: any
  source?: string
  log: PinLogger
  stderr: { write: (chunk: string) => boolean }
  flush: (context: string) => void
}): ModelPinner

export declare function loadModelPinner(
  modelsPath: string,
  repoRoot: string,
  log: PinLogger,
): Promise<ModelPinner | null>

export declare function pinStagedAgents(
  agentsDir: string,
  pin: ModelPinner,
  log: PinLogger,
): Promise<number>
