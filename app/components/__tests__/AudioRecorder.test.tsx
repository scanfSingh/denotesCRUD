import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AudioRecorder from "../AudioRecorder";

class FakeRecognition {
  static instance: FakeRecognition;
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: unknown = null;
  onerror: unknown = null;
  onend: unknown = null;
  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();
  constructor() {
    FakeRecognition.instance = this;
  }
}

beforeEach(() => {
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
});
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
});

describe("AudioRecorder disabled prop", () => {
  it("disables the start button when disabled", () => {
    render(<AudioRecorder onTranscriptionComplete={jest.fn()} disabled />);
    expect(screen.getByTitle("Start Recording")).toBeDisabled();
  });

  it("enables start when not disabled", () => {
    render(<AudioRecorder onTranscriptionComplete={jest.fn()} />);
    expect(screen.getByTitle("Start Recording")).toBeEnabled();
  });

  it("stops an active recording when it becomes disabled", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AudioRecorder onTranscriptionComplete={jest.fn()} />);
    await user.click(screen.getByTitle("Start Recording"));
    expect(FakeRecognition.instance.start).toHaveBeenCalled();
    expect(screen.getByTitle("Stop Recording")).toBeInTheDocument();
    await act(async () => {
      rerender(<AudioRecorder onTranscriptionComplete={jest.fn()} disabled />);
    });
    expect(FakeRecognition.instance.stop).toHaveBeenCalled();
    expect(screen.getByTitle("Start Recording")).toBeDisabled();
  });
});
