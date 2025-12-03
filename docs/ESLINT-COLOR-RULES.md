# ESLint Color Enforcement Rules

## Overview

Custom ESLint rule `local/no-hardcoded-colors` prevents new hardcoded hex colors from being added to the codebase. This enforces the use of design tokens from the unified token system.

## Rule Configuration

**Location**: `eslint.config.js`

**Severity**: `warn` (allows builds to continue during migration)

**Rule**: `local/no-hardcoded-colors`

## Allowed Exceptions

### Allowed Files (Hardcoded Colors Permitted)
- `**/theme/**` - Theme definition files
- `**/tokens.ts` - Design token definitions
- `**/css-variables.ts` - CSS variable generation
- `**/__tests__/**` - Test files
- `**/*.test.ts` and `**/*.test.tsx` - Test files
- `**/scripts/**` - Build/utility scripts
- `**/eslint-rules/**` - ESLint rule definitions

### Allowed Colors (Universally Permitted)
- `#FFFFFF` / `#FFF` - Pure white (for shadows, overlays, specific UI needs)
- `#000000` / `#000` - Pure black (for shadows only)

**Rationale**: These neutral colors are sometimes needed for technical reasons (shadow calculations, opacity layers) where tokens don't apply.

## How It Works

The rule scans:
1. **String literals**: `color: '#FF0000'`
2. **Template literals**: `` `background: ${color}` ``

And reports any hex color pattern: `#RGB`, `#RRGGBB`, `#RRGGBBAA`

## Usage Examples

### ❌ Bad (Will Trigger Warning)

```typescript
// AppHeader.tsx
<View style={{ backgroundColor: '#1B365D' }}>
  <Text style={{ color: '#666666' }}>Header</Text>
</View>
```

**ESLint Output**:
```
AppHeader.tsx
  82:22  warning  Hardcoded color "#1B365D" found. Use design tokens instead
  84:22  warning  Hardcoded color "#666666" found. Use design tokens instead
```

### ✅ Good (No Warning)

```typescript
import { useTheme } from '../hooks/useTheme';

// AppHeader.tsx
const { brandBlue, neutrals } = useTheme();

<View style={{ backgroundColor: brandBlue[900] }}>
  <Text style={{ color: neutrals.textSecondary }}>Header</Text>
</View>
```

### ✅ Also Good (CSS Variables on Web)

```typescript
<View style={{
  backgroundColor: 'var(--brandBlue-900)',
  color: 'var(--text-secondary)'
}}>
```

## Running ESLint

### Check All Files
```bash
npm run lint
```

### Check Specific File
```bash
npx eslint components/AppHeader.tsx
```

### Auto-fix (Where Possible)
```bash
npx eslint --fix components/**/*.tsx
```

**Note**: This rule does NOT auto-fix. Colors must be manually replaced based on context (see `COLOR-MIGRATION-MATRIX.md`).

## Migration Strategy

During the migration phase:

1. **Rule is set to `warn`** - Allows existing code to build
2. **New code gets warnings** - Developers see feedback in real-time
3. **CI/CD can enforce** - Fail builds with `--max-warnings=0`
4. **After migration complete** - Change to `error` severity

## Upgrading to Error

Once all hardcoded colors are migrated (Definition of Done reached):

```javascript
// eslint.config.js
rules: {
  'local/no-hardcoded-colors': ['error', { // Changed from 'warn'
    allowedFiles: [...],
    allowedColors: [...],
  }],
}
```

## Testing the Rule

### Test in Development
```bash
# Run on a known file with hardcoded colors
npx eslint components/AppHeader.tsx

# Should show warnings for #1B365D and other hardcoded colors
```

### Test Allowed Files
```bash
# Should show NO warnings (theme files are allowed)
npx eslint theme/tokens.ts
npx eslint theme/css-variables.ts
```

### Test Allowed Colors
```bash
# Create test file with #FFFFFF
echo "const shadow = { shadowColor: '#000' }" > test.ts
npx eslint test.ts

# Should show NO warning (pure black is allowed for shadows)
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Lint for hardcoded colors
  run: |
    npm run lint -- --max-warnings=0
    # Fails if any warnings exist
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npx eslint --max-warnings=0 $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
```

## Disabling the Rule (Emergency Only)

If you absolutely must add a hardcoded color:

```typescript
/* eslint-disable-next-line local/no-hardcoded-colors */
const emergencyColor = '#FF0000';
```

**Requirements**:
1. Add a comment explaining WHY it's needed
2. Create a ticket to migrate to tokens
3. Get team approval in PR review

## Maintenance

### Adding Allowed Colors
If a specific color needs to be universally allowed:

```javascript
// eslint.config.js
allowedColors: [
  '#FFFFFF',
  '#000000',
  '#YOUR_NEW_COLOR', // Add with comment explaining why
],
```

### Adding Allowed Files
If a file/directory should be exempt:

```javascript
allowedFiles: [
  '**/theme/**',
  '**/your-exempt-dir/**', // Add pattern
],
```

## References

- ESLint rule: `eslint-rules/no-hardcoded-colors.js`
- Migration guide: `docs/DESIGN-TOKEN-MIGRATION.md`
- Decision matrix: `docs/COLOR-MIGRATION-MATRIX.md`
- Audit report: `color-migration-report.json`
