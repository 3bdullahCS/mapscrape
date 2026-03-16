import React, { useState } from "react";
import { MapPin, Github } from "lucide-react";
import { translations } from "./i18n";
import { LandingPage } from "./components/LandingPage";
import { ScrapePanel } from "./components/ScrapePanel";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", color: "#E5E7EB", fontFamily: "monospace" }}>
          <h2 style={{ color: "#EF4444", marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ color: "#9CA3AF", marginBottom: 20 }}>{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: "10px 24px", borderRadius: 8, background: "#22D3EE", color: "#000", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("landing");
  const t = translations[lang];
  const isRtl = lang === "ar";

  return (
    <ErrorBoundary>
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`min-h-screen bg-surface text-gray-200 relative overflow-hidden ${
        isRtl ? "font-arabic" : "font-display"
      }`}
    >
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -left-12 w-[400px] h-[400px] rounded-full bg-cyan-500 opacity-[0.06] blur-[160px]"
          style={{ animation: "orb-float 8s ease-in-out infinite alternate" }}
        />
        <div
          className="absolute top-52 right-0 w-[350px] h-[350px] rounded-full bg-purple-500 opacity-[0.05] blur-[140px]"
          style={{
            animation: "orb-float 8s ease-in-out 2s infinite alternate",
          }}
        />
        <div
          className="absolute bottom-20 left-1/3 w-[300px] h-[300px] rounded-full bg-emerald-500 opacity-[0.04] blur-[120px]"
          style={{
            animation: "orb-float 8s ease-in-out 4s infinite alternate",
          }}
        />
      </div>

      {/* Grain overlay */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20256%20256%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22n%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.9%22%20numOctaves=%224%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-white/[0.04] backdrop-blur-xl bg-surface/80 sticky top-0 z-50">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <MapPin size={18} className="text-white" />
            </div>
            <span className="font-mono font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              MapScrape
            </span>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-1.5">
            {["landing", "app"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-white/[0.07] text-accent-cyan"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                }`}
              >
                {tab === "landing" ? t.home : t.app}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener"
              className="w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              <Github size={16} />
            </a>
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-300 text-xs font-mono font-semibold hover:border-white/20 hover:bg-white/[0.05] transition-all"
            >
              {lang === "en" ? "عربي" : "EN"}
            </button>
          </div>
        </nav>

        {/* Page content */}
        {activeTab === "landing" ? (
          <LandingPage t={t} onGetStarted={() => setActiveTab("app")} />
        ) : (
          <ScrapePanel t={t} isRtl={isRtl} />
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-white/[0.03] text-gray-600 text-xs font-mono">
          MapScrape — {t.footer}
        </footer>
      </div>
    </div>
    </ErrorBoundary>
  );
}
