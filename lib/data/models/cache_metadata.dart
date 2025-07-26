class CacheMetadata {
  final String key;
  final DateTime lastSync;
  final DateTime expiresAt;
  final int retryCount;
  final bool isValid;
  final String? errorDetails;

  const CacheMetadata({
    required this.key,
    required this.lastSync,
    required this.expiresAt,
    this.retryCount = 0,
    this.isValid = true,
    this.errorDetails,
  });

  factory CacheMetadata.fromJson(Map<String, dynamic> json) {
    return CacheMetadata(
      key: json['key'] as String,
      lastSync: DateTime.parse(json['last_sync'] as String),
      expiresAt: DateTime.parse(json['expires_at'] as String),
      retryCount: json['retry_count'] as int? ?? 0,
      isValid: json['is_valid'] as bool? ?? true,
      errorDetails: json['error_details'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'last_sync': lastSync.toIso8601String(),
      'expires_at': expiresAt.toIso8601String(),
      'retry_count': retryCount,
      'is_valid': isValid,
      'error_details': errorDetails,
    };
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get needsRefresh => isExpired || !isValid;

  CacheMetadata copyWith({
    String? key,
    DateTime? lastSync,
    DateTime? expiresAt,
    int? retryCount,
    bool? isValid,
    String? errorDetails,
  }) {
    return CacheMetadata(
      key: key ?? this.key,
      lastSync: lastSync ?? this.lastSync,
      expiresAt: expiresAt ?? this.expiresAt,
      retryCount: retryCount ?? this.retryCount,
      isValid: isValid ?? this.isValid,
      errorDetails: errorDetails ?? this.errorDetails,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is CacheMetadata &&
        other.key == key &&
        other.lastSync == lastSync &&
        other.expiresAt == expiresAt &&
        other.retryCount == retryCount &&
        other.isValid == isValid &&
        other.errorDetails == errorDetails;
  }

  @override
  int get hashCode {
    return Object.hash(
      key,
      lastSync,
      expiresAt,
      retryCount,
      isValid,
      errorDetails,
    );
  }

  @override
  String toString() {
    return 'CacheMetadata(key: $key, isExpired: $isExpired, isValid: $isValid, retryCount: $retryCount)';
  }
}