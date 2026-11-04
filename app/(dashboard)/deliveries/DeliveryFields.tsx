import { Field, Hidden, Row, Select, TextArea } from '@/components/admin/fields';
import { formatMoney } from '@/lib/format';

type Rider = { id: string; full_name: string; rider_code: string; status: string };

function riderOptions(riders: Rider[]) {
  return riders.map((r) => ({ value: r.id, label: `${r.full_name} (${r.rider_code}) · ${r.status.replace(/_/g, ' ')}` }));
}

/** New delivery: pick the order (or pass `order` to fix it) and an optional rider. */
export function NewDeliveryFields({ orders, order, riders }: { orders?: any[]; order?: any; riders: Rider[] }) {
  return (
    <>
      {order ? (
        <Hidden name="order_id" value={order.id} />
      ) : (
        <Select
          label="Order"
          name="order_id"
          required
          placeholder="Choose an order"
          options={(orders || []).map((o) => ({
            value: o.id,
            label: `#${o.order_number} · ${o.customers?.display_name || 'Walk-in'} · ${formatMoney(o.grand_total)}`,
          }))}
          hint="Open orders without an active delivery"
        />
      )}
      <Select label="Rider" name="rider_id" placeholder="Assign later" options={riderOptions(riders)} />
      <Field
        label="Cash to collect (Rs)"
        name="cash_to_collect"
        type="number"
        step="0.01"
        min="0"
        defaultValue={order ? Number(order.due_total || 0) : undefined}
        hint="Leave empty to use the order's unpaid balance"
      />
      <TextArea label="Notes for the rider" name="notes" />
    </>
  );
}

/** Update an active delivery: change rider and/or move it to the next step. */
export function UpdateDeliveryFields({ delivery, riders }: { delivery: any; riders: Rider[] }) {
  return (
    <>
      <Hidden name="id" value={delivery.id} />
      <Select label="Rider" name="rider_id" placeholder="Unassigned" options={riderOptions(riders)} defaultValue={delivery.rider_id} />
      <Select
        label="Next step"
        name="next"
        defaultValue=""
        options={[
          { value: '', label: 'No change (just update the rider)' },
          { value: 'out_for_delivery', label: 'Picked up · out for delivery' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'failed', label: 'Failed' },
          { value: 'cancelled', label: 'Cancel delivery' },
        ]}
      />
      <Row>
        <Field
          label="Cash collected (Rs)"
          name="cash_collected"
          type="number"
          step="0.01"
          min="0"
          defaultValue={Number(delivery.cash_to_collect || 0)}
          hint="When delivered"
        />
        <Field label="Reason" name="reason" hint="When failed or cancelled" />
      </Row>
    </>
  );
}
