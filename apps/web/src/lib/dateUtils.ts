const parseISODateString = (str: string): Date => {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format a date range for display (e.g. in selection footer or review card).
 * Single day: "April 13"
 * Same month: "April 13 - 20"
 * Different months: "April 13 - May 2"
 */
export const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return '';
  const startDate = parseISODateString(start);
  const endDate = parseISODateString(end);
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
  };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', options);
  if (start === end) {
    return startStr;
  }
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startStr} - ${endDate.getDate()}`;
  }
  return `${startStr} - ${endStr}`;
};
