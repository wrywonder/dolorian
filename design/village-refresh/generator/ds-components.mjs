// Component stylesheet, previews and guidelines for the Village design
// system. Everything is styled through tokens.css variables so the page's
// light / "after bedtime" switch and any token edit reach every preview.
import * as art from './lib/art.mjs';
import { icon, sparkle, squiggle, handArrow } from './lib/icons.mjs';
import { TONES } from './lib/new.mjs';

const ic = (n, cls = 'v-ico') => icon(n, 24, 'currentColor', 2).replace('<svg ', `<svg class="${cls}" `);
const sp = (size = 14) => sparkle(size, 'currentColor').replace('<svg ', '<svg class="v-sparkle" ');

export const bundleCss = `/* Village components — every value comes from tokens.css */
*{box-sizing:border-box}
body{margin:0;font-family:var(--font-text);background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased}
p,h1,h2,h3{margin:0}
.v-stage{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);padding:var(--space-5)}
.v-col{display:flex;flex-direction:column;gap:var(--space-3)}
.v-phone{width:390px;max-width:100%;padding:var(--space-5)}
.v-ico{width:1.15em;height:1.15em;display:block;flex:none}
.v-ink2{color:var(--ink-2)}.v-ink3{color:var(--ink-3)}.v-clayink{color:var(--clay-ink)}.v-sageink{color:var(--sage-ink)}.v-sunink{color:var(--sun-ink)}
.v-label{font:500 11px/14px var(--font-stamp);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px}

/* Button — capsules; clay and sage fills sit on a 3px lip */
.v-btn{font-family:var(--font-text);font-weight:700;letter-spacing:-.005em;border:0;border-radius:var(--radius-pill);display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;cursor:pointer;flex:none;transition:transform .12s ease,box-shadow .12s ease}
.v-btn--l{height:var(--size-control-l);padding:0 24px;font-size:17px}
.v-btn--m{height:var(--size-control-m);padding:0 18px;font-size:15px}
.v-btn--s{height:var(--size-control-s);padding:0 14px;font-size:14px}
.v-btn--full{width:100%}
.v-btn--primary{background:var(--clay);color:var(--on-clay);box-shadow:var(--lip-clay)}
.v-btn--s.v-btn--primary{box-shadow:var(--lip-clay-s)}
.v-btn--primary:active,.v-btn--sage:active{transform:translateY(2px);box-shadow:none}
.v-btn--sage{background:var(--sage-fill);color:var(--on-sage);box-shadow:var(--lip-sage)}
.v-btn--tonal{background:var(--clay-wash);color:var(--clay-ink)}
.v-btn--going{background:var(--sage-wash);color:var(--sage-ink)}
.v-btn--secondary{background:var(--paper-2);color:var(--ink)}
.v-btn--ghost{background:transparent;color:var(--clay-ink);padding-inline:4px}
.v-btn--quiet{background:transparent;color:var(--ink-2);padding-inline:4px}
.v-btn--apple{background:#000000;color:#ffffff}
.v-btn[disabled]{opacity:.45;box-shadow:none;cursor:default}

/* Icon button */
.v-iconbtn{width:var(--size-control-m);height:var(--size-control-m);border-radius:50%;border:0;padding:0;display:inline-flex;align-items:center;justify-content:center;background:var(--card);color:var(--ink);box-shadow:var(--shadow-card);position:relative;flex:none;cursor:pointer}
.v-iconbtn .v-ico{width:21px;height:21px}
.v-iconbtn--clay{background:var(--clay);color:var(--on-clay);box-shadow:var(--lip-clay)}
.v-iconbtn--glass{background:var(--glass);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:var(--shadow-sticker)}
.v-iconbtn--plain{background:transparent;box-shadow:none;color:var(--ink-3)}
.v-badge{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--clay);color:var(--on-clay);font:700 11px/18px var(--font-text);text-align:center;box-shadow:0 0 0 2px var(--paper)}

/* Chips and the filter row */
.v-chip{height:var(--size-chip);padding:0 14px;border-radius:var(--radius-pill);border:1px solid var(--line);background:var(--card);color:var(--ink-2);font:600 14px/18px var(--font-text);display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:none;cursor:pointer}
.v-chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.v-chip--menu{color:var(--ink)}
.v-chip .v-ico{width:14px;height:14px}
.v-filterrow{display:flex;align-items:center;gap:var(--space-2);overflow-x:auto;scrollbar-width:none}
.v-filterrow__rule{width:1px;height:22px;background:var(--line-strong);flex:none;margin:0 2px}

/* Segmented */
.v-seg{display:flex;height:40px;padding:3px;border-radius:var(--radius-pill);background:var(--paper-2);width:100%;max-width:350px}
.v-seg button{flex:1;border:0;border-radius:var(--radius-pill);background:transparent;color:var(--ink-2);font:600 14px/18px var(--font-text);cursor:pointer}
.v-seg button[aria-pressed="true"]{background:var(--card);color:var(--ink);box-shadow:var(--shadow-sticker)}

/* Avatar, stacks and the presence ring */
.v-avatar{--s:44px;width:var(--s);height:var(--s);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-text);font-weight:700;font-size:calc(var(--s) * .36);line-height:1;flex:none}
${Object.keys(TONES).map((t) => `.v-avatar--${t}{background:var(--tone-${t});color:var(--tone-${t}-ink)}`).join('\n')}
.v-avstack{display:flex;flex:none}
.v-avstack>.v-avatar{box-shadow:0 0 0 2px var(--card);font-size:calc(var(--s) * .32)}
.v-avstack>.v-avatar+.v-avatar{margin-left:calc(var(--s) * -.18)}
.v-presence{--s:44px;width:var(--s);height:var(--s);border-radius:50%;box-shadow:inset 0 0 0 2px var(--sun);display:inline-flex;align-items:center;justify-content:center;flex:none}
.v-pulse{width:9px;height:9px;border-radius:50%;background:var(--sun);position:relative;flex:none}
.v-pulse::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--sun);opacity:.25;transform:scale(1.9);animation:v-pulse 2.2s cubic-bezier(.2,.6,.4,1) infinite}
@keyframes v-pulse{from{transform:scale(1);opacity:.5}to{transform:scale(2.6);opacity:0}}
.v-presencechip{height:var(--size-chip);padding:0 5px 0 12px;border-radius:var(--radius-pill);border:0;background:var(--sun-wash);color:var(--sun-ink);display:inline-flex;align-items:center;gap:8px;font:600 14px/18px var(--font-text);cursor:pointer}
.v-presencechip--off{background:var(--paper-2);color:var(--ink-3);padding-right:14px}
.v-presencechip--off .v-pulse{background:var(--ink-3)}
.v-presencechip--off .v-pulse::after{display:none}

/* Stickers: the only things that tilt */
.v-stamp{display:inline-flex;align-items:center;padding:5px 9px;border-radius:8px;border:2px solid var(--polaroid);background:var(--butter);color:#2d241b;font:500 11px/14px var(--font-stamp);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;box-shadow:var(--shadow-sticker);transform:rotate(var(--tilt,0deg))}
.v-stamp--clay{background:var(--clay);color:var(--on-clay)}
.v-stamp--ink{background:var(--ink);color:var(--paper)}
.v-stamp--paper{background:var(--card);color:var(--ink)}
.v-sticker{--s:52px;width:var(--s);height:var(--s);border-radius:50%;background:var(--polaroid);box-shadow:var(--shadow-sticker);display:inline-flex;align-items:center;justify-content:center;font-size:calc(var(--s) * .56);line-height:1;flex:none;transform:rotate(var(--tilt,8deg))}
.v-tape{width:68px;height:20px;background:var(--tape);border-radius:3px;transform:rotate(-3deg)}
.v-tag{font:500 11px/14px var(--font-stamp);letter-spacing:.06em;text-transform:uppercase;color:var(--clay-ink);background:var(--clay-wash);padding:5px 8px;border-radius:8px;white-space:nowrap}

/* Flourishes */
.v-squiggle{display:block;color:var(--terracotta)}
.v-sparkle{display:block;color:var(--sun)}
.v-dotted{text-decoration:underline dotted var(--sage);text-decoration-thickness:2px;text-underline-offset:5px}
@keyframes v-draw{from{stroke-dashoffset:80}to{stroke-dashoffset:0}}
.v-squiggle--draw path{stroke-dasharray:80;animation:v-draw .42s cubic-bezier(.3,.7,.3,1) both}
@keyframes v-twinkle{0%,100%{opacity:.55;transform:scale(.85) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(15deg)}}
.v-twinkle{animation:v-twinkle 2.6s ease-in-out infinite}

/* Screen header */
.v-header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:6px var(--space-5) 0}
.v-header__eyebrow{font:500 11px/14px var(--font-stamp);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:2px}
.v-header__title{margin:0;font-family:var(--font-display);font-style:italic;font-weight:400;font-size:40px;line-height:44px;letter-spacing:-.015em;color:var(--ink)}
.v-header .v-squiggle{margin-top:2px}
.v-header__actions{display:flex;gap:10px;padding-bottom:10px}

/* Dock: tab pill + create button */
.v-dock{display:flex;align-items:center;gap:var(--space-3)}
.v-dock__pill{flex:1;height:var(--size-dock);border-radius:32px;background:var(--glass);-webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);box-shadow:var(--shadow-float),inset 0 0 0 1px var(--glass-edge);display:flex;align-items:center;gap:2px;padding:0 8px}
.v-dock__tab{flex:1;height:48px;border-radius:24px;border:0;padding:0;background:transparent;color:var(--ink-3);display:flex;align-items:center;justify-content:center;gap:6px;position:relative;cursor:pointer;font:700 15px/1 var(--font-text)}
.v-dock__tab .v-ico{width:24px;height:24px}
.v-dock__tab[aria-current="page"]{flex:1.9;background:var(--clay);color:var(--on-clay);box-shadow:var(--lip-clay-s)}
.v-dock__tab .v-badge{top:6px;right:auto;left:54%;box-shadow:0 0 0 2.5px var(--card)}
.v-dock__create{width:var(--size-dock);height:var(--size-dock);border-radius:50%;border:0;padding:0;background:var(--clay);color:var(--on-clay);box-shadow:var(--lip-clay),var(--shadow-float);display:flex;align-items:center;justify-content:center;transform:rotate(-6deg);flex:none;cursor:pointer}
.v-dock__create .v-ico{width:28px;height:28px}

/* Reaction pills */
.v-react{height:var(--size-control-s);padding:0 12px;border-radius:var(--radius-pill);border:0;background:var(--paper-2);color:var(--ink-2);display:inline-flex;align-items:center;gap:6px;font:600 14px/18px var(--font-text);cursor:pointer;flex:none}
.v-react[aria-pressed="true"]{background:var(--clay-wash);color:var(--clay-ink)}
.v-react__emoji{font-size:15px;line-height:1}
.v-react .v-ico{width:17px;height:17px}
.v-polaroid .v-react:not([aria-pressed="true"]){background:var(--paper)}

/* Polaroid photo post */
.v-polaroid{position:relative;background:var(--polaroid);border-radius:14px;padding:10px 10px 14px;box-shadow:var(--shadow-card)}
.v-polaroid__photo{aspect-ratio:5/4;border-radius:var(--radius-xs);overflow:hidden;position:relative}
.v-polaroid__photo::after{content:"";position:absolute;inset:0;background:var(--photo-scrim)}
.v-polaroid__caption{margin:14px 6px 0;color:var(--ink)}
.v-polaroid>.v-stamp{position:absolute;top:-9px;right:16px;--tilt:5deg}
.v-byline{display:flex;align-items:center;gap:10px;margin:12px 6px 0}
.v-byline__text{flex:1;min-width:0}
.v-byline__text>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-reactions{display:flex;gap:6px;align-items:center}

/* Question bubble */
.v-bubble{position:relative;background:var(--card);border-radius:var(--radius-lg);padding:16px 16px 14px;box-shadow:var(--shadow-card);margin-bottom:12px}
.v-bubble__head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.v-bubble__q{font-family:var(--font-display);font-style:italic;font-size:22px;line-height:27px;color:var(--ink)}
.v-bubble__tail{position:absolute;left:30px;bottom:-12px;width:22px;height:14px;color:var(--card)}
.v-bubble .v-reactions{margin-top:14px}

/* Nudge note */
.v-nudge{position:relative;padding-top:10px}
.v-nudge>.v-tape{position:absolute;top:1px;left:50%;margin-left:-34px;z-index:2}
.v-nudge__note{background:var(--sage-wash);border-radius:var(--radius-lg);padding:18px 16px 14px;display:flex;gap:14px;align-items:flex-start}
.v-emojitile{width:48px;height:48px;border-radius:var(--radius-md);background:var(--card);box-shadow:var(--shadow-sticker);display:flex;align-items:center;justify-content:center;font-size:26px;line-height:1;position:relative;flex:none}
.v-emojitile .v-sparkle{position:absolute;top:-7px;right:-7px}
.v-nudge__actions{display:flex;align-items:center;gap:4px;margin-top:12px}

/* Plan card */
.v-plan{position:relative}
.v-plan__card{background:var(--card);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-card)}
.v-plan__photo{height:176px;position:relative}
.v-plan__photo::after{content:"";position:absolute;inset:0;background:var(--photo-scrim)}
.v-plan__photo--none{height:96px}
.v-plan__audience{position:absolute;top:12px;left:12px;z-index:1;height:28px;padding:0 10px;border-radius:var(--radius-pill);background:var(--glass);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);display:flex;align-items:center;gap:6px;font:600 12px/15px var(--font-text);color:var(--ink)}
.v-plan__audience .v-ico{width:14px;height:14px}
.v-plan__body{padding:0 16px 16px}
.v-plan__when{display:flex;align-items:flex-end;gap:12px;margin-top:-26px}
.v-plan__when>span{padding-bottom:4px}
.v-datetile{width:58px;height:64px;border-radius:14px;background:var(--polaroid);box-shadow:var(--shadow-sticker);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;position:relative;z-index:2}
.v-datetile__dow{font:500 11px/14px var(--font-stamp);letter-spacing:.06em;text-transform:uppercase;color:var(--clay-ink)}
.v-datetile__day{font:400 30px/30px var(--font-display);color:var(--ink);font-variant-numeric:tabular-nums}
.v-plan__name{margin-top:12px;color:var(--ink)}
.v-plan__desc{margin-top:4px;color:var(--ink-2)}
.v-plan__rule{height:1px;background:var(--line);margin:14px 0}
.v-plan__proof{display:flex;align-items:center;gap:10px}
.v-plan__proof>div{flex:1;min-width:0}
.v-plan>.v-sticker{position:absolute;top:-12px;right:-4px;--s:54px;--tilt:10deg;z-index:3}

/* Stat strip */
.v-stats{display:flex;background:var(--card);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);overflow:hidden}
.v-stats>button{flex:1;padding:14px 0 12px;text-align:center;border:0;background:none;cursor:pointer;color:inherit}
.v-stats>button+button{border-left:1px solid var(--line)}
.v-stats__n{display:block;font:400 30px/32px var(--font-display);color:var(--ink);font-variant-numeric:tabular-nums}
.v-stats__label{display:block;font:500 13px/17px var(--font-text);color:var(--ink-3);margin-top:2px}

/* List rows */
.v-list{background:var(--card);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);overflow:hidden}
.v-row{display:flex;align-items:center;gap:12px;min-height:68px;padding:0 6px 0 16px;position:relative}
.v-row+.v-row::before{content:"";position:absolute;left:72px;right:0;top:0;height:1px;background:var(--line)}
.v-row__text{flex:1;min-width:0}
.v-row__sub{display:flex;align-items:center;gap:6px;margin-top:2px}
.v-row__sub .v-pulse{width:7px;height:7px}

/* Request banner */
.v-banner{display:flex;align-items:center;gap:12px;width:100%;padding:14px 14px 14px 16px;border:0;border-radius:var(--radius-lg);background:var(--clay);color:var(--on-clay);box-shadow:var(--lip-clay);position:relative;text-align:left;cursor:pointer}
.v-banner .v-avstack>.v-avatar{box-shadow:0 0 0 2px var(--card)}
.v-banner>.v-sparkle{position:absolute;top:-10px;left:64px;color:var(--butter)}
.v-banner__text{flex:1;min-width:0}

/* Text field */
.v-field{display:flex;flex-direction:column;gap:6px}
.v-field label{font:600 14px/18px var(--font-text);color:var(--ink-2)}
.v-field input{height:var(--size-control-l);padding:0 16px;border-radius:var(--radius-md);border:1.5px solid var(--line-strong);background:var(--paper);color:var(--ink);font:500 17px/1 var(--font-text);outline:none;width:100%}
.v-field input::placeholder{color:var(--ink-3)}
.v-field input:focus{border:2px solid var(--clay);box-shadow:0 0 0 4px var(--clay-wash)}
.v-field__help{font:500 13px/17px var(--font-text);color:var(--ink-3)}
.v-field__error{display:flex;gap:6px;align-items:center;font:500 13px/17px var(--font-text);color:var(--danger)}
.v-field--error input{border:2px solid var(--danger)}
.v-field--code input{font:500 24px/1 var(--font-stamp);letter-spacing:.3em}

/* Empty state */
.v-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:var(--space-10) var(--space-8)}
.v-empty__title{display:flex;align-items:center;gap:8px;color:var(--ink)}
.v-empty__body{max-width:280px;color:var(--ink-2)}
@media (prefers-reduced-motion:reduce){.v-pulse::after,.v-twinkle,.v-squiggle--draw path{animation:none}}
`;

