// node ds-build.mjs — writes ../ds/project/** (the Village design system files)
// and ../ds/check/*.html (local harness pages that load tokens.css + bundle.css).
import { writeFileSync, mkdirSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tokensJson, tokensCss, type } from './ds-tokens.mjs';
import { bundleCss, components, coverHtml } from './ds-components.mjs';
import { icon, sparkle, squiggle, handArrow } from './lib/icons.mjs';

const OUT = '../ds';
const P = (p) => join(OUT, 'project', p);
rmSync(OUT, { recursive: true, force: true });
const w = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); };

w(P('README.md'), readFileSync('ds-docs/README.md', 'utf8'));
w(P('01-what-changed.md'), readFileSync('ds-docs/what-changed.md', 'utf8'));
w(P('02-current-system.md'), readFileSync('ds-docs/current-system.md', 'utf8'));
w(P('03-implementing.md'), readFileSync('ds-docs/implementing.md', 'utf8'));
w(P('tokens.json'), JSON.stringify(tokensJson(), null, 2) + '\n');
w(P('tokens.css'), tokensCss());
for (const f of type.fonts) { mkdirSync(dirname(P(f.file)), { recursive: true }); copyFileSync(join('fonts', f.file.replace('fonts/', '')), P(f.file)); }
w(P('components/bundle.css'), bundleCss);
for (const c of components) {
  w(P(`components/${c.name}/README.md`), c.readme + '\n');
  w(P(`components/${c.name}/preview.html`), `<!-- @dsCard group="${c.group}" height=${c.height} -->\n<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${c.name} — preview</title></head>\n<body>\n${c.body}\n</body>\n</html>\n`);
}
w(P('components/Cover/preview.html'), coverHtml);

// assets: text READMEs are files; the images are uploads (sent separately)
const ICONS = ['feed', 'feed.fill', 'map.pin', 'map.pin.fill', 'calendar', 'calendar.fill', 'person', 'person.fill', 'plus', 'heart', 'bubble', 'camera', 'search', 'pencil', 'chevron.right', 'chevron.left', 'chevron.down', 'x', 'arrow.right', 'ellipsis', 'person.2', 'wave', 'bell', 'cog', 'list', 'check', 'sliders', 'sparkle'];
const uploads = [];
const svgDoc = (inner) => inner.replace('<svg aria-hidden="true" ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(' style="display:block;flex-shrink:0"', '').replace(' style="display:block"', '');
for (const n of ICONS) { const p = `upload/Icons/${n}.svg`; w(join(OUT, p), svgDoc(icon(n, 24, '#2D241B', 2)) + '\n'); uploads.push(p); }
const motifs = {
  'squiggle.svg': squiggle(60, '#C96442', 2.2),
  'sparkle.svg': sparkle(14, '#E8A93A'),
  'hand-arrow.svg': handArrow(50, '#C96442'),
};
for (const [n, s] of Object.entries(motifs)) { const p = `upload/Motifs/${n}`; w(join(OUT, p), svgDoc(s) + '\n'); uploads.push(p); }
mkdirSync(join(OUT, 'upload/Logos'), { recursive: true });
copyFileSync('assets/icon-village.png', join(OUT, 'upload/Logos/village-app-icon.png')); uploads.push('upload/Logos/village-app-icon.png');
w(P('assets/Logos/README.md'), `# Logos\n\n- \`village-app-icon.png\` — the app icon (1024×1024, copied from assets/icon-village.png): a serif V with the terracotta squiggle and two golden sparkles on cream. Use it whole; don’t recolor or crop the sparkles. On sign-in it sits at 60px with radius-md corners.\n- There is no separate wordmark file: the wordmark is “village” set in the \`hero\` style over a squiggle.\n`);
w(P('assets/Icons/README.md'), `# Icons\n\nSingle-ink copies of the app’s icon set (src/components/ui/Icon.tsx), drawn on a 24px grid with a 2px round stroke in ink (#2D241B). In the app they take any color through the \`color\` prop; recolor these by editing the stroke. \`.fill\` variants are for the current tab only. \`cog\`, \`list\`, \`check\` and \`sliders\` are new in this version.\n`);
w(P('assets/Motifs/README.md'), `# Motifs\n\nThe hand-drawn marks from src/components/ui, copied path for path.\n\n- \`squiggle.svg\` — terracotta (#C96442) wave under tab titles; one per screen.\n- \`sparkle.svg\` — the 4-point star in sun (#E8A93A); means “new for you”.\n- \`hand-arrow.svg\` — terracotta arrow for onboarding and empty states.\n`);
w(join(OUT, 'uploads.json'), JSON.stringify(uploads, null, 2));

// local harness: each preview inside tokens.css + bundle.css, light and dark
const css = tokensCss((f) => `../project/${f}`) + '\n' + bundleCss;
for (const c of [...components, { name: 'Cover', body: coverHtml.split('<body>')[1].split('</body>')[0], head: coverHtml.split('<style>')[1].split('</style>')[0] }]) {
  for (const theme of ['light', 'dark']) {
    w(join(OUT, 'check', `${c.name}-${theme}.html`), `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}${c.head ?? ''}</style></head><body><div id="frame" style="width:${c.name === 'Cover' ? 960 : 560}px;background:var(--paper)">${c.body}</div></body></html>`);
  }
}
console.log('ds built:', components.length, 'components,', uploads.length, 'uploads');
