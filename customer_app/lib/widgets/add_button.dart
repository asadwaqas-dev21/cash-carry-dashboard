import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models.dart';
import '../state/cart.dart';

/// Compact "ADD" pill that turns into a − qty + stepper once the product is
/// in the cart. Sits on top of product images.
class AddButton extends StatelessWidget {
  final Product product;

  const AddButton({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartModel>();
    final quantity = cart.quantityOf(product.id);
    final colors = Theme.of(context).colorScheme;

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      transitionBuilder: (child, animation) => ScaleTransition(scale: animation, child: child),
      child: quantity == 0
          ? Material(
              key: const ValueKey('add'),
              color: Colors.white,
              elevation: 2,
              shadowColor: Colors.black26,
              shape: StadiumBorder(side: BorderSide(color: colors.primary)),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: () {
                  HapticFeedback.selectionClick();
                  cart.add(product);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  child: Text(
                    'ADD',
                    style: TextStyle(color: colors.primary, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                  ),
                ),
              ),
            )
          : Material(
              key: const ValueKey('stepper'),
              color: colors.primary,
              elevation: 2,
              shadowColor: Colors.black26,
              shape: const StadiumBorder(),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _StepIcon(
                    icon: Icons.remove,
                    tooltip: 'Remove one',
                    onTap: () => cart.decrement(product.id),
                  ),
                  Text('$quantity', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                  _StepIcon(
                    icon: Icons.add,
                    tooltip: 'Add one',
                    onTap: () => cart.add(product),
                  ),
                ],
              ),
            ),
    );
  }
}

class _StepIcon extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _StepIcon({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Padding(
          padding: const EdgeInsets.all(7),
          child: Icon(icon, size: 18, color: Colors.white),
        ),
      ),
    );
  }
}
