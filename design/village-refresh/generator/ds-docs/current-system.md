# Current system (v1)

What the app ships today, extracted from `src/lib/constants.ts` and the values hardcoded in `src/components/**` and `src/app/**` at commit f07a75c. The tokens in this system replace it; this page is the record of where they came from.

## Tokens in constants.ts

| Token | Value | Used for | Contrast note |
|---|---|---|---|
| `cream` | #FBF4E9 | Every screen background | kept as `paper` |
| `surface` | #FFFDF6 | Cards, chips, inputs, tab bar | 1.03:1 against cream, so cards relied on yellow borders |
| `white` | #FFFFFF | Polaroids, sticker edges | kept as `polaroid` |
| `dark` | #2D241B | Primary text | 13.9:1 on cream; kept as `ink` |
| `brownMid` | #6E5E4E | Secondary text, eyebrows | 5.7:1; kept as `ink-2` |
| `taupe` | #A0907E | Metadata, placeholders, idle tab icons, “not now” | **2.8:1 on cream: fails AA** |
| `terracotta` | #C96442 | Buttons, active tab, links, error text | **white on it 3.9:1; as text 3.6:1: fails AA** at the 11–17px sizes used |
| `golden` | #E8A93A | Presence pulse | kept as `sun` |
| `amberLight` | #F5C77E | Sparkles, timestamp stickers | kept as `butter` |
| `sage` | #6B8E5A | Nudge button, “going” | **white on it 3.7:1; sage on sageSoft 2.9:1: fail** |
| `sageSoft` | #DCE7C9 | Nudge card | |
| `rule` | #ECD49A | Borders on nearly every card, chip, input and the tab bar | 1.3:1; a mustard outline everywhere |

Avatar tones: seven light/dark pairs (peach, golden, sage, mauve, slate, rose, butter), drawn as the dark color under the light at 70% with initials in rgba(0,0,0,.55).

Values hardcoded outside constants.ts: #924328 (button lip), #8A6B22 (presence label), #B48C28 (sticker shadow), #C9D9B7 (nudge border), #E5DDD0 (off chip border), #FFF0E6 (calendar time tile), #3C5028 (sage lip), rgba(201,100,66,.13) (tinted terracotta).

## Type

- Instrument Serif Italic: tab titles (38), card titles (26), profile names (40), question bodies (19), photo captions (14), social-proof labels (12.5–13.5), empty states, “not now”.
- Instrument Serif Regular: profile name on You (34), section titles (27), month and day titles (22–23), stats (24).
- Plus Jakarta Sans 400–800, mostly 800 at 10–13px for labels and buttons.
- Space Grotesk 500/700 as the “mono”: eyebrows at 9–11px, timestamps at 10.5px.
- Sizes found: 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 17, 18, 19, 19.5, 22, 23, 24, 26, 27, 34, 38, 40, 48. Ten of them are below 12px.

## Spacing and radius

- constants.ts: spacing 4, 8, 14, 18, 24, 32; radii 4, 8, 14, 22, 28, pill.
- In use: gutters of 14, 16 and 18 on different tabs; paddings of 9, 11, 13 and 15; radii of 6, 10, 12, 13, 15, 16, 17, 20 and 24 alongside the tokens.

## Motifs (all kept)

Squiggle under titles, twinkling 4-point sparkles (title, active tab, compose button, presence chip, sign-in), hand-drawn arrow, dotted underline, diagonal stripe photo placeholders, polaroid photo posts, rotated date stickers, tape on nudges, speech-bubble questions, emoji stickers overhanging plan cards, the tilted floating “+” that bobs, the floating icon-only tab bar with a terracotta active circle, the 3px hard lip under buttons, lowercase voice.

## What the screens showed

Rendered from the code with the app’s own font files:

- **Buzz**: the nudge’s “?” wraps onto a line by itself (the underlined activity name is a separate view inside a wrapping row). The photo byline truncates to “Maya · Cesar Chavez P…” because reactions share its row. The floating “+” covers the first post’s reactions. Four sparkles on one screen.
- **Plans**: three rows of controls (List/Calendar + find & sort, Upcoming/Recent, then the hidden filter panel). Plan titles and descriptions sit on the photo behind a gradient, so legibility depends on the photo. Cards are tilted −0.8° and 0.6°.
- **You**: the cover starts below a cream band instead of running under the status bar. Stats, quick actions and the connection list are five separately bordered boxes. Stat labels are 9.5px taupe.
- **Sign-in**: clear and calm; button and label casing mixes “continue with email →” with “EMAIL ADDRESS”.
