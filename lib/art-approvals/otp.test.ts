import { describe, expect, it } from "vitest";
import type { ArtApprovalDecisionType, ArtApprovalStatus } from "./models";

describe("art approval model unions", () => {
  it("accepts approved and changes_requested status/decision values", () => {
    const statusApproved: ArtApprovalStatus = "approved";
    const statusChangesRequested: ArtApprovalStatus = "changes_requested";
    const decisionApproved: ArtApprovalDecisionType = "approved";
    const decisionChangesRequested: ArtApprovalDecisionType = "changes_requested";

    expect(statusApproved).toBe("approved");
    expect(statusChangesRequested).toBe("changes_requested");
    expect(decisionApproved).toBe("approved");
    expect(decisionChangesRequested).toBe("changes_requested");
  });
});
