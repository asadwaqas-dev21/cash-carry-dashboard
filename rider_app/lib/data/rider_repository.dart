import '../models.dart';

/// Everything the rider app reads and writes. The Supabase version calls the
/// rider_* database functions (see supabase/migrations/*_rider_app.sql).
abstract class RiderRepository {
  /// The signed-in rider, or null when this account isn't linked to a rider.
  Future<Rider?> fetchMe();

  Future<void> setStatus(RiderStatus status);

  Future<List<DeliveryJob>> fetchDeliveries();

  Future<void> pickUp(String deliveryId);

  Future<void> deliver(String deliveryId, {required double cashCollected});

  Future<void> fail(String deliveryId, {required String reason});

  Future<CashSummary> fetchCash();
}
