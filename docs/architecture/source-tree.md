# Source Tree

```
beachref/
├── lib/
│   ├── main.dart                          # App entry point
│   ├── app/
│   │   ├── app.dart                       # Main app configuration
│   │   ├── router.dart                    # Navigation routing
│   │   └── theme.dart                     # App theme and styling
│   ├── core/
│   │   ├── constants/                     # App constants
│   │   ├── errors/                        # Error classes
│   │   ├── network/                       # HTTP client setup
│   │   └── utils/                         # Utility functions
│   ├── data/
│   │   ├── datasources/
│   │   │   ├── local/                     # SQLite & Hive implementations
│   │   │   └── remote/                    # Supabase API clients
│   │   ├── models/                        # Data models
│   │   └── repositories/                  # Repository implementations
│   ├── domain/
│   │   ├── entities/                      # Business entities
│   │   ├── repositories/                  # Repository interfaces
│   │   └── usecases/                      # Business logic use cases
│   ├── presentation/
│   │   ├── bloc/                          # BLoC state management
│   │   ├── pages/                         # UI pages/screens
│   │   ├── widgets/                       # Reusable UI components
│   │   └── utils/                         # UI utilities
│   └── services/
│       ├── auth_service.dart              # Authentication service
│       ├── cache_manager.dart             # Cache management
│       ├── notification_service.dart      # Push notifications
│       ├── sync_coordinator.dart          # Background sync
│       └── vis_integration_service.dart   # VIS API integration
├── web/                                   # Flutter web specific files
├── supabase/
│   ├── functions/                         # Edge functions
│   │   ├── vis-integration/              # VIS API proxy
│   │   └── notification-handler/         # Push notification logic
│   └── migrations/                        # Database migrations
├── test/                                  # Unit and widget tests
├── integration_test/                      # Integration tests
├── pubspec.yaml                          # Dependencies
└── README.md                             # Project documentation
```
