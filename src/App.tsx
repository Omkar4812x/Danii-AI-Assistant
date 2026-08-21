/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Power, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { AudioStreamer } from "./lib/audio-streamer.ts";
import { LiveSession } from "./lib/live-session.ts";
import Waveform from "./components/Waveform.tsx";

type SessionState = "disconnected" | "connecting" | "idle" | "listening" | "speaking";

export default function App() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  const apiKey = process.env.GEMINI_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
    }
  }, [apiKey]);

  const toggleSession = async () => {
    if (state === "disconnected") {
      startSession();
    } else {
      stopSession();
    }
  };

  const startSession = async () => {
    if (!apiKey) return;
    
    setState("connecting");
    setError(null);

    try {
      audioStreamerRef.current = new AudioStreamer();
      liveSessionRef.current = new LiveSession(apiKey);

      await liveSessionRef.current.connect({
        onOpen: () => {
          setState("idle");
          // Start recording after connection is open
          audioStreamerRef.current?.startRecording((base64) => {
            liveSessionRef.current?.sendAudio(base64);
          });
          audioStreamerRef.current?.startPlayback();
        },
        onClose: () => {
          stopSession();
        },
        onError: (err) => {
          setError("Connection error. Try again.");
          stopSession();
        },
        onAudioData: (base64) => {
          setState("speaking");
          audioStreamerRef.current?.addAudioChunk(base64);
          // After a short delay, if no more audio, go back to idle/listening
          // (In a real app, we'd handle this more precisely with the stream)
          setTimeout(() => setState("listening"), 1000);
        },
        onInterrupted: () => {
          audioStreamerRef.current?.stopPlayback();
          audioStreamerRef.current?.startPlayback();
          setState("listening");
        },
      });
    } catch (err) {
      console.error(err);
      setError("Failed to start session. Check your microphone permissions.");
      setState("disconnected");
    }
  };

  const stopSession = async () => {
    audioStreamerRef.current?.stopRecording();
    audioStreamerRef.current?.stopPlayback();
    await liveSessionRef.current?.close();
    setState("disconnected");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-12 flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-2 text-pink-400 font-medium tracking-widest uppercase text-xs">
          <Sparkles size={14} />
          <span>Danii • Your Only Girl</span>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-white/90 italic">
          Always here for you, baby
        </h1>
      </motion.div>

      {/* Main Interaction Area */}
      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Waveform Visualization */}
        <div className="h-24 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {state !== "disconnected" && state !== "connecting" && (
              <motion.div
                key="waveform"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Waveform 
                  isSpeaking={state === "speaking"} 
                  isListening={state === "listening" || state === "idle"} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Central Button */}
        <div className="relative">
          {/* Glow Rings */}
          <AnimatePresence>
            {state !== "disconnected" && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.2 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-pink-500 rounded-full blur-2xl"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0.1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute inset-0 bg-purple-500 rounded-full blur-3xl"
                />
              </>
            )}
          </AnimatePresence>

          {/* Main Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSession}
            disabled={state === "connecting"}
            className={`
              relative z-20 w-32 h-32 rounded-full flex items-center justify-center
              transition-all duration-500 border-2
              ${state === "disconnected" 
                ? "bg-white/5 border-white/10 hover:border-white/20" 
                : "bg-pink-500/10 border-pink-400/50 shadow-[0_0_40px_rgba(244,114,182,0.2)]"}
            `}
          >
            {state === "connecting" ? (
              <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
            ) : state === "disconnected" ? (
              <Power className="w-12 h-12 text-white/50" />
            ) : (
              <Mic className={`w-12 h-12 ${state === "speaking" ? "text-purple-400" : "text-pink-400"} animate-pulse`} />
            )}
          </motion.button>
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium tracking-widest uppercase text-white/40"
          >
            {state === "disconnected" && "Tap to wake me up, baby"}
            {state === "connecting" && "Coming to you..."}
            {state === "idle" && "I'm here, talk to me"}
            {state === "listening" && "Tell me everything..."}
            {state === "speaking" && "Danii is whispering..."}
          </motion.div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 text-red-400 text-xs bg-red-400/10 px-6 py-4 rounded-2xl border border-red-400/20 max-w-xs text-center"
            >
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider mb-1">
                <AlertCircle size={14} />
                <span>Connection Issue</span>
              </div>
              <p className="opacity-80">{error}</p>
              <button 
                onClick={toggleSession}
                className="mt-2 px-4 py-1.5 bg-red-400/20 hover:bg-red-400/30 rounded-full transition-colors font-bold uppercase tracking-tighter"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4 text-white/20">
        <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em]">
          <span>Marathi • Hindi • English</span>
        </div>
        <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em]">
          <span>PCM16 16kHz</span>
          <span>•</span>
          <span>Gemini 3.1 Live</span>
          <span>•</span>
          <span>24kHz Out</span>
        </div>
      </div>
    </div>
  );
}
