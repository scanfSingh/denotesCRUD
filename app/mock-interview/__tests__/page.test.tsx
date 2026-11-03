import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../interview-actions", () => ({
  submitInterviewAnswer: jest.fn(),
  endInterviewEarly: jest.fn(),
  getMyInterviewSessions: jest.fn(),
  getMyInterviewDetail: jest.fn(),
  getLearningInsights: jest.fn(),
  generateMyLearningInsights: jest.fn(),
}));
jest.mock("../../components/ProtectedRoute", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../../components/Navigation", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/AudioRecorder", () => ({ __esModule: true, default: () => <div data-testid="recorder" /> }));
jest.mock("../../components/FeatureFlagsProvider", () => ({ useFeatureFlags: () => ({ interview: { enabled: true } }) }));

import * as actions from "../../interview-actions";
import MockInterviewPage from "../page";

const a = actions as unknown as Record<string, jest.Mock>;

function startResponse(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      sessionId: "s1",
      question: "Tell me about yourself",
      startedAt: new Date().toISOString(),
      durationMinutes: 30,
      resumeFileName: "cv.pdf",
      ...over,
    }),
  };
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  Element.prototype.scrollTo = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  // resume lookup fails -> no stored resume; start call set per-test
  fetchMock.mockImplementation(async (url: string) =>
    url === "/api/interview/start" ? startResponse() : { ok: false, json: async () => null }
  );
  a.getMyInterviewSessions.mockResolvedValue([]);
  a.getLearningInsights.mockResolvedValue(null);
});

const pdf = () => new File(["x"], "cv.pdf", { type: "application/pdf" });

async function startInterview(user = userEvent.setup()) {
  render(<MockInterviewPage />);
  await user.upload(screen.getByLabelText(/resume/i), pdf());
  await user.click(screen.getByRole("button", { name: /start interview/i }));
  await screen.findByText("Tell me about yourself");
  return user;
}

