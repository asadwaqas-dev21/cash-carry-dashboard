import 'package:flutter/foundation.dart';

import '../data/rider_repository.dart';
import '../models.dart';

/// The signed-in rider, their jobs and cash, kept in sync after every action.
class RiderState extends ChangeNotifier {
  final RiderRepository _repository;

  RiderState(this._repository);

  Rider? rider;
  List<DeliveryJob> jobs = const [];
  CashSummary cash = const CashSummary(cashOnHand: 0, collections: []);
  bool loading = false;
  bool loaded = false;
  Object? error;

  List<DeliveryJob> get activeJobs => jobs.where((j) => j.isActive).toList();
  List<DeliveryJob> get finishedJobs => jobs.where((j) => !j.isActive).toList();

  DeliveryJob? jobById(String id) {
    for (final job in jobs) {
      if (job.id == id) return job;
    }
    return null;
  }

  Future<void> refresh() async {
    loading = true;
    notifyListeners();
    try {
      final me = await _repository.fetchMe();
      rider = me;
      if (me != null) {
        jobs = await _repository.fetchDeliveries();
        cash = await _repository.fetchCash();
      }
      error = null;
    } catch (e) {
      error = e;
    } finally {
      loading = false;
      loaded = true;
      notifyListeners();
    }
  }

  Future<void> setStatus(RiderStatus status) => _run(() => _repository.setStatus(status));

  Future<void> pickUp(String deliveryId) => _run(() => _repository.pickUp(deliveryId));

  Future<void> deliver(String deliveryId, double cashCollected) =>
      _run(() => _repository.deliver(deliveryId, cashCollected: cashCollected));

  Future<void> fail(String deliveryId, String reason) => _run(() => _repository.fail(deliveryId, reason: reason));

  /// Runs an action, then reloads; errors are rethrown for the UI to show.
  Future<void> _run(Future<void> Function() action) async {
    await action();
    await refresh();
  }

  void clear() {
    rider = null;
    jobs = const [];
    cash = const CashSummary(cashOnHand: 0, collections: []);
    loaded = false;
    error = null;
    notifyListeners();
  }
}

/// Turns Supabase / state errors into a short message for snackbars.
String friendlyError(Object error) {
  final text = error.toString();
  final match = RegExp(r'message: (.*?), code:').firstMatch(text);
  return (match?.group(1) ?? text).replaceFirst('Bad state: ', '').trim();
}
