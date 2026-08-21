import { motion } from "motion/react";

interface WaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export default function Waveform({ isSpeaking, isListening }: WaveformProps) {
  const bars = Array.from({ length: 12 });

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-cyan-400 rounded-full"
          animate={{
            height: isSpeaking || isListening ? [10, 40, 15, 60, 20, 40, 10] : 8,
            opacity: isSpeaking || isListening ? [0.4, 1, 0.4] : 0.2,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
