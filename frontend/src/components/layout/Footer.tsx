export function Footer() {
  return (
    <footer className="bg-muted border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <p>&copy; 2025 VisConnect. Tournament data provided by VIS API.</p>
          </div>
          <div className="text-sm text-muted-foreground text-center sm:text-right">
            <p>Powered by FIVB Volleyball Information System</p>
          </div>
        </div>
      </div>
    </footer>
  );
}