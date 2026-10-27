Village is an app for parents to find their people and make plans: a feed (buzz), live presence (IRL), plans, and profiles. It should feel like the family fridge door: warm, a little handmade, covered in photos, notes and stickers, but tidy enough that you can find Saturday’s soccer time at a glance. This system keeps v1’s cream, terracotta, italic serif and stickers, and puts them on a stricter grid: one type scale, accessible color, borderless cards, capsule controls, and playful pieces used where they mean something.

## Principles

1. **Warm before clever.** Cream paper, soft cards, people’s own colors. Nothing cold, nothing corporate.
2. **Play is pinned on, not baked in.** Stickers, stamps, tape and emoji tilt; cards, lists and text blocks stay square. The layout is calm so the stickers can be fun.
3. **Serif is the voice; sans is the information.** Instrument Serif Italic for titles and the things parents say. Bricolage Grotesque for everything you read to get something done.
4. **One flourish per screen.** One squiggle (under the title), at most one resting sparkle, one primary clay action.
5. **Legible first.** Every text pair passes WCAG AA in both themes; every tap target is at least 44px.

## Voice

- Lowercase for short UI strings: titles, buttons, chips, labels, tabs (“buzz”, “snap one”, “not now”, “edit profile”, “see all 12”). Proper nouns and the pronoun I keep their capitals (“I’m in”, “Cesar Chavez Park”). Platform strings keep their own casing (“Continue with Apple”).
- Sentence case for anything that is a full sentence: prompts, helper text, errors, empty-state bodies (“Share a moment from saturday soccer?”, “No password. We’ll email you an 8-digit code.”).
- Talk to the parent as “you”; their connections are “your village”. Name people, not counts, when you can: “Priya is interested”, “2 parents want to connect”.
- Warm, short, never apologetic: “your village hasn’t said hi yet”, “make the first plan”, “be the first”. Errors say what happened and what to do: “That code expired. Send a new one.”
- Emoji are content: an activity’s emoji, a venue’s emoji, the reaction a post’s author picked. The one system emoji is the ✋ on question tags. Never use emoji as icons or section markers.
- Stamps are uppercase, so write units out: “sat · 22 min”, not “22m”.

## Color

Light is the default; “after bedtime” is the dark theme. Use roles, never raw hex.

