// Builds project/tokens.json + project/tokens.css for the Village design
// system from the same LIGHT/DARK/TYPE objects the mockups render with.
import { LIGHT, DARK, TONES, TYPE } from './lib/new.mjs';

const C = (name, key, usage, { dark } = {}) => ({ name, value: { light: LIGHT[key].toLowerCase(), dark: (dark ?? DARK[key]).toLowerCase() }, usage });

export const colorTokens = [
  C('paper', 'paper', 'Page background: the cream every screen sits on. Also the ring that separates an avatar from the sheet it overlaps.'),
  C('paper-2', 'paper2', 'Sunken surfaces: segmented-control track, secondary buttons, reaction pills on cards, input fill on cards.'),
  C('card', 'card', 'Raised surfaces: feed cards, plan cards, list groups, sheets, the dock pill.'),
  C('polaroid', 'polaroid', 'Photo paper: the polaroid frame, sticker die-cut edges, the date tile. Pure white in light; warm charcoal in dark.'),
  C('ink', 'ink', 'Primary text and icons on paper, paper-2, card and polaroid (14.9:1 on card light; 15.7:1 on paper dark).'),
  C('ink-2', 'ink2', 'Secondary text: descriptions, captions, quiet buttons. On paper, paper-2 and card in both themes (≥5.1:1).'),
  C('ink-3', 'ink3', 'Tertiary text: metadata, timestamps, inactive tab icons, placeholders. On paper, paper-2 and card (≥4.6:1 light, ≥5.4:1 dark). Replaces the old taupe #A0907E, which failed at 2.8:1.'),
  C('line', 'line', 'Hairlines: dividers inside cards, chip outlines. Decorative only; never the sole boundary of a control.'),
  C('line-strong', 'lineStrong', 'Input borders at rest and the divider in a filter row.'),
  C('terracotta', 'terracotta', 'The brand hue for marks, not text: the squiggle, sparkles on paper, illustration. Kept exactly from v1 (#C96442).'),
  C('clay', 'clay', 'Action fill: primary buttons, the create button, the active tab, request banners. Text on it is on-clay (4.7:1 light, 6.8:1 dark).'),
  C('clay-deep', 'clayDeep', 'The "lip" under clay controls (a 3px hard shadow). Never a text color.'),
  C('clay-ink', 'clayInk', 'Clay as text and icons: ghost buttons, links, tags. On paper, card, paper-2 and clay-wash (≥4.8:1 light, ≥6.2:1 dark).'),
  C('clay-wash', 'clayWash', 'Tinted ground behind clay-ink: your own reaction, the help tag, tonal buttons.'),
  C('on-clay', 'onClay', 'Text and icons on a clay fill. White in light; night ink in dark, where clay brightens.'),
  C('sun', 'sun', 'Live presence only: the out-and-about pulse dot and presence rings. Never decoration.'),
  C('butter', 'butter', 'Sticker fill: date stamps on photos and plans. Text on it is ink (9.7:1).', { dark: DARK.butter }),
  C('sun-ink', 'sunInk', 'Presence as text: "out & about", "at Cesar Chavez Park". On sun-wash and card (≥5.6:1).'),
  C('sun-wash', 'sunWash', 'Tinted ground behind sun-ink: the presence chip.'),
  C('sage', 'sage', 'Sage as a mark: dotted underlines in nudges, illustration. Not text.'),
  C('sage-fill', 'sageFill', 'Fill for nudge actions ("snap one"). Text on it is on-sage (4.9:1 light).'),
  C('sage-deep', 'sageDeep', 'The lip under sage-fill buttons.'),
  C('sage-ink', 'sageInk', '"Going" and "yes" as text; the nudge eyebrow. On card and sage-wash (≥4.9:1).'),
  C('sage-wash', 'sageWash', 'The nudge note ground; tonal "going" buttons.'),
  C('on-sage', 'onSage', 'Text and icons on a sage-fill button.'),
  C('danger', 'danger', 'Destructive actions and errors as text, always with an icon or the word. On card and paper (≥6.4:1).'),
  C('danger-wash', 'dangerWash', 'Ground behind danger text in inline errors.'),
  C('glass', 'glass', 'Frosted fill for the dock pill and controls over photos; pair with a 20px backdrop blur.'),
  C('glass-edge', 'glassEdge', 'Inner 1px highlight on glass surfaces.'),
  C('tape', 'tape', 'The translucent tape strip that pins a nudge note. Only on nudges.'),
  { name: 'focus', value: { light: '{clay}', dark: '{clay}' }, usage: 'Keyboard focus ring: 2px solid, 3px offset, on every surface (clay is ≥3:1 on paper, card and paper-2 in both themes).' },
  { name: 'photo-scrim', value: { light: 'rgba(0,0,0,0)', dark: 'rgba(0,0,0,0.1)' }, usage: 'Laid over user photos in dark so bright photos don’t glare at night.' },
  ...Object.entries(TONES).flatMap(([tone, v]) => [
    { name: `tone-${tone}`, value: v.fill.toLowerCase(), usage: `Avatar fill for parents whose color is ${tone}; also kid and venue placeholders. Same in both themes (it is the person’s color).` },
    { name: `tone-${tone}-ink`, value: v.ink.toLowerCase(), usage: `Initials on tone-${tone} (≥4.9:1).` },
  ]),
];

