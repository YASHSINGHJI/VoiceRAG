const puppeteer = require('puppeteer');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

const BUILD_DIR = path.resolve(__dirname, '..', 'frontend', 'build');
const PORT      = 4321;

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

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/VoiceRAG')) {
    urlPath = urlPath.substring('/VoiceRAG'.length);
  }
  let filePath = path.join(BUILD_DIR, urlPath);
  console.log('REQ:', req.url, '-> Path:', filePath, 'Exists:', fs.existsSync(filePath));

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  const ext  = path.extname(filePath);
  const mime = mimeMap[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, '127.0.0.1', async () => {
  console.log(`Server started on http://localhost:${PORT}`);
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));

    console.log('Navigating...');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    console.log('Title:', await page.title());
    
    // Take a quick screenshot to check
    await page.screenshot({ path: path.join(__dirname, 'test_shot.png') });
    console.log('Screenshot taken: test_shot.png');
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer error:', err);
  } finally {
    server.close();
  }
});
