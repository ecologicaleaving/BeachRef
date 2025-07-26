sealed class Result<T, E> {
  const Result();
  
  bool get isSuccess => this is Success<T, E>;
  bool get isError => this is Error<T, E>;
  
  T get value {
    if (this is Success<T, E>) {
      return (this as Success<T, E>).value;
    }
    throw StateError('Called value on Error result');
  }
  
  E get error {
    if (this is Error<T, E>) {
      return (this as Error<T, E>).error;
    }
    throw StateError('Called error on Success result');
  }
  
  R fold<R>(R Function(T value) onSuccess, R Function(E error) onError) {
    return switch (this) {
      Success(value: final value) => onSuccess(value),
      Error(error: final error) => onError(error),
    };
  }
}

final class Success<T, E> extends Result<T, E> {
  const Success(this.value);
  
  @override
  final T value;
  
  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other is Success<T, E> && other.value == value);
  }
  
  @override
  int get hashCode => value.hashCode;
  
  @override
  String toString() => 'Success($value)';
}

final class Error<T, E> extends Result<T, E> {
  const Error(this.error);
  
  @override
  final E error;
  
  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other is Error<T, E> && other.error == error);
  }
  
  @override
  int get hashCode => error.hashCode;
  
  @override
  String toString() => 'Error($error)';
}