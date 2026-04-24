// injector.js — ISOLATED world, document_start
// Injects main.js into the page's MAIN world before Coursera JS loads

(function () {
  // Guard: skip if extension context is invalidated (after reload)
  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  if (!isContextValid()) return;

  // Inject main.js into page main world
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('main.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Relay settings from chrome.storage → page script
  try {
    chrome.storage.sync.get(null, (data) => {
      if (chrome.runtime.lastError) return;
      window.dispatchEvent(new CustomEvent('CQN_SETTINGS', { detail: data }));
    });
  } catch (e) { /* context invalidated */ }

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
