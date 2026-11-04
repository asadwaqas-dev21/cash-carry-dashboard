import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Swipe-to-confirm button: the user drags the thumb to the end to trigger
/// [onConfirmed], which prevents accidental orders from a stray tap.
class SlideToConfirm extends StatefulWidget {
  final String label;
  final bool enabled;
  final bool loading;
  final Future<void> Function() onConfirmed;

  const SlideToConfirm({
    super.key,
    required this.label,
    required this.onConfirmed,
    this.enabled = true,
    this.loading = false,
  });

  @override
  State<SlideToConfirm> createState() => _SlideToConfirmState();
}

class _SlideToConfirmState extends State<SlideToConfirm> {
  static const _height = 60.0;
  static const _padding = 5.0;
  static const _thumb = _height - _padding * 2;

  double _offset = 0;
  bool _dragging = false;

  bool get _active => widget.enabled && !widget.loading;

  Future<void> _confirm(double maxOffset) async {
    setState(() {
      _offset = maxOffset;
      _dragging = false;
    });
    HapticFeedback.mediumImpact();
    await widget.onConfirmed();
    if (mounted) setState(() => _offset = 0);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final track = _active || widget.loading ? colors.primary : colors.outlineVariant;

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxOffset = constraints.maxWidth - _thumb - _padding * 2;
        final progress = maxOffset <= 0 ? 0.0 : (_offset / maxOffset).clamp(0.0, 1.0);

        return Semantics(
          button: true,
          enabled: _active,
          label: widget.label,
          onTap: _active ? () => _confirm(maxOffset) : null,
          child: Container(
            height: _height,
            decoration: BoxDecoration(color: track, borderRadius: BorderRadius.circular(_height / 2)),
            child: Stack(
              children: [
                Center(
                  child: Opacity(
                    opacity: widget.loading ? 1 : 1 - progress,
                    child: Padding(
                      padding: const EdgeInsets.only(left: _thumb, right: 16),
                      child: Text(
                        widget.loading ? 'Placing your order…' : widget.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                    ),
                  ),
                ),
                AnimatedPositioned(
                  duration: _dragging ? Duration.zero : const Duration(milliseconds: 250),
                  curve: Curves.easeOutCubic,
                  left: _padding + _offset,
                  top: _padding,
                  child: GestureDetector(
                    key: const Key('slide-thumb'),
                    onHorizontalDragStart: _active ? (_) => setState(() => _dragging = true) : null,
                    onHorizontalDragUpdate: _active
                        ? (details) => setState(() => _offset = (_offset + details.delta.dx).clamp(0.0, maxOffset))
                        : null,
                    onHorizontalDragEnd: _active
                        ? (_) {
                            if (_offset >= maxOffset * 0.8) {
                              _confirm(maxOffset);
                            } else {
                              setState(() {
                                _dragging = false;
                                _offset = 0;
                              });
                            }
                          }
                        : null,
                    child: Container(
                      width: _thumb,
                      height: _thumb,
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: Center(
                        child: widget.loading
                            ? SizedBox.square(
                                dimension: 22,
                                child: CircularProgressIndicator(strokeWidth: 2.5, color: colors.primary),
                              )
                            : Icon(Icons.double_arrow_rounded, color: _active ? colors.primary : colors.outline),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
