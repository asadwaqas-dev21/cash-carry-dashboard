import 'package:intl/intl.dart';

final _money = NumberFormat('#,##0.00', 'en_US');
final _dateTime = DateFormat('d MMM, h:mm a');

String formatMoney(num value) => 'Rs ${_money.format(value)}';

String formatDateTime(DateTime value) => _dateTime.format(value);

String labelize(String value) => value
    .split('_')
    .where((part) => part.isNotEmpty)
    .map((part) => part[0].toUpperCase() + part.substring(1))
    .join(' ');
