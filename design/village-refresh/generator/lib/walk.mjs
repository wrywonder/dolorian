// The system walkthrough: eight 1280-wide boards that explain the refresh,
// built from the same components and tokens as the after screens.
import { el, elA, abs, row, col } from './h.mjs';
import { icon, sparkle, squiggle, handArrow } from './icons.mjs';
import * as art from './art.mjs';
import * as N from './new.mjs';
import * as O from './old.mjs';

const T = N.LIGHT;
const serif = { fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 };
const serifR = { ...serif, fontStyle: 'normal' };
const brico = (w) => ({ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontWeight: w });
const mono = { fontFamily: "'DM Mono', ui-monospace, monospace", fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' };
const ts = (n, color = T.ink, extra = {}) => ({ ...N.TYPE[n], color, ...extra });
const TOTAL = 8;

function board(n, title, lead, ...body) {
  return el('div', { width: 1280, background: T.paper, padding: '72px 80px 80px', boxSizing: 'border-box', ...brico(400), color: T.ink, position: 'relative' },
    el('div', { ...mono, fontSize: 12, color: T.ink3 }, `walkthrough · ${n} of ${TOTAL}`),
    el('h1', { ...serif, fontSize: 72, lineHeight: '72px', letterSpacing: '-0.02em', margin: '10px 0 0', color: T.ink }, title),
    el('div', { marginTop: 10 }, squiggle(84, T.terracotta, 2.6)),
    lead ? el('p', { ...brico(400), fontSize: 19, lineHeight: '28px', color: T.ink2, margin: '22px 0 0', maxWidth: 720 }, lead) : '',
    el('div', { marginTop: 48 }, ...body));
}
const h2 = (text, extra = {}) => el('h2', { ...serif, fontSize: 32, lineHeight: '36px', margin: 0, color: T.ink, ...extra }, text);
const label = (text, color = T.ink3, extra = {}) => el('div', { ...mono, fontSize: 11, lineHeight: '14px', color, ...extra }, text);
const small = (text, color = T.ink2, extra = {}) => el('p', { ...brico(500), fontSize: 14, lineHeight: '20px', color, margin: 0, ...extra }, text);
const panel = (extra, ...kids) => el('div', { background: T.card, borderRadius: 22, boxShadow: N.shadow.card(), padding: 28, boxSizing: 'border-box', ...extra }, ...kids);

// ---------------------------------------------------------------- 1 overview
export function board_1() {
  const list = (items, mark) => el('ul', { listStyle: 'none', margin: '16px 0 0', padding: 0, ...col({ gap: 12 }) },
    items.map(([a, b]) => el('li', { ...row({ alignItems: 'flex-start', gap: 12 }) },
      el('span', { marginTop: 3 }, mark),
      el('div', {}, el('div', { ...brico(600), fontSize: 16, lineHeight: '21px' }, a), b ? small(b, T.ink3, { marginTop: 2 }) : ''))));
  const keep = icon('check', 20, T.sageInk, 2.4);
  const chg = icon('arrow.right', 20, T.clayInk, 2.4);
  const principles = [
    ['Warm before clever.', 'Cream paper, soft cards, people’s own colors.'],
    ['Play is pinned on, not baked in.', 'Stickers tilt; cards, lists and text stay square.'],
    ['Serif is the voice; sans is the information.', 'Instrument Serif for titles and what parents say.'],
    ['One flourish per screen.', 'One squiggle, one resting sparkle, one clay action.'],
    ['Legible first.', 'AA contrast in both themes; 44px targets.'],
  ];
  const cluster = el('div', { ...abs({ top: 70, right: 96 }), width: 250, height: 260 },
    el('div', { ...abs({ top: 0, right: 0 }), width: 180, background: T.polaroid, padding: '9px 9px 26px', borderRadius: 10, boxShadow: N.shadow.card(), transform: 'rotate(6deg)' },
      el('div', { aspectRatio: '1 / 1', borderRadius: 5, overflow: 'hidden' }, art.swing())),
    el('div', { ...abs({ top: -16, left: 20 }) }, N.emojiSticker('🧁', 60, -10)),
    el('div', { ...abs({ bottom: 26, left: 0 }) }, N.stamp('sat · 10am', { rotate: -5 })),
    el('div', { ...abs({ bottom: 6, right: 24 }) }, sparkle(22, T.sun)));
  return board(1, 'the fridge door, tidied.',
    'Village already had a point of view: cream paper, terracotta, an italic serif, polaroids and stickers. The refresh keeps all of it and puts it on a stricter grid, so the screens feel current and calm and the playful pieces stand out because there are fewer of them.',
    cluster,
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 },
      panel({}, label('kept from v1', T.sageInk), list([
        ['Cream paper and terracotta', 'paper is still #FBF4E9; terracotta still draws the squiggle'],
        ['Instrument Serif Italic titles, lowercase', '“buzz”, “plans”, “your village”'],
        ['Polaroids, stamps, tape, emoji stickers', 'now with one job each'],
        ['The squiggle and the sparkle', 'from the app icon'],
        ['The lip under buttons', 'the 3px hard shadow, made consistent'],
        ['The warm lowercase voice', '“snap one”, “not now”, “be the first”'],
      ], keep)),
      panel({}, label('changed', T.clayInk), list([
        ['Accessible color', 'taupe 2.8:1 → ink-3 5.1:1; terracotta fill → clay, white text 3.9 → 4.7:1'],
        ['Bricolage Grotesque + DM Mono', 'replace Plus Jakarta Sans and Space Grotesk'],
        ['Twelve type styles', 'instead of 26 sizes from 9 to 48px'],
        ['Borderless cards, capsule controls', 'no more mustard outline on every box'],
        ['The dock', 'one create button beside the tabs, never over content'],
        ['A dark theme, “after bedtime”', 'parents use this at night'],
      ], chg))),
    el('div', { marginTop: 40 }, label('five principles'),
      el('div', { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16, marginTop: 14 },
        principles.map(([a, b]) => el('div', { background: T.paper2, borderRadius: 22, padding: '22px 20px', minHeight: 150, boxSizing: 'border-box' },
          el('div', { ...serif, fontSize: 23, lineHeight: '27px', color: T.ink }, a), small(b, T.ink2, { marginTop: 10 }))))));
}

