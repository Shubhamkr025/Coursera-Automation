// background.js — Course Autopilot
// Handles tab management for AI bridges + auto-return to Coursera

// Use chrome.storage.session to survive service worker restarts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.set({ courseraTabId: null, courseraTabUrl: null });
});

async function getCourseraTab() {
  const data = await chrome.storage.session.get(['courseraTabId', 'courseraTabUrl']);
  return data;
}

async function saveCourseraTab(tabId, tabUrl) {
  await chrome.storage.session.set({ courseraTabId: tabId, courseraTabUrl: tabUrl || null });
  console.log('[Autopilot BG] Saved Coursera tab:', tabId, tabUrl);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Open Claude tab ──────────────────────────────────────────────────────
  if (message.type === 'OPEN_CLAUDE_TAB') {
    if (sender.tab) {
      saveCourseraTab(sender.tab.id, sender.tab.url);
    }
    console.log('[Autopilot BG] Opening Claude tab');
    chrome.tabs.query({ url: '*://claude.ai/*' }, (tabs) => {
      if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
      if (tabs && tabs.length > 0) {
        console.log('[Autopilot BG] Focusing existing Claude tab:', tabs[0].id);
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
        // Reload the tab to trigger content script to pick up the task
        // Only reload if we suspect the bridge didn't pick up the task
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('[Autopilot BG] Bridge not responding, reloading Claude tab');
              chrome.tabs.reload(tabs[0].id);
            }
          });
        }, 500);
      } else {
        console.log('[Autopilot BG] Creating new Claude tab');
        chrome.tabs.create({ url: 'https://claude.ai/new', active: true });
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── Open ChatGPT tab ────────────────────────────────────────────────────
  if (message.type === 'OPEN_CHATGPT_TAB') {
    if (sender.tab) {
      saveCourseraTab(sender.tab.id, sender.tab.url);
    }
    console.log('[Autopilot BG] Opening ChatGPT tab');
    chrome.tabs.query({ url: '*://chatgpt.com/*' }, (tabs) => {
      if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
      if (tabs && tabs.length > 0) {
        console.log('[Autopilot BG] Focusing existing ChatGPT tab:', tabs[0].id);
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('[Autopilot BG] Bridge not responding, reloading ChatGPT tab');
              chrome.tabs.reload(tabs[0].id);
            }
          });
        }, 500);
      } else {
        console.log('[Autopilot BG] Creating new ChatGPT tab');
        chrome.tabs.create({ url: 'https://chatgpt.com/', active: true });
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── Auto-return to Coursera tab ─────────────────────────────────────────
  if (message.type === 'FOCUS_COURSERA_TAB') {
    console.log('[Autopilot BG] Returning to Coursera');
    getCourseraTab().then(({ courseraTabId }) => {
      if (courseraTabId) {
        chrome.tabs.get(courseraTabId, (tab) => {
          if (chrome.runtime.lastError || !tab) {
            console.log('[Autopilot BG] Saved tab gone, searching...');
            findAndFocusCoursera();
            return;
          }
          console.log('[Autopilot BG] Focusing saved tab:', courseraTabId);
          chrome.tabs.update(courseraTabId, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        });
      } else {
        findAndFocusCoursera();
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});

function findAndFocusCoursera() {
  chrome.tabs.query({ url: '*://*.coursera.org/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      // Prefer quiz/exam/assignment tabs
      const quizTab = tabs.find(t => /\/(quiz|exam|assignment)\//.test(t.url));
      const target = quizTab || tabs[0];
      console.log('[Autopilot BG] Found Coursera tab:', target.id, target.url?.slice(0, 80));
      chrome.tabs.update(target.id, { active: true });
      chrome.windows.update(target.windowId, { focused: true });
    }
  });
}
