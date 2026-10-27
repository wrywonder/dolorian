// @font-face for the exact TTFs the app ships (expo-google-fonts 0.4.1).
const F = [
  ['Instrument Serif', 'InstrumentSerif_400Regular', 400, 'normal'],
  ['Instrument Serif', 'InstrumentSerif_400Regular_Italic', 400, 'italic'],
  ...[400, 500, 600, 700, 800].map((w) => ['Plus Jakarta Sans', `PlusJakartaSans_${w}${{ 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' }[w]}`, w, 'normal']),
  ['Space Grotesk', 'SpaceGrotesk_500Medium', 500, 'normal'],
  ['Space Grotesk', 'SpaceGrotesk_700Bold', 700, 'normal'],
  ...[400, 500, 600, 700, 800].map((w) => ['Bricolage Grotesque', `BricolageGrotesque_${w}${{ 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' }[w]}`, w, 'normal']),
  ['DM Mono', 'DMMono_400Regular', 400, 'normal'],
  ['DM Mono', 'DMMono_500Medium', 500, 'normal'],
];
export const FONT_FILES = F.map(([, file]) => `${file}.ttf`);
export function fontFaces(urlFor = (f) => `../fonts/${f}.ttf`) {
  return F.map(([fam, file, w, style]) => `@font-face{font-family:'${fam}';src:url('${urlFor(file)}') format('truetype');font-weight:${w};font-style:${style};font-display:block}`).join('\n');
}