// ---------------------------------------------------------------- 2 color
function swatch(hex, name, note, { big = false, textOn, fail } = {}) {
  return el('div', { ...col({ gap: 8 }), minWidth: 0 },
    el('div', { height: big ? 88 : 64, borderRadius: 16, background: hex, boxShadow: `inset 0 0 0 1px rgba(45,36,27,0.08)`, display: 'flex', alignItems: 'flex-end', padding: 10, boxSizing: 'border-box' },
      textOn ? el('span', { ...brico(600), fontSize: 13, color: textOn }, 'Aa') : ''),
    el('div', {}, el('div', { ...brico(600), fontSize: 14, lineHeight: '18px' }, name),
      el('div', { ...mono, fontSize: 10.5, color: T.ink3, marginTop: 2 }, hex.toUpperCase()),
      note ? el('div', { ...brico(500), fontSize: 12, lineHeight: '16px', color: fail ? T.danger : T.ink3, marginTop: 4, ...row({ gap: 4, alignItems: 'flex-start' }) }, fail ? icon('x', 14, T.danger, 2.4) : '', note) : ''));
}
function contrastFix(beforeFg, beforeBg, beforeTxt, beforeRatio, afterFg, afterBg, afterTxt, afterRatio, what, beforeFont, afterFont) {
  const chipS = (fg, bg, txt, font) => el('div', { background: bg, borderRadius: 14, padding: '14px 16px', ...font, color: fg, flex: 1 }, txt);
  return panel({ padding: 22 },
    label(what),
    el('div', { ...row({ gap: 12 }), marginTop: 12 },
      chipS(beforeFg, beforeBg, beforeTxt, beforeFont), icon('arrow.right', 20, T.ink3, 2), chipS(afterFg, afterBg, afterTxt, afterFont)),
    el('div', { ...row({ justifyContent: 'space-between' }), marginTop: 10 },
      el('span', { ...brico(600), fontSize: 13, color: T.danger }, `${beforeRatio} · fails AA`), el('span', { ...brico(600), fontSize: 13, color: T.sageInk }, `${afterRatio} · passes AA`)));
}
export function board_2() {
  const O_C = O.C;
  const old = [
    [O_C.cream, 'cream', 'page'], [O_C.surface, 'surface', 'cards · 1.03:1 vs cream'], [O_C.dark, 'dark', 'text'], [O_C.brownMid, 'brownMid', 'secondary'],
    [O_C.taupe, 'taupe', 'meta text 2.8:1', true], [O_C.terracotta, 'terracotta', 'white on it 3.9:1', true], [O_C.golden, 'golden', 'presence'], [O_C.amberLight, 'amberLight', 'stickers'],
    [O_C.sage, 'sage', 'white on it 3.7:1', true], [O_C.sageSoft, 'sageSoft', 'nudge'], [O_C.rule, 'rule', 'every border, 1.3:1'], [O_C.white, 'white', 'polaroid'],
  ];
  const group = (name, items) => el('div', { minWidth: 0 }, label(name, T.ink3, { marginBottom: 12 }),
    el('div', { display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 12 }, items.map(([k, n, note, on]) => swatch(T[k], n, note, { textOn: on }))));
  const darkRow = [['paper', 'paper'], ['card', 'card'], ['ink', 'ink'], ['ink2', 'ink-2'], ['clay', 'clay'], ['sun', 'sun'], ['sageWash', 'sage-wash'], ['butter', 'butter']].map(([k, n]) => el('div', { flex: 1, ...col({ gap: 6 }) }, el('div', { height: 56, borderRadius: 14, background: N.DARK[k], boxShadow: 'inset 0 0 0 1px rgba(45,36,27,0.12)' }), el('span', { ...brico(500), fontSize: 12, color: T.ink3 }, n), el('span', { ...mono, fontSize: 10, color: T.ink3 }, N.DARK[k])));
  return board(2, 'color',
    'Same palette, re-cut by role. Every text color now passes 4.5:1 on the grounds it is allowed on, in both themes; terracotta stays the brand mark, and a slightly deeper clay carries actions.',
    el('div', { display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 40 },
      el('div', {}, label('v1 · src/lib/constants.ts'),
        el('div', { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 12 }, old.map(([h, n, note, fail]) => swatch(h, n, note, { fail })))),
      el('div', { ...col({ gap: 28 }) }, label('v2 · by role'),
        el('div', { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 28, marginTop: -16 },
          group('grounds', [['paper', 'paper', 'screens'], ['paper2', 'paper-2', 'sunken'], ['card', 'card', 'cards'], ['polaroid', 'polaroid', 'photo paper']]),
          group('text', [['ink', 'ink', '14.9:1'], ['ink2', 'ink-2', '5.7:1'], ['ink3', 'ink-3', '5.1:1']]),
          group('action', [['terracotta', 'terracotta', 'marks only'], ['clay', 'clay', 'fills', '#FFFFFF'], ['clayInk', 'clay-ink', 'as text'], ['clayWash', 'clay-wash', 'tint']]),
          group('live & yes', [['sun', 'sun', 'presence'], ['butter', 'butter', 'stamps', '#2D241B'], ['sageFill', 'sage-fill', 'nudge action', '#FFFFFF'], ['sageWash', 'sage-wash', 'nudge note']])),
        el('div', {}, label('people · avatar tones with their own ink'),
          el('div', { ...row({ gap: 14 }), marginTop: 12 }, Object.keys(N.TONES).map((tn, i) => el('div', { ...col({ alignItems: 'center', gap: 6 }) }, N.avatar(['MC', 'GL', 'JP', 'PP', 'AK', 'DR', 'SW'][i], tn, 52), el('span', { ...brico(500), fontSize: 12, color: T.ink3 }, tn))))),
        el('div', {}, label('after bedtime · the dark theme'), el('div', { ...row({ gap: 8 }), marginTop: 12 }, darkRow)))),
    el('div', { marginTop: 44 }, label('the three fixes that matter most'),
      el('div', { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, marginTop: 14 },
        contrastFix(O.C.taupe, O.C.cream, '· 1h', '2.8:1', T.ink3, T.paper, '1h ago', '5.1:1', 'metadata', { fontFamily: "'Instrument Serif'", fontStyle: 'italic', fontSize: 15 }, { ...brico(500), fontSize: 15 }),
        contrastFix('#FFFFFF', O.C.terracotta, 'I’m in →', '3.9:1', T.onClay, T.clay, 'I’m in', '4.7:1', 'primary button', { fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 15 }, { ...brico(700), fontSize: 15 }),
        contrastFix(O.C.sage, O.C.sageSoft, 'A LITTLE NUDGE ↓', '2.9:1', T.sageInk, T.sageWash, 'A LITTLE NUDGE', '4.9:1', 'nudge eyebrow', { fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 13, letterSpacing: '0.06em' }, { ...mono, fontSize: 13 }))));
}

