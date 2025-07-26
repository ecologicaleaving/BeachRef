# Data Models

## Tournament
**Purpose:** Core entity representing beach volleyball tournaments from VIS database

**Key Attributes:**
- id: String - Unique VIS tournament identifier
- name: String - Tournament name and title
- location: String - Venue location and address
- startDate: DateTime - Tournament start date/time
- endDate: DateTime - Tournament end date/time  
- competitionLevel: String - Professional level (World Tour, Continental, etc.)
- tournamentType: String - Tournament format (Main Draw, Qualifier, etc.)
- status: String - Current status (Upcoming, Live, Completed)
- teams: List<Team> - Participating teams
- lastUpdated: DateTime - Cache timestamp for sync management

**Relationships:**
- Has many Match entities
- Has many RefereeAssignment entities
- Referenced by UserBookmark entities

## Match
**Purpose:** Individual match within tournaments with results and statistics

**Key Attributes:**
- id: String - Unique VIS match identifier
- tournamentId: String - Parent tournament reference
- matchNumber: int - Match sequence number
- scheduledTime: DateTime - Planned match start time
- actualStartTime: DateTime? - Actual start time if available
- duration: Duration? - Match duration if completed
- court: String - Court assignment
- status: String - Match status (Scheduled, Live, Completed)
- team1: Team - First competing team
- team2: Team - Second competing team
- finalScore: Score? - Final match score if completed
- setScores: List<Score> - Individual set scores
- statistics: MatchStatistics? - Detailed match stats
- lastUpdated: DateTime - Cache sync timestamp

**Relationships:**
- Belongs to Tournament entity
- Has many RefereeAssignment entities
- Referenced by MatchStatistics entity

## RefereeAssignment
**Purpose:** Referee assignments to tournaments and specific matches

**Key Attributes:**
- id: String - Unique assignment identifier
- refereeId: String - FIVB referee identifier
- refereeName: String - Referee full name
- refereeLevel: String - Certification level
- tournamentId: String - Assigned tournament
- matchId: String? - Specific match assignment if applicable
- role: String - Referee role (First Referee, Second Referee, etc.)
- assignmentDate: DateTime - When assignment was made
- status: String - Assignment status (Confirmed, Pending, Cancelled)
- lastUpdated: DateTime - Cache sync timestamp

**Relationships:**
- Belongs to Tournament entity
- Optionally belongs to Match entity
- Referenced by UserProfile for personal assignments

## UserProfile
**Purpose:** Local user data and preferences for personalized experience

**Key Attributes:**
- userId: String - Google Auth user ID
- email: String - User email address
- displayName: String - User display name
- preferredLocation: String? - Default location filter
- preferredCompetitionLevels: List<String> - Favorite competition types
- timezone: String - User timezone for date display
- notificationPreferences: NotificationSettings - Push notification settings
- createdAt: DateTime - Account creation timestamp
- lastLoginAt: DateTime - Last app access time

**Relationships:**
- Has many UserBookmark entities
- Has notification preferences configuration

## UserBookmark
**Purpose:** User's saved tournaments for quick access and priority sync

**Key Attributes:**
- id: String - Unique bookmark identifier
- userId: String - Owner user ID
- tournamentId: String - Bookmarked tournament
- bookmarkedAt: DateTime - When bookmark was created
- notes: String? - User's personal notes about tournament
- reminderEnabled: bool - Whether to send notifications
- syncPriority: int - Priority level for background sync (1-5)

**Relationships:**
- Belongs to UserProfile entity
- References Tournament entity

## CacheMetadata
**Purpose:** Track data freshness and sync status for intelligent caching

**Key Attributes:**
- entityType: String - Type of cached entity (Tournament, Match, etc.)
- entityId: String - Specific entity identifier
- lastSyncAttempt: DateTime - Last background sync attempt
- lastSuccessfulSync: DateTime - Last successful data update
- syncStatus: String - Current sync status (Fresh, Stale, Failed)
- retryCount: int - Failed sync retry attempts
- nextSyncScheduled: DateTime - When next sync is planned
- priority: int - Sync priority based on user behavior

**Relationships:**
- References all cached entities for sync management