const px = (n) => `${n}px`;
const style = (name, sample, usage, extra = {}) => {
  const s = TYPE[name];
  const out = { name, fontSize: px(s.fontSize), lineHeight: s.lineHeight, fontWeight: s.fontWeight, sample, usage };
  if (s.letterSpacing) out.letterSpacing = s.letterSpacing;
  if (s.fontStyle && s.fontStyle !== 'normal') out.fontStyle = s.fontStyle;
  return { ...out, ...extra };
};

export const type = {
  fonts: [
    { family: 'Instrument Serif', file: 'fonts/InstrumentSerif_400Regular_Italic.ttf', weight: '400', style: 'italic' },
    { family: 'Instrument Serif', file: 'fonts/InstrumentSerif_400Regular.ttf', weight: '400', style: 'normal' },
    { family: 'Bricolage Grotesque', file: 'fonts/BricolageGrotesque_400Regular.ttf', weight: '400', style: 'normal' },
    { family: 'Bricolage Grotesque', file: 'fonts/BricolageGrotesque_500Medium.ttf', weight: '500', style: 'normal' },
    { family: 'Bricolage Grotesque', file: 'fonts/BricolageGrotesque_600SemiBold.ttf', weight: '600', style: 'normal' },
    { family: 'Bricolage Grotesque', file: 'fonts/BricolageGrotesque_700Bold.ttf', weight: '700', style: 'normal' },
    { family: 'DM Mono', file: 'fonts/DMMono_500Medium.ttf', weight: '500', style: 'normal' },
  ],
  families: {
    display: '"Instrument Serif", Georgia, serif',
    text: '"Bricolage Grotesque", system-ui, sans-serif',
    stamp: '"DM Mono", ui-monospace, monospace',
  },
  groups: [
    {
      name: 'Voice', family: 'display', note: 'Instrument Serif Italic, 21px and up: titles and the things parents say. Never for metadata.',
      styles: [
        style('hero', 'village', 'The wordmark on sign-in. One per app.'),
        style('display', 'buzz', 'Tab titles, lowercase, always over a squiggle.'),
        style('title1', 'Drew Rowny', 'Profile names and sheet titles.'),
        style('title2', 'Saturday Soccer', 'Plan names, section titles ("your village").'),
        style('title3', 'first goal — pure magic', 'Polaroid captions, questions, nudge prompts, section headers in lists.'),
      ],
    },
    {
      name: 'Interface', family: 'text', note: 'Bricolage Grotesque: everything a parent reads to get something done.',
      styles: [
        style('headline', 'Maya Chen', 'Names in rows and bylines; banner headlines.'),
        style('body', 'Bring water and a snack. We meet by the big oak.', 'Long text: plan descriptions, bios, comments.'),
        style('callout', 'North Berkeley · parent to Sasha & Eli', 'Supporting lines under a title.'),
        style('subhead', 'continue with email', 'Buttons (M), chips, reaction counts, short labels.'),
        style('footnote', 'Cesar Chavez Park', 'Metadata and helper text. The floor for anything a parent must read.'),
        style('caption', 'my village', 'Tiny labels on photos and tab badges only.'),
      ],
    },
    {
      name: 'Stamp', family: 'stamp', note: 'DM Mono, uppercase, tracked: dates, times and eyebrows. Reads like a date stamp on a snapshot.',
      styles: [style('stamp', 'SAT · MAY 24', 'Eyebrows above titles, date stickers, the date tile, counts like "2 PLANS".', { textTransform: 'uppercase' })],
    },
  ],
};
for (const g of type.groups) for (const s of g.styles) if (s.textTransform) delete s.textTransform;

