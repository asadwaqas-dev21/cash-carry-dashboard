# Supabase email templates

Supabase → **Authentication → Emails → Templates**. Replace the link in each
template below so it points at the dashboard's `/auth/confirm` route. These
links use `token_hash`, so they work even when the email is opened in a
different browser or on another device.

Also set **Authentication → URL Configuration → Site URL** to the dashboard
address (`http://localhost:3001` while developing, your real domain later).

## Magic Link

```html
<h2>Sign in to Cash & Carry</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in</a></p>
<p>This link works once and expires soon. If you didn't ask for it, ignore this email.</p>
```

## Confirm signup

```html
<h2>Confirm your email</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm and sign in</a></p>
```

## Reset Password

```html
<h2>Reset your password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Choose a new password</a></p>
<p>If you didn't ask for this, ignore this email.</p>
```

## Change Email Address

```html
<h2>Confirm your new email</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings?tab=profile">Confirm new email</a></p>
```

## Invite user

```html
<h2>You've been invited to Cash & Carry</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept and sign in</a></p>
```
