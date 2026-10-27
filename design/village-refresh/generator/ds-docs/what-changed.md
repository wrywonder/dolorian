# What changed

The refresh keeps v1’s identity (cream, terracotta, italic serif, polaroids, stickers, the lip, lowercase voice) and changes how strictly it is applied.

| Area | v1 | Now | Why |
|---|---|---|---|
| Text color | taupe #A0907E for metadata | `ink-3` #766553 | 2.8:1 → 5.1:1 on paper |
| Action color | terracotta #C96442 fill, white text | `clay` #B85735 fill, `terracotta` kept for marks | white text 3.9:1 → 4.7:1; the hue barely moves |
| Card edges | 1px mustard `rule` on everything | no borders; `shadow-card` | the outlines made every screen busy and low-contrast |
| UI face | Plus Jakarta Sans, mostly 800 at 10–13px | Bricolage Grotesque 400–700 | warmer and more characterful at text sizes; no more shouting labels |
| Stamp face | Space Grotesk (not a monospace) | DM Mono | a real date-stamp face for dates, times and eyebrows |
| Type sizes | 26 sizes from 9 to 48 | 12 named styles, 11px floor (stamps only), 13px for anything you must read | consistency and Dynamic Type |
| Serif use | titles, captions, meta, labels, buttons | titles and parents’ words, 21px and up | italic serif at 13px was hard to read |
| Tilt | cards and notes tilted | only stickers tilt | crisp text; the stickers still read as playful |
| Navigation | icon-only pill + floating “+” over content + a “+” in the plans header | dock: pill with a labeled current tab + one contextual create button beside it | the “+” no longer covers content; one create button everywhere |
| Plans controls | three rows | one chip row with an “upcoming ▾” menu chip | more plans on the first screen |
| Plan card | title and description on the photo | photo, then a date tile and the details on the card | legible on any photo |
| Photo post | 300px photo, byline + reactions squeezed into one row | 5:4 photo, caption on the strip, byline and reactions on their own row | no truncated venue names |
| Profile | cover below a cream band, five bordered boxes | edge-to-edge cover, sheet with the avatar overlapping, one stat strip (each stat a link) | fewer boxes, same information |
| Placeholders | diagonal stripes | BlurHash while loading; tone wash when there’s no photo | stripes read as “missing” |
| Dark mode | none (`userInterfaceStyle: light`) | “after bedtime” theme | parents use this at night |

## Self-critique, round by round

**Round 1** (first pass of the four screens)
1. Buzz showed one post above the fold: the square polaroid and a tall nudge pushed the byline under the dock. Photo now 5:4; nudge tightened.
2. Presence-chip avatars were blank colored discs that read as a legend. They show initials now.
3. “SAT · 22M” read as 22 million once uppercased. Stamps spell units out.
4. Avatar stacks clipped initials (“MC IP IG”). Overlap is now 18% with later avatars on top.
5. Plans still had a full-width segmented control plus a chip row. Time range moved into an “upcoming ▾” menu chip; one row.
6. The settings gear read as a sun. Redrawn as a cog.
7. The presence ring made Maya’s avatar larger than the others, misaligning names. The ring now sits inside the 44px footprint.
8. Three gray ellipsis circles added noise to the connection list. Plain ellipsis glyphs with a 44px hit area.
9. Sign-in’s hero was a logo, a word and one lonely photo. It became a small fridge-door cluster: polaroid, emoji sticker, stamp.
10. Casing was inconsistent (“Continue with email” beside “snap one”). The voice rule now covers it.
11. No sparkles were left anywhere, which lost a brand mark. The sparkle came back with one meaning: new for you (the nudge, the request banner).
12. In the dark theme, bright photos glared against the cocoa paper. Photos now sit under a 10% scrim at night (`photo-scrim`).

**Round 2**
13. The floating “+” still sat on the first post’s comment button. It moved into the dock beside the tab pill and became the one create button for every tab.
14. Stacks still clipped where call sites overrode the overlap. Call sites now use the component default.

**Round 3**: checked the four screens, the dark theme and the walkthrough boards again. Fixed on the boards: overlapping type samples, a polaroid overflowing its tile, a “pressed” button still drawn with its lip, motion ticks off scale, misaligned radius swatches, and “eleven styles” where the scale has twelve. Contrast checked for every text pair listed in the color notes.
