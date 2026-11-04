import 'package:flutter/foundation.dart';

import '../config.dart';
import '../models.dart';

class CartModel extends ChangeNotifier {
  final Map<String, CartItem> _items = {};

  List<CartItem> get items => _items.values.toList();
  bool get isEmpty => _items.isEmpty;

  int quantityOf(String productId) => _items[productId]?.quantity ?? 0;

  int get totalQuantity => _items.values.fold(0, (sum, item) => sum + item.quantity);
  double get subtotal => _items.values.fold(0, (sum, item) => sum + item.subtotal);
  double get taxTotal => _items.values.fold(0, (sum, item) => sum + item.tax);
  double get deliveryFee => isEmpty ? 0 : AppConfig.deliveryFee;
  double get grandTotal => subtotal + taxTotal + deliveryFee;

  void add(Product product) {
    final existing = _items[product.id];
    if (existing != null) {
      existing.quantity++;
    } else {
      _items[product.id] = CartItem(product, 1);
    }
    notifyListeners();
  }

  void setQuantity(Product product, int quantity) {
    if (quantity <= 0) {
      _items.remove(product.id);
    } else {
      _items.update(product.id, (item) => item..quantity = quantity, ifAbsent: () => CartItem(product, quantity));
    }
    notifyListeners();
  }

  void decrement(String productId) {
    final existing = _items[productId];
    if (existing == null) return;
    if (existing.quantity > 1) {
      existing.quantity--;
    } else {
      _items.remove(productId);
    }
    notifyListeners();
  }

  void remove(String productId) {
    if (_items.remove(productId) != null) notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
