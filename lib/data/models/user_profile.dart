import 'package:equatable/equatable.dart';

class UserProfile extends Equatable {
  final String userId;
  final String email;
  final String displayName;
  final String refereeLevel;
  final DateTime certificationDate;
  final String region;
  final String? preferredLocation;
  final List<String> preferredCompetitionLevels;
  final String timezone;
  final DateTime lastLoginAt;
  final DateTime createdAt;

  const UserProfile({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.refereeLevel,
    required this.certificationDate,
    required this.region,
    this.preferredLocation,
    required this.preferredCompetitionLevels,
    required this.timezone,
    required this.lastLoginAt,
    required this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['user_id'] as String,
      email: json['email'] as String,
      displayName: json['display_name'] as String,
      refereeLevel: json['referee_level'] as String,
      certificationDate: DateTime.parse(json['certification_date'] as String),
      region: json['region'] as String,
      preferredLocation: json['preferred_location'] as String?,
      preferredCompetitionLevels: List<String>.from(
        json['preferred_competition_levels'] as List? ?? [],
      ),
      timezone: json['timezone'] as String? ?? 'UTC',
      lastLoginAt: DateTime.parse(json['last_login_at'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'email': email,
      'display_name': displayName,
      'referee_level': refereeLevel,
      'certification_date': certificationDate.toIso8601String(),
      'region': region,
      'preferred_location': preferredLocation,
      'preferred_competition_levels': preferredCompetitionLevels,
      'timezone': timezone,
      'last_login_at': lastLoginAt.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? userId,
    String? email,
    String? displayName,
    String? refereeLevel,
    DateTime? certificationDate,
    String? region,
    String? preferredLocation,
    List<String>? preferredCompetitionLevels,
    String? timezone,
    DateTime? lastLoginAt,
    DateTime? createdAt,
  }) {
    return UserProfile(
      userId: userId ?? this.userId,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      refereeLevel: refereeLevel ?? this.refereeLevel,
      certificationDate: certificationDate ?? this.certificationDate,
      region: region ?? this.region,
      preferredLocation: preferredLocation ?? this.preferredLocation,
      preferredCompetitionLevels: preferredCompetitionLevels ?? this.preferredCompetitionLevels,
      timezone: timezone ?? this.timezone,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool get isInternationalReferee => refereeLevel.toLowerCase() == 'international';
  bool get isContinentalReferee => refereeLevel.toLowerCase() == 'continental';
  bool get isNationalReferee => refereeLevel.toLowerCase() == 'national';

  /// Check if the referee certification is still valid (within 4 years)
  bool get isCertificationValid {
    final now = DateTime.now();
    final certExpiry = certificationDate.add(const Duration(days: 365 * 4));
    return now.isBefore(certExpiry);
  }

  /// Get a display-friendly certification status
  String get certificationStatus {
    if (isCertificationValid) {
      return 'Active';
    } else {
      return 'Expired';
    }
  }

  /// Get referee level with proper capitalization
  String get refereeLevelDisplay {
    return refereeLevel.split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is UserProfile &&
        other.userId == userId &&
        other.email == email &&
        other.displayName == displayName &&
        other.refereeLevel == refereeLevel &&
        other.certificationDate == certificationDate &&
        other.region == region &&
        other.preferredLocation == preferredLocation &&
        _listEquals(other.preferredCompetitionLevels, preferredCompetitionLevels) &&
        other.timezone == timezone &&
        other.lastLoginAt == lastLoginAt &&
        other.createdAt == createdAt;
  }

  @override
  int get hashCode {
    return Object.hash(
      userId,
      email,
      displayName,
      refereeLevel,
      certificationDate,
      region,
      preferredLocation,
      Object.hashAll(preferredCompetitionLevels),
      timezone,
      lastLoginAt,
      createdAt,
    );
  }

  @override
  String toString() {
    return 'UserProfile(userId: $userId, email: $email, displayName: $displayName, '
           'refereeLevel: $refereeLevel, region: $region, certificationStatus: $certificationStatus)';
  }

  bool _listEquals<T>(List<T>? a, List<T>? b) {
    if (a == null) return b == null;
    if (b == null || a.length != b.length) return false;
    for (int index = 0; index < a.length; index += 1) {
      if (a[index] != b[index]) return false;
    }
    return true;
  }

  @override
  List<Object?> get props => [
    userId,
    email,
    displayName,
    refereeLevel,
    certificationDate,
    region,
    preferredLocation,
    preferredCompetitionLevels,
    timezone,
    lastLoginAt,
    createdAt,
  ];
}