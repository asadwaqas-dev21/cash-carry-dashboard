import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../format.dart';
import '../models.dart';
import '../state/rider_state.dart';
import '../widgets/job_widgets.dart';
import '../widgets/slide_to_confirm.dart';

/// One delivery: who, where, what, how much to collect, and the next action.
class DeliveryScreen extends StatefulWidget {
  final String jobId;

  const DeliveryScreen({super.key, required this.jobId});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  bool _busy = false;

  Future<void> _pickUp() async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      await context.read<RiderState>().pickUp(widget.jobId);
      messenger.showSnackBar(const SnackBar(content: Text('Picked up. Drive safe!')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(friendlyError(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deliver(DeliveryJob job) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _DeliverSheet(job: job),
    );
    if (done == true && mounted) Navigator.of(context).pop();
  }

  Future<void> _fail(DeliveryJob job) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _FailSheet(job: job),
    );
    if (done == true && mounted) Navigator.of(context).pop();
  }

  Future<void> _call(String phone) async {
    final ok = await launchUrl(Uri(scheme: 'tel', path: phone.replaceAll(' ', '')));
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open the phone app.')));
    }
  }

  Future<void> _navigate(DeliveryJob job) async {
    final destination = job.latitude != null && job.longitude != null
        ? '${job.latitude},${job.longitude}'
        : job.fullAddress;
    final uri = Uri.https('www.google.com', '/maps/dir/', {'api': '1', 'destination': destination});
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open Maps.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = context.watch<RiderState>().jobById(widget.jobId);
    if (job == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('This delivery is no longer assigned to you.')));
    }
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(job.orderNumber, style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: [Padding(padding: const EdgeInsets.only(right: 16), child: JobStatusChip(status: job.status))],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          _Steps(job: job),
          const SizedBox(height: 14),
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: colors.primaryContainer,
                      child: Text(initials(job.customerName), style: TextStyle(color: colors.primary, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(job.customerName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          if (job.customerPhone != null) Text(job.customerPhone!, style: TextStyle(color: colors.outline)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.location_on, color: colors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(job.fullAddress.isEmpty ? 'No address on file' : job.fullAddress, style: const TextStyle(fontSize: 15)),
                    ),
                  ],
                ),
                if (job.deliveryNotes != null && job.deliveryNotes!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFFEF9C3), borderRadius: BorderRadius.circular(10)),
                    child: Text('📝 ${job.deliveryNotes!}'),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    if (job.customerPhone != null)
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                          onPressed: () => _call(job.customerPhone!),
                          icon: const Icon(Icons.call),
                          label: const Text('Call'),
                        ),
                      ),
                    if (job.customerPhone != null) const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.tonalIcon(
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                        onPressed: job.fullAddress.isEmpty && job.latitude == null ? null : () => _navigate(job),
                        icon: const Icon(Icons.navigation),
                        label: const Text('Navigate'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Items · ${job.items.length}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 8),
                for (final item in job.items)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: colors.primaryContainer, borderRadius: BorderRadius.circular(6)),
                          child: Text('${item.quantityLabel}×', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text(item.name)),
                      ],
                    ),
                  ),
                if (job.notes != null && job.notes!.isNotEmpty) ...[
                  const Divider(height: 24),
                  Text(job.notes!, style: TextStyle(color: colors.outline)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Card(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Order total ${formatMoney(job.grandTotal)}', style: TextStyle(color: colors.outline)),
                      const SizedBox(height: 2),
                      Text(
                        job.status == 'delivered'
                            ? 'Collected ${formatMoney(job.cashCollected)}'
                            : job.cashToCollect > 0
                                ? 'Collect ${formatMoney(job.cashToCollect)}'
                                : 'Prepaid — nothing to collect',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.payments_outlined, size: 32, color: colors.primary),
              ],
            ),
          ),
          if (job.status == 'failed' && job.failureReason != null) ...[
            const SizedBox(height: 14),
            _Card(child: Text('Not delivered: ${job.failureReason}', style: TextStyle(color: colors.error, fontWeight: FontWeight.w600))),
          ],
        ],
      ),
      bottomNavigationBar: job.isActive
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (job.status == 'assigned')
                      SlideToConfirm(label: 'Slide when picked up', loading: _busy, onConfirmed: _pickUp)
                    else
                      FilledButton.icon(
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                        onPressed: () => _deliver(job),
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Mark as delivered', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      ),
                    TextButton(
                      onPressed: _busy ? null : () => _fail(job),
                      style: TextButton.styleFrom(foregroundColor: colors.error),
                      child: const Text('Can’t deliver this order'),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}

class _Steps extends StatelessWidget {
  final DeliveryJob job;

  const _Steps({required this.job});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final reached = switch (job.status) {
      'assigned' => 0,
      'picked_up' || 'out_for_delivery' => 1,
      'delivered' => 2,
      _ => -1,
    };
    final steps = [
      ('Assigned', job.assignedAt),
      ('Picked up', job.pickedUpAt),
      ('Delivered', job.deliveredAt),
    ];

    return _Card(
      child: Row(
        children: [
          for (var i = 0; i < steps.length; i++) ...[
            Expanded(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: i <= reached ? colors.primary : colors.surfaceContainerHighest,
                    child: Icon(i < reached || reached == 2 ? Icons.check : Icons.circle, size: i <= reached ? 16 : 8, color: i <= reached ? Colors.white : colors.outline),
                  ),
                  const SizedBox(height: 6),
                  Text(steps[i].$1, style: TextStyle(fontWeight: i == reached ? FontWeight.w800 : FontWeight.w500, fontSize: 13)),
                  Text(steps[i].$2 == null ? ' ' : formatTime(steps[i].$2!), style: TextStyle(color: colors.outline, fontSize: 11)),
                ],
              ),
            ),
            if (i < steps.length - 1)
              Expanded(
                child: Container(
                  height: 2.5,
                  margin: const EdgeInsets.only(bottom: 32),
                  color: i < reached ? colors.primary : colors.outlineVariant,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;

  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: child,
    );
  }
}

/// Confirms delivery and the cash actually received.
class _DeliverSheet extends StatefulWidget {
  final DeliveryJob job;

  const _DeliverSheet({required this.job});

  @override
  State<_DeliverSheet> createState() => _DeliverSheetState();
}

class _DeliverSheetState extends State<_DeliverSheet> {
  late final _cash = TextEditingController(text: widget.job.cashToCollect.toStringAsFixed(0));
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _cash.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final amount = double.tryParse(_cash.text.trim());
    if (amount == null || amount < 0) {
      setState(() => _error = 'Enter the cash you received (0 if none).');
      return;
    }
    final state = context.read<RiderState>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await state.deliver(widget.job.id, amount);
      HapticFeedback.heavyImpact();
      navigator.pop(true);
      messenger.showSnackBar(SnackBar(content: Text('${widget.job.orderNumber} delivered 🎉')));
    } catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _error = friendlyError(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final amount = double.tryParse(_cash.text.trim());
    final mismatch = amount != null && widget.job.cashToCollect > 0 && amount != widget.job.cashToCollect;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Confirm delivery', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            widget.job.cashToCollect > 0 ? 'To collect: ${formatMoney(widget.job.cashToCollect)}' : 'This order is prepaid.',
            style: TextStyle(color: Theme.of(context).colorScheme.outline),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _cash,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() {}),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(labelText: 'Cash received', prefixText: 'Rs '),
          ),
          if (mismatch)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('This is different from the amount due. Double-check before confirming.', style: TextStyle(color: Colors.orange.shade800)),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          const SizedBox(height: 20),
          SlideToConfirm(label: 'Slide to confirm delivery', loading: _submitting, onConfirmed: _confirm),
        ],
      ),
    );
  }
}