export const spacing = {
  note: '4px base. 20px is the screen gutter; 16px is inside cards.',
  tokens: [
    { name: 'space-1', value: '4px', usage: 'Icon-to-text in tight labels; avatar overlap is computed, not spaced.' },
    { name: 'space-2', value: '8px', usage: 'Between chips; between reaction pills; label-to-input.' },
    { name: 'space-3', value: '12px', usage: 'Between related rows; dock pill to create button.' },
    { name: 'space-4', value: '16px', usage: 'Card padding; list-row side padding.' },
    { name: 'space-5', value: '20px', usage: 'Screen gutter (left and right of every tab).' },
    { name: 'space-6', value: '24px', usage: 'Between feed cards; between sections.' },
    { name: 'space-8', value: '32px', usage: 'Above a section title.' },
    { name: 'space-10', value: '40px', usage: 'Empty-state padding.' },
  ],
};
export const radius = {
  note: 'Soft and generous; every control is a capsule. Use continuous (squircle) corners on iOS: borderCurve: "continuous".',
  tokens: [
    { name: 'radius-xs', value: '6px', usage: 'The photo inside a polaroid.' },
    { name: 'radius-sm', value: '10px', usage: 'Stamps and tags.' },
    { name: 'radius-md', value: '16px', usage: 'Inputs, emoji tiles, the date tile.' },
    { name: 'radius-lg', value: '22px', usage: 'Cards and list groups (kept from v1).' },
    { name: 'radius-xl', value: '30px', usage: 'Sheets and the profile sheet over its cover.' },
    { name: 'radius-pill', value: '999px', usage: 'Buttons, chips, the dock, avatars.' },
  ],
};
const sh = (light, dark) => ({ light, dark });
export const shadow = {
  note: 'Three soft elevations plus the lip: a hard 3px shadow under pressable clay and sage fills, the one tactile signature carried over from v1.',
  tokens: [
    { name: 'shadow-card', value: sh('0 1px 2px rgba(45,36,27,0.05), 0 8px 24px -10px rgba(45,36,27,0.22)', '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -10px rgba(0,0,0,0.6)'), usage: 'Cards, list groups, the polaroid.' },
    { name: 'shadow-float', value: sh('0 2px 6px rgba(45,36,27,0.06), 0 16px 40px -12px rgba(45,36,27,0.32)', '0 2px 6px rgba(0,0,0,0.3), 0 16px 40px -12px rgba(0,0,0,0.7)'), usage: 'The dock, sheets, anything that floats over scrolling content.' },
    { name: 'shadow-sticker', value: sh('0 1px 1px rgba(45,36,27,0.08), 0 4px 10px -2px rgba(45,36,27,0.28)', '0 1px 1px rgba(0,0,0,0.3), 0 4px 10px -2px rgba(0,0,0,0.6)'), usage: 'Stamps, emoji stickers, the date tile, emoji tiles.' },
    { name: 'lip-clay', value: sh('0 3px 0 #8a3d22', '0 3px 0 #9c4a2c'), usage: 'Under clay buttons (M, L), the create button and request banners. Pressed: 1px.' },
    { name: 'lip-clay-s', value: sh('0 2px 0 #8a3d22', '0 2px 0 #9c4a2c'), usage: 'Under small clay buttons and the active tab.' },
    { name: 'lip-sage', value: sh('0 3px 0 #3f5732', '0 3px 0 #5e7a4e'), usage: 'Under sage-fill buttons.' },
  ],
};
export const size = {
  note: 'Heights are fixed so rows line up.',
  tokens: [
    { name: 'size-touch', value: '44px', usage: 'Minimum hit area for anything tappable.' },
    { name: 'size-control-l', value: '54px', usage: 'Large buttons and inputs (sign-in, sheets).' },
    { name: 'size-control-m', value: '44px', usage: 'Default buttons and icon buttons.' },
    { name: 'size-control-s', value: '34px', usage: 'Small buttons and reaction pills inside cards (hit area padded to 44).' },
    { name: 'size-chip', value: '36px', usage: 'Filter chips and the presence chip.' },
    { name: 'size-dock', value: '64px', usage: 'The dock pill and the create button.' },
    { name: 'size-avatar-s', value: '28px', usage: 'Avatar stacks.' },
    { name: 'size-avatar-m', value: '32px', usage: 'Bylines.' },
    { name: 'size-avatar-l', value: '44px', usage: 'List rows.' },
    { name: 'size-avatar-xl', value: '96px', usage: 'Profile header.' },
  ],
};

