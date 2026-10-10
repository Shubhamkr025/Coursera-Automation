// injector.js — ISOLATED world, document_start
// Injects main.js into the page's MAIN world before Coursera JS loads

(function () {
  // Guard: skip if extension context is invalidated (after reload)
  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  if (!isContextValid()) return;

  // Note: main.js is registered in manifest.json content_scripts with world: "MAIN",
  // so injecting <script src="..."> here was redundant and blocked by ad blockers (ERR_BLOCKED_BY_CLIENT).

  // Relay settings from chrome.storage → page script
  function broadcastSettings() {
    if (!isContextValid()) return;
    try {
      chrome.storage.sync.get(null, (data) => {
        if (chrome.runtime.lastError) return;
        window.dispatchEvent(new CustomEvent('CQN_SETTINGS', { detail: data }));
      });
    } catch (e) { /* context invalidated */ }
  }

  broadcastSettings();

  // Also respond if main.js asks for settings on initialization
  window.addEventListener('CQN_GET_SETTINGS', () => {
    broadcastSettings();
  });

  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (!isContextValid()) return;
      const delta = {};
      for (const [k, { newValue }] of Object.entries(changes)) delta[k] = newValue;
      window.dispatchEvent(new CustomEvent('CQN_SETTINGS', { detail: delta }));
    });
  } catch (e) { /* context invalidated */ }

  // Relay commands from popup → page script
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!isContextValid()) return;
      if (msg.action) {
        window.dispatchEvent(new CustomEvent('CQN_CMD', { detail: msg }));
      }
    });
  } catch (e) { /* context invalidated */ }
})();
