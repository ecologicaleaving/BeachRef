# BeachRef - Beach Volleyball Referee Assistant

A Flutter web application designed to assist beach volleyball referees with match management, score tracking, and VIS (Volleyball Information System) integration.

## Features

- **Real-time Score Tracking**: Track scores, sets, and match progress
- **Referee Tools**: Timer, substitution tracking, and penalty management
- **VIS Integration**: Seamless integration with the Volleyball Information System
- **Offline Support**: Continue working even with poor connectivity
- **High-Contrast UI**: Optimized for outdoor sunlight visibility

## Technology Stack

- **Framework**: Flutter 3.16.0+ (Web)
- **Language**: Dart 3.2.0+
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **State Management**: flutter_bloc 8.1.0+
- **Navigation**: go_router 12.0.0+
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Flutter SDK 3.16.0 or higher
- Dart 3.2.0 or higher
- Web browser (Chrome recommended for development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd beachref
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Run the application:
   ```bash
   flutter run -d chrome
   ```

### Development Commands

- **Run in debug mode**: `flutter run -d chrome`
- **Build for production**: `flutter build web`
- **Run tests**: `flutter test`
- **Run linting**: `flutter analyze`

### Environment Setup

1. Copy `.env.example` to `.env` and configure your environment variables
2. Set up Supabase project and add your keys to the environment file
3. Configure Google OAuth credentials for authentication

## Project Structure

```
beachref/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── app/                         # App configuration
│   ├── core/                        # Core utilities and constants
│   ├── data/                        # Data layer (models, services, repositories)
│   ├── presentation/                # UI layer (pages, widgets, BLoC)
│   └── shared/                      # Shared utilities
├── test/                            # Unit and widget tests
├── web/                             # Web-specific files
└── docs/                            # Project documentation
```

## Contributing

1. Follow the coding standards defined in `docs/architecture/coding-standards.md`
2. Write tests for new features
3. Ensure all tests pass before submitting PRs
4. Follow the established Git workflow

## Architecture

This project follows Clean Architecture principles with:
- **Presentation Layer**: BLoC pattern for state management
- **Data Layer**: Repository pattern for data access
- **Service Layer**: Business logic and external integrations

For detailed architecture documentation, see `docs/architecture/`.

## Testing

Run the test suite:
```bash
flutter test
```

For coverage reports:
```bash
flutter test --coverage
```

## Deployment

The application is automatically deployed to Vercel on push to the main branch through GitHub Actions.

## License

[Add your license information here]