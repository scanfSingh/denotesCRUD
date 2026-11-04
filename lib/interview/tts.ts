/**
 * Swappable text-to-speech for the mock interview.
 *
 * Public API: speak / cancel / prime / getState / subscribe / isSupported.
 * The default provider is Kokoro (in-browser, via a Web Worker that lazily
 * imports `kokoro-js`) with `window.speechSynthesis` as the fallback while
 * the model loads or if it fails. To swap providers, change
 * `createPrimaryEngine()`.
 *
 * Client-only: nothing here touches `window` at import time.
 * This module must never statically import `kokoro-js`.
 */
import type { KokoroWorkerResponse } from "./kokoroWorker";

export type TtsState = "idle" | "loading" | "speaking";

export interface PlaybackHooks {
  onStart: () => void;
  onEnd: () => void;
}

export interface TtsEngine {
  /** Speak `text`; must call hooks.onEnd exactly once (also on failure/cancel). */
  speak(text: string, hooks: PlaybackHooks): void;
  cancel(): void;
  /** Called synchronously from a user gesture to unlock audio. */
  prime(): void;
  dispose(): void;
}

// ---------------------------------------------------------------------
// speechSynthesis engine
// ---------------------------------------------------------------------

function hasSpeechSynthesis(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function createSpeechSynthesisEngine(): TtsEngine {
  let active: { done: () => void } | null = null;
  return {
    speak(text, hooks) {
      const synth = window.speechSynthesis;
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        if (active && active.done === done) active = null;
        hooks.onEnd();
      };
      active = { done };
      const utter = new SpeechSynthesisUtterance(text);
      utter.onstart = () => hooks.onStart();
      utter.onend = done;
      utter.onerror = done;
      try {
        synth.cancel();
        synth.speak(utter);
      } catch {
        done();
      }
    },
    cancel() {
      const cur = active;
      active = null;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      cur?.done();
    },
    prime() {
      try {
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch {
        // ignore
      }
    },
    dispose() {
      this.cancel();
    },
  };
}

// ---------------------------------------------------------------------
// Kokoro engine (Web Worker + AudioContext)
// ---------------------------------------------------------------------

type KokoroStatus = "idle" | "loading" | "ready" | "error";

interface KokoroEngine extends TtsEngine {
  getStatus(): KokoroStatus;
  onStatusChange(cb: () => void): void;
  /** Like speak, but reports failure so the caller can fall back. */
  speakOrFail(text: string, hooks: PlaybackHooks, onFail: () => void): void;
}

function hasKokoroSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof AudioContext !== "undefined"
  );
}

