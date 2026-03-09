import { CampsiteSearchResult } from '@campsight/shared';
import { DateRangePicker } from '../../../components/DateRangePicker';
import { SelectionFooter } from '../../../components/SelectionFooter';
import { Text } from '../../../components/Text';
import { formatDateRange } from '../../../lib/dateUtils';
import styles from './Dates.module.scss';

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
  const canProceed = !!startDate && !!endDate;

  return (
    <div className={styles.root}>
      <div>
        <Text variant="h1" className={styles.label} as="label">
          Select Your Timeframe
        </Text>
        {selectedSite && (
          <Text variant="body" className={styles.selected}>
            {campgroundName} {'  •  '} {selectedSitesCount}{' '}
            {selectedSitesCount === 1 ? 'Site' : 'Sites'}
          </Text>
        )}
      </div>
      <div className={styles.pickerWrapper}>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            onStartDateChange(start);
            onEndDateChange(end);
          }}
        />
      </div>
      <SelectionFooter
        continueLabel={
          canProceed
            ? `Continue with ${formatDateRange(startDate, endDate, { short: true })}`
            : ''
        }
        onClear={onClearSelection}
        onContinue={onContinue}
        visible={canProceed}
      />
    </div>
  );
};
