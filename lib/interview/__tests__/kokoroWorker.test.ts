const fromPretrained = jest.fn();
jest.mock("kokoro-js", () => ({ KokoroTTS: { from_pretrained: (...a: unknown[]) => fromPretrained(...a) } }));

describe("kokoroWorker", () => {
  it("lazily loads kokoro once and posts PCM audio", async () => {
    const generate = jest.fn().mockResolvedValue({ audio: new Float32Array([0.1, 0.2]), sampling_rate: 24000 });
    fromPretrained.mockResolvedValue({ generate });
    const post = jest.spyOn(self, "postMessage").mockImplementation(() => {});

    await import("../kokoroWorker");
    expect(fromPretrained).not.toHaveBeenCalled();

    const handler = self.onmessage as unknown as (e: { data: unknown }) => Promise<void>;
    await handler({ data: { type: "generate", id: 1, text: "hi" } });
    await handler({ data: { type: "generate", id: 2, text: "again" } });

    expect(fromPretrained).toHaveBeenCalledTimes(1);
    expect(fromPretrained).toHaveBeenCalledWith("onnx-community/Kokoro-82M-v1.0-ONNX", expect.objectContaining({ dtype: "q8" }));
    expect(generate).toHaveBeenCalledWith("hi", { voice: "af_heart" });
    const audioMsgs = post.mock.calls.map((c) => c[0] as { type: string; id?: number; sampleRate?: number });
    expect(audioMsgs).toContainEqual(expect.objectContaining({ type: "loading" }));
    expect(audioMsgs).toContainEqual(expect.objectContaining({ type: "ready" }));
    expect(audioMsgs).toContainEqual(expect.objectContaining({ type: "audio", id: 1, sampleRate: 24000 }));
  });

  it("posts an error message when generation fails", async () => {
    const post = jest.spyOn(self, "postMessage").mockImplementation(() => {});
    post.mockClear();
    fromPretrained.mockReset();
    fromPretrained.mockRejectedValue(new Error("nope"));
    jest.resetModules();
    await import("../kokoroWorker");
    const handler = self.onmessage as unknown as (e: { data: unknown }) => Promise<void>;
    await handler({ data: { type: "generate", id: 9, text: "x" } });
    expect(post.mock.calls.map((c) => c[0])).toContainEqual({ type: "error", id: 9, message: "nope" });
  });
});
