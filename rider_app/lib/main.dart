import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'data/demo_repository.dart';
import 'data/rider_repository.dart';
import 'data/supabase_repository.dart';
import 'screens/home_screen.dart';
import 'screens/sign_in_screen.dart';
import 'state/rider_state.dart';
import 'widgets/message_view.dart';

const brandColor = Color(0xFFEA580C);
const canvasColor = Color(0xFFF6F5F2);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (AppConfig.hasSupabase) {
    await Supabase.initialize(url: AppConfig.supabaseUrl, publishableKey: AppConfig.supabaseKey);
    runApp(buildApp(SupabaseRiderRepository(Supabase.instance.client), requireSignIn: true));
  } else {
    runApp(buildApp(DemoRiderRepository(), requireSignIn: false));
  }
}

Widget buildApp(RiderRepository repository, {required bool requireSignIn}) {
  return MultiProvider(
    providers: [
      Provider<RiderRepository>.value(value: repository),
      ChangeNotifierProvider(create: (_) => RiderState(repository)),
    ],
    child: RiderApp(requireSignIn: requireSignIn),
  );
}

class RiderApp extends StatelessWidget {
  final bool requireSignIn;

  const RiderApp({super.key, required this.requireSignIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'C&C Rider',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: brandColor, primary: brandColor),
        scaffoldBackgroundColor: canvasColor,
        appBarTheme: const AppBarTheme(backgroundColor: canvasColor, scrolledUnderElevation: 0),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        ),
        chipTheme: const ChipThemeData(showCheckmark: false),
        bottomSheetTheme: const BottomSheetThemeData(backgroundColor: Colors.white, showDragHandle: true),
      ),
      home: requireSignIn ? const _AuthGate() : const RiderGate(),
    );
  }
}

/// Shows sign-in until there is a Supabase session.
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final auth = Supabase.instance.client.auth;
    return StreamBuilder<AuthState>(
      stream: auth.onAuthStateChange,
      builder: (context, _) {
        final session = auth.currentSession;
        if (session == null) return const SignInScreen();
        return RiderGate(key: ValueKey(session.user.id));
      },
    );
  }
}

/// Loads the rider linked to this account, or explains why there isn't one.
class RiderGate extends StatefulWidget {
  const RiderGate({super.key});

  @override
  State<RiderGate> createState() => _RiderGateState();
}

class _RiderGateState extends State<RiderGate> {
  @override
  void initState() {
    super.initState();
    final state = context.read<RiderState>();
    WidgetsBinding.instance.addPostFrameCallback((_) => state.refresh());
  }

  Future<void> _signOut() async {
    context.read<RiderState>().clear();
    if (AppConfig.hasSupabase) await Supabase.instance.client.auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<RiderState>();

    if (!state.loaded) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (state.rider == null) {
      return Scaffold(
        body: SafeArea(
          child: MessageView(
            icon: state.error != null ? Icons.cloud_off : Icons.badge_outlined,
            text: state.error != null
                ? 'Could not load your rider profile.\n${friendlyError(state.error!)}'
                : 'This account isn’t linked to a rider yet.\nAsk the store to add your email to your rider profile, then try again.',
            action: Wrap(
              spacing: 8,
              children: [
                FilledButton(onPressed: state.refresh, child: const Text('Try again')),
                if (AppConfig.hasSupabase) OutlinedButton(onPressed: _signOut, child: const Text('Sign out')),
              ],
            ),
          ),
        ),
      );
    }
    return HomeScreen(onSignOut: AppConfig.hasSupabase ? _signOut : null);
  }
}
