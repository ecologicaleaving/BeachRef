/**
 * Web counterpart of `vectorIconSets.ts` — see the comment there.
 *
 * Every consumer of these three sets renders a text/emoji glyph on web and
 * never mounts the icon font, so exporting inert components here keeps
 * `@expo/vector-icons` (and its 345 KB of glyph maps) out of the web bundle
 * entirely (issue #38). The exports exist so that the `Platform.OS === 'web'`
 * branches in the consumers stay the only difference between platforms.
 */

const NotRenderedOnWeb = (): null => null;

export const Feather = NotRenderedOnWeb;
export const Ionicons = NotRenderedOnWeb;
export const MaterialCommunityIcons = NotRenderedOnWeb;
