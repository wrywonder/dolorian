// node canvas-build.mjs — writes ../canvas/project/** for the Village Refresh canvas
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import * as O from './lib/old.mjs';
import * as N from './lib/new.mjs';
import * as W from './lib/walk.mjs';

const BLOB = {
  BricolageGrotesque_400Regular: '9eaba3c356fadc71efc8bd780cc962a2', BricolageGrotesque_500Medium: '9098ad556c34297f65824d7b6a77d8cd',
  BricolageGrotesque_600SemiBold: 'b9c73923f875732f6c9444dc959c59f7', BricolageGrotesque_700Bold: 'd134f7a7113daf81dcec335ac5139a4a',
  BricolageGrotesque_800ExtraBold: '63009a2f8113cafa6dba80fd6452fd1d', DMMono_400Regular: '4795083bde06138c144f1e578c444b6d', DMMono_500Medium: '12f2c3913e1ef9e9816b293e44f4204a',
  InstrumentSerif_400Regular: '97e61ba4a1c32ac0cc1dc86de19678f8', InstrumentSerif_400Regular_Italic: '5d232260899f633e03057bc5fe3d607d',
  PlusJakartaSans_400Regular: 'df0c3ad62296ee92768223fa265c5eb5', PlusJakartaSans_500Medium: '15245d93cba35c75e5a4e3e30fa902f0', PlusJakartaSans_600SemiBold: 'ff9906bcd3b76725b300f521e6e90026',
  PlusJakartaSans_700Bold: '9f60a9436ad11bd1217d8df2538d047f', PlusJakartaSans_800ExtraBold: '7e5d21b61e7d63115ddf66d3b6b50074',
  SpaceGrotesk_500Medium: '3410aa8040140874fddf5c7455e1861d', SpaceGrotesk_700Bold: '0e45c7cf380afc4a710080d3d306e181',
};
const LOGO = '/_blob/1b68db9df9337f0320e66626dc4c5531';
const { fontFaces } = await import('./lib/fonts.mjs');
const faces = fontFaces((f) => `/_blob/${BLOB[f]}`);
const sizes = JSON.parse(readFileSync('out/sizes.json', 'utf8'));

const OUT = '../canvas/project';
rmSync('../canvas', { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

function dc(title, root, w, h) {
  if (root.includes('{{')) throw new Error('hole-like text in ' + title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${faces}
body{margin:0;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
</style>
</helmet>
${root}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;
}

const boards = {}; const order = [];
const add = (file, title, root, x, y, w, h, page) => {
  writeFileSync(`${OUT}/${file}`, dc(title, root, w, h));
  boards[file] = { x, y, w, h, title, page, radius: w === 390 ? 40 : 0 };
  order.push(file);
};
const fixH = (html, h) => html.replace('width:1280px;', `width:1280px;height:${h}px;overflow:hidden;`);

// page 1: before & after
const AY = 1244;
add('Main.dc.html', 'Buzz · after', N.buzz(), 0, AY, 390, 844, 'screens');
add('buzz-before.dc.html', 'Buzz · before', O.buzz(), 0, 0, 390, 844, 'screens');
add('plans-before.dc.html', 'Plans · before', O.plans(), 470, 0, 390, 844, 'screens');
add('you-before.dc.html', 'You · before', O.you(), 940, 0, 390, 844, 'screens');
add('signin-before.dc.html', 'Sign-in · before', O.signin(), 1410, 0, 390, 844, 'screens');
add('plans-after.dc.html', 'Plans · after', N.plans(), 470, AY, 390, 844, 'screens');
add('you-after.dc.html', 'You · after', N.you(), 940, AY, 390, 844, 'screens');
add('signin-after.dc.html', 'Sign-in · after', N.signin({ logoSrc: LOGO }), 1410, AY, 390, 844, 'screens');
add('buzz-after-dark.dc.html', 'Buzz · after bedtime', N.buzzDark(), 1880, AY, 390, 844, 'screens');

// page 2: walkthrough, one row left to right
const names = ['overview', 'color', 'type', 'shape-depth-dock', 'playful-kit', 'components', 'voice-motion', 'crit-log'];
const titles = ['1 · The fridge door, tidied', '2 · Color', '3 · Type', '4 · Shape, depth & the dock', '5 · The playful kit', '6 · Components', '7 · Voice & motion', '8 · Crit log'];
names.forEach((n, i) => {
  const h = sizes[`board_${i + 1}.html`][1];
  add(`walk-${i + 1}-${n}.dc.html`, `Walkthrough ${titles[i]}`, fixH(W[`board_${i + 1}`](), h), i * 1360, 0, 1280, h, 'walkthrough');
});

const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const sticky = (x, y, text, w = 390, fill) => ({ x, y, w, text, size: 'm', page: 'screens', ...(fill ? { fill } : {}) });
const canvas = {
  v: 3, createdOnFiles: { v: 1, at: now }, title: 'Village Refresh',
  launch: { view: 'canvas', page: 'screens' },
  pages: [{ id: 'screens', name: 'Before & after' }, { id: 'walkthrough', name: 'System walkthrough' }],
  boards, order,
  notes: {
    beforeTitle: { x: 0, y: -280, text: 'Before · what the code renders today', kind: 'title1', maxW: 1800, page: 'screens' },
    afterTitle: { x: 0, y: AY - 280, text: 'After · Village, refreshed', kind: 'title1', maxW: 2270, page: 'screens' },
    walkTitle: { x: 0, y: -280, text: 'System walkthrough · read left to right', kind: 'title1', maxW: 3920, page: 'walkthrough' },
    standIns: sticky(1880, 0, 'The before row is rendered from the current code with the app’s own font files and values. Photos are illustrated stand-ins, identical in both rows, so the comparison is about the system around them.', 360, 'gray'),
    nBuzz: sticky(0, AY + 924, 'Polaroid at 5:4 with the caption written on the strip; byline and reactions get their own row, so nothing truncates. The create button moved into the dock beside the tabs. One squiggle, one sparkle (on the new nudge).'),
    nPlans: sticky(470, AY + 924, 'One row of controls: an “upcoming ▾” menu chip plus audience chips. Flyer cards: photo, tear-off date tile, then the details on the card instead of on the photo. Cards stay square; the emoji sticker tilts.'),
    nYou: sticky(940, AY + 924, 'The cover runs under the status bar; the avatar sits on the sheet’s edge. One stat strip where each number is a link (replaces three tiles and two quick actions). The requests banner names who is asking.'),
    nSignin: sticky(1410, AY + 924, 'A small fridge-door cluster beside the wordmark. Sign-in moves into a bottom sheet within thumb reach; labels are lowercase; focus is a clay ring with a soft halo.'),
    nDark: sticky(1880, AY + 924, '“After bedtime”: cocoa paper, clay brightens and the text on it goes dark, photos sit under a 10% scrim, butter stamps stay butter.'),
  },
  designSystems: [{ title: 'Village', namespace: 'village', artifact: 'https://claude.ai/artifact/TZG53SQPVDGrnJ5AJx967E', version: '1793077273-6b63', copiedAt: now }],
};
writeFileSync(`${OUT}/canvas.json`, JSON.stringify(canvas, null, 2) + '\n');
const rest = Object.fromEntries(order.filter((f) => f !== 'Main.dc.html').map((f) => [`project/${f}`, `project/${f}`]));
writeFileSync('../canvas/rest.json', JSON.stringify(rest));
console.log(order.length, 'artboards'); 
