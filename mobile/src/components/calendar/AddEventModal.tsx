import { AppModal } from '../ui/AppModal';
import { CreateEventInput, CreateEventOptions } from '../../features/calendar/calendarTypes';
import { EventForm } from './EventForm';

type AddEventInitialValues = Partial<CreateEventInput>;

type AddEventModalProps = {
  visible: boolean;
  initialDate: Date;
  modalTitle?: string;
  initialValues?: AddEventInitialValues;
  publicationCalendarTitle?: string | null;
  onClose: () => void;
  onSave: (input: CreateEventInput, options: CreateEventOptions) => Promise<void>;
};

export function AddEventModal({
  visible,
  initialDate,
  modalTitle = 'Add Event',
  initialValues,
  publicationCalendarTitle,
  onClose,
  onSave,
}: AddEventModalProps) {
  async function handleSave(input: CreateEventInput, options: CreateEventOptions): Promise<void> {
    await onSave(input, options);
    onClose();
  }

  return (
    <AppModal visible={visible} title={modalTitle} onClose={onClose}>
      <EventForm
        active={visible}
        initialDate={initialDate}
        initialValues={initialValues}
        publicationCalendarTitle={publicationCalendarTitle}
        onSave={handleSave}
      />
    </AppModal>
  );
}