class _FailSheet extends StatefulWidget {
  final DeliveryJob job;

  const _FailSheet({required this.job});

  @override
  State<_FailSheet> createState() => _FailSheetState();
}

class _FailSheetState extends State<_FailSheet> {
  String? _reason;
  final _other = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _other.dispose();
    super.dispose();
  }

  String get _finalReason => _reason == 'Other' ? _other.text.trim() : (_reason ?? '');

  Future<void> _submit() async {
    if (_finalReason.isEmpty) {
      setState(() => _error = 'Choose a reason.');
      return;
    }
    final state = context.read<RiderState>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await state.fail(widget.job.id, _finalReason);
      navigator.pop(true);
      messenger.showSnackBar(SnackBar(content: Text('${widget.job.orderNumber} marked as not delivered')));
    } catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _error = friendlyError(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Why couldn’t you deliver?', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final reason in [...AppConfig.failureReasons, 'Other'])
                ChoiceChip(
                  label: Text(reason),
                  selected: _reason == reason,
                  onSelected: (_) => setState(() => _reason = reason),
                ),
            ],
          ),
          if (_reason == 'Other') ...[
            const SizedBox(height: 12),
            TextField(controller: _other, decoration: const InputDecoration(labelText: 'Describe what happened')),
          ],
          if (_error != null)
            Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: TextStyle(color: colors.error))),
          const SizedBox(height: 20),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54), backgroundColor: colors.error),
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Text('Mark as not delivered', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