// ---------------------------------------------------------------- markup helpers
const av = (i, tone, s = 44, cls = '') => `<span class="v-avatar v-avatar--${tone} ${cls}" style="--s:${s}px">${i}</span>`;
const avs = (list, s = 28) => `<span class="v-avstack">${list.map(([i, t]) => av(i, t, s)).join('')}</span>`;
const sq = (w = 54) => squiggle(w, 'currentColor', 2.4).replace('<svg ', '<svg class="v-squiggle" ');
const tail = '<svg class="v-bubble__tail" aria-hidden="true" viewBox="0 0 22 14"><path d="M0 0 H22 C14 2 6 8 2 14 C3 8 2 4 0 0Z" fill="currentColor"/></svg>';
const doc = (title, group, height, body, subtitle) => `<!-- @dsCard group="${group}" height=${height}${subtitle ? ` subtitle="${subtitle}"` : ''} -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${title} — preview</title></head>
<body>
${body}
</body>
</html>
`;

const polaroid = () => `<article class="v-polaroid" style="max-width:350px">
  <div class="v-polaroid__photo">${art.soccer()}</div>
  <p class="title3 v-polaroid__caption">first goal — pure magic</p>
  <div class="v-byline">${av('MC', 'peach', 32)}
    <div class="v-byline__text"><div class="subhead">Maya Chen</div><div class="footnote v-ink3">Cesar Chavez Park 🌳</div></div>
    <div class="v-reactions"><button class="v-react" type="button" aria-pressed="true"><span class="v-react__emoji">❤️</span>12</button><button class="v-react" type="button" aria-label="3 comments">${ic('bubble')}3</button></div>
  </div>
  <span class="v-stamp">sat · 22 min</span>
</article>`;

