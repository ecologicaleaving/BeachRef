# BeachRef Tournament Management - Frontend Specification

## 1. Executive Summary

This document provides a comprehensive front-end specification for the BeachRef tournament management tool, building on our existing MVP foundation. The specification focuses on creating a simple, professional management interface for tournament organizers, emphasizing clean data presentation and efficient workflows over complex visualizations.

### Technology Foundation
- **React 18.2+** with TypeScript 5.0+
- **Vite** for build tooling and development
- **shadcn/ui** component library with Tailwind CSS
- **TanStack Query** for API state management
- **React Router v6** for client-side routing

## 2. Application Architecture

### 2.1 Component Structure

```
src/
├── components/
│   ├── ui/                     # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── calendar.tsx
│   │   ├── popover.tsx
│   │   ├── alert.tsx
│   │   └── ...
│   ├── layout/                 # Layout components
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── tournament/             # Tournament-specific components
│   │   ├── TournamentList.tsx
│   │   ├── TournamentDetail.tsx
│   │   ├── TournamentCard.tsx
│   │   ├── TournamentFilters.tsx
│   │   ├── TournamentHeader.tsx
│   │   ├── TournamentStats.tsx
│   │   ├── CreateTournamentForm.tsx
│   │   └── EditTournamentForm.tsx
│   ├── match/                  # Match-related components
│   │   ├── MatchList.tsx
│   │   ├── MatchCard.tsx
│   │   ├── MatchResults.tsx
│   │   ├── MatchResultsForm.tsx
│   │   └── MatchScheduler.tsx
│   ├── dashboard/              # Dashboard components
│   │   ├── DashboardStats.tsx
│   │   ├── RecentActivity.tsx
│   │   ├── QuickActions.tsx
│   │   └── UpcomingEvents.tsx
│   └── common/                 # Shared utility components
│       ├── DataTable.tsx
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── ConfirmDialog.tsx
│       └── StatusBadge.tsx
├── pages/                      # Page components
│   ├── HomePage.tsx
│   ├── DashboardPage.tsx
│   ├── TournamentsPage.tsx
│   ├── TournamentDetailPage.tsx
│   ├── CreateTournamentPage.tsx
│   ├── EditTournamentPage.tsx
│   └── NotFoundPage.tsx
├── hooks/                      # Custom React hooks
│   ├── useTournaments.ts
│   ├── useTournamentDetail.ts
│   ├── useCreateTournament.ts
│   ├── useUpdateTournament.ts
│   ├── useFilters.ts
│   └── useConfirmDialog.ts
├── services/                   # API service layer
│   ├── api.ts
│   ├── tournament.service.ts
│   ├── match.service.ts
│   └── dashboard.service.ts
├── types/                      # TypeScript type definitions
│   ├── tournament.types.ts
│   ├── match.types.ts
│   ├── dashboard.types.ts
│   └── api.types.ts
└── utils/                      # Utility functions
    ├── date.utils.ts
    ├── format.utils.ts
    ├── validation.utils.ts
    └── constants.ts
```

### 2.2 Page Structure and Routing

```typescript
// App routing structure
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/tournaments" element={<TournamentsPage />} />
  <Route path="/tournaments/create" element={<CreateTournamentPage />} />
  <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
  <Route path="/tournaments/:id/edit" element={<EditTournamentPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

## 3. Core Features and Components

### 3.1 Dashboard Page (Home)

**Purpose**: Provide tournament organizers with an overview of their activities and quick access to key functions.

**Components**:
- `DashboardStats`: Key metrics cards (total tournaments, active tournaments, upcoming matches)
- `RecentActivity`: Timeline of recent tournament/match updates
- `QuickActions`: Buttons for common actions (Create Tournament, Add Results, View Calendar)
- `UpcomingEvents`: List of tournaments and matches in the next 7 days

**Layout**:
```tsx
<div className="dashboard-grid">
  <DashboardStats />
  <QuickActions />
  <RecentActivity />
  <UpcomingEvents />
</div>
```

### 3.2 Tournament Management

#### 3.2.1 Tournament List Page

**Enhanced Features**:
- Professional data table with sorting and pagination
- Advanced filtering (date range, location, status, level)
- Bulk actions (archive, export)
- Create tournament button prominently placed
- Search functionality with debounced input

**Component Specification**:
```tsx
interface TournamentListProps {
  params: TournamentQueryParams;
  onParamsChange: (params: TournamentQueryParams) => void;
}

