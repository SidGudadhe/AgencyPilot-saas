describe("Two-Step Account Deletion Confirmation Engine", () => {
  const validateDeletionRequest = (body: { step1Confirmed?: boolean; step2Confirmed?: boolean }) => {
    if (!body.step1Confirmed || !body.step2Confirmed) {
      return {
        valid: false,
        error: "Two-step confirmation required. Both Step 1 (Billing warning) and Step 2 (Permanent deletion warning) must be explicitly acknowledged.",
      };
    }
    return { valid: true };
  };

  it("should reject deletion when only step 1 is confirmed", () => {
    const res = validateDeletionRequest({ step1Confirmed: true, step2Confirmed: false });
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Two-step confirmation required");
  });

  it("should reject deletion when only step 2 is passed without step 1", () => {
    const res = validateDeletionRequest({ step1Confirmed: false, step2Confirmed: true });
    expect(res.valid).toBe(false);
  });

  it("should allow deletion only when both steps are explicitly confirmed", () => {
    const res = validateDeletionRequest({ step1Confirmed: true, step2Confirmed: true });
    expect(res.valid).toBe(true);
  });
});
