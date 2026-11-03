import { countAnsweredTurns, isValidSessionId, toInterviewDetail } from "../sessionView";
import type { InterviewSessionDoc } from "../store";

describe("countAnsweredTurns", () => {
  it("ignores missing, empty and whitespace answers", () => {
    expect(
      countAnsweredTurns([{ answer: "a" }, { answer: "" }, { answer: "   " }, {}, { answer: "b" }])
    ).toBe(2);
  });
});

describe("isValidSessionId", () => {
  it("accepts only 24-hex strings", () => {
    expect(isValidSessionId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isValidSessionId("507f1f77bcf86cd79943901")).toBe(false);
    expect(isValidSessionId("zzzf1f77bcf86cd799439011")).toBe(false);
    expect(isValidSessionId(undefined)).toBe(false);
  });
});

describe("toInterviewDetail", () => {
  it("maps ids and dates to strings and omits resume text", () => {
    const doc = {
      _id: { toString: () => "abc" },
      userId: {},
      resumeText: "SECRET",
      resumeFileName: "cv.pdf",
      skills: [],
      role: "Dev",
      difficulty: "easy",
      durationMinutes: 30,
      status: "completed",
      turns: [{ question: "Q1", answer: "A1" }, { question: "Q2" }],
      feedback: { summary: "s", strengths: ["x"], improvements: ["y"], score: 7 },
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T01:00:00Z"),
      completedAt: new Date("2025-01-01T00:30:00Z"),
    } as unknown as InterviewSessionDoc & { _id: { toString(): string }; feedback: NonNullable<InterviewSessionDoc["feedback"]> };

    const d = toInterviewDetail(doc);
    expect(d.id).toBe("abc");
    expect(d.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(d.completedAt).toBe("2025-01-01T00:30:00.000Z");
    expect(d.turns).toEqual([{ question: "Q1", answer: "A1" }, { question: "Q2", answer: undefined }]);
    expect(d.feedback.score).toBe(7);
    expect(JSON.stringify(d)).not.toContain("SECRET");
  });
});
