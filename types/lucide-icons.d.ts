/**
 * Type declarations for lucide-react-native deep icon imports.
 *
 * We import individual icons via their subpath (e.g.
 * `lucide-react-native/dist/esm/icons/calendar`) instead of the package
 * barrel to avoid pulling all ~3200 named exports into the web bundle
 * (see issue #32). The package does not ship per-icon `.d.ts` files, so
 * we declare the module shape here.
 */
declare module 'lucide-react-native/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';
  const Icon: LucideIcon;
  export default Icon;
}
