// Port of src/components/ui/Icon.tsx — same 24x24 paths, round caps/joins.
// A few icons the refresh adds (list, check, sliders, bell.dot) are marked NEW.

export function icon(name, size = 24, color = '#2D241B', weight = 1.8) {
  const s = `stroke="${color}" stroke-width="${weight}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const f = `fill="${color}"`;
  const P = (d, extra = s) => `<path d="${d}" ${extra}/>`;
  const C = (cx, cy, r, extra = s) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
  const R = (x, y, w, h, rx, extra = s) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${extra}/>`;
  const body = {
    feed: R(3.5, 4, 17, 6, 2) + R(3.5, 13, 17, 7, 2),
    'feed.fill': R(3.5, 4, 17, 6, 2, f) + R(3.5, 13, 17, 7, 2, f),
    'map.pin': P('M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z') + C(12, 9.5, 2.4),
    'map.pin.fill': P('M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z', f) + C(12, 9.5, 2.4, 'fill="#fff"'),
    calendar: R(3.5, 5, 17, 15, 2.5) + P('M3.5 10h17M8 3v4M16 3v4'),
    'calendar.fill': R(3.5, 5, 17, 15, 2.5, f) + P('M3.5 10h17', `stroke="#fff" stroke-width="${weight}"`) + P('M8 3v4M16 3v4'),
    person: C(12, 8, 3.6) + P('M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5'),
    'person.fill': C(12, 8, 3.6, f) + P('M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5', `${f} stroke="${color}" stroke-width="${weight}" stroke-linejoin="round"`),
    plus: P('M12 5v14M5 12h14', s.replace(`stroke-width="${weight}"`, `stroke-width="${Math.max(weight, 2.2)}"`)),
    sparkle: P('M12 3l1.6 5.4 5.4 1.6-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z'),
    heart: P('M12 20s-7-4.4-7-10A4 4 0 0 1 12 7a4 4 0 0 1 7 3c0 5.6-7 10-7 10Z'),
    bubble: P('M4 12a8 8 0 1 1 4.2 7L4 20l1-4.2A8 8 0 0 1 4 12Z'),
    'chevron.right': P('M9 5l7 7-7 7'),
    'chevron.left': P('M15 5l-7 7 7 7'),
    'chevron.down': P('M5 9l7 7 7-7'),
    x: P('M6 6l12 12M18 6L6 18'),
    pencil: P('M4.5 19.5l4.1-1 9.6-9.6a2.1 2.1 0 0 0-3-3l-9.6 9.6-1.1 4Z') + P('M13.8 7.3l2.9 2.9'),
    camera: P('M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z') + C(12, 13, 3.5),
    search: C(11, 11, 6) + P('M16 16l4 4'),
    'arrow.right': P('M5 12h14M13 6l6 6-6 6'),
    ellipsis: C(5, 12, 1.6, f) + C(12, 12, 1.6, f) + C(19, 12, 1.6, f),
    'person.2': C(9, 8, 3) + C(17, 9, 2.4) + P('M3.5 20c.8-3.5 3-5.3 5.5-5.3s4.7 1.8 5.5 5.3M14 15.5c2.7-.8 5.3.7 6.5 3.5'),
    wave: P('M3 14c2-3 4-3 6 0s4 3 6 0 4-3 6 0'),
    gear: C(12, 12, 3) + P('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'),
    bell: P('M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0'),
    // NEW in the refresh
    cog: P('M10.3 3.6h3.4l.5 2.3 1.6.9 2.2-.8 1.7 2.9-1.7 1.6v1.9l1.7 1.6-1.7 2.9-2.2-.8-1.6.9-.5 2.3h-3.4l-.5-2.3-1.6-.9-2.2.8-1.7-2.9 1.7-1.6v-1.9L4.3 8.9 6 6l2.2.8 1.6-.9.5-2.3Z') + C(12, 12, 2.8),
    list: P('M9 6h11M9 12h11M9 18h11') + C(4.5, 6, 1.2, f) + C(4.5, 12, 1.2, f) + C(4.5, 18, 1.2, f),
    check: P('M5 12.5l4.2 4.2L19 7'),
    sliders: P('M4 7h10M18 7h2M4 17h4M12 17h8') + C(16, 7, 2) + C(10, 17, 2),
    apple: P('M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8ZM14.2 5.9c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.2Z', f),
  }[name];
  if (!body) throw new Error('unknown icon ' + name);
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex-shrink:0">${body}</svg>`;
}

/** 4-point sparkle from Sparkle.tsx (14x14 viewBox). */
export function sparkle(size = 14, color = '#E8A93A') {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 14 14" style="display:block;flex-shrink:0"><path d="M7 0.5 L8.2 5.3 L13 6.5 L8.2 7.7 L7 12.5 L5.8 7.7 L1 6.5 L5.8 5.3 Z" fill="${color}"/></svg>`;
}

/** Squiggle.tsx — always 10 tall, width controls the wave count visually. */
export function squiggle(width = 60, color = '#C96442', sw = 2.2) {
  return `<svg aria-hidden="true" width="${width}" height="10" viewBox="0 0 60 10" style="display:block"><path d="M2 6 Q 10 1, 18 6 T 34 6 T 50 6 T 58 6" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"/></svg>`;
}

/** HandArrow.tsx */
export function handArrow(size = 50, color = '#C96442') {
  return `<svg aria-hidden="true" width="${size}" height="${size * 0.6}" viewBox="0 0 50 30" style="display:block"><path d="M2 22 Q 10 4, 25 12 T 46 8" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M40 4 L 46 8 L 41 14" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** DottedUnderline.tsx squiggle path, stretched under a word. */
export function dottedUnderline(color = '#C96442') {
  return `<svg aria-hidden="true" width="100%" height="6" viewBox="0 0 100 6" preserveAspectRatio="none" style="position:absolute;left:0;bottom:-3px;display:block"><path d="M2 3 Q 25 -2, 50 3 T 98 3" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="3 3" opacity="0.7"/></svg>`;
}
