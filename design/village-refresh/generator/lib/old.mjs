// BEFORE — a faithful port of the current RN screens (src/components/**,
// src/app/(tabs)/**) using the exact values in src/lib/constants.ts and the
// ad-hoc values hardcoded in each component.
import { el, abs, row, col } from './h.mjs';
import { icon, sparkle, squiggle, dottedUnderline } from './icons.mjs';
import * as art from './art.mjs';

export const C = {
  cream: '#FBF4E9', dark: '#2D241B', brownMid: '#6E5E4E', taupe: '#A0907E',
  terracotta: '#C96442', golden: '#E8A93A', amberLight: '#F5C77E', sage: '#6B8E5A',
  sageSoft: '#DCE7C9', surface: '#FFFDF6', rule: '#ECD49A', white: '#FFFFFF',
};
export const TONES = {
  peach: { light: '#F0C7A0', dark: '#D49266' }, golden: { light: '#F5DD9C', dark: '#E0B85B' },
  sage: { light: '#B5C9A8', dark: '#7C9E6A' }, mauve: { light: '#D6BBD0', dark: '#A685A0' },
  slate: { light: '#C8D3DE', dark: '#7A93AC' }, rose: { light: '#F0BFC8', dark: '#D08496' },
  butter: { light: '#F2DA9E', dark: '#E5C172' },
};
const serif = { fontFamily: "'Instrument Serif'", fontStyle: 'italic', fontWeight: 400 };
const serifR = { fontFamily: "'Instrument Serif'", fontStyle: 'normal', fontWeight: 400 };
const sans = (w) => ({ fontFamily: "'Plus Jakarta Sans'", fontWeight: w });
const mono = (w) => ({ fontFamily: "'Space Grotesk'", fontWeight: w });
// RN shadow -> CSS (blur ~ 2x shadowRadius reads closest to iOS)
const sh = (y, r, rgba) => `0 ${y}px ${r * 2}px ${rgba}`;

export function avatar(initials, tone, size, ring) {
  const t = TONES[tone];
  return el('div', {
    width: size, height: size, borderRadius: '50%', background: t.dark, position: 'relative', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box',
    border: ring ? `${ring.w}px solid ${ring.c}` : undefined,
  },
  el('div', { ...abs({ inset: 0 }), background: t.light, opacity: 0.7 }),
  el('span', { position: 'relative', ...sans(700), fontSize: size * 0.34, color: 'rgba(0,0,0,0.55)' }, initials));
}

export function stamp(label, rotation = 0, variant = 'light') {
  return el('div', {
    background: variant === 'light' ? C.amberLight : C.dark, padding: '6px 11px', borderRadius: 10,
    border: `1.5px solid ${C.white}`, boxShadow: sh(3, 8, 'rgba(180,140,40,0.35)'),
    transform: rotation ? `rotate(${rotation}deg)` : undefined, display: 'inline-flex',
  }, el('span', { ...mono(700), fontSize: 10.5, color: variant === 'light' ? C.dark : C.white, letterSpacing: 0.4, lineHeight: '13px' }, label));
}

function header({ eyebrow, title, right, flourish = 'squiggle' }) {
  return el('div', { padding: '8px 18px 0', ...row({ alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }) },
    el('div', { flex: 1, minWidth: 0 },
      el('div', { ...mono(700), fontSize: 11, color: C.brownMid, letterSpacing: 0.7, marginBottom: 2, lineHeight: '14px' }, eyebrow),
      el('div', { ...row({ alignItems: 'flex-end', gap: 8 }) },
        el('div', { ...serif, fontSize: 38, color: C.dark, letterSpacing: -0.6, lineHeight: '40px' }, title),
        flourish === 'sparkle' ? el('div', { marginBottom: 6 }, sparkle(16, C.amberLight)) : ''),
      flourish === 'squiggle' ? el('div', { marginTop: 4 }, squiggle(60, C.terracotta)) : ''),
    right ? el('div', { paddingBottom: 4 }, right) : '');
}

