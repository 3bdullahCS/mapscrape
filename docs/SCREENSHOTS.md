# 📸 How to Capture Screenshots for the README

These screenshots make your repo look professional. Takes ~5 minutes.

## Setup

1. Run the app: `docker-compose up --build`
2. Open http://localhost:3000
3. Use a clean browser window (no bookmarks bar, no extensions)
4. Set browser window to **1440 x 900** pixels

## Screenshots to Capture

### 1. Landing Page (`docs/screenshots/landing.png`)
- Go to the Home tab
- Capture the full hero section with the tagline and buttons
- Make sure the gradient text and background orbs are visible

### 2. App Interface (`docs/screenshots/app.png`)
- Switch to the App tab
- Type "البيك الرياض" in the search field
- Select 5-star filter
- Click Start Scraping (let the demo reviews load)
- Capture when reviews are streaming in with the progress bar visible

### 3. Arabic Mode (`docs/screenshots/arabic.png`)
- Click the "عربي" button to switch to Arabic
- Stay on the App tab
- Capture the full RTL interface

### 4. Demo GIF (`docs/demo.gif`) — Optional but powerful
- Use a screen recorder (OBS, Kap for Mac, or ScreenToGif for Windows)
- Record a 15-20 second flow:
  1. Paste a URL
  2. Select star filter
  3. Click Start
  4. Show reviews appearing
  5. Click Download
- Convert to GIF, keep it under 5MB
- Add to README: `![Demo](docs/demo.gif)`

## Tips

- Use dark mode in your OS for consistency with the dark UI
- Crop out any OS chrome (taskbar, dock) for a cleaner look
- Optimize PNGs with https://tinypng.com before committing