- **Grounds**: `paper` for screens, `card` for raised cards and sheets, `paper-2` for sunken tracks and secondary buttons, `polaroid` for photo paper and sticker edges.
- **Text**: `ink` for primary, `ink-2` for secondary, `ink-3` for metadata and idle icons. All three pass 4.5:1 on paper, paper-2 and card in both themes. v1’s taupe (#A0907E, 2.8:1) is retired.
- **Action**: `clay` is the only action fill (primary buttons, the create button, the current tab, request banners), with `on-clay` text and the `lip-clay` shadow. Clay as text is `clay-ink`; tinted grounds are `clay-wash`. `terracotta` is the brand hue for marks only (squiggle, illustration), never text.
- **Live**: `sun` means someone is out right now (the pulse dot, presence rings). Its text is `sun-ink` on `sun-wash`. `butter` is the sticker fill for date stamps; ink sits on it.
- **Yes**: `sage-wash` is the nudge note; `sage-fill` with `on-sage` is the nudge action; `sage-ink` says “going”.
- **Danger**: `danger` text on `card` or `danger-wash`, always with an icon or the word.
- **People**: each parent has a tone (`tone-peach`, `tone-golden`, `tone-sage`, `tone-mauve`, `tone-slate`, `tone-rose`, `tone-butter`) with a matching `-ink` for initials. Tones are the same in both themes.
- **Focus**: `focus` (clay), 2px solid with a 3px offset, on every surface.

In the dark theme clay brightens, so `on-clay` flips to night ink; photos sit under `photo-scrim`; butter stamps stay butter.

## Type

Three families, twelve styles. Set text with the named styles, never ad-hoc sizes (v1 used 26 sizes between 9 and 48px).

- **Voice** (Instrument Serif Italic): `hero` 64 (the sign-in wordmark), `display` 40 (tab titles), `title1` 32 (profile names; 36 on the profile header), `title2` 26 (plan names, section titles), `title3` 21 (captions, questions at 22, nudge prompts). Never below 21px; never for metadata.
- **Interface** (Bricolage Grotesque 400–700): `headline` 16/600 (names), `body` 16/400, `callout` 15/500, `subhead` 14/600 (M buttons, chips, counts), `footnote` 13/500 (metadata, helper text; the floor for anything a parent must read), `caption` 12/600 (labels on photos and badges only).
- **Stamp** (DM Mono 500, uppercase, +0.06em): `stamp` 11 for eyebrows, date stickers, the date tile and counts like “2 PLANS”.
- Numbers that line up (stats, dates) use tabular figures; big numbers use Instrument Serif regular, not italic.
- Weights: 800 is retired; 700 only for button labels and initials.

## Shape, space and elevation

- Screen gutter `space-5` (20px); card padding `space-4`; feed and section gaps `space-6`.
- Corners: `radius-lg` (22) for cards and lists, `radius-xl` (30) for sheets, `radius-md` (16) for inputs and tiles, `radius-sm` (10) for stamps, `radius-xs` (6) for the photo inside a polaroid. Every control is a capsule (`radius-pill`). Use continuous corners on iOS.
- Cards have no borders. Separate them with `shadow-card` and space; use `line` only for dividers inside a card.
- `shadow-float` for the dock and sheets; `shadow-sticker` for stamps, stickers and tiles.
- **The lip**: clay and sage fills that you press sit on a hard 3px shadow (`lip-clay`, `lip-sage`; `lip-clay-s` for small ones). Pressing moves the button down 2px and drops the lip. This is v1’s “stacked” button, kept and made consistent.

## The playful kit

Each piece has a job. If it isn’t doing that job, leave it out.

- **Squiggle**: under the tab title, once per screen. Draws on in 420ms the first time a tab appears.
- **Sparkle**: “new for you”. A fresh nudge, a connection request, the burst after you RSVP (three sparkles in clay, butter and sage, 500ms). One resting sparkle per screen at most.
- **Stamp**: dates and times stuck on photos and plans. Tilted 4–6°.
- **Emoji sticker**: a plan’s emoji on a white puck, overhanging the card’s corner, tilted 8–10°.
- **Polaroid**: photo posts and kids’ photos. 5:4 photo, the caption written on the strip in `title3`.
- **Tape**: pins a nudge note. Nowhere else.
- **Speech bubble**: question and text posts. The only card with a tail.
- **Date tile**: the tear-off calendar square on plan cards: weekday stamp over the date in serif.
- **Tilt**: only stickers rotate. v1 tilted whole cards (−0.8°, 0.6°) and notes (−0.6°); those now stay square.

## Imagery

- User photos appear in polaroids (5:4), plan cards (176px band) and profile covers. Crop to fill; never letterbox.
- While a photo loads, show its BlurHash or ThumbHash through expo-image’s `placeholder`, fading in over 200ms.
- With no photo at all, use the subject’s tone as a flat wash (a plan’s tone, a kid’s tone); the emoji sticker carries the picture. This replaces v1’s diagonal stripe placeholders, which read as “broken image” once real photos arrived.
- Text never sits on a photo except short labels on glass chips (audience, settings).

## Motion

- Press: scale 0.96 or a 2px drop for lipped buttons; spring back (damping 14, stiffness 240).
- Tabs: the dock’s clay capsule slides to the new tab (damping 18, stiffness 260); screens cross-fade with a 6px rise over 180ms.
- Stickers land with a slap: scale 1.15 → 1 and a few degrees of overshoot (damping 12, stiffness 260).
- Live things loop: the presence pulse (2.2s), a twinkling sparkle (2.6s). Nothing else loops.
- Haptics: selection for chips, tabs and reactions; light impact for buttons; medium for create and RSVP; success notification when you’re going.
- With Reduce Motion on, drop loops and slides; keep cross-fades.

## Layout

- Each tab: header (stamp eyebrow, display title, squiggle, up to two 44px controls on the right), content in a single column at the 20px gutter, the dock fixed 28px above the home indicator. Scrolling content ends with 140px of padding so the last card clears the dock.
- Covers and photos may run edge to edge under the status bar (the profile cover does); everything else starts below it.
- Group long lists under headings in people’s terms (“this weekend”) instead of decorating each item.

## Iconography

- The custom SF-style set in `src/components/ui/Icon.tsx`: 24px grid, round caps and joins, stroke 2 at 24px (v1 used 1.8). Outline icons are idle; `.fill` variants mark the current tab only.
- Added in this version: `cog` (settings; v1’s gear read as a sun), `list`, `check`, `sliders`.
- Icons take one color: `ink` by default, `ink-3` when idle, `on-clay` on clay. The files in assets/Icons are single-ink copies in `ink` (#2D241B).

## Accessibility

- Contrast: see each color’s note; the pairs listed there are the only approved pairs.
- Touch targets 44px minimum; small buttons and pills pad their hit area.
- Dynamic Type: interface styles scale with the system setting; voice styles cap at 1.3×.
- Every icon-only control has a label; the create button’s label follows the tab (“New post”, “New plan”).
- Presence is never color alone: the chip says “out & about” or “off the map”.
