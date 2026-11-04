import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../format.dart';
import '../models.dart';
import '../state/cart.dart';
import '../state/home_tabs.dart';
import '../widgets/bill_summary.dart';
import '../widgets/message_view.dart';
import '../widgets/product_image.dart';
import '../widgets/quantity_stepper.dart';
import 'checkout_screen.dart';
import 'order_tracking_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  Future<void> _checkout(BuildContext context) async {
    final navigator = Navigator.of(context);
    final tabs = context.read<HomeTabs>();
    final order = await navigator.push<OrderSummary>(
      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
    );
    if (order == null) return;
    tabs.value = HomeTabs.orders;
    navigator.push(MaterialPageRoute(builder: (_) => OrderTrackingScreen(order: order, justPlaced: true)));
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartModel>();
    final theme = Theme.of(context);

    if (cart.isEmpty) {
      return MessageView(
        icon: Icons.shopping_bag_outlined,
        text: 'Your cart is empty.\nAdd something tasty!',
        action: FilledButton(
          onPressed: () => context.read<HomeTabs>().value = HomeTabs.shop,
          child: const Text('Start shopping'),
        ),
      );
    }

    final items = cart.items;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Card(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.bolt, color: theme.colorScheme.primary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Express delivery in ${AppConfig.deliverySlots.first.window}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    for (final item in items) ...[
                      Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: SizedBox.square(dimension: 54, child: ProductImage(url: item.product.imageUrl, iconSize: 22)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall),
                                if (item.product.packSize != null)
                                  Text(item.product.packSize!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                                const SizedBox(height: 2),
                                Text(formatMoney(item.subtotal), style: const TextStyle(fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ),
                          QuantityStepper(
                            quantity: item.quantity,
                            onAdd: () => cart.add(item.product),
                            onRemove: () => cart.decrement(item.product.id),
                          ),
                        ],
                      ),
                      if (item != items.last) const SizedBox(height: 14),
                    ],
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: () => context.read<HomeTabs>().value = HomeTabs.shop,
                        icon: const Icon(Icons.add),
                        label: const Text('Add more items'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bill details', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    const SizedBox(height: 10),
                    BillSummary(cart: cart),
                  ],
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 12, offset: const Offset(0, -2))],
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(formatMoney(cart.grandTotal), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  Text('Total', style: TextStyle(color: theme.colorScheme.outline, fontSize: 12)),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                  onPressed: () => _checkout(context),
                  child: const Text('Proceed to checkout', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;

  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
      child: child,
    );
  }
}
