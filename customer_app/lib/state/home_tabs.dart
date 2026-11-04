import 'package:flutter/foundation.dart';

/// Selected bottom-navigation tab, shared so any screen (e.g. reorder,
/// order success) can send the user to the cart, shop or orders tab.
class HomeTabs extends ValueNotifier<int> {
  static const shop = 0;
  static const cart = 1;
  static const orders = 2;

  HomeTabs() : super(shop);
}
