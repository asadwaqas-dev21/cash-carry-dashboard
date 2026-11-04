import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Email + password sign-in for riders. New riders create an account with the
/// email the store saved on their rider profile, confirm it, then sign in.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _creating = false;
  bool _busy = false;
  bool _obscure = true;
  String? _message;
  bool _messageIsError = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _message = null;
    });

    final auth = Supabase.instance.client.auth;
    final email = _email.text.trim();
    try {
      if (_creating) {
        final result = await auth.signUp(email: email, password: _password.text);
        if (result.session == null) {
          _show('Check $email and tap the confirmation link, then sign in here.', error: false);
          setState(() => _creating = false);
        }
      } else {
        await auth.signInWithPassword(email: email, password: _password.text);
      }
    } on AuthException catch (e) {
      _show(e.message == 'Invalid login credentials' ? 'Wrong email or password.' : e.message);
    } catch (e) {
      _show('Something went wrong. Check your internet and try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgotPassword() async {
    final email = _email.text.trim();
    if (!email.contains('@')) return _show('Enter your email first.');
    setState(() => _busy = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(email);
      _show('If $email has an account, a reset link is on its way.', error: false);
    } on AuthException catch (e) {
      _show(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _show(String message, {bool error = true}) {
    if (!mounted) return;
    setState(() {
      _message = message;
      _messageIsError = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFC2410C)]),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.delivery_dining, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _creating ? 'Create rider account' : 'Rider sign in',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _creating
                          ? 'Use the email the store saved on your rider profile.'
                          : 'Deliveries, directions and cash — all in one place.',
                      style: TextStyle(color: colors.outline),
                    ),
                    const SizedBox(height: 28),
                    if (_message != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _messageIsError ? colors.errorContainer : const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _message!,
                          style: TextStyle(color: _messageIsError ? colors.onErrorContainer : const Color(0xFF166534)),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                      validator: (v) => (v ?? '').contains('@') ? null : 'Enter a valid email',
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      autofillHints: [_creating ? AutofillHints.newPassword : AutofillHints.password],
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscure ? 'Show password' : 'Hide password',
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                        ),
                      ),
                      validator: (v) => (v ?? '').length < (_creating ? 8 : 1)
                          ? (_creating ? 'Use at least 8 characters' : 'Enter your password')
                          : null,
                    ),
                    if (!_creating)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(onPressed: _busy ? null : _forgotPassword, child: const Text('Forgot password?')),
                      )
                    else
                      const SizedBox(height: 16),
                    FilledButton(
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                          : Text(_creating ? 'Create account' : 'Sign in', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() {
                                _creating = !_creating;
                                _message = null;
                              }),
                      child: Text(_creating ? 'I already have an account' : 'New rider? Create an account'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
