import 'package:cash_carry_rider/data/demo_repository.dart';
import 'package:cash_carry_rider/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('go online, pick up, deliver with cash, see it in the cash tab', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.5;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(buildApp(DemoRiderRepository(latency: Duration.zero), requireSignIn: false));
    await tester.pumpAndSettle();

    // Home: rider header, stats and active jobs.
    expect(find.text('Hi, Bilal'), findsOneWidget);
    expect(find.text('Active · 2'), findsOneWidget);
    expect(find.text('Rs 1,850'), findsOneWidget);

    // Status switch.
    await tester.tap(find.text('Break'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Online'));
    await tester.pumpAndSettle();

    // Open the first job and slide to pick it up.
    await tester.tap(find.text('APP-10431'));
    await tester.pumpAndSettle();
    expect(find.text('Ayesha Khan'), findsOneWidget);
    expect(find.text('Collect Rs 4,300.00'), findsOneWidget);
    await tester.drag(find.byKey(const Key('slide-thumb')), const Offset(1000, 0));
    await tester.pumpAndSettle();
    expect(find.text('Mark as delivered'), findsOneWidget);

    // Deliver: the cash field is prefilled with the amount due.
    await tester.tap(find.text('Mark as delivered'));
    await tester.pumpAndSettle();
    expect(find.text('Confirm delivery'), findsOneWidget);
    await tester.drag(find.byKey(const Key('slide-thumb')).last, const Offset(1000, 0));
    await tester.pumpAndSettle();

    // Back on home with updated numbers.
    expect(find.text('Active · 1'), findsOneWidget);
    expect(find.text('Done today · 2'), findsOneWidget);
    expect(find.text('Rs 6,150'), findsOneWidget);

    // Fail the prepaid job with a reason.
    await tester.tap(find.text('APP-10432'));
    await tester.pumpAndSettle();
    await tester.drag(find.byKey(const Key('slide-thumb')), const Offset(1000, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Can’t deliver this order'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mark as not delivered'));
    await tester.pumpAndSettle();
    expect(find.text('Choose a reason.'), findsOneWidget);
    await tester.tap(find.text('Customer not answering'));
    await tester.tap(find.text('Mark as not delivered'));
    await tester.pumpAndSettle();
    expect(find.text('Active · 0'), findsOneWidget);

    // Cash tab lists the new collection.
    await tester.tap(find.text('Cash'));
    await tester.pumpAndSettle();
    expect(find.text('Rs 6,150.00'), findsOneWidget);
    expect(find.text('APP-10431'), findsOneWidget);
    expect(find.text('Collections · 2'), findsOneWidget);
  });
}
