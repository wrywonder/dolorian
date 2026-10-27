# Bringing it to the app

The app reads every design value from `src/lib/constants.ts`, so most of the refresh lands there first.

## Fonts

- Add `@expo-google-fonts/bricolage-grotesque` (0.4.1, weights 400–700) and `@expo-google-fonts/dm-mono` (500); keep `@expo-google-fonts/instrument-serif`.
- Remove Plus Jakarta Sans and Space Grotesk once no screen uses them.
- `fonts` keys become role names: `display` (InstrumentSerif_400Regular_Italic), `displayRegular`, `text` (BricolageGrotesque_400Regular), `textMedium`, `textSemi`, `textBold`, `stamp` (DMMono_500Medium).
- Export the twelve type styles as `type.hero … type.stamp` objects (fontFamily, fontSize, lineHeight, letterSpacing) and set text with them instead of literal sizes.

## Colors: v1 name → new token

| constants.ts today | New token |
|---|---|
| `cream` | `paper` |
| `surface` | `card` |
| `white` | `polaroid` |
| `dark` | `ink` |
| `brownMid` | `ink-2` |
| `taupe` | `ink-3` |
| `terracotta` (fills, text) | `clay` (fills), `clay-ink` (text) |
| `terracotta` (squiggle, sparkle) | `terracotta` |
| `golden` | `sun` |
| `amberLight` | `butter` |
| `sage` (button) | `sage-fill` |
| `sage` (text) | `sage-ink` |
| `sageSoft` | `sage-wash` |
| `rule` | `line` (dividers only; remove from card borders) |
| #924328 lip | `clay-deep` |
| rgba(201,100,66,.13) | `clay-wash` |

Export colors per theme (`lightColors`, `darkColors`) and read them through a small `useTheme()` hook; set `userInterfaceStyle` in app.json to `automatic` when dark is ready.

## Components touched

- `TerracottaButton` → `Button` with the variants and sizes in the Button guidelines.
- `TabBar`, `FloatingCompose` → `Dock` (one component, contextual create).
- `ScreenHeader`, `EmptyState`, `VisibilityChip` (→ PresenceChip), `TimeStampPill` (→ Stamp), `AvatarCircle` (tone fill + tone ink), `Skeleton` (paper-2 instead of rule).
- `PhotoPostCard`, `QuestionPostCard`, `ShareAfterActivityCard`, `PostEngagementRow`, `ActivityCard`, `SocialProofRow`, `KidsGrid`.
- `src/app/(tabs)/plans.tsx`: replace the segmented control, time tabs and filter panel with the chip row.
- `src/app/(tabs)/you.tsx`: edge-to-edge cover, StatStrip, drop QuickAction tiles.
- Remove `StripePattern` from photo placeholders once tone washes and BlurHash are in.

## Order

1. Tokens and fonts (no visual change beyond color and type).
2. Button, Dock, ScreenHeader.
3. Feed cards, then plan cards, then the profile.
4. Dark theme.