describe("setup form", () => {
  it("associates labels, groups and aria-pressed", async () => {
    const user = userEvent.setup();
    render(<MockInterviewPage />);
    expect(screen.getByLabelText(/target role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skills to focus on/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resume/i)).toBeInTheDocument();
    const diff = screen.getByRole("group", { name: /difficulty/i });
    const dur = screen.getByRole("group", { name: /duration/i });
    const medium = within(diff).getByRole("button", { name: /medium/i });
    const hard = within(diff).getByRole("button", { name: /hard/i });
    expect(medium).toHaveAttribute("aria-pressed", "true");
    expect(hard).toHaveAttribute("aria-pressed", "false");
    await user.click(hard);
    expect(hard).toHaveAttribute("aria-pressed", "true");
    expect(medium).toHaveAttribute("aria-pressed", "false");
    const min60 = within(dur).getByRole("button", { name: /60 min/i });
    expect(within(dur).getByRole("button", { name: /30 min/i })).toHaveAttribute("aria-pressed", "true");
    await user.click(min60);
    expect(min60).toHaveAttribute("aria-pressed", "true");
  });

  it("shows option descriptions", () => {
    render(<MockInterviewPage />);
    for (const t of [
      "Fundamentals and warm-up questions",
      "Practical, role-level questions",
      "Deep dives and system design",
      "Quick practice session",
      "Standard session",
      "Extended deep-dive session",
    ]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it("shows resume errors inline", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<MockInterviewPage />);
    await user.click(screen.getByRole("button", { name: /start interview/i }));
    const field = screen.getByLabelText(/resume/i).parentElement as HTMLElement;
    expect(within(field).getByRole("alert")).toHaveTextContent(/upload your resume/i);
    await user.upload(screen.getByLabelText(/resume/i), new File(["x"], "cv.txt", { type: "text/plain" }));
    expect(within(field).getByRole("alert")).toHaveTextContent(/pdf or word/i);
  });

  it("shows analysing status while starting", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/interview/start" ? new Promise(() => {}) : { ok: false, json: async () => null }
    );
    render(<MockInterviewPage />);
    await user.upload(screen.getByLabelText(/resume/i), pdf());
    await user.click(screen.getByRole("button", { name: /start interview/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/analysing your resume/i);
    expect(screen.getByRole("button", { name: /analysing your resume/i })).toBeDisabled();
  });

  it("shows the empty state only without past sessions", async () => {
    const { unmount } = render(<MockInterviewPage />);
    expect(await screen.findByText(/your first mock interview/i)).toBeInTheDocument();
    unmount();
    a.getMyInterviewSessions.mockResolvedValue([
      { id: "1", role: "Dev", difficulty: "easy", durationMinutes: 30, status: "completed", score: 5, createdAt: new Date().toISOString() },
    ]);
    render(<MockInterviewPage />);
    await screen.findByText("5/10");
    expect(screen.queryByText(/your first mock interview/i)).not.toBeInTheDocument();
  });
});

describe("interview", () => {
  it("exposes timer and log roles, and submit hover class", async () => {
    await startInterview();
    expect(screen.getByRole("timer", { name: /time remaining/i })).toHaveTextContent(/^\d+:\d{2}$/);
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveTextContent("Tell me about yourself");
    const submit = screen.getByRole("button", { name: /submit answer/i });
    expect(submit.className).toContain("hover:bg-purple-500");
    expect(submit.className).not.toContain("hover:bg-purple-700");
    expect(screen.getByRole("button", { name: "Type" })).toHaveAttribute("aria-pressed", "true");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Speak" }));
    expect(screen.getByRole("button", { name: "Speak" })).toHaveAttribute("aria-pressed", "true");
  });

  it("asks for confirmation before ending", async () => {
    a.endInterviewEarly.mockResolvedValue({ success: true, feedback: { summary: "s", strengths: [], improvements: [], score: 6 } });
    const user = await startInterview();
    await user.click(screen.getByRole("button", { name: /end interview/i }));
    const dialog = screen.getByRole("alertdialog");
    expect(a.endInterviewEarly).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(a.endInterviewEarly).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /end interview/i }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /end interview/i }));
    await waitFor(() => expect(a.endInterviewEarly).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("6/10")).toBeInTheDocument();
  });

  it("returns to setup with a notice and no score when ended without answers", async () => {
    a.endInterviewEarly.mockResolvedValue({ success: true, noAnswers: true });
    const user = await startInterview();
    await user.click(screen.getByRole("button", { name: /end interview/i }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /end interview/i }));
    expect(await screen.findByText(/ended without any answers/i)).toBeInTheDocument();
    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
    expect(screen.queryByText(/update my learning plan/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start interview/i })).toBeInTheDocument();
  });

  it("shows an error and stays usable when ending throws", async () => {
    a.endInterviewEarly.mockRejectedValue(new Error("boom"));
    const user = await startInterview();
    await user.click(screen.getByRole("button", { name: /end interview/i }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /end interview/i }));
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /end interview/i })).toBeEnabled();
  });

  it.each([
    ["resolves success false", () => a.submitInterviewAnswer.mockResolvedValue({ success: false, error: "nope" }), "nope"],
    ["rejects", () => a.submitInterviewAnswer.mockRejectedValue(new Error("network down")), "network down"],
  ])("restores the typed answer when submit %s", async (_n, setup, msg) => {
    setup();
    const user = await startInterview();
    await user.type(screen.getByRole("textbox"), "my answer");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByText(msg as string)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("my answer");
    expect(within(screen.getByRole("log")).queryByText("my answer")).not.toBeInTheDocument();
  });

  it("submits with Ctrl/Cmd+Enter only", async () => {
    a.submitInterviewAnswer.mockResolvedValue({ success: true, done: false, question: "Next?" });
    const user = await startInterview();
    const box = screen.getByRole("textbox");
    await user.type(box, "{Control>}{Enter}{/Control}");
    expect(a.submitInterviewAnswer).not.toHaveBeenCalled();
    await user.type(box, "hello{Enter}");
    expect(a.submitInterviewAnswer).not.toHaveBeenCalled();
    await user.type(box, "{Control>}{Enter}{/Control}");
    await screen.findByText("Next?");
    expect(a.submitInterviewAnswer).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("log")).getByText("hello")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "again");
    await user.type(screen.getByRole("textbox"), "{Meta>}{Enter}{/Meta}");
    await waitFor(() => expect(a.submitInterviewAnswer).toHaveBeenCalledTimes(2));
  });

  it("auto-ends without confirmation and shows Time's up", async () => {
    a.endInterviewEarly.mockResolvedValue({ success: true, feedback: { summary: "s", strengths: [], improvements: [], score: 4 } });
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/interview/start"
        ? startResponse({ startedAt: new Date(Date.now() - 31 * 60_000).toISOString() })
        : { ok: false, json: async () => null }
    );
    await startInterview();
    await waitFor(() => expect(a.endInterviewEarly).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Time's up")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("past interviews", () => {
  const rows = [
    { id: "1", role: "Backend", difficulty: "easy", durationMinutes: 30, status: "completed", score: 7, createdAt: "2025-01-01T00:00:00Z" },
    { id: "2", role: "Frontend", difficulty: "hard", durationMinutes: 60, status: "in_progress", createdAt: "2025-01-02T00:00:00Z" },
    { id: "3", role: "Data", difficulty: "medium", durationMinutes: 30, status: "completed", endedWithoutAnswers: true, createdAt: "2025-01-03T00:00:00Z" },
  ];

  it("renders rows by kind and opens detail with Back", async () => {
    a.getMyInterviewSessions.mockResolvedValue(rows);
    a.getMyInterviewDetail.mockResolvedValue({
      id: "1", role: "Backend", difficulty: "easy", durationMinutes: 30, createdAt: "2025-01-01T00:00:00Z",
      feedback: { summary: "Solid work", strengths: ["Clear"], improvements: ["Depth"], score: 7 },
      turns: [{ question: "Why Node?", answer: "Because async" }],
    });
    const user = userEvent.setup();
    render(<MockInterviewPage />);
    const completed = await screen.findByRole("button", { name: /backend/i });
    expect(screen.queryByRole("button", { name: /frontend/i })).not.toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Ended - no answers")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /data/i })).not.toBeInTheDocument();

    await user.click(completed);
    expect(a.getMyInterviewDetail).toHaveBeenCalledWith("1");
    expect(await screen.findByText("Solid work")).toBeInTheDocument();
    for (const t of ["7/10", "Clear", "Depth", "Why Node?", "Because async"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("button", { name: /start interview/i })).toBeInTheDocument();
  });
});
