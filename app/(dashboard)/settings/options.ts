// Choices offered on the settings page; the server actions accept only these values.

export const CURRENCIES = [
  { code: 'PKR', label: 'PKR - Pakistani Rupee' },
  { code: 'AED', label: 'AED - UAE Dirham' },
  { code: 'SAR', label: 'SAR - Saudi Riyal' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'EUR', label: 'EUR - Euro' },
];

export const TIMEZONES = [
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, UTC+5)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, UTC+3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

export const NOTIFICATION_PREFS = [
  { key: 'new_order', label: 'New app orders', hint: 'When a customer places an order from the app.' },
  { key: 'stock_alert', label: 'Low stock', hint: 'When a product drops below its reorder level.' },
  { key: 'delivery', label: 'Delivery updates', hint: 'When a rider picks up, delivers or fails an order.' },
  { key: 'cash', label: 'Cash mismatches', hint: 'When a cash reconciliation doesn’t balance.' },
  { key: 'daily_summary', label: 'Daily summary email', hint: 'A short sales recap every evening.' },
] as const;

export type NotificationKey = (typeof NOTIFICATION_PREFS)[number]['key'];

export const AVATAR_BUCKET = 'kirana-public';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
