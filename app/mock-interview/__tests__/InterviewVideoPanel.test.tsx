import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterviewVideoPanel from "../InterviewVideoPanel";

function setup(over: Partial<React.ComponentProps<typeof InterviewVideoPanel>> = {}) {
  const props = {
    stream: {} as MediaStream,
    cameraStatus: "active" as const,
    cameraOn: true,
    onToggleCamera: jest.fn(),
    voiceState: "idle" as const,
    muted: false,
    onToggleMute: jest.fn(),
    onReplay: jest.fn(),
    voiceSupported: true,
    ...over,
  };
  render(<InterviewVideoPanel {...props} />);
  return props;
}

describe("InterviewVideoPanel", () => {
  it("renders a muted playsInline video and a pressed camera toggle", async () => {
    const p = setup();
    const video = screen.getByLabelText(/camera preview/i) as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    const cam = screen.getByRole("button", { name: "Camera" });
    expect(cam).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(cam);
    expect(p.onToggleCamera).toHaveBeenCalled();
  });

  it("shows a placeholder when the camera is off", () => {
    setup({ cameraOn: false, stream: null });
    expect(screen.queryByLabelText(/camera preview/i)).toBeNull();
    expect(screen.getByText("Camera off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Camera" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the unavailable notice", () => {
    setup({ cameraStatus: "unavailable", stream: null });
    expect(screen.getByText("Camera unavailable. Continuing without video.")).toBeInTheDocument();
  });

  it("mute toggles and replay is disabled while muted", async () => {
    const p = setup({ muted: true });
    const mute = screen.getByRole("button", { name: "Mute interviewer" });
    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Replay question" })).toBeDisabled();
    await userEvent.click(mute);
    expect(p.onToggleMute).toHaveBeenCalled();
  });

  it("replay calls onReplay when not muted", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: "Replay question" }));
    expect(p.onReplay).toHaveBeenCalled();
  });

  it("shows loading and speaking indicators", () => {
    const { rerender } = render(<div />);
    rerender(<div />);
    setup({ voiceState: "loading" });
    expect(screen.getByText("Loading interviewer voice...")).toBeInTheDocument();
  });

  it("shows the speaking indicator", () => {
    setup({ voiceState: "speaking" });
    expect(screen.getByText("Interviewer speaking")).toBeInTheDocument();
  });

  it("hides voice controls when unsupported", () => {
    setup({ voiceSupported: false });
    expect(screen.queryByRole("button", { name: "Mute interviewer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Replay question" })).toBeNull();
  });
});
