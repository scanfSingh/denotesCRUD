import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
jest.mock("../../components/AudioRecorder", () => ({
  __esModule: true,
  default: ({ disabled }: { disabled?: boolean }) => <div data-testid="recorder" data-disabled={String(Boolean(disabled))} />,
}));

let flags: { interview: { enabled: boolean; video?: boolean } } = { interview: { enabled: true, video: true } };
jest.mock("../../components/FeatureFlagsProvider", () => ({ useFeatureFlags: () => flags }));

const order: string[] = [];
let ttsState = "idle";
const ttsListeners = new Set<() => void>();
jest.mock("@/lib/interview/tts", () => ({
  speak: jest.fn(),
  cancel: jest.fn(),
  prime: jest.fn(() => order.push("prime")),
  getState: () => ttsState,
  subscribe: (l: () => void) => {
    ttsListeners.add(l);
    return () => ttsListeners.delete(l);
  },
  isSupported: () => true,
}));

import * as actions from "../../interview-actions";
import * as tts from "@/lib/interview/tts";
import MockInterviewPage from "../page";

const a = actions as unknown as Record<string, jest.Mock>;
const t = tts as unknown as Record<string, jest.Mock>;
const fetchMock = jest.fn();

function fakeStream() {
  const tracks = [{ stop: jest.fn() }, { stop: jest.fn() }];
  return { tracks, stream: { getTracks: () => tracks } as unknown as MediaStream };
}
let gum: jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  order.length = 0;
  ttsState = "idle";
  flags = { interview: { enabled: true, video: true } };
  t.prime.mockImplementation(() => order.push("prime"));
  Element.prototype.scrollTo = jest.fn();
  HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/interview/start") {
      order.push("fetch");
      return {
        ok: true,
        json: async () => ({
          sessionId: "s1",
          question: "Tell me about yourself",
          startedAt: new Date().toISOString(),
          durationMinutes: 30,
          resumeFileName: "cv.pdf",
        }),
      };
    }
    return { ok: false, json: async () => null };
  });
  a.getMyInterviewSessions.mockResolvedValue([]);
  a.getLearningInsights.mockResolvedValue(null);
  gum = jest.fn();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: gum } });
});

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).mediaDevices;
});

const pdf = () => new File(["x"], "cv.pdf", { type: "application/pdf" });

async function start() {
  const user = userEvent.setup();
  const view = render(<MockInterviewPage />);
  await user.upload(screen.getByLabelText(/resume/i), pdf());
  await user.click(screen.getByRole("button", { name: /start interview/i }));
  await screen.findByText("Tell me about yourself");
  return { user, view };
}

describe("flag off", () => {
  it("behaves as before: no camera, no speech, no controls", async () => {
    flags = { interview: { enabled: true } };
    await start();
    expect(gum).not.toHaveBeenCalled();
    expect(t.speak).not.toHaveBeenCalled();
    expect(t.prime).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Camera" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mute interviewer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Replay question" })).toBeNull();
  });
});

