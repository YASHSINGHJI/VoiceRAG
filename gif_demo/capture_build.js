/**
 * capture_build.js
 * 
 * Spins up a static file server for frontend/build,
 * then runs Puppeteer (headless) against it to capture the real built UI.
 * Intercepts all API calls to serve beautiful mock data so that
 * the full flow works smoothly and looks incredibly real!
 */

const puppeteer = require('puppeteer');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

// ── Static file server ────────────────────────────────────────────────────────
const BUILD_DIR = path.resolve(__dirname, '..', 'frontend', 'build');
const PORT      = 4321;

function serveBuild() {
  const mimeMap = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
  };

  return http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    
    // Strip base path prefix if present
    if (urlPath.startsWith('/VoiceRAG')) {
      urlPath = urlPath.substring('/VoiceRAG'.length);
    }
    if (urlPath === '') {
      urlPath = '/';
    }

    let filePath = path.join(BUILD_DIR, urlPath);

    // SPA fallback: if file doesn't exist, serve index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(BUILD_DIR, 'index.html');
    }

    const ext  = path.extname(filePath);
    const mime = mimeMap[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    } catch (_) {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(PORT, '127.0.0.1', () => {
    console.log(`Static server: http://localhost:${PORT}`);
  });
}

// ── Frame capture helpers ────────────────────────────────────────────────────
const FRAMES_DIR = path.join(__dirname, 'frames');
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR);
fs.readdirSync(FRAMES_DIR).forEach(f => {
  try { fs.unlinkSync(path.join(FRAMES_DIR, f)); } catch (_) {}
});

let frameIdx = 0;

async function shot(page, count = 1) {
  for (let i = 0; i < count; i++) {
    const name = String(frameIdx).padStart(4, '0');
    await page.screenshot({ path: path.join(FRAMES_DIR, `frame_${name}.png`) });
    frameIdx++;
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function smoothMove(page, x1, y1, x2, y2, steps = 18) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    await page.mouse.move(x1 + (x2-x1)*e, y1 + (y2-y1)*e);
    if (i % 3 === 0) await shot(page);
    await wait(28);
  }
}

async function goto(page, route, ms = 900) {
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await wait(ms);
}