function createKokoroEngine(): KokoroEngine {
  let worker: Worker | null = null;
  let ctx: AudioContext | null = null;
  let status: KokoroStatus = "idle";
  let statusCb: () => void = () => {};
  let nextId = 1;
  const pending = new Map<
    number,
    { hooks: PlaybackHooks; onFail: () => void }
  >();
  let source: AudioBufferSourceNode | null = null;
  let currentEnd: (() => void) | null = null;

  const setStatus = (s: KokoroStatus) => {
    if (status === s) return;
    status = s;
    statusCb();
  };

  const ensureCtx = () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  };

  const failAll = () => {
    const items = Array.from(pending.values());
    pending.clear();
    items.forEach((p) => p.onFail());
  };

  const ensureWorker = (): Worker | null => {
    if (worker) return worker;
    if (!hasKokoroSupport() || status === "error") return null;
    try {
      worker = new Worker(new URL("./kokoroWorker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      setStatus("error");
      return null;
    }
    setStatus("loading");
    worker.onmessage = (e: MessageEvent<KokoroWorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "loading") setStatus("loading");
      else if (msg.type === "ready") setStatus("ready");
      else if (msg.type === "audio") {
        const req = pending.get(msg.id);
        if (!req) return; // cancelled
        pending.delete(msg.id);
        play(msg.samples, msg.sampleRate, req.hooks, req.onFail);
      } else if (msg.type === "error") {
        setStatus("error");
        failAll();
      }
    };
    worker.onerror = () => {
      setStatus("error");
      failAll();
    };
    return worker;
  };

  const play = (
    samples: Float32Array,
    rate: number,
    hooks: PlaybackHooks,
    onFail: () => void
  ) => {
    try {
      const c = ensureCtx();
      const buffer = c.createBuffer(1, samples.length, rate);
      buffer.copyToChannel(new Float32Array(samples), 0);
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.connect(c.destination);
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        if (source === src) source = null;
        if (currentEnd === end) currentEnd = null;
        hooks.onEnd();
      };
      src.onended = end;
      source = src;
      currentEnd = end;
      hooks.onStart();
      src.start();
    } catch {
      onFail();
    }
  };

  return {
    getStatus: () => status,
    onStatusChange(cb) {
      statusCb = cb;
    },
    speak(text, hooks) {
      this.speakOrFail(text, hooks, hooks.onEnd);
    },
    speakOrFail(text, hooks, onFail) {
      const w = ensureWorker();
      if (!w) return onFail();
      const id = nextId++;
      pending.set(id, { hooks, onFail });
      w.postMessage({ type: "generate", id, text });
    },
    cancel() {
      const items = Array.from(pending.values());
      pending.clear();
      items.forEach((p) => p.hooks.onEnd());
      const end = currentEnd;
      try {
        source?.stop();
      } catch {
        // ignore
      }
      source = null;
      end?.();
    },
    prime() {
      if (!hasKokoroSupport()) return;
      try {
        ensureCtx();
      } catch {
        // ignore
      }
      // Start loading the model right away (worker lazily imports kokoro-js).
      ensureWorker()?.postMessage({ type: "init" });
    },
    dispose() {
      this.cancel();
      worker?.terminate();
      worker = null;
      void ctx?.close().catch(() => {});
      ctx = null;
      status = "idle";
    },
  };
}

function createPrimaryEngine(): KokoroEngine {
  return createKokoroEngine();
}

// ---------------------------------------------------------------------
// Public facade
// ---------------------------------------------------------------------

let kokoro: KokoroEngine | null = null;
let synth: TtsEngine | null = null;
let speakingCount = 0;
let seq = 0;
let lastEmitted: TtsState = "idle";
const listeners = new Set<() => void>();

function getKokoro(): KokoroEngine | null {
  if (!hasKokoroSupport()) return null;
  if (!kokoro) {
    kokoro = createPrimaryEngine();
    kokoro.onStatusChange(emit);
  }
  return kokoro;
}

function getSynth(): TtsEngine | null {
  if (!hasSpeechSynthesis()) return null;
  if (!synth) synth = createSpeechSynthesisEngine();
  return synth;
}

export function getState(): TtsState {
  if (speakingCount > 0) return "speaking";
  if (kokoro?.getStatus() === "loading") return "loading";
  return "idle";
}

function emit() {
  const s = getState();
  if (s === lastEmitted) return;
  lastEmitted = s;
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSupported(): boolean {
  return hasKokoroSupport() || hasSpeechSynthesis();
}

export function prime(): void {
  getKokoro()?.prime();
  getSynth()?.prime();
  emit();
}

export function cancel(): void {
  seq++;
  kokoro?.cancel();
  synth?.cancel();
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !text) return;
  cancel();
  const mySeq = seq;
  const k = getKokoro();
  const s = getSynth();

  const hooks = (): PlaybackHooks => {
    let started = false;
    let ended = false;
    return {
      onStart: () => {
        if (started || ended) return;
        started = true;
        speakingCount++;
        emit();
      },
      onEnd: () => {
        if (ended) return;
        ended = true;
        if (started) speakingCount = Math.max(0, speakingCount - 1);
        emit();
      },
    };
  };

  const viaSynth = () => {
    if (mySeq !== seq || !s) return;
    s.speak(text, hooks());
  };

  if (k && k.getStatus() === "ready") {
    k.speakOrFail(text, hooks(), viaSynth);
  } else {
    // Loading, errored, or unsupported: use speechSynthesis (silently).
    if (k && k.getStatus() === "idle") k.prime();
    viaSynth();
  }
  emit();
}

/** Test helper: tear down singletons. */
export function __resetForTests(): void {
  kokoro?.dispose();
  synth?.dispose();
  kokoro = null;
  synth = null;
  speakingCount = 0;
  seq = 0;
  lastEmitted = "idle";
  listeners.clear();
}
