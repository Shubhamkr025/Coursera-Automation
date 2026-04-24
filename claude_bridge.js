// claude_bridge.js — runs on claude.ai/* (Chrome extension content script)
// Lives tested selectors (Feb 2026):
//   Input:    div.tiptap.ProseMirror
//   Inject:   execCommand('insertText')  ← confirmed ✓
//   Send:     button[aria-label="Send message"]  ← confirmed ✓
//   Response: .font-claude-response  /  .font-claude-response-body  ← confirmed ✓

(async function () {
    'use strict';

    function isContextValid() { try { return !!chrome.runtime?.id; } catch { return false; } }
    const TASK_KEY = 'cqsClaudeTask';
    const ANSWER_KEY = 'cqsClaudeAnswers';

    // ── Respond to PING from background (proves bridge is alive) ─────────────
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'PING') {
            sendResponse({ alive: true });
            // Also re-check storage in case task was written before bridge loaded
            chrome.storage.local.get([TASK_KEY], (data) => {
                if (data[TASK_KEY]?.prompt) handleTask(data[TASK_KEY]);
            });
        }
    });

    // ── Listen for new tasks when the tab is reused ───────────────────────────
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[TASK_KEY]?.newValue) {
            handleTask(changes[TASK_KEY].newValue);
        }
    });

    // ── Check for a pending task on initial load ──────────────────────────────
    const storage = await chrome.storage.local.get([TASK_KEY]);
    if (storage[TASK_KEY]) {
        handleTask(storage[TASK_KEY]);
    }


    async function handleTask(task) {
        if (!task?.prompt) return;


        console.log('[QuizAI Bridge] ✅ Task found. Prompt length:', task.prompt.length);

        // ── 1.5 Refresh page so editor is clean and ready ────────────────────
        if (!sessionStorage.getItem('_cqs_refreshed')) {
            sessionStorage.setItem('_cqs_refreshed', '1');
            console.log('[QuizAI Bridge] Refreshing page for clean editor...');
            location.reload();
            return; // After reload, storage listener re-triggers handleTask
        }
        sessionStorage.removeItem('_cqs_refreshed'); // Reset for next task

        // ── 2. Wait for the Tiptap editor to be fully hydrated ───────────────────────
        await delay(3000); // Claude's React/Tiptap takes 1-3s to mount

        const inputEl = await waitForEl([
            'div.tiptap.ProseMirror',              // Primary — live tested ✓
            'div[contenteditable="true"][enterkeyhint]',
            'div[contenteditable="true"][data-placeholder]',
            'div[contenteditable="true"]',         // Generic fallback
        ], 20000);

        if (!inputEl) {
            await storeError('Claude chat input not found. Make sure you are logged into claude.ai');
            return;
        }

        console.log('[QuizAI Bridge] Input found:', inputEl.className.slice(0, 80));

        // ── 3. Snapshot baseline BEFORE sending ──────────────────────────────────────
        const RESPONSE_SELS = [
            '.font-claude-response',
            '.font-claude-response-body',
            '[class*="font-claude-response"]',
        ];

        function getAllResponseEls() {
            for (const sel of RESPONSE_SELS) {
                const all = document.querySelectorAll(sel);
                if (all.length > 0) return [...all];
            }
            return [];
        }

        const baselineCount = getAllResponseEls().length;
        console.log('[QuizAI Bridge] Baseline response element count:', baselineCount);

        // ── 4. Inject the prompt (with retry) ────────────────────────────────────────
        let injected = false;
        for (let attempt = 0; attempt < 3 && !injected; attempt++) {
            if (attempt > 0) {
                console.log('[QuizAI Bridge] Retry attempt', attempt + 1);
                await delay(1500);
            }

            inputEl.focus();
            await delay(300);
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            await delay(200);

            // PRIMARY: execCommand insertText
            const inserted = document.execCommand('insertText', false, task.prompt);
            console.log('[QuizAI Bridge] insertText ok:', inserted, '| snippet:', (inputEl.innerText || '').slice(0, 60));

            if (inserted && (inputEl.innerText || '').trim().length > 5) {
                injected = true;
                break;
            }

            // FALLBACK 1: ClipboardEvent
            console.warn('[QuizAI Bridge] Falling back to ClipboardEvent...');
            const dt = new DataTransfer();
            dt.setData('text/plain', task.prompt);
            inputEl.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
            await delay(500);

            if ((inputEl.innerText || '').trim().length > 5) {
                injected = true;
                break;
            }

            // FALLBACK 2: innerHTML injection
            console.warn('[QuizAI Bridge] Falling back to innerHTML...');
            inputEl.innerHTML = '<p>' + task.prompt.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
            inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
            await delay(500);

            if ((inputEl.innerText || '').trim().length > 5) {
                injected = true;
            }
        }

        if (!injected) {
            await storeError('Could not type prompt into Claude. Try clicking in the chat box and retry.');
            return;
        }

        console.log('[QuizAI Bridge] Final input text (first 80 chars):', (inputEl.innerText || '').slice(0, 80));

        // ── 5. Click Send ────────────────────────────────────────────────────────────
        await delay(600); // let React enable the Send button

        const sendBtn = await waitForEl([
            'button[aria-label="Send message"]',  // confirmed ✓
            'button[aria-label="Send Message"]',
            'button[data-testid="send-button"]',
            'button[aria-label*="Send" i]',
        ], 5000);

        if (sendBtn && !sendBtn.disabled) {
            console.log('[QuizAI Bridge] Clicking Send...');
            sendBtn.click();
        } else {
            console.warn('[QuizAI Bridge] Send button not found — pressing Enter');
            inputEl.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
            }));
        }

        console.log('[QuizAI Bridge] Message sent. Waiting for NEW response elements...');
        await delay(3000); // give Claude time to start generating

        // ── 6. Wait for a NEW response element to appear (not old sidebar text) ───────
        const newEls = await waitFor(
            () => {
                const all = getAllResponseEls();
                return all.length > baselineCount ? all : null;
            },
            60000
        );

        if (!newEls) {
            await storeError('Claude did not generate a response in time. Try again.');
            return;
        }

        console.log('[QuizAI Bridge] New response elements appeared:', newEls.length - baselineCount, 'new');

        // ── 7. Wait for the NEW response text to stabilise ───────────────────────────
        const responseText = await waitForStableText(() => {
            const all = getAllResponseEls();
            // Only read elements that are beyond the baseline
            return all.slice(baselineCount).map(el => (el.innerText || '').trim()).filter(t => t.length > 5).join('\n');
        }, 120000);

        console.log('[QuizAI Bridge] Stable response (', responseText.length, ' chars):', responseText.slice(0, 150));

        if (!responseText.trim()) {
            await storeError('Claude response was empty. Try again.');
            return;
        }

        // ── 8. Parse and store ───────────────────────────────────────────────────────
        const answers = parseClaudeResponse(responseText);
        console.log('[QuizAI Bridge] Parsed', answers.length, 'answers:', JSON.stringify(answers));

        try { await chrome.storage.local.set({
            [ANSWER_KEY]: {
                answers,
                rawText: responseText.slice(0, 5000),
                taskId: task.taskId,
                timestamp: Date.now(),
            }
        }); } catch(e) { console.warn('[Bridge] Context invalidated'); return; }
        try { await chrome.storage.local.remove([TASK_KEY]); } catch(e) {}

        showBanner(`✅ ${answers.length} answers ready! Returning to Coursera...`);
        console.log('[QuizAI Bridge] ✅ Done. Auto-returning to Coursera...');

        // AUTO-RETURN to Coursera tab
        await delay(1500);
        if (isContextValid()) { try { chrome.runtime.sendMessage({ type: 'FOCUS_COURSERA_TAB' }); } catch(e) {} }

        // ──────────────────────────────────────────────────────────────────────────────
        //  HELPERS
        // ──────────────────────────────────────────────────────────────────────────────

        function waitForEl(sels, maxMs) {
            return new Promise(resolve => {
                for (const sel of sels) {
                    const el = document.querySelector(sel);
                    if (el) { resolve(el); return; }
                }
                const start = Date.now();
                const id = setInterval(() => {
                    for (const sel of sels) {
                        const el = document.querySelector(sel);
                        if (el) { clearInterval(id); resolve(el); return; }
                    }
                    if (Date.now() - start > maxMs) { clearInterval(id); resolve(null); }
                }, 400);
            });
        }

        function waitFor(fn, maxMs) {
            return new Promise(resolve => {
                const r = fn(); if (r) { resolve(r); return; }
                const start = Date.now();
                const id = setInterval(() => {
                    const r2 = fn();
                    if (r2 || Date.now() - start > maxMs) { clearInterval(id); resolve(r2 || null); }
                }, 600);
            });
        }

        function waitForStableText(getText, maxMs) {
            return new Promise(resolve => {
                let last = '', stableCount = 0;
                const start = Date.now();
                const id = setInterval(() => {
                    const cur = getText();
                    if (cur && cur === last && cur.length > 10) {
                        stableCount++;
                        if (stableCount >= 3) { clearInterval(id); resolve(cur); return; } // stable 3×800ms
                    } else { stableCount = 0; last = cur; }
                    if (Date.now() - start > maxMs) { clearInterval(id); resolve(last); }
                }, 800);
            });
        }

        function parseClaudeResponse(text) {
            // 1. Extract all complete JSON objects using brace-balancing
            const candidates = extractJsonObjects(text);
            for (const candidate of candidates.reverse()) { // last one = most recent
                try {
                    const p = JSON.parse(candidate);
                    if (Array.isArray(p.answers) && p.answers.length) {
                        console.log('[QuizAI Bridge] JSON parsed successfully, answers:', p.answers.length);
                        return p.answers;
                    }
                } catch { /* try next */ }
            }

            // 2. Custom Regex extractor for malformed JSON (handles unescaped quotes)
            const customRes = [];
            const matches = [...text.matchAll(/"q"\s*:\s*(\d+)\s*,\s*"a"\s*:\s*\[([\s\S]*?)\]\s*\}/g)];
            if (matches.length > 0) {
                for (const m of matches) {
                    const q = parseInt(m[1]);
                    let rawA = m[2].trim();
                    // Check if it's just letter choices
                    if (/^"[A-H]"(?:\s*,\s*"[A-H]")*$/.test(rawA)) {
                        const letters = [...rawA.matchAll(/"([A-H])"/g)].map(x => x[1]);
                        customRes.push({ q, a: letters });
                    } else {
                        // Open text answer - sanitize bounding quotes
                        if (rawA.startsWith('"')) rawA = rawA.substring(1);
                        if (rawA.endsWith('"')) rawA = rawA.substring(0, rawA.length - 1);
                        rawA = rawA.replace(/\\"/g, '"').replace(/\\n/g, '\n');
                        customRes.push({ q, a: [rawA] });
                    }
                }
                if (customRes.length > 0) return customRes;
            }

            // 3. Line-by-line "Q1: A" / "1. B, C" fallback
            const result = [];
            for (const line of text.split('\n')) {
                const m = line.match(/(?:Q|Question\s*)?(\d+)[.:)\s]+([A-H](?:\s*[,/&]?\s*(?:and\s*)?[A-H])*)/i);
                if (m) {
                    const q = parseInt(m[1]);
                    const letters = [...m[2].matchAll(/[A-H]/gi)].map(x => x[0].toUpperCase());
                    if (letters.length) result.push({ q, a: [...new Set(letters)] });
                }
            }
            return result;
        }

        // Extracts all complete top-level JSON objects by counting balanced braces
        function extractJsonObjects(text) {
            const results = [];
            let depth = 0, start = -1;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '{') {
                    if (depth === 0) start = i;
                    depth++;
                } else if (text[i] === '}') {
                    depth--;
                    if (depth === 0 && start !== -1) {
                        results.push(text.slice(start, i + 1));
                        start = -1;
                    }
                }
            }
            return results;
        }

        async function storeError(msg) {
            console.error('[QuizAI Bridge] ERROR:', msg);
            try {
                await chrome.storage.local.set({ [ANSWER_KEY]: { error: msg, taskId: task.taskId, timestamp: Date.now() } });
                await chrome.storage.local.remove([TASK_KEY]);
            } catch(e) { /* context invalidated */ }
            showBanner('\u26a0 ' + msg);
            // Auto-return on error too
            await delay(1500);
            if (isContextValid()) { try { chrome.runtime.sendMessage({ type: 'FOCUS_COURSERA_TAB' }); } catch(e) {} }
        }

        function showBanner(msg) {
            const b = document.createElement('div');
            b.style.cssText = 'position:fixed;top:16px;right:16px;z-index:999999;max-width:380px;' +
                'background:#0f172a;border:1.5px solid #6366f1;border-radius:14px;' +
                'padding:14px 20px;font-family:Inter,system-ui,sans-serif;font-size:13px;' +
                'font-weight:600;color:#f8fafc;box-shadow:0 8px 40px rgba(0,0,0,0.6);line-height:1.5;';
            b.textContent = msg;
            document.body.appendChild(b);
            setTimeout(() => b.remove(), 12000);
        }

        function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    } // End of handleTask

})();
