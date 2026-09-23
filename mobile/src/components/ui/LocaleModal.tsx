import { SelectionModal } from './SelectionModal';
import { LOCALE_OPTIONS } from '../../features/localization/localeOptions';

type LocaleModalProps = {
  visible: boolean;
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function LocaleModal({ visible, selectedValue, onClose, onSelect }: LocaleModalProps) {
  return (
    <SelectionModal
      visible={visible}
      title="Locale"
      searchPlaceholder="Search locales by language or region"
      emptyStateDescription="Try a language or region."
      selectedValue={selectedValue}
      options={LOCALE_OPTIONS}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}