const planCard = ({ going = false, photo = true } = {}) => `<article class="v-plan" style="max-width:350px">
  <div class="v-plan__card">
    <div class="v-plan__photo${photo ? '' : ' v-plan__photo--none'}" style="${photo ? '' : 'background:var(--tone-mauve)'}">${photo ? (going ? art.hike() : art.soccer()) : ''}<span class="v-plan__audience">${ic(going ? 'person.2' : 'map.pin')}${going ? 'my village' : 'public'}</span></div>
    <div class="v-plan__body">
      <div class="v-plan__when"><div class="v-datetile"><span class="v-datetile__dow">${photo ? (going ? 'sun' : 'sat') : 'tue'}</span><span class="v-datetile__day">${photo ? (going ? '25' : '24') : '27'}</span></div><span class="subhead v-ink2">${photo ? (going ? '9:30am · Tilden Park' : '10am · Cesar Chavez Park') : '10:30am · Studio Growlies'}</span></div>
      <h2 class="title2 v-plan__name">${photo ? (going ? 'Wildcat Hike' : 'Saturday Soccer') : '10:30 Ballet'}</h2>
      <p class="body v-plan__desc">${photo ? (going ? 'easy 2 mi · carriers welcome' : 'show up. kick ball. eat snacks.') : 'tiny tutus, big feelings.'}</p>
      <div class="v-plan__rule"></div>
      <div class="v-plan__proof">${going ? avs([['SW', 'butter'], ['DR', 'rose']], 30) : avs([['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 30)}
        <div><div class="subhead v-sageink">${going ? '2 families going' : '3 families going'}</div><div class="footnote v-ink3">${going ? 'you and Sam' : 'Priya is interested'}</div></div>
        ${going ? `<button class="v-btn v-btn--m v-btn--going" type="button">${ic('check')}going</button>` : '<button class="v-btn v-btn--m v-btn--primary" type="button">I’m in</button>'}
      </div>
    </div>
  </div>
  <span class="v-sticker">${going ? '🥾' : photo ? '⚽' : '🩰'}</span>
</article>`;

