/// <reference lib="webworker" />
/**
 * Web Worker that runs Kokoro TTS off the main thread.
 *
 * `kokoro-js` is only ever loaded through the dynamic `import()` below, so
 * it is never part of the server bundle or the initial page JS.
 *
 * Verified from node_modules/kokoro-js/types/kokoro.d.ts:
 * `generate(text, { voice })` resolves to a transformers.js `RawAudio`
 * with `audio: Float32Array` and `sampling_rate: number`.
 */

export type KokoroWorkerRequest =
  | { type: "init" }
  | { type: "generate"; id: number; text: string };

export type KokoroWorkerResponse =
  | { type: "loading" }
  | { type: "ready" }
  | { type: "audio"; id: number; samples: Float32Array; sampleRate: number }
  | { type: "error"; id?: number; message: string };

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart";

type Synth = {
  generate: (
    text: string,
    opts: { voice: string }
  ) => Promise<{ audio: Float32Array; sampling_rate: number }>;
};

let ttsPromise: Promise<Synth> | null = null;

function post(msg: KokoroWorkerResponse, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(msg, transfer ?? []);
}

function loadModel(): Promise<Synth> {
  if (!ttsPromise) {
    post({ type: "loading" });
    ttsPromise = import("kokoro-js")
      .then(({ KokoroTTS }) =>
        KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "wasm" })
      )
      .then((tts) => {
        post({ type: "ready" });
        return tts as unknown as Synth;
      });
  }
  return ttsPromise;
}

self.onmessage = async (event: MessageEvent<KokoroWorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "init") {
    loadModel().catch((err) => {
      ttsPromise = null;
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    });
    return;
  }
  if (msg.type !== "generate") return;
  try {
    const tts = await loadModel();
    const out = await tts.generate(msg.text, { voice: VOICE });
    post(
      { type: "audio", id: msg.id, samples: out.audio, sampleRate: out.sampling_rate },
      [out.audio.buffer]
    );
  } catch (err) {
    ttsPromise = null;
    post({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
