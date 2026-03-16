import React from "react";
import {
  Zap,
  Filter,
  Download,
  Globe,
  Github,
  ListChecks,
  Eye,
} from "lucide-react";

const featureIcons = [Eye, Filter, Download, Globe, Github, ListChecks];

export function LandingPage({ t, onGetStarted }) {
  const features = [
    { title: t.realtime, desc: t.realtimeDesc },
    { title: t.smartFilter, desc: t.smartFilterDesc },
    { title: t.multiExport, desc: t.multiExportDesc },
    { title: t.bilingualUI, desc: t.bilingualDesc },
    { title: t.openSource, desc: t.openSourceDesc },
    { title: t.batchQueue, desc: t.batchQueueDesc },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Hero */}
      <div className="text-center pt-24 pb-16 animate-fade-in-up">
        <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-mono text-accent-cyan font-medium mb-7 tracking-wide">
          v1.0 — Open Source
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 bg-gradient-to-br from-white via-cyan-300 to-purple-400 bg-clip-text text-transparent">
          {t.tagline}
        </h1>

        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
          {t.subtitle}
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={onGetStarted}
            className="px-9 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-base font-bold shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:shadow-[0_0_60px_rgba(34,211,238,0.3)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t.getStarted}
          </button>
          <button className="px-9 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-gray-300 text-base font-semibold font-mono flex items-center gap-2 hover:border-white/20 hover:bg-white/[0.05] transition-all">
            <Github size={18} />
            {t.githubStar}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex justify-center gap-16 py-10 border-t border-b border-white/[0.04] my-6 mb-20 animate-fade-in-up"
        style={{ animationDelay: "0.15s" }}
      >
        {t.stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-black font-mono bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
              {s.value}
            </div>
            <div className="text-sm text-gray-500 mt-1 font-medium">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0.3s" }}
      >
        <h2 className="text-center text-3xl font-extrabold mb-12 tracking-tight">
          {t.features}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
          {features.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <div
                key={i}
                className="p-7 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] hover:-translate-y-1 transition-all duration-300 cursor-default group"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-cyan-500/10 transition-colors">
                  <Icon size={20} className="text-gray-400 group-hover:text-accent-cyan transition-colors" />
                </div>
                <div className="text-base font-bold text-gray-100 mb-2">
                  {f.title}
                </div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
