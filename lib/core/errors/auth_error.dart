class AuthError {
  final String message;
  final String? details;
  final int? statusCode;

  const AuthError(
    this.message, [
    this.details,
    this.statusCode,
  ]);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuthError &&
        other.message == message &&
        other.details == details &&
        other.statusCode == statusCode;
  }

  @override
  int get hashCode => Object.hash(message, details, statusCode);

  @override
  String toString() {
    if (details != null) {
      return 'AuthError: $message - $details';
    }
    return 'AuthError: $message';
  }
}