function visibilityChip() {
  const avs = [['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']];
  return el('div', {
    position: 'relative', ...row({ gap: 8 }), padding: '6px 10px 6px 8px', borderRadius: 999, background: C.surface,
    border: `1px solid ${C.rule}`, boxShadow: sh(1, 3, 'rgba(180,140,40,0.1)'),
  },
  el('div', { marginLeft: 2, width: 9, height: 9, borderRadius: '50%', background: C.golden, boxShadow: `0 0 0 4px rgba(232,169,58,0.22)` }),
  el('span', { ...sans(800), fontSize: 12, color: '#8A6B22', letterSpacing: 0.1, whiteSpace: 'nowrap' }, 'out &amp; about · auto'),
  el('div', { ...row(), borderLeft: `1px solid ${C.rule}`, paddingLeft: 6 },
    avs.map(([i, t], k) => el('div', { marginLeft: k ? -6 : 0 }, avatar('', t, 18, { w: 1.5, c: C.surface })))),
  el('div', { ...abs({ top: -3, right: -2 }) }, sparkle(9, C.golden)));
}

function reactionRow(count = 12, comments = 3, emoji = '❤️') {
  const pill = (inner) => el('div', { ...row({ gap: 5 }), padding: '5px 10px', borderRadius: 14, background: C.surface, border: `1px solid ${C.rule}` }, inner);
  return el('div', { ...row({ gap: 8 }), flexShrink: 0 },
    pill([el('span', { fontSize: 14, lineHeight: '17px' }, emoji), el('span', { ...sans(800), fontSize: 13, color: C.brownMid }, String(count))]),
    pill([icon('bubble', 15, C.taupe, 2), el('span', { ...sans(700), fontSize: 13, color: C.brownMid }, String(comments))]));
}

