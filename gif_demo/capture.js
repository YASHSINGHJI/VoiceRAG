/**
 * capture.js — Puppeteer script that:
 *  1. Opens the demo.html in a 1280×720 headless browser
 *  2. Navigates through all pages, triggering hover & click interactions
 *  3. Takes ~120 screenshots → frames/frame_NNNN.png
 */

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const FRAMES_DIR = path.join(__dirname, 'frames');
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR);

const DEMO_FILE = 'file:///' + path.join(__dirname, 'demo.html').replace(/\\/g, '/');

let frameIdx = 0;

async function shot(page, count = 1) {
  for (let i = 0; i < count; i++) {
    const name = String(frameIdx).padStart(4, '0');
    await page.screenshot({ path: path.join(FRAMES_DIR, `frame_${name}.png`) });
    frameIdx++;
  }
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function smoothMove(page, fromX, fromY, toX, toY, steps = 20) {
  for (let i = 0; i <= steps; i++) {
    const x = fromX + (toX - fromX) * (i / steps);
    const y = fromY + (toY - fromY) * (i / steps);
    await page.mouse.move(x, y);
    await wait(30);
  }
}

async function clickNav(page, dataPage) {
  await page.evaluate((dp) => {
    document.querySelector(`.nav-link[data-page="${dp}"]`).click();
  }, dataPage);
  await wait(300);
}

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--allow-file-access-from-files'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Opening demo...');
  await page.goto(DEMO_FILE, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await wait(1500);

  // ── SCENE 1: Landing page ─────────────────────────────────────────────────
  console.log('Scene 1: Landing');
  await shot(page, 8); // hold on landing

  // Hover over CTA button
  await smoothMove(page, 640, 360, 260, 430, 15);
  await shot(page, 4);

  // Hover over stat chips
  await smoothMove(page, 260, 430, 135, 500, 10);
  await shot(page, 3);
  await smoothMove(page, 135, 500, 195, 500, 8);
  await shot(page, 3);
  await smoothMove(page, 195, 500, 265, 500, 8);
  await shot(page, 3);
  await smoothMove(page, 265, 500, 345, 500, 8);
  await shot(page, 3);

  // Hover over 3D robot
  await smoothMove(page, 345, 500, 960, 360, 20);
  await shot(page, 4);

  // ── SCENE 2: Chat page ────────────────────────────────────────────────────
  console.log('Scene 2: Chat');
  await clickNav(page, 'chat');
  await shot(page, 5);

  // Hover sidebar items
  await smoothMove(page, 960, 360, 120, 160, 20);
  await shot(page, 2);
  for (let i = 0; i < 6; i++) {
    await smoothMove(page, 120, 160 + i * 42, 120, 202 + i * 42, 5);
    await shot(page, 2);
    await wait(80);
  }

  // Click "Neural Networks" lecture in sidebar (#6)
  await page.evaluate(() => {
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach(el => el.classList.remove('active'));
    items[5].classList.add('active');
  });
  await shot(page, 2);

  // Hover the voice button
  await smoothMove(page, 120, 370, 1205, 680, 25);
  await shot(page, 3);

  // Trigger voice input
  await page.evaluate(() => { triggerVoice(); });
  await shot(page, 3);
  await wait(400);
  await shot(page, 4);
  await wait(400);
  await shot(page, 4);
  await wait(400);
  await shot(page, 4);
  await wait(400);
  await shot(page, 3);

  // Trigger send
  await page.evaluate(() => { triggerSend(); });
  await shot(page, 3);
  await wait(600);
  await shot(page, 5); // typing dots
  await wait(1000);
  await shot(page, 5); // typewriter start
  await wait(600);
  await shot(page, 5); // mid-typewriter
  await wait(600);
  await shot(page, 4); // source chips appear
  await wait(300);
  await shot(page, 4);

  // Hover source chips
  await smoothMove(page, 640, 600, 490, 640, 10);
  await shot(page, 3);

  // ── SCENE 3: Knowledge Base ───────────────────────────────────────────────
  console.log('Scene 3: Knowledge Base');
  await clickNav(page, 'knowledge');
  await shot(page, 5);

  // Hover cards
  await smoothMove(page, 490, 640, 380, 250, 20);
  await shot(page, 3);
  await smoothMove(page, 380, 250, 900, 250, 15);
  await shot(page, 3);

  // Click to expand card #10 (Neural Networks)
  await page.evaluate(() => { toggleKB(10); });
  await wait(200);
  await shot(page, 6);

  // Type in search bar
  await page.focus('#kbSearch');
  await page.evaluate(() => {
    const el = document.getElementById('kbSearch');
    el.value = 'Neural';
    el.dispatchEvent(new Event('input'));
  });
  await wait(200);
  await shot(page, 4);

  await page.evaluate(() => {
    const el = document.getElementById('kbSearch');
    el.value = 'Neural Networks';
    el.dispatchEvent(new Event('input'));
  });
  await wait(200);
  await shot(page, 4);

  // Clear search
  await page.evaluate(() => {
    const el = document.getElementById('kbSearch');
    el.value = '';
    el.dispatchEvent(new Event('input'));
  });
  await wait(200);
  await shot(page, 3);

  // ── SCENE 4: Search Explorer ──────────────────────────────────────────────
  console.log('Scene 4: Search Explorer');
  await clickNav(page, 'search');
  await shot(page, 5);

  // Hover input bar
  await smoothMove(page, 900, 400, 600, 200, 15);
  await shot(page, 3);

  // Trigger search
  await page.evaluate(() => { triggerSearch(); });
  await shot(page, 4);
  await wait(800);
  await shot(page, 5); // "Searching..." state
  await wait(700);
  await shot(page, 8); // results appear

  // Hover result cards
  await smoothMove(page, 600, 200, 640, 320, 12);
  await shot(page, 3);
  await smoothMove(page, 640, 320, 640, 430, 10);
  await shot(page, 3);
  await smoothMove(page, 640, 430, 640, 540, 10);
  await shot(page, 3);

  // ── SCENE 5: Analytics ───────────────────────────────────────────────────
  console.log('Scene 5: Analytics');
  await clickNav(page, 'analytics');
  await shot(page, 5);

  // Hover stat cards
  await smoothMove(page, 640, 540, 170, 220, 15);
  await shot(page, 3);
  await smoothMove(page, 170, 220, 480, 220, 10);
  await shot(page, 3);
  await smoothMove(page, 480, 220, 800, 220, 10);
  await shot(page, 3);
  await smoothMove(page, 800, 220, 1100, 220, 10);
  await shot(page, 3);

  // Hover chart cards
  await smoothMove(page, 1100, 220, 640, 420, 15);
  await shot(page, 4);
  await smoothMove(page, 640, 420, 300, 560, 12);
  await shot(page, 4);
  await smoothMove(page, 300, 560, 960, 560, 12);
  await shot(page, 4);

  // ── SCENE 6: Dark/Light toggle ────────────────────────────────────────────
  console.log('Scene 6: Theme toggle');
  await smoothMove(page, 960, 560, 1245, 28, 20);
  await shot(page, 3);
  await page.evaluate(() => { toggleTheme(); }); // → light
  await shot(page, 5);
  await wait(400);
  await shot(page, 3);
  await page.evaluate(() => { toggleTheme(); }); // → dark
  await shot(page, 5);

  // ── SCENE 7: Back to Landing (loop) ──────────────────────────────────────
  console.log('Scene 7: Return to landing');
  await clickNav(page, 'landing');
  await shot(page, 6);

  console.log(`\n✅ Captured ${frameIdx} frames → frames/`);
  await browser.close();
})();
