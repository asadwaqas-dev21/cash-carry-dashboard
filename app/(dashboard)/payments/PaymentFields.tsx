import { Field, Hidden, Row, Select, TextArea, enumOptions } from '@/components/admin/fields';
import { PAYMENT_METHODS } from '@/lib/enums';
import { formatMoney } from '@/lib/format';

/** Record a payment: pick an order with a balance (or pass `order` to fix it). */
export default function PaymentFields({ orders, order }: { orders?: any[]; order?: any }) {
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
            label: `#${o.order_number} · ${o.customers?.display_name || 'Walk-in'} · ${formatMoney(o.due_total)} due`,
          }))}
        />
      )}
      <Row>
        <Field
          label="Amount (Rs)"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={order ? Number(order.due_total || 0) : undefined}
        />
        <Select label="Method" name="method" options={enumOptions(PAYMENT_METHODS)} defaultValue="cash" />
      </Row>
      <Field label="Reference" name="reference" placeholder="Transaction ID, cheque no. (optional)" />
      <TextArea label="Notes" name="notes" />
    </>
  );
}
