// Tiny HTML-with-inline-styles helpers. Every mockup is plain markup with
// inline styles so the same output works as a local page and a canvas artboard.

const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'aspectRatio', 'scale']);

export function st(o) {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false && v !== '')
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      const val = typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : v;
      return `${prop}:${val}`;
    })
    .join(';');
}

/** el('div', {..style}, children...) — children may be strings or arrays. */
export function el(tag, style = {}, ...children) {
  return `<${tag} style="${st(style)}">${children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false).join('')}</${tag}>`;
}

/** el with extra attributes: elA('button', {type:'button','aria-label':'x'}, style, ...kids) */
const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'source']);
export function elA(tag, attrs, style = {}, ...children) {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${String(v).replace(/"/g, '&quot;')}"`))
    .join('');
  if (VOID.has(tag)) return `<${tag}${a} style="${st(style)}">`;
  return `<${tag}${a} style="${st(style)}">${children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false).join('')}</${tag}>`;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const abs = (pos) => ({ position: 'absolute', ...pos });
export const row = (extra = {}) => ({ display: 'flex', flexDirection: 'row', alignItems: 'center', ...extra });
export const col = (extra = {}) => ({ display: 'flex', flexDirection: 'column', ...extra });
