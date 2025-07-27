# Error Handling Architecture

## Error Classification

**Error Types:**
1. **Network Errors:** VIS API connectivity issues
2. **Data Errors:** Invalid or missing tournament data
3. **User Errors:** Invalid filter inputs
4. **System Errors:** Application runtime errors

## Error Handling Strategy

**Frontend Error Handling:**
```typescript
// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React Error Boundary:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            We're experiencing technical difficulties. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

**Backend Error Handling:**
```typescript
// Global Error Handler Middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Application Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err instanceof VISAPIError) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Unable to fetch tournament data',
      retryAfter: 60,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Invalid request',
      message: err.message,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
};
```
