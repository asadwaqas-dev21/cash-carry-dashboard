import 'package:cash_carry_customer/data/demo_repository.dart';
import 'package:cash_carry_customer/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> pumpApp(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(buildApp(repository: DemoShopRepository(), prefs: prefs));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('browse, add to cart, slide to order, track and reorder', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);

    await pumpApp(tester);

    // Shop: ADD pill turns into a stepper; floating cart bar shows the total.
    expect(find.text('Sella Basmati Rice'), findsOneWidget);
    expect(find.text('Set delivery address'), findsOneWidget);
    await tester.tap(find.text('ADD').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Add one').first);
    await tester.pumpAndSettle();
    expect(find.text('2 items'), findsOneWidget);
    expect(find.text('Rs 4,300.00'), findsOneWidget);

    // Product sheet: tap a card, pick quantity, add.
    await tester.tap(find.text('Chakki Atta'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add · Rs 1,480.00'));
    await tester.pumpAndSettle();
    expect(find.text('3 items'), findsOneWidget);

    // Category filter hides other categories.
    final beverages = find.widgetWithText(ChoiceChip, 'Beverages');
    await tester.scrollUntilVisible(
      beverages,
      150,
      scrollable: find.descendant(of: find.byType(ListView).first, matching: find.byType(Scrollable)),
    );
    await tester.ensureVisible(beverages);
    await tester.pumpAndSettle();
    await tester.tap(beverages);
    await tester.pumpAndSettle();
    expect(find.text('Sella Basmati Rice'), findsNothing);
    expect(find.text('Black Tea'), findsOneWidget);

    // Cart.
    await tester.tap(find.text('View cart'));
    await tester.pumpAndSettle();
    expect(find.text('Your cart'), findsOneWidget);
    expect(find.text('Rs 5,780.00'), findsWidgets);

    // Checkout: slide is locked until an address is added.
    await tester.tap(find.text('Proceed to checkout'));
    await tester.pumpAndSettle();
    expect(find.text('Add a delivery address to place your order'), findsOneWidget);
    await tester.drag(find.byKey(const Key('slide-thumb')), const Offset(1000, 0));
    await tester.pumpAndSettle();
    expect(find.text('Checkout'), findsOneWidget);

    await tester.tap(find.text('Add delivery address'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save address'));
    await tester.pumpAndSettle();
    expect(find.text('Required'), findsWidgets);
    await tester.enterText(find.widgetWithText(TextFormField, 'Full name'), 'Ali Khan');
    await tester.enterText(find.widgetWithText(TextFormField, 'Phone number'), '03001234567');
    await tester.enterText(find.widgetWithText(TextFormField, 'House, street, area'), 'House 1, Street 2');
    await tester.enterText(find.widgetWithText(TextFormField, 'City'), 'Lahore');
    await tester.tap(find.text('Save address'));
    await tester.pumpAndSettle();
    expect(find.text('Ali Khan'), findsOneWidget);

    await tester.tap(find.text('This evening'));
    await tester.tap(find.text('Card on delivery'));
    await tester.pumpAndSettle();

    // Slide to place the order (spinner keeps animating, so pump fixed time).
    await tester.drag(find.byKey(const Key('slide-thumb')), const Offset(1000, 0));
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();

    // Tracking screen with success header, timeline and items.
    expect(find.text('Order placed!'), findsOneWidget);
    expect(find.text('Order placed'), findsOneWidget);
    expect(find.text('2×'), findsOneWidget);
    expect(find.text('Rs 5,780.00'), findsOneWidget);

    await tester.tap(find.text('Continue shopping'));
    await tester.pumpAndSettle();
    expect(find.text('House 1, Street 2, Lahore'), findsOneWidget);
    expect(find.text('View cart').hitTestable(), findsNothing);

    // Orders tab lists it; reorder refills the cart.
    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    expect(find.text('Pending'), findsOneWidget);
    await tester.tap(find.text('Track order'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reorder'));
    await tester.pumpAndSettle();
    expect(find.text('Your cart'), findsOneWidget);
    expect(find.text('Items added to your cart'), findsOneWidget);
    expect(find.text('Rs 5,780.00'), findsWidgets);
  });
}
