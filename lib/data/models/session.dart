class Session {
  final String sessionId;
  final String userId;
  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;
  final bool rememberMe;
  final String deviceInfo;
  final DateTime createdAt;

  const Session({
    required this.sessionId,
    required this.userId,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
    required this.rememberMe,
    required this.deviceInfo,
    required this.createdAt,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      sessionId: json['session_id'] as String,
      userId: json['user_id'] as String,
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
      rememberMe: json['remember_me'] as bool? ?? false,
      deviceInfo: json['device_info'] as String? ?? 'Unknown Device',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'session_id': sessionId,
      'user_id': userId,
      'access_token': accessToken,
      'refresh_token': refreshToken,
      'expires_at': expiresAt.toIso8601String(),
      'remember_me': rememberMe,
      'device_info': deviceInfo,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Create a sanitized version for logging (removes sensitive tokens)
  Map<String, dynamic> toSanitizedJson() {
    return {
      'session_id': sessionId,
      'user_id': userId,
      'expires_at': expiresAt.toIso8601String(),
      'remember_me': rememberMe,
      'device_info': deviceInfo,
      'created_at': createdAt.toIso8601String(),
      'is_expired': isExpired,
      'time_until_expiry': timeUntilExpiry.inMinutes,
    };
  }

  Session copyWith({
    String? sessionId,
    String? userId,
    String? accessToken,
    String? refreshToken,
    DateTime? expiresAt,
    bool? rememberMe,
    String? deviceInfo,
    DateTime? createdAt,
  }) {
    return Session(
      sessionId: sessionId ?? this.sessionId,
      userId: userId ?? this.userId,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      expiresAt: expiresAt ?? this.expiresAt,
      rememberMe: rememberMe ?? this.rememberMe,
      deviceInfo: deviceInfo ?? this.deviceInfo,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Check if the session is expired
  bool get isExpired {
    return DateTime.now().isAfter(expiresAt);
  }

  /// Check if the session will expire soon (within 5 minutes)
  bool get willExpireSoon {
    final now = DateTime.now();
    final warningTime = expiresAt.subtract(const Duration(minutes: 5));
    return now.isAfter(warningTime) && !isExpired;
  }

  /// Get time until expiry
  Duration get timeUntilExpiry {
    final now = DateTime.now();
    if (isExpired) return Duration.zero;
    return expiresAt.difference(now);
  }

  /// Check if the session is valid (not expired and has required tokens)
  bool get isValid {
    return !isExpired && 
           accessToken.isNotEmpty && 
           refreshToken.isNotEmpty &&
           userId.isNotEmpty;
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Session &&
        other.sessionId == sessionId &&
        other.userId == userId &&
        other.accessToken == accessToken &&
        other.refreshToken == refreshToken &&
        other.expiresAt == expiresAt &&
        other.rememberMe == rememberMe &&
        other.deviceInfo == deviceInfo &&
        other.createdAt == createdAt;
  }

  @override
  int get hashCode {
    return Object.hash(
      sessionId,
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      rememberMe,
      deviceInfo,
      createdAt,
    );
  }

  @override
  String toString() {
    return 'Session(sessionId: $sessionId, userId: $userId, '
           'isValid: $isValid, isExpired: $isExpired, rememberMe: $rememberMe)';
  }
}