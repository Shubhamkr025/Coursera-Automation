// content.js Ã¢â‚¬â€ Course Autopilot (ISOLATED world)
// Handles quiz solving via ChatGPT/Claude bridges
// Listens for CQN_NEED_QUIZ_SOLVE from main.js

(function () {
  'use strict';

  const answered = new Map();

  // ── Guard: detect if extension was reloaded (context invalidated) ──────────
  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }
  function safeChromeCall(fn) {
    if (!isContextValid()) {
      console.warn('[Autopilot] Extension context invalidated — please refresh this page');
      setStatus('⚠ Extension reloaded — refresh this page (F5)');
      return Promise.reject(new Error('Extension context invalidated'));
    }
    return fn();
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Listen for main.js marathon signals Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  window.addEventListener('CQN_NEED_QUIZ_SOLVE', async function () {
    console.log('[Autopilot] Quiz solve signal received from main.js');
    injectStyles();
    buildStatusBar('Solving quiz Ã¢â‚¬â€ please wait...', false);

    try {
      // Step A: Click Start / Resume / Retry
      setStatus('Opening quiz...');
      await clickStartButton();

      // Step B: Wait for questions
      setStatus('Waiting for questions...');
      await waitFor(() => findBlocks().length > 0, 12000);
      await delay(800);

      // Step C: Solve
      setStatus('Answering questions with AI...');
      const preferredAI = await getPreferredAI();
      const fallbackAI = preferredAI === 'claude' ? 'chatgpt' : 'claude';
      let success = await solveWithWebUI(preferredAI);
      if (!success) {
        setStatus('Falling back to ' + (fallbackAI === 'claude' ? 'Claude' : 'ChatGPT') + '...');
        await delay(2000);
        success = await solveWithWebUI(fallbackAI);
      }

      // Step D: Honor code
      setStatus('Checking honor pledge...');
      await checkHonorCode();
      await delay(600);

      // Step E: AUTOPILOT mode = auto-submit
      setStatus('Submitting quiz...');
      const submitted = await submitQuiz();
      if (submitted) {
        setStatus('\u2705 Submitted!');
      } else {
        setStatus('\u26a0 Submit manually');
      }
      await delay(2500);

      // Step F: Signal main.js we're done
      window.dispatchEvent(new CustomEvent('CQN_ITEM_DONE', { detail: { type: 'quiz' } }));
    } catch (err) {
      console.error('[Autopilot] Quiz solve error:', err);
      setStatus('Ã¢Å¡Â  Quiz error Ã¢â‚¬â€ skipping');
      await delay(1500);
      window.dispatchEvent(new CustomEvent('CQN_ITEM_DONE', { detail: { type: 'error' } }));
    }
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Init: show toolbar on Coursera pages Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function init() {
    injectStyles();
    buildStatusBar('Course Autopilot ready', true);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Status Bar UI Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function buildStatusBar(statusMsg, showManual) {
    let t = document.getElementById('cap-toolbar');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'cap-toolbar';

    const logoHtml = `
      <div class="cap-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        Autopilot
      </div>
    `;

    if (showManual) {
      t.innerHTML = `
        ${logoHtml}
        <span id="cap-status" class="cap-status-text">${statusMsg}</span>
        <button id="cap-solve-btn" class="cap-btn cap-btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline></svg>
          Solve This Quiz
        </button>
      `;
    } else {
      t.innerHTML = `
        ${logoHtml}
        <div class="cap-status-wrap">
          <span class="cap-label">STATUS</span>
          <span id="cap-status">${statusMsg}</span>
        </div>
      `;
    }

    document.body.appendChild(t);

    document.getElementById('cap-solve-btn')?.addEventListener('click', async () => {
      setStatus('Solving quiz...');
      buildStatusBar('Solving quiz Ã¢â‚¬â€ please wait...', false);
      await clickStartButton();
      await waitFor(() => findBlocks().length > 0, 12000);
      await delay(600);
      const preferredAI = await getPreferredAI();
      const fallbackAI = preferredAI === 'claude' ? 'chatgpt' : 'claude';
      let success = await solveWithWebUI(preferredAI);
      if (!success) {
        setStatus('Falling back to ' + (fallbackAI === 'claude' ? 'Claude' : 'ChatGPT') + '...');
        await delay(2000);
        success = await solveWithWebUI(fallbackAI);
      }
      setStatus('Checking honor pledge...');
      await checkHonorCode();
      await delay(600);
      // Manual mode: do NOT auto-submit — let user review and submit themselves
      setStatus('✅ Answers filled! Review & submit yourself');
      buildStatusBar('✅ Answers ready — review & submit when ready', true);
    });
  }

  function setStatus(txt) {
    const el = document.getElementById('cap-status');
    if (el) {
      el.textContent = txt;
      el.style.color = '#818cf8';
      setTimeout(() => { if (el) el.style.color = ''; }, 600);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Web UI Solver (ChatGPT / Claude via browser tabs) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function getPreferredAI() {
    try {
      const data = await new Promise(r => chrome.storage.sync.get({ aiChoice: 'claude' }, r));
      return data.aiChoice || 'claude';
    } catch { return 'claude'; }
  }

  async function solveWithWebUI(forceAiChoice = null) {
    const aiChoice = forceAiChoice || 'claude';
    const isChatGPT = aiChoice === 'chatgpt';
    const TASK_KEY = isChatGPT ? 'cqsChatGptTask' : 'cqsClaudeTask';
    const ANSWER_KEY = isChatGPT ? 'cqsChatGptAnswers' : 'cqsClaudeAnswers';
    const AI_NAME = isChatGPT ? 'ChatGPT' : 'Claude';
    const OPEN_MSG = isChatGPT ? 'OPEN_CHATGPT_TAB' : 'OPEN_CLAUDE_TAB';

    await waitFor(() => findBlocks().length > 0, 10000);
    const blocks = findBlocks();
    if (!blocks.length) { setStatus('Ã¢Å¡Â  No questions found'); return false; }

    const firstQKey = getQuestion(blocks[0])?.slice(0, 50);
    if (firstQKey && answered.has(firstQKey)) {
      setStatus('Ã¢Å“â€¦ Already answered');
      return true;
    }

    // Build prompt with course context
    const courseTitle = document.querySelector('h1, [data-testid="course-name"]')?.innerText?.trim() || '';
    let promptLines = [];
    promptLines.push('You are answering a Coursera quiz' + (courseTitle ? ' for the course: "' + courseTitle + '"' : '') + '.');
    promptLines.push('Analyze each question and select the most factually accurate option(s).');
    promptLines.push('Rules: Single-choice = 1 letter. Multi-select = all correct letters. Open-ended = write a short 3-sentence answer.');
    promptLines.push('CRITICAL: For open-ended answers, escape any internal quotes so the JSON remains valid.');
    promptLines.push('OUTPUT FORMAT (Raw JSON only, no markdown, no explanation):');
    promptLines.push('{"answers": [{"q": <number>, "a": ["<letter>"]}]}');
    promptLines.push('--- ITEMS ---');

    const blockMeta = [];
    blocks.forEach((block, i) => {
      const q = getQuestion(block);
      const type = getType(block);
      const opts = type !== 'text' ? getOptions(block) : [];
      blockMeta.push({ block, q, type, opts });

      promptLines.push(`Q${i + 1}: ${q}`);
      if (opts.length) {
        opts.forEach((o, j) => promptLines.push(`  ${String.fromCharCode(65 + j)}. ${o}`));
      } else {
        promptLines.push('  [Open-ended Ã¢â‚¬â€ write a short answer]');
      }
      promptLines.push('');
    });

    const prompt = promptLines.join('\n');
    const taskId = Date.now().toString();

    blocks.forEach(showLoader);
    setStatus(`Opening ${AI_NAME}...`);

    try { await chrome.storage.local.remove([ANSWER_KEY]); } catch(e) { setStatus('⚠ Extension reloaded - refresh page (F5)'); return false; }
    try { await chrome.storage.local.set({
      [TASK_KEY]: { prompt, taskId, timestamp: Date.now() }
    }); } catch(e) { setStatus('⚠ Extension reloaded - refresh page (F5)'); return false; }

    try { chrome.runtime.sendMessage({ type: OPEN_MSG }); } catch(e) { setStatus('⚠ Extension reloaded - refresh page (F5)'); return false; }

    setStatus(`Waiting for ${AI_NAME} to answer...`);
    const deadline = Date.now() + 180000;
    let pollCount = 0;

    while (Date.now() < deadline) {
      await delay(2000);
      pollCount++;
      if (pollCount % 5 === 0) setStatus(`Still waiting for ${AI_NAME}... (${Math.round((Date.now() - (deadline - 180000)) / 1000)}s)`);

      let stored;
      try {
        stored = await new Promise(r => {
          chrome.storage.local.get([ANSWER_KEY], d => {
            if (chrome.runtime.lastError) { r(null); return; }
            r(d[ANSWER_KEY]);
          });
        });
      } catch(e) { continue; } // Don't abort on transient errors, just retry

      if (!stored) continue;

      if (stored.error) {
        setStatus(`Ã¢Å¡Â  ${AI_NAME}: ${stored.error}`);
        blocks.forEach(b => showError(b, stored.error));
        await chrome.storage.local.remove([ANSWER_KEY]);
        return false;
      }

      const hasAnswers = Array.isArray(stored.answers) && stored.answers.length > 0;
      const hasRawText = stored.rawText && stored.rawText.length > 10;

      if (hasAnswers || hasRawText) {
        setStatus(`Got ${AI_NAME} response! Filling in answers...`);
        let finalAnswers = stored.answers || [];

        if (!hasAnswers && hasRawText) {
          finalAnswers = parseRawText(stored.rawText);
        }

        await applyWebUiAnswers(blockMeta, finalAnswers, AI_NAME);
        await chrome.storage.local.remove([ANSWER_KEY]);

        if (firstQKey) answered.set(firstQKey, true);

        if (finalAnswers.length === 0) {
          setStatus(`Ã¢Å¡Â  ${AI_NAME}: Failed to parse answers`);
          blocks.forEach(b => showError(b, 'Failed to parse answers'));
          return false;
        }

        setStatus(`Ã¢Å“â€¦ ${AI_NAME} answered!`);
        return true;
      }
    }

    setStatus(`Ã¢ÂÂ± ${AI_NAME} timed out`);
    blocks.forEach(b => showError(b, `${AI_NAME} timed out`));
    return false;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Answer parser fallback Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function parseRawText(text) {
    const candidates = [];
    let depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (text[i] === '}') { if (depth > 0) { depth--; if (depth === 0 && start !== -1) { candidates.push(text.slice(start, i + 1)); start = -1; } } }
    }
    for (const candidate of candidates.reverse()) {
      try { const p = JSON.parse(candidate); if (Array.isArray(p.answers) && p.answers.length) return p.answers; } catch { }
    }

    const customRes = [];
    const matches = [...text.matchAll(/"q"\s*:\s*(\d+)\s*,\s*"a"\s*:\s*\[([\s\S]*?)\]\s*\}/g)];
    if (matches.length > 0) {
      for (const m of matches) {
        const q = parseInt(m[1]);
        let rawA = m[2].trim();
        if (/^"[A-H]"(?:\s*,\s*"[A-H]")*$/.test(rawA)) {
          const letters = [...rawA.matchAll(/"([A-H])"/g)].map(x => x[1]);
          customRes.push({ q, a: letters });
        } else {
          if (rawA.startsWith('"')) rawA = rawA.substring(1);
          if (rawA.endsWith('"')) rawA = rawA.substring(0, rawA.length - 1);
          rawA = rawA.replace(/\\"/g, '"').replace(/\\n/g, '\n');
          customRes.push({ q, a: [rawA] });
        }
      }
      if (customRes.length > 0) return customRes;
    }

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

  async function applyWebUiAnswers(blockMeta, aiAnswers, aiName) {
    const answerMap = {};
    for (const item of aiAnswers) answerMap[item.q] = item.a || [];

    for (let i = 0; i < blockMeta.length; i++) {
      const { block, q, type, opts } = blockMeta[i];
      const qNum = i + 1;
      const letters = answerMap[qNum] || [];
      if (!letters.length) { showError(block, `${aiName} did not answer Q${qNum}`); continue; }

      if (type === 'text') {
        const result = { answers: [], reasoning: letters[0] || '', suggestedText: letters[0] || '', confidence: 88 };
        showAnswer(block, result, [], 'text', aiName);
      } else {
        const validLetters = letters.map(l => String(l).toUpperCase()).filter(l => /^[A-H]$/.test(l));
        const result = { answers: validLetters.length ? validLetters : ['A'], reasoning: `Via ${aiName}`, confidence: 92 };
        // Scroll block into view before clicking
        block.scrollIntoView({ block: 'center', behavior: 'instant' });
        await delay(250);
        showAnswer(block, result, opts, type, aiName);
      }
      // Give React time to process before next question
      await delay(350);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Click Start / Resume / Retry Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function clickStartButton() {
    await delay(2000);
    const targetRegex = /\b(start|resume|begin|retry|retake|try again)\b.*?\b(quiz|exam|assignment|new attempt)?\b/i;
    const testIds = [
      '[data-testid="action-button"]',
      '[data-testid="CoverPageActionButton"]',
      '[data-testid="start-exam-button"]',
      '[data-testid="resume-exam-button"]',
      '[data-testid="retry-exam-button"]',
      '[data-testid="retake-exam-button"]',
      '[data-testid="start-assignment-button"]',
      '[data-testid="resume-assignment-button"]',
      'button[aria-label*="start" i]',
      'button[aria-label*="resume" i]',
      'button[aria-label*="retry" i]',
    ];

    let startBtn = null;
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      for (const sel of testIds) { startBtn = document.querySelector(sel); if (startBtn) break; }
      if (startBtn) break;

      const labelSpans = document.querySelectorAll('.cds-button-label');
      for (const span of labelSpans) {
        if (targetRegex.test((span.innerText || '').trim())) {
          startBtn = span.closest('button, [role="button"], a');
          if (startBtn) break;
        }
      }
      if (startBtn) break;

      startBtn = [...document.querySelectorAll('button, [role="button"], a[role="button"]')]
        .find(b => targetRegex.test((b.innerText || b.textContent || '').trim()));
      if (startBtn) break;
      await delay(500);
    }

    if (!startBtn) { console.log('[Autopilot] No start button Ã¢â‚¬â€ quiz already open'); return; }

    ['mousedown', 'mouseup', 'click'].forEach(et => {
      startBtn.dispatchEvent(new MouseEvent(et, { bubbles: true, cancelable: true, view: window }));
    });
    startBtn.click();
    await delay(1500);

    // Handle confirmation modals
    const confirmTargets = ['start new attempt', 'continue', 'ok', 'confirm', 'proceed', 'yes', 'accept', 'begin', 'start attempt'];
    const modalDeadline = Date.now() + 4000;
    while (Date.now() < modalDeadline) {
      await delay(400);
      const dialogScope = document.querySelector('[role="dialog"], .cds-modal-backdrop, .cds-modal-container, [class*="modal"]');
      if (dialogScope) {
        const confirmBtn = [...dialogScope.querySelectorAll('button, [role="button"]')]
          .find(b => confirmTargets.includes((b.innerText?.trim() || '').toLowerCase()));
        if (confirmBtn) { confirmBtn.click(); await delay(2500); return; }
      }
      const pageConfirm = [...document.querySelectorAll('button, [role="button"]')]
        .find(b => { const txt = (b.innerText?.trim() || '').toLowerCase(); return confirmTargets.includes(txt) && txt !== 'start'; });
      if (pageConfirm) { pageConfirm.click(); await delay(2000); return; }
    }
    await delay(1000);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Honor code checkbox Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function checkHonorCode() {
    window.scrollTo(0, document.body.scrollHeight);
    await delay(800);
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const box of allCheckboxes) {
      if (box.checked) continue;
      const labelText = (box.closest('label')?.innerText || '').toLowerCase();
      const parentText = (box.parentElement?.innerText || '').toLowerCase();
      const nextSiblingText = (box.nextElementSibling?.innerText || '').toLowerCase();
      const combinedText = ` ${labelText} ${parentText} ${nextSiblingText} `;
      const isHonorCode = combinedText.includes('honor') || combinedText.includes('understand that submitting') || combinedText.includes('certify') || combinedText.includes('agree');
      if (isHonorCode) {
        box.checked = true;
        ['mousedown', 'mouseup', 'click', 'input', 'change'].forEach(et => {
          box.dispatchEvent(new MouseEvent(et, { bubbles: true, cancelable: true, view: window }));
        });
        const label = box.closest('label');
        if (label) label.click();
        break;
      }
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Submit quiz Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function submitQuiz() {
    window.scrollTo(0, document.body.scrollHeight);
    await delay(1000);
    const submitTexts = ['submit', 'submit quiz', 'submit exam', 'submit assignment'];
    const findSubmit = () => document.querySelector('[data-testid="submit-button"]') ||
      [...document.querySelectorAll('button, a[role="button"], div[role="button"]')].find(b =>
        submitTexts.includes((b.innerText?.trim() || '').toLowerCase())
      );

    let pageSubmit = findSubmit();
    if (!pageSubmit) {
      window.scrollTo(0, document.body.scrollHeight);
      await delay(1000);
      pageSubmit = findSubmit();
    }
    if (!pageSubmit) return false;

    for (let i = 0; i < 15; i++) {
      if (pageSubmit.getAttribute('aria-disabled') !== 'true' && !pageSubmit.disabled) break;
      await delay(200);
    }

    await delay(300);
    pageSubmit.click();
    await delay(300);
    pageSubmit.click();
    await delay(1000);

    // Wait for confirmation modal
    const modalSubmitBtn = await waitForModalSubmit(5000);
    if (modalSubmitBtn) {
      modalSubmitBtn.click();
      await delay(300);
      modalSubmitBtn.click();
      await delay(2500);
    }
    return true;
  }

  async function waitForModalSubmit(maxMs) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await delay(350);
      const headings = document.querySelectorAll('h1,h2,h3,h4');
      for (const h of headings) {
        const txt = (h.innerText || '').trim().toLowerCase();
        if (txt.startsWith('ready to submit') || txt.includes('missing or invalid')) {
          const submitTexts = ['submit', 'submit quiz', 'submit exam', 'submit assignment'];
          for (const ancestor of [h.parentElement?.parentElement, h.parentElement?.parentElement?.parentElement]) {
            if (!ancestor) continue;
            const btn = [...ancestor.querySelectorAll('button, a[role="button"]')]
              .find(b => submitTexts.includes((b.innerText?.trim() || '').toLowerCase()));
            if (btn) return btn;
          }
        }
      }
      for (const sel of ['.cds-modal-container', '[class*="modal-container"]', '.cds-modal-backdrop']) {
        const container = document.querySelector(sel);
        if (container) {
          const submitTexts = ['submit', 'submit quiz', 'submit exam', 'submit assignment'];
          const btn = [...container.querySelectorAll('button, a[role="button"]')]
            .find(b => submitTexts.includes((b.innerText?.trim() || '').toLowerCase()));
          if (btn) return btn;
        }
      }
    }
    return null;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ DOM Parsers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function findBlocks() {
    const seen = new Set(), results = [];
    for (const sel of [
      '[data-testid="part-Submission_MultipleChoiceQuestion"]',
      '[data-testid="part-Submission_CheckboxQuestion"]',
      '[data-testid="part-Submission_TextInputQuestion"]',
      '[data-testid="part-Submission_ReflectiveQuestion"]',
      '[data-testid="part-Submission_FreeFormTextQuestion"]',
      '[data-testid*="ReflectiveQuestion"]',
      '[data-testid*="FreeForm"]',
    ]) {
      document.querySelectorAll(sel).forEach(n => { if (!seen.has(n)) { seen.add(n); results.push(n); } });
    }
    if (results.length) return results;
    for (const sel of ['[data-testid*="Question"]', '.rc-FormPartsQuestion']) {
      document.querySelectorAll(sel).forEach(n => { if (!seen.has(n)) { seen.add(n); results.push(n); } });
    }
    if (results.length) return results;
    document.querySelectorAll('textarea').forEach(ta => {
      let p = ta;
      for (let i = 0; i < 12; i++) {
        p = p?.parentElement; if (!p) break;
        if (seen.has(p)) return;
        if (p.tagName === 'DIV' && (p.querySelector('p, label, h3, h4, legend') || p.getAttribute('data-testid'))) {
          if (!seen.has(p)) { seen.add(p); results.push(p); } return;
        }
      }
    });
    if (!results.length) {
      document.querySelectorAll('input[type="radio"],input[type="checkbox"]').forEach(inp => {
        let p = inp;
        for (let i = 0; i < 10; i++) {
          p = p?.parentElement; if (!p) break;
          if (p.querySelectorAll('input[type="radio"],input[type="checkbox"]').length >= 2) {
            if (!seen.has(p)) { seen.add(p); results.push(p); } break;
          }
        }
      });
    }
    return results;
  }

  function getType(b) {
    if (b.querySelector('input[type="checkbox"]')) return 'checkbox';
    if (b.querySelector('input[type="text"],textarea')) return 'text';
    return 'radio';
  }

  function getQuestion(b) {
    const legend = b.querySelector('[data-testid="legend"]');
    const cml = legend?.querySelector('.rc-CML');
    const fromLegend = ((cml || legend || null)?.innerText || '').replace(/^\d+\.\s*/, '').replace(/\d+\s*points?\s*/gi, '').replace(/\s+/g, ' ').trim();
    if (fromLegend) return fromLegend.slice(0, 1200);
    const fallback = b.querySelector('h1,h2,h3,h4,h5,p,label');
    return (fallback?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  }

  function getOptions(b) {
    const opts = b.querySelectorAll('.rc-Option');
    if (opts.length >= 2) return [...opts].map(o => (o.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    return [...b.querySelectorAll('label')].map(l => (l.innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 0 && t.length < 500);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ UI Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function clearBadge(b) {
    b.querySelectorAll('[data-cqs]').forEach(e => e.remove());
    b.querySelectorAll('.cqs-glow,.cqs-glow-multi').forEach(e => e.classList.remove('cqs-glow', 'cqs-glow-multi'));
  }

  function showLoader(b) {
    clearBadge(b);
    const d = document.createElement('div');
    d.className = 'cqs-loading'; d.setAttribute('data-cqs', '1');
    d.innerHTML = '<div class="cqs-spinner"></div><span>AI solving...</span>';
    b.prepend(d);
  }

  function showError(b, msg) {
    clearBadge(b);
    const d = document.createElement('div');
    d.className = 'cqs-error'; d.setAttribute('data-cqs', '1');
    d.textContent = 'Ã¢Å¡Â  ' + msg;
    b.prepend(d);
  }

  function showAnswer(block, result, options, type, aiName) {
    clearBadge(block);
    autoSelect(block, result, type);
    if (type !== 'text') {
      const cls = result.answers.length > 1 ? 'cqs-glow-multi' : 'cqs-glow';
      const targets = block.querySelectorAll('.rc-Option').length
        ? block.querySelectorAll('.rc-Option') : block.querySelectorAll('label');
      [...targets].forEach((el, i) => {
        if (result.answers.includes(String.fromCharCode(65 + i))) el.classList.add(cls);
      });
    }
    const confColor = result.confidence >= 85 ? '#34d399' : result.confidence >= 65 ? '#fbbf24' : '#fc8181';
    const confLabel = result.confidence >= 85 ? 'High' : result.confidence >= 65 ? 'Medium' : 'Low';
    const badge = document.createElement('div');
    badge.className = 'cqs-new-badge'; badge.setAttribute('data-cqs', '1');
    if (type === 'text') {
      const preview = (result.suggestedText || '').slice(0, 220);
      badge.innerHTML = `<div class="cqs-badge-header"><div class="cqs-badge-ai-icon">🤖</div><div class="cqs-badge-ai-name">${aiName.toUpperCase()} — TYPED</div><div class="cqs-badge-spacer"></div><div class="cqs-badge-conf-pill" style="color:${confColor};border-color:${confColor}22"><div class="cqs-dot" style="background:${confColor}"></div>${result.confidence}% ${confLabel}</div></div><div class="cqs-suggested-wrap"><span class="cqs-suggested-label">ANSWER TYPED INTO BOX</span><div class="cqs-suggested-text">${preview}</div></div>`;
    } else {
      const pills = result.answers.map(l => { const idx = l.charCodeAt(0) - 65; return `<div class="cqs-badge-pill"><b>${l}.</b> ${options[idx] || ''}</div>`; }).join('');
      badge.innerHTML = `<div class="cqs-badge-header"><div class="cqs-badge-ai-icon">🤖</div><div class="cqs-badge-ai-name">${aiName.toUpperCase()} — ${result.answers.length > 1 ? 'SELECT ALL' : 'BEST ANSWER'}</div><div class="cqs-badge-spacer"></div><div class="cqs-badge-conf-pill" style="color:${confColor};border-color:${confColor}22"><div class="cqs-dot" style="background:${confColor}"></div>${result.confidence}% ${confLabel}</div></div><div class="cqs-badge-options">${pills}</div>`;
    }
    block.prepend(badge);
  }

  function autoSelect(block, result, type) {
    if (type === 'text') {
      const inp = block.querySelector('input[type="text"],textarea');
      if (!inp) return;
      const answer = result.suggestedText || result.reasoning || '';
      const proto = inp instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(inp, answer); else inp.value = answer;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const inputs = [...block.querySelectorAll('input[type="radio"],input[type="checkbox"]')];
    result.answers.forEach(l => {
      const inp = inputs[l.charCodeAt(0) - 65];
      if (!inp) return;
      if (inp.type === 'radio' || !inp.checked) {
        inp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        inp.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        inp.click();
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Utilities Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function waitFor(fn, maxMs = 8000) {
    return new Promise(resolve => {
      const result = fn(); if (result) { resolve(result); return; }
      const start = Date.now();
      const id = setInterval(() => {
        const r = fn();
        if (r || Date.now() - start > maxMs) { clearInterval(id); resolve(r); }
      }, 300);
    });
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Message listener (popup triggers) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (msg.type === 'TRIGGER_SOLVE_QUIZ') {
      (async () => {
        setStatus('Opening quiz...');
        buildStatusBar('Solving quiz Ã¢â‚¬â€ please wait...', false);
        await clickStartButton();
        await waitFor(() => findBlocks().length > 0, 12000);
        await delay(600);
        const preferredAI = await getPreferredAI();
        const fallbackAI = preferredAI === 'claude' ? 'chatgpt' : 'claude';
        let success = await solveWithWebUI(preferredAI);
        if (!success) {
          setStatus('Falling back to ' + (fallbackAI === 'claude' ? 'Claude' : 'ChatGPT') + '...');
          await delay(2000);
          success = await solveWithWebUI(fallbackAI);
        }
        await checkHonorCode();
        await delay(600);
        // Individual mode: do NOT submit - user reviews and submits
        setStatus('Answers filled! Review and submit yourself');
        buildStatusBar('Answers ready - you submit when ready', true);
      })();
      sendResponse({ ok: true });
    }
    if (msg.type === 'TOGGLE_ENABLED') { /* handled silently */ }
    return true;
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Styles Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function injectStyles() {
    if (document.getElementById('cap-styles')) return;
    const s = document.createElement('style');
    s.id = 'cap-styles';
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      #cap-toolbar {
        position: fixed; bottom: 32px; right: 32px; z-index: 2147483647;
        background: rgba(255,255,255,0.95); backdrop-filter: blur(16px);
        border: 1px solid #e5e7eb; border-radius: 16px;
        padding: 12px 20px; display: flex; align-items: center; gap: 16px;
        font-family: 'Inter', system-ui, sans-serif; font-size: 13.5px; color: #111827;
        box-shadow: 0 12px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
        transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
      }
      #cap-toolbar:hover { transform: translateY(-2px); border-color: rgba(124,58,237,0.3); }
      .cap-logo { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #111827; }
      .cap-logo svg { color: #7c3aed; filter: drop-shadow(0 0 6px rgba(124,58,237,0.2)); }
      .cap-status-wrap { display: flex; flex-direction: column; min-width: 140px; }
      .cap-label { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
      .cap-status-text { color: #4b5563; font-size: 13px; }
      .cap-btn { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 18px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
      .cap-btn-primary { background: #7c3aed!important; color: #fff!important; border: none!important; box-shadow: 0 4px 14px rgba(124,58,237,0.25); }
      .cap-btn-primary:hover { background: #6d28d9!important; box-shadow: 0 6px 20px rgba(124,58,237,0.35); transform: translateY(-1px); }
      .cqs-new-badge { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin: 12px 0; font-family: 'Inter', sans-serif; color: #111827; box-shadow: 0 12px 32px rgba(0,0,0,0.08); animation: cqs-slide-in 0.4s cubic-bezier(0.16,1,0.3,1); }
      @keyframes cqs-slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .cqs-badge-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
      .cqs-badge-ai-icon { width: 30px; height: 30px; background: rgba(124,58,237,0.08); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
      .cqs-badge-ai-name { font-size: 12px; font-weight: 700; color: #4b5563; }
      .cqs-badge-spacer { flex: 1; }
      .cqs-badge-conf-pill { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 4px 10px; border: 1px solid; border-radius: 20px; }
      .cqs-dot { width: 6px; height: 6px; border-radius: 50%; }
      .cqs-badge-options { display: flex; flex-direction: column; gap: 8px; }
      .cqs-badge-pill { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; font-size: 14.5px; color: #111827; line-height: 1.4; }
      .cqs-badge-pill b { color: #7c3aed; font-size: 15px; }
      .cqs-suggested-wrap { background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 10px; padding: 12px; }
      .cqs-suggested-label { display: block; font-size: 10px; font-weight: 700; color: #10b981; margin-bottom: 4px; }
      .cqs-suggested-text { font-size: 14.5px; color: #065f46; font-weight: 500; }
      .cqs-loading { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; color: #4b5563; font-size: 14px; font-weight: 500; margin: 12px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .cqs-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(124,58,237,0.2); border-top-color: #7c3aed; border-radius: 50%; animation: cqs-spin 0.8s linear infinite; }
      @keyframes cqs-spin { to { transform: rotate(360deg); } }
      .cqs-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px 16px; color: #dc2626; font-size: 13px; font-weight: 500; margin: 12px 0; }
      .cqs-glow { box-shadow: 0 0 0 2px #7c3aed, 0 8px 24px rgba(124,58,237,0.25)!important; border-color: #7c3aed!important; background: rgba(124,58,237,0.05)!important; border-radius: 8px!important; }
      .cqs-glow-multi { box-shadow: 0 0 0 2px #10b981, 0 8px 24px rgba(16,185,129,0.25)!important; border-color: #10b981!important; background: rgba(16,185,129,0.05)!important; border-radius: 8px!important; }
    `;
    document.head.appendChild(s);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Run Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1200));
  } else {
    setTimeout(init, 1200);
  }

})();

