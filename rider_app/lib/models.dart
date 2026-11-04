double _toDouble(Object? value) =>
    value is num ? value.toDouble() : double.tryParse('${value ?? ''}') ?? 0;

double? _toDoubleOrNull(Object? value) => value == null ? null : _toDouble(value);

DateTime? _toDate(Object? value) => value == null ? null : DateTime.tryParse('$value')?.toLocal();

/// Mirrors public.rider_status.
enum RiderStatus { available, onDelivery, onBreak, offShift, inactive }

RiderStatus riderStatusFromDb(String? value) => switch (value) {
      'available' => RiderStatus.available,
      'on_delivery' => RiderStatus.onDelivery,
      'on_break' => RiderStatus.onBreak,
      'inactive' => RiderStatus.inactive,
      _ => RiderStatus.offShift,
    };

String riderStatusToDb(RiderStatus status) => switch (status) {
      RiderStatus.available => 'available',
      RiderStatus.onDelivery => 'on_delivery',
      RiderStatus.onBreak => 'on_break',
      RiderStatus.offShift => 'off_shift',
      RiderStatus.inactive => 'inactive',
    };

class Rider {
  final String id;
  final String fullName;
  final String riderCode;
  final String? phone;
  final String? vehicle;
  final String storeName;
  final RiderStatus status;
  final double cashOnHand;
  final int deliveredToday;

  const Rider({
    required this.id,
    required this.fullName,
    required this.riderCode,
    required this.storeName,
    required this.status,
    required this.cashOnHand,
    required this.deliveredToday,
    this.phone,
    this.vehicle,
  });

  factory Rider.fromMap(Map<String, dynamic> map) => Rider(
        id: map['id'] as String,
        fullName: map['full_name'] as String? ?? 'Rider',
        riderCode: '${map['rider_code'] ?? ''}',
        phone: map['phone'] as String?,
        vehicle: map['vehicle'] as String?,
        storeName: map['store_name'] as String? ?? 'Cash & Carry',
        status: riderStatusFromDb(map['status'] as String?),
        cashOnHand: _toDouble(map['cash_on_hand']),
        deliveredToday: (map['delivered_today'] as num?)?.toInt() ?? 0,
      );

  Rider copyWith({RiderStatus? status, double? cashOnHand, int? deliveredToday}) => Rider(
        id: id,
        fullName: fullName,
        riderCode: riderCode,
        phone: phone,
        vehicle: vehicle,
        storeName: storeName,
        status: status ?? this.status,
        cashOnHand: cashOnHand ?? this.cashOnHand,
        deliveredToday: deliveredToday ?? this.deliveredToday,
      );
}

class JobItem {
  final String name;
  final double quantity;

  const JobItem(this.name, this.quantity);

  factory JobItem.fromMap(Map<String, dynamic> map) =>
      JobItem(map['name'] as String? ?? '', _toDouble(map['quantity']));

  String get quantityLabel => quantity == quantity.roundToDouble() ? quantity.toInt().toString() : quantity.toString();
}

/// One delivery assigned to the rider, with what they need on the road.
class DeliveryJob {
  final String id;
  final String status;
  final String orderNumber;
  final String customerName;
  final String? customerPhone;
  final String address;
  final String? city;
  final String? deliveryNotes;
  final String? notes;
  final double? latitude;
  final double? longitude;
  final double grandTotal;
  final double cashToCollect;
  final double cashCollected;
  final String? failureReason;
  final DateTime? assignedAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final DateTime? failedAt;
  final List<JobItem> items;

  const DeliveryJob({
    required this.id,
    required this.status,
    required this.orderNumber,
    required this.customerName,
    required this.address,
    required this.grandTotal,
    required this.cashToCollect,
    this.cashCollected = 0,
    this.customerPhone,
    this.city,
    this.deliveryNotes,
    this.notes,
    this.latitude,
    this.longitude,
    this.failureReason,
    this.assignedAt,
    this.pickedUpAt,
    this.deliveredAt,
    this.failedAt,
    this.items = const [],
  });

