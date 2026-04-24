# 🚀 Coursera Automation Tool

> **The most powerful Chrome extension to automate your entire Coursera course — videos, readings, and quizzes — with AI-powered quiz solving using Claude & ChatGPT.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Coursera](https://img.shields.io/badge/Coursera-Compatible-0056D2?logo=coursera&logoColor=white)](https://www.coursera.org)

---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [How It Works](#-how-it-works)
- [Usage Guide](#-usage-guide)
- [Architecture](#-architecture)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [Disclaimer](#%EF%B8%8F-disclaimer)

---

## ✨ Features

### 🎬 Full Course Autopilot
- **One-click autopilot** — starts from your current position and completes videos, readings, and quizzes automatically
- **Smart video handling** — auto-play, configurable playback speed (0.5× to 4×), skip countdowns, and auto-advance to next lesson
- **Reading auto-completion** — marks readings as complete and advances automatically
- **Quiz auto-solving** — uses AI (Claude or ChatGPT) to answer quizzes and auto-submits
- **Course progress tracking** — real-time stats for videos played, quizzes solved, readings completed

### 🧠 AI-Powered Quiz Solver
- **Dual AI Support** — choose between **Claude AI** or **ChatGPT** from the popup
- **Automatic fallback** — if your preferred AI fails (rate limit, etc.), automatically falls back to the other
- **Smart answer detection** — handles multiple choice, checkboxes, true/false, and open-ended text questions
- **Claude & ChatGPT bridge scripts** — seamlessly communicates with AI tabs via Chrome storage messaging
- **Page refresh for reliability** — refreshes AI tab before each task to ensure a clean editor state
- **Answer confidence display** — shows AI confidence scores and reasoning alongside answers

### 🎯 Individual Quiz Solve (Manual Mode)
- **"Solve Quiz" button** — on any quiz page, click to get AI answers without auto-submitting
- **Review before submit** — answers are filled in but submission is left to you
- **Toolbar integration** — floating toolbar on every Coursera page with quick actions

### ⚡ Speed & Automation Controls
- **Playback speed slider** — 0.5× to 4× speed control for all videos
- **Auto-advance** — automatically moves to next lesson when video ends
- **Unlock seeking** — skip freely in any video without restrictions
- **Auto-play** — resumes if Coursera pauses the video
- **Skip countdowns** — auto-dismiss "Next in 5s" overlays
- **Honor code auto-check** — automatically accepts honor pledges

### 🛡️ Reliability & Error Handling
- **Extension context protection** — graceful handling of "Extension context invalidated" errors
- **Quiz loop prevention** — tracks solved quizzes to prevent re-attempting already completed items
- **Smart quiz detection** — only skips quizzes that are truly passed (≥80% score + no retry button)
- **Back button navigation** — uses back navigation when forward button isn't available after quiz review
- **Robust polling** — tolerates transient Chrome storage errors without aborting

---

## 📸 Screenshots

| Popup Dashboard | Autopilot Running | Quiz Solving |
|:---:|:---:|:---:|
| Full autopilot controls with stats | Real-time progress tracking | AI answers with confidence scores |

---

## 🔧 Installation

### Method 1: Load as Unpacked Extension (Developer Mode)

1. **Download** this repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/coursera-automation-tool.git
   ```

2. Open **Chrome** and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **"Load unpacked"** and select the `CourseAutopilot` folder

5. The extension icon will appear in your toolbar — you're ready!

### Method 2: Download ZIP

1. Click the green **"Code"** button → **"Download ZIP"**
2. Extract the ZIP file
3. Follow steps 2-5 from Method 1

---

## ⚙️ How It Works

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Chrome Extension                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐    ┌───────────┐    ┌───────────────┐  │
│  │ popup   │───→│background │───→│  content.js   │  │
│  │ (UI)    │    │ (service  │    │  (Coursera    │  │
│  │         │    │  worker)  │    │   tab logic)  │  │
│  └─────────┘    └─────┬─────┘    └───────┬───────┘  │
│                       │                  │           │
│                       │    chrome.storage│           │
│                       │    (messaging)   │           │
│                       │                  │           │
│              ┌────────┴────────┐         │           │
│              │                 │         │           │
│  ┌───────────▼──┐  ┌──────────▼──┐      │           │
│  │claude_bridge │  │chatgpt_bridge│      │           │
│  │ (claude.ai   │  │(chatgpt.com │      │           │
│  │  tab script) │  │ tab script) │      │           │
│  └──────────────┘  └─────────────┘      │           │
│                                          │           │
│  ┌──────────┐    ┌───────────┐           │           │
│  │injector  │───→│  main.js  │◄──────────┘           │
│  │(doc start)│   │(MAIN world│                       │
│  │          │    │ marathon) │                       │
│  └──────────┘    └───────────┘                       │
└──────────────────────────────────────────────────────┘
```

### Key Components

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration (Manifest V3) |
| `background.js` | Service worker — tab management, message routing |
| `content.js` | Coursera content script — quiz detection, answer filling, toolbar |
| `main.js` | Injected into MAIN world — video control, marathon runner, API interception |
| `injector.js` | Bridges ISOLATED ↔ MAIN worlds at document_start |
| `claude_bridge.js` | Content script on claude.ai — types prompts, reads responses |
| `chatgpt_bridge.js` | Content script on chatgpt.com — types prompts, reads responses |
| `popup.html/js/css` | Extension popup UI with controls and settings |

### Quiz Solving Flow

```
1. Quiz detected on Coursera page
2. Questions & options extracted from DOM
3. Prompt constructed with structured format
4. Task stored in chrome.storage.local
5. AI tab opened/focused (Claude or ChatGPT)
6. Bridge script refreshes page for clean state
7. Prompt typed into AI editor via DOM injection
8. Bridge polls for AI response (stable text detection)
9. Response parsed → answer objects extracted
10. Answers stored back in chrome.storage.local
11. Content script fills radio buttons/checkboxes/text
12. (Autopilot) Auto-submits → moves to next item
    (Manual) Shows "Review & submit yourself"
```

---

## 📖 Usage Guide

### Full Course Autopilot

1. Navigate to any **Coursera course page**
2. Click the extension icon → **"▶ Start Full Autopilot"**
3. The extension handles everything:
   - ▶ Videos are played at your selected speed
   - 📖 Readings are auto-completed
   - 🧠 Quizzes are solved with AI and auto-submitted
4. Watch the real-time stats in the popup
5. Click **"■ Stop Autopilot"** anytime to pause

### Individual Quiz Solving

1. Open any **Coursera quiz page**
2. Either:
   - Click **"🧠 Solve Quiz (no submit)"** in the popup, OR
   - Click **"Solve This Quiz"** on the floating toolbar
3. AI fills all answers — **review them yourself**
4. Click Submit when you're satisfied

### Switching AI Engine

1. Open the popup
2. Under **"AI Engine"**, select **Claude** or **ChatGPT**
3. The change takes effect immediately for the next quiz

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-advance | Next lesson when video ends | ✅ On |
| Unlock seeking | Skip freely in any video | ✅ On |
| Auto-play | Resume if Coursera pauses | ✅ On |
| Skip countdowns | Dismiss "Next in 5s" overlays | ✅ On |
| Playback speed | Video speed multiplier | 2× |
| AI Engine | Claude or ChatGPT | Claude |

---

## ❓ FAQ

### Does this require a Claude or ChatGPT account?
**Yes.** You need to be logged into either [claude.ai](https://claude.ai) or [chatgpt.com](https://chatgpt.com) in the same browser. The extension uses your existing session — no API keys needed.

### Why does the AI tab refresh before each quiz?
This ensures the editor is in a clean state, preventing prompt injection failures from previous conversations.

### What if Claude/ChatGPT rate-limits me?
Switch to the other AI from the popup dropdown. The extension also automatically falls back if the primary AI fails.

### Does it work with graded assignments?
It works with quizzes, exams, and assignment-submission pages. Peer-graded assignments are skipped automatically.

### What happens if I reload the extension?
You'll see "⚠ Extension reloaded — refresh page (F5)" on the Coursera tab. Just refresh the page and continue.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚠️ Disclaimer

This tool is intended for **educational and personal productivity purposes only**. Use it responsibly and in accordance with Coursera's terms of service. The developers are not responsible for any consequences resulting from the use of this extension.

**This extension does NOT:**
- Store or transmit your credentials
- Access any data outside of Coursera and AI chat pages
- Require API keys or paid services
- Modify your Coursera account settings

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🌟 Star This Repo!

If this tool helped you save time on Coursera, please ⭐ star this repository! It helps others find it.

---

### Keywords
`coursera automation` `coursera quiz solver` `coursera auto complete` `coursera chrome extension` `coursera speed learner` `coursera autopilot` `coursera AI quiz` `coursera auto submit` `coursera video speed` `course completion tool` `coursera helper` `coursera graded quiz answers` `coursera assignment solver` `AI quiz solver` `claude coursera` `chatgpt coursera` `coursera bot` `coursera hack` `online course automation` `MOOC automation tool`
