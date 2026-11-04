"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "off" | "unavailable";

/**
 * Local-only webcam preview. Requests video (never audio) when `enabled`
 * and stops every track on disable, toggle-off and unmount. Nothing is
 * recorded or uploaded.
 */
export function useInterviewMedia(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [cameraOn, setCameraOn] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopStream();
      setStatus("idle");
      return;
    }
    if (!cameraOn) {
      stopStream();
      setStatus("off");
      return;
    }
    const getUserMedia =
      typeof navigator !== "undefined"
        ? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
        : undefined;
    if (!getUserMedia) {
      setStatus("unavailable");
      return;
    }
    let cancelled = false;
    setStatus("requesting");
    getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        setStream(s);
        setStatus("active");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [enabled, cameraOn, stopStream]);

  const toggleCamera = useCallback(() => setCameraOn((v) => !v), []);

  return { stream, status, cameraOn, toggleCamera };
}
