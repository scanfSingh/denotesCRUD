const updateOne = jest.fn();
const toArray = jest.fn();
const find = jest.fn((..._args: unknown[]) => ({ sort: () => ({ limit: () => ({ toArray }) }) }));

jest.mock("mongodb", () => ({
  ObjectId: class {
    constructor(public id: string) {}
    toString() {
      return this.id;
    }
  },
}));
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: {
    connect: async () => ({ db: () => ({ collection: () => ({ updateOne, find }) }) }),
  },
}));

import { completeInterviewWithoutFeedback, getCompletedInterviewFeedbacks } from "../store";

const ID = "507f1f77bcf86cd799439011";

beforeEach(() => jest.clearAllMocks());

describe("completeInterviewWithoutFeedback", () => {
  it("marks completed with endedWithoutAnswers and writes no feedback", async () => {
    await completeInterviewWithoutFeedback(ID);
    const update = updateOne.mock.calls[0][1];
    expect(update.$set.status).toBe("completed");
    expect(update.$set.endedWithoutAnswers).toBe(true);
    expect(update.$set.completedAt).toBeInstanceOf(Date);
    expect(update.$set).not.toHaveProperty("feedback");
  });
});

describe("getCompletedInterviewFeedbacks", () => {
  it("requires feedback to exist so no-answer sessions are excluded", async () => {
    toArray.mockResolvedValue([]);
    await getCompletedInterviewFeedbacks(ID);
    expect(find.mock.calls[0][0]).toMatchObject({ status: "completed", feedback: { $exists: true } });
  });
});
