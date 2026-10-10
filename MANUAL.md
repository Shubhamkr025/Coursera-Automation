# Course Autopilot User Manual

This manual explains how to install and use the Course Autopilot Chrome extension. The extension automates some Coursera lesson actions and can use Claude or ChatGPT to suggest quiz answers. AI answers can be wrong; review them and follow your course's rules before submitting any work.

## Requirements

- Google Chrome or a compatible Chromium-based browser that supports Manifest V3 extensions.
- Access to Coursera in that browser.
- For AI-assisted quiz solving, an active signed-in session at [Claude](https://claude.ai) or [ChatGPT](https://chatgpt.com).

## Install the extension

1. Download this repository as a ZIP from GitHub and extract it, or clone it:

   ```bash
   git clone https://github.com/Shubhamkr025/Coursera-Automation.git
   ```

2. In Chrome, open `chrome://extensions/`.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the extracted repository folder (the folder containing `manifest.json`).
5. Pin **Course Autopilot** from the Extensions menu if you want quick access to its popup.

To install an update, download or pull the latest files, return to `chrome://extensions/`, and select the extension's **Reload** button. Refresh any open Coursera tab afterward.

## Set up AI quiz solving

1. Sign in to either Claude or ChatGPT in the same browser profile where the extension is installed.
2. Open the extension popup on a Coursera page.
3. Under **AI Engine**, choose **Claude** or **ChatGPT**.
4. Keep the selected AI service available in the browser so the extension can use its signed-in page when a quiz needs solving.

The extension does not ask for an AI API key. AI responses are generated through the selected service's website and are not guaranteed to be correct.

## Use the popup

Open the extension popup while the active tab is on a Coursera page.

### Full Course Autopilot

Select **Start Full Autopilot** to begin processing from the current course position. The popup shows the current status and counts for videos, quizzes, readings, and skipped items. Select **Stop Autopilot** to stop the run.

Autopilot may play videos, process readings, and use the selected AI engine on quizzes. Depending on the course page and available controls, it may submit quiz answers and advance through lessons. Monitor its progress and stop it if it behaves unexpectedly.

### Quick actions

- **Solve Quiz (no submit)**: asks the selected AI engine for answers and fills the quiz without submitting it. Review the filled answers and submit yourself if appropriate.
- **Next Lesson**: navigates to the next lesson when the page provides a supported next control.
- **Skip to End**: seeks the current video near its end.
- **Mark Complete**: invokes the available Coursera completion action for the current item.

### Settings

| Setting | What it does |
| --- | --- |
| Playback speed | Sets the requested video speed from 0.5× to 4×. |
| Auto-advance | Moves to the next lesson when a video ends. |
| Unlock seeking | Allows seeking within supported videos. |
| Auto-play | Attempts to resume a video if Coursera pauses it. |
| Skip countdowns | Attempts to dismiss supported next-lesson countdowns. |
| AI Engine | Chooses Claude or ChatGPT for AI-assisted quiz solving. |

Settings are saved by the extension and apply to supported Coursera pages.

## Troubleshooting

### The popup does not control the current page

Make sure the active tab is a Coursera page, then refresh the page and reopen the popup. The extension's Coursera scripts run on Coursera pages, not on the Chrome Web Store, extension settings, or AI service pages.

### Quiz solving does not return answers

Check that you are signed in to the selected AI service in the same browser profile. Confirm that the selected service is Claude or ChatGPT, then try the quiz action again. You can switch AI engines in the popup if the chosen service is unavailable.

### The extension was reloaded or updated

Refresh the Coursera page so its content scripts are reinitialized. If needed, stop and start Autopilot again.

### A control has no effect

Coursera's page structure and available controls can vary. Try refreshing the lesson, make sure a video or quiz is open as appropriate, and use Coursera's own controls if the action remains unavailable.

## Responsible use

Use this extension only in ways allowed by Coursera and your course's policies. In particular, check whether AI assistance and automated actions are permitted before using them on graded work. You are responsible for reviewing answers and submissions made through your account.

The extension is provided as-is. It does not guarantee course completion, answer correctness, or compatibility with every Coursera page.
