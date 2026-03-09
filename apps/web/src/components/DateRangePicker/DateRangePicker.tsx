import { useMemo, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { parseISODateString, toISODateString } from '../../lib/dateUtils';
import './date-picker.scss';
import styles from './DateRangePicker.module.scss';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  /** Initial month to show (defaults to today or start date) */
  defaultMonth?: Date;
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onRangeChange,
  defaultMonth,
}: DateRangePickerProps) => {
  const selected: DateRange | undefined = useMemo(() => {
    if (!startDate) return undefined;
    return {
      from: parseISODateString(startDate),
      to: endDate ? parseISODateString(endDate) : undefined,
    };
  }, [startDate, endDate]);

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from) {
        onRangeChange('', '');
        return;
      }
      onRangeChange(
        toISODateString(range.from),
        range.to ? toISODateString(range.to) : '',
      );
    },
    [onRangeChange],
  );

  const today = useMemo(() => new Date(), []);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const initialMonth = useMemo(() => {
    if (defaultMonth) return defaultMonth;
    if (startDate) return parseISODateString(startDate);
    return today;
  }, [defaultMonth, startDate, today]);

  return (
    <div className={styles.wrapper}>
      <DayPicker
        animate
        mode="range"
        selected={selected}
        onSelect={handleSelect}
        numberOfMonths={isMobile ? 1 : 2}
        pagedNavigation
        navLayout="around"
        disabled={{ before: today }}
        defaultMonth={initialMonth}
        className={styles.dayPicker}
      />
    </div>
  );
};
