# Contributing to MapScrape

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork and clone the repo
2. Start the dev environment:

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Guidelines

- **Code style**: Use clear variable names, add docstrings to functions
- **Commits**: Use descriptive commit messages (`Add star filter component`, not `fix stuff`)
- **Testing**: Test your changes with both Arabic and English UI modes
- **PRs**: One feature per PR, include screenshots for UI changes

## What to Contribute

Check the [Issues](../../issues) tab for open tasks, or:

- 🐛 Fix a bug you found
- 🌐 Add a new language translation
- 📦 Add an export format
- 🎨 Improve the UI/UX
- 📖 Improve documentation
- ⚡ Optimize scraping performance

## Reporting Issues

Use the issue templates provided. Include:

- Steps to reproduce
- Expected vs actual behavior
- Browser/OS info
- Screenshots if it's a UI issue

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.
