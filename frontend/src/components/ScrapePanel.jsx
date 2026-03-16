import React, { useState, useRef, useCallback } from "react";
import { Search, Link, Star, Download, Loader2, List } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import { ProgressBar } from "./ProgressBar";

export function ScrapePanel({ t, isRtl }) {
  const [inputMode, setInputMode] = useState("url"); // search | url | batch
  const [searchQuery, setSearchQuery] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [selectedStars, setSelectedStars] = useState(0);
  const [maxReviews, setMaxReviews] = useState(500);
  const [exportFormat, setExportFormat] = useState("csv");

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [currentPlace, setCurrentPlace] = useState(null); // {index, total, url}
  const wsRef = useRef(null);

  const isRunning = status === "running" || status === "connecting";

  const handleStart = useCallback(() => {
    let urls = [];

    if (inputMode === "batch") {
      urls = batchUrls
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      if (urls.length === 0) {
        setMessage("Please paste at least one URL");
        return;
      }
    } else if (inputMode === "url") {
      const url = urlInput.trim();
      if (!url) {
        setMessage("Please paste a Google Maps URL");
        return;
      }
      urls = [url];
    } else {
      const name = searchQuery.trim();
      if (!name) {
        setMessage("Please enter a place name");
        return;
      }
    }

    setStatus("connecting");
    setProgress(0);
    setMessage("Connecting to scraper...");
    setReviews([]);
    setJobId(null);
    setCurrentPlace(null);

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.hostname;
    const wsUrl = `${wsProtocol}://${wsHost}:8000/ws/scrape`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("running");
      const payload = {
        action: "start",
        target_stars: selectedStars,
        max_reviews: maxReviews,
        max_scrolls: Math.min(Math.ceil(maxReviews / 5), 300),
      };

      if (inputMode === "batch") {
        payload.urls = urls;
        setMessage(`Starting batch scrape: ${urls.length} places...`);
      } else if (inputMode === "url") {
        payload.url = urls[0];
        setMessage("Connected! Starting scrape...");
      } else {
        payload.place_name = searchQuery.trim();
        setMessage("Searching for place...");
      }

      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "job_created":
            setJobId(data.job_id);
            break;

          case "place_start":
            setCurrentPlace({
              index: data.place_index,
              total: data.total_places,
              url: data.url,
            });
            break;

          case "place_done":
            break;

          case "status":
            setMessage(data.message || "");
            if (data.progress != null) setProgress(data.progress);
            break;

          case "review":
            if (data.data) {
              setReviews((prev) => [...prev, data.data]);
            }
            break;

          case "complete":
            setStatus("completed");
            setProgress(1);
            setMessage(`Done! ${data.total || 0} reviews extracted.`);
            setCurrentPlace(null);
            ws.close();
            break;

          case "stopped":
            setStatus("stopped");
            setMessage("Scraping stopped.");
            setCurrentPlace(null);
            ws.close();
            break;

          case "error":
            setStatus("error");
            setMessage(`Error: ${data.message || "Unknown error"}`);
            setCurrentPlace(null);
            ws.close();
            break;

          default:
            break;
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setMessage("Connection failed. Is the backend running on port 8000?");
    };

    ws.onclose = () => {
      setStatus((prev) => {
        if (prev === "running" || prev === "connecting") {
          setMessage("Connection lost.");
          return "error";
        }
        return prev;
      });
    };
  }, [inputMode, urlInput, batchUrls, searchQuery, selectedStars, maxReviews]);

  const handleStop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
    }
    setStatus("stopped");
    setMessage("Stopped.");
  }, []);

  const handleDownload = useCallback(() => {
    if (reviews.length === 0) return;

    let content, mimeType, extension;

    if (exportFormat === "csv") {
      const header = "text,rating,author,date";
      const rows = reviews.map(
        (r) =>
          `"${(r.text || "").replace(/"/g, '""')}",${r.rating || 0},"${(r.author || "").replace(/"/g, '""')}","${(r.date || "").replace(/"/g, '""')}"`
      );
      content = "\uFEFF" + [header, ...rows].join("\n");
      mimeType = "text/csv;charset=utf-8";
      extension = "csv";
    } else if (exportFormat === "json") {
      content = JSON.stringify(reviews, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else if (exportFormat === "jsonl") {
      content = reviews.map((r) => JSON.stringify(r)).join("\n");
      mimeType = "application/jsonl";
      extension = "jsonl";
    } else {
      const header = "text,rating,author,date";
      const rows = reviews.map(
        (r) =>
          `"${(r.text || "").replace(/"/g, '""')}",${r.rating || 0},"${(r.author || "").replace(/"/g, '""')}","${(r.date || "").replace(/"/g, '""')}"`
      );
      content = "\uFEFF" + [header, ...rows].join("\n");
      mimeType = "text/csv;charset=utf-8";
      extension = "csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mapscrape_${reviews.length}_reviews.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [reviews, exportFormat]);

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setReviews([]);
    setJobId(null);
    setCurrentPlace(null);
  };

  const batchUrlCount = batchUrls.split("\n").filter((u) => u.trim()).length;
  const starOptions = [0, 1, 2, 3, 4, 5];
  const exportFormats = ["csv", "json", "jsonl", "xlsx"];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-7 animate-fade-in-up">
      {/* Left: Controls */}
      <div className="flex flex-col gap-5">
        {/* Input mode */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-surface-elevated">
          <label className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t.inputMode}
          </label>
          <div className="flex gap-2 mb-5">
            {[
              { key: "search", label: t.searchPlace, icon: Search },
              { key: "url", label: t.pasteUrl, icon: Link },
              { key: "batch", label: isRtl ? "دفعة" : "Batch", icon: List },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setInputMode(key)}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  inputMode === key
                    ? "border border-cyan-500/30 bg-cyan-500/[0.07] text-accent-cyan"
                    : "border border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]"
                } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {inputMode === "search" && (
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              disabled={isRunning}
              className="w-full px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-gray-200 text-sm font-display placeholder:text-gray-600 outline-none focus:border-cyan-500/30 transition-colors disabled:opacity-50"
            />
          )}

          {inputMode === "url" && (
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t.urlPlaceholder}
              disabled={isRunning}
              dir="ltr"
              className="w-full px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-gray-200 text-sm font-mono placeholder:text-gray-600 outline-none focus:border-cyan-500/30 transition-colors disabled:opacity-50"
            />
          )}

          {inputMode === "batch" && (
            <div>
              <textarea
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder={isRtl
                  ? "الصق روابط خرائط قوقل (رابط واحد في كل سطر)..."
                  : "Paste Google Maps URLs (one per line)...\nhttps://www.google.com/maps/place/...\nhttps://www.google.com/maps/place/..."
                }
                disabled={isRunning}
                dir="ltr"
                rows={6}
                className="w-full px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-gray-200 text-sm font-mono placeholder:text-gray-600 outline-none focus:border-cyan-500/30 transition-colors disabled:opacity-50 resize-none"
              />
              {batchUrlCount > 0 && (
                <div className="mt-2 text-xs font-mono text-gray-500">
                  {batchUrlCount} {isRtl ? "رابط" : batchUrlCount === 1 ? "URL" : "URLs"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-surface-elevated">
          <label className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t.filterStars}
          </label>
          <div className="flex gap-1.5 mb-6">
            {starOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStars(s)}
                disabled={isRunning}
                className={`px-3.5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all ${
                  selectedStars === s
                    ? "border border-amber-500/30 bg-amber-500/[0.08] text-accent-amber"
                    : "border border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]"
                } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {s === 0 ? t.allStars : <>{s}<Star size={12} className="fill-amber-500 text-amber-500" /></>}
              </button>
            ))}
          </div>

          <label className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t.maxReviews}: <span className="text-accent-cyan">{maxReviews}</span>
            {inputMode === "batch" && (
              <span className="text-gray-600 normal-case"> ({isRtl ? "لكل مكان" : "per place"})</span>
            )}
          </label>
          <input
            type="range"
            min={50} max={5000} step={50}
            value={maxReviews}
            onChange={(e) => setMaxReviews(Number(e.target.value))}
            disabled={isRunning}
            className="w-full h-1.5 rounded-full appearance-none bg-gray-800 mb-6 cursor-pointer accent-cyan-500"
          />

          <label className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t.exportFormat}
          </label>
          <div className="flex gap-1.5">
            {exportFormats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-4 py-2.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wide transition-all ${
                  exportFormat === fmt
                    ? "border border-purple-500/30 bg-purple-500/[0.08] text-accent-purple"
                    : "border border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]"
                }`}
              >
                .{fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`flex-1 py-4 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${
              isRunning
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                : "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.15)]"
            }`}
          >
            {status === "connecting" && <Loader2 size={18} className="animate-spin" />}
            {isRunning ? t.stopScraping : t.startScraping}
          </button>

          {reviews.length > 0 && !isRunning && (
            <button
              onClick={handleDownload}
              className="px-6 py-4 rounded-xl border border-green-500/30 bg-green-500/[0.08] text-accent-green font-bold flex items-center gap-2 hover:bg-green-500/[0.12] transition-all"
            >
              <Download size={18} />
              .{exportFormat}
            </button>
          )}

          {(status === "completed" || status === "error" || status === "stopped") && (
            <button
              onClick={handleReset}
              className="px-6 py-4 rounded-xl border border-white/[0.1] bg-white/[0.03] text-gray-400 font-semibold hover:bg-white/[0.06] transition-all"
            >
              Reset
            </button>
          )}
        </div>

        {/* Progress */}
        {(isRunning || progress > 0) && (
          <ProgressBar
            progress={progress}
            message={message}
            reviewCount={reviews.length}
            isRunning={isRunning}
            t={t}
          />
        )}

        {/* Current place indicator (batch mode) */}
        {currentPlace && (
          <div className="px-4 py-3 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.03] text-sm">
            <span className="text-accent-cyan font-mono font-semibold">
              {isRtl ? `المكان ${currentPlace.index + 1}/${currentPlace.total}` : `Place ${currentPlace.index + 1}/${currentPlace.total}`}
            </span>
            <span className="text-gray-500 font-mono text-xs block mt-1 truncate" dir="ltr">
              {currentPlace.url}
            </span>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] text-red-400 text-sm">
            {message}
          </div>
        )}
      </div>

      {/* Right: Live Preview */}
      <div className="p-6 rounded-2xl border border-white/[0.06] bg-surface-elevated max-h-[calc(100vh-140px)] overflow-y-auto lg:sticky lg:top-24">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-100">{t.livePreview}</h3>
          {reviews.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-accent-cyan text-xs font-mono font-semibold">
              {reviews.length} {t.reviews}
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-5xl mb-4">📍</div>
            <p className="text-sm leading-relaxed">{t.noReviews}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((rev, i) => (
              <ReviewCard key={i} review={rev} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
