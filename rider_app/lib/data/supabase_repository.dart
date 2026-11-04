import 'package:supabase_flutter/supabase_flutter.dart';

import '../models.dart';
import 'rider_repository.dart';

class SupabaseRiderRepository implements RiderRepository {
  final SupabaseClient _db;

  SupabaseRiderRepository(this._db);

  @override
  Future<Rider?> fetchMe() async {
    final result = await _db.rpc('rider_me');
    return result == null ? null : Rider.fromMap(result as Map<String, dynamic>);
  }

  @override
  Future<void> setStatus(RiderStatus status) =>
      _db.rpc('rider_set_status', params: {'p_status': riderStatusToDb(status)});

  @override
  Future<List<DeliveryJob>> fetchDeliveries() async {
    final result = await _db.rpc('rider_deliveries') as List<dynamic>? ?? const [];
    return result.map((row) => DeliveryJob.fromMap(row as Map<String, dynamic>)).toList();
  }

  @override
  Future<void> pickUp(String deliveryId) =>
      _db.rpc('rider_update_delivery', params: {'p_delivery_id': deliveryId, 'p_action': 'pick_up'});

  @override
  Future<void> deliver(String deliveryId, {required double cashCollected}) => _db.rpc(
        'rider_update_delivery',
        params: {'p_delivery_id': deliveryId, 'p_action': 'deliver', 'p_cash': cashCollected},
      );

  @override
  Future<void> fail(String deliveryId, {required String reason}) => _db.rpc(
        'rider_update_delivery',
        params: {'p_delivery_id': deliveryId, 'p_action': 'fail', 'p_reason': reason},
      );

  @override
  Future<CashSummary> fetchCash() async {
    final result = await _db.rpc('rider_cash_today');
    if (result == null) return const CashSummary(cashOnHand: 0, collections: []);
    return CashSummary.fromMap(result as Map<String, dynamic>);
  }
}
