# Cash & Carry rider app (Flutter)

Android app for delivery riders: go online, see assigned deliveries, call the
customer, open Google Maps, slide to confirm pickup, confirm delivery with the
cash received, report failed deliveries, and track cash in hand.

It uses the same Supabase project as the dashboard, through the `rider_*`
database functions in `supabase/migrations/20261102030000_rider_app.sql`.
A rider can only see and change their own deliveries.

## Run

```powershell
cd rider_app
flutter pub get
flutter run                                              # demo mode, sample deliveries
flutter run --dart-define-from-file=dart_defines.json    # real Supabase data
flutter build apk --release --dart-define-from-file=dart_defines.json
```

`dart_defines.json` (git-ignored) holds `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`;
see `dart_defines.example.json`.

## Giving a rider access

1. Run the migration above (after the dashboard auth migration).
2. Put the rider's email on their row in `riders` (the `email` column).
3. The rider taps **New rider? Create an account** with that email, confirms it
   from their inbox, then signs in. The first sign-in links the account to the
   rider automatically.

Only verified emails are linked, and a deactivated rider (`is_active = false`)
loses access.

## Delivery flow

| Rider action | Delivery | Order | Rider |
|---|---|---|---|
| Slide to pick up | `out_for_delivery` | `out_for_delivery` | `on_delivery` |
| Confirm delivered + cash | `delivered`, cash saved | `delivered`, paid total updated, cash payment recorded | cash in hand increases |
| Can't deliver + reason | `failed` | delivery status `failed` | back to `available` |
