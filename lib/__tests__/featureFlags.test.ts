import * as flags from "@/lib/featureFlags";

describe("featureFlags", () => {
  it("loads without throwing", () => {
    expect(flags).toBeDefined();
  });
});
