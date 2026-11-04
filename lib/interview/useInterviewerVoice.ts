"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as tts from "./tts";

/** React binding over the tts module: state, mute, replay, speakQuestion. */
export function useInterviewerVoice() {
  const state = useSyncExternalStore(
    tts.subscribe,
    tts.getState,
    () => "idle" as tts.TtsState
  );
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);
  const lastRef = useRef("");

  const speakQuestion = useCallback((text: string) => {
    lastRef.current = text;
    if (mutedRef.current) return;
    tts.speak(text);
  }, []);

  const setMuted = useCallback((next: boolean) => {
    mutedRef.current = next;
    setMutedState(next);
    if (next) tts.cancel();
  }, []);

  const replay = useCallback(() => {
    if (mutedRef.current || !lastRef.current) return;
    tts.speak(lastRef.current);
  }, []);

  const cancel = useCallback(() => tts.cancel(), []);

  useEffect(() => () => tts.cancel(), []);

  return { state, muted, setMuted, replay, speakQuestion, cancel, isSupported: tts.isSupported };
}
