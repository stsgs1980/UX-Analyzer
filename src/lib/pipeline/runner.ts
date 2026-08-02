/**
 * Pipeline runner — composes and executes analysis steps.
 * Supports both sequential and parallel step execution.
 *
 * Steps are organized into groups:
 *  - Single step: runs sequentially (as before)
 *  - Array of steps: runs in parallel via Promise.allSettled
 *
 * Error handling:
 *  - Sequential step failure → abort pipeline
 *  - Parallel step failure → warn + continue (non-critical steps)
 *  - Fatal parallel errors are collected and re-thrown if ALL parallel steps fail
 */

import type { PipelineContext, PipelineStep } from "./types";

/** A step group — single step (sequential) or array (parallel) */
export type StepGroup = PipelineStep | PipelineStep[];

export interface RunPipelineOptions {
  ctx: PipelineContext;
  /** Steps organized into groups. Single = sequential, Array = parallel. */
  groups: StepGroup[];
  /** Called when pipeline succeeds (after all steps) */
  onSuccess?: (ctx: PipelineContext) => Promise<void>;
  /** Called when pipeline fails (receives the error) */
  onError?: (ctx: PipelineContext, error: unknown) => Promise<void>;
  /** Called in finally block (always runs) */
  onFinally?: (ctx: PipelineContext) => Promise<void>;
}

/**
 * Run step groups. Single steps run sequentially; arrays run in parallel.
 */
export async function runPipeline(opts: RunPipelineOptions): Promise<void> {
  const { ctx, groups, onSuccess, onError, onFinally } = opts;

  try {
    for (const group of groups) {
      if (Array.isArray(group)) {
        // Parallel group — run all steps concurrently
        console.log(`[pipeline] Parallel group starting: ${group.map(s => s.id).join(", ")}`);
        await runParallelGroup(ctx, group);
        console.log(`[pipeline] Parallel group done: ${group.map(s => s.id).join(", ")}`);
      } else {
        // Sequential step
        console.log(`[pipeline] Step "${group.id}" starting...`);
        await group.run(ctx);
        console.log(`[pipeline] Step "${group.id}" done.`);
      }
    }

    // Send final result if available
    if (ctx.analysisResult) {
      ctx.send({ type: "progress", step: "done", message: "Анализ завершён!", progress: 1, analysisId: ctx.analysisId });
      ctx.send({ type: "result", data: ctx.analysisResult, analysisId: ctx.analysisId });
    }

    await onSuccess?.(ctx);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[pipeline] Fatal error: ${msg}`);

    // Try to extract user-friendly message
    const friendlyMsg = extractFriendlyError(error);
    ctx.send({ type: "error", message: friendlyMsg, analysisId: ctx.analysisId });

    await onError?.(ctx, error);
  } finally {
    await onFinally?.(ctx);
  }
}

/**
 * Run multiple steps in parallel. Non-fatal errors are caught and sent as warnings.
 * If ALL steps fail, throws the first error (treated as fatal).
 */
async function runParallelGroup(ctx: PipelineContext, steps: PipelineStep[]): Promise<void> {
  const results = await Promise.allSettled(
    steps.map(async (step) => {
      console.log(`[pipeline]   Parallel step "${step.id}" starting...`);
      await step.run(ctx);
      console.log(`[pipeline]   Parallel step "${step.id}" done.`);
    })
  );

  const errors: { step: string; error: unknown }[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const stepId = steps[i].id;
      const err = result.reason;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[pipeline]   Parallel step "${stepId}" failed: ${errMsg}`);
      ctx.send({ type: "warn", message: `Шаг "${steps[i].label}" не удался: ${errMsg}`, analysisId: ctx.analysisId });
      errors.push({ step: stepId, error: err });
    }
  }

  // If ALL parallel steps failed, treat as fatal
  if (errors.length === steps.length && steps.length > 0) {
    throw errors[0].error;
  }
}

function extractFriendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("insufficient_balance")) return "Недостаточно средств на балансе ZAI. Пополните баланс и попробуйте снова.";
  if (msg.includes("timed out")) return msg;
  if (msg.includes("API request failed")) {
    try {
      const jsonStr = msg.substring(msg.indexOf("{"));
      const parsed = JSON.parse(jsonStr);
      if (parsed.error?.message) return `Ошибка API: ${parsed.error.message}`;
    } catch { /* ignore */ }
  }
  return msg;
}