// ---------------------------------------------------------------- 3 type
export function board_3() {
  const oldSizes = [[9, 'm'], [9.5, 'm'], [10, 'm'], [10.5, 'm'], [11, 'm'], [11.5, 's'], [12, 's'], [12.5, 's'], [13, 's'], [13.5, 's'], [14, 'i'], [15, 'i'], [16, 's'], [17, 's'], [18, 'i'], [19, 'i'], [19.5, 'i'], [22, 'r'], [23, 'r'], [24, 'r'], [26, 'i'], [27, 'r'], [34, 'r'], [38, 'i'], [40, 'i'], [48, 'i']];
  const fam = { m: { fontFamily: "'Space Grotesk'", fontWeight: 700 }, s: { fontFamily: "'Plus Jakarta Sans'", fontWeight: 800 }, i: { fontFamily: "'Instrument Serif'", fontStyle: 'italic' }, r: { fontFamily: "'Instrument Serif'" } };
  const rows = [
    ['hero', 'village', '64 / 60 · serif italic'], ['display', 'buzz', '40 / 44 · serif italic'], ['title1', 'Drew Rowny', '32 / 36 · serif italic'],
    ['title2', 'Saturday Soccer', '26 / 30 · serif italic'], ['title3', 'first goal — pure magic', '21 / 26 · serif italic'],
    ['headline', 'Maya Chen', '16 / 21 · 600'], ['body', 'Bring water and a snack.', '16 / 23 · 400'], ['callout', 'North Berkeley · parent to Sasha & Eli', '15 / 20 · 500'],
    ['subhead', 'continue with email', '14 / 18 · 600'], ['footnote', 'Cesar Chavez Park', '13 / 17 · 500'], ['caption', 'my village', '12 / 15 · 600'], ['stamp', 'sat · may 24', '11 / 14 · mono, upper'],
  ];
  return board(3, 'type',
    'Two families do the talking and one stamps the dates. The serif is reserved for titles and for what parents say; everything you read to get something done is Bricolage Grotesque. A named scale replaces a long tail of one-off sizes.',
    el('div', { display: 'grid', gridTemplateColumns: '400px minmax(0, 1fr)', gap: 48 },
      el('div', {}, label('v1 · 26 sizes across three families'),
        el('div', { ...row({ alignItems: 'baseline', gap: 12 }), flexWrap: 'wrap', marginTop: 16, rowGap: 14 },
          oldSizes.map(([s, f]) => el('span', { ...fam[f], fontSize: s, lineHeight: `${Math.round(s * 1.15)}px`, color: s < 12 ? O.C.taupe : O.C.dark }, 'Aa'))),
        small('Ten sizes sit below 12px. Plus Jakarta Sans ExtraBold at 10–13px made most labels shout, and the italic serif carried metadata at 12.5px.', T.ink2, { marginTop: 20 }),
        el('div', { marginTop: 32 }, label('the families'),
          el('div', { ...col({ gap: 18 }), marginTop: 14 },
            el('div', {}, el('div', { ...serif, fontSize: 44, lineHeight: '44px' }, 'Instrument Serif'), small('Italic for voice, 21px and up. Regular for big numbers. Kept from v1 and the app icon.', T.ink3, { marginTop: 4 })),
            el('div', {}, el('div', { ...brico(600), fontSize: 34, lineHeight: '40px', letterSpacing: '-0.01em' }, 'Bricolage Grotesque'), small('New. Ink traps and a bit of wobble keep it friendly at text sizes; 400–700, no 800.', T.ink3, { marginTop: 4 })),
            el('div', {}, el('div', { ...mono, fontSize: 24, lineHeight: '30px', textTransform: 'none', letterSpacing: '0.02em' }, 'DM Mono'), small('New. A real monospace for date stamps, times and eyebrows. Replaces Space Grotesk.', T.ink3, { marginTop: 4 }))))),
      el('div', {}, label('v2 · twelve styles'),
        el('div', { marginTop: 10 }, rows.map(([n, sample, spec], i) => el('div', { display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) 170px', alignItems: 'baseline', gap: 16, padding: '12px 0', borderTop: i ? `1px solid ${T.line}` : 'none' },
          el('span', { ...mono, fontSize: 11, color: T.clayInk }, n),
          el('span', { ...N.TYPE[n], color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, sample),
          el('span', { ...brico(500), fontSize: 13, color: T.ink3, textAlign: 'right' }, spec)))))),
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginTop: 40 },
      [['Serif at 21px and up', 'Never for metadata, counts or buttons.'], ['13px floor', 'Anything a parent must read is footnote or larger. Caption is for labels on photos.'], ['No 800', 'Weight 700 only for button labels and initials.'], ['Stamps spell units out', '“sat · 22 min”, because uppercase turns 22m into 22M.']]
        .map(([a, b]) => el('div', { background: T.paper2, borderRadius: 18, padding: '18px 18px' }, el('div', { ...brico(600), fontSize: 15 }, a), small(b, T.ink2, { marginTop: 6 })))));
}

