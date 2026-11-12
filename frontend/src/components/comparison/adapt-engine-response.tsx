import type { PlanResult } from "./plan-result-context";
// Adjust this path to wherever the existing adapter file lives.
import { adaptEngineResult, type EngineResult } from "./adapter";

/**
 * Converts the body returned by POST /generate into what <Comparison /> expects.
 * Only validates the outer shape, then delegates to the existing adaptEngineResult.
 */
export function adaptEngineResponse(body: unknown): PlanResult {
  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { plans?: unknown }).plans) ||
    typeof (body as { generatedAt?: unknown }).generatedAt !== "string"
  ) {
    throw new Error("Unexpected /generate response shape");
  }
  return adaptEngineResult(body as EngineResult);
}