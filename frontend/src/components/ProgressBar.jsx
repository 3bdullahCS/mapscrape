import React from "react";

export function ProgressBar({ progress, message, reviewCount, isRunning, t }) {
  const pct = Math.round(progress * 100);
  const isComplete = pct >= 100;

  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] bg-surface-elevated">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-mono text-gray-500 truncate max-w-[70%]">
          {message}
        </span>
        <span
          className={`text-xs font-mono font-semibold ${
            isComplete ? "text-accent-green" : "text-accent-cyan"
          }`}
        >
          {pct}%
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isComplete
              ? "bg-gradient-to-r from-emerald-500 to-accent-green"
              : "bg-gradient-to-r from-accent-cyan to-accent-purple"
          } ${isRunning ? "animate-pulse-glow" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2.5 text-sm text-gray-400">
        <span className="font-semibold text-gray-200">{reviewCount}</span>{" "}
        {t.reviews}
      </div>
    </div>
  );
}
