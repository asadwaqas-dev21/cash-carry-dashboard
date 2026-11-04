import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/shop_repository.dart';
import '../format.dart';
import '../models.dart';
import '../state/customer_store.dart';
import '../state/home_tabs.dart';
import '../widgets/message_view.dart';
import '../widgets/order_status_timeline.dart';
import 'order_tracking_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  Future<List<OrderSummary>>? _orders;
  String? _phone;
  late final HomeTabs _tabs;

  @override
  void initState() {
    super.initState();
    // Refetch whenever the user switches to this tab, e.g. right after ordering.
    _tabs = context.read<HomeTabs>()..addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _tabs.removeListener(_onTabChanged);
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabs.value == HomeTabs.orders) _reload();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final phone = Provider.of<CustomerStore>(context).details?.phone;
    if (phone != _phone) {
      _phone = phone;
      _orders = phone == null ? null : context.read<ShopRepository>().fetchOrders(phone);
    }
  }

  Future<void> _reload() async {
    final phone = _phone;
    if (phone == null || !mounted) return;
    final next = context.read<ShopRepository>().fetchOrders(phone);
    setState(() {
      _orders = next;
    });
    await next;
  }

  @override
  Widget build(BuildContext context) {
    final orders = _orders;
    if (orders == null) {
      return const MessageView(
        icon: Icons.receipt_long_outlined,
        text: 'No orders yet.\nOrders you place will show up here.',
      );
    }

    return FutureBuilder(
      future: orders,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return MessageView(
            icon: Icons.cloud_off,
            text: 'Could not load orders.\n${snapshot.error}',
            action: FilledButton(onPressed: _reload, child: const Text('Try again')),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final list = snapshot.data!;
        return RefreshIndicator(
          onRefresh: _reload,
          child: list.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 120),
                  MessageView(icon: Icons.receipt_long_outlined, text: 'No orders yet.'),
                ])
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) => _OrderCard(order: list[index]),
                ),
        );
      },
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderSummary order;

  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final (background, foreground) = _statusColors(order.status, colors);
    final step = orderStepIndex(order.status);
    final preview = order.items.map((line) => '${line.quantity}× ${line.name}').join(', ');

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => OrderTrackingScreen(order: order)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(order.orderNumber, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
                    child: Text(
                      labelize(order.status),
                      style: TextStyle(color: foreground, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '${formatDateTime(order.placedAt)} · ${order.itemsCount} items',
                style: theme.textTheme.bodySmall?.copyWith(color: colors.outline),
              ),
              if (preview.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(preview, maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
              if (step >= 0 && step < 4) ...[
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(value: (step + 1) / 5, minHeight: 6),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(formatMoney(order.grandTotal), style: const TextStyle(fontWeight: FontWeight.w800)),
                  const Spacer(),
                  Text('Track order', style: TextStyle(color: colors.primary, fontWeight: FontWeight.w700)),
                  Icon(Icons.chevron_right, color: colors.primary),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static (Color, Color) _statusColors(String status, ColorScheme colors) {
    switch (status) {
      case 'delivered':
      case 'completed':
      case 'paid':
        return (const Color(0xFFDCFCE7), const Color(0xFF15803D));
      case 'cancelled':
      case 'voided':
      case 'refunded':
        return (const Color(0xFFFEE2E2), const Color(0xFFB91C1C));
      default:
        return (colors.primaryContainer, colors.onPrimaryContainer);
    }
  }
}
