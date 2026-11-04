import 'package:flutter/material.dart';

import '../format.dart';
import '../models.dart';

(Color, Color, String) jobStatusStyle(String status) => switch (status) {
      'assigned' => (const Color(0xFFFFEDD5), const Color(0xFF9A3412), 'New'),
      'picked_up' || 'out_for_delivery' => (const Color(0xFFDBEAFE), const Color(0xFF1D4ED8), 'On the way'),
      'delivered' => (const Color(0xFFDCFCE7), const Color(0xFF15803D), 'Delivered'),
      'failed' || 'returned' => (const Color(0xFFFEE2E2), const Color(0xFFB91C1C), 'Failed'),
      'cancelled' => (const Color(0xFFF1F5F9), const Color(0xFF475569), 'Cancelled'),
      _ => (const Color(0xFFF1F5F9), const Color(0xFF475569), labelize(status)),
    };

class JobStatusChip extends StatelessWidget {
  final String status;

  const JobStatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (background, foreground, label) = jobStatusStyle(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: foreground, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}

/// "Collect Rs 4,300" or "Prepaid" pill.
class CashPill extends StatelessWidget {
  final double amount;

  const CashPill({super.key, required this.amount});

  @override
  Widget build(BuildContext context) {
    final collect = amount > 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: collect ? const Color(0xFF0C0A09) : const Color(0xFFE7E5E4),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(collect ? Icons.payments_outlined : Icons.verified_outlined,
              size: 15, color: collect ? Colors.white : const Color(0xFF44403C)),
          const SizedBox(width: 5),
          Text(
            collect ? 'Collect ${formatMoney(amount)}' : 'Prepaid',
            style: TextStyle(
                color: collect ? Colors.white : const Color(0xFF44403C), fontWeight: FontWeight.w700, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class JobCard extends StatelessWidget {
  final DeliveryJob job;
  final VoidCallback onTap;

  const JobCard({super.key, required this.job, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final itemCount = job.items.fold<double>(0, (sum, item) => sum + item.quantity).round();

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(job.orderNumber, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                  JobStatusChip(status: job.status),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.person_outline, size: 18, color: colors.outline),
                  const SizedBox(width: 8),
                  Expanded(child: Text(job.customerName, style: const TextStyle(fontWeight: FontWeight.w600))),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.location_on_outlined, size: 18, color: colors.outline),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      job.fullAddress.isEmpty ? 'No address on file' : job.fullAddress,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: job.isActive
                          ? FittedBox(fit: BoxFit.scaleDown, child: CashPill(amount: job.cashToCollect))
                          : job.status == 'failed' && job.failureReason != null
                              ? Text(job.failureReason!,
                                  maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: colors.error))
                              : job.status == 'delivered' && job.cashCollected > 0
                                  ? Text(
                                      'Collected ${formatMoney(job.cashCollected)}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                    )
                                  : const SizedBox.shrink(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text('$itemCount items', style: TextStyle(color: colors.outline, fontSize: 13)),
                  if (job.isActive) Icon(Icons.chevron_right, color: colors.outline),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
