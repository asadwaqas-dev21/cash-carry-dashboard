import 'package:flutter/material.dart';

class ProductImage extends StatelessWidget {
  final String? url;
  final double iconSize;

  const ProductImage({super.key, this.url, this.iconSize = 40});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final placeholder = ColoredBox(
      color: colors.primaryContainer.withAlpha(90),
      child: Center(child: Icon(Icons.inventory_2_outlined, size: iconSize, color: colors.primary)),
    );

    if (url == null || url!.isEmpty) return placeholder;
    return Image.network(
      url!,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => placeholder,
    );
  }
}
