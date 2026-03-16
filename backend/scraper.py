"""
MapScrape — Selenium-based Google Maps review scraper.

Refactored from Abdullah's original script into a reusable class
with callback support for real-time progress streaming.
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
import time
import re
import random
import logging
from typing import Optional, Callable

logger = logging.getLogger(__name__)


def parse_rating(aria_label: str) -> int:
    """Parse star rating from aria-label (Arabic or English)."""
    if not aria_label:
        return 0

    arabic_map = {
        "واحدة": 1, "نجمة واحدة": 1,
        "نجمتان": 2, "نجمتين": 2,
        "ثلاث": 3, "ثلاث نجوم": 3,
        "أربع": 4, "أربع نجوم": 4,
        "خمس": 5, "خمس نجوم": 5,
    }

    for key, val in arabic_map.items():
        if key in aria_label:
            return val

    nums = re.findall(r"\d", aria_label)
    if nums:
        return int(nums[0])

    return 0


class GoogleMapsScraper:
    """Scrapes Google Maps reviews with real-time progress callbacks."""

    # CSS selectors (centralized for easy maintenance)
    SELECTORS = {
        "review_tab": [
            "button[jsaction*='reviewChart']",
            "button[aria-label*='Reviews']",
            "button[aria-label*='تقييم']",
            "div.F7nice",
            "span.F7nice",
            "div[role='tab'][aria-label*='Reviews']",
            "div[role='tab'][aria-label*='تقييمات']",
        ],
        "scrollable": [
            "div.m6QErb.DxyBCb.kA9KIf.dS8AEf",
            "div.m6QErb.DxyBCb",
            "div.m6QErb",
        ],
        "review_elements": "div.jftiEf, div[data-review-id]",
        "review_text": ["span.wiI7pd", "div.MyEned span", "span.review-full-text"],
        "review_rating": ["span.kvMYJc", "span[role='img']"],
        "review_author": ["div.d4r55", "span.d4r55", "div.WNxzHc a"],
        "review_date": ["span.rsqaWe", "span.xRkPPb"],
        "expand_buttons": "button.w8nwRe.kyuRq, button.M77dve",
        "consent": "button[aria-label*='Accept'], form[action*='consent'] button",
    }

    def __init__(self, headless: bool = True, chrome_binary: Optional[str] = None):
        self.headless = headless
        self.chrome_binary = chrome_binary
        self.driver = None
        self.should_stop = False

    def _create_driver(self):
        """Create a Chrome/Chromium WebDriver instance."""
        import os

        options = webdriver.ChromeOptions()

        # Use Chromium binary from env (Docker) or custom path or default
        binary = self.chrome_binary or os.environ.get("CHROME_BIN")
        if binary:
            options.binary_location = binary

        if self.headless:
            # Use --headless (old style) for broader Chromium compatibility
            options.add_argument("--headless")

        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--remote-debugging-port=9222")
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        # Use chromedriver path from env if available (Docker)
        chromedriver_path = os.environ.get("CHROMEDRIVER_PATH")

        logger.info(f"Chrome binary: {binary or 'default'}")
        logger.info(f"ChromeDriver path: {chromedriver_path or 'default'}")

        try:
            if chromedriver_path:
                service = Service(executable_path=chromedriver_path)
                self.driver = webdriver.Chrome(service=service, options=options)
            else:
                self.driver = webdriver.Chrome(options=options)
            logger.info("Browser started successfully")
        except Exception as e:
            logger.error(f"Failed to start browser: {e}")
            raise

        return self.driver

    def quit(self):
        """Safely close the browser."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    @staticmethod
    def search_place_url(place_name: str) -> Optional[str]:
        """
        Resolve a place name to a Google Maps URL.
        Uses Google Maps search URL format.
        """
        from urllib.parse import quote
        search_url = f"https://www.google.com/maps/search/{quote(place_name)}"
        return search_url

    def scrape(
        self,
        url: str,
        max_scrolls: int = 100,
        target_stars: int = 0,
        max_reviews: int = 500,
        callback: Optional[Callable] = None,
    ) -> list:
        """
        Scrape reviews from a Google Maps place URL.

        Args:
            url:           Google Maps place URL
            max_scrolls:   Maximum scroll iterations
            target_stars:  Filter by star rating (0 = all)
            max_reviews:   Stop after this many matching reviews
            callback:      fn(message, progress_pct, review_dict|None)

        Returns:
            List of review dicts: {text, rating, author, date}
        """
        reviews = []
        seen_texts = set()  # Deduplicate reviews by text

        def emit(msg, pct, review=None):
            if callback:
                try:
                    callback(msg, pct, review)
                except Exception:
                    pass

        try:
            self._create_driver()
            emit("Opening page...", 0.05)

            self.driver.get(url)
            time.sleep(4 + random.random() * 2)

            # Handle consent popup
            self._dismiss_consent()

            emit("Looking for reviews tab...", 0.08)

            # Click reviews tab
            self._click_reviews_tab()
            time.sleep(3)

            emit("Finding review container...", 0.10)

            # Find scrollable container
            scrollable = self._find_scrollable()
            if not scrollable:
                emit("Could not find review container", 0.10)
                return reviews

            # ── Phase 1: Scroll to load reviews ──
            emit("Scrolling to load reviews...", 0.12)

            last_count = 0
            stale = 0

            for i in range(max_scrolls):
                if self.should_stop:
                    emit("Stopped by user", 0.12 + (i / max_scrolls) * 0.48)
                    break

                self.driver.execute_script(
                    "arguments[0].scrollTop = arguments[0].scrollHeight", scrollable
                )
                time.sleep(1.2 + random.random() * 0.8)

                current_els = self.driver.find_elements(
                    By.CSS_SELECTOR, "div.jftiEf"
                )
                current_count = len(current_els)
                progress = 0.12 + (i / max_scrolls) * 0.48  # 12% → 60%

                emit(
                    f"Scroll {i + 1}/{max_scrolls} — {current_count} reviews loaded",
                    progress,
                )

                if current_count == last_count:
                    stale += 1
                    if stale > 6:
                        emit(f"All {current_count} reviews loaded.", progress)
                        break
                else:
                    stale = 0
                last_count = current_count

            # ── Phase 2: Expand all "More" buttons ──
            emit("Expanding review text...", 0.62)
            self._expand_reviews()
            time.sleep(0.5)

            # ── Phase 3: Extract + stream each review live ──
            emit("Extracting reviews...", 0.65)

            elements = self.driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
            total_elements = len(elements)

            for idx, elem in enumerate(elements):
                if self.should_stop:
                    break
                if len(reviews) >= max_reviews:
                    break

                review = self._extract_review(elem)
                if not review:
                    continue

                # Filter by star rating
                if target_stars > 0 and review["rating"] != target_stars:
                    continue

                # Deduplicate by text content
                text_key = review["text"][:100].strip()
                if text_key in seen_texts:
                    continue
                seen_texts.add(text_key)

                reviews.append(review)

                # Progress: 65% → 98%
                progress = 0.65 + (idx / max(total_elements, 1)) * 0.33
                emit(
                    f"Extracted {len(reviews)} reviews...",
                    min(progress, 0.98),
                    review,  # This sends the review to the frontend immediately
                )

            emit(f"Done! {len(reviews)} reviews extracted.", 1.0)

        except Exception as e:
            logger.error(f"Scraping error: {e}")
            emit(f"Error: {str(e)}", 0.0)
            raise

        finally:
            self.quit()

        return reviews

    def _dismiss_consent(self):
        """Dismiss Google consent popup if present."""
        try:
            consent = self.driver.find_element(
                By.CSS_SELECTOR, self.SELECTORS["consent"]
            )
            consent.click()
            time.sleep(2)
        except Exception:
            pass

    def _click_reviews_tab(self):
        """Click the reviews tab."""
        for sel in self.SELECTORS["review_tab"]:
            try:
                elem = WebDriverWait(self.driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, sel))
                )
                elem.click()
                logger.info(f"Clicked reviews tab: {sel}")
                return
            except Exception:
                continue
        logger.warning("Could not find reviews tab")

    def _find_scrollable(self):
        """Find the scrollable reviews container."""
        for sel in self.SELECTORS["scrollable"]:
            try:
                return self.driver.find_element(By.CSS_SELECTOR, sel)
            except Exception:
                continue
        return None

    def _expand_reviews(self):
        """Click all 'More' buttons to expand truncated reviews."""
        buttons = self.driver.find_elements(
            By.CSS_SELECTOR, self.SELECTORS["expand_buttons"]
        )
        for btn in buttons:
            try:
                self.driver.execute_script("arguments[0].click();", btn)
                time.sleep(0.1)
            except Exception:
                pass

    def _extract_review(self, elem) -> Optional[dict]:
        """Extract a single review's data from a DOM element."""
        try:
            # Text
            text = ""
            for sel in self.SELECTORS["review_text"]:
                found = elem.find_elements(By.CSS_SELECTOR, sel)
                if found:
                    text = found[0].text.strip()
                    break

            if not text:
                return None

            # Rating
            rating = 0
            for sel in self.SELECTORS["review_rating"]:
                found = elem.find_elements(By.CSS_SELECTOR, sel)
                if found:
                    aria = found[0].get_attribute("aria-label") or ""
                    rating = parse_rating(aria)
                    break

            # Author
            author = ""
            for sel in self.SELECTORS["review_author"]:
                found = elem.find_elements(By.CSS_SELECTOR, sel)
                if found:
                    author = found[0].text.strip()
                    break

            # Date
            date = ""
            for sel in self.SELECTORS["review_date"]:
                found = elem.find_elements(By.CSS_SELECTOR, sel)
                if found:
                    date = found[0].text.strip()
                    break

            return {
                "text": text,
                "rating": rating,
                "author": author,
                "date": date,
            }

        except Exception:
            return None
