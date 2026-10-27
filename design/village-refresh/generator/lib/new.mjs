// AFTER — Village, refreshed. Same warm cream + terracotta world, tidied:
// a real type scale, two type families + one stamp face, accessible color,
// borderless cards, capsule controls, and the playful kit used on purpose.
import { el, elA, abs, row, col } from './h.mjs';
import { icon, sparkle, squiggle } from './icons.mjs';
import * as art from './art.mjs';

export const LIGHT = {
  paper: '#FBF4E9', paper2: '#F3E9DA', card: '#FFFCF7', polaroid: '#FFFFFF',
  ink: '#2D241B', ink2: '#6E5E4E', ink3: '#766553',
  line: '#EADFCD', lineStrong: '#D9CAB4',
  terracotta: '#C96442', clay: '#B85735', clayDeep: '#8A3D22', clayInk: '#A54A2A', clayWash: '#F9E5DA', onClay: '#FFFFFF',
  sun: '#E8A93A', butter: '#F5C77E', sunInk: '#7A5A12', sunWash: '#FCEFD2',
  sage: '#6B8E5A', sageFill: '#5B7A4B', sageDeep: '#3F5732', sageInk: '#4E6B40', sageWash: '#E3ECD3', onSage: '#FFFFFF',
  danger: '#A6372C', dangerWash: '#F8DED8',
  glass: 'rgba(255,252,247,0.80)', glassEdge: 'rgba(255,255,255,0.7)',
  shadowRGB: '45,36,27', tape: 'rgba(245,199,126,0.62)',
};
export const DARK = {
  paper: '#1A1410', paper2: '#221A15', card: '#261D17', polaroid: '#2E241D',
  ink: '#F6EDE1', ink2: '#C9B9A6', ink3: '#A2917D',
  line: '#3A2E25', lineStrong: '#4A3C31',
  terracotta: '#E07650', clay: '#E7845F', clayDeep: '#9C4A2C', clayInk: '#F0997A', clayWash: '#3A2219', onClay: '#1A1410',
  sun: '#F2BE5C', butter: '#E9B866', sunInk: '#F2BE5C', sunWash: '#3A2C14',
  sage: '#9DBE88', sageFill: '#9DBE88', sageDeep: '#5E7A4E', sageInk: '#A9C994', sageWash: '#26301E', onSage: '#1A1410',
  danger: '#F08A7C', dangerWash: '#3B1D18',
  glass: 'rgba(38,29,23,0.78)', glassEdge: 'rgba(255,255,255,0.08)',
  shadowRGB: '0,0,0', tape: 'rgba(233,184,102,0.45)',
};
let T = LIGHT;
export function themed(theme, fn) { const prev = T; T = theme; try { return fn(); } finally { T = prev; } }

// Avatar tones: light fill + a deep "ink" for initials (replaces the old
// dark-under-light-at-70% overlay and rgba(0,0,0,.55) initials).
export const TONES = {
  peach: { fill: '#F2CDAB', ink: '#7E4421' }, golden: { fill: '#F5DD9C', ink: '#6F5310' },
  sage: { fill: '#C6D7B8', ink: '#3F5B33' }, mauve: { fill: '#E2CCDD', ink: '#6B4A66' },
  slate: { fill: '#D0DAE4', ink: '#3E5872' }, rose: { fill: '#F3CCD3', ink: '#8A3D52' },
  butter: { fill: '#F4E0AE', ink: '#6F5512' },
};

const serif = { fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 };
const serifR = { fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'normal', fontWeight: 400 };
const brico = (w) => ({ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontWeight: w });
const mono = { fontFamily: "'DM Mono', ui-monospace, monospace", fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' };

// Type scale — 11 named styles replace ~25 ad-hoc sizes.
export const TYPE = {
  hero: { ...serif, fontSize: 64, lineHeight: '60px', letterSpacing: '-0.02em' },
  display: { ...serif, fontSize: 40, lineHeight: '44px', letterSpacing: '-0.015em' },
  title1: { ...serif, fontSize: 32, lineHeight: '36px', letterSpacing: '-0.01em' },
  title2: { ...serif, fontSize: 26, lineHeight: '30px', letterSpacing: '-0.005em' },
  title3: { ...serif, fontSize: 21, lineHeight: '26px' },
  headline: { ...brico(600), fontSize: 16, lineHeight: '21px' },
  body: { ...brico(400), fontSize: 16, lineHeight: '23px' },
  callout: { ...brico(500), fontSize: 15, lineHeight: '20px' },
  subhead: { ...brico(600), fontSize: 14, lineHeight: '18px' },
  footnote: { ...brico(500), fontSize: 13, lineHeight: '17px' },
  caption: { ...brico(600), fontSize: 12, lineHeight: '15px' },
  stamp: { ...mono, fontSize: 11, lineHeight: '14px' },
};
const t = (name, color, extra = {}) => ({ ...TYPE[name], color: color ?? T.ink, ...extra });

export const RADII = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, pill: 999 };
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 };
const shadow = {
  card: () => `0 1px 2px rgba(${T.shadowRGB},0.05), 0 8px 24px -10px rgba(${T.shadowRGB},0.22)`,
  float: () => `0 2px 6px rgba(${T.shadowRGB},0.06), 0 16px 40px -12px rgba(${T.shadowRGB},0.32)`,
  sticker: () => `0 1px 1px rgba(${T.shadowRGB},0.08), 0 4px 10px -2px rgba(${T.shadowRGB},0.28)`,
};
const lip = (c, y = 3) => `0 ${y}px 0 ${c}`;

