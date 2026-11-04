import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../format.dart';
import '../state/cart.dart';
import '../state/home_tabs.dart';

/// Floating "View cart" bar that slides up from the bottom once the cart has
/// items, showing the count and running total.
class FloatingCartBar extends StatelessWidget {
  const FloatingCartBar({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartModel>();
    final colors = Theme.of(context).colorScheme;

    return IgnorePointer(
      ignoring: cart.isEmpty,
      child: ExcludeSemantics(
        excluding: cart.isEmpty,
        child: _bar(context, cart, colors),
      ),
    );
  }

  Widget _bar(BuildContext context, CartModel cart, ColorScheme colors) {
    return AnimatedSlide(
      offset: cart.isEmpty ? const Offset(0, 2) : Offset.zero,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
      child: AnimatedOpacity(
        opacity: cart.isEmpty ? 0 : 1,
        duration: const Duration(milliseconds: 200),
        child: Material(
          color: colors.primary,
          elevation: 6,
          shadowColor: colors.primary.withAlpha(110),
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: cart.isEmpty ? null : () => context.read<HomeTabs>().value = HomeTabs.cart,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white.withAlpha(40), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${cart.totalQuantity} ${cart.totalQuantity == 1 ? 'item' : 'items'}',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        Text(
                          formatMoney(cart.grandTotal),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                  const Text('View cart', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, color: Colors.white),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
