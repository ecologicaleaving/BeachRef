# Coding Standards

## Core Standards
- **Languages & Runtimes:** Dart 3.2.0+, Flutter 3.16.0+
- **Style & Linting:** flutter_lints 3.0.0+ with custom rules
- **Test Organization:** `test/` mirrors `lib/` structure, `_test.dart` suffix

## Critical Rules
- **Never use print() in production:** Use logger service for all output
- **All API responses must use Result<T, Error>:** Consistent error handling pattern
- **Database operations must use repository pattern:** Never direct Supabase calls from UI
- **Background tasks must respect rate limits:** All VIS calls through coordinated sync service
- **Sensitive data must never be logged:** Strip PII and tokens from all log output