export function photoPost({ name, venue, caption, scene, stampLabel, tone, initials, likes, comments }) {
  return el('div', { marginBottom: 24, position: 'relative' },
    el('div', { background: C.white, padding: '10px 10px 14px', borderRadius: 6, boxShadow: sh(4, 18, 'rgba(45,36,27,0.12)') },
      el('div', { height: 300, borderRadius: 2, overflow: 'hidden' }, scene),
      el('div', { paddingTop: 12, padding: '12px 4px 0', ...row({ gap: 10 }) },
        avatar(initials, tone, 30),
        el('div', { flex: 1, minWidth: 0 },
          el('div', { ...sans(800), fontSize: 13.5, color: C.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '17px' }, `${name} · ${venue}`),
          el('div', { ...serif, fontSize: 14, color: C.brownMid, lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, `“${caption}”`)),
        reactionRow(likes, comments))),
    el('div', { ...abs({ top: -10, right: -6 }), zIndex: 5 }, stamp(stampLabel, 8)),
    el('div', { ...abs({ bottom: 36, left: -8 }) }, sparkle(16, C.terracotta)));
}

function questionPost({ name, initials, tone, when, body, isQuestion = true }) {
  const tail = el('div', { ...abs({ bottom: -11, left: 27 }), width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '13px solid transparent', borderTop: `13px solid ${C.rule}` })
    + el('div', { ...abs({ bottom: -9.5, left: 28 }), width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '12px solid transparent', borderTop: `12px solid ${C.surface}` });
  return el('div', { marginBottom: 18, position: 'relative' },
    el('div', { background: C.surface, borderRadius: 22, padding: '14px 16px', border: `1px solid ${C.rule}`, position: 'relative' },
      el('div', { ...row({ gap: 10 }), marginBottom: 6 },
        avatar(initials, tone, 28),
        el('div', { flex: 1, ...row({ alignItems: 'baseline' }) },
          el('span', { ...sans(800), fontSize: 13, color: C.dark }, `${name}${isQuestion ? ' asks' : ''}`),
          el('span', { ...serif, fontSize: 13, color: C.taupe, marginLeft: 4 }, `· ${when}`)),
        isQuestion ? el('div', { background: 'rgba(201,100,66,0.13)', padding: '3px 8px', borderRadius: 8 },
          el('span', { ...sans(800), fontSize: 10, color: C.terracotta, letterSpacing: 0.4 }, 'HELP ✋')) : ''),
      el('div', { ...serif, fontSize: 19, color: C.dark, lineHeight: '24px' }, body),
      el('div', { marginTop: 12 }, reactionRow(4, 6, '🤸')),
      tail));
}

function nudgeCard(activity, emoji) {
  const prompt = { ...serif, fontSize: 19.5, color: C.dark, lineHeight: '24px' };
  return el('div', { marginBottom: 22, marginTop: 12, position: 'relative' },
    el('div', { ...abs({ top: -10, left: '50%' }), marginLeft: -32, width: 64, height: 18, background: 'rgba(245,199,126,0.55)', borderRadius: 2, transform: 'rotate(-2deg)', zIndex: 2 }),
    el('div', { background: C.sageSoft, borderRadius: 20, padding: '16px 16px 14px', border: '1px solid #C9D9B7', transform: 'rotate(-0.6deg)' },
      el('div', { ...row({ alignItems: 'flex-start', gap: 12 }) },
        el('div', { width: 46, height: 46, borderRadius: 14, background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sh(1, 4, 'rgba(0,0,0,0.06)'), flexShrink: 0 },
          el('span', { fontSize: 28, lineHeight: '30px' }, emoji)),
        el('div', { flex: 1 },
          el('div', { ...mono(700), fontSize: 11, color: C.sage, letterSpacing: 0.6 }, 'A LITTLE NUDGE ↓'),
          el('div', { marginTop: 3, ...prompt }, 'Share a moment from ',
            el('span', { position: 'relative', display: 'inline-block' }, activity, dottedUnderline(C.sage)), '?'))),
      el('div', { ...row({ gap: 8 }), marginTop: 12, paddingLeft: 58 },
        el('div', { background: C.sage, padding: '9px 14px', borderRadius: 17, ...row({ gap: 6 }), boxShadow: '0 2px 0 rgba(60,80,40,0.35)' },
          icon('camera', 15, C.white, 2.2), el('span', { ...sans(800), fontSize: 13, color: C.white }, 'snap one ✨')),
        el('span', { ...serif, fontSize: 14, color: C.taupe, padding: '9px 4px' }, 'not now'))));
}

export function fab() {
  return el('div', { ...abs({ right: 22, bottom: 116 }), transform: 'rotate(-5deg)', zIndex: 20 },
    el('div', { width: 64, height: 64, borderRadius: '50%', background: C.terracotta, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 0 rgba(146,67,40,0.5)', position: 'relative' },
      icon('plus', 32, C.white, 2.6),
      el('div', { ...abs({ top: 6, right: 8 }) }, sparkle(11, C.amberLight))));
}

export function tabBar(active, badges = {}) {
  const tabs = [['buzz', 'feed'], ['irl', 'map.pin'], ['plans', 'calendar'], ['you', 'person']];
  return el('div', { ...abs({ left: 0, right: 0, bottom: 0 }), padding: '8px 0 26px', zIndex: 30 },
    el('div', { margin: '0 44px', height: 58, background: C.surface, borderRadius: 29, ...row({ justifyContent: 'space-around' }), padding: '0 8px', border: `1px solid ${C.rule}`, boxShadow: sh(10, 28, 'rgba(45,36,27,0.09)'), boxSizing: 'border-box' },
      tabs.map(([k, ic]) => {
        const on = k === active;
        return el('div', { position: 'relative', width: 46, height: 46, borderRadius: 23, background: on ? C.terracotta : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: on ? '0 3px 0 rgba(146,67,40,0.4)' : undefined },
          icon(on ? `${ic}.fill` : ic, 25, on ? C.white : C.taupe, 2.1),
          !on && badges[k] ? el('div', { ...abs({ top: 3, right: 3 }), minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: C.terracotta, border: `2.5px solid ${C.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'content-box' },
            el('span', { ...sans(800), fontSize: 10, color: C.white, lineHeight: '12px' }, String(badges[k]))) : '',
          on ? el('div', { ...abs({ top: 1, right: 3 }) }, sparkle(10, C.amberLight)) : '');
      })));
}

function screen(content, extra = '') {
  return el('div', { width: 390, height: 844, background: C.cream, position: 'relative', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans'" },
    el('div', { height: 59 }), content, extra);
}

// ---------------------------------------------------------------- screens

export function buzz() {
  const feed = el('div', { padding: '14px 16px 0' },
    nudgeCard('saturday soccer', '⚽'),
    photoPost({ name: 'Maya', venue: 'Cesar Chavez Park 🌳', caption: 'first goal — pure magic', scene: art.soccer(), stampLabel: 'SAT · 22m', tone: 'peach', initials: 'MC', likes: 12, comments: 3 }),
    questionPost({ name: 'Jordan', initials: 'JP', tone: 'sage', when: '1h', body: 'Anyone tried toddler tumbling at Studio Grow? Felix (3) is climbing things.' }),
    photoPost({ name: 'Priya', venue: 'Albany Aquatic 🏊', caption: 'aiden absolutely nailed his swim test today', scene: art.pool(), stampLabel: 'SAT · 2h', tone: 'mauve', initials: 'PP', likes: 9, comments: 1 }));
  return screen(
    header({ eyebrow: 'SAT · MAY 24', title: 'buzz', right: visibilityChip() }) + feed,
    fab() + tabBar('buzz', { you: 2 }));
}

export function activityCard({ name, emoji, scene, visibility, day, time, location, desc, rotation, going, interested, cta }) {
  const stack = (people, size, overlap) => el('div', { ...row() }, people.map(([i, t], k) => el('div', { marginLeft: k ? overlap : 0 }, avatar(i, t, size, { w: 2.5, c: C.surface }))));
  const proofLine = (people, n, label, accent, bold, compact) => el('div', { ...row({ gap: 10 }), flex: 1 },
    stack(people, compact ? 22 : 28, compact ? -8 : -10),
    el('div', { ...serif, fontSize: compact ? 12.5 : 13.5, color: accent, lineHeight: compact ? '16px' : '18px' },
      el('span', { ...sans(bold ? 800 : 700), fontStyle: 'normal', color: accent }, `${n} ${n === 1 ? 'family' : 'families'}`), ' ', label));
  return el('div', { position: 'relative', marginBottom: 26 },
    el('div', { borderRadius: 22, overflow: 'hidden', border: `1px solid ${C.rule}`, transform: `rotate(${rotation}deg)`, boxShadow: sh(6, 22, 'rgba(45,36,27,0.1)'), background: C.surface },
      el('div', { position: 'relative', height: 210 },
        scene,
        el('div', { ...abs({ inset: 0 }), background: 'linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,0.7) 100%)' }),
        el('div', { ...abs({ top: 12, left: 12 }), ...row({ gap: 6 }) },
          el('div', { background: 'rgba(255,253,246,0.92)', padding: '5px 9px', borderRadius: 999 }, el('span', { ...mono(700), fontSize: 9, color: C.dark, letterSpacing: 0.4 }, visibility))),
        el('div', { ...abs({ left: 0, right: 0, bottom: 0 }), padding: '0 16px 14px' },
          el('div', { ...row({ gap: 6 }), marginBottom: 5 }, stamp(day),
            el('div', { background: 'rgba(255,255,255,0.22)', padding: '4px 9px', borderRadius: 8 }, el('span', { ...sans(700), fontSize: 11, color: C.white }, time))),
          el('div', { ...serif, fontSize: 26, color: C.white, lineHeight: '28px', letterSpacing: -0.3 }, name),
          el('div', { marginTop: 4, lineHeight: '17px' },
            el('span', { ...sans(600), fontSize: 12.5, color: 'rgba(255,255,255,0.92)' }, `${location} · `),
            el('span', { ...serif, fontSize: 13, color: 'rgba(255,255,255,0.92)' }, desc)))),
      el('div', { background: C.surface, padding: '13px 16px', ...row({ gap: 10 }) },
        el('div', { flex: 1, ...col({ gap: 6 }) },
          going ? proofLine(going[0], going[1], 'going', C.sage, true, false) : '',
          interested ? proofLine(interested[0], interested[1], 'interested', C.taupe, false, Boolean(going)) : ''),
        el('div', { background: cta.done ? C.terracotta : C.terracotta, padding: '9px 18px', borderRadius: 14, boxShadow: '0 2px 0 rgba(146,67,40,0.4)', flexShrink: 0 },
          el('span', { ...sans(800), fontSize: 13, color: C.white, whiteSpace: 'nowrap' }, cta.label)))),
    el('div', { ...abs({ top: -16, right: -8 }), transform: `rotate(${-rotation * 5}deg)`, fontSize: 46, lineHeight: '52px', textShadow: '0 3px 12px rgba(0,0,0,0.2)' }, emoji));
}

export function plans() {
  const seg = el('div', { flex: 1, ...row(), padding: 3, borderRadius: 16, background: C.surface, border: `1px solid ${C.rule}` },
    el('div', { flex: 1, minHeight: 36, borderRadius: 12, background: C.dark, ...row({ justifyContent: 'center', gap: 5 }) }, el('span', { ...sans(800), fontSize: 11, color: C.white }, 'List')),
    el('div', { flex: 1, minHeight: 36, borderRadius: 12, ...row({ justifyContent: 'center', gap: 5 }) }, icon('calendar', 14, C.taupe), el('span', { ...sans(800), fontSize: 11, color: C.taupe }, 'Calendar')));
  const find = el('div', { minHeight: 42, padding: '0 12px', borderRadius: 15, background: C.surface, border: `1px solid ${C.rule}`, ...row({ gap: 6 }), boxSizing: 'border-box' }, icon('search', 17, C.dark), el('span', { ...sans(800), fontSize: 11, color: C.dark }, 'find &amp; sort'));
  const tabs = el('div', { margin: '10px 14px 0', ...row(), borderBottom: `1px solid ${C.rule}` },
    el('div', { flex: 1, textAlign: 'center', padding: '10px 0', borderBottom: `2px solid ${C.terracotta}`, marginBottom: -1 }, el('span', { ...sans(800), fontSize: 12, color: C.terracotta }, 'Upcoming')),
    el('div', { flex: 1, textAlign: 'center', padding: '10px 0' }, el('span', { ...sans(800), fontSize: 12, color: C.taupe }, 'Recent')));
  const add = el('div', { width: 42, height: 42, borderRadius: 21, background: C.terracotta, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 rgba(146,67,40,0.35)' }, icon('plus', 21, C.white));
  const list = el('div', { padding: '20px 14px 0' },
    activityCard({ name: 'Saturday Soccer', emoji: '⚽', scene: art.soccer(), visibility: 'PUBLIC', day: 'SAT · 24', time: '10am', location: 'Cesar Chavez Park', desc: 'show up. kick ball. eat snacks.', rotation: -0.8, going: [[['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 3], interested: [[['PP', 'mauve']], 1], cta: { label: 'I’m in →' } }),
    activityCard({ name: 'Wildcat Hike', emoji: '🥾', scene: art.hike(), visibility: 'MY VILLAGE', day: 'SUN · 25', time: '9:30am', location: 'Tilden Park', desc: 'easy 2 mi · carriers welcome', rotation: 0.6, going: [[['SW', 'butter'], ['DR', 'rose']], 2], interested: null, cta: { label: 'Going ✓', done: true } }));
  return screen(
    header({ eyebrow: 'WHAT’S HAPPENING', title: 'plans', right: add })
    + el('div', { padding: '8px 14px 0', ...row({ gap: 9 }) }, seg, find) + tabs + list,
    tabBar('plans', { you: 2 }));
}

export function you() {
  const stat = (v, l) => el('div', { flex: 1, ...col({ alignItems: 'center' }), padding: '12px 0', borderRadius: 14, background: C.surface, border: `1px solid ${C.rule}` },
    el('div', { ...serifR, fontSize: 24, color: C.dark, lineHeight: '28px' }, String(v)), el('div', { ...sans(700), fontSize: 9.5, color: C.taupe }, l));
  const quick = (ic, l) => el('div', { flex: 1, ...row({ gap: 8 }), padding: 13, borderRadius: 14, background: C.surface, border: `1px solid ${C.rule}` }, icon(ic, 17, C.terracotta), el('span', { ...sans(800), fontSize: 12, color: C.dark }, l));
  const conn = (name, hood, i, t) => el('div', { minHeight: 68, ...row({ gap: 11 }), padding: '10px 13px', borderBottom: `1px solid ${C.rule}`, boxSizing: 'border-box' },
    avatar(i, t, 44), el('div', { flex: 1 }, el('div', { ...sans(800), fontSize: 13.5, color: C.dark }, name), el('div', { ...sans(400), fontSize: 11, color: C.taupe, paddingTop: 2 }, hood)), icon('ellipsis', 20, C.taupe));
  const hero = el('div', { height: 300, overflow: 'hidden', position: 'relative' },
    art.cover(),
    el('div', { ...abs({ inset: 0 }), background: 'linear-gradient(180deg, rgba(0,0,0,0) 32%, rgba(0,0,0,0.68) 100%)' }),
    el('div', { ...abs({ top: 14, right: 18 }), minHeight: 40, ...row({ gap: 7 }), padding: '0 13px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxSizing: 'border-box' }, icon('pencil', 16, C.dark), el('span', { ...sans(800), fontSize: 11.5, color: C.dark }, 'edit profile')),
    el('div', { ...abs({ left: 20, right: 20, bottom: 24 }), ...row({ alignItems: 'flex-end', gap: 15 }) },
      avatar('DR', 'rose', 94, { w: 2.5, c: C.white }),
      el('div', { flex: 1, paddingBottom: 5 },
        el('div', { ...serifR, fontSize: 34, lineHeight: '37px', color: C.white }, 'Drew Rowny'),
        el('div', { ...sans(700), fontSize: 12, color: C.white, paddingTop: 4 }, 'North Berkeley'))));
  const body = el('div', { padding: '20px 16px 0', ...col({ gap: 16 }) },
    el('div', { ...serif, fontSize: 16, color: C.terracotta }, '+ tell your village a little about you'),
    el('div', { ...row({ gap: 8 }) }, stat(12, 'connections'), stat(2, 'kids'), stat(3, 'hangouts')),
    el('div', { ...row({ gap: 9 }) }, quick('person.2', 'Your village'), quick('map.pin', 'Hangout spots')),
    el('div', { ...row({ gap: 11 }), padding: 14, borderRadius: 22, background: C.terracotta },
      icon('wave', 22, C.white),
      el('div', { flex: 1 }, el('div', { ...sans(800), fontSize: 13.5, color: C.white }, '2 connection requests'), el('div', { ...sans(400), fontSize: 11, color: 'rgba(255,255,255,0.82)', paddingTop: 2 }, 'open Your Village to say hello')),
      icon('chevron.right', 18, C.white)),
    el('div', { paddingTop: 6 },
      el('div', { ...mono(700), fontSize: 9.5, letterSpacing: 0.7, color: C.taupe }, 'YOUR VILLAGE'),
      el('div', { ...serifR, fontSize: 27, color: C.dark, padding: '2px 0 10px', lineHeight: '32px' }, 'your connections'),
      el('div', { overflow: 'hidden', borderRadius: 22, background: C.surface, border: `1px solid ${C.rule}` },
        conn('Maya Chen', 'North Berkeley', 'MC', 'peach'), conn('Jordan Park', 'North Berkeley', 'JP', 'sage'), conn('Priya Patel', 'Albany', 'PP', 'mauve'))));
  return screen(hero + body, tabBar('you', {}));
}

export function signin() {
  const card = el('div', { padding: 18, ...col({ gap: 15 }), borderRadius: 22, border: `1px solid ${C.rule}`, background: C.surface },
    el('div', { height: 54, borderRadius: 14, background: '#000', ...row({ justifyContent: 'center', gap: 6 }) }, icon('apple', 19, '#fff'), el('span', { fontFamily: '-apple-system, system-ui, sans-serif', fontWeight: 500, fontSize: 19, color: '#fff' }, 'Continue with Apple')),
    el('div', { ...row({ gap: 10 }) }, el('div', { flex: 1, height: 1, background: C.rule }), el('span', { ...mono(700), fontSize: 9, letterSpacing: 0.7, color: C.taupe }, 'OR USE EMAIL'), el('div', { flex: 1, height: 1, background: C.rule })),
    el('div', { ...col({ gap: 6 }) },
      el('div', { ...mono(700), fontSize: 10, letterSpacing: 0.7, color: C.brownMid }, 'EMAIL ADDRESS'),
      el('div', { minHeight: 54, padding: '0 14px', borderRadius: 14, border: `1.5px solid ${C.rule}`, background: C.cream, ...row(), boxSizing: 'border-box' }, el('span', { ...sans(700), fontSize: 16, color: C.dark }, 'maya.chen@example.com'))),
    el('div', { ...sans(400), fontSize: 11.5, lineHeight: '17px', color: C.taupe }, 'No password needed. A one-time code creates your Village account or signs you back in.'),
    el('div', { height: 58, borderRadius: 29, background: C.terracotta, ...row({ justifyContent: 'center' }), boxShadow: '0 3px 0 rgba(146,67,40,0.4)' }, el('span', { ...sans(800), fontSize: 17, color: C.white, letterSpacing: -0.2 }, 'continue with email →')));
  const top = el('div', {},
    el('div', { ...row({ gap: 8 }), paddingBottom: 6 }, el('span', { ...mono(700), fontSize: 11, color: C.brownMid, letterSpacing: 0.7 }, 'WELCOME TO'), sparkle(10, C.amberLight)),
    el('div', { ...serif, fontSize: 48, color: C.dark, letterSpacing: -0.8, lineHeight: '50px' }, 'village'),
    el('div', { paddingTop: 6 }, squiggle(70, C.terracotta)),
    el('div', { ...serif, fontSize: 18, color: C.brownMid, paddingTop: 14, lineHeight: '25px' }, 'the easy way to find your people and make a plan.'));
  return el('div', { width: 390, height: 844, background: C.cream, position: 'relative', overflow: 'hidden', ...col({ justifyContent: 'center' }), padding: '0 28px', boxSizing: 'border-box' },
    el('div', { ...col({ gap: 34 }) }, top, card,
      el('div', { ...sans(400), fontSize: 11, lineHeight: '17px', textAlign: 'center', color: C.taupe }, 'Apple or your email is used only to secure your Village account.')));
}