// ---------------------------------------------------------------- 4 shape, elevation, dock
export function board_4() {
  const radii = [['xs', 6, 'polaroid photo'], ['sm', 10, 'stamps'], ['md', 16, 'inputs'], ['lg', 22, 'cards'], ['xl', 30, 'sheets'], ['pill', 999, 'controls']];
  // the bottom 300px of the real buzz screens, before and after
  const crop = (screenHtml, bg) => el('div', { width: 390, height: 300, position: 'relative', overflow: 'hidden', borderRadius: 26, background: bg, boxShadow: `inset 0 0 0 1px ${T.line}` },
    el('div', { ...abs({ left: 0, top: -544 }) }, screenHtml));
  const oldStrip = crop(O.buzz(), O.C.cream);
  const newStrip = crop(N.buzz(), T.paper);
  return board(4, 'shape, depth & the dock',
    'Cards lose their outlines and sit on soft shadows; every control becomes a capsule; the lip stays as the one tactile signature. Navigation consolidates into a dock so the create button never covers a post.',
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 },
      panel({}, label('radius'),
        el('div', { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 14, marginTop: 18, alignItems: 'start' },
          radii.map(([n, r, use]) => el('div', { ...col({ gap: 10 }), minWidth: 0 },
            el('div', { height: 60, borderRadius: Math.min(r, 30), background: T.clayWash, boxShadow: `inset 0 0 0 2px ${T.clay}` }),
            el('div', {}, el('div', { ...mono, fontSize: 10.5, color: T.clayInk }, r === 999 ? 'pill' : `${r}px`), small(use, T.ink3, { fontSize: 12, lineHeight: '16px', marginTop: 2 })))))),
      panel({ background: T.paper2 }, label('elevation'),
        el('div', { ...row({ gap: 18 }), marginTop: 18 },
          [['card', N.shadow.card(), 'cards, lists'], ['float', N.shadow.float(), 'dock, sheets'], ['sticker', N.shadow.sticker(), 'stamps, tiles']].map(([n, s, use]) => el('div', { flex: 1, ...col({ gap: 10 }) },
            el('div', { height: 72, borderRadius: 18, background: T.card, boxShadow: s }),
            el('div', {}, el('div', { ...mono, fontSize: 10.5, color: T.clayInk }, n), small(use, T.ink3, { fontSize: 12, lineHeight: '16px', marginTop: 2 }))))))),
    panel({ marginTop: 24 }, label('the lip · press moves the button down 2px and drops the shadow'),
      el('div', { ...row({ gap: 28, alignItems: 'center' }), marginTop: 18, flexWrap: 'wrap' },
        el('div', { ...col({ gap: 8, alignItems: 'flex-start' }) }, N.button('I’m in', { size: 'M' }), small('rest', T.ink3, { fontSize: 12 })),
        el('div', { ...col({ gap: 8, alignItems: 'flex-start' }) }, el('div', { transform: 'translateY(2px)' }, N.button('I’m in', { size: 'M' }).replace(/box-shadow:0 3px 0 #8A3D22;?/, '')), small('pressed', T.ink3, { fontSize: 12 })),
        el('div', { ...col({ gap: 8, alignItems: 'flex-start' }) }, N.button('snap one', { variant: 'sage', size: 'M', iconL: 'camera' }), small('sage', T.ink3, { fontSize: 12 })),
        el('div', { ...col({ gap: 8, alignItems: 'flex-start' }) }, N.button('going', { variant: 'sageTonal', size: 'M', iconL: 'check' }), small('confirmed, no lip', T.ink3, { fontSize: 12 })),
        el('div', { ...col({ gap: 8, alignItems: 'flex-start' }) }, N.button('edit profile', { variant: 'secondary', size: 'S', iconL: 'pencil' }), small('secondary, no lip', T.ink3, { fontSize: 12 })),
        el('div', { flex: 1 }),
        small('v1 used the lip on some buttons and a soft glow on others, at radii of 14, 17 and 29. Now every clay or sage fill you press has it, and nothing else does.', T.ink2, { maxWidth: 360 }))),
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, marginTop: 24 },
      panel({}, label('v1 · tab bar + floating compose'), el('div', { marginTop: 16 }, oldStrip),
        small('The “+” floated over the feed and landed on the first post’s reactions; plans had a second “+” in its header. Idle and active tabs were icons only.', T.ink2, { marginTop: 14 })),
      panel({}, label('v2 · the dock'), el('div', { marginTop: 16 }, newStrip),
        small('One create button beside the tabs on every screen: new post, new plan, new hangout spot or invite a parent. The current tab grows into a labeled clay capsule; the rest stay quiet.', T.ink2, { marginTop: 14 }))));
}

