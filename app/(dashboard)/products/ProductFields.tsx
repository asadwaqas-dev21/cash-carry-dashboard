import { Field, Hidden, Row, Select, TextArea, enumOptions } from '@/components/admin/fields';
import { PRODUCT_STATUSES } from '@/lib/enums';

/** Fields for the add and edit product forms. `stock` is shown only when editing. */
export default function ProductFields({
  categories,
  product,
  stock,
}: {
  categories: { id: string; name: string }[];
  product?: any;
  stock?: number;
}) {
  const editing = Boolean(product);
  return (
    <>
      <Hidden name="id" value={product?.id} />
      <Field label="Product name" name="name" required defaultValue={product?.name} placeholder="e.g. Basmati Rice 5kg" />
      <Row>
        <Field label="SKU" name="sku" required defaultValue={product?.sku} placeholder="e.g. RICE-5KG" />
        <Field label="Barcode" name="barcode" defaultValue={product?.barcode} placeholder="Optional" />
      </Row>
      <Row>
        <Select
          label="Category"
          name="category_id"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={product?.category_id}
          placeholder="No category"
        />
        <Select label="Status" name="status" options={enumOptions(PRODUCT_STATUSES)} defaultValue={product?.status || 'active'} hint="Only active products show in the POS" />
      </Row>
      <Row>
        <Field label="Cost price (Rs)" name="cost_price" type="number" step="0.01" min="0" required defaultValue={product?.cost_price ?? ''} />
        <Field label="Retail price (Rs)" name="retail_price" type="number" step="0.01" min="0" required defaultValue={product?.retail_price ?? ''} />
      </Row>
      <Row>
        <Field label="Wholesale price (Rs)" name="wholesale_price" type="number" step="0.01" min="0" defaultValue={product?.wholesale_price ?? 0} />
        <Field label="Tax rate (%)" name="tax_rate" type="number" step="0.01" min="0" defaultValue={product?.tax_rate ?? 0} hint="Added on top of the retail price at the POS" />
      </Row>
      <Row>
        <Field label="Low stock level" name="reorder_level" type="number" min="0" defaultValue={product?.reorder_level ?? 10} />
        <Field label="Reorder quantity" name="reorder_quantity" type="number" min="0" defaultValue={product?.reorder_quantity ?? 10} />
      </Row>
      <Row>
        {editing ? (
          <Field label="Stock on hand" name="stock" type="number" min="0" defaultValue={stock ?? 0} hint="Change it to record a stock count correction" />
        ) : (
          <Field label="Opening stock" name="initial_stock" type="number" min="0" defaultValue={0} />
        )}
        <Field label="Pack size" name="pack_size" defaultValue={product?.pack_size} placeholder="e.g. 12 x 1L" />
      </Row>
      <TextArea label="Description" name="description" defaultValue={product?.description} />
    </>
  );
}
