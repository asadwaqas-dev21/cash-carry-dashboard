import 'package:cash_carry_customer/models.dart';
import 'package:cash_carry_customer/state/cart.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const rice = Product(id: 'rice', name: 'Rice', sku: 'R1', price: 100);
  const soap = Product(id: 'soap', name: 'Soap', sku: 'S1', price: 50, taxRate: 10);

  test('adds, increments and removes items', () {
    final cart = CartModel()
      ..add(rice)
      ..add(rice)
      ..add(soap);

    expect(cart.quantityOf('rice'), 2);
    expect(cart.totalQuantity, 3);

    cart
      ..decrement('rice')
      ..decrement('rice');
    expect(cart.quantityOf('rice'), 0);
    expect(cart.items.length, 1);
  });

  test('totals include tax', () {
    final cart = CartModel()
      ..add(rice)
      ..add(soap)
      ..add(soap);

    expect(cart.subtotal, 200);
    expect(cart.taxTotal, 10);
    expect(cart.grandTotal, 210 + cart.deliveryFee);
  });
}