// ---------------------------------------------------------------- 5 the playful kit
export function board_5() {
  const kit = [
    ['squiggle', 'under the tab title, once per screen', el('div', { ...col({ gap: 4 }) }, el('div', { ...serif, fontSize: 40, lineHeight: '40px' }, 'plans'), squiggle(54, T.terracotta, 2.4))],
    ['sparkle', 'means “new for you”; one resting sparkle per screen', el('div', { ...row({ gap: 16 }) }, el('div', { width: 48, height: 48, borderRadius: 16, background: T.card, boxShadow: N.shadow.sticker(), display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: 26 }, '⚽', el('div', { ...abs({ top: -7, right: -7 }) }, sparkle(14, T.sun))), sparkle(26, T.sun))],
    ['stamp', 'dates and times stuck on photos', el('div', { ...row({ gap: 12 }) }, N.stamp('sat · 22 min', { rotate: 5 }), N.stamp('2 plans', { tone: 'ink', rotate: -3 }))],
    ['emoji sticker', 'a plan’s emoji, overhanging its card', el('div', { ...row({ gap: 12 }) }, N.emojiSticker('⚽', 54, 10), N.emojiSticker('🥾', 54, -8))],
    ['polaroid', 'photo posts and kids; caption on the strip', el('div', { width: 124, background: T.polaroid, padding: '7px 7px 10px', transform: 'rotate(-3deg)', borderRadius: 10, boxShadow: N.shadow.card() }, el('div', { aspectRatio: '5 / 4', borderRadius: 4, overflow: 'hidden' }, art.pool()), el('div', { ...serif, fontSize: 15, lineHeight: '18px', marginTop: 6, color: T.ink }, 'swim test: passed'))],
    ['tape', 'pins a nudge note, nowhere else', el('div', { position: 'relative', width: 170, paddingTop: 9 }, el('div', { ...abs({ top: 0, left: 50 }), width: 68, height: 20, background: T.tape, borderRadius: 3, transform: 'rotate(-3deg)', zIndex: 2 }), el('div', { height: 64, borderRadius: 18, background: T.sageWash }))],
    ['speech bubble', 'questions only; the tail points at the asker', el('div', { position: 'relative', width: 180 }, el('div', { background: T.card, borderRadius: 18, padding: '12px 14px', boxShadow: N.shadow.card(), ...serif, fontSize: 18, lineHeight: '22px' }, 'anyone tried Studio Grow?'), `<svg aria-hidden="true" width="22" height="14" viewBox="0 0 22 14" style="position:absolute;left:24px;bottom:-12px;display:block"><path d="M0 0 H22 C14 2 6 8 2 14 C3 8 2 4 0 0Z" fill="${T.card}"/></svg>`)],
    ['date tile', 'the tear-off calendar square on plan cards', el('div', { width: 58, height: 64, borderRadius: 14, background: T.polaroid, boxShadow: N.shadow.sticker(), ...col({ alignItems: 'center', justifyContent: 'center' }) }, el('span', { ...mono, fontSize: 11, color: T.clayInk }, 'sat'), el('span', { ...serifR, fontSize: 30, lineHeight: '30px' }, '24'))],
  ];
  const oldCard = el('div', { width: 260, height: 120, borderRadius: 22, border: `1px solid ${O.C.rule}`, background: O.C.surface, transform: 'rotate(-0.8deg)', padding: 16, boxSizing: 'border-box', boxShadow: '0 6px 22px rgba(45,36,27,0.1)', position: 'relative' },
    el('div', { ...serif, fontSize: 24, lineHeight: '26px', color: O.C.dark }, 'Saturday Soccer'), el('div', { fontFamily: "'Plus Jakarta Sans'", fontWeight: 600, fontSize: 12.5, color: O.C.brownMid, marginTop: 6 }, 'Cesar Chavez Park'),
    el('div', { ...abs({ top: -16, right: -8 }), fontSize: 40, transform: 'rotate(4deg)' }, '⚽'));
  const newCard = el('div', { width: 260, height: 120, borderRadius: 22, background: T.card, padding: 16, boxSizing: 'border-box', boxShadow: N.shadow.card(), position: 'relative' },
    el('div', { ...serif, fontSize: 24, lineHeight: '26px', color: T.ink }, 'Saturday Soccer'), el('div', { ...N.TYPE.subhead, color: T.ink2, marginTop: 6 }, '10am · Cesar Chavez Park'),
    el('div', { ...abs({ top: -14, right: -6 }) }, N.emojiSticker('⚽', 48, 10)));
  return board(5, 'the playful kit',
    'v1 used every flourish everywhere: four sparkles on the buzz screen, tilted cards, a sparkle on the compose button and another on the current tab. Now each piece has one job, and pieces that aren’t doing their job stay out.',
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 },
      kit.map(([n, job, demo]) => el('div', { background: T.card, borderRadius: 22, boxShadow: N.shadow.card(), padding: 22, ...col({ gap: 16 }), minHeight: 230, boxSizing: 'border-box' },
        el('div', { height: 136, display: 'flex', alignItems: 'center', justifyContent: 'center' }, demo),
        el('div', {}, el('div', { ...brico(600), fontSize: 16 }, n), small(job, T.ink2, { marginTop: 4 }))))),
    panel({ marginTop: 28, ...row({ gap: 40, alignItems: 'center' }), padding: '32px 36px' },
      el('div', { flex: 1, minWidth: 0 }, h2('only stickers tilt'), small('v1 rotated whole cards (−0.8°, 0.6°) and the nudge note (−0.6°), so text sat at an angle. Now the card stays square and the sticker carries the tilt. It still looks pinned on; the words read straight.', T.ink2, { marginTop: 10, fontSize: 15, lineHeight: '22px', maxWidth: 420 })),
      el('div', { ...col({ alignItems: 'center', gap: 14 }) }, oldCard, label('v1')),
      el('div', { ...col({ alignItems: 'center', gap: 14 }) }, newCard, label('v2'))));
}