// ---------------------------------------------------------------- primitives

export function avatar(initials, tone, size, { ring, presence, scale = 0.36 } = {}) {
  const tn = TONES[tone];
  const core = el('div', {
    width: size, height: size, borderRadius: '50%', background: tn.fill, flexShrink: 0, boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: ring ? `0 0 0 ${ring}px ${T.card}` : undefined,
  }, initials ? el('span', { ...brico(700), fontSize: Math.round(size * scale), color: tn.ink, letterSpacing: '0.01em' }, initials) : '');
  if (!presence) return core;
  // presence ring lives inside the same footprint so rows stay aligned
  return el('div', { width: size, height: size, borderRadius: '50%', boxShadow: `inset 0 0 0 2px ${T.sun}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    avatar(initials, tone, size - 8));
}

export function stack(people, size = 28, overlap = -Math.round(size * 0.18)) {
  // later avatars sit on top; 18% overlap + 2px ring keeps every initial readable
  return el('div', { ...row(), flexShrink: 0 }, people.map(([i, tn], k) => el('div', { marginLeft: k ? overlap : 0, position: 'relative' }, avatar(i, tn, size, { ring: 2, scale: 0.32 }))));
}

/** Sticker: die-cut white edge, rotated, mono label. The only things that tilt. */
export function stamp(label, { tone = 'butter', rotate = 0, size = 'm' } = {}) {
  const tones = {
    butter: [T.butter, '#2D241B'], clay: [T.clay, T.onClay], ink: [T.ink, T.paper], paper: [T.card, T.ink], sage: [T.sageFill, T.onSage],
  }[tone];
  return el('div', {
    display: 'inline-flex', alignItems: 'center', background: tones[0], padding: size === 's' ? '3px 7px' : '5px 9px',
    borderRadius: 8, border: `2px solid ${T.polaroid}`, boxShadow: shadow.sticker(),
    transform: rotate ? `rotate(${rotate}deg)` : undefined, whiteSpace: 'nowrap',
  }, el('span', { ...TYPE.stamp, fontSize: size === 's' ? 10 : 11, color: tones[1] }, label));
}

export function emojiSticker(emoji, size = 52, rotate = 8) {
  return el('div', {
    width: size, height: size, borderRadius: '50%', background: T.polaroid, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: shadow.sticker(), transform: `rotate(${rotate}deg)`,
  }, el('span', { fontSize: Math.round(size * 0.56), lineHeight: 1 }, emoji));
}

export function button(label, { variant = 'primary', size = 'M', iconL, iconR, full, ariaLabel } = {}) {
  const H = { L: 54, M: 44, S: 34 }[size];
  const fs = { L: 17, M: 15, S: 14 }[size];
  const v = {
    primary: { bg: T.clay, fg: T.onClay, lip: lip(T.clayDeep, size === 'S' ? 2 : 3) },
    sage: { bg: T.sageFill, fg: T.onSage, lip: lip(T.sageDeep, size === 'S' ? 2 : 3) },
    tonal: { bg: T.clayWash, fg: T.clayInk },
    sageTonal: { bg: T.sageWash, fg: T.sageInk },
    secondary: { bg: T.paper2, fg: T.ink },
    ghost: { bg: 'transparent', fg: T.clayInk },
    quiet: { bg: 'transparent', fg: T.ink2 },
    dark: { bg: '#000000', fg: '#FFFFFF' },
  }[variant];
  const ic = (n) => icon(n, Math.round(fs * 1.15), v.fg, 2.2);
  return elA('button', { type: 'button', 'aria-label': ariaLabel }, {
    height: H, padding: `0 ${variant === 'ghost' || variant === 'quiet' ? 4 : { L: 24, M: 18, S: 14 }[size]}px`, borderRadius: 999,
    background: v.bg, color: v.fg, border: 'none', boxShadow: v.lip, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    width: full ? '100%' : undefined, flexShrink: 0, cursor: 'pointer', boxSizing: 'border-box',
  }, iconL ? ic(iconL) : '', el('span', { ...brico(700), fontSize: fs, lineHeight: 1, letterSpacing: '-0.005em', whiteSpace: 'nowrap' }, label), iconR ? ic(iconR) : '');
}

export function iconButton(name, { variant = 'paper', size = 44, label = name, badge } = {}) {
  const v = {
    clay: { bg: T.clay, fg: T.onClay, sh: lip(T.clayDeep, 3) },
    paper: { bg: T.card, fg: T.ink, sh: shadow.card() },
    glass: { bg: T.glass, fg: T.ink, sh: shadow.sticker(), blur: 'blur(14px) saturate(1.3)' },
    sunken: { bg: T.paper2, fg: T.ink },
  }[variant];
  return elA('button', { type: 'button', 'aria-label': label }, {
    width: size, height: size, borderRadius: '50%', background: v.bg, boxShadow: v.sh, border: 'none', backdropFilter: v.blur,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', padding: 0,
  }, icon(name, Math.round(size * 0.48), v.fg, 2), badge ? el('span', { ...abs({ top: -2, right: -2 }), minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: T.clay, boxShadow: `0 0 0 2px ${T.paper}`, ...brico(700), fontSize: 11, lineHeight: '18px', color: T.onClay, textAlign: 'center', boxSizing: 'border-box' }, String(badge)) : '');
}

export function chip(label, { selected = false, iconL, menu = false } = {}) {
  return elA('button', { type: 'button', 'aria-pressed': String(selected) }, {
    height: 36, padding: '0 14px', borderRadius: 999, border: selected ? 'none' : `1px solid ${T.line}`,
    background: selected ? T.ink : T.card, color: selected ? T.paper : T.ink2, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, boxSizing: 'border-box',
  }, iconL ? icon(iconL, 16, selected ? T.paper : T.ink2, 2) : '', el('span', { ...TYPE.subhead, whiteSpace: 'nowrap', color: selected ? T.paper : (menu ? T.ink : T.ink2) }, label), menu ? icon('chevron.down', 14, selected ? T.paper : T.ink, 2.4) : '');
}

export function segmented(options, selected) {
  return el('div', { ...row(), height: 40, padding: 3, borderRadius: 999, background: T.paper2, boxSizing: 'border-box' },
    options.map((o) => elA('button', { type: 'button', 'aria-pressed': String(o === selected) }, {
      flex: 1, height: 34, borderRadius: 999, border: 'none', background: o === selected ? T.card : 'transparent',
      boxShadow: o === selected ? shadow.sticker() : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }, el('span', { ...TYPE.subhead, color: o === selected ? T.ink : T.ink2 }, o))));
}

export function pulseDot(size = 10) {
  // static rest frame of the pulse: solid sun dot + soft halo
  return el('span', { position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 },
    el('span', { ...abs({ inset: -4 }), borderRadius: '50%', background: T.sun, opacity: 0.25 }),
    el('span', { ...abs({ inset: 0 }), borderRadius: '50%', background: T.sun }));
}

export function presenceChip(people = [['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']]) {
  return elA('button', { type: 'button', 'aria-label': 'Out and about: on. 3 friends visible' }, {
    ...row({ gap: 8 }), height: 36, padding: '0 5px 0 12px', borderRadius: 999, background: T.sunWash, border: 'none', boxSizing: 'border-box',
  }, pulseDot(9), el('span', { ...TYPE.subhead, color: T.sunInk, whiteSpace: 'nowrap' }, 'out &amp; about'),
  people.length ? stack(people, 24) : '');
}

export function header({ eyebrow, title, right, flourish = 'squiggle' }) {
  return el('div', { padding: '6px 20px 0', ...row({ alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }) },
    el('div', { flex: 1, minWidth: 0 },
      el('div', t('stamp', T.ink3, { marginBottom: 2 }), eyebrow),
      el('div', { ...row({ alignItems: 'flex-end', gap: 8 }) }, el('h1', t('display', T.ink, { margin: 0 }), title),
        flourish === 'sparkle' ? el('div', { marginBottom: 10 }, sparkle(16, T.sun)) : ''),
      flourish === 'squiggle' ? el('div', { marginTop: 2 }, squiggle(54, T.terracotta, 2.4)) : ''),
    right ? el('div', { ...row({ gap: 10 }), paddingBottom: 10 }, right) : '');
}

const CREATE = { buzz: 'New post', irl: 'New hangout spot', plans: 'New plan', you: 'Invite a parent' };

/** The dock: a floating glass tab pill plus one create button that always
 *  lives in the same spot and does the obvious thing for the current tab. */
export function tabBar(active, badges = {}) {
  const tabs = [['buzz', 'feed'], ['irl', 'map.pin'], ['plans', 'calendar'], ['you', 'person']];
  return elA('nav', { 'aria-label': 'Tabs' }, { ...abs({ left: 0, right: 0, bottom: 0 }), padding: '0 20px 28px', zIndex: 30, ...row({ gap: 12 }) },
    el('div', {
      flex: 1, height: 64, borderRadius: 32, background: T.glass, backdropFilter: 'blur(20px) saturate(1.4)',
      boxShadow: `${shadow.float()}, inset 0 0 0 1px ${T.glassEdge}`, ...row({ gap: 2 }), padding: '0 8px', boxSizing: 'border-box',
    },
    tabs.map(([k, ic]) => {
      const on = k === active;
      return elA('button', { type: 'button', 'aria-label': k, 'aria-current': on ? 'page' : undefined }, {
        flex: on ? 1.9 : 1, height: 48, borderRadius: 24, border: 'none', background: on ? T.clay : 'transparent',
        boxShadow: on ? lip(T.clayDeep, 2) : undefined, ...row({ justifyContent: 'center', gap: 6 }), position: 'relative', padding: 0,
      },
      icon(on ? `${ic}.fill` : ic, 24, on ? T.onClay : T.ink3, 2),
      on ? el('span', { ...brico(700), fontSize: 15, color: T.onClay }, k === 'irl' ? 'IRL' : k) : '',
      !on && badges[k] ? el('span', { ...abs({ top: 6, left: '54%' }), minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: T.clay, boxShadow: `0 0 0 2.5px ${T.card}`, ...brico(700), fontSize: 11, lineHeight: '18px', color: T.onClay, textAlign: 'center', boxSizing: 'border-box' }, String(badges[k])) : '');
    })),
    el('div', { transform: 'rotate(-6deg)', flexShrink: 0 },
      elA('button', { type: 'button', 'aria-label': CREATE[active] }, {
        width: 64, height: 64, borderRadius: '50%', background: T.clay, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `${lip(T.clayDeep, 3)}, ${shadow.float()}`, padding: 0,
      }, icon('plus', 28, T.onClay, 2.6))));
}

function screen(content, overlay = '', { edgeToEdge = false } = {}) {
  return el('div', { width: 390, height: 844, background: T.paper, position: 'relative', overflow: 'hidden', ...brico(400), color: T.ink },
    edgeToEdge ? '' : el('div', { height: 59 }), content, overlay);
}

export function reactionPill(emoji, count, { mine = false, on = 'card' } = {}) {
  return elA('button', { type: 'button', 'aria-pressed': String(mine) }, {
    ...row({ gap: 6 }), height: 34, padding: '0 12px', borderRadius: 999, border: 'none',
    background: mine ? T.clayWash : (on === 'polaroid' ? T.paper : T.paper2),
  }, el('span', { fontSize: 15, lineHeight: 1 }, emoji), el('span', { ...TYPE.subhead, color: mine ? T.clayInk : T.ink2 }, String(count)));
}
export function commentPill(count, on) {
  return elA('button', { type: 'button', 'aria-label': `${count} comments` }, {
    ...row({ gap: 6 }), height: 34, padding: '0 12px', borderRadius: 999, border: 'none', background: on === 'polaroid' ? T.paper : T.paper2,
  }, icon('bubble', 17, T.ink2, 2), el('span', { ...TYPE.subhead, color: T.ink2 }, String(count)));
}

// ---------------------------------------------------------------- feed cards

/** Polaroid: square photo, the caption "written" on the bottom strip. */
export function photoPost({ name, initials, tone, venue, caption, scene, when, likes, comments, mine }) {
  return el('article', { position: 'relative' },
    el('div', { background: T.polaroid, borderRadius: 14, padding: '10px 10px 14px', boxShadow: shadow.card() },
      el('div', { aspectRatio: '5 / 4', borderRadius: 6, overflow: 'hidden', position: 'relative' }, scene, T === DARK ? el('div', { ...abs({ inset: 0 }), background: 'rgba(0,0,0,0.1)' }) : ''),
      el('p', t('title3', T.ink, { margin: '14px 6px 0' }), caption),
      el('div', { ...row({ gap: 10 }), margin: '12px 6px 0' },
        avatar(initials, tone, 32),
        el('div', { flex: 1, minWidth: 0 },
          el('div', t('subhead', T.ink), name),
          el('div', t('footnote', T.ink3, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }), venue)),
        el('div', { ...row({ gap: 6 }) }, reactionPill('❤️', likes, { mine, on: 'polaroid' }), commentPill(comments, 'polaroid')))),
    el('div', { ...abs({ top: -9, right: 16 }) }, stamp(when, { rotate: 5 })));
}

/** Speech bubble: the question in the parent's voice, tail toward the asker. */
export function questionPost({ name, initials, tone, when, body, reactions, answers }) {
  const tail = `<svg aria-hidden="true" width="22" height="14" viewBox="0 0 22 14" style="position:absolute;left:30px;bottom:-12px;display:block"><path d="M0 0 H22 C14 2 6 8 2 14 C3 8 2 4 0 0Z" fill="${T.card}"/></svg>`;
  return el('article', { position: 'relative', marginBottom: 12 },
    el('div', { background: T.card, borderRadius: 22, padding: '16px 16px 14px', boxShadow: shadow.card(), position: 'relative' },
      el('div', { ...row({ gap: 10 }), marginBottom: 10 },
        avatar(initials, tone, 32),
        el('div', { flex: 1, minWidth: 0 }, el('div', t('subhead', T.ink), `${name} asks`), el('div', t('footnote', T.ink3), when)),
        el('span', { ...TYPE.stamp, color: T.clayInk, background: T.clayWash, padding: '5px 8px', borderRadius: 8 }, 'help ✋')),
      el('p', t('title3', T.ink, { margin: 0, fontSize: 22, lineHeight: '27px' }), body),
      el('div', { ...row({ gap: 6 }), marginTop: 14 },
        reactionPill('🤸', reactions), commentPill(answers),
        el('div', { flex: 1 }), button('answer', { variant: 'ghost', size: 'S', iconR: 'arrow.right' })),
      tail));
}

/** A note taped to the fridge: the nudge prompt. Tape tilts; the note doesn't. */
export function nudgeCard(activity, emoji) {
  return el('aside', { position: 'relative', marginTop: 8 },
    el('div', { ...abs({ top: -9, left: '50%' }), marginLeft: -34, width: 68, height: 20, background: T.tape, borderRadius: 3, transform: 'rotate(-3deg)', zIndex: 2 }),
    el('div', { background: T.sageWash, borderRadius: 22, padding: '18px 16px 14px', ...row({ alignItems: 'flex-start', gap: 14 }) },
      el('div', { width: 48, height: 48, borderRadius: 16, background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: shadow.sticker(), position: 'relative' },
        el('span', { fontSize: 26, lineHeight: 1 }, emoji), el('div', { ...abs({ top: -7, right: -7 }) }, sparkle(14, T.sun))),
      el('div', { flex: 1, minWidth: 0 },
        el('div', t('stamp', T.sageInk), 'a little nudge'),
        el('p', t('title3', T.ink, { margin: '4px 0 0' }),
          'Share a moment from ', el('span', { textDecoration: `underline dotted ${T.sage}`, textDecorationThickness: '2px', textUnderlineOffset: '5px' }, activity), '?'),
        el('div', { ...row({ gap: 4 }), marginTop: 12 },
          button('snap one', { variant: 'sage', size: 'M', iconL: 'camera' }),
          button('not now', { variant: 'quiet', size: 'M' })))));
}

// ---------------------------------------------------------------- plan card

/** Plan "flyer": photo on top, a tear-off date tile, then the details. */
export function activityCard({ name, emoji, scene, audience, dow, day, time, place, desc, going, interestedLabel, state }) {
  const imgH = 176;
  const cta = state === 'going'
    ? button('going', { variant: 'sageTonal', size: 'M', iconL: 'check' })
    : button('I’m in', { variant: 'primary', size: 'M' });
  return el('article', { position: 'relative' },
    el('div', { background: T.card, borderRadius: 22, overflow: 'hidden', boxShadow: shadow.card() },
      el('div', { position: 'relative', height: imgH },
        scene,
        el('div', { ...abs({ top: 12, left: 12 }), ...row({ gap: 6 }), height: 28, padding: '0 10px', borderRadius: 999, background: T.glass, backdropFilter: 'blur(12px)' },
          icon(audience === 'my village' ? 'person.2' : 'map.pin', 14, T.ink, 2), el('span', t('caption', T.ink), audience))),
      el('div', { padding: '0 16px 16px' },
        el('div', { ...row({ alignItems: 'flex-end', gap: 12 }), marginTop: -26 },
          el('div', { width: 58, height: 64, borderRadius: 14, background: T.polaroid, boxShadow: shadow.sticker(), ...col({ alignItems: 'center', justifyContent: 'center' }), flexShrink: 0, position: 'relative', zIndex: 2 },
            el('span', t('stamp', T.clayInk, { fontSize: 11 }), dow),
            el('span', { ...serifR, fontSize: 30, lineHeight: '30px', color: T.ink, fontVariantNumeric: 'tabular-nums' }, day)),
          el('div', t('subhead', T.ink2, { paddingBottom: 4, minWidth: 0 }), `${time} · ${place}`)),
        el('h2', t('title2', T.ink, { margin: '12px 0 0' }), name),
        el('p', t('callout', T.ink2, { margin: '4px 0 0', fontWeight: 400 }), desc),
        el('div', { height: 1, background: T.line, margin: '14px 0' }),
        el('div', { ...row({ gap: 10 }) },
          going ? stack(going[0], 30) : '',
          el('div', { flex: 1, minWidth: 0 },
            el('div', t('subhead', T.sageInk), `${going[1]} families going`),
            interestedLabel ? el('div', t('footnote', T.ink3), interestedLabel) : ''),
          cta))),
    el('div', { ...abs({ top: -12, right: -4 }), zIndex: 3 }, emojiSticker(emoji, 54, 10)));
}

// ---------------------------------------------------------------- screens

export function buzz() {
  const feed = el('div', { padding: '20px 20px 0', ...col({ gap: 22 }) },
    nudgeCard('saturday soccer', '⚽'),
    photoPost({ name: 'Maya Chen', initials: 'MC', tone: 'peach', venue: 'Cesar Chavez Park 🌳', caption: 'first goal — pure magic', scene: art.soccer(), when: 'sat · 22 min', likes: 12, comments: 3, mine: true }),
    questionPost({ name: 'Jordan', initials: 'JP', tone: 'sage', when: '1h ago', body: 'Anyone tried toddler tumbling at Studio Grow? Felix (3) is climbing things.', reactions: 4, answers: 6 }),
  );
  return screen(header({ eyebrow: 'sat · may 24', title: 'buzz', right: presenceChip() }) + feed, tabBar('buzz', { you: 2 }));
}
export const buzzDark = () => themed(DARK, buzz);

export function plans() {
  const filters = el('div', { ...row({ gap: 8 }), padding: '18px 20px 0', overflow: 'hidden' },
    chip('upcoming', { selected: true, menu: true }), el('div', { width: 1, height: 22, background: T.lineStrong, flexShrink: 0, margin: '0 2px' }),
    chip('my village'), chip('invited'), chip('public'), chip('made by me'));
  const list = el('div', { padding: '0 20px', ...col({ gap: 28 }) },
    el('div', { ...row({ justifyContent: 'space-between', alignItems: 'baseline' }), marginTop: 22, marginBottom: -12 },
      el('h2', t('title3', T.ink, { margin: 0 }), 'this weekend'), el('span', t('stamp', T.ink3), '2 plans')),
    activityCard({ name: 'Saturday Soccer', emoji: '⚽', scene: art.soccer(), audience: 'public', dow: 'sat', day: '24', time: '10am', place: 'Cesar Chavez Park', desc: 'show up. kick ball. eat snacks.', going: [[['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 3], interestedLabel: 'Priya is interested' }),
    activityCard({ name: 'Wildcat Hike', emoji: '🥾', scene: art.hike(), audience: 'my village', dow: 'sun', day: '25', time: '9:30am', place: 'Tilden Park', desc: 'easy 2 mi · carriers welcome', going: [[['SW', 'butter'], ['DR', 'rose']], 2], interestedLabel: 'you and Sam', state: 'going' }));
  return screen(
    header({ eyebrow: 'what’s happening', title: 'plans', right: iconButton('search', { variant: 'paper', label: 'Search and sort' }) + iconButton('calendar', { variant: 'paper', label: 'Calendar view' }) })
    + filters + list,
    tabBar('plans', { you: 2 }));
}

export function you() {
  const cover = el('div', { height: 236, position: 'relative', overflow: 'hidden' },
    art.cover(),
    el('div', { ...abs({ top: 59, right: 20 }), ...row({ gap: 10 }) }, iconButton('cog', { variant: 'glass', label: 'Settings' })));
  const statCell = (n, label, last) => el('div', { flex: 1, padding: '14px 0 12px', textAlign: 'center', borderRight: last ? undefined : `1px solid ${T.line}` },
    el('div', { ...serifR, fontSize: 30, lineHeight: '32px', color: T.ink, fontVariantNumeric: 'tabular-nums' }, String(n)),
    el('div', t('footnote', T.ink3, { marginTop: 2 }), label));
  const conn = (name, sub, i, tn, { here, last } = {}) => el('div', { ...row({ gap: 12 }), minHeight: 68, padding: '0 14px 0 16px', position: 'relative' },
    avatar(i, tn, 44, { presence: here }),
    el('div', { flex: 1, minWidth: 0 }, el('div', t('headline', T.ink), name),
      el('div', { ...row({ gap: 6 }), marginTop: 2 }, here ? pulseDot(7) : '', el('span', t('footnote', here ? T.sunInk : T.ink3), sub))),
    elA('button', { type: 'button', 'aria-label': `More for ${name}` }, { width: 44, height: 44, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginRight: -8 }, icon('ellipsis', 20, T.ink3)),
    last ? '' : el('div', { ...abs({ left: 72, right: 0, bottom: 0 }), height: 1, background: T.line }));
  const sheet = el('div', { marginTop: -30, background: T.paper, borderRadius: '30px 30px 0 0', position: 'relative', padding: '0 20px' },
    el('div', { ...row({ alignItems: 'flex-end', justifyContent: 'space-between' }), marginTop: -48 },
      el('div', { borderRadius: '50%', boxShadow: `0 0 0 5px ${T.paper}` }, avatar('DR', 'rose', 96)),
      el('div', { paddingBottom: 6 }, button('edit profile', { variant: 'secondary', size: 'S', iconL: 'pencil' }))),
    el('h1', t('title1', T.ink, { margin: '12px 0 0', fontSize: 36, lineHeight: '38px' }), 'Drew Rowny'),
    el('div', t('callout', T.ink3, { marginTop: 4 }), 'North Berkeley · parent to Sasha &amp; Eli'),
    el('div', { ...row({ gap: 6 }), marginTop: 12 }, icon('pencil', 16, T.clayInk, 2), el('span', t('subhead', T.clayInk), 'add a line about your family')),
    el('div', { ...row(), marginTop: 18, background: T.card, borderRadius: 22, boxShadow: shadow.card() },
      statCell(12, 'connections'), statCell(2, 'kids'), statCell(3, 'hangouts', true)),
    el('div', { ...row({ gap: 12 }), marginTop: 14, padding: '14px 14px 14px 16px', borderRadius: 22, background: T.clay, boxShadow: lip(T.clayDeep, 3), position: 'relative' },
      el('div', { ...abs({ top: -10, left: 64 }) }, sparkle(18, T.butter)),
      stack([['SW', 'butter'], ['PP', 'mauve']], 34),
      el('div', { flex: 1 }, el('div', t('headline', T.onClay), '2 parents want to connect'), el('div', t('footnote', T.onClay, { opacity: 0.88 }), 'say hello in your village')),
      icon('chevron.right', 20, T.onClay, 2.2)),
    el('div', { ...row({ justifyContent: 'space-between', alignItems: 'baseline' }), marginTop: 26, marginBottom: 10 },
      el('h2', t('title2', T.ink, { margin: 0 }), 'your village'), button('see all 12', { variant: 'ghost', size: 'S' })),
    el('div', { background: T.card, borderRadius: 22, boxShadow: shadow.card(), overflow: 'hidden' },
      conn('Maya Chen', 'at Cesar Chavez Park', 'MC', 'peach', { here: true }), conn('Jordan Park', 'North Berkeley', 'JP', 'sage'), conn('Priya Patel', 'Albany', 'PP', 'mauve', { last: true })));
  return screen(cover + sheet, tabBar('you'), { edgeToEdge: true });
}

export function signin({ logoSrc = '../assets/icon-village.png' } = {}) {
  // a small "fridge door" cluster: one polaroid, one emoji sticker, one stamp
  const cluster = el('div', { ...abs({ top: 112, right: 24 }), width: 132, height: 170 },
    el('div', { ...abs({ top: 0, right: 0 }), width: 116, background: T.polaroid, padding: '7px 7px 20px', borderRadius: 8, boxShadow: shadow.card(), transform: 'rotate(7deg)' },
      el('div', { aspectRatio: '1 / 1', borderRadius: 4, overflow: 'hidden' }, art.swing())),
    el('div', { ...abs({ top: -14, left: -2 }) }, emojiSticker('🧁', 46, -10)),
    el('div', { ...abs({ bottom: 6, left: -6 }) }, stamp('sat · 10am', { rotate: -5 })));
  const top = el('div', { padding: '0 28px', position: 'relative' },
    elA('img', { src: logoSrc, alt: 'Village', width: 60, height: 60 }, { display: 'block', width: 60, height: 60, borderRadius: 15, boxShadow: shadow.sticker() }),
    el('h1', t('hero', T.ink, { margin: '30px 0 0' }), 'village'),
    el('div', { marginTop: 10 }, squiggle(84, T.terracotta, 2.6)),
    el('p', t('title3', T.ink2, { margin: '18px 0 0', fontSize: 23, lineHeight: '29px', maxWidth: 300 }), 'the easy way to find your people and make a plan.'));
  const sheet = el('div', { ...abs({ left: 0, right: 0, bottom: 0 }), background: T.card, borderRadius: '30px 30px 0 0', padding: '26px 20px 34px', boxShadow: shadow.float(), ...col({ gap: 14 }) },
    button('Continue with Apple', { variant: 'dark', size: 'L', iconL: 'apple', full: true }),
    el('div', { ...row({ gap: 12 }) }, el('div', { flex: 1, height: 1, background: T.line }), el('span', t('footnote', T.ink3), 'or use email'), el('div', { flex: 1, height: 1, background: T.line })),
    el('div', { ...col({ gap: 6 }) },
      elA('label', { for: 'email' }, t('subhead', T.ink2), 'email'),
      el('div', { height: 54, padding: '0 16px', borderRadius: 16, border: `2px solid ${T.clay}`, background: T.paper, ...row(), boxSizing: 'border-box', boxShadow: `0 0 0 4px ${T.clayWash}` },
        el('span', { ...brico(500), fontSize: 17, color: T.ink }, 'maya.chen@example.com'), el('span', { width: 2, height: 22, background: T.clay, marginLeft: 1 }))),
    el('div', t('footnote', T.ink3), 'No password. We’ll email you an 8-digit code — it signs you in or creates your account.'),
    button('continue with email', { variant: 'primary', size: 'L', iconR: 'arrow.right', full: true }));
  return el('div', { width: 390, height: 844, background: T.paper, position: 'relative', overflow: 'hidden', ...brico(400) },
    el('div', { height: 150 }), top, cluster, sheet);
}

// ---------------------------------------------------------------- extra exports for the walkthrough sheet
export function statStrip(items = [[12, 'connections'], [2, 'kids'], [3, 'hangouts']]) {
  return el('div', { ...row(), background: T.card, borderRadius: 22, boxShadow: shadow.card() },
    items.map(([n, label], i) => el('div', { flex: 1, padding: '14px 0 12px', textAlign: 'center', borderRight: i === items.length - 1 ? undefined : `1px solid ${T.line}` },
      el('div', { ...serifR, fontSize: 30, lineHeight: '32px', color: T.ink, fontVariantNumeric: 'tabular-nums' }, String(n)),
      el('div', t('footnote', T.ink3, { marginTop: 2 }), label))));
}
export function listRows() {
  const conn = (name, sub, i, tn, { here, last } = {}) => el('div', { ...row({ gap: 12 }), minHeight: 68, padding: '0 6px 0 16px', position: 'relative' },
    avatar(i, tn, 44, { presence: here }),
    el('div', { flex: 1, minWidth: 0 }, el('div', t('headline', T.ink), name),
      el('div', { ...row({ gap: 6 }), marginTop: 2 }, here ? pulseDot(7) : '', el('span', t('footnote', here ? T.sunInk : T.ink3), sub))),
    elA('button', { type: 'button', 'aria-label': `More for ${name}` }, { width: 44, height: 44, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }, icon('ellipsis', 20, T.ink3)),
    last ? '' : el('div', { ...abs({ left: 72, right: 0, bottom: 0 }), height: 1, background: T.line }));
  return el('div', { background: T.card, borderRadius: 22, boxShadow: shadow.card(), overflow: 'hidden' },
    conn('Maya Chen', 'at Cesar Chavez Park', 'MC', 'peach', { here: true }), conn('Jordan Park', 'North Berkeley', 'JP', 'sage', { last: true }));
}
export function requestBanner() {
  return el('div', { ...row({ gap: 12 }), padding: '14px 14px 14px 16px', borderRadius: 22, background: T.clay, boxShadow: lip(T.clayDeep, 3), position: 'relative' },
    el('div', { ...abs({ top: -10, left: 64 }) }, sparkle(18, T.butter)),
    stack([['SW', 'butter'], ['PP', 'mauve']], 34),
    el('div', { flex: 1 }, el('div', t('headline', T.onClay), '2 parents want to connect'), el('div', t('footnote', T.onClay, { opacity: 0.88 }), 'say hello in your village')),
    icon('chevron.right', 20, T.onClay, 2.2));
}
export function textField({ label = 'email', value = 'maya.chen@example.com', focus = false, error, code = false } = {}) {
  const border = error ? `2px solid ${T.danger}` : focus ? `2px solid ${T.clay}` : `1.5px solid ${T.lineStrong}`;
  return el('div', { ...col({ gap: 6 }) },
    el('label', t('subhead', T.ink2), label),
    el('div', { height: 54, padding: '0 16px', borderRadius: 16, border, background: T.paper, ...row(), boxSizing: 'border-box', boxShadow: focus ? `0 0 0 4px ${T.clayWash}` : undefined },
      el('span', code ? { fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 22, letterSpacing: '0.3em', color: T.ink } : { ...brico(500), fontSize: 17, color: T.ink }, value)),
    error ? el('div', { ...row({ gap: 6 }), ...TYPE.footnote, color: T.danger }, icon('x', 16, T.danger, 2.2), error) : '');
}
export { shadow, lip, t as typeStyle };
