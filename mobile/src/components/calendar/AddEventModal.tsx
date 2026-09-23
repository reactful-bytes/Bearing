import { AppModal } from '../ui/AppModal';
import { ScreenHeader } from '../ui/ScreenHeader';
import { CreateEventInput, CreateEventOptions } from '../../features/calendar/calendarTypes';
import { EventCreateForm } from './EventCreateForm';
import { TimeFormat } from '../../features/profile/timeFormat';

type AddEventInitialValues = Partial<CreateEventInput>;

type AddEventModalProps = {
  visible: boolean;
  initialDate: Date;
  modalTitle?: string;
  initialValues?: AddEventInitialValues;
  publicationCalendarTitle?: string | null;
  locale?: string;
  timeFormat?: TimeFormat;
  onClose: () => void;
  onSave: (input: CreateEventInput, options: CreateEventOptions) => Promise<void>;
  fullScreen?: boolean;
};

export function AddEventModal({
  visible,
  initialDate,
  modalTitle = 'Add Event',
  initialValues,
  publicationCalendarTitle,
  locale,
  timeFormat,
  onClose,
  onSave,
  fullScreen = false,
}: AddEventModalProps) {
  async function handleSave(input: CreateEventInput, options: CreateEventOptions): Promise<void> {
    await onSave(input, options);
    onClose();
  }

  return (
    <AppModal
      visible={visible}
      title={modalTitle}
      onClose={onClose}
      fullScreen={fullScreen}
      hideHeader={fullScreen}
    >
      <EventCreateForm
        active={visible}
        initialDate={initialDate}
        initialValues={initialValues}
        publicationCalendarTitle={publicationCalendarTitle}
        locale={locale}
        timeFormat={timeFormat}
        fullScreen={fullScreen}
        header={fullScreen ? <ScreenHeader title={modalTitle} onPressBack={onClose} /> : undefined}
        onSave={handleSave}
      />
    </AppModal>
  );
}
