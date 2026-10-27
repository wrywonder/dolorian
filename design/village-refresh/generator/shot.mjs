// node shot.mjs [pattern] — screenshot out/*.html to out/png at 2x
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const pat = process.argv[2] ? new RegExp(process.argv[2]) : /./;
mkdirSync('out/png', { recursive: true });
const sizes = {};
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 900 } });
for (const f of readdirSync('out').filter((f) => f.endsWith('.html') && pat.test(f))) {
  await page.goto('file://' + resolve('out', f));
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$('body > div');
  const box = await el.boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
  sizes[f] = [Math.round(box.width), Math.round(box.height)];
  await el.screenshot({ path: `out/png/${f.replace('.html', '.png')}` });
}
await browser.close();
import('node:fs').then(({ writeFileSync }) => writeFileSync('out/sizes.json', JSON.stringify(sizes, null, 1)));
console.log('shot');
