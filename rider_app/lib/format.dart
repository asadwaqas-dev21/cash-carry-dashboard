import 'package:intl/intl.dart';

final _money = NumberFormat('#,##0.00', 'en_US');
final _moneyWhole = NumberFormat('#,##0', 'en_US');
final _dateTime = DateFormat('d MMM, h:mm a');
final _time = DateFormat('h:mm a');

String formatMoney(num value, {int decimals = 2}) =>
    'Rs ${(decimals == 0 ? _moneyWhole : _money).format(value)}';

String formatDateTime(DateTime value) => _dateTime.format(value);

String formatTime(DateTime value) => _time.format(value);

String labelize(String value) => value
    .split('_')
    .where((part) => part.isNotEmpty)
    .map((part) => part[0].toUpperCase() + part.substring(1))
    .join(' ');

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return parts.take(2).map((p) => p[0].toUpperCase()).join();
}
