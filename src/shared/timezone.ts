// Timezone utilities for Brazil (Brasília timezone)
// Converts UTC timestamps to/from Brazil timezone for display

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Convert UTC timestamp to Brazil local time for display
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns Formatted date string in Brazil timezone
 */
export function formatToBrazilTime(utcTimestamp: string | Date): string {
  if (!utcTimestamp) return '-';
  
  const date = new Date(utcTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Convert UTC timestamp to Brazil local time - short format (without seconds)
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns Formatted date string in Brazil timezone (DD/MM/YYYY HH:MM)
 */
export function formatToBrazilTimeShort(utcTimestamp: string | Date): string {
  if (!utcTimestamp) return '-';
  
  const date = new Date(utcTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Convert UTC timestamp to Brazil local time - time only
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns Formatted time string in Brazil timezone (HH:MM:SS)
 */
export function formatToBrazilTimeOnly(utcTimestamp: string | Date): string {
  if (!utcTimestamp) return '-';
  
  const date = new Date(utcTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Convert UTC timestamp to Brazil local time - date only
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns Formatted date string in Brazil timezone (DD/MM/YYYY)
 */
export function formatToBrazilDateOnly(utcTimestamp: string | Date): string {
  if (!utcTimestamp) return '-';
  
  const date = new Date(utcTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Convert UTC timestamp to relative time in Brazil timezone (e.g., "há 5 minutos")
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns Relative time string in Portuguese
 */
export function formatToBrazilRelativeTime(utcTimestamp: string | Date): string {
  if (!utcTimestamp) return '-';
  
  const date = new Date(utcTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  // Get current time in Brazil timezone
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return diffSeconds <= 0 ? 'agora' : 'há poucos segundos';
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else {
    // For older dates, show formatted date
    return formatToBrazilDateOnly(utcTimestamp);
  }
}

/**
 * Convert Brazil local time to UTC timestamp for saving to database
 * @param brazilTimeString - Date string in Brazil timezone format
 * @returns ISO string in UTC
 */
export function convertBrazilTimeToUTC(brazilTimeString: string): string {
  // Create date assuming the input is in Brazil timezone
  // This is a bit tricky because JavaScript Date constructor assumes local timezone
  
  const date = new Date(brazilTimeString);
  
  // If we need precise conversion from Brazil to UTC, we'd need a more sophisticated approach
  // For now, return as UTC string
  return date.toISOString();
}

/**
 * Get current time in Brazil timezone as formatted string
 * @returns Current time formatted in Brazil timezone
 */
export function getCurrentBrazilTime(): string {
  return formatToBrazilTime(new Date());
}

/**
 * Get current time in Brazil timezone as ISO string (converted to UTC for storage)
 * @returns Current time as ISO string in UTC
 */
export function getCurrentUTCTime(): string {
  return new Date().toISOString();
}

/**
 * Check if a timestamp is from today (Brazil timezone)
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns True if the date is today in Brazil timezone
 */
export function isToday(utcTimestamp: string | Date): boolean {
  if (!utcTimestamp) return false;
  
  const date = new Date(utcTimestamp);
  const today = new Date();
  
  // Convert both to Brazil timezone date strings and compare
  const dateStr = date.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });
  const todayStr = today.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });
  
  return dateStr === todayStr;
}

/**
 * Format timestamp with Brazil timezone indicator for clarity
 * @param utcTimestamp - ISO string or Date object in UTC
 * @returns Formatted string with timezone indicator
 */
export function formatWithTimezone(utcTimestamp: string | Date): string {
  const formatted = formatToBrazilTimeShort(utcTimestamp);
  if (formatted === '-') return formatted;
  
  return `${formatted} (BRT)`; // BRT = Brazil Time
}

// Export timezone constants for reference
export const TIMEZONE_INFO = {
  name: 'Horário de Brasília',
  abbreviation: 'BRT', // or BRST during daylight saving time
  utcOffset: -3, // Standard UTC-3, but can be UTC-2 during daylight saving
  timezone: BRAZIL_TIMEZONE
};