  factory DeliveryJob.fromMap(Map<String, dynamic> map) => DeliveryJob(
        id: map['id'] as String,
        status: map['status'] as String? ?? 'assigned',
        orderNumber: '${map['order_number'] ?? ''}',
        customerName: map['customer_name'] as String? ?? 'Customer',
        customerPhone: map['customer_phone'] as String?,
        address: [map['address_line1'], map['address_line2']]
            .whereType<String>()
            .where((part) => part.trim().isNotEmpty)
            .join(', '),
        city: map['city'] as String?,
        deliveryNotes: map['delivery_notes'] as String?,
        notes: map['notes'] as String?,
        latitude: _toDoubleOrNull(map['latitude']),
        longitude: _toDoubleOrNull(map['longitude']),
        grandTotal: _toDouble(map['grand_total']),
        cashToCollect: _toDouble(map['cash_to_collect']),
        cashCollected: _toDouble(map['cash_collected']),
        failureReason: map['failure_reason'] as String?,
        assignedAt: _toDate(map['assigned_at']),
        pickedUpAt: _toDate(map['picked_up_at']),
        deliveredAt: _toDate(map['delivered_at']),
        failedAt: _toDate(map['failed_at']),
        items: [
          for (final item in (map['items'] as List<dynamic>? ?? const []))
            JobItem.fromMap(item as Map<String, dynamic>),
        ],
      );

  bool get isActive => status == 'assigned' || status == 'picked_up' || status == 'out_for_delivery';
  bool get isPickedUp => status == 'picked_up' || status == 'out_for_delivery';

  String get fullAddress => [address, city].whereType<String>().where((p) => p.isNotEmpty).join(', ');

  DeliveryJob copyWith({
    String? status,
    double? cashCollected,
    String? failureReason,
    DateTime? pickedUpAt,
    DateTime? deliveredAt,
    DateTime? failedAt,
  }) =>
      DeliveryJob(
        id: id,
        status: status ?? this.status,
        orderNumber: orderNumber,
        customerName: customerName,
        customerPhone: customerPhone,
        address: address,
        city: city,
        deliveryNotes: deliveryNotes,
        notes: notes,
        latitude: latitude,
        longitude: longitude,
        grandTotal: grandTotal,
        cashToCollect: cashToCollect,
        cashCollected: cashCollected ?? this.cashCollected,
        failureReason: failureReason ?? this.failureReason,
        assignedAt: assignedAt,
        pickedUpAt: pickedUpAt ?? this.pickedUpAt,
        deliveredAt: deliveredAt ?? this.deliveredAt,
        failedAt: failedAt ?? this.failedAt,
        items: items,
      );
}

class CashCollection {
  final String id;
  final double amount;
  final String orderNumber;
  final DateTime collectedAt;
  final bool handedOver;

  const CashCollection({
    required this.id,
    required this.amount,
    required this.orderNumber,
    required this.collectedAt,
    required this.handedOver,
  });

  factory CashCollection.fromMap(Map<String, dynamic> map) => CashCollection(
        id: map['id'] as String,
        amount: _toDouble(map['amount']),
        orderNumber: '${map['order_number'] ?? '-'}',
        collectedAt: _toDate(map['collected_at']) ?? DateTime.now(),
        handedOver: map['handed_over_at'] != null,
      );
}

class CashSummary {
  final double cashOnHand;
  final List<CashCollection> collections;

  const CashSummary({required this.cashOnHand, required this.collections});

  factory CashSummary.fromMap(Map<String, dynamic> map) => CashSummary(
        cashOnHand: _toDouble(map['cash_on_hand']),
        collections: [
          for (final row in (map['collections'] as List<dynamic>? ?? const []))
            CashCollection.fromMap(row as Map<String, dynamic>),
        ],
      );
}
