import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../state/cart.dart';
import '../state/customer_store.dart';
import '../state/home_tabs.dart';
import '../widgets/address_sheet.dart';
import 'cart_screen.dart';
import 'orders_screen.dart';
import 'shop_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tabs = context.watch<HomeTabs>();
    final cartCount = context.select<CartModel, int>((cart) => cart.totalQuantity);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 64,
        title: tabs.value == HomeTabs.shop
            ? const _DeliverToHeader()
            : Text(
                tabs.value == HomeTabs.cart ? 'Your cart' : 'My orders',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
        actions: [
          if (!AppConfig.hasSupabase)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Chip(label: Text('Demo'), visualDensity: VisualDensity.compact),
            ),
        ],
      ),
      body: IndexedStack(
        index: tabs.value,
        children: const [ShopScreen(), CartScreen(), OrdersScreen()],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tabs.value,
        onDestinationSelected: (index) => tabs.value = index,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Shop'),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text('$cartCount'),
              child: const Icon(Icons.shopping_bag),
            ),
            label: 'Cart',
          ),
          const NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Orders'),
        ],
      ),
    );
  }
}

/// "Deliver to" line in the shop header; tapping it edits the saved address.
class _DeliverToHeader extends StatelessWidget {
  const _DeliverToHeader();

  @override
  Widget build(BuildContext context) {
    final store = context.watch<CustomerStore>();
    final details = store.details;
    final colors = Theme.of(context).colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () async {
        final updated = await showAddressSheet(context, initial: details);
        if (updated != null) await store.save(updated);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.location_on, color: colors.primary),
            const SizedBox(width: 6),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Deliver to',
                    style: TextStyle(fontSize: 12, color: colors.outline, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    details == null ? 'Set delivery address' : '${details.address}, ${details.city}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
            const Icon(Icons.keyboard_arrow_down),
          ],
        ),
      ),
    );
  }
}
