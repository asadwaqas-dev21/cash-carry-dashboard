import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/shop_repository.dart';
import '../format.dart';
import '../models.dart';
import '../state/cart.dart';
import '../state/home_tabs.dart';
import '../widgets/order_status_timeline.dart';

/// Order status page: success celebration right after checkout, a step
/// timeline, the items, and one-tap reorder. Pull down to refresh the status.
class OrderTrackingScreen extends StatefulWidget {
  final OrderSummary order;
  final bool justPlaced;

  const OrderTrackingScreen({super.key, required this.order, this.justPlaced = false});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  late OrderSummary _order = widget.order;
  bool _reordering = false;

  Future<void> _refresh() async {
    final latest = await context.read<ShopRepository>().fetchOrder(_order.id);
    if (latest != null && mounted) setState(() => _order = latest);
  }

  Future<void> _reorder() async {
    final repository = context.read<ShopRepository>();
    final cart = context.read<CartModel>();
    final tabs = context.read<HomeTabs>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    setState(() => _reordering = true);
    try {
      final products = {for (final p in await repository.fetchProducts()) p.id: p};
      var added = 0;
      for (final line in _order.items) {
        final product = products[line.productId];
        if (product == null || !product.inStock) continue;
        cart.setQuantity(product, cart.quantityOf(product.id) + line.quantity);
        added++;
      }
      final skipped = _order.items.length - added;
      tabs.value = HomeTabs.cart;
      navigator.popUntil((route) => route.isFirst);
      messenger.showSnackBar(SnackBar(
        content: Text(skipped == 0
            ? 'Items added to your cart'
            : '$added items added · $skipped no longer available'),
      ));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text('Could not reorder: $error')));
      if (mounted) setState(() => _reordering = false);
    }
  }

  void _continueShopping() {
    context.read<HomeTabs>().value = HomeTabs.shop;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(order.orderNumber, style: const TextStyle(fontWeight: FontWeight.w800))),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.justPlaced) const _SuccessHeader(),
            _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(child: Text('Order status', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                      Text(formatDateTime(order.placedAt), style: TextStyle(color: colors.outline, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  OrderStatusTimeline(status: order.status),
                ],
              ),
            ),
            const SizedBox(height: 14),
            _Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${order.itemsCount} items', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 10),
                  for (final line in order.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: colors.primaryContainer,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('${line.quantity}×', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(line.name)),
                          Text(formatMoney(line.total)),
                        ],
                      ),
                    ),
                  const Divider(height: 24),
                  Row(
                    children: [
                      const Text('Total', style: TextStyle(fontWeight: FontWeight.w800)),
                      const Spacer(),
                      Text(formatMoney(order.grandTotal), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Row(
            children: [
              if (order.items.isNotEmpty)
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: _reordering ? null : _reorder,
                    icon: const Icon(Icons.replay),
                    label: const Text('Reorder'),
                  ),
                ),
              if (order.items.isNotEmpty && widget.justPlaced) const SizedBox(width: 12),
              if (widget.justPlaced)
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: _continueShopping,
                    child: const Text('Continue shopping'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SuccessHeader extends StatelessWidget {
  const _SuccessHeader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 20),
      child: Column(
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 600),
            curve: Curves.elasticOut,
            builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(color: Colors.green.shade600, shape: BoxShape.circle),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 56),
            ),
          ),
          const SizedBox(height: 14),
          Text('Order placed!', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            'The store will confirm it shortly.',
            style: TextStyle(color: Theme.of(context).colorScheme.outline),
          ),
        ],
      ),
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
