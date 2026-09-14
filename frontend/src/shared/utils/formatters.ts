/**
 * Formatting helpers for currency, crypto precision, and dates.
 */

export function formatNaira(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₦0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCrypto(amount: number | string | null | undefined, maxDecimals: number = 8): string {
  if (amount === null || amount === undefined) return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';

  // Format with clean trailing zero trimming
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
}

export function formatSpeed(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms <= 0) return 'Instant';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
