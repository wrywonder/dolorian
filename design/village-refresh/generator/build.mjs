import { writeFileSync, mkdirSync } from 'node:fs';
import { fontFaces } from './lib/fonts.mjs';
import * as oldS from './lib/old.mjs';
let newS = {};
try { newS = await import('./lib/new.mjs?' + Date.now()); } catch (e) { if (!String(e).includes('Cannot find module')) throw e; }
mkdirSync('out', { recursive: true });
const page = (title, body, bg = '#E9E2D6') => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${fontFaces()}\nbody{margin:0;background:${bg};-webkit-font-smoothing:antialiased}*{box-sizing:border-box}</style></head><body>${body}</body></html>`;
const screens = ['buzz', 'plans', 'you', 'signin'];
const which = process.argv[2];
for (const s of screens) {
  if (oldS[s]) writeFileSync(`out/before-${s}.html`, page(`before ${s}`, oldS[s]()));
  if (newS[s]) writeFileSync(`out/after-${s}.html`, page(`after ${s}`, newS[s]()));
  if (newS[s + 'Dark']) writeFileSync(`out/after-${s}-dark.html`, page(`after ${s} dark`, newS[s + 'Dark']()));
}
const walk = await import('./lib/walk.mjs?' + Date.now());
for (const extra of Object.keys(walk).filter((k) => k.startsWith('board_'))) writeFileSync(`out/${extra}.html`, page(extra, walk[extra](), '#F3EEE6'));
console.log('built');
// tall variants for inspecting below-the-fold content
if (process.env.TALL) {
  for (const s of screens) for (const [mod, tag] of [[newS, 'after'], [oldS, 'before']]) {
    if (!mod[s]) continue;
    const html = mod[s]().replace('height:844px;', 'min-height:844px;padding-bottom:140px;box-sizing:border-box;');
    writeFileSync(`out/tall-${tag}-${s}.html`, page(`tall ${s}`, html));
  }
}
