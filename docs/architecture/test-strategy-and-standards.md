# Test Strategy and Standards

## Testing Philosophy
- **Approach:** Test-driven development for business logic, test-after for UI components
- **Coverage Goals:** 90%+ for business logic, 70%+ for UI components
- **Test Pyramid:** 70% unit tests, 20% integration tests, 10% end-to-end tests

## Test Types and Organization

### Unit Tests
- **Framework:** test 1.24.0+ with mockito 5.4.0+ for mocking
- **File Convention:** `test/path/to/file_test.dart` mirrors `lib/path/to/file.dart`
- **Location:** `test/` directory with same structure as `lib/`
- **Mocking Library:** mockito for service mocking, fake objects for simple data
- **Coverage Requirement:** 90%+ for service and business logic classes

**AI Agent Requirements:**
- Generate tests for all public methods in services and use cases
- Cover edge cases and error conditions with proper mocking
- Follow AAA pattern (Arrange, Act, Assert) consistently
- Mock all external dependencies (Supabase, VIS API, local storage)

### Integration Tests
- **Scope:** Service integration, cache consistency, background sync workflows
- **Location:** `integration_test/` directory
- **Test Infrastructure:**
  - **Database:** Supabase local development instance
  - **Cache:** In-memory SQLite for test isolation
  - **External APIs:** Mock VIS API with test data fixtures

### End-to-End Tests
- **Framework:** integration_test (Flutter's official E2E framework)
- **Scope:** Critical user journeys (login, tournament search, bookmark management)
- **Environment:** Staging environment with test data
- **Test Data:** Controlled test tournaments and user accounts

## Test Data Management
- **Strategy:** Factory pattern with realistic test data
- **Fixtures:** JSON fixtures in `test/fixtures/` directory
- **Factories:** Builder pattern for creating test entities
- **Cleanup:** Automatic cleanup after each test with proper isolation

## Continuous Testing
- **CI Integration:** Run unit/integration tests on every PR, E2E on staging deployment
- **Performance Tests:** Flutter performance profiling for cache operations
- **Security Tests:** Dependency scanning with GitHub security advisories