describe("flag on", () => {
  it("primes tts before the fetch, requests video only, and speaks the first question", async () => {
    gum.mockResolvedValue(fakeStream().stream);
    await start();
    expect(order.indexOf("prime")).toBeLessThan(order.indexOf("fetch"));
    await waitFor(() => expect(gum).toHaveBeenCalledWith({ video: true, audio: false }));
    expect(await screen.findByLabelText(/camera preview/i)).toBeInTheDocument();
    expect(t.speak).toHaveBeenCalledTimes(1);
    expect(t.speak).toHaveBeenCalledWith("Tell me about yourself");
  });

  it("shows a notice and keeps working when the camera is denied", async () => {
    gum.mockRejectedValue(new DOMException("no", "NotAllowedError"));
    const { user } = await start();
    expect(await screen.findByText("Camera unavailable. Continuing without video.")).toBeInTheDocument();
    a.submitInterviewAnswer.mockResolvedValue({ success: true, done: false, question: "Next?" });
    await user.type(screen.getByLabelText("Your answer"), "my answer");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await screen.findByText("Next?");
  });

  it("speaks follow-ups, and does not speak when muted; unmute does not replay", async () => {
    gum.mockResolvedValue(fakeStream().stream);
    const { user } = await start();
    a.submitInterviewAnswer.mockResolvedValue({ success: true, done: false, question: "Next?" });
    await user.type(screen.getByLabelText("Your answer"), "a1");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await screen.findByText("Next?");
    expect(t.speak).toHaveBeenCalledWith("Next?");

    t.cancel.mockClear();
    t.speak.mockClear();
    const mute = screen.getByRole("button", { name: "Mute interviewer" });
    await user.click(mute);
    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(t.cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Replay question" })).toBeDisabled();

    a.submitInterviewAnswer.mockResolvedValue({ success: true, done: false, question: "Third?" });
    await user.type(screen.getByLabelText("Your answer"), "a2");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await screen.findByText("Third?");
    expect(t.speak).not.toHaveBeenCalled();

    await user.click(mute);
    expect(t.speak).not.toHaveBeenCalled();
  });

  it("replay re-speaks the latest question", async () => {
    gum.mockResolvedValue(fakeStream().stream);
    const { user } = await start();
    t.speak.mockClear();
    await user.click(screen.getByRole("button", { name: "Replay question" }));
    expect(t.speak).toHaveBeenCalledWith("Tell me about yourself");
  });

  it("camera toggle stops tracks", async () => {
    const s = fakeStream();
    gum.mockResolvedValue(s.stream);
    const { user } = await start();
    await screen.findByLabelText(/camera preview/i);
    await user.click(screen.getByRole("button", { name: "Camera" }));
    s.tracks.forEach((tr) => expect(tr.stop).toHaveBeenCalled());
    expect(screen.getByText("Camera off")).toBeInTheDocument();
  });

  it("stops all tracks and cancels speech when the interview ends and on unmount", async () => {
    const s = fakeStream();
    gum.mockResolvedValue(s.stream);
    a.endInterviewEarly.mockResolvedValue({ success: true, feedback: { summary: "s", strengths: [], improvements: [], score: 6 } });
    const { user } = await start();
    await screen.findByLabelText(/camera preview/i);
    t.cancel.mockClear();
    await user.click(screen.getByRole("button", { name: /^end interview$/i }));
    await user.click(within_dialog());
    await waitFor(() => s.tracks.forEach((tr) => expect(tr.stop).toHaveBeenCalled()));
    expect(t.cancel).toHaveBeenCalled();
  });

  it("stops tracks on unmount", async () => {
    const s = fakeStream();
    gum.mockResolvedValue(s.stream);
    const { view } = await start();
    await screen.findByLabelText(/camera preview/i);
    view.unmount();
    s.tracks.forEach((tr) => expect(tr.stop).toHaveBeenCalled());
    expect(t.cancel).toHaveBeenCalled();
  });

  it("passes disabled to the recorder while speaking", async () => {
    gum.mockResolvedValue(fakeStream().stream);
    const { user } = await start();
    await user.click(screen.getByRole("button", { name: /speak/i }));
    expect(screen.getByTestId("recorder")).toHaveAttribute("data-disabled", "false");
    ttsState = "speaking";
    ttsListeners.forEach((l) => l());
    await waitFor(() => expect(screen.getByTestId("recorder")).toHaveAttribute("data-disabled", "true"));
    expect(screen.getByText("Interviewer speaking")).toBeInTheDocument();
  });

  it("only calls /api/interview/* and never constructs MediaRecorder", async () => {
    const mr = jest.fn();
    (global as unknown as Record<string, unknown>).MediaRecorder = mr;
    gum.mockResolvedValue(fakeStream().stream);
    await start();
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.every((u) => u.startsWith("/api/interview/"))).toBe(true);
    expect(mr).not.toHaveBeenCalled();
    delete (global as unknown as Record<string, unknown>).MediaRecorder;
  });
});

function within_dialog() {
  const dialog = screen.getByRole("alertdialog");
  return Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "End interview") as HTMLElement;
}
