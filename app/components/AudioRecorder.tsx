"use client";

import { useState, useRef, useEffect } from "react";

// Define SpeechRecognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor;
    webkitSpeechRecognition: ISpeechRecognitionConstructor;
  }
}

interface AudioRecorderProps {
  onTranscriptionComplete: (transcription: string) => void;
  onError?: (error: string) => void;
  showLivePreview?: boolean;
}

export default function AudioRecorder({
  onTranscriptionComplete,
  onError,
  showLivePreview = true,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }
        
        setFinalTranscript((prev) => {
          // Only append new final results
          const newFinal = final.trim();
          if (newFinal && !prev.includes(newFinal)) {
            return prev + " " + newFinal;
          }
          return prev;
        });
        setInterimTranscript(interim);
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          onError?.("Microphone permission denied. Please enable microphone access.");
        } else if (event.error === "no-speech") {
          // This is common, don't show error for it
        } else {
          onError?.(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        // If still supposed to be recording, restart
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      // Cleanup on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Update recognition onend handler when isRecording changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = () => {
        if (isRecording) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };
    }
  }, [isRecording]);

  const startRecording = async () => {
    if (!recognitionRef.current) {
      onError?.("Speech recognition not available");
      return;
    }

    try {
      setFinalTranscript("");
      setInterimTranscript("");
      setRecordingTime(0);
      
      recognitionRef.current.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      onError?.("Failed to start speech recognition. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Combine final and interim transcripts
      const fullTranscript = (finalTranscript + " " + interimTranscript).trim();
      
      if (fullTranscript) {
        onTranscriptionComplete(fullTranscript);
      } else {
        onError?.("No speech detected. Please try again and speak clearly.");
      }
      
      // Reset transcripts
      setFinalTranscript("");
      setInterimTranscript("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isSupported === false) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200 text-sm">
          Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  const currentTranscript = (finalTranscript + " " + interimTranscript).trim();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          {isRecording ? (
            <>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all transform hover:scale-105"
                title="Stop Recording"
              >
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </>
          ) : (
            <button
              onClick={startRecording}
              disabled={isSupported === null}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Start Recording"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {isRecording
            ? "Listening... Speak clearly. Click stop when finished."
            : "Click the microphone to start recording"}
        </p>

        {/* Live Transcription Preview */}
        {showLivePreview && isRecording && currentTranscript && (
          <div className="w-full mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Live transcription:</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {finalTranscript}
              <span className="text-gray-400 dark:text-gray-500">{interimTranscript}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
