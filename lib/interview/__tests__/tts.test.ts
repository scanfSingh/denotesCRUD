const kokoroFactory = jest.fn(() => ({ KokoroTTS: { from_pretrained: jest.fn() } }));
jest.mock("kokoro-js", () => kokoroFactory());

import * as tts from "../tts";

class FakeUtterance {
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  volume = 1;
  constructor(public text: string) {}
}

let utterances: FakeUtterance[];
const synth = {
  speak: jest.fn((u: FakeUtterance) => {
    utterances.push(u);
  }),
  cancel: jest.fn(),
};

class FakeWorker {
  static last: FakeWorker;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  posted: unknown[] = [];
  terminate = jest.fn();
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(m: unknown) {
    this.posted.push(m);
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

class FakeSource {
  static last: FakeSource;
  buffer: unknown;
  onended: (() => void) | null = null;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn(() => this.onended?.());
  constructor() {
    FakeSource.last = this;
  }
}
class FakeAudioContext {
  state = "running";
  destination = {};
  resume = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
  createBuffer = jest.fn(() => ({ copyToChannel: jest.fn() }));
  createBufferSource = () => new FakeSource();
}

const g = global as unknown as Record<string, unknown>;
const w = window as unknown as Record<string, unknown>;

function install(opts: { worker?: boolean; synth?: boolean }) {
  if (opts.worker) {
    g.Worker = FakeWorker;
    g.AudioContext = FakeAudioContext;
    w.AudioContext = FakeAudioContext;
  }
  if (opts.synth) {
    w.speechSynthesis = synth;
    g.SpeechSynthesisUtterance = FakeUtterance;
  }
}

beforeEach(() => {
  utterances = [];
  synth.speak.mockClear();
  synth.cancel.mockClear();
});

afterEach(() => {
  tts.__resetForTests();
  delete g.Worker;
  delete g.AudioContext;
  delete w.AudioContext;
  delete w.speechSynthesis;
  delete g.SpeechSynthesisUtterance;
});

describe("tts module", () => {
  it("does not import kokoro-js when the module is loaded", () => {
    expect(kokoroFactory).not.toHaveBeenCalled();
  });

  it("is unsupported and silent when nothing exists", () => {
    expect(tts.isSupported()).toBe(false);
    expect(() => {
      tts.prime();
      tts.speak("hi");
      tts.cancel();
    }).not.toThrow();
    expect(tts.getState()).toBe("idle");
  });

  it("uses speechSynthesis and tracks speaking state", () => {
    install({ synth: true });
    expect(tts.isSupported()).toBe(true);
    const listener = jest.fn();
    tts.subscribe(listener);
    tts.speak("Question one");
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(utterances[0].text).toBe("Question one");
    utterances[0].onstart?.();
    expect(tts.getState()).toBe("speaking");
    utterances[0].onend?.();
    expect(tts.getState()).toBe("idle");
    expect(listener).toHaveBeenCalled();
  });

  it("returns to idle on utterance error", () => {
    install({ synth: true });
    tts.speak("x");
    utterances[0].onstart?.();
    utterances[0].onerror?.();
    expect(tts.getState()).toBe("idle");
  });

  it("cancels previous speech before speaking again", () => {
    install({ synth: true });
    tts.speak("one");
    utterances[0].onstart?.();
    tts.speak("two");
    expect(synth.cancel).toHaveBeenCalled();
    expect(tts.getState()).toBe("idle");
    expect(utterances[1].text).toBe("two");
  });

  it("cancel() stops speech and resets state", () => {
    install({ synth: true });
    tts.speak("one");
    utterances[0].onstart?.();
    tts.cancel();
    expect(tts.getState()).toBe("idle");
  });

  it("falls back to speechSynthesis while Kokoro is loading", () => {
    install({ worker: true, synth: true });
    tts.prime();
    expect(FakeWorker.last.posted).toContainEqual({ type: "init" });
    expect(tts.getState()).toBe("loading");
    tts.speak("hello");
    expect(synth.speak).toHaveBeenCalled();
    expect(FakeWorker.last.posted.filter((m) => (m as { type: string }).type === "generate")).toHaveLength(0);
  });

  it("falls back silently when the worker errors", () => {
    install({ worker: true, synth: true });
    tts.prime();
    FakeWorker.last.emit({ type: "error", message: "boom" });
    expect(tts.getState()).toBe("idle");
    expect(() => tts.speak("hello")).not.toThrow();
    expect(utterances.at(-1)?.text).toBe("hello");
  });

  it("plays Kokoro audio once ready", () => {
    install({ worker: true, synth: true });
    tts.prime();
    FakeWorker.last.emit({ type: "ready" });
    expect(tts.getState()).toBe("idle");
    tts.speak("hello");
    const gen = FakeWorker.last.posted.find((m) => (m as { type: string }).type === "generate") as { id: number; text: string };
    expect(gen.text).toBe("hello");
    FakeWorker.last.emit({ type: "audio", id: gen.id, samples: new Float32Array(10), sampleRate: 24000 });
    expect(FakeSource.last.start).toHaveBeenCalled();
    expect(tts.getState()).toBe("speaking");
    FakeSource.last.onended?.();
    expect(tts.getState()).toBe("idle");
    expect(synth.speak).not.toHaveBeenCalledWith(expect.objectContaining({ text: "hello" }));
  });

  it("drops Kokoro audio that arrives after cancel", () => {
    install({ worker: true, synth: true });
    tts.prime();
    FakeWorker.last.emit({ type: "ready" });
    tts.speak("hello");
    const gen = FakeWorker.last.posted.find((m) => (m as { type: string }).type === "generate") as { id: number };
    tts.cancel();
    FakeWorker.last.emit({ type: "audio", id: gen.id, samples: new Float32Array(1), sampleRate: 24000 });
    expect(tts.getState()).toBe("idle");
  });
});