// ---------------------------------------------------------------- components
export const components = [
  {
    name: 'Button', group: 'Actions', height: 200,
    readme: `# Button

Capsule buttons in three sizes; clay is the only action color, and clay or sage fills sit on a 3px lip that presses down.

**Use** \`primary\` (clay) once per view for the thing the screen is for: “I’m in”, “continue with email”. \`sage\` belongs to nudges (“snap one”). \`going\` is the confirmed state of an RSVP, not an action color. \`secondary\` (paper-2) for supporting actions like “edit profile”; \`ghost\` (clay-ink text) for inline links like “see all 12”; \`quiet\` (ink-2 text) for dismissals like “not now”.

**Sizes** L 54px (sign-in, sheets, full width), M 44px (cards, default), S 34px (inside dense rows; pad the hit area to 44).

**Label** lowercase verb phrase, two or three words; the pronoun I and proper nouns keep their capitals (“I’m in”). Platform buttons keep their own casing (“Continue with Apple”). An icon goes left for an object (camera, pencil, check) and right only for “go on” (arrow).

**Press** translate down 2px and drop the lip; light haptic; medium for the create button and RSVPs.

**Provide** the label, a variant, a size, optional leading or trailing icon, and \`disabled\`. Never white text on terracotta: use \`clay\` with \`on-clay\`.`,
    body: `<div class="v-col v-stage" style="align-items:flex-start">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
    <button class="v-btn v-btn--l v-btn--primary" type="button">continue with email ${ic('arrow.right')}</button>
    <button class="v-btn v-btn--m v-btn--primary" type="button">I’m in</button>
    <button class="v-btn v-btn--s v-btn--primary" type="button">answer</button>
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
    <button class="v-btn v-btn--m v-btn--sage" type="button">${ic('camera')}snap one</button>
    <button class="v-btn v-btn--m v-btn--going" type="button">${ic('check')}going</button>
    <button class="v-btn v-btn--s v-btn--secondary" type="button">${ic('pencil')}edit profile</button>
    <button class="v-btn v-btn--s v-btn--ghost" type="button">see all 12</button>
    <button class="v-btn v-btn--m v-btn--quiet" type="button">not now</button>
    <button class="v-btn v-btn--m v-btn--primary" type="button" disabled>I’m in</button>
  </div>
</div>`,
  },
  {
    name: 'IconButton', group: 'Actions', height: 100,
    readme: `# IconButton

A 44px circle holding one icon, for actions a title row or a photo needs: search, calendar view, settings.

\`paper\` (card fill, card shadow) on paper; \`glass\` over photos and covers; \`clay\` only for a primary create action inside a screen (the dock’s create button is its own component); \`plain\` for row overflow (ellipsis) with no fill. Always pass an accessible label (“Calendar view”, “Settings”). A badge counts unread items, never more than two digits.`,
    body: `<div class="v-stage">
  <button class="v-iconbtn" type="button" aria-label="Search and sort">${ic('search')}</button>
  <button class="v-iconbtn" type="button" aria-label="Calendar view">${ic('calendar')}</button>
  <button class="v-iconbtn v-iconbtn--clay" type="button" aria-label="New plan">${ic('plus')}</button>
  <span style="display:inline-flex;padding:10px;border-radius:16px;background:var(--tone-rose)"><button class="v-iconbtn v-iconbtn--glass" type="button" aria-label="Settings">${ic('cog')}</button></span>
  <button class="v-iconbtn v-iconbtn--plain" type="button" aria-label="More for Maya">${ic('ellipsis')}</button>
  <button class="v-iconbtn" type="button" aria-label="Notifications, 2 new">${ic('bell')}<span class="v-badge">2</span></button>
</div>`,
  },
  {
    name: 'Dock', group: 'Navigation', height: 130,
    readme: `# Dock

The bottom navigation: a frosted tab pill and, beside it, one tilted create button that does the obvious thing for the current tab.

**Tabs** buzz, IRL, plans, you. Idle tabs are outline icons in ink-3 with no label; the current tab grows into a clay capsule with the filled icon and its name. Screen headers carry the names, so idle tabs stay quiet.

**Create** 64px clay circle at −6°, on the lip. Its action and accessible label follow the tab: New post (buzz), New hangout spot (IRL), New plan (plans), Invite a parent (you). It replaces v1’s floating compose button, which sat on top of feed content, and the plans header’s “+”.

**Placement** fixed 28px above the bottom safe area with a 20px gutter; scrolling content gets 140px of bottom padding so the last card clears it. Badges sit on idle tabs only.

**Motion** the capsule slides between tabs (spring, damping 18, stiffness 260); selection haptic on tab change; medium impact on create.`,
    body: `<div class="v-stage" style="background:var(--paper-2);display:block">
  <nav class="v-dock" aria-label="Tabs" style="max-width:390px">
    <div class="v-dock__pill">
      <button class="v-dock__tab" type="button" aria-current="page">${ic('feed.fill')}buzz</button>
      <button class="v-dock__tab" type="button" aria-label="IRL">${ic('map.pin')}</button>
      <button class="v-dock__tab" type="button" aria-label="plans">${ic('calendar')}</button>
      <button class="v-dock__tab" type="button" aria-label="you, 2 requests">${ic('person')}<span class="v-badge">2</span></button>
    </div>
    <button class="v-dock__create" type="button" aria-label="New post">${ic('plus')}</button>
  </nav>
</div>`,
  },
  {
    name: 'ScreenHeader', group: 'Navigation', height: 130,
    readme: `# ScreenHeader

Every tab opens the same way: a stamp eyebrow, the lowercase tab name in display serif, and the squiggle beneath it.

**Provide** an eyebrow (a date on buzz, a short phrase elsewhere: “what’s happening”, “your village, right now”), the title (buzz, IRL, plans), and up to two trailing controls: icon buttons or the presence chip. IRL swaps the squiggle for a sparkle beside the title; nothing else changes.

**Rules** one header per screen, never inside a card; the squiggle draws on (420ms) the first time a tab appears in a session; the title is never truncated, so trailing controls stay compact.`,
    body: `<div style="padding:20px 0">
  <header class="v-header" style="max-width:390px">
    <div><div class="v-header__eyebrow">what’s happening</div><h1 class="v-header__title">plans</h1>${sq().replace('class="v-squiggle"', 'class="v-squiggle v-squiggle--draw"')}</div>
    <div class="v-header__actions"><button class="v-iconbtn" type="button" aria-label="Search and sort">${ic('search')}</button><button class="v-iconbtn" type="button" aria-label="Calendar view">${ic('calendar')}</button></div>
  </header>
</div>`,
  },
  {
    name: 'Chip', group: 'Navigation', height: 120,
    readme: `# Chip

Filter chips in one scrolling row; a menu chip with a chevron at the head of the row holds the time range.

**States** idle: card fill, line outline, ink-2 label. Selected: ink fill, paper label. A menu chip shows its current value in ink with a chevron and opens a short menu (upcoming, recent). No chip selected means “all”.

**Rules** one row of filters per screen; a hairline (line-strong) separates the menu chip from the toggles; labels lowercase, one or two words.`,
    body: `<div class="v-stage" style="display:block;max-width:420px"><div class="v-filterrow">
  <button class="v-chip v-chip--menu" type="button" aria-pressed="true">upcoming${ic('chevron.down')}</button><span class="v-filterrow__rule"></span>
  <button class="v-chip" type="button" aria-pressed="true">my village</button>
  <button class="v-chip" type="button" aria-pressed="false">invited</button>
  <button class="v-chip" type="button" aria-pressed="false">public</button>
  <button class="v-chip" type="button" aria-pressed="false">made by me</button>
</div></div>`,
  },
  {
    name: 'Segmented', group: 'Navigation', height: 90,
    readme: `# Segmented

Two or three mutually exclusive views in a paper-2 track, the current one lifted on a card capsule.

Use it inside sheets and settings (sharing mode: on, auto, off). On a tab’s main screen prefer a menu chip, which costs one row less.`,
    body: `<div class="v-stage"><div class="v-seg" role="group" aria-label="Sharing"><button type="button" aria-pressed="false">on</button><button type="button" aria-pressed="true">auto</button><button type="button" aria-pressed="false">off</button></div></div>`,
  },
  {
    name: 'Avatar', group: 'People', height: 130,
    readme: `# Avatar

A circle in the parent’s own tone with their initials in that tone’s ink; a photo replaces both when they’ve added one.

**Sizes** 28 (stacks), 32 (bylines), 44 (rows), 96 (profile). Initials are 36% of the size (32% in stacks).

**Presence** a parent who is out and about gets a 2px sun ring inside the same footprint, so rows stay aligned.

**Stacks** up to three, each later avatar on top, overlapping 18% with a 2px card ring, so every initial stays readable. More than three becomes a count in the label beside the stack (“5 families going”), not a “+2” bubble.

**Provide** initials, a tone (peach, golden, sage, mauve, slate, rose, butter), optional image URL, size, and whether they’re out and about.`,
    body: `<div class="v-stage">
  ${av('MC', 'peach', 96)}${av('JP', 'sage', 44)}${av('PP', 'mauve', 44)}${av('SW', 'butter', 44)}<span class="v-presence">${av('HG', 'peach', 36)}</span>${av('DR', 'rose', 32)}
  ${avs([['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 28)}
</div>`,
  },
  {
    name: 'PresenceChip', group: 'People', height: 90,
    readme: `# PresenceChip

The out-and-about indicator that lives in the buzz and IRL headers: a pulsing sun dot, the state, and who else is out.

**States** on or auto: sun-wash fill, sun-ink label “out & about”, up to three avatars of connections who are visible now. Off: paper-2 fill, ink-3 label “off the map”, a still dot, no avatars.

**Behavior** tapping opens the sharing sheet (on, auto, off); it does not toggle in place. Both headers read the same state.`,
    body: `<div class="v-stage">
  <button class="v-presencechip" type="button" aria-label="Out and about. Maya, Jordan and Hannah are visible"><span class="v-pulse"></span>out &amp; about${avs([['MC', 'peach'], ['JP', 'sage'], ['HG', 'peach']], 24)}</button>
  <button class="v-presencechip v-presencechip--off" type="button"><span class="v-pulse"></span>off the map</button>
</div>`,
  },
  {
    name: 'Stickers', group: 'Playful kit', height: 150,
    readme: `# Stickers

Stamps, emoji stickers and tape: the pieces “pinned onto” the calm layout, and the only elements allowed to tilt.

**Stamp** DM Mono uppercase on butter (or clay, ink, card) with a 2px polaroid-white die-cut edge and the sticker shadow. Use for dates and times on photos (“sat · 22 min”), never for actions. Write units out (“22 min”, not “22m”) because the stamp is uppercase.

**Emoji sticker** the plan’s emoji on a white puck, 52–54px, overhanging a card’s top-right corner by about 12px, tilted 8–10°.

**Tag** a flat stamp-styled label inside a card, clay-ink on clay-wash (“help ✋” on questions). Tags don’t tilt.

**Tape** translucent butter, 68×20, −3°: pins a nudge note and nothing else.

**Tilt** ±4–10°; only stickers rotate. Containers and text blocks stay square.`,
    body: `<div class="v-stage" style="gap:20px">
  <span class="v-stamp" style="--tilt:5deg">sat · 22 min</span>
  <span class="v-stamp v-stamp--clay" style="--tilt:-4deg">new</span>
  <span class="v-stamp v-stamp--ink" style="--tilt:3deg">2 plans</span>
  <span class="v-sticker">⚽</span>
  <span class="v-sticker" style="--tilt:-10deg;--s:46px">🧁</span>
  <span class="v-tag">help ✋</span>
  <span class="v-tape"></span>
</div>`,
  },
  {
    name: 'Flourishes', group: 'Playful kit', height: 120,
    readme: `# Flourishes

The hand-drawn marks from the logo, used sparingly so they keep meaning something.

**Squiggle** terracotta, 2.4px stroke, under the tab title only: one per screen. Draws on in 420ms the first time a tab appears.

**Sparkle** the 4-point star means “new for you”: a fresh nudge, an incoming request, the burst after you RSVP. At most one resting sparkle per screen; it twinkles (2.6s loop) only if it marks something live. Sun on paper, butter on clay.

**Dotted underline** sage, under the activity name in a nudge, as a text decoration so it wraps with the sentence (v1’s separate view orphaned the “?”).

**Hand arrow** onboarding and empty states only, pointing at the first thing to do.`,
    body: `<div class="v-stage" style="gap:28px">
  ${sq(54).replace('class="v-squiggle"', 'class="v-squiggle v-squiggle--draw"')}
  <span class="v-twinkle" style="display:inline-block">${sp(18)}</span>
  <span style="color:var(--butter);background:var(--clay);padding:8px;border-radius:10px">${sp(16)}</span>
  <p class="title3">Share a moment from <span class="v-dotted">saturday soccer</span>?</p>
  <span style="color:var(--terracotta)">${handArrow(50, 'currentColor')}</span>
</div>`,
  },
  {
    name: 'PolaroidPost', group: 'Feed', height: 470,
    readme: `# PolaroidPost

A photo post as a polaroid: a 5:4 photo on white paper, the caption written on the bottom strip, the byline and reactions beneath, a date stamp stuck on the top edge.

**Provide** the photo, the caption (the parent’s words, shown as written in \`title3\`), author (name, initials, tone), the venue with its emoji, the time for the stamp, reaction emoji and count, comment count, and whether you reacted.

**Rules** the polaroid never rotates; the stamp does (5°). Photos crop to 5:4; tall photos are center-cropped, never letterboxed. Long-press your own post to delete it. In the dark theme photos sit under \`photo-scrim\`.`,
    body: `<div class="v-phone">${polaroid()}</div>`,
  },
  {
    name: 'QuestionBubble', group: 'Feed', height: 250,
    readme: `# QuestionBubble

A question or text post as a speech bubble whose tail points back at the asker.

**Provide** author, relative time, the question (shown in \`title3\` at 22px), reaction emoji and count, answer count. Question posts get the “help ✋” tag and an “answer” ghost button; plain text posts drop both.

**Rules** keep questions under about 140 characters in the feed and clamp at five lines with “more”. The bubble is the only card with a tail.`,
    body: `<div class="v-phone"><article class="v-bubble">
  <div class="v-bubble__head">${av('JP', 'sage', 32)}<div style="flex:1"><div class="subhead">Jordan asks</div><div class="footnote v-ink3">1h ago</div></div><span class="v-tag">help ✋</span></div>
  <p class="v-bubble__q">Anyone tried toddler tumbling at Studio Grow? Felix (3) is climbing things.</p>
  <div class="v-reactions"><button class="v-react" type="button" aria-pressed="false"><span class="v-react__emoji">🤸</span>4</button><button class="v-react" type="button" aria-label="6 answers">${ic('bubble')}6</button><span style="flex:1"></span><button class="v-btn v-btn--s v-btn--ghost" type="button">answer${ic('arrow.right')}</button></div>
  ${tail}
</article></div>`,
  },
  {
    name: 'NudgeNote', group: 'Feed', height: 190,
    readme: `# NudgeNote

A prompt taped to the top of the feed: a sage note with the activity’s emoji, a stamp eyebrow, the question in serif, and two actions.

**Provide** the prompt type, the activity (name and emoji), the primary action (“snap one” opens compose with the activity attached) and the dismissal (“not now”).

**Rules** at most one nudge in the feed at a time, always first. The sparkle on the emoji tile marks it as new until it’s been seen. The activity name carries the dotted sage underline.`,
    body: `<div class="v-phone"><aside class="v-nudge"><span class="v-tape"></span><div class="v-nudge__note">
  <div class="v-emojitile">⚽${sp(14)}</div>
  <div style="flex:1;min-width:0"><div class="v-label v-sageink">a little nudge</div><p class="title3" style="margin-top:4px">Share a moment from <span class="v-dotted">saturday soccer</span>?</p>
  <div class="v-nudge__actions"><button class="v-btn v-btn--m v-btn--sage" type="button">${ic('camera')}snap one</button><button class="v-btn v-btn--m v-btn--quiet" type="button">not now</button></div></div>
</div></aside></div>`,
  },
  {
    name: 'ReactionPill', group: 'Feed', height: 90,
    readme: `# ReactionPill

One reaction emoji (chosen by the post’s author, ❤️ by default) with its count, plus a comment pill.

Idle: paper-2 fill (paper inside a polaroid), ink-2 count. Yours: clay-wash fill, clay-ink count. Toggle is optimistic with a selection haptic; a zero count hides the number, not the pill.`,
    body: `<div class="v-stage"><button class="v-react" type="button" aria-pressed="true"><span class="v-react__emoji">❤️</span>12</button><button class="v-react" type="button" aria-pressed="false"><span class="v-react__emoji">🦖</span>4</button><button class="v-react" type="button" aria-label="3 comments">${ic('bubble')}3</button><button class="v-react" type="button" aria-pressed="false"><span class="v-react__emoji">❤️</span></button></div>`,
  },
  {
    name: 'PlanCard', group: 'Plans', height: 540,
    readme: `# PlanCard

A plan as a flyer: the photo on top, a tear-off date tile pinned across the photo’s bottom edge, the name in serif, and who’s going with your response.

**Provide** name, emoji, cover photo (or none), audience (public, my village, invited), start date and time, place, one-line description, going and interested people, your RSVP state, and whether it’s cancelled.

**States** not responded: clay “I’m in”. Going: sage “going” with a check. Interested and can’t make it use the same tonal button with their words. A plan with an external signup says “add my status” and “signed up” instead. Cancelled: a clay “cancelled” stamp on the photo and the button disabled.

**No photo** the photo band shrinks to 96px of the plan’s tone; the emoji sticker carries the picture.

**Rules** the card stays square; the emoji sticker tilts. Group cards under day headings (“this weekend”) instead of tilting them.`,
    body: `<div class="v-phone" style="display:flex;flex-direction:column;gap:28px;width:390px">${planCard()}</div>`,
  },
  {
    name: 'StatStrip', group: 'People', height: 120,
    readme: `# StatStrip

Three counts on one card, each a door: connections opens your village, kids opens the kids list, hangouts opens hangout spots.

Numbers in display serif (regular, tabular), labels in footnote ink-3, hairline dividers. Replaces v1’s three bordered tiles plus the two quick-action tiles beneath them.`,
    body: `<div class="v-phone"><div class="v-stats"><button type="button"><span class="v-stats__n">12</span><span class="v-stats__label">connections</span></button><button type="button"><span class="v-stats__n">2</span><span class="v-stats__label">kids</span></button><button type="button"><span class="v-stats__n">3</span><span class="v-stats__label">hangouts</span></button></div></div>`,
  },
  {
    name: 'ListRow', group: 'People', height: 260,
    readme: `# ListRow

A person or place in a grouped list: avatar, name, one supporting line, and an overflow.

**Provide** avatar props, title, subtitle, presence (adds the sun ring and puts where they are in sun-ink with a dot), and the overflow action. Rows are 68px; dividers are inset to the text (72px).`,
    body: `<div class="v-phone"><div class="v-list">
  <div class="v-row"><span class="v-presence">${av('MC', 'peach', 36)}</span><div class="v-row__text"><div class="headline">Maya Chen</div><div class="v-row__sub"><span class="v-pulse"></span><span class="footnote v-sunink">at Cesar Chavez Park</span></div></div><button class="v-iconbtn v-iconbtn--plain" type="button" aria-label="More for Maya">${ic('ellipsis')}</button></div>
  <div class="v-row">${av('JP', 'sage', 44)}<div class="v-row__text"><div class="headline">Jordan Park</div><div class="v-row__sub"><span class="footnote v-ink3">North Berkeley</span></div></div><button class="v-iconbtn v-iconbtn--plain" type="button" aria-label="More for Jordan">${ic('ellipsis')}</button></div>
  <div class="v-row">${av('PP', 'mauve', 44)}<div class="v-row__text"><div class="headline">Priya Patel</div><div class="v-row__sub"><span class="footnote v-ink3">Albany</span></div></div><button class="v-iconbtn v-iconbtn--plain" type="button" aria-label="More for Priya">${ic('ellipsis')}</button></div>
</div></div>`,
  },
  {
    name: 'RequestBanner', group: 'People', height: 120,
    readme: `# RequestBanner

A clay banner for something waiting on you, with the people involved: connection requests on your profile, an invite you haven’t answered.

**Provide** up to two avatars, a headline in people’s terms (“2 parents want to connect”), a supporting line, and where it goes. It sits on the lip and carries the screen’s one resting sparkle.`,
    body: `<div class="v-phone" style="padding-top:28px"><button class="v-banner" type="button">${sp(18)}${avs([['SW', 'butter'], ['PP', 'mauve']], 34)}<span class="v-banner__text"><span class="headline" style="display:block">2 parents want to connect</span><span class="footnote" style="display:block;opacity:.88">say hello in your village</span></span>${ic('chevron.right')}</button></div>`,
  },
  {
    name: 'TextField', group: 'Forms', height: 330,
    readme: `# TextField

A labeled input on paper with a clay focus ring; the one-time-code variant uses the stamp face.

**States** rest: 1.5px line-strong border. Focus: 2px clay border plus a 4px clay-wash halo. Error: 2px danger border and a danger line with an icon under it, written as what happened and what to do (“That code expired. Send a new one.”).

**Provide** a lowercase label (“email”), optional placeholder, helper text in full sentences, and error text. The code field takes 8 digits (Supabase OTP), \`textContentType="oneTimeCode"\`.`,
    body: `<div class="v-phone v-col" style="gap:18px">
  <div class="v-field"><label for="em">email</label><input id="em" type="email" value="maya.chen@example.com"><span class="v-field__help">No password. We’ll email you an 8-digit code — it signs you in or creates your account.</span></div>
  <div class="v-field v-field--code v-field--error"><label for="otp">8-digit code</label><input id="otp" inputmode="numeric" value="40912877"><span class="v-field__error">${ic('x')}That code expired. Send a new one.</span></div>
</div>`,
  },
  {
    name: 'EmptyState', group: 'Feedback', height: 230,
    readme: `# EmptyState

What a tab says before there’s anything in it: a stamp eyebrow, a warm serif line, one sentence about what will appear, and the first thing to do.

Never apologetic and never a dead end; one action at most. Real v1 copy to keep: “your village hasn’t said hi yet”, “make the first plan”, “nothing fits that search”. The hand arrow points at the action.`,
    body: `<div class="v-empty"><span class="v-label">quiet here</span><h2 class="title2 v-empty__title">your village hasn’t said hi yet</h2><p class="callout v-empty__body">When the parents you’ve connected with post photos, questions or little wins, they’ll show up here.</p><button class="v-btn v-btn--m v-btn--primary" type="button" style="margin-top:10px">invite a parent</button></div>`,
  },
];

