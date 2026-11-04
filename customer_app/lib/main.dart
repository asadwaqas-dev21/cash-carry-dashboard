import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'data/demo_repository.dart';
import 'data/shop_repository.dart';
import 'data/supabase_repository.dart';
import 'screens/home_screen.dart';
import 'state/cart.dart';
import 'state/customer_store.dart';
import 'state/home_tabs.dart';

const brandColor = Color(0xFFEA580C);
const canvasColor = Color(0xFFFAFAF7);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final ShopRepository repository;
  if (AppConfig.hasSupabase) {
    await Supabase.initialize(url: AppConfig.supabaseUrl, publishableKey: AppConfig.supabaseKey);
    repository = SupabaseShopRepository(Supabase.instance.client);
  } else {
    repository = DemoShopRepository();
  }

  final prefs = await SharedPreferences.getInstance();

  runApp(buildApp(repository: repository, prefs: prefs));
}

Widget buildApp({required ShopRepository repository, required SharedPreferences prefs}) {
  return MultiProvider(
    providers: [
      Provider<ShopRepository>.value(value: repository),
      ChangeNotifierProvider(create: (_) => CartModel()),
      ChangeNotifierProvider(create: (_) => CustomerStore(prefs)),
      ChangeNotifierProvider(create: (_) => HomeTabs()),
    ],
    child: const CustomerApp(),
  );
}

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.storeName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: brandColor, primary: brandColor),
        scaffoldBackgroundColor: canvasColor,
        appBarTheme: const AppBarTheme(backgroundColor: canvasColor, scrolledUnderElevation: 0),
        cardTheme: const CardThemeData(elevation: 0, margin: EdgeInsets.zero),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        ),
        chipTheme: const ChipThemeData(showCheckmark: false),
        bottomSheetTheme: const BottomSheetThemeData(backgroundColor: Colors.white, showDragHandle: true),
      ),
      home: const HomeScreen(),
    );
  }
}