async function clickNav(page, label, ms = 1200) {
  console.log(`Clicking nav link: ${label}`);
  await page.evaluate((lbl) => {
    const links = Array.from(document.querySelectorAll('.fh-link, nav a'));
    const link = links.find(l => l.textContent.trim().toLowerCase().includes(lbl.toLowerCase()));
    if (link) {
      link.click();
    } else {
      console.error(`Nav link not found for: ${lbl}`);
    }
  }, label);
  await wait(ms);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const server = serveBuild();
  await wait(600);

  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Enable Request Interception to Mock APIs
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const url = req.url();
    if (url.includes('/api/query/stream')) {
      console.log('Mocking Chat Stream API...');
      const mockSources = JSON.stringify([
        { video_number: 2, video_title: "Neural Networks & Backpropagation", score: 0.895, start: 142.0, end: 198.5, preview: "Backpropagation is the algorithm used to train neural networks by computing gradients of the loss function..." },
        { video_number: 5, video_title: "Attention Mechanisms & Transformers", score: 0.821, start: 88.2, end: 144.7, preview: "In deep learning, backpropagation through time is a variant used for recurrent networks..." }
      ]);
      const mockAnswer = "Backpropagation is the key algorithm that makes training deep neural networks computationally feasible. It calculates the gradient of the loss function with respect to the weights of the network using the chain rule, propagating errors backward from the output layer to the input.";
      
      let responseBody = '';
      responseBody += `event: sources\ndata: ${mockSources}\n\n`;
      
      const tokens = mockAnswer.split(' ');
      for (const token of tokens) {
        responseBody += `event: token\ndata: ${JSON.stringify(token + ' ')}\n\n`;
      }
      responseBody += `event: done\ndata: ${JSON.stringify(mockAnswer)}\n\n`;

      await req.respond({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'access-control-allow-origin': '*'
        },
        body: responseBody
      });
    } else if (url.includes('/api/search')) {
      console.log('Mocking Search API...');
      const mockResults = {
        results: [
          { video_number: 5, video_title: "Attention Mechanisms & Transformers", score: 0.942, start: 305.0, end: 350.5, text: "The attention mechanism in transformers allows the model to dynamically focus on different parts of the input sequence. By calculating queries, keys, and values, self-attention maps dependencies regardless of distance." },
          { video_number: 12, video_title: "Attention mechanisms & Seq2Seq", score: 0.815, start: 120.0, end: 165.2, text: "In sequence-to-sequence models, the attention mechanism resolves the bottleneck of fixed-length context vectors by passing all encoder hidden states to the decoder." },
          { video_number: 3, video_title: "Introduction to Deep Learning", score: 0.638, start: 450.0, end: 490.0, text: "Neural network layers learn hierarchical representations. Early layers capture edges, while deeper layers learn complex concepts." }
        ]
      };
      await req.respond({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify(mockResults)
      });
    } else if (url.includes('/api/lectures') && url.includes('/chunks')) {
      console.log('Mocking Lecture Chunks API...');
      const mockChunks = {
        total: 3,
        page: 1,
        limit: 20,
        chunks: [
          { start: 12.0, end: 45.0, text: "This lecture covers the fundamentals of gradient descent and how weights are adjusted." },
          { start: 45.0, end: 90.0, text: "We will formalize the partial derivatives and the backward pass equations." },
          { start: 90.0, end: 140.0, text: "Finally, we discuss learning rate scheduling and momentum techniques." }
        ]
      };
      await req.respond({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify(mockChunks)
      });
    } else if (url.includes('/api/lectures')) {
      console.log('Mocking Lectures List API...');
      const mockLectures = [
        { video_number: 1, video_title: "1. Introduction to Deep Learning", chunk_count: 48, duration_seconds: 3600.0 },
        { video_number: 2, video_title: "2. Neural Networks & Backpropagation", chunk_count: 52, duration_seconds: 3900.0 },
        { video_number: 3, video_title: "3. Convolutional Neural Networks", chunk_count: 45, duration_seconds: 3400.0 },
        { video_number: 4, video_title: "4. Recurrent Neural Networks", chunk_count: 42, duration_seconds: 3150.0 },
        { video_number: 5, video_title: "5. Attention Mechanisms & Transformers", chunk_count: 60, duration_seconds: 4500.0 },
        { video_number: 6, video_title: "6. Generative Adversarial Networks", chunk_count: 38, duration_seconds: 2850.0 }
      ];
      await req.respond({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify(mockLectures)
      });
    } else if (url.includes('/api/analytics')) {
      console.log('Mocking Analytics API...');
      const mockAnalytics = {
        total_queries: 42,
        avg_score: 0.842,
        lectures: [
          { video_number: 1, video_title: "1. Introduction to Deep Learning", chunk_count: 48 },
          { video_number: 2, video_title: "2. Neural Networks & Backpropagation", chunk_count: 52 },
          { video_number: 3, video_title: "3. Convolutional Neural Networks", chunk_count: 45 },
          { video_number: 4, video_title: "4. Recurrent Neural Networks", chunk_count: 42 },
          { video_number: 5, video_title: "5. Attention Mechanisms & Transformers", chunk_count: 60 }
        ],
        query_log: [
          { idx: 1, question: "What is backpropagation?", avg_score: 0.885, timestamp: "2026-05-20T12:00:00" },
          { idx: 2, question: "How do attention mechanisms work?", avg_score: 0.912, timestamp: "2026-05-20T12:05:00" },
          { idx: 3, question: "Explain CNN pooling layers", avg_score: 0.784, timestamp: "2026-05-20T12:10:00" }
        ],
        most_queried: [
          { video_title: "5. Attention Mechanisms & Transformers", hits: 18 },
          { video_title: "2. Neural Networks & Backpropagation", hits: 12 },
          { video_title: "1. Introduction to Deep Learning", hits: 8 },
          { video_title: "3. Convolutional Neural Networks", hits: 4 }
        ],
        score_history: [
          { idx: 1, score: 0.885, timestamp: "2026-05-20T12:00:00" },
          { idx: 2, score: 0.912, timestamp: "2026-05-20T12:05:00" },
          { idx: 3, score: 0.784, timestamp: "2026-05-20T12:10:00" }
        ]
      };
      await req.respond({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify(mockAnalytics)
      });
    } else {
      await req.continue();
    }
  });

  // ── SCENE 1: Landing ──────────────────────────────────────────────────────
  console.log('Scene 1: Landing');
  await goto(page, '/', 3500); // Allow extra time for Spline / glow / landing scripts to fully settle
  await shot(page, 8);

  // Hover CTA
  try {
    const cta = await page.$('.landing-liquid-btn, button[class*="liquid"]');
    if (cta) { 
      await cta.hover(); 
      await shot(page, 4); 
    }
  } catch (_) {}

  // Hover stat chips
  const chips = await page.$$('.stat-chip');
  for (const c of chips) {
    await c.hover().catch(() => {});
    await shot(page, 2);
    await wait(100);
  }

  // Sweep over right (3D robot side)
  await smoothMove(page, 280, 380, 960, 360, 15);
  await shot(page, 2);

  // ── SCENE 2: Chat ─────────────────────────────────────────────────────────
  console.log('Scene 2: Chat');
  await clickNav(page, 'Chat', 1200);
  await shot(page, 6);

  // Hover sidebar items
  const sideItems = await page.$$('.sidebar-item, [class*="sidebar-item"]');
  for (const item of sideItems.slice(0, 5)) {
    await item.hover().catch(() => {});
    await shot(page, 2);
    await wait(100);
  }

  // Click a sidebar item to highlight
  if (sideItems[2]) {
    await sideItems[2].click().catch(() => {});
    await wait(300);
    await shot(page, 3);
  }

  // Hover voice button
  const voiceBtn = await page.$('#voice-btn, .chat-voice-btn');
  if (voiceBtn) {
    await voiceBtn.hover();
    await shot(page, 2);
  }

  // Type question
  const chatInput = await page.$('#chat-input, .chat-text-input, textarea');
  if (chatInput) {
    await chatInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await wait(100);
    const q = 'What is backpropagation in neural networks?';
    for (const ch of q) {
      await page.keyboard.type(ch);
      if (frameIdx % 4 === 0) await shot(page);
      await wait(25);
    }
    await shot(page, 3);
    await page.keyboard.press('Enter');
    await shot(page, 2);
    await wait(300);
    await shot(page, 4); // typing dots/loading state

    // Wait for the mock stream to complete rendering
    await wait(2500);
    await shot(page, 6);

    // Expand sources if available
    try {
      const srcToggle = await page.$('.src-toggle, button[class*="sources"]');
      if (srcToggle) {
        await srcToggle.hover();
        await shot(page, 2);
        await srcToggle.click();
        await wait(600);
        await shot(page, 6); // show sources card list
      }
    } catch (_) {}
  }

  // ── SCENE 3: Knowledge Base ───────────────────────────────────────────────
  console.log('Scene 3: Knowledge Base');
  await clickNav(page, 'Knowledge Base', 1500);
  await shot(page, 6);

  const kbCards = await page.$$('.kb-card, [class*="kb-card"]');
  for (const card of kbCards.slice(0, 4)) {
    await card.hover().catch(() => {});
    await shot(page, 2);
    await wait(100);
  }

  // Click to expand first card
  if (kbCards[0]) {
    const hdr = await kbCards[0].$('.kb-card-header, [class*="header"]');
    await (hdr || kbCards[0]).click().catch(() => {});
    await wait(500);
    await shot(page, 4);
  }
  // Click to expand third card
  if (kbCards[2]) {
    const hdr = await kbCards[2].$('.kb-card-header, [class*="header"]');
    await (hdr || kbCards[2]).click().catch(() => {});
    await wait(500);
    await shot(page, 4);
  }

  // Search filter inside Knowledge Base
  const kbSearch = await page.$('.search-input-el');
  if (kbSearch) {
    await kbSearch.click();
    await kbSearch.type('Neural', { delay: 60 });
    await wait(200);
    await shot(page, 3);
    await kbSearch.type(' Networks', { delay: 60 });
    await wait(300);
    await shot(page, 4);
    
    // Clear search
    await kbSearch.click({ clickCount: 3 });
    await page.keyboard.press('Delete');
    await wait(200);
    await shot(page, 3);
  }

  // ── SCENE 4: Search Explorer ──────────────────────────────────────────────
  console.log('Scene 4: Search Explorer');
  await clickNav(page, 'Search', 1000);
  await shot(page, 5);

  const seInput = await page.$('#search-input, .se-input, input[placeholder*="concept"]');
  if (seInput) {
    await seInput.click({ clickCount: 3 });
    await wait(100);
    await seInput.type('attention mechanism transformer', { delay: 40 });
    await shot(page, 3);

    const seBtn = await page.$('#search-submit-btn, .se-submit, button[class*="submit"]');
    if (seBtn) {
      await seBtn.hover();
      await shot(page, 2);
      await seBtn.click();
      await shot(page, 2);
      await wait(800); // Wait for mock search response
      await shot(page, 6);

      // Hover result cards
      const resultCards = await page.$$('.result-card, [class*="result-card"]');
      for (const rc of resultCards.slice(0, 3)) {
        await rc.hover().catch(() => {});
        await shot(page, 2);
        await wait(100);
      }
    }
  }

  // ── SCENE 5: Analytics ────────────────────────────────────────────────────
  console.log('Scene 5: Analytics');
  await clickNav(page, 'Analytics', 1800); // Allow extra time for Recharts animation
  await shot(page, 6);

  const statCards = await page.$$('.stat-card, [class*="stat-card"]');
  for (const sc of statCards) {
    await sc.hover().catch(() => {});
    await shot(page, 2);
    await wait(100);
  }

  const chartCards = await page.$$('.chart-card, [class*="chart-card"]');
  for (const cc of chartCards.slice(0, 2)) {
    await cc.hover().catch(() => {});
    await shot(page, 2);
    await wait(100);
  }

  await smoothMove(page, 180, 430, 1100, 430, 15);
  await shot(page, 3);

  // ── SCENE 6: Theme toggle ─────────────────────────────────────────────────
  console.log('Scene 6: Theme toggle');
  const themeBtn = await page.$('button[aria-label="Toggle theme"], .nav-theme-btn');
  if (themeBtn) {
    await themeBtn.hover();
    await shot(page, 2);
    await themeBtn.click();
    await wait(800); // Wait for transition to light mode
    await shot(page, 6);

    // Transition to Home in light mode
    await clickNav(page, 'Home', 1200);
    await shot(page, 5);

    // Toggle theme back to Dark mode
    await themeBtn.hover();
    await themeBtn.click();
    await wait(800); // Wait for transition to dark mode
    await shot(page, 5);
  }

  // ── SCENE 7: Landing (loop) ───────────────────────────────────────────────
  console.log('Scene 7: Return to Landing');
  await clickNav(page, 'Home', 1200);
  await shot(page, 6);

  console.log(`\nCaptured ${frameIdx} frames`);
  await browser.close();
  server.close();
})();