// ---------------------------------------------------------------- cover
export const coverHtml = `<!-- @dsCard height=288 -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Village</title>
<style>
  html, body { margin:0; height:100%; }
  body { background:var(--paper); color:var(--ink); font-family:var(--font-text); overflow:hidden; }
  .cover { position:relative; height:288px; overflow:hidden; }
  .art { position:absolute; top:0; left:480px; width:480px; height:288px; overflow:hidden; }
  .art svg { display:block; width:480px; height:288px; }
  .clay { fill:var(--clay); } .butter { fill:var(--butter); } .sage { fill:var(--sage-wash); } .ink { fill:var(--ink); } .paper2 { fill:var(--paper-2); } .sun { fill:var(--sun); }
  .card { rx:var(--radius-lg); } .tag { rx:var(--radius-sm); }
  .wave { fill:none; stroke:var(--terracotta); stroke-width:4; stroke-linecap:round; }
  .words { position:absolute; left:var(--space-6); bottom:var(--space-6); max-width:440px; }
  .name { margin:0; font-family:var(--font-display); font-style:italic; font-weight:400; font-size:112px; line-height:.92; letter-spacing:-.02em; color:var(--ink); }
  .tag-line { margin:var(--space-4) 0 0 4px; font-size:14px; line-height:20px; color:var(--ink-2); }
</style>
</head>
<body>
<div class="cover">
<div class="art" aria-hidden="true">
<svg viewBox="0 0 480 288" width="480" height="288">
<!--
  blocks      clay 176×232 bled off the top (the action color, largest) · ink 152×120 (the polaroid’s shadow side) · sage-wash 160×112 (the nudge note) · butter 96×40 once (the date stamp) · paper-2 tint behind · sun disc 40 (live presence, small: it only means "now")
  arrangement pinned notes on a fridge door: square blocks at radius-lg, only the butter stamp tilts (6°), the way only stickers tilt in the app
  pattern     the squiggle, from "the squiggle under every tab title": four terracotta waves at a space-6 pitch crossing the gaps, never over the name
  scales      sides in space-2 multiples; gutters space-4; corners radius-lg, stamp radius-sm; disc r = space-5
-->
<rect class="paper2 card" x="232" y="24" width="232" height="240" rx="22"/>
<rect class="clay card" x="24" y="-22" width="176" height="232" rx="22"/>
<rect class="sage card" x="248" y="40" width="160" height="112" rx="22"/>
<rect class="ink card" x="216" y="176" width="152" height="120" rx="22"/>
<circle class="sun" cx="420" cy="208" r="20"/>
<rect class="butter tag" x="96" y="222" width="96" height="40" rx="10" transform="rotate(6 144 242)"/>
<path class="wave" d="M24 252 q 8 -8 16 0 t 16 0 t 16 0"/>
<path class="wave" d="M384 112 q 8 -8 16 0 t 16 0 t 16 0 t 16 0"/>
<path class="wave" d="M260 8 q 8 -8 16 0 t 16 0 t 16 0"/>
<path class="wave" d="M392 268 q 8 -8 16 0 t 16 0 t 16 0"/>
</svg>
</div>
<div class="words">
<h1 class="name">Village</h1>
<p class="tag-line">warm cream, terracotta, and a few good stickers.</p>
</div>
</div>
</body>
</html>
`;