// Key features:
// - Real-time filtering with visual feedback
// - Loading states with skeleton components
// - Error handling with retry options
// - Mobile-responsive table with horizontal scroll
```

#### 3.2.2 Tournament Creation Flow

**Create Tournament Form**:
- Multi-step form with validation
- Basic info (name, dates, location)
- Tournament settings (level, surface, gender categories)
- Match scheduling options
- Preview before submission

**Form Validation**:
```typescript
interface TournamentFormData {
  name: string;
  startDate: Date;
  endDate: Date;
  location: {
    city: string;
    country: string;
    venue?: string;
  };
  level: Tournament['level'];
  surface: Tournament['surface'];
  gender: Tournament['gender'];
  maxTeams: number;
  registrationDeadline: Date;
}

// Validation rules:
// - Name: required, min 3 chars, max 100 chars
// - Dates: startDate < endDate, must be future dates
// - Location: city and country required
// - Registration deadline: must be before start date
```

#### 3.2.3 Tournament Detail and Editing

**Tournament Detail Page**:
- Tournament information header
- Match schedule table
- Quick stats overview
- Action buttons (Edit, Add Results, Export)

**Edit Tournament Flow**:
- Inline editing for basic information
- Confirmation dialogs for destructive actions
- Change tracking and unsaved changes warning

### 3.3 Match Management

#### 3.3.1 Match Results Entry

**Match Results Form**:
- Simple score entry interface
- Set-by-set score tracking
- Winner determination logic
- Match duration tracking

**Component Design**:
```tsx
interface MatchResultsFormProps {
  match: Match;
  onSubmit: (results: MatchResults) => void;
  onCancel: () => void;
}

// Features:
// - Real-time score validation
// - Auto-calculation of match winner
// - Support for forfeit/walkover scenarios
```

#### 3.3.2 Match Scheduling

**Scheduler Interface**:
- Calendar view for match scheduling
- Drag-and-drop rescheduling
- Court assignment
- Conflict detection

### 3.4 Data Display Components

#### 3.4.1 Enhanced Data Table

**Features**:
- Column sorting with visual indicators
- Advanced filtering with dropdown filters
- Row selection for bulk actions
- Pagination with page size options
- Export functionality (CSV, PDF)
- Mobile-responsive design

**Implementation**:
```tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  selection?: RowSelectionState;
  onSelectionChange?: (selection: RowSelectionState) => void;
}
```

#### 3.4.2 Status Management

**Status Badge System**:
```tsx
interface StatusBadgeProps {
  status: Tournament['status'] | Match['status'];
  variant?: 'default' | 'compact';
}

// Status color mapping:
// - Upcoming: blue
// - Live: green (pulsing animation)
// - Completed: gray
// - Cancelled: red
// - Postponed: orange
```

## 4. User Experience Specifications

### 4.1 Navigation and Information Architecture

**Primary Navigation**:
- Dashboard (home icon)
- Tournaments (trophy icon)
- Calendar View (calendar icon)
- Settings (gear icon)

**Breadcrumb Navigation**:
```
Dashboard > Tournaments > [Tournament Name] > Edit
```

### 4.2 Responsive Design Strategy

**Breakpoints**:
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Mobile Optimizations**:
- Collapsible navigation drawer
- Horizontal scroll for data tables
- Touch-friendly button sizes (minimum 44px)
- Simplified forms with step-by-step progression

### 4.3 Loading and Error States

**Loading States**:
- Skeleton components for data tables
- Spinner for form submissions
- Progressive loading for large datasets

**Error Handling**:
```tsx
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{error: Error}>;
  onError?: (error: Error) => void;
}

// Error types:
// - Network errors: Show retry button
// - Validation errors: Inline field errors
// - API errors: Toast notifications
// - Critical errors: Full page error boundary
```

## 5. Form Design and Validation

### 5.1 Form Components

**Standard Form Elements**:
- Text inputs with validation feedback
- Select dropdowns with search
- Date pickers with range selection
- Number inputs with increment/decrement
- Checkboxes and radio groups

**Form Validation Strategy**:
```typescript
// Using react-hook-form with Zod validation
const tournamentSchema = z.object({
  name: z.string().min(3).max(100),
  startDate: z.date().min(new Date()),
  endDate: z.date(),
  location: z.object({
    city: z.string().min(1),
    country: z.string().min(1),
  }),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});
```

### 5.2 Form UX Patterns

**Progressive Disclosure**:
- Multi-step forms for complex data entry
- Accordion sections for optional fields
- Contextual help and tooltips

**Feedback Mechanisms**:
- Real-time validation
- Success confirmations
- Undo functionality for destructive actions

## 6. Performance and Optimization

### 6.1 Code Splitting Strategy

```typescript
// Route-based code splitting
const TournamentDetailPage = lazy(() => import('@/pages/TournamentDetailPage'));
const CreateTournamentPage = lazy(() => import('@/pages/CreateTournamentPage'));

