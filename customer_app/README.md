# Cash & Carry customer app (Flutter)

Android app for customers: browse products, add to cart, place a cash-on-delivery
order, and see their past orders. It uses the same Supabase database as the
dashboard in the parent folder.

## Screens

- **Shop**: search, category filter, product grid with add/quantity buttons
- **Cart**: line items, subtotal/tax/delivery, checkout
- **Checkout**: name, phone, address, city, notes. Details are remembered on the device.
- **Orders**: orders placed with the saved phone number, with status

## First-time setup

Requires the [Flutter SDK](https://docs.flutter.dev/get-started/install/windows/mobile)
(3.27 or newer) and Android Studio with an emulator or a phone in USB debugging mode.

This folder contains only the Dart code. Generate the Android project files once:

```powershell
cd customer_app
flutter create . --org com.cashcarry --project-name cash_carry_customer --platforms android
Remove-Item test\widget_test.dart   # template test for the default counter app
flutter pub get
```

## Run

Demo mode (sample products, no backend):

```powershell
flutter run
```

With Supabase: copy `dart_defines.example.json` to `dart_defines.json`, fill in
the URL and publishable key, then:

```powershell
flutter run --dart-define-from-file=dart_defines.json
```

Build an installable APK:

```powershell
flutter build apk --release --dart-define-from-file=dart_defines.json
# output: build\app\outputs\flutter-apk\app-release.apk
```

## Before going live with Supabase

The current RLS policies in `cashcarry_sql_schema.sql` only allow signed-in staff
to read or write data, so the app's anon key will get empty product lists and
failed order inserts. Customers need their own access, for example:

- `select` on `organizations`, `categories`, `products` and `locations` for the anon role
- order placement through a Postgres function (`security definer`) that creates
  the customer, address, order and items in one call. Do this instead of giving
  anon direct insert rights on those tables.
- order history by phone only after verifying the customer (e.g. Supabase phone OTP)

Delivery fee and store name are in `lib/config.dart`.
