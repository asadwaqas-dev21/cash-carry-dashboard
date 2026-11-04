import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../format.dart';
import '../models.dart';
import '../state/cart.dart';
import 'product_image.dart';

Future<void> showProductSheet(BuildContext context, Product product) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _ProductSheet(product: product),
  );
}

class _ProductSheet extends StatefulWidget {
  final Product product;

  const _ProductSheet({required this.product});

  @override
  State<_ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends State<_ProductSheet> {
  late int _quantity;
  late final bool _inCart;

  @override
  void initState() {
    super.initState();
    final current = context.read<CartModel>().quantityOf(widget.product.id);
    _inCart = current > 0;
    _quantity = _inCart ? current : 1;
  }

  void _apply() {
    HapticFeedback.lightImpact();
    context.read<CartModel>().setQuantity(widget.product, _quantity);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: AspectRatio(aspectRatio: 16 / 10, child: ProductImage(url: product.imageUrl, iconSize: 64)),
          ),
          const SizedBox(height: 16),
          Text(product.name, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          if (product.packSize != null) ...[
            const SizedBox(height: 2),
            Text(product.packSize!, style: theme.textTheme.bodyMedium?.copyWith(color: colors.outline)),
          ],
          const SizedBox(height: 8),
          Text(
            formatMoney(product.price),
            style: theme.textTheme.titleLarge?.copyWith(color: colors.primary, fontWeight: FontWeight.w800),
          ),
          if (product.description != null && product.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(product.description!, style: theme.textTheme.bodyMedium),
          ],
          const SizedBox(height: 24),
          if (!product.inStock)
            const FilledButton(onPressed: null, child: Center(child: Text('Currently out of stock')))
          else
            Row(
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: colors.outlineVariant),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: 'Decrease',
                        onPressed: _quantity > (_inCart ? 0 : 1) ? () => setState(() => _quantity--) : null,
                        icon: const Icon(Icons.remove),
                      ),
                      SizedBox(
                        width: 28,
                        child: Text('$_quantity', textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
                      ),
                      IconButton(
                        tooltip: 'Increase',
                        onPressed: () => setState(() => _quantity++),
                        icon: const Icon(Icons.add),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: _apply,
                    child: Text(
                      _quantity == 0
                          ? 'Remove from cart'
                          : '${_inCart ? 'Update' : 'Add'} · ${formatMoney(product.price * _quantity)}',
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
