import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/shop_repository.dart';
import '../format.dart';
import '../models.dart';
import '../widgets/add_button.dart';
import '../widgets/floating_cart_bar.dart';
import '../widgets/message_view.dart';
import '../widgets/product_image.dart';
import '../widgets/product_sheet.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  late Future<(List<Category>, List<Product>)> _catalogue;
  String _query = '';
  String? _categoryId;

  @override
  void initState() {
    super.initState();
    _catalogue = _load();
  }

  Future<(List<Category>, List<Product>)> _load() async {
    final repository = context.read<ShopRepository>();
    final categories = await repository.fetchCategories();
    final products = await repository.fetchProducts();
    return (categories, products);
  }

  Future<void> _reload() async {
    final next = _load();
    setState(() {
      _catalogue = next;
    });
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _catalogue,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return MessageView(
            icon: Icons.cloud_off,
            text: 'Could not load products.\n${snapshot.error}',
            action: FilledButton(onPressed: _reload, child: const Text('Try again')),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final (categories, products) = snapshot.data!;
        final query = _query.trim().toLowerCase();
        final visible = products
            .where((p) => _categoryId == null || p.categoryId == _categoryId)
            .where((p) => query.isEmpty || p.name.toLowerCase().contains(query) || p.sku.toLowerCase().contains(query))
            .toList();

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search rice, oil, tea…',
                  prefixIcon: const Icon(Icons.search),
                  isDense: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                ),
                onChanged: (value) => setState(() => _query = value),
              ),
            ),
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  for (final category in [null, ...categories])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(category?.name ?? 'All'),
                        selected: _categoryId == category?.id,
                        shape: const StadiumBorder(),
                        onSelected: (_) => setState(() => _categoryId = category?.id),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  RefreshIndicator(
                    onRefresh: _reload,
                    child: visible.isEmpty
                        ? ListView(children: const [
                            SizedBox(height: 120),
                            MessageView(icon: Icons.search_off, text: 'No products found'),
                          ])
                        : GridView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 220,
                              mainAxisExtent: 262,
                              mainAxisSpacing: 14,
                              crossAxisSpacing: 14,
                            ),
                            itemCount: visible.length,
                            itemBuilder: (context, index) => _ProductCard(product: visible[index]),
                          ),
                  ),
                  const Positioned(left: 16, right: 16, bottom: 12, child: FloatingCartBar()),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;

  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => showProductSheet(context, product),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(6),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: ProductImage(url: product.imageUrl),
                    ),
                  ),
                  if (!product.inStock)
                    Container(
                      margin: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: Colors.white.withAlpha(170), borderRadius: BorderRadius.circular(14)),
                      alignment: Alignment.center,
                      child: Text('Out of stock', style: TextStyle(color: colors.outline, fontWeight: FontWeight.w700)),
                    ),
                  if (product.inStock)
                    Positioned(right: 12, bottom: 12, child: AddButton(product: product)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(formatMoney(product.price), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodyMedium),
                  if (product.packSize != null)
                    Text(product.packSize!, style: theme.textTheme.bodySmall?.copyWith(color: colors.outline)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
