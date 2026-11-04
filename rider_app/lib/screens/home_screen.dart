import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../format.dart';
import '../models.dart';
import '../state/rider_state.dart';
import '../widgets/job_widgets.dart';
import '../widgets/message_view.dart';
import 'delivery_screen.dart';

class HomeScreen extends StatefulWidget {
  final Future<void> Function()? onSignOut;

  const HomeScreen({super.key, this.onSignOut});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<RiderState>();
    final rider = state.rider!;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: state.refresh,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                  child: _Header(rider: rider, activeCount: state.activeJobs.length, onSignOut: widget.onSignOut)),
              if (_tab == 0) ..._jobSlivers(context, state) else ..._cashSlivers(context, state),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (index) => setState(() => _tab = index),
        destinations: [
          NavigationDestination(
            icon: Badge(
              isLabelVisible: state.activeJobs.isNotEmpty,
              label: Text('${state.activeJobs.length}'),
              child: const Icon(Icons.delivery_dining_outlined),
            ),
            selectedIcon: const Icon(Icons.delivery_dining),
            label: 'Deliveries',
          ),
          const NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined),
              selectedIcon: Icon(Icons.account_balance_wallet),
              label: 'Cash'),
        ],
      ),
    );
  }

  void _openJob(DeliveryJob job) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => DeliveryScreen(jobId: job.id)));
  }

  List<Widget> _jobSlivers(BuildContext context, RiderState state) {
    final active = state.activeJobs;
    final finished = state.finishedJobs;

    if (active.isEmpty && finished.isEmpty) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: MessageView(icon: Icons.inbox_outlined, text: 'No deliveries assigned yet.\nPull down to refresh.'),
        ),
      ];
    }

    return [
      _sectionTitle('Active', active.length),
      if (active.isEmpty)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('Nothing in hand right now. New jobs appear here.'),
          ),
        ),
      _jobList(active),
      if (finished.isNotEmpty) ...[
        _sectionTitle('Done today', finished.length),
        _jobList(finished),
      ],
    ];
  }

  Widget _sectionTitle(String title, int count) => SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
          child: Text('$title · $count', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        ),
      );

  Widget _jobList(List<DeliveryJob> jobs) => SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverList.separated(
          itemCount: jobs.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) => JobCard(job: jobs[index], onTap: () => _openJob(jobs[index])),
        ),
      );

  List<Widget> _cashSlivers(BuildContext context, RiderState state) {
    final cash = state.cash;
    final colors = Theme.of(context).colorScheme;

    return [
      SliverToBoxAdapter(
        child: Container(
          margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: const Color(0xFF0C0A09), borderRadius: BorderRadius.circular(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Cash in hand', style: TextStyle(color: Colors.white70)),
              const SizedBox(height: 4),
              Text(formatMoney(cash.cashOnHand),
                  style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('Hand this over at the counter at the end of your shift.',
                  style: TextStyle(color: Colors.white60, fontSize: 13)),
            ],
          ),
        ),
      ),
      _sectionTitle('Collections', cash.collections.length),
      if (cash.collections.isEmpty)
        const SliverToBoxAdapter(
          child: Padding(padding: EdgeInsets.symmetric(horizontal: 20), child: Text('No cash collected today.')),
        ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverList.separated(
          itemCount: cash.collections.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final row = cash.collections[index];
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: row.handedOver ? const Color(0xFFDCFCE7) : colors.primaryContainer,
                    child: Icon(row.handedOver ? Icons.check : Icons.payments_outlined,
                        color: row.handedOver ? const Color(0xFF15803D) : colors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(row.orderNumber, style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text(
                          '${formatTime(row.collectedAt)} · ${row.handedOver ? 'Handed over' : 'With you'}',
                          style: TextStyle(color: colors.outline, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  Text(formatMoney(row.amount), style: const TextStyle(fontWeight: FontWeight.w800)),
                ],
              ),
            );
          },
        ),
      ),
    ];
  }
}

class _Header extends StatelessWidget {
  final Rider rider;
  final int activeCount;
  final Future<void> Function()? onSignOut;

  const _Header({required this.rider, required this.activeCount, this.onSignOut});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFF97316), Color(0xFFC2410C)]),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: const Color(0xFFEA580C).withAlpha(70), blurRadius: 24, offset: const Offset(0, 10))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: Colors.white.withAlpha(50),
                child: Text(initials(rider.fullName),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hi, ${rider.fullName.split(' ').first}',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      [rider.riderCode, rider.vehicle, rider.storeName]
                          .whereType<String>()
                          .where((s) => s.isNotEmpty)
                          .join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ],
                ),
              ),
              if (onSignOut != null)
                IconButton(
                  tooltip: 'Sign out',
                  onPressed: onSignOut,
                  icon: const Icon(Icons.logout, color: Colors.white),
                ),
              if (!AppConfig.hasSupabase) const Chip(label: Text('Demo'), visualDensity: VisualDensity.compact),
            ],
          ),
          const SizedBox(height: 18),
          _StatusSwitch(rider: rider),
          const SizedBox(height: 16),
          Row(
            children: [
              _Stat(label: 'Active', value: '$activeCount'),
              _Stat(label: 'Delivered today', value: '${rider.deliveredToday}'),
              _Stat(label: 'Cash in hand', value: formatMoney(rider.cashOnHand, decimals: 0)),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;

  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          ),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }
}

/// Online / Break / Offline. Locked while the rider has an order in hand.
class _StatusSwitch extends StatefulWidget {
  final Rider rider;

  const _StatusSwitch({required this.rider});

  @override
  State<_StatusSwitch> createState() => _StatusSwitchState();
}

class _StatusSwitchState extends State<_StatusSwitch> {
  bool _saving = false;

  static const _options = [
    (RiderStatus.available, 'Online', Icons.circle),
    (RiderStatus.onBreak, 'Break', Icons.coffee),
    (RiderStatus.offShift, 'Offline', Icons.power_settings_new),
  ];

  Future<void> _set(RiderStatus status) async {
    if (status == widget.rider.status || _saving) return;
    HapticFeedback.selectionClick();
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);
    try {
      await context.read<RiderState>().setStatus(status);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(friendlyError(e))));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.rider.status == RiderStatus.onDelivery) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(color: Colors.white.withAlpha(40), borderRadius: BorderRadius.circular(16)),
        child: const Row(
          children: [
            Icon(Icons.delivery_dining, color: Colors.white),
            SizedBox(width: 8),
            Text('On a delivery', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: Colors.black.withAlpha(40), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          for (final (status, label, icon) in _options)
            Expanded(
              child: Semantics(
                button: true,
                selected: widget.rider.status == status,
                child: GestureDetector(
                  onTap: () => _set(status),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: widget.rider.status == status ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            icon,
                            size: 14,
                            color: widget.rider.status == status
                                ? (status == RiderStatus.available ? const Color(0xFF16A34A) : const Color(0xFF0C0A09))
                                : Colors.white,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            label,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: widget.rider.status == status ? const Color(0xFF0C0A09) : Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
