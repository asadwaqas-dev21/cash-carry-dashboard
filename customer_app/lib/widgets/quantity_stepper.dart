import 'package:flutter/material.dart';

class QuantityStepper extends StatelessWidget {
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  const QuantityStepper({super.key, required this.quantity, required this.onAdd, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      height: 36,
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            iconSize: 18,
            tooltip: 'Remove one',
            onPressed: onRemove,
            icon: Icon(quantity == 1 ? Icons.delete_outline : Icons.remove),
          ),
          Text('$quantity', style: const TextStyle(fontWeight: FontWeight.w700)),
          IconButton(
            visualDensity: VisualDensity.compact,
            iconSize: 18,
            tooltip: 'Add one',
            onPressed: onAdd,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }
}
