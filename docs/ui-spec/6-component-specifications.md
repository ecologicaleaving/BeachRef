# 6. Component Specifications

## Data Tables
- **Technology**: shadcn/ui Data Table component with TanStack Table
- **Features**: Sortable columns, filtering, pagination, row selection, responsive design, loading states
- **Styling**: Clean borders, alternating row colors, hover states
- **Mobile**: Horizontal scroll with sticky first column
- **Advanced**: Built-in support for complex data operations and virtualization

## Search/Filter Components
- **Technology**: shadcn/ui Input, Select, Date Picker, Command (for advanced search)
- **Date Filtering**: Date Range Picker (community extension) or dual Date Picker for tournament date ranges
- **Behavior**: Real-time filtering with debounced search
- **States**: Default, focused, error, disabled
- **Accessibility**: Proper labels, keyboard navigation, ARIA support

## Navigation
- **Primary**: Breadcrumb navigation using shadcn/ui
- **Secondary**: Contextual "Back to Tournament" links
- **Mobile**: Hamburger menu for secondary navigation

## Component Groups by Page Type

### Tournament List Page Stack
- **Data Display**: Data Table + Skeleton (loading) + Pagination
- **Filtering**: Input + Select + Date Picker + Command + Button
- **Feedback**: Alert (API errors) + Badge (status indicators)
- **Layout**: Card (mobile tournament cards)

### Tournament Detail Page Stack
- **Navigation**: Breadcrumb + Button (back/forward)
- **Information**: Card (tournament header) + Badge (status)
- **Data Display**: Data Table (match schedule) + Skeleton
- **Actions**: Button (view match details)

### Match Detail Page Stack
- **Navigation**: Breadcrumb + Button (match navigation)
- **Information**: Card (match header, referee panel, statistics)
- **Feedback**: Alert (missing data states) + Badge (match status)
- **Layout**: Separator (content sections)

## Specific Component Implementations

### Status Indicators
- **Component**: Badge
- **Variants**: 
  - `default` for upcoming tournaments/matches
  - `secondary` for completed
  - `destructive` for cancelled
  - Custom variant for live (orange)

### Loading States
- **Component**: Skeleton
- **Usage**: Mimic layout of data tables and cards during API calls
- **Performance**: Support <3 second loading target

### Error Handling
- **Component**: Alert
- **Variants**: `destructive` for API failures
- **Content**: Clear messaging with retry actions

### Data Actions
- **Component**: Button
- **Variants**: `default` for primary actions, `outline` for secondary
- **Accessibility**: Proper ARIA labels for screen readers
