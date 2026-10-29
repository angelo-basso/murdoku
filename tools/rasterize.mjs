import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Rasterise les SVG sources en PNG (favicon, icônes PWA/Apple, sources Capacitor).
const ROOT = fileURLToPath(new URL('../', import.meta.url));

const jobs = [
  { src: 'src/assets/icon/master-icon.svg', w: 48,  out: 'src/assets/icon/favicon.png' },
  { src: 'src/assets/icon/master-icon.svg', w: 180, out: 'src/assets/icon/apple-touch-icon.png' },
  { src: 'src/assets/icon/master-icon.svg', w: 192, out: 'src/assets/icon/icon-192.png' },
  { src: 'src/assets/icon/master-icon.svg', w: 512, out: 'src/assets/icon/icon-512.png' },
  { src: 'assets/maskable-icon.svg',        w: 512, out: 'src/assets/icon/maskable-512.png' },
  { src: 'src/assets/icon/master-icon.svg', w: 1024, out: 'assets/icon-only.png' },
  { src: 'assets/icon-foreground.svg',      w: 1024, out: 'assets/icon-foreground.png', transparent: true },
  { src: 'assets/icon-background.svg',       w: 1024, out: 'assets/icon-background.png' },
  { src: 'assets/splash.svg',               w: 2732, out: 'assets/splash.png' },
  { src: 'assets/splash.svg',               w: 2732, out: 'assets/splash-dark.png' },
];

(async () => {
  const browser = await chromium.launch();
  for (const j of jobs) {
    const svg = readFileSync(ROOT + j.src, 'utf8');
    const h = j.h || j.w;
    const page = await browser.newPage({ viewport: { width: j.w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:${j.w}px;height:${h}px;overflow:hidden}svg{display:block;width:${j.w}px;height:${h}px}</style>${svg}`,
      { waitUntil: 'networkidle' }
    );
    await page.screenshot({ path: ROOT + j.out, omitBackground: !!j.transparent, clip: { x: 0, y: 0, width: j.w, height: h } });
    await page.close();
    console.log(j.out);
  }
  await browser.close();
})();
