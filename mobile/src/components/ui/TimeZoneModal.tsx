import { SelectionModal } from './SelectionModal';
import { TIMEZONE_OPTIONS } from '../../features/timezone/timezoneOptions';

type TimeZoneModalProps = {
  visible: boolean;
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function TimeZoneModal({ visible, selectedValue, onClose, onSelect }: TimeZoneModalProps) {
  return (
    <SelectionModal
      visible={visible}
      title="Time zone"
      searchPlaceholder="Search time zones by city or region"
      emptyStateDescription="Try a city or region."
      selectedValue={selectedValue}
      options={TIMEZONE_OPTIONS}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}
