import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
mkdirSync('../ds/png', { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1.5, viewport: { width: 1000, height: 800 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
for (const f of readdirSync('../ds/check').filter((f) => f.endsWith('.html'))) {
  await p.goto('file://' + resolve('../ds/check', f)); await p.evaluate(() => document.fonts.ready);
  await (await p.$('#frame')).screenshot({ path: `../ds/png/${f.replace('.html', '.png')}` });
}
await b.close(); console.log('errors:', errs.length, errs.slice(0, 5));
