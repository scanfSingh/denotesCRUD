jest.mock("../actions", () => ({ getCurrentUserId: jest.fn() }));
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: {} }));
jest.mock("@/lib/interview/generator", () => ({ generateInterviewTurn: jest.fn() }));
jest.mock("@/lib/interview/store", () => ({
  getInterviewSession: jest.fn(),
  appendQuestion: jest.fn(),
  answerLastTurn: jest.fn(),
  completeInterviewSession: jest.fn(),
  completeInterviewWithoutFeedback: jest.fn(),
  listInterviewSessions: jest.fn(),
  isInterviewTimeUp: jest.fn(),
  getCompletedInterviewFeedbacks: jest.fn(),
}));
jest.mock("@/lib/interview/insightsGenerator", () => ({ generateLearningInsights: jest.fn() }));
jest.mock("@/lib/interview/insightsStore", () => ({ getUserInsights: jest.fn(), saveUserInsights: jest.fn() }));

import { getCurrentUserId as getCurrentUserIdFn } from "../actions";
import { generateInterviewTurn as generateInterviewTurnFn } from "@/lib/interview/generator";
import * as storeModule from "@/lib/interview/store";
import { endInterviewEarly, getMyInterviewDetail, getMyInterviewSessions } from "../interview-actions";

const getCurrentUserId = getCurrentUserIdFn as jest.Mock;
const generateInterviewTurn = generateInterviewTurnFn as jest.Mock;
const store = storeModule as unknown as Record<string, jest.Mock>;

const ID = "507f1f77bcf86cd799439011";
const feedback = { summary: "ok", strengths: ["a"], improvements: ["b"], score: 8 };

function doc(over: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => ID },
    resumeText: "SECRET",
    skills: [],
    role: "Dev",
    difficulty: "easy",
    durationMinutes: 30,
    status: "in_progress",
    turns: [{ question: "Q1" }],
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUserId.mockResolvedValue("user1");
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("endInterviewEarly", () => {
  it("skips the LLM and stores no feedback when nothing was answered", async () => {
    store.getInterviewSession.mockResolvedValue(doc({ turns: [{ question: "Q1" }, { question: "Q2", answer: "  " }] }));
    const res = await endInterviewEarly(ID);
    expect(res).toEqual({ success: true, noAnswers: true });
    expect(generateInterviewTurn).not.toHaveBeenCalled();
    expect(store.completeInterviewWithoutFeedback).toHaveBeenCalledWith(ID);
    expect(store.completeInterviewSession).not.toHaveBeenCalled();
  });

  it("still generates feedback when there is an answered turn", async () => {
    store.getInterviewSession.mockResolvedValue(doc({ turns: [{ question: "Q1", answer: "A" }, { question: "Q2" }] }));
    generateInterviewTurn.mockResolvedValue({ type: "feedback", ...feedback });
    const res = await endInterviewEarly(ID);
    expect(res).toMatchObject({ success: true, feedback: { score: 8 } });
    expect(generateInterviewTurn).toHaveBeenCalledTimes(1);
    expect(store.completeInterviewSession).toHaveBeenCalled();
    expect(store.completeInterviewWithoutFeedback).not.toHaveBeenCalled();
  });
});

describe("getMyInterviewSessions", () => {
  it("maps endedWithoutAnswers", async () => {
    store.listInterviewSessions.mockResolvedValue([doc({ status: "completed", endedWithoutAnswers: true })]);
    const res = await getMyInterviewSessions();
    expect(res[0].endedWithoutAnswers).toBe(true);
    expect(res[0].score).toBeUndefined();
  });
});

describe("getMyInterviewDetail", () => {
  it("returns null without touching the DB when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValue(null);
    expect(await getMyInterviewDetail(ID)).toBeNull();
    expect(store.getInterviewSession).not.toHaveBeenCalled();
  });

  it("returns null for an invalid id", async () => {
    expect(await getMyInterviewDetail("nope")).toBeNull();
    expect(store.getInterviewSession).not.toHaveBeenCalled();
  });

  it("scopes the lookup by the session user and returns null when not found", async () => {
    store.getInterviewSession.mockResolvedValue(null);
    expect(await getMyInterviewDetail(ID)).toBeNull();
    expect(store.getInterviewSession).toHaveBeenCalledWith(ID, "user1");
  });

  it("returns null for in-progress or feedback-less sessions", async () => {
    store.getInterviewSession.mockResolvedValueOnce(doc({ feedback }));
    expect(await getMyInterviewDetail(ID)).toBeNull();
    store.getInterviewSession.mockResolvedValueOnce(doc({ status: "completed" }));
    expect(await getMyInterviewDetail(ID)).toBeNull();
  });

  it("returns detail without resume text for an owned completed session", async () => {
    store.getInterviewSession.mockResolvedValue(
      doc({ status: "completed", feedback, turns: [{ question: "Q1", answer: "A1" }] })
    );
    const res = await getMyInterviewDetail(ID);
    expect(res?.feedback.score).toBe(8);
    expect(res?.turns).toEqual([{ question: "Q1", answer: "A1" }]);
    expect(JSON.stringify(res)).not.toContain("SECRET");
  });
});
