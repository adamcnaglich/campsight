export const parseISODateString = (str: string): Date => {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a date range for display (e.g. in selection footer or review card).
 * Single day: "April 13"
 * Same month: "April 13 - 20" (short: "Apr 13 - 20")
 * Different months: "April 13 - May 2" (short: "Apr 13 - May 2")
 */
export const formatDateRange = (
  start: string,
  end: string,
  { short = false }: { short?: boolean } = {},
): string => {
  if (!start || !end) return '';
  const startDate = parseISODateString(start);
  const endDate = parseISODateString(end);
  const isRange = start !== end;
  const options: Intl.DateTimeFormatOptions = {
    month: short && isRange ? 'short' : 'long',
    day: 'numeric',
  };
  const startStr = startDate.toLocaleDateString('en-US', options);
  if (!isRange) {
    return startStr;
  }
  const endStr = endDate.toLocaleDateString('en-US', options);
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startStr} - ${endDate.getDate()}`;
  }
  return `${startStr} - ${endStr}`;
};
