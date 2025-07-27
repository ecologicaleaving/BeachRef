# Accessibility Architecture

## WCAG 2.1 AA Compliance

**Implementation Strategy:**
- shadcn/ui components with built-in accessibility
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support

**Accessibility Features:**
```typescript
// Example accessible component structure
const TournamentTable = () => {
  return (
    <Table>
      <TableCaption>FIVB Beach Volleyball Tournaments</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Tournament Name</TableHead>
          <TableHead scope="col">Dates</TableHead>
          <TableHead scope="col">Location</TableHead>
          <TableHead scope="col">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tournaments.map((tournament) => (
          <TableRow key={tournament.id}>
            <TableCell>
              <Link 
                to={`/tournaments/${tournament.id}`}
                aria-label={`View details for ${tournament.name}`}
              >
                {tournament.name}
              </Link>
            </TableCell>
            {/* ... other cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

**Color and Contrast:**
- High contrast mode support
- Color-blind friendly color palette
- Focus indicators with sufficient contrast
