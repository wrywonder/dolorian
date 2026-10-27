// Illustrated stand-ins for user photos. The container can't reach photo
// hosts, so both BEFORE and AFTER use these same scenes — the comparison is
// about the system around the photo, not the photo.

let uid = 0;

function frame(inner, { bg = '#ddd', grain = 0.07 } = {}) {
  const id = `g${++uid}`;
  return `<svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style="display:block;background:${bg}">`
    + `<defs><filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${uid}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 ${grain}"/></feComponentTransfer></filter></defs>`
    + inner
    + `<rect width="400" height="300" filter="url(#${id})"/></svg>`;
}

function grad(id, stops, vertical = true) {
  const s = stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${s}</linearGradient></defs>`;
}

export function soccer() {
  const k = `s${++uid}`;
  let stripes = '';
  const bands = [150, 162, 178, 198, 224, 256, 300];
  for (let i = 0; i < bands.length - 1; i += 2) stripes += `<rect x="0" y="${bands[i]}" width="400" height="${bands[i + 1] - bands[i]}" fill="#8EB566"/>`;
  let net = '';
  for (let x = 222; x <= 350; x += 12) net += `<line x1="${x}" y1="100" x2="${x + 6}" y2="152" stroke="#F4F7F1" stroke-width="1" opacity=".55"/>`;
  for (let y = 108; y <= 150; y += 9) net += `<line x1="214" y1="${y}" x2="358" y2="${y}" stroke="#F4F7F1" stroke-width="1" opacity=".5"/>`;
  return frame(
    grad(`${k}sky`, [[0, '#BFDCE6'], [1, '#EEF2E4']])
    + `<rect width="400" height="160" fill="url(#${k}sky)"/>`
    + `<circle cx="70" cy="48" r="22" fill="#FBE7B5" opacity=".9"/>`
    + `<g fill="#56794A"><ellipse cx="30" cy="140" rx="60" ry="30"/><ellipse cx="120" cy="132" rx="55" ry="34"/><ellipse cx="215" cy="138" rx="70" ry="28"/><ellipse cx="320" cy="130" rx="65" ry="36"/><ellipse cx="400" cy="138" rx="50" ry="30"/></g>`
    + `<g fill="#4A6A3F"><ellipse cx="80" cy="146" rx="50" ry="18"/><ellipse cx="270" cy="148" rx="60" ry="16"/></g>`
    + `<rect x="0" y="146" width="400" height="154" fill="#7FA65A"/>` + stripes
    + `<path d="M0 214 Q 200 196 400 214" stroke="#F4F7F1" stroke-width="3" fill="none" opacity=".75"/>`
    + net
    + `<path d="M210 156 V96 H362 V156" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linejoin="round"/>`
    + `<ellipse cx="128" cy="262" rx="34" ry="8" fill="#3E5A33" opacity=".35"/>`
    + `<circle cx="126" cy="232" r="30" fill="#FFFFFF"/>`
    + `<path d="M126 220 l10 7 -4 12 h-12 l-4 -12 Z" fill="#2D241B"/>`
    + `<path d="M98 228 l8 -6 6 8 -4 9 -9 1 Z M146 214 l7 3 2 8 -8 -1 -3 -6 Z M140 250 l9 -6 4 7 -6 6 Z M110 254 l-6 -8 6 -3 6 7 Z" fill="#2D241B"/>`
    + `<circle cx="126" cy="232" r="30" fill="none" stroke="#2D241B" stroke-opacity=".15" stroke-width="2"/>`
    + `<path d="M318 286 l14 -34 h6 l14 34 Z" fill="#E8843A"/><rect x="314" y="284" width="42" height="6" rx="2" fill="#D66F2A"/><path d="M325 268 h20" stroke="#fff" stroke-width="4"/>`,
    { bg: '#7FA65A' },
  );
}

export function pool() {
  const k = `p${++uid}`;
  const rope = (y) => `<line x1="-10" y1="${y}" x2="410" y2="${y}" stroke="#FFFFFF" stroke-width="9" stroke-dasharray="9 9" stroke-linecap="round"/><line x1="-1" y1="${y}" x2="410" y2="${y}" stroke="#D9534A" stroke-width="9" stroke-dasharray="9 9" stroke-linecap="round"/>`;
  let caustic = '';
  for (let i = 0; i < 7; i++) {
    const y = 50 + i * 38;
    caustic += `<path d="M-10 ${y} q 25 -10 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".18"/>`;
  }
  return frame(
    grad(`${k}w`, [[0, '#5CB6D3'], [1, '#2C7FA6']])
    + `<rect width="400" height="300" fill="url(#${k}w)"/>`
    + `<rect x="170" y="40" width="22" height="260" fill="#1D5F82" opacity=".55"/><rect x="140" y="260" width="82" height="22" fill="#1D5F82" opacity=".55"/>`
    + caustic
    + `<rect width="400" height="30" fill="#EEF5F6"/>` + Array.from({ length: 21 }, (_, i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="30" stroke="#C9DDE2" stroke-width="1.5"/>`).join('')
    + `<line x1="0" y1="30" x2="400" y2="30" stroke="#B9D3DA" stroke-width="3"/>`
    + rope(92) + rope(214)
    + `<g transform="rotate(-14 278 156)"><rect x="236" y="128" width="88" height="54" rx="16" fill="#F5C342"/><rect x="236" y="128" width="88" height="54" rx="16" fill="none" stroke="#D9A21E" stroke-width="3"/><ellipse cx="300" cy="146" rx="9" ry="6" fill="#D9A21E" opacity=".6"/></g>`
    + `<ellipse cx="282" cy="196" rx="44" ry="7" fill="#1D5F82" opacity=".3"/>`,
    { bg: '#3B93B8', grain: 0.06 },
  );
}

export function swing() {
  const k = `w${++uid}`;
  let chips = '';
  for (let i = 0; i < 70; i++) {
    const x = (i * 53) % 400, y = 232 + ((i * 37) % 66);
    chips += `<rect x="${x}" y="${y}" width="${6 + (i % 4)}" height="3" rx="1.5" fill="${i % 3 ? '#B48E63' : '#DDBB8F'}" transform="rotate(${(i * 29) % 60 - 30} ${x} ${y})"/>`;
  }
  return frame(
    grad(`${k}s`, [[0, '#F7D3AE'], [1, '#FBEBDA']])
    + `<rect width="400" height="240" fill="url(#${k}s)"/>`
    + `<circle cx="318" cy="70" r="34" fill="#F5C77E"/>`
    + `<g fill="#C69B78" opacity=".55"><ellipse cx="40" cy="214" rx="70" ry="40"/><ellipse cx="380" cy="210" rx="80" ry="44"/></g>`
    + `<rect x="0" y="226" width="400" height="74" fill="#CFA77C"/>` + chips
    + `<g stroke="#B85735" stroke-width="9" stroke-linecap="round"><line x1="60" y1="270" x2="100" y2="58"/><line x1="140" y1="270" x2="100" y2="58"/><line x1="260" y1="270" x2="300" y2="58"/><line x1="340" y1="270" x2="300" y2="58"/><line x1="92" y1="58" x2="308" y2="58"/></g>`
    + `<g stroke="#6E5E4E" stroke-width="2.5"><line x1="150" y1="62" x2="136" y2="196"/><line x1="182" y1="62" x2="168" y2="196"/><line x1="226" y1="62" x2="262" y2="186"/><line x1="258" y1="62" x2="292" y2="180"/></g>`
    + `<rect x="128" y="192" width="48" height="10" rx="5" fill="#2D241B"/>`
    + `<rect x="256" y="178" width="48" height="10" rx="5" fill="#2D241B" transform="rotate(-16 280 183)"/>`
    + `<ellipse cx="152" cy="252" rx="30" ry="6" fill="#8C6A47" opacity=".35"/>`,
    { bg: '#F7D3AE' },
  );
}

export function hike() {
  const k = `h${++uid}`;
  const pine = (x, y, s) => `<path d="M${x} ${y - 40 * s} L${x + 16 * s} ${y} H${x - 16 * s} Z" fill="#3F5F37"/><rect x="${x - 2 * s}" y="${y}" width="${4 * s}" height="${8 * s}" fill="#5A4636"/>`;
  return frame(
    grad(`${k}s`, [[0, '#E3ECDD'], [1, '#F7F0DE']])
    + `<rect width="400" height="300" fill="url(#${k}s)"/>`
    + `<circle cx="300" cy="64" r="26" fill="#F7D589"/>`
    + `<path d="M0 150 Q 70 96 150 130 T 300 112 T 400 128 V300 H0 Z" fill="#B7C99E"/>`
    + `<path d="M0 190 Q 90 140 190 176 T 400 160 V300 H0 Z" fill="#8FAE72"/>`
    + `<path d="M0 236 Q 120 196 230 226 T 400 214 V300 H0 Z" fill="#6A8C52"/>`
    + `<path d="M196 300 C 186 270 250 256 236 236 S 196 214 214 196 S 252 182 244 172" stroke="#EAD8B3" stroke-width="16" fill="none" stroke-linecap="round"/>`
    + pine(60, 236, 1.3) + pine(92, 244, 1) + pine(340, 226, 1.2) + pine(366, 232, .9) + pine(150, 170, .6) + pine(318, 160, .6),
    { bg: '#B7C99E' },
  );
}

export function ballet() {
  const k = `b${++uid}`;
  let planks = '';
  for (let i = 0; i < 9; i++) planks += `<line x1="${i * 52 - 40}" y1="300" x2="${i * 30 + 60}" y2="190" stroke="#C59C74" stroke-width="2"/>`;
  return frame(
    grad(`${k}w`, [[0, '#F1DCE6'], [1, '#E9CEDB']])
    + `<rect width="400" height="190" fill="url(#${k}w)"/>`
    + `<path d="M250 0 H330 L280 190 H200 Z" fill="#FFF7FA" opacity=".55"/><path d="M345 0 H372 L322 190 H296 Z" fill="#FFF7FA" opacity=".4"/>`
    + `<rect x="0" y="118" width="400" height="7" rx="3.5" fill="#B08A6A"/><rect x="60" y="118" width="6" height="30" fill="#8C6A4C"/><rect x="300" y="118" width="6" height="30" fill="#8C6A4C"/>`
    + `<rect x="0" y="186" width="400" height="114" fill="#DDB892"/>` + planks
    + `<g transform="rotate(-8 150 250)"><path d="M112 244 c0-16 30-22 56-18 c18 3 26 12 22 22 c-4 10-30 14-52 12 c-18-2-26-8-26-16Z" fill="#E9A7B6"/><ellipse cx="160" cy="240" rx="20" ry="8" fill="#F6CFD8"/></g>`
    + `<g transform="rotate(10 250 262)"><path d="M206 256 c0-16 30-22 56-18 c18 3 26 12 22 22 c-4 10-30 14-52 12 c-18-2-26-8-26-16Z" fill="#E9A7B6"/><ellipse cx="254" cy="252" rx="20" ry="8" fill="#F6CFD8"/></g>`
    + `<path d="M170 236 C 190 200 150 190 176 166 M178 238 C 220 214 230 196 214 170 M248 248 C 270 220 300 230 296 200" stroke="#E9A7B6" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    { bg: '#E9CEDB' },
  );
}

export function cover() {
  const k = `c${++uid}`;
  return frame(
    grad(`${k}s`, [[0, '#F2B7A8'], [0.55, '#F7D6C0'], [1, '#FBE9D8']])
    + `<rect width="400" height="300" fill="url(#${k}s)"/>`
    + `<circle cx="250" cy="150" r="46" fill="#FBE3B0"/>`
    + `<rect x="0" y="170" width="400" height="40" fill="#C9C9D4" opacity=".75"/>`
    + `<path d="M0 182 Q 80 140 170 168 T 330 158 T 400 166 V300 H0 Z" fill="#B98479"/>`
    + `<path d="M0 222 Q 110 180 220 214 T 400 200 V300 H0 Z" fill="#94635A"/>`
    + `<path d="M0 262 Q 120 236 240 258 T 400 250 V300 H0 Z" fill="#714A44"/>`,
    { bg: '#F2B7A8', grain: 0.06 },
  );
}

export function crayons() {
  const k = `k${++uid}`;
  return frame(
    `<rect width="400" height="300" fill="#F3E6D3"/>`
    + `<g transform="rotate(-6 200 150)"><rect x="70" y="50" width="250" height="190" fill="#FFFFFF"/>`
    + `<path d="M100 200 q 30 -60 60 -10 t 60 -20 t 60 10" stroke="#4FA8C9" stroke-width="9" fill="none" stroke-linecap="round"/>`
    + `<circle cx="250" cy="100" r="26" fill="none" stroke="#F0B43C" stroke-width="9"/>`
    + `<path d="M110 120 l30 -40 30 40 Z" fill="none" stroke="#D9534A" stroke-width="8" stroke-linejoin="round"/>`
    + `<path d="M120 150 h40" stroke="#6B8E5A" stroke-width="9" stroke-linecap="round"/></g>`
    + `<g transform="rotate(30 330 240)"><rect x="290" y="232" width="90" height="16" rx="3" fill="#B85735"/><path d="M380 232 l18 8 -18 8 Z" fill="#B85735"/></g>`
    + `<g transform="rotate(-20 60 250)"><rect x="20" y="244" width="90" height="16" rx="3" fill="#6B8E5A"/><path d="M110 244 l18 8 -18 8 Z" fill="#6B8E5A"/></g>`,
    { bg: '#F3E6D3', grain: 0.05 },
  );
}

export function xylophone() {
  const bars = ['#D9534A', '#F08A3E', '#F0C23C', '#7FB24F', '#3E9FC4', '#6C6CC9', '#B868B5'];
  return frame(
    `<rect width="400" height="300" fill="#DCE7F0"/>`
    + `<rect x="40" y="70" width="320" height="16" rx="6" fill="#8C6A4C" transform="rotate(8 200 78)"/>`
    + `<rect x="40" y="214" width="320" height="16" rx="6" fill="#8C6A4C" transform="rotate(-8 200 222)"/>`
    + bars.map((c, i) => `<rect x="${62 + i * 41}" y="${54 + i * 7}" width="30" height="${190 - i * 14}" rx="7" fill="${c}"/><circle cx="${77 + i * 41}" cy="${70 + i * 7}" r="3.5" fill="#fff" opacity=".8"/>`).join('')
    + `<g transform="rotate(-30 300 250)"><rect x="250" y="246" width="110" height="7" rx="3.5" fill="#C9A47A"/><circle cx="250" cy="249" r="12" fill="#B85735"/></g>`,
    { bg: '#DCE7F0', grain: 0.05 },
  );
}

/** StripePattern.tsx — 45° two-tone stripes, used by the BEFORE placeholders. */
export function stripes(light, dark, w = 28) {
  const id = `st${++uid}`;
  return `<svg aria-hidden="true" width="100%" height="100%" style="display:block"><defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${w}" patternTransform="rotate(45)"><rect x="0" width="${w / 2}" height="${w}" fill="${light}"/><rect x="${w / 2}" width="${w / 2}" height="${w}" fill="${dark}"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
}
