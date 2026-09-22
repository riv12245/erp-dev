const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value);

const formatCurrency = (value: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString();
}

export { formatNumber, formatCurrency };