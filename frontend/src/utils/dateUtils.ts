import { isSameDay, format, parseISO } from 'date-fns';

/**
 * Standard date format constants
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',    // e.g., "Jan 1, 2024"
  SHORT: 'MM/dd/yyyy',       // e.g., "01/01/2024"
  ISO: 'yyyy-MM-dd',         // e.g., "2024-01-01"
  LONG: 'MMMM d, yyyy',      // e.g., "January 1, 2024"
} as const;

/**
 * Safely format a date-only string (YYYY-MM-DD) or Date object for display.
 * For date-only fields, this avoids timezone bugs by using date-fns parseISO and format.
 * @param {string|Date} date - The date to format (should be a date-only string or Date)
 * @returns {string} Formatted date string (e.g., "Jan 1, 2024")
 */
export const formatDisplayDate = (date: string | Date): string => {
  if (!date) return '';
  try {
    // If string, extract date part (YYYY-MM-DD) to avoid timezone shift
    const dateStr = typeof date === 'string' ? date.slice(0, 10) : date;
    const dateObj = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, DATE_FORMATS.DISPLAY);
  } catch (error) {
    console.error('Error formatting display date:', error);
    return '';
  }
};

/**
 * Format a date string or Date object into a short format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "01/01/2024")
 */
export const formatShortDate = (date: string | Date): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, DATE_FORMATS.SHORT);
  } catch (error) {
    console.error('Error formatting short date:', error);
    return '';
  }
};

/**
 * Format a date string or Date object into ISO format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "2024-01-01")
 */
export const formatISODate = (date: string | Date): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, DATE_FORMATS.ISO);
  } catch (error) {
    console.error('Error formatting ISO date:', error);
    return '';
  }
};

/**
 * Format a date string or Date object into a long format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "January 1, 2024")
 */
export const formatLongDate = (date: string | Date): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, DATE_FORMATS.LONG);
  } catch (error) {
    console.error('Error formatting long date:', error);
    return '';
  }
};

/**
 * Format a date string or Date object into a time format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted time string (e.g., "2:30 PM")
 */
export const formatTime = date => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get the color for a date based on its status
 * @param {Date} date - The date to check
 * @param {Array} availableDates - Array of available dates
 * @param {Array} scheduledClasses - Array of scheduled classes
 * @param {Array} holidays - Array of holidays
 * @returns {string} Color string for the date
 */
export const getDateColor = (
  date,
  availableDates,
  scheduledClasses,
  holidays
) => {
  if (holidays.some(h => isSameDay(new Date(h.date), date))) {
    return 'red';
  }
  if (scheduledClasses.some(c => isSameDay(new Date(c.date), date))) {
    return 'blue';
  }
  if (availableDates.some(d => isSameDay(d, date))) {
    return 'green';
  }
  return 'gray';
};

export const formatDateWithoutTimezone = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
