import { renderHook, act, waitFor } from "@testing-library/react";
import { useInterviewMedia } from "../useInterviewMedia";

function fakeStream() {
  const tracks = [{ stop: jest.fn() }, { stop: jest.fn() }];
  return { tracks, stream: { getTracks: () => tracks } as unknown as MediaStream };
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).mediaDevices;
});

function mockGum(impl: jest.Mock) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: impl },
  });
}

describe("useInterviewMedia", () => {
  it("does not request the camera when disabled", () => {
    const gum = jest.fn();
    mockGum(gum);
    renderHook(() => useInterviewMedia(false));
    expect(gum).not.toHaveBeenCalled();
  });

  it("requests video only and becomes active", async () => {
    const { stream } = fakeStream();
    const gum = jest.fn().mockResolvedValue(stream);
    mockGum(gum);
    const { result } = renderHook(() => useInterviewMedia(true));
    await waitFor(() => expect(result.current.status).toBe("active"));
    expect(gum).toHaveBeenCalledWith({ video: true, audio: false });
    expect(result.current.stream).toBe(stream);
  });

  it("reports unavailable when permission is denied", async () => {
    mockGum(jest.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")));
    const { result } = renderHook(() => useInterviewMedia(true));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.stream).toBeNull();
  });

  it("reports unavailable when there is no mediaDevices", async () => {
    const { result } = renderHook(() => useInterviewMedia(true));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });

  it("toggle off stops all tracks and toggle on re-requests", async () => {
    const first = fakeStream();
    const second = fakeStream();
    const gum = jest.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
    mockGum(gum);
    const { result } = renderHook(() => useInterviewMedia(true));
    await waitFor(() => expect(result.current.status).toBe("active"));
    act(() => result.current.toggleCamera());
    await waitFor(() => expect(result.current.status).toBe("off"));
    first.tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
    expect(result.current.cameraOn).toBe(false);
    act(() => result.current.toggleCamera());
    await waitFor(() => expect(result.current.stream).toBe(second.stream));
    expect(gum).toHaveBeenCalledTimes(2);
  });

  it("stops all tracks when disabled and on unmount", async () => {
    const a = fakeStream();
    mockGum(jest.fn().mockResolvedValue(a.stream));
    const h1 = renderHook(({ on }) => useInterviewMedia(on), { initialProps: { on: true } });
    await waitFor(() => expect(h1.result.current.status).toBe("active"));
    h1.rerender({ on: false });
    a.tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());

    const b = fakeStream();
    mockGum(jest.fn().mockResolvedValue(b.stream));
    const h2 = renderHook(() => useInterviewMedia(true));
    await waitFor(() => expect(h2.result.current.status).toBe("active"));
    h2.unmount();
    b.tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });
});
