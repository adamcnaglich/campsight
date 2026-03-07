import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { CampsiteSearchResult } from '@campsight/shared';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import styles from './Dates.module.scss';
import './date-picker.scss';

const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseISODateString = (str: string): Date => {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return '';
  const startDate = parseISODateString(start);
  const endDate = parseISODateString(end);
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
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

export interface DatesProps {
  selectedSite: CampsiteSearchResult | null;
  selectedSitesCount: number;
  campgroundName: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearSelection: () => void;
  onContinue: () => void;
}

export const Dates = ({
  selectedSite,
  selectedSitesCount,
  campgroundName,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearSelection,
  onContinue,
}: DatesProps) => {
  const selected: DateRange | undefined = useMemo(() => {
    if (!startDate) return undefined;
    return {
      from: parseISODateString(startDate),
      to: endDate ? parseISODateString(endDate) : undefined,
    };
  }, [startDate, endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onStartDateChange('');
      onEndDateChange('');
      return;
    }
    onStartDateChange(toISODateString(range.from));
    onEndDateChange(range.to ? toISODateString(range.to) : '');
  };

  const canProceed = !!startDate && !!endDate;
  const today = useMemo(() => new Date(), []);

  return (
    <div className={styles.root}>
      <div>
        <Text variant="h1" className={styles.label} as="label">
          Select Your Timeframe
        </Text>
        {selectedSite && (
          <Text variant="body" className={styles.selected}>
            {campgroundName} • {selectedSitesCount}{' '}
            {selectedSitesCount === 1 ? 'Site' : 'Sites'}
            {selectedSite.name && ` (${selectedSite.name})`}
          </Text>
        )}
      </div>
      <div className={styles.pickerWrapper}>
        <DayPicker
          animate
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          pagedNavigation
          navLayout="around"
          disabled={{ before: today }}
          defaultMonth={today}
          className={styles.dayPicker}
        />
      </div>
      <SelectionFooter
        continueLabel={
          canProceed
            ? `Continue with ${formatDateRange(startDate, endDate)}`
            : ''
        }
        onClear={onClearSelection}
        onContinue={onContinue}
        visible={canProceed}
      />
    </div>
  );
};
