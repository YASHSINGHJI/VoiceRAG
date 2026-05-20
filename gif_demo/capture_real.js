/**
 * capture_real.js — Puppeteer script for the REAL VoiceRAG app at localhost:3000
 * Runs in NON-headless mode so it can reach localhost.
 */

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const FRAMES_DIR = path.join(__dirname, 'frames');
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR);

// Clean old frames
fs.readdirSync(FRAMES_DIR).forEach(f => {
  try { fs.unlinkSync(path.join(FRAMES_DIR, f)); } catch(_) {}
});

const BASE_URL = 'http://localhost:3000';

let frameIdx = 0;

async function shot(page, count = 1) {
  for (let i = 0; i < count; i++) {
    const name = String(frameIdx).padStart(4, '0');
    await page.screenshot({ path: path.join(FRAMES_DIR, `frame_${name}.png`), type: 'png' });
    frameIdx++;
  }
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function smoothMove(page, fromX, fromY, toX, toY, steps = 20) {
  for (let i = 0; i <= steps; i++) {
    const t    = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const x    = fromX + (toX - fromX) * ease;
    const y    = fromY + (toY - fromY) * ease;
    await page.mouse.move(x, y);
    if (i % 4 === 0) await shot(page);
    await wait(30);
  }
}

async function navTo(page, route, waitMs = 800) {
  await page.goto(BASE_URL + route, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await wait(waitMs);
}

async function clickNav(page, label) {
  // Click a nav link by its text
  await page.evaluate((lbl) => {
    const links = [...document.querySelectorAll('.nav-link, nav a, nav li a')];
    const el = links.find(l => l.textContent.trim().toLowerCase().includes(lbl.toLowerCase()));
    if (el) el.click();
  }, label);
  await wait(700);
}

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: null,
    args: [
      '--window-size=1280,720',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Grant mic
  const ctx = browser.defaultBrowserContext();
  await ctx.overridePermissions(BASE_URL, ['microphone']).catch(() => {});

  // ── SCENE 1: Landing ────────────────────────────────────────────────────────
  console.log('Scene 1: Landing');
  await navTo(page, '/', 3000);      // extra wait for Spline 3D
  await shot(page, 10);

  // Hover CTA button
  try {
    const cta = await page.$('.landing-liquid-btn, button[class*="liquid"], .hero-cta');
    if (cta) { await cta.hover(); await shot(page, 4); }
  } catch (_) {}

  // Hover each stat chip
  const chips = await page.$$('.stat-chip');
  for (const chip of chips) {
    await chip.hover().catch(() => {});
    await shot(page, 3);
    await wait(120);
  }

  // Sweep over 3D right side
  await smoothMove(page, 280, 380, 950, 360, 18);

  // ── SCENE 2: Chat ───────────────────────────────────────────────────────────
  console.log('Scene 2: Chat');
  await navTo(page, '/chat', 600);
  await shot(page, 6);

  // Hover sidebar items
  const sideItems = await page.$$('.sidebar-item, [class*="LectureSidebar"] li, [class*="sidebar"] li');
  for (const item of sideItems.slice(0, 7)) {
    await item.hover().catch(() => {});
    await shot(page, 2);
    await wait(110);
  }

  // Hover voice button
  try {
    const voiceBtn = await page.$('#voice-btn');
    if (voiceBtn) {
      await voiceBtn.hover();
      await shot(page, 3);
    }
  } catch (_) {}

  // Type question into chat input
  const chatInput = await page.$('#chat-input, .chat-text-input, textarea[placeholder*="Ask"]');
  if (chatInput) {
    await chatInput.click();
    const question = 'What is backpropagation in neural networks?';
    for (const ch of question) {
      await page.keyboard.type(ch);
      if (frameIdx % 5 === 0) await shot(page);
      await wait(28);
    }
    await shot(page, 3);

    // Submit with Enter
    await page.keyboard.press('Enter');
    await shot(page, 3);
    await wait(400);
    await shot(page, 5);  // typing dots

    // Wait up to 25s for streaming response to finish
    console.log('  Waiting for Gemini response...');
    for (let t = 0; t < 250; t++) {
      await wait(100);
      if (t % 4 === 0) await shot(page);
      const done = await page.evaluate(() => {
        // done when src-toggle appears OR tw-cursor disappears
        const toggle = document.querySelector('.src-toggle');
        const cursor = document.querySelector('.tw-cursor');
        return !!toggle || (!cursor && !!document.querySelector('.msg.bot .msg-text'));
      });
      if (done && t > 30) break;
    }
    await shot(page, 6);

    // Click "Show sources"
    try {
      const srcBtn = await page.$('.src-toggle');
      if (srcBtn) {
        await srcBtn.hover();
        await shot(page, 2);
        await srcBtn.click();
        await wait(400);
        await shot(page, 7);
      }
    } catch (_) {}
  }

  // ── SCENE 3: Knowledge Base ─────────────────────────────────────────────────
  console.log('Scene 3: Knowledge Base');
  await navTo(page, '/knowledge', 1500);
  await shot(page, 6);

  // Hover first few cards
  const kbCards = await page.$$('.kb-card');
  for (const card of kbCards.slice(0, 5)) {
    await card.hover().catch(() => {});
    await shot(page, 3);
    await wait(130);
  }

  // Click first card to expand
  if (kbCards[0]) {
    const hdr = await kbCards[0].$('.kb-card-header');
    await (hdr || kbCards[0]).click().catch(() => {});
    await wait(500);
    await shot(page, 5);
  }

  // Click 3rd card
  if (kbCards[2]) {
    const hdr = await kbCards[2].$('.kb-card-header');
    await (hdr || kbCards[2]).click().catch(() => {});
    await wait(500);
    await shot(page, 5);
  }

  // Type in search bar
  const kbSearch = await page.$('.kb-search, input[placeholder*="Search lecture"], input[placeholder*="search"]');
  if (kbSearch) {
    await kbSearch.click();
    await wait(150);
    await kbSearch.type('Neural', { delay: 80 });
    await wait(300);
    await shot(page, 4);
    await kbSearch.type(' Networks', { delay: 80 });
    await wait(300);
    await shot(page, 5);
    // clear
    await kbSearch.click({ clickCount: 3 });
    await page.keyboard.press('Delete');
    await wait(200);
    await shot(page, 3);
  }

  // ── SCENE 4: Search Explorer ────────────────────────────────────────────────
  console.log('Scene 4: Search Explorer');
  await navTo(page, '/search', 600);
  await shot(page, 5);

  const seInput = await page.$('#search-input, .se-input');
  if (seInput) {
    await seInput.click({ clickCount: 3 });
    await wait(100);
    await seInput.type('attention mechanism transformer', { delay: 40 });
    await shot(page, 3);

    const seBtn = await page.$('#search-submit-btn, .se-submit');
    if (seBtn) {
      await seBtn.hover();
      await shot(page, 2);
      await seBtn.click();
      await shot(page, 2);
      await wait(400);
      await shot(page, 3);

      console.log('  Waiting for search results...');
      for (let t = 0; t < 80; t++) {
        await wait(150);
        const done = await page.$('.result-card');
        if (done) break;
      }
      await wait(300);
      await shot(page, 8);

      // Hover result cards
      const resultCards = await page.$$('.result-card');
      for (const rc of resultCards.slice(0, 4)) {
        await rc.hover().catch(() => {});
        await shot(page, 3);
        await wait(130);
      }
    }
  }

  // ── SCENE 5: Analytics ──────────────────────────────────────────────────────
  console.log('Scene 5: Analytics');
  await navTo(page, '/analytics', 1500);
  await shot(page, 6);

  const statCards = await page.$$('.stat-card');
  for (const sc of statCards) {
    await sc.hover().catch(() => {});
    await shot(page, 3);
    await wait(130);
  }

  const chartCards = await page.$$('.chart-card');
  for (const cc of chartCards.slice(0, 3)) {
    await cc.hover().catch(() => {});
    await shot(page, 3);
    await wait(130);
  }

  // Sweep over the wide bar chart
  await smoothMove(page, 180, 440, 1080, 440, 18);

  // ── SCENE 6: Theme toggle ───────────────────────────────────────────────────
  console.log('Scene 6: Theme toggle');
  const themeBtn = await page.$('#theme-toggle-btn, .nav-theme-btn, [aria-label="Toggle theme"]');
  if (themeBtn) {
    await themeBtn.hover();
    await shot(page, 3);
    await themeBtn.click();   // → Light
    await wait(600);
    await shot(page, 8);

    // Landing in light mode
    await navTo(page, '/', 1200);
    await shot(page, 6);

    await themeBtn.click();   // → Dark
    await wait(500);
    await shot(page, 5);
  }

  // ── SCENE 7: Landing loop point ─────────────────────────────────────────────
  console.log('Scene 7: Return to Landing');
  await navTo(page, '/', 1200);
  await shot(page, 8);

  console.log(`\nCaptured ${frameIdx} frames`);
  await browser.close();
})();
