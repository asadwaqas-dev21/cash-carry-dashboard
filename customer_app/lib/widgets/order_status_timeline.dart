import 'package:flutter/material.dart';

const _steps = [
  (Icons.receipt_long, 'Order placed', 'We have received your order'),
  (Icons.verified_outlined, 'Confirmed', 'The store has accepted your order'),
  (Icons.inventory_2_outlined, 'Packing', 'Your items are being packed'),
  (Icons.delivery_dining, 'On the way', 'Rider is heading to you'),
  (Icons.home_rounded, 'Delivered', 'Enjoy your order!'),
];

/// Index of the furthest completed step for an order status, or -1 when the
/// order was cancelled / voided / refunded.
int orderStepIndex(String status) {
  switch (status) {
    case 'confirmed':
      return 1;
    case 'preparing':
    case 'ready':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
    case 'completed':
    case 'paid':
      return 4;
    case 'cancelled':
    case 'voided':
    case 'refunded':
      return -1;
    default:
      return 0;
  }
}

class OrderStatusTimeline extends StatelessWidget {
  final String status;

  const OrderStatusTimeline({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final current = orderStepIndex(status);

    if (current < 0) {
      return ListTile(
        contentPadding: EdgeInsets.zero,
        leading: CircleAvatar(backgroundColor: colors.errorContainer, child: Icon(Icons.close, color: colors.error)),
        title: const Text('Order cancelled', style: TextStyle(fontWeight: FontWeight.w700)),
        subtitle: const Text('Contact the store if you have questions.'),
      );
    }

    return Column(
      children: [
        for (var i = 0; i < _steps.length; i++)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 36,
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i <= current ? colors.primary : colors.surfaceContainerHighest,
                        ),
                        child: Icon(_steps[i].$1, size: 17, color: i <= current ? Colors.white : colors.outline),
                      ),
                      if (i < _steps.length - 1)
                        Expanded(
                          child: Container(
                            width: 2.5,
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            color: i < current ? colors.primary : colors.outlineVariant,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 5, bottom: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _steps[i].$2,
                          style: TextStyle(
                            fontWeight: i == current ? FontWeight.w800 : FontWeight.w600,
                            color: i <= current ? null : colors.outline,
                          ),
                        ),
                        if (i == current)
                          Text(_steps[i].$3, style: TextStyle(color: colors.outline, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
