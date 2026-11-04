import * as flags from "@/lib/featureFlags";

describe("featureFlags", () => {
  it("loads without throwing", () => {
    expect(flags).toBeDefined();
  });

  it("defines interview.video as a boolean and lists it for the admin dashboard", () => {
    expect(typeof flags.featureFlags.interview.video).toBe("boolean");
    expect(flags.listToggleableFlags().map((f) => f.path)).toContain("interview.video");
  });

  it("mergeWithDefaults fills interview.video for legacy docs", () => {
    const merged = flags.mergeWithDefaults({ interview: { enabled: true } } as never);
    expect(typeof merged.interview.video).toBe("boolean");
    expect(flags.mergeWithDefaults({}).interview).toHaveProperty("video");
  });
});
