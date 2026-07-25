/**
 * The three `@expo/vector-icons` sets this app actually uses, imported one by
 * one instead of through the package barrel.
 *
 * Two problems are solved here (issue #38):
 *
 * 1. `import { Feather } from '@expo/vector-icons'` pulls the package index,
 *    and the index imports **every** icon set. Each set carries a glyph map —
 *    a JSON object with one entry per icon — and those maps were 345 KB of the
 *    2.7 MB web entry chunk: MaterialCommunityIcons 164 KB, FontAwesome5 49 KB,
 *    MaterialIcons 46 KB, Ionicons 30 KB, FontAwesome5 brands 28 KB,
 *    FontAwesome 27 KB, for three sets ever referenced.
 * 2. On web none of the three sets is ever rendered: `Icon.tsx`,
 *    `FeatherIcons.tsx` and `MaterialCommunityIcons.tsx` all branch on
 *    `Platform.OS === 'web'` and draw a text/emoji glyph instead, precisely to
 *    avoid the icon-font load. `vectorIconSets.web.ts` therefore exports inert
 *    components and the fonts never enter the web bundle at all.
 *
 * If a component ever needs to render a real vector icon on web, import the set
 * directly there — do not re-point this module at the barrel.
 */

export { default as Feather } from '@expo/vector-icons/Feather';
export { default as Ionicons } from '@expo/vector-icons/Ionicons';
export { default as MaterialCommunityIcons } from '@expo/vector-icons/MaterialCommunityIcons';
