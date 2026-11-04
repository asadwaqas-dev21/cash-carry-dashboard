import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../data/shop_repository.dart';
import '../format.dart';
import '../models.dart';
import '../state/cart.dart';
import '../state/customer_store.dart';
import '../widgets/address_sheet.dart';
import '../widgets/bill_summary.dart';
import '../widgets/slide_to_confirm.dart';

/// Single-page checkout: address, delivery time, payment, note and bill,
/// confirmed with a slide. Pops with the placed [OrderSummary].
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _notes = TextEditingController();
  DeliverySlot _slot = AppConfig.deliverySlots.first;
  String _payment = AppConfig.paymentMethods.first;
  bool _submitting = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _editAddress() async {
    final store = context.read<CustomerStore>();
    final updated = await showAddressSheet(context, initial: store.details);
    if (updated != null) await store.save(updated);
  }

  Future<void> _placeOrder() async {
    final customer = context.read<CustomerStore>().details;
    if (customer == null) return;

    final cart = context.read<CartModel>();
    final repository = context.read<ShopRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final notes = _notes.text.trim();

    setState(() => _submitting = true);
    try {
      final order = await repository.placeOrder(
        customer: customer,
        items: cart.items,
        deliveryFee: cart.deliveryFee,
        deliverySlot: _slot.label,
        paymentMethod: _payment,
        notes: notes.isEmpty ? null : notes,
      );
      HapticFeedback.heavyImpact();
      cart.clear();
      if (mounted) Navigator.of(context).pop(order);
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text('Could not place order: $error')));
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartModel>();
    final customer = context.watch<CustomerStore>().details;
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout', style: TextStyle(fontWeight: FontWeight.w800))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _Section(
            title: 'Deliver to',
            child: customer == null
                ? OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: _editAddress,
                    icon: const Icon(Icons.add_location_alt_outlined),
                    label: const Text('Add delivery address'),
                  )
                : InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: _editAddress,
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: colors.primaryContainer,
                          child: Icon(Icons.location_on, color: colors.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(customer.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                              Text('${customer.address}, ${customer.city}', maxLines: 2, overflow: TextOverflow.ellipsis),
                              Text(customer.phone, style: TextStyle(color: colors.outline, fontSize: 13)),
                            ],
                          ),
                        ),
                        TextButton(onPressed: _editAddress, child: const Text('Change')),
                      ],
                    ),
                  ),
          ),
          _Section(
            title: 'Delivery time',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final slot in AppConfig.deliverySlots)
                  _OptionTile(
                    selected: slot == _slot,
                    icon: slot == AppConfig.deliverySlots.first ? Icons.bolt : Icons.schedule,
                    title: slot.title,
                    subtitle: slot.window,
                    onTap: () => setState(() => _slot = slot),
                  ),
              ],
            ),
          ),
          _Section(
            title: 'Payment',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final method in AppConfig.paymentMethods)
                  _OptionTile(
                    selected: method == _payment,
                    icon: method.startsWith('Card') ? Icons.credit_card : Icons.payments_outlined,
                    title: method,
                    onTap: () => setState(() => _payment = method),
                  ),
              ],
            ),
          ),
          _Section(
            title: 'Note for the store',
            child: TextField(
              controller: _notes,
              decoration: const InputDecoration(hintText: 'e.g. Ring the bell, call on arrival', isDense: true),
              maxLines: 2,
              minLines: 1,
            ),
          ),
          _Section(title: 'Bill details', child: BillSummary(cart: cart)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (customer == null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('Add a delivery address to place your order', style: TextStyle(color: colors.error)),
                ),
              SlideToConfirm(
                label: 'Slide to pay ${formatMoney(cart.grandTotal)}',
                enabled: customer != null && !cart.isEmpty,
                loading: _submitting,
                onConfirmed: _placeOrder,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _OptionTile({
    required this.selected,
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Semantics(
      selected: selected,
      button: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? colors.primaryContainer.withAlpha(120) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: selected ? colors.primary : colors.outlineVariant, width: selected ? 1.6 : 1),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20, color: selected ? colors.primary : colors.outline),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  if (subtitle != null) Text(subtitle!, style: TextStyle(fontSize: 12, color: colors.outline)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
