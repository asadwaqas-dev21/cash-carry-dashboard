import 'package:flutter/material.dart';

import '../format.dart';
import '../state/cart.dart';

class BillSummary extends StatelessWidget {
  final CartModel cart;

  const BillSummary({super.key, required this.cart});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _Row(label: 'Item total', value: formatMoney(cart.subtotal)),
        if (cart.taxTotal > 0) _Row(label: 'Tax', value: formatMoney(cart.taxTotal)),
        _Row(label: 'Delivery', value: cart.deliveryFee == 0 ? 'FREE' : formatMoney(cart.deliveryFee), highlight: cart.deliveryFee == 0),
        const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1)),
        _Row(label: 'To pay', value: formatMoney(cart.grandTotal), bold: true),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final bool highlight;

  const _Row({required this.label, required this.value, this.bold = false, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = bold
        ? theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)
        : theme.textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(label, style: base),
          const Spacer(),
          Text(
            value,
            style: highlight ? base?.copyWith(color: Colors.green.shade700, fontWeight: FontWeight.w700) : base,
          ),
        ],
      ),
    );
  }
}
