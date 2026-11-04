class AppConfig {
  // Passed at build time, e.g. --dart-define-from-file=dart_defines.json.
  // When either is empty the app runs in demo mode with sample products.
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  static bool get hasSupabase => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;

  static const storeName = 'Cash & Carry';

  // Flat delivery charge added to every order; set to your actual rate.
  static const double deliveryFee = 0;

  // Shown as choices at checkout and saved in the order notes. Adjust to the
  // slots and payment options the store actually offers.
  static const deliverySlots = [
    DeliverySlot('Express', '30–45 min'),
    DeliverySlot('This evening', '6–9 PM'),
    DeliverySlot('Tomorrow', '10 AM–1 PM'),
  ];

  static const paymentMethods = ['Cash on delivery', 'Card on delivery'];
}

class DeliverySlot {
  final String title;
  final String window;

  const DeliverySlot(this.title, this.window);

  String get label => '$title ($window)';
}
