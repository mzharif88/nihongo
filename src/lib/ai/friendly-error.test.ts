import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { friendlyAiError } = await import("./engine.server");

const apiError = (status: number, message: string) =>
  Anthropic.APIError.generate(status, { type: "error", error: { type: "invalid_request_error", message } }, message, new Headers());

describe("friendlyAiError", () => {
  it("explains a key that needs a workspace", () => {
    expect(friendlyAiError(apiError(400, "This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header"))).toMatch(/ANTHROPIC_WORKSPACE_ID/);
  });
  it("explains a rejected key and keeps our own messages", () => {
    expect(friendlyAiError(apiError(401, "invalid x-api-key"))).toMatch(/rejected/);
    expect(friendlyAiError(new Error("This month's translation budget ($5.00) is used up."))).toMatch(/budget/);
  });
});
