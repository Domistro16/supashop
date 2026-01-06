/**
 * Format large numbers with K (thousands) or M (millions) suffix
 * @param num The number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatNumber(num: number | null | undefined, decimals: number = 1): string {
  if (num === null || num === undefined) return '0';
  if (num === 0) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1000000) {
    // Millions
    return sign + (absNum / 1000000).toFixed(decimals) + 'M';
  } else if (absNum >= 1000) {
    // Thousands
    return sign + (absNum / 1000).toFixed(decimals) + 'K';
  }

  // Less than 1000, return as is
  return num.toString();
}

/**
 * Format currency with K/M suffix
 * @param amount The amount to format
 * @param currency Currency symbol (default: '₦')
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted currency string (e.g., "₦1.5K", "₦2.3M")
 */
export function formatCurrency(
  amount: number,
  currency: string = '₦',
  decimals: number = 1
): string {
  return currency + formatNumber(amount, decimals);
}

/**
 * Format percentage
 * @param value The percentage value
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "12.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toFixed(decimals) + '%';
}

/**
 * Format time ago (e.g., "2 minutes ago", "3 hours ago")
 * @param date The date to format
 * @returns Formatted time ago string
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hr${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}
