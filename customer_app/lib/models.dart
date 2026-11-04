double _toDouble(Object? value) =>
    value is num ? value.toDouble() : double.tryParse('${value ?? ''}') ?? 0;

class Category {
  final String id;
  final String name;

  const Category({required this.id, required this.name});

  factory Category.fromMap(Map<String, dynamic> map) =>
      Category(id: map['id'] as String, name: map['name'] as String);
}

class Product {
  final String id;
  final String name;
  final String sku;
  final String? categoryId;
  final String? description;
  final String? imageUrl;
  final String? packSize;
  final double price;
  final double taxRate;
  final bool inStock;

  const Product({
    required this.id,
    required this.name,
    required this.sku,
    required this.price,
    this.categoryId,
    this.description,
    this.imageUrl,
    this.packSize,
    this.taxRate = 0,
    this.inStock = true,
  });

  factory Product.fromMap(Map<String, dynamic> map) => Product(
        id: map['id'] as String,
        name: map['name'] as String,
        sku: '${map['sku'] ?? ''}',
        categoryId: map['category_id'] as String?,
        description: map['description'] as String?,
        imageUrl: map['image_url'] as String?,
        packSize: map['pack_size'] as String?,
        price: _toDouble(map['retail_price']),
        taxRate: _toDouble(map['tax_rate']),
        inStock: map['status'] != 'out_of_stock',
      );
}

class CartItem {
  final Product product;
  int quantity;

  CartItem(this.product, this.quantity);

  double get subtotal => product.price * quantity;
  double get tax => subtotal * product.taxRate / 100;
}

class CustomerDetails {
  final String name;
  final String phone;
  final String address;
  final String city;

  const CustomerDetails({
    required this.name,
    required this.phone,
    required this.address,
    required this.city,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'address': address,
        'city': city,
      };

  factory CustomerDetails.fromJson(Map<String, dynamic> json) => CustomerDetails(
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        address: json['address'] as String? ?? '',
        city: json['city'] as String? ?? '',
      );
}

class OrderLine {
  final String? productId;
  final String name;
  final int quantity;
  final double unitPrice;

  const OrderLine({this.productId, required this.name, required this.quantity, required this.unitPrice});

  factory OrderLine.fromCartItem(CartItem item) => OrderLine(
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      );

  factory OrderLine.fromMap(Map<String, dynamic> map) => OrderLine(
        productId: map['product_id'] as String?,
        name: map['product_name'] as String? ?? '',
        quantity: _toDouble(map['quantity']).round(),
        unitPrice: _toDouble(map['unit_price']),
      );

  double get total => unitPrice * quantity;
}

class OrderSummary {
  final String id;
  final String orderNumber;
  final String status;
  final int itemsCount;
  final double grandTotal;
  final DateTime placedAt;
  final List<OrderLine> items;

  const OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.itemsCount,
    required this.grandTotal,
    required this.placedAt,
    this.items = const [],
  });

  factory OrderSummary.fromMap(Map<String, dynamic> map) => OrderSummary(
        id: map['id'] as String,
        orderNumber: '${map['order_number']}',
        status: map['status'] as String? ?? 'pending',
        itemsCount: (map['items_count'] as num?)?.toInt() ?? 0,
        grandTotal: _toDouble(map['grand_total']),
        placedAt: DateTime.tryParse('${map['placed_at']}')?.toLocal() ?? DateTime.now(),
        items: [
          for (final line in (map['order_items'] as List<dynamic>? ?? const []))
            OrderLine.fromMap(line as Map<String, dynamic>),
        ],
      );
}
