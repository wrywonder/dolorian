# Village refresh (design proposal)

A refreshed design system for Village, built from the current app's tokens and
components and proposed for review. Nothing under `src/` has changed yet.

- **Design system** (tokens, brand book, 20 components with live previews):
  https://claude.ai/artifact/TZG53SQPVDGrnJ5AJx967E
- **Review canvas** (before/after of buzz, plans, you and sign-in, a dark-theme
  buzz, and an eight-board walkthrough of the system):
  https://claude.ai/artifact/KGmhG6mpVTTsWWgcEnCJZU

## What's here

- `tokens.json`: the proposed tokens (light and "after bedtime" dark), the same
  file the design system publishes.
- `renders/`: the before and after screens as PNGs. "Before" is rendered from
  the current code with the app's own font files; photos are illustrated
  stand-ins, identical in both.
- `generator/`: the source for every mockup, the design system's files and the
  canvas artboards. `lib/old.mjs` ports the current screens value for value;
  `lib/new.mjs` holds the refreshed tokens and components; `lib/walk.mjs` the
  walkthrough boards; `ds-docs/` the brand book text.

## Regenerating

```sh
cd design/village-refresh/generator
./fetch-assets.sh          # fonts from @expo-google-fonts 0.4.1, plus the app icon
node build.mjs             # out/*.html: before/after screens and walkthrough boards
node shot.mjs              # out/png/*.png via the preinstalled Playwright
node ds-build.mjs          # ../ds/project/**: the design system's files
node canvas-build.mjs      # ../canvas/project/**: canvas artboards (font URLs point at the canvas's uploads)
```

`ds-docs/implementing.md` maps every v1 token in `src/lib/constants.ts` to its
new name and lists the components to change, in order.
