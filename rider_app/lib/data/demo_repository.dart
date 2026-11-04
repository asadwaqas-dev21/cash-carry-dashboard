import '../models.dart';
import 'rider_repository.dart';

/// Offline sample data used when no Supabase keys are configured.
/// Changes live in memory and reset when the app restarts.
class DemoRiderRepository implements RiderRepository {
  final Duration latency;

  DemoRiderRepository({this.latency = const Duration(milliseconds: 300)});

  Rider _rider = const Rider(
    id: 'demo-rider',
    fullName: 'Bilal Ahmed',
    riderCode: 'R-12',
    phone: '0300 1234567',
    vehicle: 'Bike · LEA-4521',
    storeName: 'Kirana Cash & Carry',
    status: RiderStatus.available,
    cashOnHand: 1850,
    deliveredToday: 3,
  );

  final List<CashCollection> _collections = [
    CashCollection(id: 'c1', amount: 1850, orderNumber: 'APP-10422', collectedAt: DateTime.now().subtract(const Duration(hours: 2)), handedOver: false),
  ];

  late final List<DeliveryJob> _jobs = [
    DeliveryJob(
      id: 'd1',
      status: 'assigned',
      orderNumber: 'APP-10431',
      customerName: 'Ayesha Khan',
      customerPhone: '03001234567',
      address: 'House 14, Street 6, Block C',
      city: 'Lahore',
      deliveryNotes: 'Green gate, ring the bell twice',
      grandTotal: 4300,
      cashToCollect: 4300,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 12)),
      items: const [JobItem('Sella Basmati Rice 5 kg', 2), JobItem('Black Tea 950 g', 1)],
    ),
    DeliveryJob(
      id: 'd2',
      status: 'assigned',
      orderNumber: 'APP-10432',
      customerName: 'Usman Traders',
      customerPhone: '03217654321',
      address: 'Shop 3, Main Bazaar',
      city: 'Lahore',
      grandTotal: 2890,
      cashToCollect: 0,
      notes: 'Paid online',
      assignedAt: DateTime.now().subtract(const Duration(minutes: 5)),
      items: const [JobItem('Canola Cooking Oil 5 L', 1)],
    ),
    DeliveryJob(
      id: 'd0',
      status: 'delivered',
      orderNumber: 'APP-10422',
      customerName: 'Hina Malik',
      address: 'Flat 7, Gulberg Heights',
      city: 'Lahore',
      grandTotal: 1850,
      cashToCollect: 1850,
      cashCollected: 1850,
      deliveredAt: DateTime.now().subtract(const Duration(hours: 2)),
      items: const [JobItem('Chakki Atta 10 kg', 1), JobItem('Maida 1 kg', 2)],
    ),
  ];

  Future<void> _wait() => Future<void>.delayed(latency);

  DeliveryJob _job(String id) => _jobs.firstWhere((job) => job.id == id);

  void _replace(DeliveryJob job) => _jobs[_jobs.indexWhere((j) => j.id == job.id)] = job;

  void _settleStatus() {
    if (_rider.status == RiderStatus.onDelivery && !_jobs.any((j) => j.isPickedUp)) {
      _rider = _rider.copyWith(status: RiderStatus.available);
    }
  }

  @override
  Future<Rider?> fetchMe() async {
    await _wait();
    return _rider;
  }

  @override
  Future<void> setStatus(RiderStatus status) async {
    await _wait();
    _rider = _rider.copyWith(status: status);
  }

  @override
  Future<List<DeliveryJob>> fetchDeliveries() async {
    await _wait();
    return [..._jobs.where((j) => j.isActive), ..._jobs.where((j) => !j.isActive)];
  }

  @override
  Future<void> pickUp(String deliveryId) async {
    await _wait();
    final job = _job(deliveryId);
    if (job.status != 'assigned') throw StateError('This delivery is already ${job.status.replaceAll('_', ' ')}');
    _replace(job.copyWith(status: 'out_for_delivery', pickedUpAt: DateTime.now()));
    _rider = _rider.copyWith(status: RiderStatus.onDelivery);
  }

  @override
  Future<void> deliver(String deliveryId, {required double cashCollected}) async {
    await _wait();
    final job = _job(deliveryId);
    if (!job.isPickedUp) throw StateError('Pick up the order before marking it delivered');
    _replace(job.copyWith(status: 'delivered', cashCollected: cashCollected, deliveredAt: DateTime.now()));
    if (cashCollected > 0) {
      _collections.insert(
        0,
        CashCollection(id: 'c${_collections.length + 1}', amount: cashCollected, orderNumber: job.orderNumber, collectedAt: DateTime.now(), handedOver: false),
      );
    }
    _rider = _rider.copyWith(cashOnHand: _rider.cashOnHand + cashCollected, deliveredToday: _rider.deliveredToday + 1);
    _settleStatus();
  }

  @override
  Future<void> fail(String deliveryId, {required String reason}) async {
    await _wait();
    _replace(_job(deliveryId).copyWith(status: 'failed', failureReason: reason, failedAt: DateTime.now()));
    _settleStatus();
  }

  @override
  Future<CashSummary> fetchCash() async {
    await _wait();
    return CashSummary(cashOnHand: _rider.cashOnHand, collections: List.of(_collections));
  }
}
