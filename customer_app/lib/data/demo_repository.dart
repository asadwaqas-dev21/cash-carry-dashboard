import '../models.dart';
import 'shop_repository.dart';

/// Offline sample catalogue used when no Supabase keys are configured.
/// Orders are kept in memory and disappear when the app restarts.
class DemoShopRepository implements ShopRepository {
  static const _categories = [
    Category(id: 'rice', name: 'Rice & Flour'),
    Category(id: 'oil', name: 'Cooking Oil'),
    Category(id: 'drinks', name: 'Beverages'),
    Category(id: 'snacks', name: 'Snacks'),
    Category(id: 'home', name: 'Household'),
  ];

  static const _products = [
    Product(id: 'p1', sku: 'RICE-SELLA-5', name: 'Sella Basmati Rice', packSize: '5 kg', price: 2150, categoryId: 'rice', description: 'Long-grain parboiled basmati, ideal for biryani and pulao.'),
    Product(id: 'p2', sku: 'ATTA-10', name: 'Chakki Atta', packSize: '10 kg', price: 1480, categoryId: 'rice', description: 'Stone-ground whole wheat flour for soft rotis.'),
    Product(id: 'p3', sku: 'MAIDA-1', name: 'Maida', packSize: '1 kg', price: 165, categoryId: 'rice'),
    Product(id: 'p4', sku: 'OIL-CAN-5', name: 'Canola Cooking Oil', packSize: '5 L', price: 2890, categoryId: 'oil'),
    Product(id: 'p5', sku: 'GHEE-1', name: 'Banaspati Ghee', packSize: '1 kg', price: 545, categoryId: 'oil'),
    Product(id: 'p6', sku: 'TEA-950', name: 'Black Tea', packSize: '950 g', price: 1650, categoryId: 'drinks'),
    Product(id: 'p7', sku: 'COLA-1.5', name: 'Cola Soft Drink', packSize: '1.5 L', price: 210, categoryId: 'drinks'),
    Product(id: 'p8', sku: 'WATER-6', name: 'Mineral Water', packSize: '6 x 1.5 L', price: 540, categoryId: 'drinks', inStock: false),
    Product(id: 'p9', sku: 'CHIPS-FAM', name: 'Salted Chips', packSize: 'Family pack', price: 150, categoryId: 'snacks'),
    Product(id: 'p10', sku: 'BISC-12', name: 'Tea Biscuits', packSize: '12 packs', price: 360, categoryId: 'snacks'),
    Product(id: 'p11', sku: 'SOAP-4', name: 'Bath Soap', packSize: '4 bars', price: 520, categoryId: 'home', taxRate: 18),
    Product(id: 'p12', sku: 'DET-1', name: 'Washing Powder', packSize: '1 kg', price: 430, categoryId: 'home', taxRate: 18),
  ];

  final List<(String phone, OrderSummary order)> _orders = [];

  @override
  Future<List<Category>> fetchCategories() async => _categories;

  @override
  Future<List<Product>> fetchProducts() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    return _products;
  }

  @override
  Future<OrderSummary> placeOrder({
    required CustomerDetails customer,
    required List<CartItem> items,
    required double deliveryFee,
    required String deliverySlot,
    required String paymentMethod,
    String? notes,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final total = items.fold<double>(0, (sum, item) => sum + item.subtotal + item.tax) + deliveryFee;
    final order = OrderSummary(
      id: 'demo-${_orders.length + 1}',
      orderNumber: newOrderNumber(),
      status: 'pending',
      itemsCount: items.fold(0, (sum, item) => sum + item.quantity),
      grandTotal: total,
      placedAt: DateTime.now(),
      items: items.map(OrderLine.fromCartItem).toList(),
    );
    _orders.insert(0, (customer.phone, order));
    return order;
  }

  @override
  Future<List<OrderSummary>> fetchOrders(String phone) async =>
      _orders.where((entry) => entry.$1 == phone).map((entry) => entry.$2).toList();

  @override
  Future<OrderSummary?> fetchOrder(String id) async {
    for (final (_, order) in _orders) {
      if (order.id == id) return order;
    }
    return null;
  }
}
