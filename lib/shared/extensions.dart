extension StringExtensions on String {
  bool get isValidEmail {
    return RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(this);
  }
  
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
  }
}

extension DateTimeExtensions on DateTime {
  String toDisplayString() {
    return '${day.toString().padLeft(2, '0')}/'
           '${month.toString().padLeft(2, '0')}/'
           '$year '
           '${hour.toString().padLeft(2, '0')}:'
           '${minute.toString().padLeft(2, '0')}';
  }
}