class AppConfig {
  // Passed at build time, e.g. --dart-define-from-file=dart_defines.json.
  // When either is empty the app runs in demo mode with sample deliveries.
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  static bool get hasSupabase => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;

  static const failureReasons = [
    'Customer not answering',
    'Wrong or incomplete address',
    'Customer refused the order',
    'Customer asked to reschedule',
    'Vehicle problem',
  ];
}