// Component-level splitting
const AdvancedFilters = lazy(() => import('@/components/tournament/AdvancedFilters'));
```

### 6.2 Data Fetching Optimization

**React Query Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Pagination Strategy**:
- Server-side pagination for large datasets
- Virtual scrolling for match lists
- Prefetching for predictable navigation patterns

## 7. Accessibility Requirements

### 7.1 WCAG AA Compliance

**Keyboard Navigation**:
- Tab order follows logical flow
- All interactive elements accessible via keyboard
- Custom focus indicators for branded components

**Screen Reader Support**:
- Semantic HTML structure
- ARIA labels and descriptions
- Table headers properly associated
- Form labels clearly linked to inputs

**Color and Contrast**:
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 contrast ratio for large text and UI components
- Color not used as sole indicator of status

### 7.2 Accessibility Implementation

```tsx
// Example: Accessible data table
<table role="table" aria-label="Tournament list">
  <thead>
    <tr>
      <th scope="col" aria-sort={sortDirection}>
        Tournament Name
      </th>
    </tr>
  </thead>
  <tbody>
    <tr aria-selected={isSelected}>
      <td role="gridcell">{tournament.name}</td>
    </tr>
  </tbody>
</table>
```

## 8. Testing Strategy

### 8.1 Component Testing

**Unit Tests**:
- Component rendering and behavior
- Form validation logic
- Utility function testing
- Custom hook testing

**Integration Tests**:
- User workflow testing
- API integration testing
- Cross-component communication

### 8.2 Accessibility Testing

**Automated Testing**:
- axe-core integration in test suite
- Lighthouse accessibility audits
- Color contrast validation

**Manual Testing**:
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing
- High contrast mode testing

## 9. Visual Design System

### 9.1 Color Palette

```css
:root {
  /* Primary Colors */
  --primary: 220 90% 56%;      /* FIVB Blue */
  --primary-foreground: 0 0% 98%;

  /* Status Colors */
  --success: 142 76% 36%;      /* Green for completed */
  --warning: 38 92% 50%;       /* Orange for live/pending */
  --destructive: 0 84% 60%;    /* Red for cancelled/error */

  /* Neutral Colors */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 98%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Border and Input */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

### 9.2 Typography Scale

```css
/* Font Sizes */
.text-xs { font-size: 0.75rem; }     /* 12px */
.text-sm { font-size: 0.875rem; }    /* 14px */
.text-base { font-size: 1rem; }      /* 16px */
.text-lg { font-size: 1.125rem; }    /* 18px */
.text-xl { font-size: 1.25rem; }     /* 20px */
.text-2xl { font-size: 1.5rem; }     /* 24px */
.text-3xl { font-size: 1.875rem; }   /* 30px */

/* Font Weights */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

### 9.3 Spacing and Layout

**Spacing Scale** (based on 4px unit):
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

**Component Spacing Guidelines**:
- Form fields: 16px vertical spacing
- Card padding: 24px
- Button padding: 8px horizontal, 12px vertical
- Table cell padding: 12px

## 10. Implementation Guidelines

### 10.1 Development Workflow

**Component Development Process**:
1. Create TypeScript interface for props
2. Implement component with shadcn/ui base components
3. Add comprehensive PropTypes/TypeScript validation
4. Write unit tests with React Testing Library
5. Add Storybook stories for component documentation
6. Accessibility review and testing

### 10.2 Code Quality Standards

**ESLint Configuration**:
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**TypeScript Strict Mode**:
- Enable strict type checking
- No implicit any types
- Proper error handling with Result types

### 10.3 Performance Monitoring

**Core Web Vitals Targets**:
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

**Bundle Size Monitoring**:
- Main bundle: < 200KB gzipped
- Route chunks: < 50KB gzipped each
- Component lazy loading for non-critical paths

## 11. Future Enhancements

### 11.1 Phase 2 Features

**Advanced Tournament Management**:
- Tournament templates and cloning
- Automated bracket generation
- Real-time match updates
- Integration with external scoring systems

**Enhanced Analytics**:
- Tournament performance metrics
- Player statistics tracking
- Historical data analysis
- Export and reporting tools

### 11.2 Technical Improvements

**Progressive Web App Features**:
- Offline data access
- Push notifications for match updates
- App-like installation experience

**Advanced State Management**:
- Zustand or Redux Toolkit for complex state
- Optimistic updates for better UX
- Real-time synchronization with WebSockets

## 12. Conclusion

This specification provides a comprehensive guide for implementing a professional tournament management interface that prioritizes simplicity, usability, and maintainability. The design emphasizes clean data presentation, efficient workflows, and accessibility while maintaining the flexibility to grow with future requirements.

The implementation should focus on delivering a tool that tournament organizers find intuitive and reliable, with careful attention to performance, accessibility, and user experience best practices established by the shadcn/ui design system and modern React development patterns.