import { useState, useRef, useCallback } from "react";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/scrape`;

export function useScraper() {
  const [status, setStatus] = useState("idle"); // idle | connecting | running | completed | error | stopped
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const start = useCallback(
    ({ url, placeName, targetStars, maxReviews, maxScrolls }) => {
      setStatus("connecting");
      setProgress(0);
      setMessage("Connecting...");
      setReviews([]);
      setError(null);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("running");
        setMessage("Connected, starting scrape...");
        ws.send(
          JSON.stringify({
            action: "start",
            url: url || "",
            place_name: placeName || "",
            target_stars: targetStars,
            max_reviews: maxReviews,
            max_scrolls: maxScrolls,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "job_created":
            setJobId(data.job_id);
            break;

          case "status":
            setMessage(data.message);
            setProgress(data.progress || 0);
            break;

          case "review":
            setReviews((prev) => [...prev, data.data]);
            break;

          case "complete":
            setStatus("completed");
            setProgress(1);
            setMessage(`Done! ${data.total} reviews extracted.`);
            ws.close();
            break;

          case "stopped":
            setStatus("stopped");
            setMessage("Scraping stopped.");
            ws.close();
            break;

          case "error":
            setStatus("error");
            setError(data.message);
            setMessage(`Error: ${data.message}`);
            ws.close();
            break;
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError("WebSocket connection failed");
        setMessage("Connection failed. Is the backend running?");
      };

      ws.onclose = () => {
        if (status === "running") {
          setStatus("error");
          setMessage("Connection lost.");
        }
      };
    },
    [status]
  );

  const stop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setReviews([]);
    setJobId(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    message,
    reviews,
    jobId,
    error,
    start,
    stop,
    reset,
  };
}