// ---------------------------------------------------------------- 6 components
export function board_6() {
  const cell = (name, content, extra = {}) => el('div', { ...col({ gap: 14 }), minWidth: 0, ...extra }, label(name), content);
  return board(6, 'components',
    'Twenty components cover the four key screens. Each is in the design system with a live preview in both themes and a short guide: what it’s for, what you hand it, and the rules.',
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 36 },
      cell('button', el('div', { ...col({ gap: 12, alignItems: 'flex-start' }) },
        el('div', { ...row({ gap: 10 }) }, N.button('I’m in', { size: 'M' }), N.button('snap one', { variant: 'sage', size: 'M', iconL: 'camera' })),
        el('div', { ...row({ gap: 10 }) }, N.button('going', { variant: 'sageTonal', size: 'M', iconL: 'check' }), N.button('edit profile', { variant: 'secondary', size: 'S', iconL: 'pencil' })),
        el('div', { ...row({ gap: 14 }) }, N.button('see all 12', { variant: 'ghost', size: 'S' }), N.button('not now', { variant: 'quiet', size: 'M' })))),
      cell('icon button · chips', el('div', { ...col({ gap: 14 }) },
        el('div', { ...row({ gap: 10 }) }, N.iconButton('search', { label: 'Search' }), N.iconButton('calendar', { label: 'Calendar' }), el('span', { padding: 6, borderRadius: 14, background: N.TONES.rose.fill, display: 'inline-flex' }, N.iconButton('cog', { variant: 'glass', label: 'Settings' })), N.iconButton('bell', { label: 'Notifications', badge: 2 })),
        el('div', { ...row({ gap: 8 }), flexWrap: 'wrap' }, N.chip('upcoming', { selected: true, menu: true }), N.chip('my village'), N.chip('invited')))),
      cell('avatars · presence', el('div', { ...col({ gap: 14 }) },
        el('div', { ...row({ gap: 10 }) }, N.avatar('MC', 'peach', 44), N.avatar('JP', 'sage', 44), N.avatar('HG', 'peach', 44, { presence: true }), N.stack([['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 30)),
        el('div', {}, N.presenceChip()))),
      cell('polaroid post', N.photoPost({ name: 'Maya Chen', initials: 'MC', tone: 'peach', venue: 'Cesar Chavez Park 🌳', caption: 'first goal — pure magic', scene: art.soccer(), when: 'sat · 22 min', likes: 12, comments: 3, mine: true }), { paddingTop: 0 }),
      cell('question bubble · nudge', el('div', { ...col({ gap: 28 }) },
        N.questionPost({ name: 'Jordan', initials: 'JP', tone: 'sage', when: '1h ago', body: 'Anyone tried toddler tumbling at Studio Grow? Felix (3) is climbing things.', reactions: 4, answers: 6 }),
        N.nudgeCard('saturday soccer', '⚽'))),
      cell('plan card', N.activityCard({ name: 'Saturday Soccer', emoji: '⚽', scene: art.soccer(), audience: 'public', dow: 'sat', day: '24', time: '10am', place: 'Cesar Chavez Park', desc: 'show up. kick ball. eat snacks.', going: [[['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 3], interestedLabel: 'Priya is interested' })),
      cell('stat strip · request banner', el('div', { ...col({ gap: 18 }) }, N.statStrip(), el('div', { paddingTop: 8 }, N.requestBanner()))),
      cell('list rows · dock', el('div', { ...col({ gap: 28 }) }, N.listRows(), el('div', { position: 'relative', height: 64 }, N.tabBar('plans', { you: 2 }).replace('padding:0 20px 28px', 'padding:0')))),
      cell('text field', el('div', { ...col({ gap: 16 }) }, N.textField({ focus: true }), N.textField({ label: '8-digit code', value: '40912877', code: true, error: 'That code expired. Send a new one.' })))),
    );
}

// ---------------------------------------------------------------- 7 voice & motion
export function board_7() {
  const pair = (bad, good, why, font) => el('div', { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, padding: '14px 0', borderTop: `1px solid ${T.line}` },
    el('div', { ...row({ gap: 8, alignItems: 'flex-start' }) }, icon('x', 18, T.danger, 2.4), el('div', {}, el('div', { ...brico(500), fontSize: 15, color: T.ink2, textDecoration: 'line-through', textDecorationColor: 'rgba(166,55,44,0.5)', ...(font ?? {}) }, bad))),
    el('div', { ...row({ gap: 8, alignItems: 'flex-start' }) }, icon('check', 18, T.sageInk, 2.4), el('div', {}, el('div', { ...brico(600), fontSize: 15, color: T.ink, ...(font ?? {}) }, good), small(why, T.ink3, { fontSize: 13, lineHeight: '18px', marginTop: 2 }))));
  const motions = [
    ['press', 120, 'scale .96 or a 2px drop', 'light'], ['tab cross-fade', 180, 'fade + 6px rise', 'selection'], ['photo fade-in', 200, 'from BlurHash', '—'],
    ['dock capsule', 280, 'spring 18 / 260', 'selection'], ['sticker slap', 280, 'spring 12 / 260, 1.15 → 1', '—'], ['squiggle draw-on', 420, 'once per tab per session', '—'],
    ['RSVP burst', 500, 'three sparkles: clay, butter, sage', 'success'],
  ];
  const max = 600;
  return board(7, 'voice & motion',
    'The voice stays warm and lowercase, with one rule that settles casing. Motion is quick and springy, and only live things loop.',
    el('div', { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 32 },
      panel({}, label('voice'), h2('lowercase for short things, sentences for sentences', { fontSize: 26, lineHeight: '30px', marginTop: 10 }),
        el('div', { marginTop: 16 },
          pair('Continue with email', 'continue with email', 'buttons, chips, labels and titles are lowercase'),
          pair('i’m in', 'I’m in', 'the pronoun I and proper nouns keep their capitals'),
          pair('no password needed. a one-time code creates your account.', 'No password. We’ll email you an 8-digit code.', 'full sentences use sentence case'),
          pair('sat · 22m', 'sat · 22 min', 'stamps are uppercase, so spell units out', { ...mono, fontSize: 13 }),
          pair('3 families interested', 'Priya is interested', 'name people when you can'),
          pair('snap one ✨', 'snap one', 'emoji are content (activities, venues, reactions), not decoration'))),
      panel({}, label('motion'), h2('quick, springy, and only live things loop', { fontSize: 26, lineHeight: '30px', marginTop: 10 }),
        el('div', { marginTop: 18 },
          el('div', { display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr) 70px', gap: 12, ...brico(500), fontSize: 12, color: T.ink3, paddingBottom: 6 }, el('span', {}, ''), el('div', { position: 'relative', height: 16 }, [[0, '0'], [200, '200'], [400, '400'], [600, '600 ms']].map(([v, x]) => el('span', { ...abs({ top: 0, left: `${(v / max) * 100}%` }), transform: v === 0 ? undefined : v === max ? 'translateX(-100%)' : 'translateX(-50%)', whiteSpace: 'nowrap' }, x))), el('span', {}, 'haptic')),
          motions.map(([n, ms, how, hap]) => el('div', { display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr) 70px', gap: 12, alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${T.line}` },
            el('span', { ...brico(600), fontSize: 14 }, n),
            el('div', { position: 'relative' }, el('div', { ...abs({ top: -9, bottom: -9, left: '33.333%' }), width: 1, background: T.line }), el('div', { ...abs({ top: -9, bottom: -9, left: '66.667%' }), width: 1, background: T.line }), el('div', { height: 10, width: `${(ms / max) * 100}%`, borderRadius: 5, background: T.clay, position: 'relative' }), el('div', { ...brico(500), fontSize: 12, color: T.ink3, marginTop: 4 }, `${ms}ms · ${how}`)),
            el('span', { ...brico(500), fontSize: 12, color: T.ink2 }, hap))),
          el('div', { ...row({ gap: 16 }), marginTop: 18, padding: '14px 16px', borderRadius: 16, background: T.sunWash },
            N.pulseDot(10), small('Loops: the presence pulse (2.2s) and a twinkling sparkle (2.6s). With Reduce Motion on, loops and slides stop; cross-fades stay.', T.sunInk, { fontSize: 13, lineHeight: '18px' }))))));
}

// ---------------------------------------------------------------- 8 crit log
export function board_8() {
  const mini = (num, title, before, after, note) => panel({ padding: 22, ...col({ gap: 14 }) },
    el('div', { ...row({ gap: 10, alignItems: 'baseline' }) }, el('span', { ...mono, fontSize: 12, color: T.clayInk }, num), el('span', { ...brico(600), fontSize: 16 }, title)),
    el('div', { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 },
      el('div', { background: T.paper2, borderRadius: 16, minHeight: 92, ...col({ alignItems: 'center', justifyContent: 'center', gap: 8 }), padding: 12 }, before, label('first pass', T.danger)),
      el('div', { background: T.paper2, borderRadius: 16, minHeight: 92, ...col({ alignItems: 'center', justifyContent: 'center', gap: 8 }), padding: 12 }, after, label('now', T.sageInk))),
    small(note, T.ink2, { fontSize: 13, lineHeight: '18px' }));
  const clippedStack = el('div', { ...row() }, [['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']].map(([i, tn], k) => el('div', { marginLeft: k ? -10 : 0, position: 'relative', zIndex: 10 - k }, N.avatar(i, tn, 30, { ring: 2 }))));
  const misaligned = el('div', { ...col({ gap: 6 }) }, el('div', { ...row({ gap: 8 }) }, el('div', { padding: 3, borderRadius: '50%', boxShadow: `inset 0 0 0 2px ${T.sun}` }, N.avatar('MC', 'peach', 30)), el('span', { ...brico(600), fontSize: 13 }, 'Maya')), el('div', { ...row({ gap: 8 }) }, N.avatar('JP', 'sage', 30), el('span', { ...brico(600), fontSize: 13 }, 'Jordan')));
  const aligned = el('div', { ...col({ gap: 6 }) }, el('div', { ...row({ gap: 8 }) }, N.avatar('MC', 'peach', 36, { presence: true }), el('span', { ...brico(600), fontSize: 13 }, 'Maya')), el('div', { ...row({ gap: 8 }) }, el('div', { width: 36, display: 'flex', justifyContent: 'center' }, N.avatar('JP', 'sage', 36)), el('span', { ...brico(600), fontSize: 13 }, 'Jordan')));
  const rest = [
    ['1', 'Buzz showed one post above the fold.', 'Photo went 1:1 → 5:4 and the nudge got tighter, so caption, byline and reactions show.'],
    ['2', 'Presence avatars were blank discs that read as a color legend.', 'They show initials.'],
    ['5', 'Plans still had a full-width segmented control plus chips.', 'Time range moved into an “upcoming ▾” menu chip: one control row.'],
    ['8', 'Three gray ellipsis circles on the connection list.', 'Plain glyphs with a 44px hit area.'],
    ['9', 'Sign-in hero was a logo, a word and one lonely photo.', 'A small fridge-door cluster: polaroid, emoji sticker, stamp.'],
    ['10', '“Continue with email” beside “snap one”.', 'The casing rule on board 7.'],
    ['11', 'No sparkles left anywhere: a brand mark lost.', 'Back with one meaning: new for you (nudge, request banner).'],
    ['14', 'Stacks still clipped where screens overrode the overlap.', 'Screens now use the component default.'],
  ];
  return board(8, 'crit log',
    'Three passes over the four screens, the dark theme and the components. The first pass looked finished; these are the things that weren’t, and what changed.',
    el('div', { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 },
      mini('3', 'stamps said “22M”', N.stamp('sat · 22m', { rotate: 5 }), N.stamp('sat · 22 min', { rotate: 5 }), 'Uppercase turned minutes into millions. Stamps spell units out.'),
      mini('4', 'avatar stacks hid initials', clippedStack, N.stack([['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 30), 'Overlap 33% → 18%, later avatars on top, 2px ring.'),
      mini('6', 'the gear read as a sun', N.iconButton('gear', { variant: 'paper', label: 'Settings' }), N.iconButton('cog', { variant: 'paper', label: 'Settings' }), 'Redrawn as a cog with teeth; added to the icon set.'),
      mini('7', 'presence ring pushed names right', misaligned, aligned, 'The sun ring now sits inside the avatar’s own footprint.'),
      mini('13', '“+” sat on the first post', el('div', { position: 'relative', width: 120, height: 60 }, el('div', { ...abs({ left: 0, top: 14 }), ...row({ gap: 6 }) }, N.reactionPill('❤️', 12, { mine: true }), N.commentPill(3)), el('div', { ...abs({ right: -6, top: 4 }), transform: 'rotate(-6deg)', width: 48, height: 48, borderRadius: '50%', background: T.clay, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 0 ${T.clayDeep}` }, icon('plus', 22, '#fff', 2.6))), el('div', { ...row({ gap: 6 }) }, el('div', { height: 40, borderRadius: 20, background: T.card, boxShadow: N.shadow.sticker(), ...row({ gap: 6 }), padding: '0 6px' }, el('div', { height: 30, padding: '0 10px', borderRadius: 15, background: T.clay, ...row({ gap: 4 }) }, icon('feed.fill', 14, '#fff', 2)), icon('map.pin', 16, T.ink3, 2), icon('calendar', 16, T.ink3, 2)), el('div', { transform: 'rotate(-6deg)', width: 40, height: 40, borderRadius: '50%', background: T.clay, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 0 ${T.clayDeep}` }, icon('plus', 20, '#fff', 2.6))), 'Round 2. The create button moved into the dock, beside the tabs, so it never covers content.'),
      mini('12', 'the dark theme glared', el('div', { width: 92, height: 60, borderRadius: 10, overflow: 'hidden', boxShadow: `0 0 0 6px ${N.DARK.card}` }, art.soccer()), el('div', { width: 92, height: 60, borderRadius: 10, overflow: 'hidden', position: 'relative', boxShadow: `0 0 0 6px ${N.DARK.card}` }, art.soccer(), el('div', { ...abs({ inset: 0 }), background: 'rgba(0,0,0,0.1)' })), 'Photos sit under a 10% scrim at night (photo-scrim).')),
    panel({ marginTop: 24, padding: '24px 28px' }, label('the rest of the list'),
      el('div', { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 40, marginTop: 6 },
        rest.map(([n, a, b]) => el('div', { display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 8, padding: '12px 0', borderTop: `1px solid ${T.line}` },
          el('span', { ...mono, fontSize: 12, color: T.clayInk, paddingTop: 2 }, n), el('div', {}, el('div', { ...brico(600), fontSize: 14, lineHeight: '19px' }, a), small(b, T.ink3, { fontSize: 13, lineHeight: '18px', marginTop: 2 })))))));
}