export function tokensJson() {
  return {
    name: 'Village', version: 2,
    meta: { source: 'github', repo: 'wrywonder/dolorian', ref: 'main@f07a75c', paths: { tokens: ['src/lib/constants.ts'], components: ['src/components/ui', 'src/components/feed', 'src/components/plans', 'src/components/profile', 'src/components/prompts'] }, note: 'Refresh of the tokens in src/lib/constants.ts; values are the proposed v2, not what the app ships today. See "Current system" for v1.' },
    color: { themes: [{ id: 'light', name: 'Light' }, { id: 'dark', name: 'After bedtime' }], tokens: colorTokens },
    type, spacing, radius, shadow, size,
  };
}

// tokens.css laid out as the page compiles it
export function tokensCss(fontUrl = (f) => `../${f}`) {
  const resolve = (v, theme) => (typeof v === 'string' ? v : v[theme]);
  const cssVal = (v) => (/^\{(.+)\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v);
  const decl = (theme) => [...colorTokens, ...shadow.tokens].map((t) => `  --${t.name}: ${cssVal(resolve(t.value, theme))};`).join('\n');
  const darkOnly = [...colorTokens, ...shadow.tokens].filter((t) => typeof t.value !== 'string' && t.value.dark !== t.value.light || (typeof t.value !== 'string' && /^\{/.test(t.value.dark)));
  const rootOther = [...spacing.tokens, ...radius.tokens, ...size.tokens].map((t) => `  --${t.name}: ${t.value};`).join('\n');
  const fams = Object.entries(type.families).map(([k, v]) => `  --font-${k}: ${v};`).join('\n');
  const classes = type.groups.flatMap((g) => g.styles.map((s) => `.${s.name} { font-family: var(--font-${g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ''}${s.fontStyle ? ` font-style: ${s.fontStyle};` : ''}${g.family === 'stamp' ? ' text-transform: uppercase;' : ''} }`)).join('\n');
  const faces = type.fonts.map((f) => `@font-face { font-family: "${f.family}"; src: url("${fontUrl(f.file)}"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`).join('\n');
  return `/* Village — generated from tokens.json */\n:root, [data-theme="light"] {\n${decl('light')}\n}\n[data-theme="dark"] {\n${darkOnly.map((t) => `  --${t.name}: ${cssVal(resolve(t.value, 'dark'))};`).join('\n')}\n  color-scheme: dark;\n}\n:root {\n${rootOther}\n${fams}\n}\n${classes}\n${faces}\n`;
}
