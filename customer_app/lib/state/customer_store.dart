import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models.dart';

/// Remembers the customer's checkout details on this device, so the form is
/// prefilled next time and "My Orders" knows which phone number to look up.
class CustomerStore extends ChangeNotifier {
  static const _key = 'customer_details';

  final SharedPreferences _prefs;
  CustomerDetails? _details;

  CustomerStore(this._prefs) {
    final raw = _prefs.getString(_key);
    if (raw != null) {
      try {
        _details = CustomerDetails.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {
        _details = null;
      }
    }
  }

  CustomerDetails? get details => _details;

  Future<void> save(CustomerDetails details) async {
    _details = details;
    await _prefs.setString(_key, jsonEncode(details.toJson()));
    notifyListeners();
  }
}
