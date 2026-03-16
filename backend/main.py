"""
MapScrape Backend — FastAPI + WebSocket real-time scraping
Supports single URL and batch (multiple URLs) scraping.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import asyncio
import uuid
import json
import csv
import tempfile
import random

from scraper import GoogleMapsScraper

app = FastAPI(
    title="MapScrape API",
    description="Google Maps review scraper with real-time WebSocket streaming",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict = {}


# ── Models ──────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    url: Optional[str] = None
    urls: Optional[List[str]] = None
    place_name: Optional[str] = None
    target_stars: int = Field(0, ge=0, le=5)
    max_reviews: int = Field(500, ge=10, le=10000)
    max_scrolls: int = Field(100, ge=10, le=500)


class ScrapeJob(BaseModel):
    job_id: str
    status: str
    reviews: list = []
    total_found: int = 0
    progress: float = 0.0
    message: str = ""


# ── REST Endpoints ──────────────────────────────────────

@app.get("/")
async def root():
    return {"name": "MapScrape API", "version": "1.1.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    return jobs[job_id]

@app.get("/api/export/{job_id}")
async def export_reviews(job_id: str, format: str = "csv"):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    if not job.reviews:
        raise HTTPException(400, "No reviews to export")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}")
    if format == "csv":
        with open(tmp.name, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["text", "rating", "author", "date"])
            writer.writeheader()
            writer.writerows(job.reviews)
        media = "text/csv"
    elif format == "json":
        with open(tmp.name, "w", encoding="utf-8") as f:
            json.dump(job.reviews, f, ensure_ascii=False, indent=2)
        media = "application/json"
    elif format == "jsonl":
        with open(tmp.name, "w", encoding="utf-8") as f:
            for item in job.reviews:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        media = "application/jsonl"
    else:
        raise HTTPException(400, f"Unsupported format: {format}")
    return FileResponse(tmp.name, media_type=media, filename=f"mapscrape_{job_id}.{format}")


# ── WebSocket: Real-time scraping (single + batch) ──────

@app.websocket("/ws/scrape")
async def websocket_scrape(ws: WebSocket):
    await ws.accept()
    scraper = None
    message_queue = asyncio.Queue()
    should_stop = False

    try:
        data = await ws.receive_json()
        if data.get("action") != "start":
            await ws.send_json({"type": "error", "message": "Send 'start' action first"})
            return

        # Build URL list
        urls = data.get("urls", [])
        single_url = data.get("url", "").strip()
        place_name = data.get("place_name", "").strip()

        if single_url and not urls:
            urls = [single_url]
        if place_name and not urls:
            urls = [GoogleMapsScraper.search_place_url(place_name)]

        urls = [u.strip() for u in urls if u.strip()]
        if not urls:
            await ws.send_json({"type": "error", "message": "No URLs provided"})
            return

        target_stars = data.get("target_stars", 0)
        max_reviews = data.get("max_reviews", 500)
        max_scrolls = data.get("max_scrolls", 100)

        job_id = str(uuid.uuid4())[:8]
        jobs[job_id] = ScrapeJob(job_id=job_id, status="running")
        await ws.send_json({"type": "job_created", "job_id": job_id})

        total_places = len(urls)
        print(f"Batch scrape: {total_places} place(s)")

        def on_progress(msg, pct, review=None):
            message_queue.put_nowait({"type": "status", "message": msg, "progress": pct, "review": review})

        async def run_batch():
            nonlocal scraper, should_stop
            try:
                for idx, url in enumerate(urls):
                    if should_stop:
                        break

                    message_queue.put_nowait({
                        "type": "place_start",
                        "place_index": idx,
                        "total_places": total_places,
                        "url": url[:100],
                    })

                    place_base = idx / total_places
                    place_range = 1.0 / total_places

                    def make_cb(base, rng, i, total):
                        def cb(msg, pct, review=None):
                            on_progress(f"[{i+1}/{total}] {msg}", base + (pct * rng), review)
                        return cb

                    scraper = GoogleMapsScraper(headless=True)
                    try:
                        await asyncio.to_thread(
                            scraper.scrape,
                            url=url,
                            max_scrolls=max_scrolls,
                            target_stars=target_stars,
                            max_reviews=max_reviews,
                            callback=make_cb(place_base, place_range, idx, total_places),
                        )
                    except Exception as e:
                        on_progress(f"[{idx+1}/{total_places}] Error: {e}", place_base + place_range)
                    finally:
                        if scraper:
                            scraper.quit()
                            scraper = None

                    message_queue.put_nowait({"type": "place_done", "place_index": idx})

                    if idx < total_places - 1 and not should_stop:
                        delay = random.randint(5, 10)
                        on_progress(f"Waiting {delay}s before next place...", (idx + 1) / total_places)
                        await asyncio.sleep(delay)

                message_queue.put_nowait({"type": "_done"})
            except Exception as e:
                message_queue.put_nowait({"type": "_error", "message": str(e)})

        scraper_task = asyncio.create_task(run_batch())

        async def listen_for_stop():
            nonlocal should_stop
            try:
                while True:
                    msg = await ws.receive_json()
                    if msg.get("action") == "stop":
                        should_stop = True
                        if scraper:
                            scraper.should_stop = True
                        return
            except Exception:
                pass

        stop_task = asyncio.create_task(listen_for_stop())

        # Stream queue → WebSocket
        while True:
            try:
                msg = await asyncio.wait_for(message_queue.get(), timeout=0.1)
            except asyncio.TimeoutError:
                if scraper_task.done():
                    while not message_queue.empty():
                        m = message_queue.get_nowait()
                        if m.get("review"):
                            await ws.send_json({"type": "review", "data": m["review"]})
                            jobs[job_id].reviews.append(m["review"])
                    jobs[job_id].status = "completed"
                    await ws.send_json({"type": "complete", "job_id": job_id, "total": len(jobs[job_id].reviews)})
                    break
                continue

            if msg["type"] == "_done":
                while not message_queue.empty():
                    r = message_queue.get_nowait()
                    if r.get("review"):
                        await ws.send_json({"type": "review", "data": r["review"]})
                        jobs[job_id].reviews.append(r["review"])
                jobs[job_id].status = "completed"
                await ws.send_json({"type": "complete", "job_id": job_id, "total": len(jobs[job_id].reviews)})
                break
            elif msg["type"] == "_error":
                jobs[job_id].status = "failed"
                await ws.send_json({"type": "error", "message": msg.get("message", "Unknown error")})
                break
            elif msg["type"] in ("place_start", "place_done"):
                await ws.send_json(msg)
            else:
                await ws.send_json({"type": "status", "message": msg.get("message", ""), "progress": msg.get("progress", 0)})
                if msg.get("review"):
                    await ws.send_json({"type": "review", "data": msg["review"]})
                    jobs[job_id].reviews.append(msg["review"])

        stop_task.cancel()
        await scraper_task

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        if scraper:
            scraper.quit()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
