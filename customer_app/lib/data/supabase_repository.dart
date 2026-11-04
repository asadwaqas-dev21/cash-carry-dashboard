import 'package:supabase_flutter/supabase_flutter.dart';

import '../models.dart';
import 'shop_repository.dart';

/// Reads the catalogue and writes app orders to the same Supabase tables the
/// dashboard uses (see cashcarry_sql_schema.sql). Requires RLS policies that
/// let the app's role read products and insert customer orders.
class SupabaseShopRepository implements ShopRepository {
  final SupabaseClient _db;

  SupabaseShopRepository(this._db);

  Future<String> _orgId() async {
    final org = await _db.from('organizations').select('id').limit(1).single();
    return org['id'] as String;
  }

  @override
  Future<List<Category>> fetchCategories() async {
    final rows = await _db
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order')
        .order('name');
    return rows.map(Category.fromMap).toList();
  }

  @override
  Future<List<Product>> fetchProducts() async {
    final rows = await _db
        .from('products')
        .select('id, name, sku, category_id, description, image_url, pack_size, retail_price, tax_rate, status')
        .inFilter('status', ['active', 'low_stock', 'out_of_stock'])
        .order('name');
    return rows.map(Product.fromMap).toList();
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
    final orgId = await _orgId();

    final existing = await _db
        .from('customers')
        .select('id')
        .eq('org_id', orgId)
        .eq('phone', customer.phone)
        .limit(1)
        .maybeSingle();
    final customerId = existing != null
        ? existing['id'] as String
        : (await _db
                .from('customers')
                .insert({
                  'org_id': orgId,
                  'display_name': customer.name,
                  'phone': customer.phone,
                })
                .select('id')
                .single())['id'] as String;

    final address = await _db
        .from('customer_addresses')
        .insert({
          'org_id': orgId,
          'customer_id': customerId,
          'label': 'App',
          'recipient_name': customer.name,
          'phone': customer.phone,
          'address_line1': customer.address,
          'city': customer.city,
          'country': 'Pakistan',
        })
        .select('id')
        .single();

    final location = await _db.from('locations').select('id').eq('org_id', orgId).limit(1).maybeSingle();

    final subtotal = items.fold<double>(0, (sum, item) => sum + item.subtotal);
    final taxTotal = items.fold<double>(0, (sum, item) => sum + item.tax);

    final order = await _db
        .from('orders')
        .insert({
          'org_id': orgId,
          'location_id': location?['id'],
          'customer_id': customerId,
          'customer_address_id': address['id'],
          'order_number': newOrderNumber(),
          'channel': 'app',
          'status': 'pending',
          'payment_status': 'unpaid',
          'delivery_status': 'pending',
          'items_count': items.fold<int>(0, (sum, item) => sum + item.quantity),
          'subtotal': subtotal,
          'tax_total': taxTotal,
          'delivery_fee': deliveryFee,
          'grand_total': subtotal + taxTotal + deliveryFee,
          'notes': orderNotes(deliverySlot: deliverySlot, paymentMethod: paymentMethod, notes: notes),
        })
        .select('id, order_number, status, items_count, grand_total, placed_at')
        .single();

    await _db.from('order_items').insert([
      for (final item in items)
        {
          'org_id': orgId,
          'order_id': order['id'],
          'product_id': item.product.id,
          'product_name': item.product.name,
          'sku': item.product.sku,
          'quantity': item.quantity,
          'unit_price': item.product.price,
          'tax_rate': item.product.taxRate,
        },
    ]);

    return OrderSummary(
      id: order['id'] as String,
      orderNumber: '${order['order_number']}',
      status: order['status'] as String,
      itemsCount: (order['items_count'] as num).toInt(),
      grandTotal: subtotal + taxTotal + deliveryFee,
      placedAt: DateTime.tryParse('${order['placed_at']}')?.toLocal() ?? DateTime.now(),
      items: items.map(OrderLine.fromCartItem).toList(),
    );
  }

  static const _orderColumns =
      'id, order_number, status, items_count, grand_total, placed_at, order_items(product_id, product_name, quantity, unit_price)';

  @override
  Future<OrderSummary?> fetchOrder(String id) async {
    final row = await _db.from('orders').select(_orderColumns).eq('id', id).maybeSingle();
    return row == null ? null : OrderSummary.fromMap(row);
  }

  @override
  Future<List<OrderSummary>> fetchOrders(String phone) async {
    final customers = await _db.from('customers').select('id').eq('phone', phone);
    final ids = customers.map((row) => row['id'] as String).toList();
    if (ids.isEmpty) return [];

    final rows = await _db
        .from('orders')
        .select(_orderColumns)
        .inFilter('customer_id', ids)
        .order('placed_at', ascending: false)
        .limit(50);
    return rows.map(OrderSummary.fromMap).toList();
  }
}
