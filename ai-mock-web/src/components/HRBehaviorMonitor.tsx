"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE } from "@/app/lib/api";

export interface HRBehaviorScores {
  eyeContact: number;       // 0-100
  attention: number;        // 0-100
  stability: number;        // 0-100  (mapped from movement_score)
  confidenceScore: number;  // 0-100
  postureScore: number;     // 0-100
  postureQuality: string;   // "good" | "acceptable" | "poor"
  gazeDirection: string;    // "center" | "left" | "right" | "up" | "down"
  nervousnessLevel: string; // "calm" | "slightly_nervous" | "nervous" | "highly_nervous"
  confidenceLevel: string;  // "high" | "moderate" | "low"
  attentionState: string;   // "fully_attentive" | "partially_attentive" | "inattentive"
  feedback: string[];       // live feedback messages from the engine
  overall: string;          // overall status string
}

interface HRBehaviorMonitorProps {
  onScoreUpdate: (scores: HRBehaviorScores) => void;
  isActive: boolean;
  sessionId?: string | null;
}

const DEFAULT_SCORES: HRBehaviorScores = {
  eyeContact: 0,
  attention: 0,
  stability: 0,
  confidenceScore: 0,
  postureScore: 0,
  postureQuality: "unknown",
  gazeDirection: "unknown",
  nervousnessLevel: "unknown",
  confidenceLevel: "unknown",
  attentionState: "unknown",
  feedback: [],
  overall: "",
};

export default function HRBehaviorMonitor({
  onScoreUpdate,
  isActive,
  sessionId,
}: HRBehaviorMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Start webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Camera init error:", err);
        if (active)
          setError(
            err instanceof Error ? err.message : "Camera access denied"
          );
      }
    }

    initCamera();

    return () => {
      active = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture frame as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, 640, 480);
    return canvas.toDataURL("image/jpeg", 0.6); // moderate quality to keep payload small
  }, []);

  // Send frame to backend for analysis
  const analyzeFrame = useCallback(async () => {
    if (!isActive) return;

    const base64 = captureFrame();
    if (!base64) return;

    try {
      const res = await fetch(`${API_BASE}/api/analyze-behavior`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          sessionId: sessionId || undefined,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      setConnected(true);

      const scores: HRBehaviorScores = {
        eyeContact: data.eye_contact_score ?? (data.eye_contact === "good" ? 100 : data.eye_contact === "moderate" ? 60 : 20),
        attention: data.attention_score ?? (data.presence ? 100 : 0),
        stability: data.movement_score ?? 80,
        confidenceScore: data.confidence_score ?? 0,
        postureScore: data.posture_score ?? (data.posture?.is_good ? 80 : 40),
        postureQuality: data.posture_quality ?? "unknown",
        gazeDirection: data.gaze_direction ?? "unknown",
        nervousnessLevel: data.nervousness_level ?? "unknown",
        confidenceLevel: data.confidence_level ?? "unknown",
        attentionState: data.attention_state ?? "unknown",
        feedback: data.feedback ?? [],
        overall: data.overall ?? "",
      };

      onScoreUpdate(scores);
    } catch {
      // Network error — silently skip this frame
    }
  }, [isActive, captureFrame, sessionId, onScoreUpdate]);

  // Polling loop — send a frame every ~600ms
  useEffect(() => {
    if (isInitializing || !isActive) return;

    intervalRef.current = setInterval(analyzeFrame, 600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isInitializing, isActive, analyzeFrame]);

  if (error) {
    return (
      <div className="w-full h-48 bg-red-50 flex items-center justify-center rounded-lg border border-red-200">
        <p className="text-red-500 font-medium">Camera Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-lg">
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full h-full object-cover transform scale-x-[-1]"
        style={{ opacity: isInitializing ? 0.5 : 1 }}
      />
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <div className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4 border-4 border-blue-500/30 border-t-blue-500 rounded-full" />
          <p className="text-white text-sm font-medium">
            Starting Camera...
          </p>
        </div>
      )}

      {!isInitializing && isActive && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full z-20">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              connected ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
          <span className="text-white text-xs font-semibold">
            {connected ? "Live Analysis" : "Connecting..."}
          </span>
        </div>
      )}
    </div>
  );
}
