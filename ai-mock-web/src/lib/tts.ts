export type TTSOptions = {
  voice?: string; // elevenlabs voice key/id or browser voice name
};

import { API_BASE } from "@/app/lib/api";

export async function speak(text: string, options: TTSOptions = {}): Promise<void> {
  const voice = options.voice ?? "rachel";

  try {
    const res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      // Non-200, try client-side TTS fallback
      return speakClient(text, options);
    }

    if (contentType.includes("audio/mpeg") || contentType.includes("audio/")) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("audio playback failed"));
          audio.play().catch(reject);
        });
      } finally {
        URL.revokeObjectURL(url);
      }
      return;
    }

    // Likely JSON fallback from server
    const json = await res.json();
    if (json?.fallback === "client_tts") {
      return speakClient(json.text ?? text, options);
    }

    // Unknown response – fallback
    return speakClient(text, options);
  } catch {
    // Network or other error – fallback
    return speakClient(text, options);
  }
}

export function speakClient(text: string, _options: TTSOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const synth = window.speechSynthesis;
    if (!synth) return resolve();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("speech synthesis failed"));

    synth.speak(utter);
  });
}
