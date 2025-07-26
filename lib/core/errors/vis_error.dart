import '../exceptions.dart';

abstract class VisError extends AppException {
  const VisError(super.message, [super.details]);
}

class VisConnectionError extends VisError {
  const VisConnectionError(super.message, [super.details]);
}

class VisAuthenticationError extends VisError {
  const VisAuthenticationError(super.message, [super.details]);
}

class VisRateLimitError extends VisError {
  const VisRateLimitError(super.message, [super.details]);
}

class VisTimeoutError extends VisError {
  const VisTimeoutError(super.message, [super.details]);
}

class VisDataValidationError extends VisError {
  const VisDataValidationError(super.message, [super.details]);
}

class VisComplianceError extends VisError {
  const VisComplianceError(super.message, [super.details]);
}

class VisMaintenanceError extends VisError {
  const VisMaintenanceError(super.message, [super.details]);
}