"use client";

import { useEffect, useRef } from "react";
import type { CameraStatus } from "@/lib/interview/useInterviewMedia";
import type { TtsState } from "@/lib/interview/tts";

interface Props {
  stream: MediaStream | null;
  cameraStatus: CameraStatus;
  cameraOn: boolean;
  onToggleCamera: () => void;
  voiceState: TtsState;
  muted: boolean;
  onToggleMute: () => void;
  onReplay: () => void;
  /** False when neither Kokoro nor speechSynthesis exists: voice controls are hidden. */
  voiceSupported: boolean;
}

const btn =
  "rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08] disabled:opacity-50 aria-pressed:bg-purple-600 aria-pressed:text-white";

export default function InterviewVideoPanel({
  stream,
  cameraStatus,
  cameraOn,
  onToggleCamera,
  voiceState,
  muted,
  onToggleMute,
  onReplay,
  voiceSupported,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play?.()?.catch?.(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  const showVideo = cameraOn && stream !== null;

  return (
    <div className="border-b border-white/[0.06] px-5 py-3 space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-28 w-40 overflow-hidden rounded-lg bg-black/40">
          {showVideo ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Your camera preview"
              className="h-full w-full -scale-x-100 object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-400">
              {cameraOn ? "Camera starting..." : "Camera off"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={cameraOn} onClick={onToggleCamera} className={btn}>
              Camera
            </button>
            {voiceSupported && (
              <>
                <button type="button" aria-pressed={muted} onClick={onToggleMute} className={btn}>
                  Mute interviewer
                </button>
                <button type="button" onClick={onReplay} disabled={muted} className={btn}>
                  Replay question
                </button>
              </>
            )}
          </div>
          {voiceState === "loading" && (
            <p role="status" className="text-xs text-slate-400">
              Loading interviewer voice...
            </p>
          )}
          {voiceState === "speaking" && (
            <p role="status" className="text-xs text-purple-300">
              Interviewer speaking
            </p>
          )}
          {cameraStatus === "unavailable" && (
            <p role="status" className="text-xs text-amber-300">
              Camera unavailable. Continuing without video.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
