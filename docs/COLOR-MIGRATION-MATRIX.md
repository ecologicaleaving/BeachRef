# Color Migration Matrix

> **Purpose**: Manual decision guide for mapping ~130 hardcoded colors to ~20-25 design tokens based on CONTEXT, not color similarity.

## Summary Statistics

- **Total hardcoded colors**: 1,737 occurrences
- **Unique colors**: 131 different hex values
- **Target tokens**: ~20-25 semantic tokens
- **Files affected**: 186 component files

## Migration Principle

**CRITICAL**: Map colors based on WHERE they're used (context), not what they look like (color similarity).

Example: Multiple blues (#1B365D, #173D77, #0B2545) → ONE `brandBlue[X]` token based on usage (header vs title vs border).

---

## Top 20 Colors by Frequency

### 1. `#FFFFFF` (252 occurrences) ✅ MAPPED
**Suggested token**: `neutrals.bgPage` OR `neutrals.bgSurface`
**Decision rule**:
- Use `bgPage` for main page backgrounds
- Use `bgSurface` for card/panel backgrounds
- Check context in each file

### 2. `#6B7280` (158 occurrences) - Gray-500
**Context analysis needed**:
- **IF** used for secondary text → `neutrals.textSecondary`
- **IF** used for disabled states → `neutrals.textSecondary` (with opacity)
- **IF** used for borders → `neutrals.borderSubtle`

**Top files**: `MatchCard.tsx` (multiple uses)

### 3. `#1B365D` (122 occurrences) - Dark Blue
**Context analysis needed**:
- **IF** used in Header/Footer → `brandBlue[900]`
- **IF** used for primary titles → `brandBlue[700]`
- **IF** fallback for missing tokens → Replace with appropriate brand blue

**Top files**: `AppHeader.tsx`, `EnhancedCurrentAssignmentCard.tsx`

### 4. `#000000` (91 occurrences) - Pure Black
**Context analysis needed**:
- **IF** used for text → `neutrals.textPrimary` (use #0D1A2B instead)
- **IF** used for shadows → Keep as `rgba(0,0,0,opacity)` or use shadow tokens
- **IF** used for borders → `neutrals.textPrimary` or `borderSubtle`

**Note**: Avoid pure black on white (harsh contrast). Use `textPrimary` instead.

### 5. `#666666` (88 occurrences) - Dark Gray
**Context analysis needed**:
- **IF** secondary text → `neutrals.textSecondary`
- **IF** disabled elements → `neutrals.textSecondary` with opacity
- **IF** icons → `neutrals.textSecondary`

### 6. `#E5E7EB` (78 occurrences) - Light Gray
**Context analysis needed**:
- **IF** card borders → `neutrals.borderSubtle`
- **IF** dividers → `neutrals.borderSubtle`
- **IF** disabled backgrounds → `neutrals.bgSurface`

### 7. `#333333` (72 occurrences) - Very Dark Gray
**Context analysis needed**:
- **IF** primary text → `neutrals.textPrimary`
- **IF** heavy emphasis → `neutrals.textPrimary`

### 8. `#374151` (62 occurrences) - Slate-700
**Context analysis needed**:
- **IF** secondary text → `neutrals.textSecondary`
- **IF** borders on dark backgrounds → `neutrals.borderSubtle`

### 9. `#F3F4F6` (51 occurrences) - Very Light Gray
**Context analysis needed**:
- **IF** card backgrounds → `neutrals.bgSurface`
- **IF** panel backgrounds → `neutrals.bgSurface`
- **IF** hover states → `cardTokens.backgroundHover`

### 10. `#FF9800` (42 occurrences) - Orange (Analytics)
**Context analysis needed**:
- **IF** "good" status indicator → Keep as custom color OR create `alertTokens.warning`
- **IF** cached data indicator → Custom analytics color
- **Note**: This is analytics-specific, may stay as magic number

### 11. `#4CAF50` (39 occurrences) - Green (Status)
**Context analysis needed**:
- **IF** "excellent/success" status → `badgeColors.completed.text` (#027A48)
- **IF** live indicator (green) → `badgeColors.completed.text`
- **IF** male gender indicator → Custom (or new token)

### 12. `#3B82F6` (32 occurrences) - Blue-500
**Context analysis needed**:
- **IF** toggle switches → `brandBlue[500]`
- **IF** active elements → `brandBlue[500]` or `brandBlue[600]`
- **IF** links → `linkTokens.default`

### 13. `#FF6B35` (32 occurrences) - Coral/Orange (Brand?)
**Context analysis needed**:
- **IF** primary brand color (legacy) → `brandBlue[500]`
- **IF** accent color → `brandBlue[600]`
- **Note**: Check if this is old brand color to be replaced

### 14. `#F44336` (30 occurrences) - Red (Error/Slow)
**Context analysis needed**:
- **IF** error state → `badgeColors.live.text` OR `alertTokens.error.text`
- **IF** slow performance indicator → Custom analytics color
- **IF** delete/destructive action → `buttonTokens.destructive.text`

### 15. `#F5F5F5` (28 occurrences) - Off-white
**Context analysis needed**:
- **IF** card backgrounds → `neutrals.bgSurface`
- **IF** panel backgrounds → `neutrals.bgSurface`

### 16. `#9CA3AF` (28 occurrences) - Gray-400
**Context analysis needed**:
- **IF** secondary text → `neutrals.textSecondary`
- **IF** placeholder text → `neutrals.textSecondary`

### 17. `#E0E0E0` (26 occurrences) - Light Gray Border
**Context analysis needed**:
- **IF** borders → `neutrals.borderSubtle`
- **IF** dividers → `neutrals.borderSubtle`

### 18. `#111827` (25 occurrences) - Almost Black
**Context analysis needed**:
- **IF** primary text → `neutrals.textPrimary`
- **IF** headings → `neutrals.textPrimary`

### 19. `#F9FAFB` (25 occurrences) - Very Light Blue-Gray
**Context analysis needed**:
- **IF** card backgrounds → `neutrals.bgSurface`
- **IF** subtle backgrounds → `neutrals.bgSurface`

### 20. `#D1D5DB` (24 occurrences) - Gray-300
**Context analysis needed**:
- **IF** inactive toggle → Keep as is (toggle specific)
- **IF** borders → `neutrals.borderSubtle`

---

## Special Case Colors

### LIVE Status Colors
- `#DC2626` (17×) → `badgeColors.live.text`
- `#EF4444` (9×) → `badgeColors.live.dot` ✅ MAPPED
- `#FEE4E2` (3×) → `badgeColors.live.background`
- `#FEF2F2` (5×) → `badgeColors.live.background`

### Scheduled Status Colors
- `#2563EB` (6×) → `badgeColors.scheduled.text` OR `brandBlue[600]`
- `#1E40AF` (5×) → `brandBlue[600]` (darker blue for borders)
- `#EFF6FF` (8×) → `badgeColors.scheduled.background`
- `#E9F2FF` → Already mapped

### Completed/Success Colors
- `#059669` (4×) → `badgeColors.completed.text`
- `#10B981` (15×) → Consider mapping to `badgeColors.completed.text`
- `#F0FDF4` (7×) → `badgeColors.completed.background`
- `#EAF7F0` → Already mapped

### Warning/Alert Colors
- `#F59E0B` (15×) - Amber for qualifications → `alertTokens.warning.text` OR new token
- `#FEF3C7` (4×) - Light amber → `alertTokens.warning.background` OR custom
- `#92400E` (2×) - Dark amber → `alertTokens.warning.text`

### Button Colors
- `#0066CC` (18×) - Old blue button → `buttonTokens.primary.background`
- `#007AFF` (15×) - iOS blue → `brandBlue[500]` or `linkTokens.default`

### Link Colors
- `#2196F3` (18×) - Light blue links → `linkTokens.default` OR `brandBlue[500]`

---

## Context-Based Decision Matrix

### When reviewing a color occurrence:

1. **Identify the component context**:
   - Is it in a Header/Footer?
   - Is it text (primary/secondary)?
   - Is it a border or divider?
   - Is it a button or link?
   - Is it a status indicator?

2. **Apply the mapping rule**:

| Context | Token |
|---------|-------|
| Header/Footer background | `brandBlue[900]` |
| Primary title/heading | `brandBlue[700]` or `textPrimary` |
| Active card border | `brandBlue[600]` or `cardTokens.borderActive` |
| Primary button | `buttonTokens.primary.background` |
| Link default | `linkTokens.default` |
| Link hover | `linkTokens.hover` |
| Primary text | `neutrals.textPrimary` |
| Secondary text | `neutrals.textSecondary` |
| Page background | `neutrals.bgPage` |
| Card background | `neutrals.bgSurface` |
| Border/divider | `neutrals.borderSubtle` |
| LIVE badge | `badgeColors.live.*` |
| Scheduled badge | `badgeColors.scheduled.*` |
| Completed badge | `badgeColors.completed.*` |
| Error/destructive | `buttonTokens.destructive.*` or `alertTokens.error.*` |
| Warning | `alertTokens.warning.*` |
| Focus ring | `focusRing.color` |

3. **Document your decision**:
   - Add to migration tracking spreadsheet
   - Note the file, line, context, and chosen token
   - If uncertain, flag for team review

---

## Migration Workflow

### Phase 1: Surfaces & Borders (20-40 occurrences per PR)

**Priority colors**:
- `#FFFFFF` → `bgPage` or `bgSurface` (check context)
- `#F7FAFE` → `bgSurface` ✅ Already in palette
- `#E3ECF7` → `borderSubtle` ✅ Already in palette
- `#F5F5F5` → `bgSurface`
- `#F3F4F6` → `bgSurface`
- `#E5E7EB` → `borderSubtle`
- `#E0E0E0` → `borderSubtle`

**Start with**: `MatchCard.tsx`, `TournamentCard.tsx` (high frequency files)

### Phase 2: Text Colors

**Priority colors**:
- `#000000` → `textPrimary` (avoid pure black)
- `#0D1A2B` → Already in palette ✅
- `#333333` → `textPrimary`
- `#111827` → `textPrimary`
- `#5F6E86` → `textSecondary` ✅ Already in palette
- `#666666` → `textSecondary`
- `#6B7280` → `textSecondary`
- `#9CA3AF` → `textSecondary`

### Phase 3: Links & Focus

**Priority colors**:
- `#2D79D8` → `linkTokens.default` ✅ Already in palette
- `#2196F3` → `linkTokens.default`
- `#007AFF` → `linkTokens.default`
- `#3B82F6` → `linkTokens.default`
- `#7DBAF8` → `focusRing.color` ✅ Already in palette

### Phase 4: Buttons

**Priority colors**:
- `#0066CC` → `buttonTokens.primary.background`
- `#1F5AA6` → `buttonTokens.primary.backgroundHover` ✅ Already in palette

### Phase 5: Badges & States

**Priority colors**:
- LIVE: `#DC2626`, `#FEE4E2`, `#EF4444`
- Scheduled: `#2563EB`, `#EFF6FF`, `#1E40AF`
- Completed: `#059669`, `#10B981`, `#F0FDF4`

### Phase 6: Alerts & Messages

**Priority colors**:
- Warning: `#F59E0B`, `#FEF3C7`, `#92400E`
- Error: `#F44336`, `#DC2626`, `#FEF2F2`

---

## Migration Checklist (Per Color)

- [ ] Identify all occurrences of the color in the audit report
- [ ] Review first 3-5 occurrences to understand context
- [ ] Decide on appropriate semantic token based on usage
- [ ] Create PR with 20-40 replacements
- [ ] Include before/after screenshots
- [ ] Verify AA contrast compliance
- [ ] Update this matrix with final decision
- [ ] Commit changes

---

## Notes for Unmapped Analytics Colors

Some colors may remain hardcoded if they're:
1. **Analytics-specific** performance indicators (green/amber/red)
2. **Gender indicators** (blue/pink) - may need new semantic tokens
3. **Third-party component** requirements (can't easily change)
4. **Temporary debug** colors (to be removed entirely)

Flag these for later review or custom token creation.

---

## Reference

Full audit report: `color-migration-report.json`
Design guide: `DESIGN-TOKEN-INTEGRATION-GUIDE.md`
Migration guide: `DESIGN-TOKEN-MIGRATION.md`
