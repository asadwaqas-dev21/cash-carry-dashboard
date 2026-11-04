import 'package:flutter/material.dart';

import '../models.dart';

/// Bottom sheet for entering or editing delivery details. Returns the new
/// details, or null if the sheet was dismissed.
Future<CustomerDetails?> showAddressSheet(BuildContext context, {CustomerDetails? initial}) {
  return showModalBottomSheet<CustomerDetails>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _AddressForm(initial: initial),
  );
}

class _AddressForm extends StatefulWidget {
  final CustomerDetails? initial;

  const _AddressForm({this.initial});

  @override
  State<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<_AddressForm> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.initial?.name);
  late final _phone = TextEditingController(text: widget.initial?.phone);
  late final _address = TextEditingController(text: widget.initial?.address);
  late final _city = TextEditingController(text: widget.initial?.city);

  @override
  void dispose() {
    for (final controller in [_name, _phone, _address, _city]) {
      controller.dispose();
    }
    super.dispose();
  }

  String? _required(String? value) => (value == null || value.trim().isEmpty) ? 'Required' : null;

  String? _validatePhone(String? value) {
    final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
    return digits.length < 10 ? 'Enter a valid phone number' : null;
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.pop(
      context,
      CustomerDetails(
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        address: _address.text.trim(),
        city: _city.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Delivery details', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phone,
                decoration: const InputDecoration(
                  labelText: 'Phone number',
                  hintText: '03XX XXXXXXX',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                validator: _validatePhone,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _address,
                decoration: const InputDecoration(
                  labelText: 'House, street, area',
                  prefixIcon: Icon(Icons.home_outlined),
                ),
                textInputAction: TextInputAction.next,
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _city,
                decoration: const InputDecoration(labelText: 'City', prefixIcon: Icon(Icons.location_city_outlined)),
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _save(),
                validator: _required,
              ),
              const SizedBox(height: 20),
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                onPressed: _save,
                child: const Text('Save address'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
