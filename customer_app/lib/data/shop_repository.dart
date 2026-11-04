import '../models.dart';

abstract class ShopRepository {
  Future<List<Category>> fetchCategories();

  Future<List<Product>> fetchProducts();

  Future<OrderSummary> placeOrder({
    required CustomerDetails customer,
    required List<CartItem> items,
    required double deliveryFee,
    required String deliverySlot,
    required String paymentMethod,
    String? notes,
  });

  Future<List<OrderSummary>> fetchOrders(String phone);

  Future<OrderSummary?> fetchOrder(String id);
}

String newOrderNumber() {
  final stamp = DateTime.now().millisecondsSinceEpoch.toString();
  return 'APP-${stamp.substring(stamp.length - 8)}';
}

/// The orders table has no slot/payment columns, so they travel in the notes
/// the store sees on the dashboard.
String orderNotes({required String deliverySlot, required String paymentMethod, String? notes}) => [
      'Delivery: $deliverySlot',
      'Payment: $paymentMethod',
      if (notes != null && notes.isNotEmpty) 'Note: $notes',
    ].join('\n');
